# The hidden witnesses • NFC woodland figurines

**Latest physical proposal:** 10–15 handmade bark spirits with separate moon-covered NFC touchpoints immediately beside/below them. This avoids embedding antennas in the sculptures. See [current build and sourcing plan](06-bark-spirits-and-moon-touchpoints.md); embedded bases below remain an alternative.
Updated September 3, 2026. **Confirmed host direction: no QR fallback.** Buy or make small woodland creatures and conceal an NFC tag in each. Ten figures and the existing scoring/timing are still proposals. No tags/figures ordered, encoded or tested; website not built.

## Recommended physical design
Make each witness a small creature with an integral woodland base. Hide one tag just beneath the top or front of the base, beside the feet, behind a thin nonmetal cover. Add a tiny repeated moon or leaf motif at that spot. The tag is invisible, but a guest who has seen the demonstration knows where to hold the phone. No printed code or exposed sticker.

This is still an embedded figurine: creature, base and concealed tag form one prop. It avoids squeezing a poor-reading tiny tag into a small head, and avoids asking guests to lift or turn over the object. A hollow-bodied creature can instead hide the tag behind its thin back or belly if there is enough flat space for the antenna and an accessible phone approach.

Initial prototype dimensions, not guarantees: creature around 2–4 inches tall; integral base roughly 2–3 inches across; tag approximately 25–30 mm across. Start with a very thin cover, roughly 1–2 mm, and test; no universal material thickness guarantees a read. A larger base is acceptable for an especially small creature.

## Tag requirements
Use a complete passive **13.56 MHz NFC Forum Type 2 NTAG213 or NTAG215 tag with antenna**, formatted with a short NDEF HTTPS URI. It needs no battery. A bare chip or a generic UHF inventory tag is not the same product. Extra memory does not by itself mean better reading or stronger anti-cheat. [NXP tag family](https://www.nxp.com/products/NTAG213_215_216)

A larger usable antenna generally gives a more forgiving phone target than an ultra-mini tag; [Seritag’s size guide](https://learn.seritag.com/learn/using-nfc/nfc-tag-sizes) recommends around 29/30 or 38/40 mm labels for mobile-phone uses. Choose after checking the actual antenna and assembled prop, not package diameter alone. Do not cut the tag to make it fit.

Metal, metallic foil finishes, wire armatures, magnets and nearby liquid can alter performance. Prefer plain resin/plastic/wood around the antenna and nonmetallic paint over the tap spot. Test any material, pigment, glue and shelf in the final configuration. Metal placement calls for an appropriate ferrite-backed/on-metal design and another test; it is not fixed by burying an ordinary tag deeper. [Seritag metal guidance](https://seritag.com/nfc-tags/factory-tag) · [ST touchpoint design paper](https://www.st.com/content/ccc/resource/premium_content/document/group0/aa/8a/4c/68/f4/dc/4e/72/White_paper_NFC_design_considerations_for_an_improved_User_Experience/files/BRWPNFCUX0920.pdf/jcr%3Acontent/translations/en.BRWPNFCUX0920.pdf)

## Buy versus make
**Best value: purchased figurines on crafted bases.** Buy one coordinated set of resin/plastic woodland animals or forest spirits. Give them common bone-white/charcoal finishes with moss-green details if needed. Add a hollow/pocketed base containing the tag; keep it replaceable until the whole system passes. A wooden disk with a recess and a thin cover, or a small hollow plastic pedestal, avoids drilling into purchased solid resin bodies.

**More character: simple handmade spirits.** Use air-dry clay, or sculpt and cure an outer shell before inserting the tag. Distinct shapes—antlers, moth wings, mushroom cap, owl face—matter more than fine detail in dim light. Do not bake an ordinary tag inside polymer clay or pour hot-curing resin around it without a tag-rated process. A post-cure access pocket is the default. No printer or resin-casting equipment is required.

**Aesthetic options:** bark-faced root guardians, small antlered forest creatures, or pale rounded woodland spirits inspired by the atmosphere of Princess Mononoke. These are directions, not licensed-product claims. Tiny 1-inch terrarium ornaments may need bases larger than the figure to accommodate a readable tag.

## Initial sourcing evidence
- [Safari Ltd In the Woods TOOB](https://www.safariltd.com/products/toobs-in-the-woods-figurines-685504): $14.99 listed, 12 animal/insect figures, around 1.25–3.75 inches tall. Good budget shape set; some animals are less eerie, so a unified paint treatment may help. Product and collection pages show inconsistent stock wording; confirm availability/delivery. No claim that these solid figures contain tag cavities.
- [Adafruit NTAG213 disc 4033](https://www.adafruit.com/product/4033): 25 × 0.9 mm; $2.95 individually, $2.66 each for 10+, 56 in stock when checked. A known prototype option, not necessarily the cheapest bulk source. Twelve at the listed quantity rate would be $31.92 before tax/shipping. Do not adopt the vendor’s generic reader-distance claim as a smartphone-in-figurine promise.
- Amazon remains preferred for a coordinated creature multipack and tag pack when exact dimensions, chip type, seller and delivery are verified. No specific Amazon figure/tag pack has been verified in this pass; do not fill the cart with anonymous miniature craft tags based on listing photos.

Allow roughly **$50–$85 total for ten figures, tags/spares and bases/paint** using a modest multipack. This is a provisional replacement for the earlier $25–$50 story-material allowance, not an approved increase. The Safari set plus twelve Adafruit discs is $46.91 before bases/paint/tax/shipping. Handmade detailed figures or premium ornaments can cost more; no need to commit before one sample.

## Proposed creature identities
Keep each visually distinct and map it to a story mark: raven / Raven, little stag / Antler, owl / Moon, bark spirit / Root, moth / Last Leaf, fox / Ember, toad / Well, hedgehog / Thorn, hare / Seed, veiled spirit / Veil. This is a design menu, not a requirement to buy ten individual premium figurines. Adapt names to a good multipack. Well stays outside the bathroom. Objects stay in place; guests collect digital marks, not the figurines. Chocolates remain the take-away gifts.

## Guest experience
Volunteer: “The forest left little witnesses around the house. When you find one, hold your phone near its moon mark, then open the message it offers you. Leave the creature where it lives.”

Phone reads the concealed URL → guest taps notification/unlocks as needed → website joins/recognizes the player → guest claims the mark. No guest app installation. Existing iPhone/Android compatibility limits still apply; removing QR does not make every phone NFC-capable. Link sharing is still possible after a scan; embedding hides the hardware, not the URL.

## Quiet assistance, without QR
Proposed exception: a volunteer witnesses the discovery and records it for the **guest’s player identity** in an authenticated helper view. Do not scan on the helper’s ordinary player session and accidentally credit the helper. For a guest with no usable phone, issue a distinct paper player code and record witnessed finds, reconciling through the same one-point-per-figure rule. A device-sharing flow must keep players separate. This is a proposed operational backup, not a implemented feature or a replacement public scan route.

Offline written finds need a recorded time and clear reconciliation rule. If reliable scoring is unavailable, explain the failure and use a voluntary ceremonial draw; no fabricated results and no QR workaround.

## Prototype gate and tasks
- [ ] FIG-01 — Choose one creature/base style and one tag; encode a harmless test HTTPS URL before installing it.
- [ ] FIG-02 — Test tag bare, behind proposed cover, then in the fully painted/glued prop on the intended shelf. Keep access reversible.
- [ ] FIG-03 — Host estimates 95% iPhone / 5% Android: prioritize two different supported iPhone generations plus one NFC-capable Android, with ordinary cases. Test background URL reading with the writing app closed; demonstrate correct antenna position and ensure an unfamiliar guest can scan while holding a drink. No requirement to lift the figure. See the phone-feasibility document for troubleshooting.
- [ ] FIG-04 — Try 10 consecutive approaches per phone as a practical sample target. Record success/time, case, device and position. This small test does not certify every guest’s phone.
- [ ] FIG-05 — Resolve site domain and test signup, repeated claims, second figure, correct player recovery and assisted claims. A plain URL test alone does not validate scoring.
- [ ] FIG-06 — Build the remaining figures, assign unique URLs and private helper IDs, test each on its actual display surface, and only then consider tag write-locking. Locking can be irreversible and does not prevent copying a URL.

No full-set fabrication before the first mounted prototype works reliably. A rejected QR fallback must not quietly return through a website screen, printed sign or alternate task document.
