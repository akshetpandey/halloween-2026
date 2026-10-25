import url from "./assets/gilded-root/GildedRoot.glb?url";
export const ROOT_MODEL = { url, name: "The Gilded Root · gold branch lamp" };
export function rootClip(beat: string) {
  return (
    (
      {
        wake: "Wake",
        flutter: "ChaseLeaf",
        catch: "Catch",
        bow: "Bow",
        greet: "Greet",
      } as Record<string, string>
    )[beat] ?? "Idle"
  );
}
