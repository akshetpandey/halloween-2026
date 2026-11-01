// Each opening owns cloned geometry/materials, so idle templates can be evicted
// while a reveal is playing. Do not retain fifteen models on a phone.
export class SpiritTemplateCache<K, V> {
  private entries = new Map<K, V>();
  private pending = new Map<K, Promise<V>>();
  private tail: Promise<void> = Promise.resolve();
  constructor(
    private limit: number,
    private load: (key: K) => Promise<V>,
    private release: (value: V) => void,
  ) {}
  get(key: K): Promise<V> {
    const existing = this.entries.get(key);
    if (existing !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, existing);
      return Promise.resolve(existing);
    }
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;
    // Deduplicate pending keys separately from the resident LRU and parse only
    // one GLB at a time, even if a noisy camera/rapid host preview changes keys.
    const pending = this.tail
      .then(() => this.load(key))
      .then(
        (value) => {
          this.pending.delete(key);
          this.entries.set(key, value);
          while (this.entries.size > this.limit) {
            const oldest = this.entries.entries().next().value!;
            this.entries.delete(oldest[0]);
            this.release(oldest[1]);
          }
          return value;
        },
        (error) => {
          this.pending.delete(key);
          throw error;
        },
      );
    this.pending.set(key, pending);
    this.tail = pending.then(
      () => {},
      () => {},
    );
    return pending;
  }
}
