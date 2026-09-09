CREATE TABLE guardians (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE CHECK(length(code)=12));
CREATE TABLE players (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, photo_key TEXT, realm TEXT NOT NULL CHECK(realm IN ('live','preview')),
 recovery_hash TEXT NOT NULL UNIQUE, registered INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
 photo_expires_at INTEGER
);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_player ON sessions(player_id);
CREATE TABLE assignments (player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, guardian_id TEXT NOT NULL REFERENCES guardians(id), version INTEGER NOT NULL, instance TEXT NOT NULL, PRIMARY KEY(player_id,guardian_id));
CREATE TABLE favors (player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, guardian_id TEXT NOT NULL REFERENCES guardians(id), earned_at INTEGER NOT NULL, PRIMARY KEY(player_id,guardian_id));
CREATE TABLE summons (
 token TEXT PRIMARY KEY, inviter_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 milestone INTEGER NOT NULL CHECK(milestone IN (4,10)), redeemed_by TEXT UNIQUE REFERENCES players(id) ON DELETE SET NULL, redeemed_at INTEGER,
 UNIQUE(inviter_id,milestone), CHECK(redeemed_by IS NULL OR redeemed_by != inviter_id)
);
CREATE TABLE ballots (id TEXT PRIMARY KEY, voter_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, guardian_id TEXT NOT NULL, a TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, b TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, choice TEXT, created_at INTEGER NOT NULL, UNIQUE(voter_id,guardian_id), CHECK(a != b AND a != voter_id AND b != voter_id), CHECK(choice IS NULL OR choice=a OR choice=b));
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, resets_at INTEGER NOT NULL);
