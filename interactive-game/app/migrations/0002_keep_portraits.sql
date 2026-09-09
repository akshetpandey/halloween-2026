-- Accounts and portraits have no automatic retention deadline.
-- Existing KV object TTLs are cleared separately by scripts/retain-portraits.mjs.
ALTER TABLE players DROP COLUMN photo_expires_at;
