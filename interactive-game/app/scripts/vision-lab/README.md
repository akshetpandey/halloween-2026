# Local guardian model lab

Desktop research harness; never part of the app build or Worker. [Results and decision](../../guardian-model-review-2026-10-23.md). Models, user photographs, descriptors, screenshots and the YOLO visual-prompt export remain in ignored `private/`.

From `interactive-game/app`:

```sh
node scripts/vision-lab/prepare.mjs
npx vite build scripts/vision-lab --outDir ../../private/vision-lab-dist
node scripts/vision-lab/serve.mjs
```

Open `http://127.0.0.1:5173/`, choose actual test photos, then a model. Each button starts one new Worker, records preparation separately and processes each photograph once. Later images share the session. Stages stop after 90 seconds; **Stop** terminates the Worker immediately. Closing the tab also releases it. Reload before a new comparison to clear the record/gallery. Raw CPU/WASM and GPU timing are separate; cold shader compilation can appear in the first image. These are exploratory samples, not controlled mobile p50/p95 measurements.

The convenience **Load local fox fixtures** button requires the host's three existing private pilot JPEGs at `private/fox-pilot-2026-10-23/fox-{1,2,3}.jpg`. This only reads loopback files. The server has a narrow filename allowlist and does not serve metadata, keys, SQL, selfies or arbitrary private paths. Do not bind it to a public interface or publish its output directory.

MagicTouch uses the pinned MediaPipe 1.1.1 runtime; baseline preprocessing matches production. The newer 768px candidate uses the stateful API and positive point prompts. EdgeSAM uses SAM RGB normalization, longest edge 1024, zero padding, and highest stability-score mask. Its box modes now use manual per-view fox boxes (coarse ROI annotations, not segmentation truth). The earlier fixed-box CPU run is labeled in the results. SAM2 uses the model processor's 1024-square image normalization and a per-view box. YOLO letterboxes to 640 square and reports the top box/confidence rather than claiming an instance-accuracy score. The three-point MagicTouch trial includes manual head/tail cues and unions confidence masks, testing an assisted prompt strategy rather than an autonomous new model.

For the optional YOLOE trial, create a **private** Python environment with `ultralytics==8.4.184`, `torch==2.14.1`, and `onnx==1.20.1`, set `YOLO_CONFIG_DIR` inside `private/`, then run `python scripts/vision-lab/export-yolo.py`. It uses the official YOLOE26n checkpoint and a visual box on fox view 2. The static ONNX export bakes that visual class; changing host references would require re-export or a separate visual encoder. No guest photo is uploaded.

`models.json` records byte counts and SHA-256 pins. Google's candidate URL is mutable `latest`, but the script rejects changed bytes. Third-party ONNX exports are experiments, not endorsements or production dependencies. Record device, OS/browser, cold/warm state, total stage time, mask quality, failure mode and memory where measurable. The included sanitized results contain no reference IDs, photos or descriptors.
