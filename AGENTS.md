# Halloween 2026 — shared agent instructions

## Start every session
- Work in this Git repository. All agents work directly on `main` in the shared checkout `/Users/akshet/workspace/halloween-2026`. Do not create worktrees or separate task branches.
- Read this file and `README.md`, then every applicable nested `AGENTS.md` from the task family down to the folder you will edit, plus its README and current plans. Do this explicitly even when the session starts at repository root. Check `git status --short` and confirm `main` before editing.
- Use a local Work/Codex session attached to this repo for file-writing tasks. Project membership or an AGENTS.md file does not grant filesystem permissions. If tools cannot write here, report that explicitly and provide a handoff; never claim files were saved.
- Do not use the old `.codex/.chatgpt-projects/...` mirror or a projectless output directory as the planning source of truth.
- User instructions override these project conventions. Read current files rather than relying on an older chat's recollection.

## Party context
- October 31, 2026, Williamsburg/Brooklyn apartment; 30–60 staggered guests; total budget $1,000–$3,000 including drinks. Prior $1,800 working budget is a proposal, not an approved shopping order.
- Arrivals around 9–10 p.m., peak midnight–1 a.m., wind-down 4 a.m.; November 1 has a daylight-saving rollback. Use explicit America/New_York dates/offsets in software and schedules.
- Theme: enchanted/eerie woodland pagan/Samhain pop culture. Living room October Grove, bedroom dark dance cave/The Hollow, bathroom Moon Well. Host costume: Antler King.
- Value-conscious, purchased major props preferably Amazon; small crafts welcome. Source real internet art/photos for guest costume inspiration, with credits.
- Hardware: MacBook Pro/macOS, DDJ-FLX4 + rekordbox; two powered speakers in bedroom; two Google Homes for living-room Spotify; Hisense soundbar works as selected HDMI output; Jellyfin for TV. Roles/integrations still need tests.
- Both music programs need at least nine hours after planned cuts/transitions. Bedroom needs danceable techno and artist variety; approved living-room direction should not be casually replaced.
- Living-room floor is laminate plus low/no-pile carpet areas. No curtain rods; bulk cloth with hooks/clips or tape is acceptable. Host has a gold tree lamp with LIFX bulb.
- Latest living-room lighting: glowing moon + broad dim purple wash; Oasis acceptable if sufficiently dim. Separate RGB source needed under currently documented Oasis Ambient specs. Moon NFC covers must be premade stickers.

## Task ownership
- `decor/`: room scenery, lighting and decor sourcing; subfolders for living room, bedroom and bathroom.
- `interactive-game/`: game rules, puzzles, physical entities/NFC and app. Read its nested instructions before changing game work.
- `music/`: room playlists, DJ preparation, audio/TV orchestration.
- `host-costume/`: the host's Antler King costume; winner crown belongs to the game.
- `guests/`: invite and guest inspiration; keep the secret succession out of guest-facing invite material.
- `operations/`: shared tracker, budget, decisions, shopping cart, hospitality and schedule.
- `coordination/`: repository workflow, handoffs and old-path migration record. Historical snapshots are evidence, not current requirements.

## Working across sessions
- Use one session per distinct deliverable; sibling tasks share the README in their family folder. Check sibling decisions before changing shared assumptions.
- All sessions, including game implementation, use the shared checkout on `main`. Keep edits scoped to the task and re-read shared files immediately before changing them.
- Keep Git staging and commits brief and avoid simultaneous Git operations; check the staged diff for another session's changes before committing.
- Preserve other sessions' edits. Do not use blanket `git add .`, reset, clean, force-push or amend someone else's commit. Stage named paths or your own hunks and inspect the staged diff.
- Prefer purpose-built MCP/API/CLI tools to computer-use automation. Discover currently available tools before assuming a connector cannot write.
- Do not send messages to other people or sessions, create tasks, archive sessions or buy items without the applicable user authorization. Draft handoffs are fine; ordinary local planning edits need no extra approval.

## Documentation and handoffs
- Current task documents are authoritative; family READMEs link to them rather than copying their contents. Keep one current statement of a decision, with superseded material clearly labeled/history-linked.
- New durable task notes and assets belong in their owning task folder. The September 8 physical consolidation is complete; use `coordination/path-migration-2026-09-08.json` to resolve older paths. Do not recreate the old root-numbered plans, `workstreams/` navigation layer or `interactive-story/` folder.
- Label confirmed / proposed / purchased / tested distinctly. Date product prices and availability; a link or unpaid cart is not a purchase, deployment or test.
- Update relevant task status after meaningful progress. Reflect shared cost changes in budget without double-counting, and update shared decisions when scope changes.
- Before ending or handing off, persist results, decisions, unresolved questions, next actions, affected files, verification, branch and commit references in a task-local handoff. Use `coordination/handoff-template.md`.
- Keep secrets, guest selfies, guest identities and production NFC claim tokens out of Git. Commit schemas and sanitized examples; choose runtime storage during implementation.

## Git requirement — every write task
- Commit as you go at meaningful progress points, including documentation, assets and partial plans; commit remaining changes before ending any writing turn. Read-only work needs no empty commit.
- Git primarily tracks tasks, decisions and thought process. Simple descriptive checkpoint commits are sufficient; polished history, rebasing and squashing are unnecessary.
- Make a focused descriptive commit, review `git diff --cached`, and run relevant verification first. For docs check links and `git diff --check`; for code run the checks appropriate to the actual stack/change.
- If changes overlap someone else's uncommitted work, isolate your hunks or coordinate before committing; never claim their work as yours. Report a real commit blocker rather than bypassing it or leaving an unexplained dirty state.
- Report commit hash and checks in the final response. A local commit is not a push; pushing follows the user's task authorization.
