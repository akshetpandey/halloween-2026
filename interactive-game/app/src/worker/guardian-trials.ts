import type { Guardian } from "../shared/catalog";
import type { Assignment } from "../shared/types";
import type { RowPlayer } from "./index";
import { generate, PUZZLE_VERSION } from "./puzzles";

/** Recognition opens a persistent trial; only /solve may award Favor. */
export async function guardianAssignment(
  env: Env,
  player: RowPlayer,
  guardian: Guardian,
): Promise<Assignment> {
  const generated = generate(
    guardian.family,
    `${env.EVENT_ID}:${player.id}:${guardian.id}:v${PUZZLE_VERSION}`,
  );
  await env.DB.prepare(
    "INSERT INTO assignments VALUES(?,?,?,?) ON CONFLICT(player_id,guardian_id) DO UPDATE SET version=excluded.version,instance=excluded.instance WHERE assignments.version<excluded.version AND ?=1",
  )
    .bind(
      player.id,
      guardian.id,
      generated.version,
      JSON.stringify(generated),
      player.realm === "preview" ? 1 : 0,
    )
    .run();
  const record = await env.DB.prepare(
    "SELECT instance FROM assignments WHERE player_id=? AND guardian_id=?",
  )
    .bind(player.id, guardian.id)
    .first<{ instance: string }>();
  return JSON.parse(record!.instance);
}
