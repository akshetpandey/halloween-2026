import { afterEach, expect, it, vi } from "vitest";
import { LensCamera, LensFrameBuffer } from "../src/client/lens-camera";

afterEach(() => vi.unstubAllGlobals());
function media(deviceId = "rear-camera") {
  const video = {
    readyState: "live",
    enabled: true,
    stop: vi.fn(function (this: { readyState: string }) {
      this.readyState = "ended";
    }),
    getSettings: () => ({ deviceId }),
  };
  const audio = { stop: vi.fn(), enabled: true, readyState: "live" };
  let audioTracks: (typeof audio)[] = [];
  const extra = { stop: vi.fn() };
  const stream = {
    getVideoTracks: () => [video],
    getAudioTracks: () => audioTracks,
    getTracks: () => [video, ...audioTracks, extra],
    removeTrack: (track: unknown) => {
      audioTracks = audioTracks.filter((t) => t !== track);
    },
  } as unknown as MediaStream;
  return {
    stream,
    video,
    extra,
    audio,
    injectAudio: () => {
      audioTracks = [audio];
    },
  };
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

it("keeps no stream before explicit open, then reuses the same camera-only stream across paused visits", async () => {
  const frame = media(),
    getUserMedia = vi.fn().mockResolvedValue(frame.stream);
  setup(getUserMedia);
  const camera = new LensCamera();
  expect(camera.stream).toBeNull();
  expect(getUserMedia).not.toHaveBeenCalled();
  expect(await camera.open()).toMatchObject({
    remembered: false,
    reused: false,
  });
  expect(getUserMedia.mock.calls[0][0]).toMatchObject({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      frameRate: { ideal: 12, max: 15 },
    },
  });
  for (let visit = 0; visit < 4; visit++) {
    camera.park();
    expect(camera.retained).toBe(true);
    expect(frame.video.enabled).toBe(false);
    expect(frame.video.stop).not.toHaveBeenCalled();
    expect(await camera.open()).toMatchObject({
      media: frame.stream,
      reused: true,
    });
    expect(frame.video.enabled).toBe(true);
  }
  expect(getUserMedia).toHaveBeenCalledOnce();
  camera.stop();
  expect(frame.video.stop).toHaveBeenCalledOnce();
  expect(frame.extra.stop).toHaveBeenCalledOnce();
  expect(camera.stream).toBeNull();
});
it("opens a new stream after explicit release or browser reclamation, using only an ideal camera hint", async () => {
  const first = media(),
    second = media(),
    third = media();
  const getUserMedia = vi
    .fn()
    .mockResolvedValueOnce(first.stream)
    .mockResolvedValueOnce(second.stream)
    .mockResolvedValueOnce(third.stream);
  setup(getUserMedia);
  const camera = new LensCamera();
  await camera.open();
  camera.park();
  first.video.readyState = "ended";
  expect((await camera.open())?.reused).toBe(false);
  expect(getUserMedia.mock.calls[1][0]).toMatchObject({
    audio: false,
    video: { deviceId: { ideal: "rear-camera" } },
  });
  camera.stop();
  expect((await camera.open())?.reused).toBe(false);
  expect(getUserMedia).toHaveBeenCalledTimes(3);
  camera.stop();
});
it("shares one outstanding permission request when open is tapped repeatedly", async () => {
  const pending = delayed(),
    frame = media(),
    getUserMedia = vi.fn().mockReturnValue(pending.promise);
  setup(getUserMedia);
  const camera = new LensCamera();
  const a = camera.open(),
    b = camera.open();
  expect(getUserMedia).toHaveBeenCalledOnce();
  pending.resolve(frame.stream);
  expect((await a)?.media).toBe((await b)?.media);
  camera.stop();
});
it("rejects an acquisition with no live video and allows a later explicit retry", async () => {
  const dead = media(),
    working = media();
  dead.video.readyState = "ended";
  const getUserMedia = vi
    .fn()
    .mockResolvedValueOnce(dead.stream)
    .mockResolvedValueOnce(working.stream);
  setup(getUserMedia);
  const camera = new LensCamera();
  await expect(camera.open()).rejects.toThrow("live video track");
  expect(dead.video.stop).toHaveBeenCalledOnce();
  expect(camera.stream).toBeNull();
  expect(camera.opening).toBe(false);
  expect((await camera.open())?.media).toBe(working.stream);
  camera.stop();
});
it("stops and removes any unexpected audio track before retaining or exposing a stream", async () => {
  const frame = media();
  frame.injectAudio();
  const getUserMedia = vi.fn().mockResolvedValue(frame.stream);
  setup(getUserMedia);
  const camera = new LensCamera();
  await camera.open();
  expect(getUserMedia.mock.calls[0][0].audio).toBe(false);
  expect(frame.audio.stop).toHaveBeenCalledOnce();
  expect(camera.stream?.getAudioTracks()).toEqual([]);
  camera.park();
  await camera.open();
  expect(camera.stream?.getAudioTracks()).toEqual([]);
  camera.stop();
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
  camera.park();
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

it("parks on backgrounding without auto-resume, and fully releases on page exit even outside the Lens", async () => {
  const page = Object.assign(new EventTarget(), { hidden: false }),
    windowEvents = new EventTarget(),
    frame = media();
  vi.stubGlobal("document", page);
  vi.stubGlobal("window", windowEvents);
  const getUserMedia = vi.fn().mockResolvedValue(frame.stream);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const camera = new LensCamera(),
    dispose = camera.bindPageLifecycle();
  await camera.open();
  page.hidden = true;
  page.dispatchEvent(new Event("visibilitychange"));
  expect(frame.video.enabled).toBe(false);
  expect(frame.video.stop).not.toHaveBeenCalled();
  page.hidden = false;
  page.dispatchEvent(new Event("visibilitychange"));
  expect(frame.video.enabled).toBe(false);
  await camera.open();
  expect(getUserMedia).toHaveBeenCalledOnce();
  windowEvents.dispatchEvent(new Event("pagehide"));
  expect(frame.video.stop).toHaveBeenCalledOnce();
  expect(camera.stream).toBeNull();
  dispose();
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
