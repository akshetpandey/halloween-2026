import { guardians } from "./catalog";
export type Discovery = { guardianId: string; code: string };
export function guardianProgress(
  earned: string[],
  discovered: Discovery[] = [],
) {
  return guardians.map((guardian) => {
    const code = discovered.find(
      (d) => d.guardianId === guardian.id && /^[a-f0-9]{12}$/.test(d.code),
    )?.code;
    return {
      guardian,
      code,
      status: earned.includes(guardian.id)
        ? ("solved" as const)
        : code
          ? ("pending" as const)
          : ("unfound" as const),
    };
  });
}
