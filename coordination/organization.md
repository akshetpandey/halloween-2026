# Folder organization

Completed September 8, 2026 at the host's request. The host reports the old non-Work sessions/project are closed or archived and future work will use Codex.

## Where work lives

| Folder | Ownership |
|---|---|
| decor/ | living-room/, bedroom/, bathroom/, shared lighting/, decor references |
| interactive-game/ | design/, physical/ entities and NFC, app/ implementation, game tracker/runbook |
| music/ | living-room/, bedroom/, shared audio orchestration and TV visuals |
| host-costume/ | Host's Antler King outfit, fit, sourcing and references |
| guests/ | Partiful, guest pack, costume inspiration and its research |
| operations/ | Master tracker/budget/decisions, shared cart, drinks/supplies, apartment and run of show |
| coordination/ | Repository workflow, handoff template and migration records |

[Project home](../README.md) is the single start page. The numbered root plans and former workstreams navigation were physically consolidated into their owners. There is one current copy of each plan. Family READMEs link to sibling dependencies; they do not duplicate full plans. The original overview is preserved as [planning history](../operations/planning-history.md).

Game code belongs in interactive-game/app. This migration creates no application scaffold and changes no party/game requirements, purchases or test status.

## Agent setup
Root [AGENTS.md](../AGENTS.md) holds shared-main, commit-as-you-go and project-wide rules. Each of the six task families has an AGENTS.md; room tasks and game design/physical/app add narrower guidance. Root explicitly directs agents to read applicable nested files before editing, including when a session starts at the repository root.

Official [instruction discovery guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md) describes the root-to-working-directory instruction chain. For a new session, name the task folder and ask it to read the relevant instructions; don't assume every sibling instruction is loaded automatically. No app permission/configuration changes were made by adding these files.

## Older paths and preserved history
The [complete old-to-new path map](path-migration-2026-09-08.json) records every moved tracked file and the three redundant navigation indexes merged into canonical READMEs. If an old conversation link no longer opens, look up its former path here or search the filename. No root redirect stubs or symlink aliases were retained, to keep the layout simple.

Markdown links/images and structured local file references were updated. Source snapshots inside history/ retain their original bytes, including historical paths and claims; consult the map when reading them. Image files retain their original bytes. Git preserves the previous layout at d1456c6.

Future notes and assets go directly into the owning task folder. Avoid new top-level research, shopping, workstreams, apps or interactive-story folders; shared evidence and cart data now have explicit homes. Keep migrations narrow and update links if a later task needs another move.
