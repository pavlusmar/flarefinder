-- Keep the existing territory, published reports and scores available during each run.
ALTER TABLE research ADD COLUMN active_run TEXT;
ALTER TABLE research ADD COLUMN stage TEXT;
ALTER TABLE research ADD COLUMN quality TEXT;
ALTER TABLE research ADD COLUMN analyzed_at TEXT;
CREATE TABLE analysis_runs (
  run_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  stage TEXT NOT NULL,
  prior_dossier TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  step INTEGER NOT NULL DEFAULT 0,
  lease TEXT,
  lease_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  researched_at TEXT,
  analyzed_at TEXT,
  analyst_model TEXT NOT NULL,
  evaluator_model TEXT NOT NULL,
  config TEXT NOT NULL,
  dossier TEXT,
  refs TEXT,
  usage TEXT,
  quality TEXT
);
CREATE INDEX analysis_runs_company ON analysis_runs(company_id,created_at);
CREATE TABLE analysis_versions (
  run_id TEXT NOT NULL REFERENCES analysis_runs(run_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  report TEXT NOT NULL,
  evaluation TEXT,
  usage TEXT NOT NULL,
  PRIMARY KEY(run_id,version)
);
-- Preserve pre-upgrade publications verbatim, including their original source metadata.
CREATE TABLE research_before_analysis_v4 AS
  SELECT * FROM research WHERE summary IS NOT NULL OR sources IS NOT NULL;
