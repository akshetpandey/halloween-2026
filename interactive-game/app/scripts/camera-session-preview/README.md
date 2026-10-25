# Camera session lifecycle browser fixture

Run `npm run dev -- --port 5191` from the app folder, then open `http://127.0.0.1:5191/scripts/camera-session-preview/`.

This mounts the actual GuardianLens, LensCamera singleton and root page-lifecycle binding. It replaces only getUserMedia with a generated canvas stream and optional host entrance-geometry reads with an empty local response. It uses a synthetic, deliberately nonmatching gallery. No real camera, microphone, account or private photograph is accessed. The source is excluded from the production Vite entry/build.

Open live view, close it, navigate to Court and back, and open again: camera requests should remain one; requested audio false; audio tracks zero. Capture a still: the stream should pause and stay available. Release explicitly, then reopen: requests should become two. Reload starts a new document/session. Unit tests separately exercise backgrounding, page exit, cancellation, rejected permission, missing/dead video and audio removal.

This proves application request/lifecycle behavior. It does not reproduce iPhone Chrome permission dialogs, camera hardware, indicator/battery behavior or browser reclamation. Those need the [phone test](../../guardian-phone-test.md).
