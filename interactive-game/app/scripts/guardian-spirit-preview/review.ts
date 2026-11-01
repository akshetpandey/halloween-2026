import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SPIRIT_MODELS } from "../../src/client/spirit-models";
import {
  spiritCharacters,
  type SpiritCharacter,
} from "../../src/client/spirit-character";
const canvas = document.querySelector("canvas")!,
  renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(1500, 900, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
const labels = document.querySelector(".labels")!,
  beat = document.querySelector<HTMLSelectElement>("#beat")!,
  pose = document.querySelector<HTMLInputElement>("#pose")!;
let angle = false,
  playing = false,
  start = 0;
const order: SpiritCharacter[] = [
  "fox",
  "tree",
  "moon",
  "guardian",
  "seed",
  "skull",
  "raven",
  "owl",
  "stag",
  "hare",
  "fork",
  "ember",
  "knots",
  "host",
  "door",
];
const entries = await Promise.all(
  order.map(async (key) => {
    const gltf = await new GLTFLoader().loadAsync(SPIRIT_MODELS[key].url),
      scene = new T.Scene();
    scene.background = new T.Color("#162b23");
    const model = gltf.scene;
    scene.add(model);
    const box = new T.Box3().setFromObject(model),
      size = box.getSize(new T.Vector3()),
      center = box.getCenter(new T.Vector3());
    model.position.sub(center);
    const span = Math.max(size.y, size.x / 1.0, size.z) * 1.4,
      camera = new T.OrthographicCamera(
        -span / 2,
        span / 2,
        span / 2,
        -span / 2,
        0.01,
        100,
      );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    scene.add(new T.HemisphereLight(0xfff5de, 0x123f31, 2));
    for (const [color, intensity, x, y, z] of [
      [0xffe4ba, 2.2, -1, 2, 4],
      [0x86ffc4, 1.5, 2, 1, -3],
      [0xc7d8ff, 1.2, 3, 0.2, 3],
    ]) {
      const light = new T.DirectionalLight(color, intensity);
      light.position.set(x, y, z);
      scene.add(light);
    }
    const mixer = new T.AnimationMixer(model),
      actions = new Map(
        gltf.animations.map((c) => [c.name, mixer.clipAction(c)]),
      );
    const label = document.createElement("div");
    label.className = "label";
    const name = document.createElement("span");
    name.textContent = spiritCharacters[key].name;
    label.append(name);
    const open = document.createElement("button");
    open.textContent = "Phone preview · " + key;
    open.onclick = () =>
      (location.href = "/scripts/fox-spirit-preview/?guardian=" + key);
    label.append(open);
    labels.append(label);
    return {
      key,
      scene,
      camera,
      model,
      mixer,
      actions,
      span,
      clip: gltf.animations[0],
    };
  }),
);
// Async loading may finish out of order; labels must match the render cells.
labels.replaceChildren(
  ...order.map((key) => {
    const label = document.createElement("div");
    label.className = "label";
    const name = document.createElement("span");
    name.textContent = spiritCharacters[key].name;
    const button = document.createElement("button");
    button.textContent = "Phone preview · " + key;
    button.onclick = () =>
      (location.href = "/scripts/fox-spirit-preview/?guardian=" + key);
    label.append(name, button);
    return label;
  }),
);
function clipName(key: SpiritCharacter, b: string) {
  return key === "fox"
    ? ({
        Idle: "Survey",
        Awaken: "Anticipate",
        Play: "Run",
        Settle: "Settle",
        Greet: "Greet",
      }[b] ?? "Survey")
    : key === "tree"
      ? ({
          Idle: "Idle",
          Awaken: "Wake",
          Play: "ChaseLeaf",
          Settle: "Bow",
          Greet: "Greet",
        }[b] ?? "Idle")
      : b;
}
function render() {
  renderer.setScissorTest(true);
  entries.forEach((e, i) => {
    e.mixer.stopAllAction();
    const action = e.actions.get(clipName(e.key, beat.value))!;
    action.setLoop(T.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.reset().play();
    e.mixer.setTime(Number(pose.value) * action.getClip().duration);
    e.camera.position.set(angle ? 6 : 0, angle ? 1 : 0, 10);
    e.camera.lookAt(0, 0, 0);
    const col = i % 5,
      row = Math.floor(i / 5);
    renderer.setViewport(col * 300, (2 - row) * 300, 300, 300);
    renderer.setScissor(col * 300, (2 - row) * 300, 300, 300);
    renderer.render(e.scene, e.camera);
  });
  document.querySelector("#status")!.textContent =
    `${entries.length} exported models · ${beat.value} · pose ${Number(pose.value).toFixed(2)}`;
}
beat.onchange = () => {
  playing = false;
  pose.value = "0";
  render();
};
pose.oninput = () => {
  playing = false;
  render();
};
document.querySelector<HTMLButtonElement>("#angle")!.onclick = () => {
  angle = !angle;
  render();
};
document.querySelector<HTMLButtonElement>("#play")!.onclick = () => {
  playing = true;
  start = performance.now();
  pose.value = "0";
};
function tick(now: number) {
  if (playing) {
    pose.value = String(Math.min(1, (now - start) / 3000));
    render();
    if (Number(pose.value) >= 1) playing = false;
  }
  requestAnimationFrame(tick);
}
render();
requestAnimationFrame(tick);
