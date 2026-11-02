# Playlist Lab post-party retirement · November 2, 2026

- **Session:** Playlist Lab deployment cleanup; November 2, 2026, America/New_York (EST).
- **Scope / owned files:** this handoff, `retirement-verification-2026-11-02.json`, Playlist Lab README/HOSTING retirement notices, and `music/README.md` navigation. Backups and dashboard screenshots are private/ignored.
- **Checkout / branch / base:** shared `/Users/akshet/workspace/halloween-2026`, `main`, original base `f44c1e7704fc29a34816dff11f13f8b4ff82bdf2`; local shutdown checkpoint `fc32ca4`.
- **Status:** complete. No remaining deployment cleanup or pending confirmation.
- **User decisions:** November 2: party is done; clean up the online voting deployment's Docker and Cloudflare resources. The host completed dashboard 2FA in Chrome Play, then explicitly confirmed permanent deletion of the three named music resources. Preserve voting history, source code, Spotify collections and unrelated services.

## Docker and local shutdown

`docker compose -f music/playlist-lab/compose.yaml down` removed `playlist-lab-lab-1`, `playlist-lab-tunnel-1` and `playlist-lab_private`. No volumes were removed. The unreferenced `playlist-lab-lab` image and pinned cloudflared 2026.10.4 deployment image were removed after checking all remaining containers' image references. Other Docker projects and the separately used cloudflared 2026.10.3 image were preserved; no global prune was used.

The old loopback Python process was verified by its exact `music/playlist-lab/lab.py serve` command and repository cwd, backed up, then stopped. Port 8765 has no listener. A scoped search of user/system LaunchAgent and LaunchDaemon files found no Playlist Lab autostart entry.

Both original SQLite databases remain in ignored `.local/hosted/library.sqlite3` and `.local/library.sqlite3`. Restricted local backups are in ignored `.local/shutdown-2026-11-02/`:

- Hosted: `before-stop.sqlite3`, then stopped `final-votes.sqlite3`; all eight tables preserved: 1,702 tracks, 1,672 shared feedback rows, 1,632 host rows, 257 reviewer rows, 2,928 events, five snapshots, one setting and zero reviewer scores.
- Legacy: `legacy-before-stop.sqlite3`, then stopped `legacy-final.sqlite3`; 291 tracks, 207 feedback rows, 1,195 events, six snapshots and zero reviewer rows/scores.
- All four SQLite backups passed `PRAGMA integrity_check`. Every row in every original table exactly matches its final backup. Final backup counts and hashes are in the [sanitized verification record](retirement-verification-2026-11-02.json). Backup directory mode is 0700 and database files are 0600. These are local backups, not off-device backups.

Voting identities, notes, individual choices, credentials and runtime data stay out of Git. Spotify playlists and their local authorization are unchanged. Source code and Compose remain as historical/reusable definitions. Deleted containers cannot restart themselves.

## Cloudflare resources removed

Signed-in Chrome Play inspection confirmed the dedicated Tunnel was Down, had zero active replicas and only one route: `music.hollow-court.com` → `http://lab:8765`. The music Access app was separate from game admin, but its reusable host policy was shared. Existing Wrangler scopes lacked DNS, Access and Tunnel management permission, and no sufficient management connector was available, so the dashboard was used.

After the host's browser-required permanent-deletion confirmation, removed in this order:

1. Explicit proxied music CNAME to `b4a0c6eb-4974-4ff1-94e6-de7e13104f0f.cfargotunnel.com`.
2. Tunnel `october-grove-playlist-lab`, UUID `b4a0c6eb-4974-4ff1-94e6-de7e13104f0f`, including its sole route/connections.
3. Access application `October Grove Playlist Lab`, ID `9c4687e8-504d-4b03-8f21-0b6d5d8d1197`, scoped to `music.hollow-court.com`.

All three disappeared from their respective dashboard lists. The unrelated Tunnel remained Healthy with one replica/three apps; the six other Access applications and main Worker DNS record remained. Shared host policy `b5bf0afc-653b-4314-b95b-0a1358c335bd`, main-site/game-admin Access, team login and identity providers were not modified.

After remote deletion verification, removed obsolete ignored `music/playlist-lab/.env`, `.local/tunnel-token` and `.local/tunnel-id`. The deployment `.env` was checked to contain only the six Playlist Lab deployment settings before removal. Spotify credentials and all databases were retained. No Cloudflare account/team-wide credential rotation or unrelated policy deletion was performed.

Private screenshots in the shutdown directory show the deletion-ready Tunnel scope, DNS removal, Tunnel removal and Access removal. They contain dashboard/account context and are not committed.

## Verification and recovery limits

- Docker project container/network listings are empty; both dedicated images were removed successfully.
- No TCP 8765 listener remains; no matching LaunchAgent/LaunchDaemon file was found.
- Both authoritative nameservers (`aron.ns.cloudflare.com`, `mitch.ns.cloudflare.com`) and recursive resolver `1.1.1.1` return **NXDOMAIN** for the music hostname.
- Anonymous `curl HEAD` returns **200** for the main website and **302 to Cloudflare Access** for both `/host` and `/api/admin`. Default Python urllib probes returned 403 for all three, so the verified curl behavior is reported separately; no authenticated game login or independent security audit is claimed.
- Original-to-backup table comparison and all four backup integrity checks passed. Private files remain ignored.
- Without replacement configuration, `docker compose config --quiet` fails on the missing required public origin. Restoring the service requires new Cloudflare resources/settings/token; deleted IDs, audience and connector token are not a working recovery configuration. Restore data from the current original databases or verified final backups, never an old batch seed.
- Local Markdown link-target checks, verification JSON parsing and `git diff --check` passed before the final commit. No application code changed, so no new runtime suite was needed.
- **Remaining work / proposals / dependencies:** none for this cleanup. Preserve the main website, game admin, Spotify playlists and other Docker/Cloudflare projects in future work.
- **Commits / unrelated edits:** local shutdown checkpoint `fc32ca4`; final completion commit is reported in chat. Unrelated dirty file at this turn: `decor/shopping-ready.md`; left untouched. No push requested.
