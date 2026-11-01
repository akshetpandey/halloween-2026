import type { VisionMatch } from "./vision";
import type { FocusMatch } from "./recognition-focus";

export function recognitionDecision(
  scene: VisionMatch,
  focus: FocusMatch | null,
) {
  const best = scene.candidates[0];
  const sceneSuggestion =
    scene.reason !== "background" &&
    best &&
    scene.score >= 0.6 &&
    scene.gap >= 0.12
      ? { guardianId: best.guardianId, score: scene.score, gap: scene.gap }
      : null;
  if (focus?.guardianId) {
    // Similar branches, fur or lights can produce a convincing local match.
    // A conflicting whole-object ranking needs a human tap, never an auto-wake.
    if (best && best.guardianId !== focus.guardianId) {
      return {
        match: { ...scene, guardianId: null, reason: "ambiguous" as const },
        suggestion: sceneSuggestion ?? {
          guardianId: focus.guardianId,
          score: Math.min(1, focus.score),
          gap: focus.gap,
        },
      };
    }
    return {
      match: {
        guardianId: focus.guardianId,
        score: Math.min(1, focus.score),
        gap: focus.gap,
        reason: "match" as const,
        candidates: [
          { guardianId: focus.guardianId, score: Math.min(1, focus.score) },
          ...scene.candidates.filter((c) => c.guardianId !== focus.guardianId),
        ],
      },
      suggestion: null,
    };
  }
  if (scene.guardianId) return { match: scene, suggestion: null };
  return {
    match: scene,
    suggestion:
      sceneSuggestion ??
      (focus?.suggestion
        ? {
            guardianId: focus.suggestion,
            score: Math.min(1, focus.score),
            gap: focus.gap,
          }
        : null),
  };
}
