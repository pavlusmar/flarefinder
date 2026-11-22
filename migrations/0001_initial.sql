CREATE TABLE IF NOT EXISTS companies (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 website TEXT,
 description TEXT,
 crunchbase_url TEXT,
 employees TEXT,
 funding_usd REAL,
 growth_score INTEGER,
 sector TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS research (
 company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending',
 digital_native TEXT,
 digital_native_reason TEXT,
 summary TEXT,
 growth_signals TEXT,
 technical_signals TEXT,
 cloudflare_opportunities TEXT,
 questions TEXT,
 confidence TEXT,
 sources TEXT,
 error TEXT,
 researched_at TEXT,
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS research_status_idx ON research(status);
