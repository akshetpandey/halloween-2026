// Two links pointing down local -Y, rotating around +X. Keep one knee branch
// throughout the performance; clamp just inside reach to avoid straight-knee snaps.
export function solvePlanarLeg(
  y: number,
  z: number,
  upper: number,
  lower: number,
  bend: 1 | -1 = 1,
) {
  const distance = Math.max(
    Math.abs(upper - lower) + 1e-6,
    Math.min(upper + lower - 1e-6, Math.hypot(y, z)),
  );
  const knee =
    bend *
    Math.acos(
      Math.max(
        -1,
        Math.min(
          1,
          (distance ** 2 - upper ** 2 - lower ** 2) / (2 * upper * lower),
        ),
      ),
    );
  const hip =
    Math.atan2(-z, -y) -
    Math.atan2(lower * Math.sin(knee), upper + lower * Math.cos(knee));
  return { hip, knee };
}
