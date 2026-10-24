import type { MotionAlignment, MotionPose } from "../shared/guardian-motion";
// The anchor is cosmetic. A difficult angle/network must not delay the character.
export const SPIRIT_ANCHOR_BUDGET_MS = 200;
export async function resolveSpiritEntrance(
  saved: Promise<MotionPose[]>,
  match: (
    poses: MotionPose[],
    remainingMs: number,
  ) => Promise<MotionAlignment | null>,
): Promise<MotionAlignment | null> {
  const deadline = performance.now() + SPIRIT_ANCHOR_BUDGET_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const poses = await saved;
        const remaining = deadline - performance.now();
        return poses.length && remaining > 20 ? match(poses, remaining) : null;
      })(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), SPIRIT_ANCHOR_BUDGET_MS);
      }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
