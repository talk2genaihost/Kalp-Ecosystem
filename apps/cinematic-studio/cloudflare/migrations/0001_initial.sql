-- Initial KALP Cinematic Studio D1 migration.
-- Apply only to a newly created, dedicated D1 database.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS character_profiles (
  character_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  profile_json TEXT NOT NULL CHECK (json_valid(profile_json)),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'researching', 'pending_approval', 'approved', 'archived')),
  current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version >= 1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS character_profile_versions (
  character_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  profile_json TEXT NOT NULL CHECK (json_valid(profile_json)),
  change_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (character_id, version),
  FOREIGN KEY (character_id) REFERENCES character_profiles(character_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_references (
  reference_id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'web',
  notes TEXT NOT NULL DEFAULT '',
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (character_id) REFERENCES character_profiles(character_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS character_approvals (
  approval_id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
  reviewer TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (character_id, version)
    REFERENCES character_profile_versions(character_id, version) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_character_profiles_status ON character_profiles(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_research_references_character ON research_references(character_id, created_at);
CREATE INDEX IF NOT EXISTS idx_character_approvals_character ON character_approvals(character_id, created_at);
