-- Public contact form submissions.
-- Apply: npx wrangler d1 migrations apply mortgage-leads --local   (or --remote)

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  entry_page TEXT,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS contact_messages_created ON contact_messages (created_at);
