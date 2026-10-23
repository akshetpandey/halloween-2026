import type {
  MotionAlignment,
  MotionBounds,
  MotionFeatures,
  MotionPose,
} from "../shared/guardian-motion";
export function motionRequest(
  image: Blob,
  options: { bounds?: MotionBounds; poses?: MotionPose[]; timeoutMs?: number },
): Promise<{ features?: MotionFeatures; alignment?: MotionAlignment | null }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./motion.worker.ts", import.meta.url), {
      type: "module",
    });
    const done = () => {
      clearTimeout(timer);
      worker.terminate();
    };
    const timer = setTimeout(() => {
      done();
      reject(Error("Movement alignment took too long."));
    }, options.timeoutMs ?? 5000);
    worker.onmessage = (e) => {
      done();
      if (e.data.error) reject(Error(e.data.error));
      else resolve(e.data);
    };
    worker.onerror = () => {
      done();
      reject(Error("Movement alignment is unavailable."));
    };
    worker.postMessage({ image, bounds: options.bounds, poses: options.poses });
  });
}
