import { PANDA_MODEL } from "./panda-model";
import { ROOT_MODEL } from "./gilded-root-model";
import type { SpiritCharacter } from "./spirit-character";
import moon from "./assets/moon/MoonThatStayed.glb?url";
import guardian from "./assets/guardian/KeeperOfPulse.glb?url";
import seed from "./assets/seed/LastSeed.glb?url";
import skull from "./assets/skull/UnfinishedGuest.glb?url";
import raven from "./assets/raven/Raven.glb?url";
import owl from "./assets/owl/BarnOwl.glb?url";
import stag from "./assets/stag/GoldenStag.glb?url";
import hare from "./assets/hare/Hare.glb?url";
import fork from "./assets/fork/ForkSpirit.glb?url";
import ember from "./assets/ember/EmberSpirit.glb?url";
import knots from "./assets/knots/KnotsSpirit.glb?url";
import host from "./assets/host/HostSpirit.glb?url";
import door from "./assets/door/DoorSpirit.glb?url";

// URL imports publish hashed assets; only the selected character is fetched.
export const SPIRIT_MODELS: Record<SpiritCharacter, { url: string }> = {
  fox: PANDA_MODEL,
  tree: ROOT_MODEL,
  moon: { url: moon },
  guardian: { url: guardian },
  seed: { url: seed },
  skull: { url: skull },
  raven: { url: raven },
  owl: { url: owl },
  stag: { url: stag },
  hare: { url: hare },
  fork: { url: fork },
  ember: { url: ember },
  knots: { url: knots },
  host: { url: host },
  door: { url: door },
};
