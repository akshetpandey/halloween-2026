import { PreparedVisionSession } from "./prepared-vision-session";
import { recognitionSession } from "./recognition-session";

export class SegmentationSession extends PreparedVisionSession {
  constructor(backend: "auto" | "wasm" = "auto") {
    super("prepare-segment", backend);
  }
  clearImage() {
    // Queue disposal after any in-flight inference without throwing away the
    // warmed encoder/decoder. No worker is created just to clear an image.
    if (this.engine && !this.engine.closed)
      void this.engine
        .request("release-image", new Blob(), "release")
        .catch(() => {});
  }
}
let current: { backend: "auto" | "wasm"; session: SegmentationSession } | null =
  null;
export function getSegmentationSession(backend: "auto" | "wasm" = "auto") {
  // Retain only one large segmentation session, including in host comparison mode.
  if (!current || current.backend !== backend) {
    current?.session.close();
    current = { backend, session: new SegmentationSession(backend) };
  }
  return current.session;
}
export async function prepareArrivalVision() {
  // Give the small recognizer priority; signup never awaits either model.
  await recognitionSession.prepare();
  await getSegmentationSession().prepare();
}
