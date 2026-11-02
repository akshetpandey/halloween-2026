# Playlist Lab post-party retirement · November 2, 2026

- **Session:** Playlist Lab deployment cleanup; November 2, 2026, America/New_York (EST).
- **Scope / owned files:** this handoff, `retirement-verification-2026-11-02.json`, Playlist Lab README/HOSTING retirement notices, and `music/README.md` navigation. Private backups are ignored.
- **Checkout / branch / base:** shared `/Users/akshet/workspace/halloween-2026`, `main`, base `f44c1e7704fc29a34816dff11f13f8b4ff82bdf2`.
- **Status:** local retirement complete; Cloudflare cleanup awaiting the host's authenticator verification in Chrome Play.
- **User decision:** November 2: party is done; clean up the online playlist voting tool's Docker and Cloudflare deployment. No request to delete music collections, voting history or source code.

## Completed and preserved

`docker compose -f music/playlist-lab/compose.yaml down` removed `playlist-lab-lab-1`, `playlist-lab-tunnel-1` and `playlist-lab_private`. No volumes were removed. The unreferenced `playlist-lab-lab` image and pinned cloudflared 2026.10.4 deployment image were removed after checking all remaining containers' image references. Other Docker projects and the separately used cloudflared 2026.10.3 image were preserved; no global prune was used.

The old loopback Python process was verified by its exact `music/playlist-lab/lab.py serve` command and repository cwd, backed up, then stopped. Port 8765 has no listener. A scoped search of user/system LaunchAgent and LaunchDaemon files found no Playlist Lab autostart entry.

Both original SQLite databases remain in ignored `.local/hosted/library.sqlite3` and `.local/library.sqlite3`. Restricted local backups are in ignored `.local/shutdown-2026-11-02/`:

- Hosted: `before-stop.sqlite3`, then stopped `final-votes.sqlite3`; all eight tables preserved: 1,702 tracks, 1,672 shared feedback rows, 1,632 host rows, 257 reviewer rows, 2,928 events, five snapshots, one setting and zero reviewer scores.
- Legacy: `legacy-before-stop.sqlite3`, then stopped `legacy-final.sqlite3`; 291 tracks, 207 feedback rows, 1,195 events, six snapshots and zero reviewer rows/scores.
- All four SQLite backups passed `PRAGMA integrity_check`; final backup counts and hashes are in the [sanitized verification record](retirement-verification-2026-11-02.json). Backup directory mode is 0700 and database files are 0600. These are local backups, not off-device backups.

Voting identities, notes, individual choices, credentials and runtime data stay out of Git. Spotify playlists and their local authorization are unchanged. Source code and Compose remain available as historical/reusable definitions; no services are running and their restart policies cannot recreate deleted containers.

## Cloudflare work still pending

The saved Google sign-in reached Cloudflare's authenticator verification page in the real Chrome Play profile. The host was asked to complete verification there; no code was requested in chat. Existing local Wrangler scopes lack DNS, Access and Tunnel management permission, and no sufficient purpose-built management connector was available.

After sign-in, inspect and remove only these dedicated resources:

1. The explicit `music.hollow-court.com` DNS record pointing to the dedicated Tunnel.
2. Tunnel `october-grove-playlist-lab`, UUID `b4a0c6eb-4974-4ff1-94e6-de7e13104f0f`, after confirming its published applications are music-only and connectors are stopped.
3. Access application `October Grove Playlist Lab`, scoped to `music.hollow-court.com`, after hostname/routing removal. Preserve shared reusable policies, the Access team/identity provider and the separate main-site/game-admin applications.
4. Once remote retirement is verified, remove the obsolete local connector token/ID and retire ignored deployment `.env`; preserve Spotify credentials and all databases.

Browser-use policy requires action-time confirmation for permanent deletion, including these dashboard resources. Inspect the actual resources and prepare the deletion first, then batch the concrete confirmations. No Cloudflare resource deletion or security-policy change has been performed yet. The stopped origin means the voting service itself is already unavailable.

## Verification and remaining work

- SQLite backup integrity and final table counts passed.
- Docker project container/network listings are empty; both dedicated images were removed successfully.
- No TCP 8765 listener remains; no matching LaunchAgent/LaunchDaemon file found.
- `.local/` and deployment `.env` are Git-ignored.
- Local Markdown link-target checks, verification JSON parsing and `git diff --check` passed. No application code changed, so no new runtime test suite is needed.
- Next: finish Cloudflare sign-in, obtain browser deletion confirmation at action time, delete/verify dedicated resources, retire local Tunnel credentials, and update this record to complete.
- Dependencies: preserve the main Halloween website, game-admin Access and unrelated Docker/Cloudflare resources. No sibling-task changes required.
- Commit: local progress checkpoint; resulting hash will be reported in chat. Unrelated dirty file at checkpoint start: `decor/shopping-ready.md`; leave it untouched. No push requested.
