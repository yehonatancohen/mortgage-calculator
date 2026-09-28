-- Owner test leads (submitted with test mode on, see src/server/testmode.ts). Kept out of every
-- lead count, the advisor's inbox and tachles-admin's reports.
-- Apply: npx wrangler d1 migrations apply mortgage-leads --local   (or --remote)
-- Apply BEFORE deploying this site or tachles-admin: both now read leads.is_test.

ALTER TABLE leads ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0;
