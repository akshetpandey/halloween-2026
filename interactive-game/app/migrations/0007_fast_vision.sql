-- Preserve original DINO reference photos/features for host reprocessing.
ALTER TABLE vision_references RENAME TO vision_references_legacy;
CREATE TABLE vision_references (
 id TEXT PRIMARY KEY,
 guardian_id TEXT REFERENCES guardians(id),
 photo_key TEXT NOT NULL UNIQUE,
 photo_hash TEXT NOT NULL,
 model_version TEXT NOT NULL,
 vector TEXT NOT NULL CHECK(json_valid(vector) AND json_type(vector)='array' AND json_array_length(vector) IN (384,1024)),
 note TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL,
 UNIQUE(photo_hash,model_version)
);
INSERT INTO vision_references SELECT * FROM vision_references_legacy;
DROP TABLE vision_references_legacy;
CREATE INDEX vision_references_guardian ON vision_references(guardian_id);
