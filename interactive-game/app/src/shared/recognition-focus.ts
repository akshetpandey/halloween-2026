export const FOCUS_MODEL = "mbv3-regions-b1a19675-v1";
export const FOCUS_ASSETS = "/models/hc-lens-regions-b1a19675-v1/";
export const FOCUS_DIMENSIONS = 576;
export const FOCUS_GRID = 7;
export type FocusPoint = { x: number; y: number };
export type RegionFeatures = {
  model: string;
  data: Float32Array;
  width: number;
  height: number;
};
export type FocusSignature = {
  model: string;
  foreground: string;
  background: string;
};
export type FocusReference = FocusSignature & {
  referenceId: string;
  guardianId: string;
};
export type FocusSetup = FocusSignature & { polygon: FocusPoint[] };
export type DecodedFocus = {
  guardianId: string;
  referenceId: string;
  foreground: Float32Array[];
  background: Float32Array[];
};
function encode(vectors: Float32Array[]) {
  const bytes = new Uint8Array(vectors.length * FOCUS_DIMENSIONS);
  vectors.forEach((v, i) =>
    v.forEach(
      (n, j) =>
        (bytes[i * FOCUS_DIMENSIONS + j] =
          Math.round(Math.max(-1, Math.min(1, n)) * 127) & 255),
    ),
  );
  return btoa(String.fromCharCode(...bytes));
}
export function decodeFocus(encoded: string): Float32Array[] {
  const raw = atob(encoded),
    vectors: Float32Array[] = [];
  if (
    !raw.length ||
    raw.length % FOCUS_DIMENSIONS ||
    raw.length > 32 * FOCUS_DIMENSIONS
  )
    throw Error("Invalid foreground feature size");
  for (let at = 0; at < raw.length; at += FOCUS_DIMENSIONS) {
    const v = new Float32Array(FOCUS_DIMENSIONS);
    let sum = 0;
    for (let j = 0; j < v.length; j++) {
      const n = raw.charCodeAt(at + j);
      v[j] = (n > 127 ? n - 256 : n) / 127;
      sum += v[j] * v[j];
    }
    if (sum < 0.5 || sum > 1.5) throw Error("Invalid foreground features");
    const norm = Math.sqrt(sum);
    for (let j = 0; j < v.length; j++) v[j] /= norm;
    vectors.push(v);
  }
  return vectors;
}
export function validFocus(value: unknown): value is FocusSetup {
  if (!value || typeof value !== "object") return false;
  const v = value as FocusSetup;
  if (
    v.model !== FOCUS_MODEL ||
    !Array.isArray(v.polygon) ||
    v.polygon.length < 3 ||
    v.polygon.length > 48 ||
    v.polygon.some(
      (p) =>
        !p ||
        ![p.x, p.y].every(
          (n) =>
            typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1,
        ),
    ) ||
    typeof v.foreground !== "string" ||
    typeof v.background !== "string" ||
    v.foreground.length > 25000 ||
    v.background.length > 25000
  )
    return false;
  try {
    decodeFocus(v.foreground);
    decodeFocus(v.background);
    return true;
  } catch {
    return false;
  }
}
export function inPolygon(x: number, y: number, polygon: FocusPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
function dot(a: Float32Array, b: Float32Array) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
function patchPosition(i: number, features: RegionFeatures) {
  const scale = 224 / Math.max(features.width, features.height),
    ox = (224 - features.width * scale) / 2,
    oy = (224 - features.height * scale) / 2;
  return {
    x: (((i % 7) + 0.5) * 32 - ox) / scale / features.width,
    y: ((Math.floor(i / 7) + 0.5) * 32 - oy) / scale / features.height,
  };
}
// Keep representative foreground AND background descriptors, not the room photo.
function representatives(vectors: Float32Array[], limit = 16) {
  if (vectors.length <= limit) return vectors;
  const chosen = [vectors[0]],
    remaining = vectors.slice(1);
  while (chosen.length < limit && remaining.length) {
    let index = 0,
      least = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      let nearest = -1;
      for (const c of chosen) nearest = Math.max(nearest, dot(c, remaining[i]));
      if (nearest < least) {
        least = nearest;
        index = i;
      }
    }
    chosen.push(remaining.splice(index, 1)[0]);
  }
  return chosen;
}
export function focusSignature(
  features: RegionFeatures,
  polygon: FocusPoint[],
): FocusSetup {
  if (
    features.model !== FOCUS_MODEL ||
    features.data.length !== 49 * FOCUS_DIMENSIONS
  )
    throw Error("Reload to use the current foreground lens.");
  const positive: Float32Array[] = [],
    negative: Float32Array[] = [];
  for (let i = 0; i < 49; i++) {
    const { x, y } = patchPosition(i, features);
    if (x < 0 || x > 1 || y < 0 || y > 1) continue;
    const v = features.data.slice(
      i * FOCUS_DIMENSIONS,
      (i + 1) * FOCUS_DIMENSIONS,
    );
    (inPolygon(x, y, polygon) ? positive : negative).push(v);
  }
  if (positive.length < 2 || negative.length < 2)
    throw Error(
      "Include the guardian and leave some background outside the outline. Add a little space around thin branches.",
    );
  return {
    model: FOCUS_MODEL,
    polygon,
    foreground: encode(representatives(positive)),
    background: encode(representatives(negative)),
  };
}
export function prepareFocus(references: FocusReference[]): DecodedFocus[] {
  return references
    .filter((r) => r.model === FOCUS_MODEL)
    .flatMap((r) => {
      try {
        return [
          {
            guardianId: r.guardianId,
            referenceId: r.referenceId,
            foreground: decodeFocus(r.foreground),
            background: decodeFocus(r.background),
          },
        ];
      } catch {
        return [];
      }
    });
}
export type FocusMatch = {
  guardianId: string | null;
  suggestion: string | null;
  score: number;
  gap: number;
  foreground: number;
  contrast: number;
  points: number[];
};
export function matchFocus(
  features: RegionFeatures,
  references: DecodedFocus[],
): FocusMatch {
  const none = {
    guardianId: null,
    suggestion: null,
    score: 0,
    gap: 0,
    foreground: 0,
    contrast: 0,
    points: [],
  };
  if (
    features.model !== FOCUS_MODEL ||
    features.data.length !== 49 * FOCUS_DIMENSIONS
  )
    return none;
  const ids = [...new Set(references.map((r) => r.guardianId))];
  const ranked = ids
    .map((id) => {
      const refs = references.filter((r) => r.guardianId === id),
        fg = refs.flatMap((r) => r.foreground),
        bg = refs.flatMap((r) => r.background);
      const points = [];
      for (let i = 0; i < 49; i++) {
        // Ignore synthetic contain-padding in either camera orientation.
        const { x, y } = patchPosition(i, features);
        if (x < 0 || x > 1 || y < 0 || y > 1) continue;
        if (i % 7 === 0 || i % 7 === 6) continue;
        const p = features.data.subarray(
          i * FOCUS_DIMENSIONS,
          (i + 1) * FOCUS_DIMENSIONS,
        );
        let f = -1,
          b = -1;
        for (const v of fg) f = Math.max(f, dot(p, v));
        for (const v of bg) b = Math.max(b, dot(p, v));
        points.push({ i, f, contrast: f - b, score: f + 1.5 * (f - b) });
      }
      points.sort((a, b) => b.score - a.score);
      const top = points.slice(0, 5),
        mean = (key: "f" | "contrast" | "score") =>
          top.reduce((s, p) => s + p[key], 0) / top.length;
      return {
        id,
        score: mean("score"),
        foreground: mean("f"),
        contrast: mean("contrast"),
        points: top.map((p) => p.i),
      };
    })
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best) return none;
  const gap = best.score - (ranked[1]?.score ?? 0);
  const accepted =
    best.score >= 0.78 &&
    best.foreground >= 0.64 &&
    best.contrast >= 0.025 &&
    gap >= 0.1;
  const suggested =
    best.score >= 0.68 &&
    best.foreground >= 0.58 &&
    best.contrast >= 0.005 &&
    gap >= 0.05;
  return {
    ...best,
    gap,
    guardianId: accepted ? best.id : null,
    suggestion: !accepted && suggested ? best.id : null,
  };
}
