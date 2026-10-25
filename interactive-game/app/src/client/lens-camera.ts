type CameraOpen = {
  media: MediaStream;
  ms: number;
  remembered: boolean;
  reused: boolean;
};

// One page-owned, camera-only stream survives SPA navigation. Between scans its
// video tracks are disabled; only another explicit open enables them again.
export class LensCamera {
  private media: MediaStream | null = null;
  private generation = 0;
  private pending: Promise<CameraOpen | null> | null = null;
  private deviceId = "";

  get stream() {
    return this.media;
  }
  get retained() {
    return !!this.media?.getVideoTracks().some((t) => t.readyState === "live");
  }
  get opening() {
    return !!this.pending;
  }
  park() {
    this.generation++;
    this.pending = null;
    this.media?.getVideoTracks().forEach((track) => {
      track.enabled = false;
    });
  }
  stop() {
    this.park();
    this.media?.getTracks().forEach((track) => track.stop());
    this.media = null;
  }
  bindPageLifecycle() {
    const hide = () => {
        if (document.hidden) this.park();
      },
      leave = () => this.stop();
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
      this.stop();
    };
  }
  async open(): Promise<CameraOpen | null> {
    if (document.hidden) {
      this.park();
      return null;
    }
    const started = performance.now();
    if (this.retained) {
      this.media!.getVideoTracks().forEach((track) => {
        if (track.readyState === "live") track.enabled = true;
      });
      return {
        media: this.media!,
        ms: performance.now() - started,
        remembered: true,
        reused: true,
      };
    }
    // Rapid taps share the same permission request instead of opening twice.
    if (this.pending) return this.pending;
    this.stop();
    if (!navigator.mediaDevices?.getUserMedia)
      throw Error(
        "The live camera is unavailable. Use the phone camera or choose a photo below.",
      );
    const generation = this.generation,
      remembered = !!this.deviceId;
    const request = this.acquire(generation, started, remembered).finally(
      () => {
        if (this.pending === request) this.pending = null;
      },
    );
    this.pending = request;
    return request;
  }
  private async acquire(
    generation: number,
    started: number,
    remembered: boolean,
  ) {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          ...(this.deviceId ? { deviceId: { ideal: this.deviceId } } : {}),
          width: { ideal: 1280 },
          height: { ideal: 960 },
          frameRate: { ideal: 12, max: 15 },
        },
      });
      // A cancelled or backgrounded permission request must never leave capture
      // enabled when it eventually resolves. It is not retained for later use.
      if (generation !== this.generation || document.hidden) {
        media.getTracks().forEach((track) => track.stop());
        return null;
      }
      // audio:false is the request boundary. Also reject unexpected audio from
      // an injected/nonconforming provider before retaining or exposing a stream.
      media.getAudioTracks().forEach((track) => {
        track.stop();
        media.removeTrack(track);
      });
      if (
        !media.getVideoTracks().some((track) => track.readyState === "live")
      ) {
        media.getTracks().forEach((track) => track.stop());
        throw Error(
          "The camera did not provide a live video track. Try opening it again.",
        );
      }
      this.deviceId = media.getVideoTracks()[0]?.getSettings().deviceId || "";
      this.media = media;
      return {
        media,
        ms: performance.now() - started,
        remembered,
        reused: false,
      };
    } catch (error) {
      if (generation !== this.generation || document.hidden) return null;
      throw error;
    }
  }
}

export class LensFrameBuffer {
  private canvas: HTMLCanvasElement | null = null;
  draw(v: HTMLVideoElement, maxEdge: number) {
    const viewWidth = v.clientWidth || 3,
      viewHeight = v.clientHeight || 4,
      scale = Math.max(viewWidth / v.videoWidth, viewHeight / v.videoHeight),
      width = viewWidth / scale,
      height = viewHeight / scale,
      ratio = Math.min(1, maxEdge / Math.max(width, height)),
      outputWidth = Math.max(1, Math.round(width * ratio)),
      outputHeight = Math.max(1, Math.round(height * ratio));
    const canvas = (this.canvas ??= document.createElement("canvas"));
    // Resizing re-allocates the backing surface. Reuse it at the same geometry.
    if (canvas.width !== outputWidth) canvas.width = outputWidth;
    if (canvas.height !== outputHeight) canvas.height = outputHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      v,
      (v.videoWidth - width) / 2,
      (v.videoHeight - height) / 2,
      width,
      height,
      0,
      0,
      outputWidth,
      outputHeight,
    );
    return canvas;
  }
  clear() {
    const canvas = this.canvas;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export const lensCamera = new LensCamera();
export const recognitionFrames = new LensFrameBuffer();
export const captureFrames = new LensFrameBuffer();
