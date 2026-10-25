import type { SpiritCharacter } from "./spirit-character";
let pending: Promise<typeof import("./fox-spirit-runtime")> | null = null;
export async function preloadFoxSpirit(character: SpiritCharacter = "fox") {
  if (!pending)
    pending = import("./fox-spirit-runtime").catch((error) => {
      pending = null;
      throw error;
    });
  const runtime = await pending;
  await runtime.prepareFoxSpirit(character);
  return runtime;
}
