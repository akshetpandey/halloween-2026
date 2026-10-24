import url from "./assets/red-panda/RedPanda.glb?url";
export const PANDA_MODEL = {
  url,
  name: "The Fox of Small Print · woodland red panda",
};
export function pandaClip(
  beat: string,
  available?: { has(name: string): boolean },
) {
  const primary =
    (
      {
        notice: "Anticipate",
        chase: "Run",
        pounce: "Pounce",
        settle: "Settle",
        curious: "Curious",
        greet: "Greet",
      } as Record<string, string>
    )[beat] ?? "Survey";
  if (!available || available.has(primary)) return primary;
  // Previously downloaded four-clip pandas must stay seated through Curious.
  return beat === "curious" ? "Greet" : beat === "pounce" ? "Run" : "Survey";
}
