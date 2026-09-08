# File organization and migration
September 8, 2026.

## Applied now
`workstreams/` groups sibling tasks in adjacent folders: music/living-room and music/bedroom; decor/living-room, decor/bedroom and decor/bathroom; interactive/design, interactive/physical and interactive/implementation. These indexes point to the existing canonical source files. New session handoffs belong with the task. `apps/hollow-court/` is reserved for the planned game code. Root AGENTS.md covers the entire repository.

This first phase improves navigation without breaking paths in older sessions, inspiration HTML, sourcing files or existing documents. No original planning assets were moved or duplicated. Use links, not symlink aliases or competing copies of a plan.

## Proposed later physical consolidation
After older sessions save handoffs and their edits are committed, migrate one family at a time if the navigation layer is insufficient. Candidate destinations: `music/living-room`, `music/bedroom`, `decor/living-room`, `decor/bedroom`, `decor/bathroom`, `operations`, and current `interactive-story` / `host-costume`. Keep shared lighting and sourcing in shared family folders.

For each move, coordinate ownership, use tracked moves, update relative links in Markdown/HTML/JSON and code references, verify local links/assets, and leave a short redirect Markdown at any old entry point heavily referenced by chats. Do not copy whole plans. Commit that family's migration separately. A folder move does not change product requirements or budget.

There are no running sibling Codex writers in the September 8 inventory, but old idle sessions may resume at any time. A session handoff reduces stale-path edits. The user has not asked us to archive or message them yet; the transition message is prepared in session-setup.md.
