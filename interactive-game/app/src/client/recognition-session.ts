import type { State } from "../shared/types";
import type { VisionReply } from "./vision.worker";
import { VisionEngine } from "./vision-engine";

// This page owns the feature-only recognition worker. Camera views release
// their images, streams and outline workers, but retain this warmed model.
export class RecognitionSession {
  private engine: VisionEngine | null = null;
  private preparation: Promise<VisionReply> | null = null;
  private prepared = false;
  private listeners = new Set<(text: string) => void>();

  get ready() {
    return this.prepared && !!this.engine && !this.engine.closed;
  }
  getEngine() {
    if (!this.engine || this.engine.closed) {
      this.engine = new VisionEngine("wasm");
      this.preparation = null;
      this.prepared = false;
    }
    return this.engine;
  }
  async prepare(progress?: (text: string) => void) {
    const engine = this.getEngine();
    if (progress) this.listeners.add(progress);
    try {
      if (!this.preparation) {
        this.preparation = engine
          .prepare((text) => {
            for (const listener of this.listeners) listener(text);
          })
          .then((result) => {
            if (engine === this.engine) this.prepared = true;
            return result;
          })
          .catch((error) => {
            if (engine === this.engine) this.close();
            throw error;
          });
      }
      return await this.preparation;
    } finally {
      if (progress) this.listeners.delete(progress);
    }
  }
  close() {
    const engine = this.engine;
    this.engine = null;
    this.preparation = null;
    this.prepared = false;
    this.listeners.clear();
    engine?.close();
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
