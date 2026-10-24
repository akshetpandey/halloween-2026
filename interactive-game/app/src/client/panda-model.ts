import url from "./assets/red-panda/RedPanda.glb?url";
export const PANDA_MODEL = {
  url,
  name: "The Fox of Small Print · woodland red panda",
};
export type PandaBeat = "emerge" | "notice" | "chase" | "settle" | "greet";
export function pandaClip(beat: string) {
  return beat === "chase"
    ? "Run"
    : beat === "settle"
      ? "Settle"
      : beat === "greet"
        ? "Greet"
        : "Survey";
}
