import type { SpiritCharacter } from "./spirit-character";
let pending: Promise<typeof import("./fox-spirit-runtime")> | null = null;
export function prepareSpiritRenderer() {
  if (!pending)
    pending = import("./fox-spirit-runtime").catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}
export async function preloadFoxSpirit(character: SpiritCharacter = "fox") {
  const runtime = await prepareSpiritRenderer();
  await runtime.prepareFoxSpirit(character);
  return runtime;
}
