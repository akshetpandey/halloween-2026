// CLI-only test cleanup. Never exposed by the application. IDs must come from
// synthetic players created by the calling test; no name-based or bulk reset.
import { execFileSync } from "node:child_process";
export function wranglerJson(args) {
  return JSON.parse(
    execFileSync("npx", ["wrangler", ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
}
export function cleanupFixtures(ids, mode = "--local") {
  if (!["--local", "--remote"].includes(mode))
    throw new Error("Invalid storage mode");
  if (!ids.length) return;
  if (ids.some((id) => !/^[a-f0-9]{32}$/.test(id)))
    throw new Error("Invalid synthetic player ID");
  const selection = ids.map((id) => `'${id}'`).join(",");
  const result = wranglerJson([
    "d1",
    "execute",
    "DB",
    mode,
    "--json",
    "--command",
    `SELECT photo_key FROM players WHERE id IN (${selection})`,
  ]);
  for (const row of result[0].results) {
    if (row.photo_key)
      execFileSync(
        "npx",
        [
          "wrangler",
          "kv",
          "key",
          "delete",
          row.photo_key,
          "--binding",
          "PHOTOS",
          mode,
        ],
        { stdio: "pipe" },
      );
  }
  wranglerJson([
    "d1",
    "execute",
    "DB",
    mode,
    "--json",
    "--command",
    `DELETE FROM costume_awards WHERE winner_id IN (${selection}); DELETE FROM players WHERE id IN (${selection})`,
  ]);
}
