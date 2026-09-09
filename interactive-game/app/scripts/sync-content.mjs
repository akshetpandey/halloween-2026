import { readFileSync, writeFileSync } from "node:fs";
const text = readFileSync("../design/narrative-arc.md", "utf8");
const meta = [
  ["moon", "vision", "October Grove", "Memory"],
  ["tree", "matrix", "October Grove", "Attention"],
  ["guardian", "lanterns", "The Hollow", "Vitality"],
  ["well", "reflection", "Moon Well", "Discernment"],
  ["skull", "seal", "October Grove", "Restoration"],
  ["raven", "token", "October Grove", "Perception"],
  ["owl", "witnesses", "October Grove", "Reason"],
  ["fox", "rule", "The Hollow", "Cunning"],
  ["stag", "thorns", "October Grove", "Care"],
  ["hare", "wheel", "The Hollow", "Imagination"],
  ["fork", "procession", "October Grove", "Welcome"],
  ["ember", "offering", "The Hollow", "Generosity"],
  ["knots", "untangle", "October Grove", "Patience"],
  ["host", "constellation", "October Grove", "Connection"],
  ["door", "sigil", "The Hollow", "Persistence"],
];
const guardians = [
  ...text.matchAll(
    /\*\*((?:DEC|BUY|MAKE)-\d{2}) · (.*?) — .*?\*\* .*?Greeting: “(.*?)” Earned lore: “(.*?)”/g,
  ),
].map((m, i) => ({
  id: m[1],
  name: m[2],
  greeting: m[3],
  lore: m[4],
  art: meta[i][0],
  family: meta[i][1],
  room: meta[i][2],
  virtue: meta[i][3],
}));
if (guardians.length !== 15) throw new Error("Expected fifteen guardians");
const chapters = [
  ...text.matchAll(
    /^\| (Registration|\d+ Favors?|All active entities[^|]*) \| ([^|]+) \| “(.+)” \|$/gm,
  ),
].map((m) => ({
  at:
    m[1] === "Registration" ? 0 : m[1].startsWith("All") ? 15 : parseInt(m[1]),
  title: m[2].trim(),
  text: m[3],
}));
if (chapters.length !== 9) throw new Error("Expected nine chapters");
writeFileSync(
  "src/shared/catalog.ts",
  "// Generated from the approved narrative; run node scripts/sync-content.mjs. Puzzle pairings are rehearsal assignments.\nexport const guardians = " +
    JSON.stringify(guardians, null, 2) +
    " as const;\nexport type Guardian = typeof guardians[number];\n",
);
writeFileSync(
  "src/worker/story.ts",
  "// Server only: return chapters as they unlock.\nexport const chapters = " +
    JSON.stringify(chapters, null, 2) +
    ";\n",
);
