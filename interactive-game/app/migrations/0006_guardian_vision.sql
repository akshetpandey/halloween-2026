CREATE TABLE vision_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 threshold REAL NOT NULL CHECK(threshold BETWEEN 0.3 AND 0.99),
 margin REAL NOT NULL CHECK(margin BETWEEN 0.005 AND 0.3)
);
INSERT INTO vision_settings VALUES(1,0.8,0.04);
CREATE TABLE vision_guardians (
 guardian_id TEXT PRIMARY KEY REFERENCES guardians(id),
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1))
);
CREATE TABLE vision_references (
 id TEXT PRIMARY KEY,
 guardian_id TEXT REFERENCES guardians(id),
 photo_key TEXT NOT NULL UNIQUE,
 photo_hash TEXT NOT NULL,
 model_version TEXT NOT NULL,
 vector TEXT NOT NULL CHECK(json_valid(vector) AND json_type(vector)='array' AND json_array_length(vector)=384),
 note TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL,
 UNIQUE(photo_hash,model_version)
);
CREATE INDEX vision_references_guardian ON vision_references(guardian_id);
