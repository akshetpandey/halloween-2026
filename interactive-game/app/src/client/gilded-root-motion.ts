export const ROOT_TIMING = {
  wake: 2.4,
  flutter: 3.2,
  catch: 4.9,
  bow: 6.2,
  greet: 7.5,
};
// A planted archivist's little accident, with no borrowed fox orbit or running.
export function rootStory(seconds: number) {
  const t = ROOT_TIMING;
  return {
    beat:
      seconds < t.wake
        ? "emerge"
        : seconds < t.flutter
          ? "wake"
          : seconds < t.catch
            ? "flutter"
            : seconds < t.bow
              ? "catch"
              : seconds < t.greet
                ? "bow"
                : "greet",
    running: false,
    yaw: 0,
    chaseAmount: 0,
    bank: 0,
    x: 0,
    y: 0,
    flight: 0,
    sit: 0,
  };
}
