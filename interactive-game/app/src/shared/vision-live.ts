export const SCAN_INTERVAL_MS = 250;
export const STABLE_FRAMES = 3;
// Stability is based on consecutive, separately captured video frames. Unknown
// results, changed identities or a long gap break the streak.
export class StableGuardian {
  private candidate: string | null = null;
  private since = 0;
  private last = 0;
  private count = 0;
  observe(id: string | null, now: number) {
    if (!id) {
      this.reset();
      return { id: null, count: 0, stable: false };
    }
    if (id === this.candidate && this.count > 0 && now <= this.last)
      return { id, count: this.count, stable: false };
    if (id !== this.candidate || now - this.last > 2000) {
      this.candidate = id;
      this.since = now;
      this.count = 0;
    }
    this.last = now;
    this.count++;
    return {
      id,
      count: this.count,
      stable: this.count >= STABLE_FRAMES && now - this.since >= 500,
    };
  }
  reset() {
    this.candidate = null;
    this.count = 0;
    this.since = 0;
    this.last = 0;
  }
}
