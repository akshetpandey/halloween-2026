-- Stable compact aliases; original invitation tokens remain valid.
ALTER TABLE summons ADD COLUMN short_code TEXT;
CREATE UNIQUE INDEX summons_short_code ON summons(short_code);
