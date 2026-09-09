import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync, chmodSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const mode = process.argv.includes("--remote") ? "--remote" : "--local";
mkdirSync("private", { recursive: true });
chmodSync("private", 0o700);
const catalog = readFileSync("src/shared/catalog.ts", "utf8");
const ids = [
  ...catalog.matchAll(/(?:\bid|"id"):\s*"((?:DEC|BUY|MAKE)-\d{2})"/g),
].map((m) => m[1]);
if (ids.length !== 15 || new Set(ids).size !== 15)
  throw new Error(
    "Expected exactly fifteen unique guardian IDs; refusing an incomplete seed.",
  );
// Existing short links never rotate on a second seed. Runtime tokens stay out of Git.
const sql = ids
  .map(
    (id) =>
      `INSERT OR IGNORE INTO guardians(id,code) VALUES('${id}','${randomBytes(6).toString("hex")}');`,
  )
  .join("\n");
writeFileSync("private/seed.sql", sql, { mode: 0o600 });
execFileSync(
  "npx",
  ["wrangler", "d1", "execute", "DB", mode, "--file", "private/seed.sql"],
  { stdio: "inherit" },
);
