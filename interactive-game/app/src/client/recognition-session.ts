import type { State } from "../shared/types";

import { PreparedVisionSession } from "./prepared-vision-session";

export class RecognitionSession extends PreparedVisionSession {}

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
