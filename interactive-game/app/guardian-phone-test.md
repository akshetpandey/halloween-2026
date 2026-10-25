# Guardian camera — phone test

Updated October 24, 2026. Reload the host link to load the latest build; saved reference photos remain usable. Use normal phone photographs; LiDAR is not needed. This pilot tests recognition followed by a screen-space character performance, without continuous 3D tracking.

## New: host fox spirit

Open [Guardian reference photos](https://hollow-court.com/host?tab=guardians) and tap **Preview fox spirit**. Then select **The Fox of Small Print** and **Test this reference** to test its entrance from an existing photo, or **Test the Looking Lens → Open the live lens** for a live scan. Wait for **Lens ready · fox asset ready**. The host fox skips segmentation and plays an emergence, playful tail chase, pounce, grounded sit and curious front-facing greeting. Try replay, pause and tapping it. The host-approved authored red panda follows the LEGO 31394 palette and proportions. Its running paws now swing forward while airborne and push back on contact, with correctly folding fore elbows. **Try a GLB capture** previews a Polycam mesh locally for this visit. [Complete steps, capture requirements and storyboard](guardian-spirit-prototype.md).

The outline and saved-puppet steps below apply to other guardians, guest rehearsal and the movement editor. Saved fox boundaries still supply its optional 3D entrance anchor; head/tail points no longer deform the host fox’s reveal.

## 1. Teach the Lens a guardian

1. On your phone, open [Guardian reference photos in the host dashboard](https://hollow-court.com/host?tab=guardians). Sign in through Cloudflare Access with the host account.
2. Choose the character that should represent your physical object. Start with 3–6 distinct photos: front, left, right and a few distances. Centre the entire object in the middle square, with space around it. These are reference photos of your object, rather than the website illustration.
3. Keep at least one different photo **out of the reference set** for testing. After a first successful test, build toward 10–20 useful reference views including the room's actual lighting.
4. Add a few **Room backgrounds · not a guardian** photos: an empty shelf, nearby decorations and ordinary objects. A second guardian is helpful for testing mistaken identities. One guardian can test the flow, but cannot establish rejection accuracy.
5. If **Refresh saved views** is offered, use it to update older saved photos to the current recognition model. It reuses the private originals.

Reference photos are stored privately for the host; recognition features are shared with rehearsal guests. Photos used by the test scanner stay on the phone.

## 2. Try a photo, then the live camera

1. In the host dashboard, choose **Test the Looking Lens**. The host fox uses 3D; other guardians use **MagicTouch · WebGL GPU** with CPU fallback. The retired high-memory SAM model is not loaded.
2. Wait for **Lens ready · fox asset ready** in the host test. Guest rehearsal reports **Lens ready · awakening ready** after recognition and segmentation warm up. First preparation downloads model/runtime files; keep the page in the foreground.
3. Choose **Choose a photo**, then select the held-out guardian photo. **Test this reference** under a saved host photo is a quick reveal replay, but does not test recognition on a new image. Check that it names the correct guardian, shows its greeting, and produces a useful glowing cutout. Tap the actual creature in the photo to refine an outline that selects only a face or background.
4. Choose **Scan another guardian**, then **Open the live lens** and allow camera access. Point at the real object, keeping the whole object centred. Check the first valid match immediately names the guardian, lights the frame gold and says **Hold steady · it’s coming into focus**. Three leaves light as confirmation advances. Three consecutive matches over at least half a second turn the frame green, show **You found it. Waking the guardian…**, and trigger capture automatically. Move away during confirmation: the name/progress should clear and **The shape slipped away** should invite you to centre it again. Returning to the object starts a new confirmation.
5. Host fox recognition opens the 3D performance above; verify the circle’s paws travel naturally, the landing/sit remain grounded and replay/pause still work. Other guardians and guest rehearsal reveal the name and greeting immediately, followed by a gold scan line and segmented cutout over the darkened photo. A guardian with aligned saved movement tilts its head and/or swishes its tail; other cutouts float gently amid gold pollen. **Let it rest / Wake it again** pauses/resumes puppet motion. The host test offers **Back to reference photos**. The guest rehearsal offers **Hear its trial** while the outline runs; verify there that the trial opens the right guardian. This is 2D photo motion, with no 3D tracking or spoken greeting.
6. Repeat with an ordinary object and an empty patch of room. The Lens should keep looking rather than confidently name a guardian. Try another angle and dimmer light too.
7. Close the live lens or leave its page. Check that the active camera indicator turns off. Re-entering the Lens must not start recording by itself. Tap **Open the live lens** again: the previous camera is a selection hint, while all tracks are newly acquired. Also try switching apps while scanning, and leaving while a permission request is still pending; returning must require another explicit open.

If you only have pictures for now, use a separate, untrained picture via **Choose a photo**. You can also point the live camera at a picture on another screen or a print. That tests the camera and awakening flow; repeat with the physical object before judging real-world recognition.

### Save movement once per useful reference angle

1. Return to **Guardian reference photos**, choose the fox, and tap **Set up movement** (or **Edit saved movement**) below a reference photo. The three current fox views have starter movement setups prepared from their photographs; review them with **Preview awakening** and adjust if necessary.
2. Use **Place a marker** to choose **Boundary: top left**, then tap just above/left of the whole fox. Choose **Boundary: bottom right**, then tap just below/right, including its entire tail. The compact selector stays visible as you scroll the photo.
3. Choose **Head**, **Neck**, **Tail tip** and **Tail base** in turn, tapping each position in the photo. Choose head/tail/both under **Moving parts**. This editor also works for other guardians.
4. Tap **Preview awakening**. The outline uses the body, head and tail points rather than only the photo centre. Check the whole tail is included and the correct regions move. Adjust if necessary, then tap **Save movement**.
5. Set up the other useful reference angles too (up to six saved movement views per guardian). Reopen **Edit saved movement** or reload the dashboard to verify persistence.
6. Open **Test the Looking Lens** and choose a new photo from a similar angle. Diagnostics should say **Saved movement aligned** with a matching-detail count. A new side of a 3D object may need a reference setup from that side; uncertain geometry leaves the guardian available without applying an unverified puppet.
7. Reduce Motion no longer suppresses Lens motion, per the host's request. **Let it rest / Wake it again** is still available. **Adjust this capture’s movement** changes only the current reveal; use the reference editor for permanent changes.

The cutout is a lightweight 2D mesh. It does not reconstruct hidden parts or eyelids, and blinking is not implemented. Saved part prompts improved the missing tail in the three-photo desktop pilot; that does not establish quality on every new camera angle. [Model research and measured comparison](guardian-model-review-2026-10-23.md).

October 23: the host confirms the test page now opens on iPhone Chrome. All three saved fox views use the current recognition model. A Mac browser test of one saved view recognized **The Fox of Small Print** in 0.08 seconds and outlined it in 0.84 seconds after warm-up. The mask missed the upper tail tip; tap refinement and further phone testing remain useful. This saved-reference test demonstrates the flow, not held-out recognition accuracy.

Comparing each saved reference vector against only the other two produced similarity scores 0.779, 0.726 and 0.779, below the unchanged 0.80 match threshold. Add closer, varied views and test a fresh photograph before changing calibration. There are no background negatives or other guardians enrolled yet, so rejection accuracy is untested. See the [pilot evidence](handoff-2026-10-23-fox-pilot.md).

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

Prewarming removes download/session setup and first-run compilation from the scan. It cannot remove inference for a new photo. The retired SAM model took about five seconds per photo and reached almost 2 GiB of local process memory. The current accelerated path produced warmed single-point outlines in about 46–51ms and three-point outlines in 126–159ms in the desktop experiment. Cold compilation, alignment and phone performance are separate; iPhone/Android performance and stability still require your test. The greeting and trial do not wait for the cutout. If matching struggles, add more varied references before lowering the host calibration thresholds.
