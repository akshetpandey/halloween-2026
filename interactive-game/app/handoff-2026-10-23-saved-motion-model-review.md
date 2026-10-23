# Saved guardian movement and model comparison

- Session: guardian movement persistence / mobile model review, October 23, 2026.
- Checkout: `/Users/akshet/workspace/halloween-2026`, shared `main`; base `02505ca`.
- Status: implementation checkpoint complete; local host UI and deployment verification continuing.
- Confirmed: host explicitly requests Lens motion despite Reduce Motion; saved reference points must transfer to new captures; 10–15fps capture, frozen-still reveal and lightweight local models. Existing working phone/NFC paths must remain usable.
- Implemented: additive motion table; Access-protected validated per-reference CRUD, bounded descriptors/poses and private cache policy; local ORB matching/RANSAC alignment; host movement editor/preview; generic head/tail puppet using saved parts; up to three segmentation prompts; GPU delegate with fresh CPU fallback; 12fps ideal/15fps cap; explicit Lens Reduce Motion exemption with manual pause.
- Research: [model review](guardian-model-review-2026-10-23.md), [reproducible lab](scripts/vision-lab/README.md), checksum manifest and sanitized metrics. Private source photographs, generated reference models, feature payloads and screenshots remain ignored. No model candidate replaces the current recognizer or small outline weights.
- Checks so far: TypeScript/build pass; all 123 unit tests across 16 files pass with normal macOS Apple Vision access; all six local API integration scenarios pass including motion persistence, identity gates, pause filtering, clear and reference-deletion cascade. Sandboxed Apple Vision QR check failed until rerun with native resources; no QR source was changed. Candidate assets verify against recorded hashes. Local migration 0008 applied.
- Remaining this session: local host editor/reload/automatic alignment/animation UI checks, final resource cleanup, additive remote migration + Worker deployment, hosted gate/header/asset verification, final handoff update and commits.
- Phone acceptance remains: held-out real-prop accuracy, new-angle alignment, whole-object cutouts, GPU/CPU timings, repeated scans/backgrounding, and iPhone/Android memory stability. No new phone benchmark is claimed.
- External state at checkpoint: no production migration/deployment yet; Wrangler existing narrow OAuth login refreshed successfully. No new permissions or services purchased.
- Commits: checkpoint to be created on `main`; no unrelated dirty files observed.
