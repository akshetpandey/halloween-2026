# Can guests do this on iOS/Android without an app?

**Current scope, September 4:** [Fifteen mixed entities](11-physical-entity-plan.md), not an all-bark batch. The device research below remains useful. Scanning now opens an individually assigned puzzle; only a solved puzzle earns Favor. Helper assistance must preserve that rule. Physical checkpoints remain NFC-only; the website's Partiful and Summons invitation QRs are explicitly requested exceptions to older blanket “no QR” wording. [Current guest flow](03-website-build-brief.md). Earlier count/claim-flow descriptions below are historical.

**Latest physical proposal:** 10–15 handmade bark spirits with separate moon-covered NFC touchpoints immediately beside/below them. This avoids embedding antennas in the sculptures. See [current build and sourcing plan](06-bark-spirits-and-moon-touchpoints.md); embedded bases below remain an alternative.
Research checked September 3, 2026. **Yes, with NFC tags that open web URLs, plus a normal mobile website.** Physical compatibility still needs a small pilot.

## The route to use
Program each tag with one **NDEF URI record** containing a short HTTPS address for that totem. The phone reads the tag and offers/opens the URL; the website handles identity, the claim and the score. This does not require the website to control the NFC reader.

Apple documents background URL-tag reading on iPhone XS and later, with a notification the user taps. Background reading has conditions: phone in use, and interference from activities such as camera or Wallet use. Plan for a tap and possibly an unlock, not invisible automatic scoring. [Apple documentation](https://developer.apple.com/documentation/CoreNFC/adding-support-for-background-tag-reading)

Android documents NDEF URL dispatch, normally with the screen unlocked and NFC enabled. Behavior varies by device and OS; current documentation specifically describes an open-link notification beginning with Android 17. Test real devices and let instructions say “tap the tag, then open the link.” [Android documentation](https://developer.android.com/develop/connectivity/nfc/nfc)


## Guest phone mix and scan troubleshooting — September 3 update
Host estimates **95% iPhone / 5% Android**. This favors designing and testing the no-app iPhone experience first; it is not a measured compatibility or scan-success percentage. Exact guest models are unknown.

Apple confirms background reading on iPhone XS and later. A supported phone offers a notification that the guest must tap; a locked phone may then require unlocking. For the simplest demonstration, unlock the phone, return to its Home Screen, hold its top back edge close to the moon mark and pause, then tap the notification. NFC does not use the camera. Apple lists camera use, Apple Pay Wallet use, another active NFC reader session, Airplane Mode and a device that has never been unlocked as conditions that prevent background reading. A dark/inactive phone should not be assumed to scan. Older iPhones need a different reading route and cannot be promised this same background interaction. [Apple background-reading documentation](https://developer.apple.com/documentation/CoreNFC/adding-support-for-background-tag-reading) · [Seritag antenna-position guidance](https://seritag.com/learn/using-nfc/seritag-encoder-app)

Diagnose in this order:
1. **No notification:** close Camera/Wallet/reader apps, unlock and return Home, check Airplane Mode is off, and reposition the top edge at the marked surface. On Android, unlock and check NFC is enabled; antenna position varies by model.
2. **Still no notification:** remove a bulky case or attached wallet as a diagnostic; compare a known-good bare tag. Check for metal in the prop/shelf, excessive burial depth, a tiny/damaged antenna, or a blank/misencoded tag. Ordinary cases are not automatically a problem. Keep neighboring tags separated so one tap targets one creature.
3. **Notification appears but page fails:** NFC has worked. Check cellular/guest Wi-Fi, the encoded HTTPS address and website availability.
4. **Page opens but point is missing:** diagnose player identity, explicit claim, duplicate-claim behavior, event cutoff or backend errors. Do not mistake an intentional repeat-claim rejection for bad NFC.

Test the mounted prototype with **two different iPhone generations**, preferably including the oldest readily available supported model, plus one NFC-capable Android. Use normal phone cases and the intended shelf. Test background scanning with the NFC writing app closed: a successful in-app scan alone does not prove the guest experience. Run ten fresh approaches per phone and have an unfamiliar person try it; record failures and delays, not just eventual success. This remains a proposed pilot, not completed validation. No QR fallback; a volunteer can record a witnessed find against the correct guest identity if needed.

## Compatibility choices
| Approach | Fit for this party |
|---|---|
| NFC tag → HTTPS website | Recommended primary interaction on compatible phones |
| Printed QR | Removed from the design at the host’s request; no QR fallback |
| JavaScript Web NFC reader | Do not make it a requirement: Chrome documents it for Android; it is not a general iPhone web solution |
| Generic RFID/UHF inventory tag | Wrong product family for this phone interaction; choose NFC/NDEF tags |
| Native iPhone/Android app | Unnecessary for the proposed URL approach |

[Chrome Web NFC documentation](https://developer.chrome.com/docs/capabilities/nfc) · [MDN Web NFC support documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API)

A “scan” button on an iPhone webpage cannot be assumed to directly read a tag. Our design instead uses the phone’s URL-tag handling. Browser code sees the link; it does not receive proof that the guest physically found the object or a portable hardware serial-number identity.

## Tag choice and one-time preparation
Use a small pack of rewritable **NFC Forum Type 2 NTAG213** tags, or NTAG215 if convenient. NTAG213 has 144 bytes of user memory; keep the complete encoded record small and verify it fits. Store only the short URL, not the story text or player details. NTAG215 provides 504 bytes but does not improve anti-cheat by itself. [NXP chip documentation](https://www.nxp.com/products/NTAG213_215_216)

The host will normally need an NFC writing app once to program the tags; **guests do not need it**. Wakdev’s instructions support writing a URL with NFC Tools on iOS/Android. Write a URI record rather than plain text that happens to look like a URL. [Writing instructions](https://www.wakdev.com/en/knowledge-base/how-to-guides/how-to-write-a-link-url-on-an-nfc-chip.html)

Prototype source: [Adafruit NTAG213 white tag, product 4033](https://www.adafruit.com/product/4033). A [10-pack vendor example](https://www.yarongtech.com/products/nfc-ntag213-sticker-tag-work-for-samsung-galaxy-s4-s5-and-all-nfc-phone-10) is also saved for comparison. Update: Adafruit 4033 showed $2.95 each, $2.66 each at quantity 10+, and 56 in stock on Sep 3. Address-specific delivery remains unverified. Amazon remains preferred when we select the exact pack; buy only a small prototype quantity first.

## What will and will not prevent cheating
A server can award only one point per player/totem and reject repeated requests. Random unguessable tag URLs prevent easy enumeration. Neither prevents a guest from sending a discovered URL to someone else. A locked tag prevents rewriting, not copying its URL.

For a casual party with a symbolic prize, recommendation: accept that trust boundary, keep totems fixed, ask people to find them themselves and use volunteers to make the experience fun. A copied static link is indistinguishable from a physical scan to this website.

More robust tag authentication is possible with **NTAG 424 DNA** and changing, cryptographically authenticated URLs, but that adds tag provisioning, secret-key handling, counter/replay rules and backend verification. It is disproportionate for this first version and still does not eliminate every form of live sharing. [NXP secure-tag description](https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA)

## Physical and network pilot
- Put the antenna near an accessible face of each prop; mark the tap spot subtly. Hide the totem, not the basic ability to scan once found.
- Test after final paint/fabric/resin mounting. Thick material, metal, foil, liquid and phone cases can interfere. A tag cannot be assumed to work buried in a skull or wrapped around metal wire.
- The branch props contain wire; use a separate accessible nonmetal token face and test it. Use tags sold for on-metal use only if the final placement requires them.
- Conceal the tag in the figurine or its integral base, near a reachable tap surface. No printed codes. See the figurine build brief for a replaceable tag pocket.
- Scoring needs access to the backend. A public HTTPS site using cellular or guest Wi-Fi is simpler than depending on a server running on the music laptop. Do not promise offline scoring until specifically built and tested.
- Keep a paper/helper fallback if phones or connectivity fail. A guest can play by noting symbols and having a volunteer record the finds.

**Decision:** technically feasible; website/physical pilot is the next implementation gate. No compatibility test or security guarantee is being claimed yet.

## September 4 • programming and source verification

[Verified Amazon tags and figures](07-amazon-figurines-and-tags.md) include 30 mm NTAG215 coins and 25 mm NTAG213 stickers. The [NFC Tools iPhone workflow](08-iphone-programming-and-locking.md) now specifies permanent read-only locking after final-URL, website and mounted-prop testing, plus post-lock status/read verification. A writing-compatible iPhone is not necessarily capable of the same background guest scan. No physical test has been performed.
