ALTER TABLE "companies"
ADD COLUMN "clerk_organization_id" text UNIQUE;

ALTER TABLE "company_users"
ADD COLUMN "clerk_user_id" text UNIQUE;

