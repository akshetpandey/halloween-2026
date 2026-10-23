import { afterEach, expect, it, vi } from "vitest";
import { LensCamera, LensFrameBuffer } from "../src/client/lens-camera";

afterEach(() => vi.unstubAllGlobals());
function media(deviceId = "rear-camera") {
  const video = {
    stop: vi.fn(),
    getSettings: () => ({ deviceId }),
  };
  const extra = { stop: vi.fn() };
  const stream = {
    getVideoTracks: () => [video],
    getTracks: () => [video, extra],
  } as unknown as MediaStream;
  return { stream, video, extra };
}
function setup(getUserMedia: ReturnType<typeof vi.fn>) {
  const page = { hidden: false };
  vi.stubGlobal("document", page);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  return page;
}
function delayed() {
  let resolve!: (stream: MediaStream) => void;
  const promise = new Promise<MediaStream>((r) => (resolve = r));
  return { promise, resolve };
}

it("keeps no stream before opening, stops every track, then reuses only an optional device hint", async () => {
  const first = media(),
    second = media();
  const getUserMedia = vi
    .fn()
    .mockResolvedValueOnce(first.stream)
    .mockResolvedValueOnce(second.stream);
  setup(getUserMedia);
  const camera = new LensCamera();
  expect(camera.stream).toBeNull();
  expect(getUserMedia).not.toHaveBeenCalled();
  expect((await camera.open())?.remembered).toBe(false);
  expect(getUserMedia.mock.calls[0][0]).toMatchObject({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      frameRate: { ideal: 24, max: 30 },
    },
  });
  camera.stop();
  expect(camera.stream).toBeNull();
  expect(first.video.stop).toHaveBeenCalledOnce();
  expect(first.extra.stop).toHaveBeenCalledOnce();
  expect((await camera.open())?.remembered).toBe(true);
  // An ideal (never exact) hint lets browsers choose another device if IDs rotate.
  expect(getUserMedia.mock.calls[1][0].video.deviceId).toEqual({
    ideal: "rear-camera",
  });
  camera.stop();
  expect(second.video.stop).toHaveBeenCalledOnce();
});

it("stops a camera that resolves after leaving, without retaining it or remembering its device", async () => {
  const pending = delayed(),
    first = media(),
    second = media();
  const getUserMedia = vi
    .fn()
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(second.stream);
  setup(getUserMedia);
  const camera = new LensCamera();
  const opening = camera.open();
  expect(camera.opening).toBe(true);
  camera.stop();
  pending.resolve(first.stream);
  expect(await opening).toBeNull();
  expect(first.video.stop).toHaveBeenCalledOnce();
  expect(first.extra.stop).toHaveBeenCalledOnce();
  expect(camera.stream).toBeNull();
  expect(camera.opening).toBe(false);
  expect((await camera.open())?.remembered).toBe(false);
  camera.stop();
});

it("never opens in a hidden page and disposes a result if the page became hidden while permission was pending", async () => {
  const pending = delayed(),
    frame = media();
  const getUserMedia = vi.fn().mockReturnValue(pending.promise);
  const page = setup(getUserMedia),
    camera = new LensCamera();
  page.hidden = true;
  expect(await camera.open()).toBeNull();
  expect(getUserMedia).not.toHaveBeenCalled();
  page.hidden = false;
  const opening = camera.open();
  page.hidden = true;
  pending.resolve(frame.stream);
  expect(await opening).toBeNull();
  expect(frame.video.stop).toHaveBeenCalledOnce();
  expect(camera.stream).toBeNull();
  expect(camera.opening).toBe(false);
});

it("a late superseded request cannot replace or stop the newer camera", async () => {
  const pending = delayed(),
    old = media("old"),
    current = media("current");
  const getUserMedia = vi
    .fn()
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(current.stream);
  setup(getUserMedia);
  const camera = new LensCamera();
  const opening = camera.open();
  await camera.open();
  pending.resolve(old.stream);
  expect(await opening).toBeNull();
  expect(old.video.stop).toHaveBeenCalledOnce();
  expect(current.video.stop).not.toHaveBeenCalled();
  expect(camera.stream).toBe(current.stream);
  camera.stop();
});

it("does not reopen after a denied request and allows a later explicit retry", async () => {
  const getUserMedia = vi
    .fn()
    .mockRejectedValueOnce(new DOMException("Declined", "NotAllowedError"))
    .mockResolvedValueOnce(media().stream);
  setup(getUserMedia);
  const camera = new LensCamera();
  await expect(camera.open()).rejects.toMatchObject({
    name: "NotAllowedError",
  });
  expect(getUserMedia).toHaveBeenCalledOnce();
  expect(camera.stream).toBeNull();
  expect(camera.opening).toBe(false);
  await camera.open();
  camera.stop();
});

it("reuses bounded frame surfaces and clears their pixels between visits", () => {
  let width = 300,
    height = 150;
  const drawImage = vi.fn(),
    clearRect = vi.fn(),
    resized = vi.fn();
  const canvas = {
    get width() {
      return width;
    },
    set width(value: number) {
      width = value;
      resized();
    },
    get height() {
      return height;
    },
    set height(value: number) {
      height = value;
      resized();
    },
    getContext: () => ({ drawImage, clearRect }),
  };
  const createElement = vi.fn(() => canvas);
  vi.stubGlobal("document", { createElement });
  const frames = new LensFrameBuffer();
  frames.clear();
  expect(createElement).not.toHaveBeenCalled();
  const video = {
    videoWidth: 1920,
    videoHeight: 1080,
    clientWidth: 300,
    clientHeight: 400,
  } as HTMLVideoElement;
  const first = frames.draw(video, 960);
  expect([first.width, first.height]).toEqual([720, 960]);
  expect(drawImage).toHaveBeenLastCalledWith(
    video,
    555,
    0,
    810,
    1080,
    0,
    0,
    720,
    960,
  );
  expect(resized).toHaveBeenCalledTimes(2);
  expect(frames.draw(video, 960)).toBe(first);
  expect(createElement).toHaveBeenCalledOnce();
  expect(resized).toHaveBeenCalledTimes(2);
  frames.clear();
  expect(clearRect).toHaveBeenCalledWith(0, 0, 720, 960);
  expect(frames.draw(video, 960)).toBe(first);
  expect(resized).toHaveBeenCalledTimes(2);
});
