# Archived source — NFC Figurine Design

Received from the host on September 8, 2026; session `6a9a0ee4-64fc-83ea-b173-952682988b44`. This is historical source text, not current instructions. Its statement that it was not saved describes the source chat; this copy is now preserved in the repository. Ten-entity counts, scan-only scoring, broad no-QR wording and old prices are superseded or dated. See the [reconciliation](../handoff-2026-09-08-nfc-reconciliation.md) before using it.

---

## Final handoff — NFC woodland figurines

**This handoff has not been saved to the local repository.** In this chat I cannot inspect or modify the local `~/workspace/halloween-2026` repository. The prior Work-mode handoff was tasked with updating it, but I cannot verify what it ultimately saved. This captures the decisions and details from this conversation that should be checked against the project.

### Confirmed decisions

- The interactive hunt should use **small woodland-creature/forest-spirit figurines containing concealed NFC tags**.
- **No QR-code fallback.** This was explicitly rejected.
- Guests should interact by holding their phone near a subtle **moon/leaf tap marker** on the figurine, receiving the NFC URL notification, opening the site, and claiming the creature/mark.
- Expected guest phone mix is approximately **95% iPhone / 5% Android**, so the physical interaction should be optimized primarily for modern iPhones while still testing Android.
- NFC tags should contain ordinary **NDEF HTTPS URLs**, requiring no special guest app.
- The host's iPhone can be used to program suitable writable NFC tags using an NFC-writing app.
- Tags should be made **read-only only after** the URL, website and assembled figurine have been tested. Locking/read-only should be treated as irreversible.
- The tag URL should preferably use an opaque permanent ID such as:
  `https://<party-domain>/c/a7fp`
  rather than embedding mutable concepts such as `/raven`.
- Guests cannot normally overwrite a tag merely by touching it with an iPhone. Writing requires an explicit NFC-writing session/app. Read-only locking is nevertheless desirable before the party.
- Figurines remain in place; guests collect digital marks rather than taking them.

### Proposed physical design

Preferred construction is a **purchased figurine mounted on a custom decorative base**, rather than trying to cram the NFC antenna into the animal's body.

The base can look like a miniature shrine: mossy stump, rock, mushroom patch, roots, skull pile, etc. Conceal the NFC antenna approximately **1–2 mm beneath a nonmetallic surface**, with the moon/leaf symbol immediately above it.

Favor approximately **29–40 mm antennas** where the prop permits it. The earlier prototype candidate was a 25 mm NTAG213 disc, but a somewhat larger antenna should make the guest interaction more forgiving.

Avoid near the antenna:

- metallic paint or foil;
- wire armatures;
- magnets;
- metal bases/display surfaces;
- unnecessarily thick resin/clay;
- liquids.

The physical UX should deliberately teach guests where to put the phone. For iPhones, the target should make it natural to bring the **upper portion of the phone** close to the marked location rather than waving the middle of the phone around the creature.

### Proposed creature roster

A working ten-creature set was:

| Creature | Mark/name |
|---|---|
| Raven | Raven |
| Small stag/deer | Antler |
| Owl | Moon |
| Bark/root spirit | Root |
| Moth | Last Leaf |
| Fox | Ember |
| Toad | Well |
| Hedgehog | Thorn |
| Hare | Seed |
| Pale/veiled forest spirit | Veil |

These identities are **proposals**, not fixed requirements. The roster should adapt to good commercially available figurines rather than buying expensive individual pieces merely to satisfy this exact list.

Aesthetic direction: pale woodland spirits, antlered creatures and bark-faced guardians, unified through **bone white, charcoal, moss green and natural woodland materials**. Purchased animal figures can be repainted or rebased to make an otherwise ordinary children's woodland set feel eerie/folk-horror.

### NFC programming workflow

Proposed production process:

1. Buy NTAG213/NTAG215 NFC tags with complete antennas.
2. Create permanent opaque creature IDs in the web application.
3. Encode one prototype with its HTTPS URL using an iPhone NFC-writing app.
4. Test the **bare tag**.
5. Test it beneath the intended covering material.
6. Assemble and paint one complete figurine.
7. Test the completed figurine in its actual display location.
8. Test with NFC-capable iPhones and at least one Android, including ordinary phone cases.
9. Have people unfamiliar with the build try the interaction after only being taught that the moon/leaf symbol means "tap here."
10. Test website signup/player recognition, first claim, duplicate claim, another creature and recovery/assisted scoring.
11. Once all of that works, make the tag permanently/read-only locked.
12. Build and individually test the remaining figurines.
13. Only consider write-locking each production tag **after its final URL and installation have passed testing**.

A useful practical prototype criterion previously proposed was **10 consecutive approaches per test phone**, recording failures or awkward positioning. This isn't certification; it is simply a way to catch a bad physical design before making ten copies.

### Unsupported-phone fallback

Since QR is prohibited, the proposed fallback is **volunteer-assisted scoring**.

A volunteer witnesses the find and credits the appropriate guest through an authenticated helper interface. The helper must not scan the creature through their ordinary player session, because that would credit the helper.

For a guest with no usable phone, a distinct player code/helper-managed identity could be maintained.

This entire helper mechanism remains a **proposal** and needs to be implemented/tested if the digital hunt proceeds.

### Sources already identified

Relevant technical sources from the planning work:

- [Apple Core NFC — adding support for background tag reading](https://developer.apple.com/documentation/corenfc/adding-support-for-background-tag-reading?utm_source=chatgpt.com)
- [Apple Core NFC — NFCNDEFTag API](https://developer.apple.com/documentation/corenfc/nfcndeftag?utm_source=chatgpt.com)
- [NXP NTAG213/215/216 family](https://www.nxp.com/products/NTAG213_215_216?utm_source=chatgpt.com)
- [Seritag NFC tag size guidance](https://learn.seritag.com/learn/using-nfc/nfc-tag-sizes?utm_source=chatgpt.com)
- [Adafruit 25 mm NTAG213 disc — prototype candidate](https://www.adafruit.com/product/4033?utm_source=chatgpt.com)
- [Safari Ltd In the Woods TOOB — previously identified figurine multipack](https://www.safariltd.com/products/toobs-in-the-woods-figurines-685504?utm_source=chatgpt.com)

The Safari set had previously been observed around **$14.99 for 12 figures**, approximately 1.25–3.75" tall. The Adafruit NTAG213 discs had previously been observed at **$2.95 each / $2.66 at 10+**. Treat these as historical observations requiring rechecking before purchase.

### Unfinished work

The final user request before this handoff was to research and document:

- **Amazon links for recommended NFC tags**, preferably suitable NTAG213/NTAG215 tags with ~25–40 mm antennas.
- A specific **iPhone App Store app capable of writing NDEF URLs and permanently locking compatible tags**.
- Amazon figurines that could supply **most of the ten creatures**, preferably inexpensive multipacks plus a few individual purchases.
- A recommended **buy-versus-make roster**: buy ordinary animals where suitable; hand-make only the unusual entities such as the bark/root spirit or veiled forest spirit.
- Current pricing/delivery and revised total budget.
- Updating the NFC figurine, sourcing, budget, task-tracker and decisions documents with those results.

That work was handed to Work mode on September 3, but **its completion and repository state have not been verified here**. Before duplicating research, check whether that Work thread already added the Amazon/app sourcing.

The previously estimated total for ten figurines + NFC tags/spares + simple bases/paint was approximately **$50–85**, but this should be revised once the Amazon shortlist exists.

### Immediate next milestone

The project should **not fabricate all ten yet**. The next physical milestone is one complete creature.

Choose an inexpensive commercial figurine, a ~29–40 mm NTAG213/215 tag, a decorative base and the iPhone-writing app. Create one real creature URL, assemble the entire prop, test it on several iPhones plus Android, and let several people unfamiliar with the design try it.

That experiment determines antenna size, base construction, moon-marker visibility and whether NFC-only is sufficiently reliable before spending time building the full set.

**End of handoff. No further work performed.**