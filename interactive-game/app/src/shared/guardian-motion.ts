export const MOTION_MODEL = "orb-jsfeat008-rgb640-v1";
export type MotionPoint = { x: number; y: number };
export type MotionRig = Record<"head" | "neck" | "tail" | "rump", MotionPoint>;
export type MotionFeatures = {
  model: string;
  points: number[];
  descriptors: string;
};
export type MotionBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};
export type MotionPose = {
  referenceId: string;
  guardianId: string;
  rig: MotionRig;
  parts: "head" | "tail" | "both";
  bounds: MotionBounds;
  features: MotionFeatures;
};
export type DecodedFeatures = { points: number[]; descriptors: Uint8Array };
export type MotionAlignment = {
  rig: MotionRig;
  bounds: MotionBounds;
  referenceId: string;
  inliers: number;
  pairs: number;
  error: number;
  parts: MotionPose["parts"];
};
export function validMotion(
  value: unknown,
): value is Omit<MotionPose, "referenceId" | "guardianId"> {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<MotionPose>,
    f = v.features;
  const unit = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
  if (
    !v.rig ||
    !["head", "neck", "tail", "rump"].every((k) => {
      const p = v.rig![k as keyof MotionRig];
      return p && unit(p.x) && unit(p.y);
    }) ||
    !["head", "tail", "both"].includes(v.parts ?? "")
  )
    return false;
  const b = v.bounds;
  if (
    !b ||
    ![b.left, b.top, b.right, b.bottom].every(unit) ||
    b.right - b.left < 0.02 ||
    b.bottom - b.top < 0.02
  )
    return false;
  if (
    !f ||
    f.model !== MOTION_MODEL ||
    !Array.isArray(f.points) ||
    f.points.length < 16 ||
    f.points.length > 768 ||
    f.points.length % 2 ||
    !f.points.every(unit) ||
    typeof f.descriptors !== "string" ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(f.descriptors)
  )
    return false;
  try {
    return atob(f.descriptors).length === (f.points.length / 2) * 32;
  } catch {
    return false;
  }
}
export function unpackFeatures(f: MotionFeatures): DecodedFeatures {
  const raw = atob(f.descriptors);
  return {
    points: f.points,
    descriptors: Uint8Array.from(raw, (c) => c.charCodeAt(0)),
  };
}
type Pair = { from: MotionPoint; to: MotionPoint };
type Affine = [number, number, number, number, number, number];
export function project(p: MotionPoint, a: Affine): MotionPoint {
  return {
    x: a[0] * p.x + a[1] * p.y + a[2],
    y: a[3] * p.x + a[4] * p.y + a[5],
  };
}
function solve(rows: number[][]): number[] | null {
  for (let i = 0; i < rows.length; i++) {
    let pivot = i;
    for (let j = i + 1; j < rows.length; j++)
      if (Math.abs(rows[j][i]) > Math.abs(rows[pivot][i])) pivot = j;
    if (Math.abs(rows[pivot][i]) < 1e-9) return null;
    [rows[i], rows[pivot]] = [rows[pivot], rows[i]];
    const d = rows[i][i];
    for (let k = i; k <= rows.length; k++) rows[i][k] /= d;
    for (let j = 0; j < rows.length; j++)
      if (j !== i) {
        const v = rows[j][i];
        for (let k = i; k <= rows.length; k++) rows[j][k] -= v * rows[i][k];
      }
  }
  return rows.map((r) => r[rows.length]);
}
function fit(pairs: Pair[]): Affine | null {
  const normal = Array.from({ length: 3 }, () => [0, 0, 0, 0]),
    other = normal.map((r) => r.slice());
  for (const p of pairs) {
    const row = [p.from.x, p.from.y, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        normal[i][j] += row[i] * row[j];
        other[i][j] += row[i] * row[j];
      }
      normal[i][3] += row[i] * p.to.x;
      other[i][3] += row[i] * p.to.y;
    }
  }
  const x = solve(normal),
    y = solve(other);
  if (!x || !y) return null;
  const a = [...x, ...y] as Affine,
    det = a[0] * a[4] - a[1] * a[3];
  return det > 0.08 &&
    det < 12 &&
    Math.hypot(a[0], a[3]) < 4 &&
    Math.hypot(a[1], a[4]) < 4
    ? a
    : null;
}
export function robustTransform(
  pairs: Pair[],
): { matrix: Affine; inliers: Pair[]; error: number } | null {
  if (pairs.length < 8) return null;
  let seed = 87123;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let best: Pair[] = [];
  for (let k = 0; k < 300; k++) {
    const sample = [
      pairs[Math.floor(random() * pairs.length)],
      pairs[Math.floor(random() * pairs.length)],
      pairs[Math.floor(random() * pairs.length)],
    ];
    const a = fit(sample);
    if (!a) continue;
    const inliers = pairs.filter((p) => {
      const q = project(p.from, a);
      return Math.hypot(q.x - p.to.x, q.y - p.to.y) < 0.018;
    });
    if (inliers.length > best.length) best = inliers;
  }
  if (best.length < 8 || best.length / pairs.length < 0.35) return null;
  const xs = best.map((p) => p.from.x),
    ys = best.map((p) => p.from.y);
  if (
    Math.max(...xs) - Math.min(...xs) < 0.08 ||
    Math.max(...ys) - Math.min(...ys) < 0.08
  )
    return null;
  const matrix = fit(best);
  if (!matrix) return null;
  const error =
    best.reduce((n, p) => {
      const q = project(p.from, matrix);
      return n + Math.hypot(q.x - p.to.x, q.y - p.to.y);
    }, 0) / best.length;
  return error < 0.012 ? { matrix, inliers: best, error } : null;
}
const bits = Uint8Array.from({ length: 256 }, (_, v) => {
  let n = 0;
  while (v) {
    v &= v - 1;
    n++;
  }
  return n;
});
export function matchLocal(a: DecodedFeatures, b: DecodedFeatures): Pair[] {
  const na = a.points.length / 2,
    nb = b.points.length / 2,
    forward = new Int32Array(na).fill(-1),
    reverse = new Int32Array(nb).fill(-1),
    rb = new Uint16Array(nb).fill(257);
  for (let i = 0; i < na; i++) {
    let best = 257,
      second = 257,
      index = -1;
    for (let j = 0; j < nb; j++) {
      let distance = 0;
      for (let c = 0; c < 32; c++)
        distance += bits[a.descriptors[i * 32 + c] ^ b.descriptors[j * 32 + c]];
      if (distance < rb[j]) {
        rb[j] = distance;
        reverse[j] = i;
      }
      if (distance < best) {
        second = best;
        best = distance;
        index = j;
      } else if (distance < second) second = distance;
    }
    if (best < 65 && best < 0.78 * second) forward[i] = index;
  }
  const pairs: Pair[] = [];
  for (let i = 0; i < na; i++) {
    const j = forward[i];
    if (j >= 0 && reverse[j] === i)
      pairs.push({
        from: { x: a.points[i * 2], y: a.points[i * 2 + 1] },
        to: { x: b.points[j * 2], y: b.points[j * 2 + 1] },
      });
  }
  return pairs;
}
export function alignMotion(
  poses: MotionPose[],
  query: DecodedFeatures,
): MotionAlignment | null {
  let best: MotionAlignment | null = null;
  for (const pose of poses) {
    const pairs = matchLocal(unpackFeatures(pose.features), query),
      fit = robustTransform(pairs);
    if (!fit) continue;
    const sourceX = fit.inliers.map((p) => p.from.x),
      sourceY = fit.inliers.map((p) => p.from.y);
    if (
      Math.max(...sourceX) - Math.min(...sourceX) <
        (pose.bounds.right - pose.bounds.left) * 0.3 ||
      Math.max(...sourceY) - Math.min(...sourceY) <
        (pose.bounds.bottom - pose.bounds.top) * 0.3
    )
      continue;
    const rig = Object.fromEntries(
      Object.entries(pose.rig).map(([k, p]) => [k, project(p, fit.matrix)]),
    ) as MotionRig;
    if (
      Object.values(rig).some((p) => p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)
    )
      continue;
    const b = pose.bounds,
      corners = [
        { x: b.left, y: b.top },
        { x: b.right, y: b.top },
        { x: b.left, y: b.bottom },
        { x: b.right, y: b.bottom },
      ].map((p) => project(p, fit.matrix));
    const bounds = {
      left: Math.max(0, Math.min(...corners.map((p) => p.x))),
      top: Math.max(0, Math.min(...corners.map((p) => p.y))),
      right: Math.min(1, Math.max(...corners.map((p) => p.x))),
      bottom: Math.min(1, Math.max(...corners.map((p) => p.y))),
    };
    const candidate = {
      rig,
      bounds,
      referenceId: pose.referenceId,
      parts: pose.parts,
      inliers: fit.inliers.length,
      pairs: pairs.length,
      error: fit.error,
    };
    if (
      !best ||
      candidate.inliers > best.inliers ||
      (candidate.inliers === best.inliers && candidate.error < best.error)
    )
      best = candidate;
  }
  return best;
}
