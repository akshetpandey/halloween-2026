let pending: Promise<typeof import("./fox-spirit-runtime")> | null = null;
export function preloadFoxSpirit() {
  if (!pending)
    pending = import("./fox-spirit-runtime")
      .then(async (runtime) => {
        await runtime.prepareFoxSpirit();
        return runtime;
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  return pending;
}
