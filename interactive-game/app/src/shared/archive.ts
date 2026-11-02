export type FinalStanding = {
  name: string;
  favors: number;
  referrals: number;
  costumeBonus: number;
  total: number;
  rank: number;
};
export type ArchiveResults = {
  closedAt: string;
  standings: FinalStanding[];
  costumeAward: { name: string; bonus: number } | null;
  guests: number;
  favors: number;
  guardians: number;
};
export function rankFinalStandings(
  rows: Omit<FinalStanding, "total" | "rank">[],
): FinalStanding[] {
  const sorted = rows
    .map((row) => ({
      ...row,
      total: row.favors + row.referrals + row.costumeBonus,
    }))
    .sort((a, b) => b.total - a.total);
  return sorted.map((row, index) => ({
    ...row,
    rank: sorted.findIndex((other) => other.total === row.total) + 1,
  }));
}
