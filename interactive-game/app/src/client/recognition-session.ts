import type { State } from "../shared/types";

import { PreparedVisionSession } from "./prepared-vision-session";
import type { FocusReference } from "../shared/recognition-focus";
import type { VisionEngine } from "./vision-engine";
import type { VisionReply } from "./vision.worker";

export class RecognitionSession extends PreparedVisionSession {
  private focusEngine: VisionEngine | null = null;
  private focusReferences: FocusReference[] | null = null;
  private focusPreparation: Promise<VisionReply> | null = null;
  configureFocus(references: FocusReference[]) {
    const engine = this.getEngine();
    if (engine !== this.focusEngine || references !== this.focusReferences) {
      this.focusEngine = engine;
      this.focusReferences = references;
      this.focusPreparation = engine.request(
        "configure-focus",
        new Blob(),
        "focus-gallery",
        undefined,
        undefined,
        references,
      );
    }
    return this.focusPreparation!;
  }
}

export const recognitionSession = new RecognitionSession();

// Follow the current rehearsal-only camera rollout. Merely opening the sealed
// public entrance or the host guest book must not download recognition assets.
export function shouldWarmRecognition(
  state: Pick<State, "previewAvailable" | "status" | "player"> | null,
  path: string,
) {
  if (
    !state?.previewAvailable ||
    state.status === "closed" ||
    path === "/sealed" ||
    path === "/host"
  )
    return false;
  return (
    path === "/join" ||
    path === "/recover" ||
    (state.status === "open" && !!state.player)
  );
}
