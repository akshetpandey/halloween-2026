export type Family =
  | "witnesses"
  | "matrix"
  | "procession"
  | "vision"
  | "reflection"
  | "thorns"
  | "wheel"
  | "rule"
  | "constellation"
  | "offering"
  | "seal"
  | "lanterns"
  | "token"
  | "sigil"
  | "untangle";
export type Point = { x: number; y: number; label: string; weight?: number };
export type PuzzleView = {
  family: Family;
  title: string;
  instructions: string;
  kind:
    | "choice"
    | "order"
    | "memory"
    | "reflection"
    | "graph"
    | "offering"
    | "seal"
    | "lanterns"
    | "token"
    | "untangle";
  options?: string[];
  text?: string[];
  symbols?: number[];
  grid?: number[];
  mirror?: number[];
  nodes?: Point[];
  edges?: number[][];
  start?: number;
  end?: number;
  items?: { label: string; value: number }[];
  target?: number;
  count?: number;
  rotations?: number[];
  pieces?: number[];
  board?: number[];
  swaps?: number[][];
  tokenStart?: number;
  question?: string;
  size?: number;
};
export type Assignment = { version: number; view: PuzzleView; answer: unknown };
export type Chapter = { at: number; title: string; text: string };
export type Player = {
  id: string;
  name: string;
  registered: number;
  realm: "preview" | "live";
  photo: boolean;
};
export type Summons = { token: string; milestone: number; redeemed: boolean };
export type State = {
  player: Player | null;
  status: "sealed" | "open" | "closed";
  previewAvailable: boolean;
  partifulUrl: string;
  opensAt: string;
  closesAt: string;
  favors: string[];
  summons: Summons[];
  chapters: Chapter[];
  referrals: number;
};
export const marks = [
  "Moon",
  "Leaf",
  "Thorn",
  "Star",
  "Eye",
  "Acorn",
  "Wave",
  "Sun",
];
export const familyNames: Record<Family, string> = {
  witnesses: "Three Witnesses",
  matrix: "Missing Sigil",
  procession: "The Procession",
  vision: "Brief Vision",
  reflection: "False Reflection",
  thorns: "Path Through Thorns",
  wheel: "Turning Wheel",
  rule: "Rule of Three",
  constellation: "Bind the Constellation",
  offering: "The Offering",
  seal: "Broken Seal",
  lanterns: "The Lanterns",
  token: "Hidden Token",
  sigil: "Unbroken Sigil",
  untangle: "Untangle the Threads",
};
