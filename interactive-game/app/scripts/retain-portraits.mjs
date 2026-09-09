// One-time upgrade for existing portraits: preserve bytes and metadata, clear KV TTL.
// No keys, identities, credentials or photo bytes are logged or retained in Git.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { wranglerJson } from "./test-fixtures.mjs";
const mode = process.argv.includes("--remote") ? "--remote" : "--local";
const keys = wranglerJson(["kv", "key", "list", "--binding", "PHOTOS", mode]);
const expiring = keys.filter((key) => key.expiration);
const scratch = mkdtempSync(join(tmpdir(), "court-retention-"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
let updated = 0;
try {
  for (const key of expiring) {
    const args = [
      "wrangler",
      "kv",
      "key",
      "get",
      key.name,
      "--binding",
      "PHOTOS",
      mode,
    ];
    const bytes = execFileSync("npx", args, {
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 3 * 1024 * 1024,
    });
    if (bytes.length < 20)
      throw new Error("Portrait read failed; refusing overwrite");
    const path = join(scratch, "portrait.bin");
    writeFileSync(path, bytes, { mode: 0o600 });
    execFileSync(
      "npx",
      [
        "wrangler",
        "kv",
        "key",
        "put",
        key.name,
        "--binding",
        "PHOTOS",
        mode,
        "--path",
        path,
        "--metadata",
        JSON.stringify(key.metadata || {}),
      ],
      { stdio: "pipe" },
    );
    const check = execFileSync("npx", args, {
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 3 * 1024 * 1024,
    });
    if (digest(bytes) !== digest(check))
      throw new Error("Portrait verification failed");
    updated++;
  }
  const remaining = wranglerJson([
    "kv",
    "key",
    "list",
    "--binding",
    "PHOTOS",
    mode,
  ]);
  if (remaining.some((key) => key.expiration))
    throw new Error("KV still reports expiring portraits; rerun verification");
  console.log(
    `Retained ${updated} existing portraits; verified no KV expiration remains.`,
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
