export const GUARDIAN_TIMING = {
  awaken: 2.4,
  play: 3.3,
  settle: 6.3,
  greet: 7.3,
};
export function guardianStory(seconds: number) {
  return {
    beat:
      seconds < GUARDIAN_TIMING.awaken
        ? "emerge"
        : seconds < GUARDIAN_TIMING.play
          ? "awaken"
          : seconds < GUARDIAN_TIMING.settle
            ? "play"
            : seconds < GUARDIAN_TIMING.greet
              ? "settle"
              : "greet",
    // The individual GLBs supply all acting. The shared stage stays facing you.
    running: false,
    yaw: 0,
    chaseAmount: 0,
    bank: 0,
    x: 0,
    y: 0,
    flight: 0,
  };
}
export function guardianClip(beat: string) {
  return (
    (
      {
        awaken: "Awaken",
        play: "Play",
        settle: "Settle",
        greet: "Greet",
      } as Record<string, string>
    )[beat] ?? "Idle"
  );
}
