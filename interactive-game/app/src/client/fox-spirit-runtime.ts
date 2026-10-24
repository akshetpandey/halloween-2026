import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { PANDA_MODEL, pandaClip } from "./panda-model";
import {
  coverOrigin,
  foxStory,
  spiritFrame,
  type SpiritOrigin,
} from "./spirit-motion";
import type { SpiritAsset } from "./spirit-asset";
let template: Promise<GLTF> | null = null;
export function prepareFoxSpirit() {
  if (!template)
    template = new GLTFLoader().loadAsync(PANDA_MODEL.url).catch((e) => {
      template = null;
      throw e;
    });
  return template;
}
export type SpiritStats = {
  fps: number;
  drawCalls: number;
  triangles: number;
  readyMs: number;
};
export type SpiritStage = {
  ready: Promise<void>;
  pause: (paused: boolean) => void;
  replay: () => void;
  greet: () => void;
  dispose: () => void;
  turn: (angle: number) => void;
};
export function mountFoxSpirit(
  canvas: HTMLCanvasElement,
  origin: SpiritOrigin,
  image: { width: number; height: number } | undefined,
  events: {
    ready: () => void;
    error: () => void;
    stats: (stats: SpiritStats) => void;
  },
  asset?: SpiritAsset,
): SpiritStage {
  const started = performance.now();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
    depth: true,
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 6000);
  camera.position.set(0, 0, 2000);
  camera.lookAt(0, 0, 0);
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xfff5de, 0x123f31, 2));
  const key = new THREE.DirectionalLight(0xffe4ba, 2.2);
  key.position.set(-1, 2, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x86ffc4, 1.5);
  rim.position.set(2, 1, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xc7d8ff, 1.2);
  fill.position.set(3, 0.2, 3);
  scene.add(fill);
  let yaw = asset?.front ?? 0;
  let head: THREE.Object3D | undefined;
  let choreographed = false;
  const actions = new Map<string, THREE.AnimationAction>();
  let active: THREE.AnimationAction | undefined;
  let disposed = false,
    paused = false,
    frame = 0,
    last = 0,
    elapsed = 0,
    replyAt = -100,
    width = 1,
    height = 1,
    fit = 1,
    modelSize = new THREE.Vector3(1, 1, 1),
    mixer: THREE.AnimationMixer | undefined,
    model: THREE.Object3D | undefined;
  let drawn = 0,
    measured = 0,
    readyMs = 0,
    modelMaterials: THREE.MeshStandardMaterial[] = [];
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xefd29a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.006, 4, 96),
    ringMaterial,
  );
  ring.position.z = -40;
  scene.add(ring);
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(0.84, 0.003, 3, 96),
    ringMaterial,
  );
  inner.position.z = -38;
  scene.add(inner);
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  const ctx = shadowCanvas.getContext("2d")!,
    gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "#8dcba55c");
  gradient.addColorStop(0.45, "#3f946535");
  gradient.addColorStop(1, "#12332000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas),
      transparent: true,
      depthWrite: false,
      opacity: 0,
    }),
  );
  shadow.position.z = -45;
  scene.add(shadow);
  const count = 128,
    positions = new Float32Array(count * 3),
    sizes = new Float32Array(count),
    seeds = Float32Array.from(
      { length: count },
      (_, i) => (i * 0.61803398875) % 1,
    );
  for (let i = 0; i < count; i++) sizes[i] = 1.5 + seeds[i] * 3;
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  particleGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const particleMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uOpacity: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader:
      "attribute float aSize;uniform float uPixelRatio;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uPixelRatio;}",
    fragmentShader:
      "uniform float uOpacity;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=pow(1.-r,2.)*uOpacity;gl_FragColor=vec4(1.,.88,.57,a);}",
  });
  const sparks = new THREE.Points(particleGeometry, particleMaterial);
  sparks.frustumCulled = false;
  scene.add(sparks);
  const resize = () => {
    const rect = canvas.getBoundingClientRect(),
      w = Math.max(1, Math.round(rect.width)),
      h = Math.max(1, Math.round(rect.height));
    if (w === width && h === height) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.left = -w / 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    fit = Math.min(
      (w * (w > h * 1.1 ? 0.54 : 1) * 0.79) / modelSize.x,
      (h * 0.45) / modelSize.y,
    );
    // Resizing clears the drawing buffer, even while the character is paused.
    if (model) render(performance.now(), true);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  function render(time: number, redraw = false) {
    if (!redraw) frame = 0;
    if (disposed || (!redraw && (paused || document.hidden))) return;
    if (!redraw && time - last < 1000 / 30) {
      frame = requestAnimationFrame(render);
      return;
    }
    const actualDt = !redraw && last ? (time - last) / 1000 : 0;
    const dt = Math.min(0.065, actualDt);
    if (!redraw) last = time;
    elapsed += dt;
    const mapped = coverOrigin(origin, image, { width, height }),
      pose = spiritFrame(elapsed, mapped, {
        x: width > height * 1.1 ? 0.27 : 0.5,
        y: width > height * 1.1 ? 0.48 : 0.34,
        size: 1,
      }),
      story = foxStory(choreographed ? elapsed : 0),
      reaction = Math.max(0, 1 - (elapsed - replyAt) / 1.3),
      hop =
        Math.sin(Math.min(1, (elapsed - replyAt) / 0.7) * Math.PI) *
        Math.max(0, reaction) *
        height *
        0.035;
    const next = choreographed
      ? actions.get(pandaClip(story.beat))
      : actions.values().next().value;
    if (next && next !== active) {
      next.reset().play();
      active?.crossFadeTo(next, 0.12, false);
      active = next;
    }
    mixer?.update(
      dt * (story.running ? 1.1 : story.beat === "settle" ? 1 : 0.85),
    );
    if (head) {
      head.rotateY(story.turnToTail * 0.9);
      head.rotateX(Math.sin(elapsed * 7) * reaction * 0.07);
    }
    const turn = yaw + story.yaw;
    // During the chase the long side of the fox must also fit on the phone.
    const projectedWidth =
      Math.abs(Math.cos(turn)) * modelSize.x +
      Math.abs(Math.sin(turn)) * modelSize.z;
    const stageWidth = width * (width > height * 1.1 ? 0.54 : 1);
    const frameFit = Math.min(
      fit,
      (stageWidth * (story.running ? 0.52 : 0.77)) / projectedWidth,
    );
    root.position.set(
      (pose.x - 0.5) * width + story.x * stageWidth,
      (0.5 - pose.y) * height +
        Math.sin(elapsed * 1.9) * height * 0.003 * pose.arrival +
        hop +
        story.y * height -
        modelSize.y * frameFit * story.sit * 0.08,
      0,
    );
    root.scale.setScalar(frameFit * pose.scale);
    // The scanned view never supplies rotation: the character faces the viewer.
    body.rotation.set(
      0.08 - story.sit * 0.13,
      turn,
      Math.sin(elapsed * 1.6) * 0.012 * pose.arrival +
        Math.sin(elapsed * 8) * reaction * 0.025,
    );
    for (const m of modelMaterials) {
      m.opacity = pose.opacity;
      m.emissiveIntensity = 0.1 + pose.portal * 0.2 + reaction * 0.16;
    }
    const floor =
        root.position.y -
        modelSize.y * frameFit * pose.scale * (0.47 - story.sit * 0.08),
      radius =
        Math.min(width * 0.34, modelSize.x * fit * 0.7) *
        (0.75 + pose.portal * 0.15);
    for (const r of [ring, inner]) {
      r.position.x = root.position.x;
      r.position.y = floor;
      r.scale.set(radius, radius * 0.22, 1);
      r.rotation.z = Math.sin(elapsed * 0.5) * 0.03;
    }
    ringMaterial.opacity = (0.35 + pose.portal * 0.5) * pose.opacity;
    shadow.position.set(root.position.x, floor, -45);
    shadow.scale.set(radius * 1.2, radius * 0.32, 1);
    (shadow.material as THREE.MeshBasicMaterial).opacity = pose.opacity * 0.8;
    for (let i = 0; i < count; i++) {
      const seed = seeds[i],
        a = i * 2.399963 + elapsed * (0.12 + seed * 0.18),
        spread = 0.1 + ((seed + elapsed * 0.055) % 1) * 0.55,
        lift = (seed * 3.7 + elapsed * 0.1) % 1;
      positions[i * 3] = root.position.x + Math.cos(a) * width * spread * 0.65;
      positions[i * 3 + 1] = floor + lift * height * 0.6;
      positions[i * 3 + 2] = 20 + Math.sin(a) * 60;
    }
    particleGeometry.attributes.position.needsUpdate = true;
    particleMaterial.uniforms.uOpacity.value =
      pose.opacity * (0.45 + pose.portal * 0.45 + reaction * 0.3);
    renderer.render(scene, camera);
    drawn++;
    measured += actualDt;
    if (measured >= 1) {
      events.stats({
        fps: drawn / measured,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        readyMs,
      });
      drawn = 0;
      measured = 0;
    }
    if (!redraw) frame = requestAnimationFrame(render);
  }
  const resume = () => {
    cancelAnimationFrame(frame);
    last = 0;
    if (!disposed && !paused && !document.hidden && model)
      frame = requestAnimationFrame(render);
  };
  const lost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(frame);
    events.error();
  };
  canvas.addEventListener("webglcontextlost", lost);
  document.addEventListener("visibilitychange", resume);
  const ready = (
    asset
      ? asset.bytes
        ? new GLTFLoader().parseAsync(asset.bytes, "")
        : new GLTFLoader().loadAsync(asset.url)
      : prepareFoxSpirit()
  )
    .then(async (gltf) => {
      if (disposed) return;
      model = clone(gltf.scene);
      body.add(model);
      mixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) {
        const action = mixer.clipAction(clip);
        if (clip.name === "Settle") {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        actions.set(clip.name, action);
      }
      choreographed =
        !!model.getObjectByName("PandaHead") &&
        ["Survey", "Run", "Settle", "Greet"].every((name) => actions.has(name));
      if (choreographed) head = model.getObjectByName("PandaHead");
      active = actions.get("Survey") ?? actions.values().next().value;
      active?.play();
      mixer.update(0);
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      bounds.getSize(modelSize);
      const center = bounds.getCenter(new THREE.Vector3());
      if (head) center.x = head.getWorldPosition(new THREE.Vector3()).x;
      model.position.sub(center);
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.frustumCulled = false;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        const copies = materials.map((original) => {
          const copy = (original as THREE.MeshStandardMaterial).clone();
          if (!copy.emissive) copy.emissive = new THREE.Color();
          copy.emissive.set(0x000000);
          copy.emissiveIntensity = 0.15;
          copy.transparent = true;
          copy.forceSinglePass = true;
          modelMaterials.push(copy);
          return copy;
        });
        object.material = Array.isArray(object.material) ? copies : copies[0];
      });
      fit = Math.min(
        (width * (width > height * 1.1 ? 0.54 : 1) * 0.79) / modelSize.x,
        (height * 0.45) / modelSize.y,
      );
      await renderer.compileAsync(scene, camera);
      if (disposed) return;
      readyMs = performance.now() - started;
      events.ready();
      resume();
    })
    .catch((e) => {
      if (!disposed) events.error();
      throw e;
    });
  return {
    ready,
    pause(value) {
      paused = value;
      resume();
    },
    replay() {
      elapsed = 0;
      replyAt = -100;
      mixer?.stopAllAction();
      active = actions.get("Survey") ?? actions.values().next().value;
      active?.reset().play();
      mixer?.update(0);
      resume();
    },
    greet() {
      if (choreographed) elapsed = Math.max(elapsed, 6.6);
      replyAt = elapsed;
      resume();
    },
    turn(angle) {
      yaw = angle;
      resume();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
      canvas.removeEventListener("webglcontextlost", lost);
      mixer?.stopAllAction();
      if (model) mixer?.uncacheRoot(model);
      model?.traverse((object) => {
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
        if (asset && object instanceof THREE.Mesh) object.geometry.dispose();
      });
      const textures = new Set<THREE.Texture>();
      for (const m of modelMaterials) {
        if (asset)
          for (const value of Object.values(m))
            if (value instanceof THREE.Texture) textures.add(value);
        m.dispose();
      }
      for (const texture of textures) {
        texture.dispose();
        const source = texture.source.data;
        if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap)
          source.close();
      }
      ring.geometry.dispose();
      inner.geometry.dispose();
      ringMaterial.dispose();
      shadow.geometry.dispose();
      (shadow.material as THREE.MeshBasicMaterial).map?.dispose();
      (shadow.material as THREE.Material).dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
