import { pool } from "../db";

/** Idempotent startup migration for the claim workflow (same pattern as the other startup migrations). */
export async function migrateClaimWorkflow(): Promise<void> {
  try {
    await pool.query(
      `ALTER TABLE company_services ADD COLUMN IF NOT EXISTS source VARCHAR NOT NULL DEFAULT 'classifier'`,
    );
  } catch (err) {
    console.warn("[startup] company_services.source migration skipped or failed:", err);
  }
  try {
    await pool.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP`);
  } catch (err) {
    console.warn("[startup] companies.verified_at migration skipped or failed:", err);
  }
}
