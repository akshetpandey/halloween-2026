import { guardians } from "../shared/catalog";
import { rankFinalStandings, type FinalStanding } from "../shared/archive";
import { generate, validate, PUZZLE_VERSION } from "./puzzles";
import { body, fail, json } from "./request";

export function replayAssignment(guardianId: string, seed: unknown) {
  const guardian = guardians.find((g) => g.id === guardianId);
  if (!guardian) fail("This guardian could not be found.", 404);
  if (typeof seed !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(seed))
    fail("Start a new puzzle and try again.", 422);
  return generate(
    guardian.family,
    `archive:${guardian.id}:v${PUZZLE_VERSION}:${seed}`,
  );
}

/** Public replay runs before session lookup/rate counters; it never writes storage. */
export async function archiveApi(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname;
  if (path === "/api/archive/results" && request.method === "GET") {
    const rows = (
      await env.DB.prepare(
        `SELECT p.name,
       (SELECT COUNT(*) FROM favors f WHERE f.player_id=p.id) AS favors,
       (SELECT COUNT(*) FROM summons s WHERE s.inviter_id=p.id AND s.redeemed_at IS NOT NULL) AS referrals,
       CASE WHEN EXISTS(SELECT 1 FROM costume_awards a WHERE a.winner_id=p.id AND a.realm='live') THEN 3 ELSE 0 END AS costumeBonus
       FROM players p WHERE p.registered=1 AND p.realm='live' ORDER BY p.created_at ASC`,
      ).all<Omit<FinalStanding, "total" | "rank">>()
    ).results;
    const standings = rankFinalStandings(rows);
    const award = await env.DB.prepare(
      "SELECT p.name,3 AS bonus FROM costume_awards a JOIN players p ON p.id=a.winner_id WHERE a.realm='live'",
    ).first<{ name: string; bonus: number }>();
    return json({
      closedAt: env.CLOSES_AT,
      standings,
      costumeAward: award,
      guests: standings.length,
      favors: standings.reduce((sum, p) => sum + p.favors, 0),
      guardians: guardians.length,
    });
  }
  const match = path.match(/^\/api\/archive\/puzzle\/([A-Z]+-\d{2})$/);
  if (match && request.method === "GET") {
    const seed = url.searchParams.get("seed") ?? crypto.randomUUID();
    const assignment = replayAssignment(match[1], seed);
    return json({ seed, puzzle: assignment.view });
  }
  if (match && request.method === "POST") {
    const input = await body(request);
    const assignment = replayAssignment(match[1], input.seed);
    let correct = false;
    try {
      correct = validate(assignment, input.answer);
    } catch {
      /* Invalid answers are simply incorrect. */
    }
    return json({ correct });
  }
  fail("This path leads beyond the wood.", 404);
}
