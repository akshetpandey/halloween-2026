import { extractMotion } from "./motion-features";
import {
  alignMotion,
  unpackFeatures,
  type MotionBounds,
  type MotionPose,
} from "../shared/guardian-motion";
self.onmessage = async (
  e: MessageEvent<{ image: Blob; bounds?: MotionBounds; poses?: MotionPose[] }>,
) => {
  try {
    const f = await extractMotion(e.data.image, e.data.bounds);
    self.postMessage(
      e.data.bounds
        ? { features: f }
        : { alignment: alignMotion(e.data.poses ?? [], unpackFeatures(f)) },
    );
  } catch {
    self.postMessage({
      error: "This view could not be aligned. Try a clearer photograph.",
    });
  }
};
