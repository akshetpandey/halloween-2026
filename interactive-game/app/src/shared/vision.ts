export const VISION_MODEL = "mobilenetv3-small-f32-b1a19675-features-v2";
export const VISION_DIMENSIONS = 1024;
export const VISION_ASSETS = "/models/hc-vision-48988dfe-5850ab45-ort130-v1/";
export const RECOGNITION_ASSETS = "/models/hc-lens-mbv3-b1a19675-f32-v2/";
export const MAX_REFERENCES = 40;
export type VisionSettings = { threshold: number; margin: number };
export type VisionReference = {
  id: string;
  guardianId: string | null;
  vector: number[];
};
export type VisionManifest = {
  model: string;
  settings: VisionSettings;
  references: VisionReference[];
};
export type HostReference = {
  id: string;
  guardianId: string | null;
  createdAt: number;
  note: string;
  needsProcessing: boolean;
};
export type HostVision = VisionManifest & {
  photos: HostReference[];
  guardians: { id: string; name: string; art: string; enabled: boolean }[];
};
export type VisionMatch = {
  guardianId: string | null;
  score: number;
  gap: number;
  reason: "match" | "empty" | "weak" | "ambiguous" | "background";
  candidates: { guardianId: string; score: number }[];
};
export function normalizeVector(value: unknown): number[] | null {
  if (
    !Array.isArray(value) ||
    value.length !== VISION_DIMENSIONS ||
    value.some(
      (x) => typeof x !== "number" || !Number.isFinite(x) || Math.abs(x) > 1e6,
    )
  )
    return null;
  const length = Math.hypot(...value);
  if (length < 1e-8) return null;
  return value.map((x: number) => x / length);
}
export function cosine(a: number[], b: number[]) {
  return a.reduce((sum, x, i) => sum + x * b[i], 0);
}
export function matchGuardian(
  value: number[],
  manifest: VisionManifest,
): VisionMatch {
  const vector = normalizeVector(value);
  const best = new Map<string, number>();
  let background = -1;
  for (const ref of manifest.references) {
    if (!vector || ref.vector.length !== vector.length) continue;
    const score = Math.max(-1, Math.min(1, cosine(vector, ref.vector)));
    if (ref.guardianId === null) background = Math.max(background, score);
    else
      best.set(ref.guardianId, Math.max(best.get(ref.guardianId) ?? -1, score));
  }
  const candidates = [...best]
    .map(([guardianId, score]) => ({ guardianId, score }))
    .sort(
      (a, b) => b.score - a.score || a.guardianId.localeCompare(b.guardianId),
    );
  const first = candidates[0];
  const score = first?.score ?? 0;
  const gap = first
    ? score - Math.max(candidates[1]?.score ?? -1, background)
    : 0;
  let reason: VisionMatch["reason"] = "match";
  if (!first || !vector) reason = "empty";
  else if (background >= score - manifest.settings.margin)
    reason = "background";
  else if (score < manifest.settings.threshold) reason = "weak";
  else if (gap < manifest.settings.margin) reason = "ambiguous";
  return {
    guardianId: reason === "match" ? first.guardianId : null,
    score,
    gap,
    reason,
    candidates,
  };
}
