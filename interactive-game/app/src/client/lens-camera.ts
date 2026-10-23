// Keep only camera selection and empty drawing surfaces between Lens visits.
// An inactive stream (even a disabled track) is deliberately never retained.
export class LensCamera {
  private media: MediaStream | null = null;
  private generation = 0;
  private pending = false;
  private deviceId = "";

  get stream() {
    return this.media;
  }
  get opening() {
    return this.pending;
  }
  stop() {
    this.generation++;
    this.pending = false;
    this.media?.getTracks().forEach((track) => track.stop());
    this.media = null;
  }
  async open() {
    this.stop();
    if (document.hidden) return null;
    if (!navigator.mediaDevices?.getUserMedia)
      throw Error(
        "The live camera is unavailable. Use the phone camera or choose a photo below.",
      );
    const generation = this.generation,
      started = performance.now(),
      remembered = !!this.deviceId;
    this.pending = true;
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          ...(this.deviceId ? { deviceId: { ideal: this.deviceId } } : {}),
          width: { ideal: 1280 },
          height: { ideal: 960 },
          frameRate: { ideal: 24, max: 30 },
        },
      });
      // getUserMedia has no abort signal. Release a late result immediately if
      // navigation, another request or backgrounding invalidated this opening.
      if (generation !== this.generation || document.hidden) {
        media.getTracks().forEach((track) => track.stop());
        return null;
      }
      this.deviceId = media.getVideoTracks()[0]?.getSettings().deviceId || "";
      this.media = media;
      return { media, ms: performance.now() - started, remembered };
    } catch (error) {
      if (generation !== this.generation || document.hidden) return null;
      throw error;
    } finally {
      if (generation === this.generation) this.pending = false;
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
