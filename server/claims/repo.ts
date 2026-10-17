import { pool } from "../db";

/** Thrown when the claimant's email is already a member of a *different* company. */
export class ClaimConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimConflictError";
  }
}

/** No admin-approved claim (with its owner row) exists for this verified email. */
export class NoApprovedClaimError extends Error {
  constructor() {
    super("Ingen godkänd ägaransökan hittades för den här e-postadressen.");
    this.name = "NoApprovedClaimError";
  }
}

export interface BindResult {
  companyId: string;
  companyName: string;
  ownerName: string;
  ownerEmail: string;
  /** true only if this call changed something (first bind / reactivation / first verification). */
  changed: boolean;
}

/**
 * Bind a Clerk identity to the company it was approved for and flag the listing Verified.
 * The company is derived from the database (approved claim + owner row) and NEVER from the client.
 * One transaction; row locks make concurrent calls safe; idempotent.
 */
export async function bindVerifiedOwner(p: { clerkUserId: string; email: string }): Promise<BindResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Gate: an approved claim for this email AND the owner row that approval created, same company.
    const row = (
      await client.query(
        `SELECT cu.id AS cu_id, cu.company_id, cu.name AS owner_name, cu.email AS owner_email,
                cu.clerk_user_id, cu.is_active, c.name AS company_name, c.is_verified
           FROM claim_requests cr
           JOIN company_users cu ON cu.company_id = cr.company_id AND lower(cu.email) = lower(cr.email)
           JOIN companies c ON c.id = cr.company_id
          WHERE cr.status = 'approved' AND lower(cr.email) = lower($1)
          ORDER BY cr.reviewed_at DESC NULLS LAST
          LIMIT 1
          FOR UPDATE OF cu, c`,
        [p.email],
      )
    ).rows[0];
    if (!row) throw new NoApprovedClaimError();

    if (row.clerk_user_id && row.clerk_user_id !== p.clerkUserId) {
      throw new ClaimConflictError("Företaget är redan kopplat till ett annat konto.");
    }

    try {
      await client.query(`UPDATE company_users SET clerk_user_id = $2, is_active = true WHERE id = $1`, [row.cu_id, p.clerkUserId]);
    } catch (err: any) {
      if (err?.code === "23505") throw new ClaimConflictError("Kontot är redan kopplat till ett annat företag.");
      throw err;
    }
    await client.query(`UPDATE companies SET is_verified = true, verified_at = COALESCE(verified_at, now()) WHERE id = $1`, [row.company_id]);

    await client.query("COMMIT");
    return {
      companyId: row.company_id,
      companyName: row.company_name,
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      changed: !row.clerk_user_id || row.is_active === false || !row.is_verified,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Cheap pre-check so we don't call Clerk for a claim that will be refused anyway. */
export async function assertNoEmailConflict(email: string, companyId: string): Promise<void> {
  const { rows } = await pool.query(`SELECT company_id FROM company_users WHERE lower(email) = lower($1)`, [email]);
  if (rows[0] && rows[0].company_id !== companyId) {
    throw new ClaimConflictError("Den här e-postadressen är redan kopplad till ett annat företag.");
  }
}

export interface FinalizeResult {
  companyUserId: string;
  categoriesWritten: number;
  unmatchedCategories: string[];
}

/**
 * All-or-nothing database half of an approval (Clerk calls happen before this):
 *  1. lock the claim row (blocks concurrent double-approval)
 *  2. upsert the company_users owner row (NEVER deletes an existing member)
 *  3. replace classifier tags with the claimant's chosen categories (+ parents), source='claim'
 *  4. mark the claim approved
 */
export async function finalizeApproval(p: {
  claimId: string;
  clerkUserId?: string;
  accessToken: string;
  reviewNotes?: string;
}): Promise<FinalizeResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const claim = (await client.query(`SELECT * FROM claim_requests WHERE id = $1 FOR UPDATE`, [p.claimId])).rows[0];
    if (!claim) throw new Error("Claim request not found");

    const existing = (await client.query(`SELECT id, company_id FROM company_users WHERE lower(email) = lower($1) FOR UPDATE`, [claim.email])).rows[0];
    if (existing && existing.company_id !== claim.company_id) {
      throw new ClaimConflictError("Den här e-postadressen är redan kopplad till ett annat företag.");
    }

    let companyUserId: string;
    if (existing) {
      companyUserId = existing.id;
      await client.query(
        `UPDATE company_users
            SET role = 'owner', is_active = true, name = $2,
                clerk_user_id = COALESCE(clerk_user_id, $3)
          WHERE id = $1`,
        [existing.id, claim.name, p.clerkUserId ?? null],
      );
    } else {
      const ins = await client.query(
        `INSERT INTO company_users (company_id, email, name, role, access_token, is_active, clerk_user_id)
         VALUES ($1, $2, $3, 'owner', $4, true, $5) RETURNING id`,
        [claim.company_id, claim.email, claim.name, p.accessToken, p.clerkUserId ?? null],
      );
      companyUserId = ins.rows[0].id;
    }

    // Claimed categories are stored as display names (jsonb array); accept ids too.
    const raw: unknown = claim.service_categories;
    const wanted: string[] = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
    let categoriesWritten = 0;
    let unmatched: string[] = [];
    if (wanted.length > 0) {
      const found = (
        await client.query(
          `SELECT id, name, parent_id FROM service_categories WHERE lower(name) = ANY($1) OR id = ANY($2)`,
          [wanted.map((w) => w.toLowerCase()), wanted],
        )
      ).rows;
      const known = new Set(found.flatMap((r) => [String(r.name).toLowerCase(), r.id]));
      unmatched = wanted.filter((w) => !known.has(w.toLowerCase()) && !known.has(w));
      const ids = new Set<string>();
      for (const r of found) {
        ids.add(r.id);
        if (r.parent_id) ids.add(r.parent_id);
      }
      if (ids.size > 0) {
        await client.query(`DELETE FROM company_services WHERE company_id = $1`, [claim.company_id]);
        await client.query(
          `INSERT INTO company_services (company_id, service_category_id, source)
           SELECT $1, unnest($2::text[]), 'claim' ON CONFLICT DO NOTHING`,
          [claim.company_id, [...ids]],
        );
        categoriesWritten = ids.size;
        // Legacy text[] column still drives site search/filters; keep it in step.
        await client.query(`UPDATE companies SET categories = $2 WHERE id = $1`, [claim.company_id, wanted]);
      }
    }

    await client.query(
      `UPDATE claim_requests SET status = 'approved', reviewed_at = now(), reviewed_by = NULL, review_notes = $2 WHERE id = $1`,
      [p.claimId, p.reviewNotes ?? null],
    );

    await client.query("COMMIT");
    return { companyUserId, categoriesWritten, unmatchedCategories: unmatched };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
