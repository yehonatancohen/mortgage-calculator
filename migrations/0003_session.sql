-- First-party session id, so tachles-admin can join a lead to its visitor journey
-- (tachles-analytics.sessions). Nullable: not every historical lead has one.
-- Apply: npx wrangler d1 migrations apply mortgage-leads --local   (or --remote)

ALTER TABLE leads ADD COLUMN session_id TEXT;
CREATE INDEX IF NOT EXISTS leads_session ON leads (session_id);
