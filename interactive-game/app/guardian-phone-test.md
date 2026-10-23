# Guardian camera — phone test

Updated October 23, 2026 after the host-test crash fix. Close an already-open/crashed test tab and reopen the host link to load the replacement model; saved reference photos remain usable. Use normal phone photographs; LiDAR is not needed. This pilot tests recognition and a captured-photo awakening. It does not animate a continuously tracked 3D creature.

## 1. Teach the Lens a guardian

1. On your phone, open [Guardian reference photos in the host dashboard](https://hollow-court.com/host?tab=guardians). Sign in through Cloudflare Access with the host account.
2. Choose the character that should represent your physical object. Start with 3–6 distinct photos: front, left, right and a few distances. Centre the entire object in the middle square, with space around it. These are reference photos of your object, rather than the website illustration.
3. Keep at least one different photo **out of the reference set** for testing. After a first successful test, build toward 10–20 useful reference views including the room's actual lighting.
4. Add a few **Room backgrounds · not a guardian** photos: an empty shelf, nearby decorations and ordinary objects. A second guardian is helpful for testing mistaken identities. One guardian can test the flow, but cannot establish rejection accuracy.
5. If **Refresh saved views** is offered, use it to update older saved photos to the current recognition model. It reuses the private originals.

Reference photos are stored privately for the host; recognition features are shared with rehearsal guests. Photos used by the test scanner stay on the phone.

## 2. Try a photo, then the live camera

1. In the host dashboard, choose **Test the Looking Lens**. The current test uses **MagicTouch · CPU / WASM**; it replaces the high-memory SAM/WebGPU path.
2. Wait for **Lens ready · awakening ready**. This means recognition and segmentation have both completed a warm-up. First preparation downloads models/runtime and can take longer than later scans; keep the page in the foreground.
3. Choose **Choose a photo**, then select the held-out guardian photo. Check that it names the correct guardian, shows its greeting, and produces a useful glowing cutout. Tap the actual creature in the photo to refine an outline that selects only a face or background.
4. Choose **Scan another guardian**, then **Open the live lens** and allow camera access. Point at the real object, keeping the whole object centred. Hold steady: three consecutive matches over at least half a second trigger capture automatically.
5. The greeting, glow and **Hear its trial** appear as soon as recognition succeeds. The segmented cutout follows the new-photo inference; the trial remains available while it runs. Verify that the trial opens the right guardian.
6. Repeat with an ordinary object and an empty patch of room. The Lens should keep looking rather than confidently name a guardian. Try another angle and dimmer light too.
7. Close the live lens or leave its page. Check that the active camera indicator turns off. Re-entering the Lens must not start recording by itself. Tap **Open the live lens** again: the previous camera is a selection hint, while all tracks are newly acquired. Also try switching apps while scanning, and leaving while a permission request is still pending; returning must require another explicit open.

If you only have pictures for now, use a separate, untrained picture via **Choose a photo**. You can also point the live camera at a picture on another screen or a print. That tests the camera and awakening flow; repeat with the physical object before judging real-world recognition.

Host diagnostics separate **Awakening preparation** from the **Outline … per photograph** timing. Record both and the selected backend. Live camera tests also show **Camera opened**, **preview ready** from tap and initial/remembered camera selection. A permission prompt counts toward those times, so compare subsequent opens after permission has already been granted. If an earlier outline was interrupted by a crash/reload, recognition stays available and **Retry awakening outline** explicitly restarts it.

## 3. Check onboarding prewarming

1. In the **same phone browser**, open [the Workers rehearsal](https://hollow-court-preview.computer-toolbox.workers.dev). The public domain remains sealed and does not expose guest camera testing during this pilot.
2. Open **Field notes → Name + selfie** and complete the rehearsal registration. Both models prepare in the background during name/selfie entry; registration does not wait for them. This warms on recovery entry and returning rehearsal sessions too.
3. From the Court, choose **Awaken a guardian**. Look for **Lens ready · awakening ready**, then repeat the photo/live test above. If preparation is still finishing, the Lens joins the same job rather than starting another download.
4. Return to the Court and enter the Lens again **without reloading the page**. Both should still be ready. Models remain alive between visits; the previous working image is cleared. A full reload or a browser-reclaimed tab requires initialization again, with model files reused from cache where available.

For a quick guest scanner check without registering again, use **Field notes → Looking Lens · camera prototype**. That shortcut does not exercise name/selfie prewarming.

## What to report

- Phone model, OS and browser version; Wi-Fi or cellular.
- Recognition: correct/wrong/kept looking, and time to capture. Host live diagnostics include sampled frame count and stable-match time.
- Segmentation: preparation time, per-photo outline time/backend and whether the whole creature was selected. Note whether tapping improved it.
- Whether the second Lens visit was ready immediately, camera-opening/preview times on first and subsequent opens, whether the camera stopped outside scanning, and any crash or tab reload.

Prewarming removes download/session setup and first-run compilation from the scan. It cannot remove inference for a new photo. The retired SAM model took about five seconds per photo and reached almost 2 GiB of local process memory. The replacement produced an outline in about one second in the Mac browser test; iPhone/Android performance and stability still require your test. The greeting and trial do not wait for the cutout. If matching struggles, add more varied references before lowering the host calibration thresholds.
