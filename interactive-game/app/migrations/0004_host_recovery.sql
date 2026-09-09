CREATE TABLE host_recovery (
 player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
 code_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL,
 consumed_at INTEGER, session_hash TEXT
);
CREATE TABLE host_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, actor_hash TEXT NOT NULL,
 action TEXT NOT NULL, player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL
);
