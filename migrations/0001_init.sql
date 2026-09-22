-- Leads, advisors, OTP codes, rate alerts and rate limiting.
-- Apply: npx wrangler d1 migrations apply mortgage-leads --local   (or --remote)

CREATE TABLE IF NOT EXISTS advisors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  webhook_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  kind TEXT NOT NULL CHECK (kind IN ('refinance', 'buyer')),
  first_name TEXT NOT NULL,
  phone TEXT NOT NULL,                 -- E.164
  phone_verified INTEGER NOT NULL DEFAULT 0,
  timing TEXT,
  consent_contact INTEGER NOT NULL,
  consent_marketing INTEGER NOT NULL DEFAULT 0,
  consent_version TEXT NOT NULL,
  inputs_json TEXT NOT NULL,           -- everything the visitor entered
  results_json TEXT NOT NULL,          -- recomputed on the server
  score REAL,
  score_json TEXT,                     -- groups, signals, hard-filter reasons
  scoring_version TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('A', 'B', 'C')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'delivered', 'held', 'nurture', 'duplicate')),
  advisor_id TEXT REFERENCES advisors(id),
  delivered_at TEXT,
  outcome TEXT CHECK (outcome IN ('contacted', 'meeting', 'closed', 'not_relevant')),
  outcome_at TEXT,
  status_token TEXT NOT NULL UNIQUE,   -- private advisor link
  duplicate_of TEXT,
  entry_page TEXT,
  utm_json TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS leads_created ON leads (created_at);
CREATE INDEX IF NOT EXISTS leads_phone ON leads (phone, created_at);
CREATE INDEX IF NOT EXISTS leads_tier_status ON leads (tier, status);

CREATE TABLE IF NOT EXISTS lead_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  at TEXT NOT NULL DEFAULT (datetime('now')),
  type TEXT NOT NULL,                  -- created, delivered, notify_failed, outcome, tier_changed
  data TEXT
);
CREATE INDEX IF NOT EXISTS lead_events_lead ON lead_events (lead_id);

CREATE TABLE IF NOT EXISTS otp_codes (
  phone TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,         -- unix seconds
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_alerts (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  contact TEXT NOT NULL,
  inputs_json TEXT,
  consent INTEGER NOT NULL,
  entry_page TEXT,
  utm_json TEXT,
  unsubscribed_at TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
