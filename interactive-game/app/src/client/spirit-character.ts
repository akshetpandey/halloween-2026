import { guardians } from "../shared/catalog";
function character(art: string, noun: string, hello: string, response: string) {
  const guardian = guardians.find((g) => g.art === art);
  if (!guardian) throw Error("Unknown guardian character");
  return {
    name: guardian.name,
    greeting: guardian.greeting,
    noun,
    hello,
    response,
    credits:
      "An original Hollow Court character modeled from the host’s guardian photographs. No scan geometry or photograph textures are included.",
    craft:
      "Clean modeled forms, articulated details and a little performance written for this guardian. Built for a phone-sized woodland encounter.",
  };
}
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
  moon: character("moon", "moon", "I am listening.", "There is no hurry."),
  guardian: character(
    "guardian",
    "Keeper",
    "Ah. You heard it too.",
    "A fine pulse, that.",
  ),
  seed: character(
    "seed",
    "pumpkin",
    "One for you, of course.",
    "There is sweetness enough.",
  ),
  skull: character(
    "skull",
    "Unfinished Guest",
    "Another moment, then.",
    "You do have an interesting face.",
  ),
  raven: character(
    "raven",
    "raven",
    "Come a little closer.",
    "An excellent development.",
  ),
  owl: character(
    "owl",
    "owl",
    "Precisely as I suspected.",
    "I shall consider your evidence.",
  ),
  stag: character(
    "stag",
    "stag",
    "There you are.",
    "The path has room for you.",
  ),
  hare: character("hare", "hare", "Oh! You kept up.", "Shall we try again?"),
  fork: character(
    "fork",
    "First Knock",
    "You began.",
    "That is often the hardest part.",
  ),
  ember: character(
    "ember",
    "Ember Guest",
    "A little flourish helps.",
    "Now that is an entrance.",
  ),
  knots: character(
    "knots",
    "Knotkeeper",
    "There. A little closer.",
    "Every joining makes a difference.",
  ),
  host: character(
    "host",
    "Little Host",
    "I saved you a place.",
    "Come in, come in.",
  ),
  door: character(
    "door",
    "Open Door",
    "After you.",
    "Let us leave a little room.",
  ),
};
export type SpiritCharacter = keyof typeof spiritCharacters;
export function isSpiritCharacter(art: unknown): art is SpiritCharacter {
  return typeof art === "string" && Object.hasOwn(spiritCharacters, art);
}
export function hostSpiritCharacter(art?: string): SpiritCharacter | null {
  return isSpiritCharacter(art) ? art : null;
}
