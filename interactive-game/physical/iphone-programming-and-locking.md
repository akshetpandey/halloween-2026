# iPhone NFC programming and permanent locking

**Current game-flow update, September 4:** Apply this hardware procedure to [all fifteen mixed entities](entity-plan.md). During the website tests, verify name/selfie onboarding, stable puzzle assignment and solution-earned Favor, not the older instant-claim flow. No physical QR fallback; the separately requested Partiful/Summons invitation QRs are website features. The remaining writing, test-before-lock and verification procedure is retained.

Updated September 4, 2026. Research and procedure documented; **no physical tags have been written, locked or tested**. Applies to both embedded figurine bases and separate moon touchpoints. No QR fallback.

## App and compatible tags

Use **[NFC Tools by wakdev — iPhone App Store](https://apps.apple.com/us/app/nfc-tools/id1252962749)**. The US listing shows a free app, optional $3.99 Pro purchase, iPhone 7 onward and iOS 15.6 or later. Its [official iOS page](https://www.wakdev.com/en/apps/nfc-tools-ios.html) documents URL writing, locking/password protection and tested NTAG213/215 support. The [iOS release notes](https://www.wakdev.com/en/apps/nfc-tools-ios/release-notes.html) specifically document NTAG21x locking fixes. Use a current compatible release. No app installed or in-app purchase made in this task; the exact paid/free feature boundary was not tested.

The host uses the writer app; guests scan the finished URL tags without installing it on supported phones. Writing compatibility and background reading compatibility differ: [Apple documents background reading on iPhone XS and later](https://developer.apple.com/documentation/CoreNFC/adding-support-for-background-tag-reading), subject to device state. A guest taps the NFC notification and unlocks if requested. Hold the upper back/top edge of the iPhone at the moon; start with an awake, unlocked phone on its Home Screen. Camera, Wallet, another NFC session and Airplane Mode can prevent background scans.

Use complete blank, writable NFC Forum Type 2 NTAG213/NTAG215 tags. [Amazon tag options and sizes](amazon-figurines-and-tags.md). Store one short **NDEF HTTPS URI record**, not plain text, a personal Shortcuts automation, an Amiibo file or the whole story. The normal writing session deliberately writes data; a guest's ordinary background read is not an overwrite operation.

## Before writing

1. Choose a stable domain controlled by the host and a permanent route for each witness. An illustrative shape is `https://YOUR-DOMAIN/c/RANDOM-TOKEN`; this is a placeholder, **never an address to encode**. Use the site's generated opaque token rather than a creature name or guessable sequence. Website not yet built; production URLs remain pending.
2. Keep names, lore, enabled/disabled status and scoring on the server. Preserve the encoded route if content changes later; keep control of the domain. A locked tag cannot follow a new domain unless its existing URL continues to redirect there. Avoid temporary preview URLs and third-party short links with uncertain lifetime.
3. Assign a private prop ID and record its exact URL, tag type/UID, location and test status in the [tag register](nfc-tag-register.csv). UID is inventory information, not a secret or the guest identity. Keep URL tokens/helper records off the public invite.
4. Work with one loose tag at a time, away from the rest of the pack and metal. In **Read**, check chip type, writable status and whether it can be made read-only. Confirm the complete record fits; NTAG213 has 144 bytes user memory, NTAG215 504, with format overhead. Reject unexpected, already-locked or unsupported tags instead of modifying low-level memory blindly.

## Write, inspect and test

5. In NFC Tools choose **Write → Add a record → URL / URI**. Enter the complete final HTTPS URL; validate it. UI translations may say “Add a recording” or “Validate.” Clear old entries so there is one URL record. Choose **Write / X Bytes**, hold the tag at the phone antenna and wait for success. [Wakdev URL-writing guide](https://www.wakdev.com/en/knowledge-base/how-to-guides/how-to-write-a-link-url-on-an-nfc-chip.html)
6. Return to **Read** and compare the entire decoded URL with the register, including token, spelling and protocol. A success message alone does not prove the correct URL was written. For an early hardware-only pilot, a harmless test URL is fine, but rewrite to the production URL and repeat every check before locking.
7. End the writer session, return Home and test a normal background scan: notification → tap → correct entity page → assigned puzzle → verified solution earns Favor for the correct player. Check name/selfie signup, a second entity, duplicate completion rejection, player recovery and helper-assisted puzzle completion. A working link alone does not validate the game.
8. Test bare, behind the intended cover, then in the fully painted/glued **reversibly assembled** base or moon panel on its intended shelf/wall carrier. Test two supported iPhone generations and one NFC Android with ordinary cases, plus an unfamiliar guest after one demonstration. Try ten approaches per phone; record successes, delays and failures. Also check moon visibility after glow fades. Redesign a frustrating target before batch fabrication.

## Permanently lock only after the tests pass

9. First rehearse locking on one spare/sacrificial tag. For each production tag, confirm its final URL, assembled scan test and website flow have passed and the register is correct. **Locking is irreversible on these tags.** Retain physical access until verification is complete.
10. Use **Other → Lock a tag**, accept the app's irreversible-lock warning only for the verified tag, hold it at the phone antenna and wait for completion. This is the app's permanent read-only operation, **not “Set password.”** [Wakdev locking guide](https://www.wakdev.com/en/knowledge-base/how-to-guides/how-to-lock-an-nfc-chip.html)
11. Read again: verify the URL is unchanged and the tag now reports **read-only / not writable**. Repeat a normal guest scan. As an additional check on each tag, attempt to write the **same already-verified URL** again; expect a read-only rejection. Using the same URL avoids replacing good content if a lock unexpectedly failed. A generic scan error is not evidence of write protection: re-read and establish the explicit status. If a write succeeds, treat the tag as unlocked and diagnose or replace it.
12. Record lock date, verification result and final mounted scan. Seal the cover only now; repeat a final scan after sealing and during setup. Keep unprogrammed spare tags accessible. If a locked URL is wrong, replace the tag or fix routing at the unchanged URL if appropriate; there is no erase/unlock recovery for its locked user data.

[Apple's writeLock API](https://developer.apple.com/documentation/corenfc/nfcndeftag/writelock(completionhandler:)) supports making compatible NDEF tags read-only. [NXP's NTAG213/215/216 data sheet](https://www.nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf) describes irreversible lock bits. Use the app's complete compatible-tag function; do not manually set lock/configuration bytes as part of party setup.

## What locking does and does not do

Permanent read-only protects the encoded NDEF content against ordinary rewriting, including deliberate casual tampering. Password protection is a different feature and is not the selected finalization method. Leave reading public so guests can open the page normally. A successful read does not prove the tag is locked.

Anyone who reads the URL can copy/share it or write it to another tag. Locking does not prevent cloning, URL sharing or replacement of the entire prop, and opaque URLs do not prove physical presence. Keep one claim per player/witness and cutoff enforcement on the server. For this optional symbolic-prize party game, the existing trust-based approach remains a proposal. No security keys or personal guest information belong on these tags.

The procedure is ready; purchasing, website setup, programming, locking and phone tests are all still pending.
