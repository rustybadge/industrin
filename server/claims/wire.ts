import { clerkClient } from "@clerk/express";
import { createResendMailer } from "../emails/send";
import { createVerifyRouter, productionVerifyDeps } from "./verify";
import { bindVerifiedOwner, ClaimConflictError, NoApprovedClaimError } from "./repo";

/** Clerk-verified primary email (authoritative; we don't trust email claims inside the token). */
async function getVerifiedEmail(clerkUserId: string): Promise<string | null> {
  const user = await clerkClient.users.getUser(clerkUserId);
  const primary = user.emailAddresses.find((a) => a.id === user.primaryEmailAddressId);
  return primary?.verification?.status === "verified" ? primary.emailAddress.toLowerCase() : null;
}

export const claimsVerifyRouter = () =>
  createVerifyRouter(
    productionVerifyDeps({
      bind: bindVerifiedOwner,
      mailer: createResendMailer(),
      getVerifiedEmail,
      classify: (err) =>
        err instanceof NoApprovedClaimError ? { status: 403, message: err.message }
        : err instanceof ClaimConflictError ? { status: 409, message: err.message }
        : null,
    }),
  );
