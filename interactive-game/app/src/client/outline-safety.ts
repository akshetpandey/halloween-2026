// A browser process kill cannot reject a Promise. Detect an interrupted outline
// on the next load and let recognition work before an explicit outline retry.
export const OUTLINE_PENDING = "hollow-outline-pending-magic-touch-v1";
export class OutlineSafety {
  private active = 0;
  blocked = false;
  private storage: Storage | undefined;
  constructor() {
    try {
      this.storage = window.sessionStorage;
      this.blocked = !!this.storage.getItem(OUTLINE_PENDING);
    } catch {
      /* Private browsing/storage restrictions must not break the Lens. */
    }
  }
  retry() {
    this.blocked = false;
    try {
      this.storage?.removeItem(OUTLINE_PENDING);
    } catch {}
  }
  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.blocked)
      throw Error(
        "An earlier outline was interrupted. Recognition still works; retry the outline when ready.",
      );
    this.active++;
    try {
      try {
        this.storage?.setItem(OUTLINE_PENDING, "1");
      } catch {}
      return await work();
    } finally {
      if (--this.active === 0)
        try {
          this.storage?.removeItem(OUTLINE_PENDING);
        } catch {}
    }
  }
}
