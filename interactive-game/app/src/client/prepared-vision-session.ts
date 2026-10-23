import type { VisionReply } from "./vision.worker";
import { VisionEngine } from "./vision-engine";

// Page-owned sessions share in-flight preparation and retain warmed models.
export class PreparedVisionSession {
  constructor(
    private kind: "prepare" | "prepare-segment" = "prepare",
    private backend: "auto" | "wasm" = "wasm",
  ) {}
  protected engine: VisionEngine | null = null;
  private preparation: Promise<VisionReply> | null = null;
  private prepared = false;
  private listeners = new Set<(text: string) => void>();

  get ready() {
    return this.prepared && !!this.engine && !this.engine.closed;
  }
  getEngine() {
    if (!this.engine || this.engine.closed) {
      this.engine = new VisionEngine(this.backend);
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
          .request(this.kind, new Blob(), "prepare", (text) => {
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
