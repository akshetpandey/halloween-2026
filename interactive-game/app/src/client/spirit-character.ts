export type SpiritCharacter = "fox" | "tree";
export const spiritCharacters = {
  fox: {
    hello: "Well, hello there.",
    name: "The Fox of Small Print",
    noun: "fox",
    greeting: "The terms are before you. I do recommend reading them.",
    response: "A promising witness.",
    credits:
      "An original woodland character inspired by the host’s LEGO 31394 red panda: warm orange, ivory markings, a striped tail and a little mischief. Built for Hollow Court.",
    craft:
      "Clean modeled shapes, a connected bendable tail, blinking eyes and custom head, ear and paw animation. The capture was used only as a shape and color reference.",
  },
  tree: {
    hello: "A fine new entry.",
    name: "The Gilded Root",
    noun: "Gilded Root",
    greeting:
      "Names fade. Impressions last. Let us see which you intend to leave.",
    response: "Duly noted. A most promising entry.",
    credits:
      "An original woodland spirit inspired by the host’s gold branch floor lamp: antique gold, a linen shade, twig forks and splayed roots. Built for Hollow Court.",
    craft:
      "A continuous bendable trunk, a tipping lampshade, blinking bark-knot eyes and a little luminous ledger leaf. Reference photographs supplied shape and material guidance; no photo pixels are included.",
  },
};
export function hostSpiritCharacter(art?: string): SpiritCharacter | null {
  return art === "fox" || art === "tree" ? art : null;
}
