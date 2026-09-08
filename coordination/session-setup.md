# Local sessions and transition plan
Verified September 8, 2026 against app inventory and official docs.

## Canonical setup
Use the local project **halloween-2026**, id `2b6cf58d-84d8-4a6b-b8c7-23c83af32a17`, primary folder `/Users/akshet/workspace/halloween-2026`. The former separate ChatGPT project **Halloween 2026**, id `g-p-6a99dea2153481919f3c443e77669585`, was present in the earlier inventory. The host now reports the old project is closed/archived and future work will use Codex. Use the local repository as the source of truth.

The exposed app tools do not offer a project-wide force-Work setting or an in-place conversion of all ChatGPT chats to local Codex tasks. No such setting was changed. Start future file-writing sessions using Work/Codex from the local project with this folder primary. Work mode by itself does not attach a local folder; AGENTS.md does not grant sandbox permissions. Verify the working directory and read AGENTS.md at session start.

Official docs: [Projects and chats](https://learn.chatgpt.com/docs/projects) distinguish local folder access from ChatGPT project sources and document Make primary under Edit project. [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) provides durable instructions. These pages do not establish a supported project-wide Work-only lock.

## Concurrent work
User decision, September 8: all agents work directly on `main` in `/Users/akshet/workspace/halloween-2026`, including game code. Do not create worktrees or task branches. Use one session per deliverable, keep file edits scoped, and re-read shared files before changing them. Keep Git staging/commits brief and avoid simultaneous Git operations. Commit meaningful progress as you go and remaining changes before finishing. This repository tracks tasks and thought process; polished history is not important.

The initial setup checkpoint `43142fb` preserves 32 previously uncommitted planning files, including the latest game design. This is a preservation commit, not new approval of every proposal. Setup commit `7efa2cb` adds AGENTS.md and this navigation. The subsequent main-only workflow update supersedes the initial worktree recommendation.

## Existing sessions, read-only inventory
| Exact session title | ID | Observed context | Suggested action |
|---|---|---|---|
| Plan Samhain Halloween party | 01a06933-8c9a-72c3-992d-e1570b7d43c5 | Active; canonical checkout | Keep as coordinator |
| Update Hollow Court design docs | 01a06d58-6c29-74d1-86a1-3d626dff059d | Idle; canonical checkout | Read new AGENTS, save any missing handoff; can continue |
| Persist Hollow Court puzzle design | 01a06de1-65b6-74a3-a801-9cb523631a62 | Not loaded; old mirror cwd | Current puzzle notes are in canonical repo; reconcile any missing context, retire after handoff |
| Update NFC sourcing workflow | 01a06a7c-1f57-7a03-a187-496fd7f81589 | Not loaded; old mirror cwd despite local project label | Save handoff using explicit canonical path if accessible; otherwise emit copyable handoff |
| Plan the Antler King host costume | 01a069a0-9c55-7392-9bef-c71808a8b3bd | Not loaded; projectless Documents/Codex cwd | Compare remaining local artifacts to host-costume; preserve missing work before retiring |
| Interactive Succession Design | 6a9af574-7854-83ea-980a-a9b43437c385 | Idle ChatGPT chat in ChatGPT project | Capture only still-unpersisted decisions; source for current design |
| NFC Figurine Design | 6a9a0ee4-64fc-83ea-b173-952682988b44 | Original inventory: ChatGPT chat in ChatGPT project | September 8: host-supplied final handoff reconciled and preserved; ready for host to archive |

No messages sent, no sessions moved or archived. “Not loaded” is not evidence of lost work. Closing is optional; a correctly attached current session can read the new file explicitly and continue. Prefer new sessions when old paths or obsolete assumptions make continuation confusing.

## Copyable transition message
Please wrap up this session for the Halloween 2026 repository transition. Read `/Users/akshet/workspace/halloween-2026/AGENTS.md` and `README.md` if you have access. Reconcile this conversation against the current task files; preserve any missing confirmed decisions, proposals, sources and next steps in a task-local handoff using `coordination/handoff-template.md`. Do not overwrite newer decisions with older ideas. Commit only your changes, report the branch and commit hash and any remaining files, then stop work so the next session can continue. If you lack filesystem access, output a complete copyable handoff and state that nothing was saved. Do not start new design work or archive yourself automatically.

## Starter for a new task
Work on [specific outcome] directly on `main` in `/Users/akshet/workspace/halloween-2026`; do not create a worktree or task branch. Read root AGENTS.md and README.md, then the task family and applicable nested AGENTS.md files, its README and any handoff before editing. Use the current committed design, keep sibling dependencies explicit, persist progress and commit as you go, including remaining changes before finishing.

For game code use interactive-game/app/README.md and its AGENTS.md. The user plans to launch this task separately; no implementation task was created by the setup work.

## Final NFC handoff received — September 8
The host reports NFC Figurine Design is the last non-Work session and intends to close/archive the other project. Its supplied handoff is [preserved and reconciled](../interactive-game/physical/handoff-2026-09-08-nfc-reconciliation.md); no missing substantive decisions were found. This confirms capture of the supplied handoff, not a fresh audit of every old project attachment. Archival remains the host's action; it was not performed or verified here.

## Folder consolidation completed — September 8
The new [project home](../README.md) routes directly to decor, interactive-game, music, host-costume, guests and operations. [Organization guide](organization.md) documents nested instructions and the old-path map. Earlier inventory/actions above are historical; the host reports the old non-Work project transition is done. All new tasks work directly on shared main.
