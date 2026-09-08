# The hidden witnesses • NFC woodland figurines

**Current scope, September 4:** [15 entities = 5 decor + 5 purchased + 5 homemade stick/straw](11-physical-entity-plan.md). This document retains construction techniques and the earlier sourcing evidence. The ten-bought/two-made recommendation and $100 basket below are superseded as the active mix; do not fabricate an additional twelve-piece set. Physical checkpoints are NFC-only; invitation QRs are allowed on the website. Scanning leads to a puzzle, and assistance credits a verified completion, not an instant claim. [Current website requirements](03-website-build-brief.md).

## Earlier figurine proposal and reusable construction research

Updated September 4, 2026. **Latest sourcing request: buy most woodland figures, make a few, and document iPhone programming plus permanent locking after testing.** Recommended 12-witness example: ten purchased figures and two handmade spirits on matching bases. See [verified Amazon shortlist, dimensions and $100 proposed envelope](07-amazon-figurines-and-tags.md). The [10–15 bark spirits with separate moon touchpoints](06-bark-spirits-and-moon-touchpoints.md) remain an alternative; this research does not confirm the final format or count. Premade moon stickers only; no QR fallback. Nothing purchased, encoded, locked or physically tested; website not built.

## Recommended physical design
Make each witness a small creature with an integral woodland base. Hide one tag just beneath the top or front of the base, beside the feet, behind a thin nonmetal cover. Add a tiny repeated moon or leaf motif at that spot. The tag is invisible, but a guest who has seen the demonstration knows where to hold the phone. No printed code or exposed sticker.

This is still an embedded figurine: creature, base and concealed tag form one prop. It avoids squeezing a poor-reading tiny tag into a small head, and avoids asking guests to lift or turn over the object. A hollow-bodied creature can instead hide the tag behind its thin back or belly if there is enough flat space for the antenna and an accessible phone approach.

Initial prototype dimensions, not guarantees: most creatures around 2–4 inches tall; start with a 3-inch base and a clear 40–45 mm tap area for a complete 25–40 mm tag. Use a larger oval base for a wide stance. The verified Amazon options are 25 and 30 mm; a 38–40 mm option has not been sourced. Start with a very thin cover, roughly 1–2 mm, and test; no universal material thickness guarantees a read. A larger base is acceptable for an especially small creature.

## Tag requirements
Use a complete passive **13.56 MHz NFC Forum Type 2 NTAG213 or NTAG215 tag with antenna**, formatted with a short NDEF HTTPS URI. It needs no battery. A bare chip or a generic UHF inventory tag is not the same product. Extra memory does not by itself mean better reading or stronger anti-cheat. [NXP tag family](https://www.nxp.com/products/NTAG213_215_216)

A larger usable antenna generally gives a more forgiving phone target than an ultra-mini tag; [Seritag’s size guide](https://learn.seritag.com/learn/using-nfc/nfc-tag-sizes) recommends around 29/30 or 38/40 mm labels for mobile-phone uses. Choose after checking the actual antenna and assembled prop, not package diameter alone. Do not cut the tag to make it fit.

Metal, metallic foil finishes, wire armatures, magnets and nearby liquid can alter performance. Prefer plain resin/plastic/wood around the antenna and nonmetallic paint over the tap spot. Test any material, pigment, glue and shelf in the final configuration. Metal placement calls for an appropriate ferrite-backed/on-metal design and another test; it is not fixed by burying an ordinary tag deeper. [Seritag metal guidance](https://seritag.com/nfc-tags/factory-tag) · [ST touchpoint design paper](https://www.st.com/content/ccc/resource/premium_content/document/group0/aa/8a/4c/68/f4/dc/4e/72/White_paper_NFC_design_considerations_for_an_improved_User_Experience/files/BRWPNFCUX0920.pdf/jcr%3Acontent/translations/en.BRWPNFCUX0920.pdf)

## Buy versus make
**Best value: purchased figurines on crafted bases.** Buy one coordinated set of resin/plastic woodland animals or forest spirits. Give them common bone-white/charcoal finishes with moss-green details if needed. Add a hollow/pocketed base containing the tag; keep it replaceable until the whole system passes. A wooden disk with a recess and a thin cover, or a small hollow plastic pedestal, avoids drilling into purchased solid resin bodies.

**More character: simple handmade spirits.** Use air-dry clay, or sculpt and cure an outer shell before inserting the tag. Distinct shapes—antlers, moth wings, mushroom cap, owl face—matter more than fine detail in dim light. Do not bake an ordinary tag inside polymer clay or pour hot-curing resin around it without a tag-rated process. A post-cure access pocket is the default. No printer or resin-casting equipment is required.

**Aesthetic options:** bark-faced root guardians, small antlered forest creatures, or pale rounded woodland spirits inspired by the atmosphere of Princess Mononoke. These are directions, not licensed-product claims. Tiny 1-inch terrarium ornaments may need bases larger than the figure to accommodate a readable tag.

## Current sourcing and cost
- [UANDME ten-animal pack](https://www.amazon.com/dp/B085G48BNK): **$20.99**; use eight animals for the 12-witness example, excluding moose/piglet.
- [Safari raven](https://www.amazon.com/dp/B00H8ZUALE) and [barn owl](https://www.amazon.com/dp/B00B3YHGJA): **$7.99 each**.
- [BABIQT NTAG215, 30 mm, 30 nonadhesive coins](https://www.amazon.com/dp/B07PFC2FH5): **$9.50**. Alternative: [Timeskey NTAG213, 25 mm, 20 white stickers](https://www.amazon.com/dp/B07K6H6K43), **$9.99**.

Product-page prices observed September 3–4; tax/shipping excluded. Recommended four-item component subtotal **$46.47**; proposed all-in prop envelope **$100**, including craft supplies, premade markers and a buffer. This replaces earlier prop estimates, not an approved increase. Crown and hosting separate. Full contents, size evidence, alternate multipack, delivery caveats and cost breakdown are in the [sourcing brief](07-amazon-figurines-and-tags.md).

Earlier Safari TOOB/Adafruit estimates are superseded as the preferred basket. No listing establishes an internal NFC cavity: mount the purchased figures on bases with their own accessible tag pockets. Actual foot span, tag thickness, antenna size, paint compatibility and phone clearance require the sample.

## iPhone writing and read-only finalization
Use [NFC Tools by wakdev](https://apps.apple.com/us/app/nfc-tools/id1252962749). Write one NDEF HTTPS URL with **Write → Add a record → URL / URI**; read back the exact URL, then test normal background scanning with the writer closed and the final reversible prop assembly. Resolve permanent domain/token and website behavior before finalization. Only after those tests pass, use **Other → Lock a tag** to make the compatible tag permanently read-only. Re-read its status, verify the URL, expect rejection of a same-URL rewrite, then seal and scan again. Password protection is a different operation. A locked tag can still have its URL copied/shared.

The [full step-by-step programming checklist](08-iphone-programming-and-locking.md) includes official Apple/NXP/wakdev evidence, failure handling, app cost and a spare-tag rehearsal. The [tag register](nfc-tag-register.csv) is an empty template, not evidence of completed programming.

## Proposed creature identities
Keep each visually distinct and map it to a story mark: raven / Raven, little stag / Antler, owl / Moon, bark spirit / Root, moth / Last Leaf, fox / Ember, toad / Well, hedgehog / Thorn, hare / Seed, veiled spirit / Veil. This is a design menu, not a requirement to buy ten individual premium figurines. Adapt names to a good multipack. Well stays outside the bathroom. Objects stay in place; guests collect digital marks, not the figurines. Chocolates remain the take-away gifts.

## Guest experience
Volunteer: “The forest left little witnesses around the house. When you find one, hold your phone near its moon mark, then open the message it offers you. Leave the creature where it lives.”

Phone reads the concealed URL → guest taps notification/unlocks as needed → website joins/recognizes the player → guest solves the assigned puzzle → verified completion earns Favor. No guest app installation. Existing iPhone/Android compatibility limits still apply; removing QR does not make every phone NFC-capable. Link sharing is still possible after a scan; embedding hides the hardware, not the URL.

## Quiet assistance, without QR
A volunteer may assist phone use and record a witnessed puzzle completion for the **guest’s player identity** in an authenticated helper view, following the current [volunteer rules](02-volunteer-runbook.md). Discovery alone earns no Favor; helpers must not provide puzzle hints or answers. Do not scan on the helper’s ordinary player session and accidentally credit the helper. For a guest with no usable phone, a distinct helper-managed player code remains a proposal; resolve selfie participation and costume-vote eligibility before implementation. Reconcile witnessed puzzle completions through the same one-Favor-per-entity rule. A device-sharing flow must keep players separate. This is a proposed operational backup, not an implemented feature or a replacement public scan route.

Offline written puzzle-completion records need a recorded time and clear reconciliation rule. If reliable scoring is unavailable, explain the failure and use a voluntary ceremonial draw; no fabricated results and no QR workaround.

## Prototype gate and tasks
- [ ] FIG-01 — Choose one creature/base style and one tag; encode a harmless test HTTPS URL before installing it.
- [ ] FIG-02 — Test tag bare, behind proposed cover, then in the fully painted/glued prop on the intended shelf. Keep access reversible.
- [ ] FIG-03 — Host estimates 95% iPhone / 5% Android: prioritize two different supported iPhone generations plus one NFC-capable Android, with ordinary cases. Test background URL reading with the writing app closed; demonstrate correct antenna position and ensure an unfamiliar guest can scan while holding a drink. No requirement to lift the figure. See the phone-feasibility document for troubleshooting.
- [ ] FIG-04 — Try 10 consecutive approaches per phone as a practical sample target. Record success/time, case, device and position. This small test does not certify every guest’s phone.
- [ ] FIG-05 — Resolve site domain and test name/selfie signup, assigned puzzle and earned Favor, duplicate completion, second entity, correct player recovery and assisted completion. A plain URL test alone does not validate scoring.
- [ ] FIG-06 — Build the remaining figures, assign unique URLs and private helper IDs, test each on its actual display surface, then permanently lock each tested production tag using the programming checklist. Verify read-only status and guest scanning before sealing; locking is irreversible and does not prevent copying a URL.

No full-set fabrication before the first mounted prototype works reliably. No entity QR fallback may appear through a website screen, printed sign or alternate task document. Partiful and Summons invitation QRs are explicitly allowed by the current game brief.
