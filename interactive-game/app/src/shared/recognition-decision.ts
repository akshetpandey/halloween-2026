import type { VisionMatch } from "./vision";
import type { FocusMatch } from "./recognition-focus";

export function recognitionDecision(
  scene: VisionMatch,
  focus: FocusMatch | null,
) {
  const best = scene.candidates[0];
  const sceneSuggestion =
    scene.reason !== "background" &&
    scene.reason !== "empty" &&
    best &&
    ((scene.score >= 0.54 && scene.gap >= 0.06) ||
      (!focus?.guardianId && scene.score >= 0.66 && scene.gap >= 0.04))
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
  // Party-light mode: a distinct whole-object sighting needs less similarity.
  // Foreground agreement can support a darker view. Competing identities and
  // known backgrounds still need a tap rather than waking the wrong guardian.
  const agrees = focus?.suggestion === best?.guardianId;
  const conflict = focus?.suggestion && !agrees;
  if (
    best &&
    scene.reason !== "background" &&
    scene.reason !== "empty" &&
    !conflict &&
    ((scene.score >= 0.72 && scene.gap >= 0.08) ||
      (agrees && scene.score >= 0.65 && scene.gap >= 0.05))
  ) {
    return {
      match: {
        ...scene,
        guardianId: best.guardianId,
        reason: "match" as const,
      },
      suggestion: null,
    };
  }
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
