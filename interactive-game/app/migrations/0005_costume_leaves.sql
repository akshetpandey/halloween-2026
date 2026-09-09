-- Pairwise ballots remain historical; only these equal-weight choices count.
CREATE TABLE costume_ballots (
 voter_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
 choices TEXT NOT NULL CHECK(json_valid(choices) AND json_type(choices)='array' AND json_array_length(choices)<=3),
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at INTEGER NOT NULL
);
CREATE TABLE costume_reminders (
 player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
 seen_at INTEGER NOT NULL
);
CREATE TABLE costume_awards (
 realm TEXT PRIMARY KEY CHECK(realm IN ('live','preview')),
 winner_id TEXT NOT NULL REFERENCES players(id),
 published_at INTEGER NOT NULL,
 actor_hash TEXT NOT NULL,
 tie_reason TEXT NOT NULL DEFAULT ''
);
