import { PreparedVisionSession } from "./prepared-vision-session";
import { recognitionSession } from "./recognition-session";
import { OutlineSafety } from "./outline-safety";
import type { VisionReply } from "./vision.worker";

export class SegmentationSession extends PreparedVisionSession {
  private safety = new OutlineSafety();
  constructor() {
    super("prepare-segment", "wasm", "segmentation");
  }
  prepare(progress?: (text: string) => void) {
    return this.safety.run(() => super.prepare(progress));
  }
  retry() {
    this.safety.retry();
  }
  segment(
    image: Blob,
    key: string,
    progress: (text: string) => void,
    point: { x: number; y: number },
  ): Promise<VisionReply> {
    return this.safety.run(() =>
      this.getEngine().request("segment", image, key, progress, point),
    );
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
const current = new SegmentationSession();
export const getSegmentationSession = () => current;
export async function prepareArrivalVision() {
  // Give the small recognizer priority; signup never awaits either model.
  await recognitionSession.prepare();
  await getSegmentationSession().prepare();
}
