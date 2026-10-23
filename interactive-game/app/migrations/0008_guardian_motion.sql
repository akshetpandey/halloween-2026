-- Movement is bound to a reference view, not absolute coordinates in a new photo.
-- Deleting a reference also removes its associated pose/features.
CREATE TABLE guardian_motion (
 reference_id TEXT PRIMARY KEY REFERENCES vision_references(id) ON DELETE CASCADE,
 guardian_id TEXT NOT NULL REFERENCES guardians(id),
 data TEXT NOT NULL CHECK(json_valid(data)),
 updated_at INTEGER NOT NULL
);
CREATE INDEX guardian_motion_guardian ON guardian_motion(guardian_id);
