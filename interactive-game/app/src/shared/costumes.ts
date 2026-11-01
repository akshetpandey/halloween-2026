// The FIRST 1 a.m. on the rollback night, America/New_York (EDT).
export const COSTUME_REMINDER_AT = "2026-11-01T01:00:00-04:00";
// A separate last call, at the SECOND 1:30 a.m. (EST), requested by the host.
export const COSTUME_LAST_CALL_AT = "2026-11-01T01:30:00-05:00";
export const COSTUME_BONUS = 3;
export function costumeLastCallDue(
  opens: string,
  closes: string,
  now: number,
  seenAt: number | null,
  voted: boolean,
) {
  const lastCall = Date.parse(COSTUME_LAST_CALL_AT);
  return (
    !voted &&
    now >= Math.max(Date.parse(opens), lastCall) &&
    now < Date.parse(closes) &&
    (seenAt === null || seenAt < lastCall)
  );
}
export function costumeWindow(
  opens: string,
  closes: string,
  now: number,
  preview = false,
  published = false,
) {
  return (
    !published &&
    (preview || (now >= Date.parse(opens) && now < Date.parse(closes)))
  );
}
export function reminderDue(
  opens: string,
  closes: string,
  now: number,
  seen: boolean,
) {
  return (
    !seen &&
    now >= Math.max(Date.parse(opens), Date.parse(COSTUME_REMINDER_AT)) &&
    now < Date.parse(closes)
  );
}
export type CostumeAward = { id: string; name: string; bonus: number };
export type CostumeGallery = {
  people: { id: string; name: string }[];
  choices: string[];
  revision: number;
  open: boolean;
  closesAt: string;
  award: CostumeAward | null;
};
