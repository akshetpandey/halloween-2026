-- Additive foreground descriptors. Original references/global embeddings remain intact.
CREATE TABLE recognition_focus (
 reference_id TEXT PRIMARY KEY REFERENCES vision_references(id) ON DELETE CASCADE,
 model_version TEXT NOT NULL,
 data TEXT NOT NULL CHECK(json_valid(data)),
 updated_at INTEGER NOT NULL
);
