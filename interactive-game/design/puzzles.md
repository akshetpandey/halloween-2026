# Hollow Court — selected puzzle families

Status: Finalized family selection for design and prototyping, September 4, 2026. **Fourteen families are approved. Unbroken Sigil is provisionally approved pending a satisfying real-iPhone touch implementation.** The first website rehearsal is implemented; its entity pairings remain rehearsal choices. The host’s [September 9 phone-first feedback and implemented revision](puzzle-revision-2026-09-09.md) supersede the initial difficulty/UI defaults below, including lantern move counts, seal size and constellation interaction. This selection follows the iterative review in [Interactive Succession Design](chatgpt-conversation://6a9af574-7854-83ea-980a-a9b43437c385).

## Design contract

- Design puzzle mechanics independently of entity identities. Assign one recognizable family to each entity only after the mechanics and physical roster are reviewed.
- Generate each instance deterministically from the stable combination **game + player + entity**. Persist the resulting assignment so reloads, recovery and retries always return the same instance rather than rerolling it.
- Puzzle correctness may depend only on deterministic code, HTML, CSS, SVG and preauthored assets whose relevant properties are known and validated. Generative imagery may decorate an encounter, but it must never carry information needed to infer or verify the answer.
- Use no hints. Tune the base puzzle so most players solve it in **20–45 seconds** and nearly everyone finishes in **under 90 seconds**.
- Allow unlimited retries. Failure may trigger a short theatrical reaction, but never removes Favor, changes the answer, adds a timer, locks the player out or otherwise punishes experimentation.
- Keep interactions legible while standing at a party: large touch targets, little typing, no sound dependency, no flashing, no color-only clues, no phone-motion requirement and no precision gesture without a forgiving alternative.
- Every generated instance must have complete rules, at least one solution and exactly one intended answer or terminal state. Validate logic, paths, transforms, combinations and graph properties before the instance can be served.

The fifteen families deliberately span deduction, pattern recognition, ordering, visual memory, perception, pathfinding, transformation, induction, spatial relationships, combination, assembly, state manipulation, motion tracking, route tracing and graph rearrangement.

## Selected fifteen

### 1 — Three Witnesses

**Status:** Approved. **Challenge:** deductive truth/lie logic. **Interaction:** choose one answer.

Three witnesses make short statements about a hidden object or location; a rule such as “exactly one speaks truth” makes one answer possible. Construct the answer and truth pattern first, enumerate every candidate, and serve only concise variants with a unique solution. On a wrong answer, let the witnesses react and allow another choice against the same statements.

### 2 — Missing Sigil

**Status:** Approved. **Challenge:** visual matrix completion. **Interaction:** choose the missing symbol.

A small occult matrix combines two simple dimensions such as shape × fill, orientation × count or row rule × column rule. Generate the grid from explicit SVG properties, remove one cell, and verify that exactly one option completes it. A wrong choice briefly disturbs the matrix, then leaves the same grid available.

### 3 — The Procession

**Status:** Approved. **Challenge:** constraint and order logic. **Interaction:** drag items into order, with tap-to-slot support.

Four or five figures must be placed using short before, after, beside and end-position clues. Generate a hidden permutation, add only clues that produce one order, and confirm uniqueness by enumerating all permutations. Use large slots and forgiving movement. An incorrect submission keeps the same procession and lets the guest rearrange it.

### 4 — Brief Vision

**Status:** Approved. **Challenge:** short-term memory of a static arrangement. **Interaction:** observe, then answer.

Show five to eight code-rendered symbols for a few seconds, hide them, and only then ask a focused question such as which mark stood beside the eye or which appeared twice. A wrong answer gives a brief thematic response and a **Look Again** action that replays the exact same scene for the same duration; retries never generate a new scene.

### 5 — False Reflection

**Status:** Approved. **Challenge:** visual perception. **Interaction:** tap the discrepancy.

Show a geometric sigil beside what claims to be its reflection, but alter exactly one component. Build the source from SVG primitives, reflect it mathematically, then apply one controlled mutation so the error is objective. Keep this family to error spotting rather than asking the player to perform the transform. A wrong tap ripples the mirror and permits another tap on the same pair.

### 6 — Path Through Thorns

**Status:** Approved. **Challenge:** constrained pathfinding. **Interaction:** trace a route or tap successive nodes.

Find a route through a small vine or thorn map while obeying one clear condition, such as crossing exactly two marked thorns or visiting a required point. Generate and enumerate routes to guarantee one legal solution. Use wide paths and node snapping rather than precision maze tracing. A failed route clears while preserving the same map and rule.

### 7 — Turning Wheel

**Status:** Approved. **Challenge:** reason through a spatial transformation. **Interaction:** choose the transformed result.

A wheel of six to eight marks undergoes one or two stated operations, such as rotating two positions clockwise and changing dark marks to light. Render the wheel and answer choices from deterministic SVG transforms and verify one exact result. The player reasons about the change rather than manually rotating a lock. A wrong result leaves the same starting wheel and choices available.

### 8 — Rule of Three

**Status:** Approved. **Challenge:** infer a hidden classification rule. **Interaction:** choose the group the Court will accept.

Show a few accepted and refused groups, then ask which candidate obeys the same small rule: for example, first equals last, exactly two marks match, counts increase or types alternate. Draw from a curated rule catalog, generate examples that distinguish the intended rule, and ensure only one candidate qualifies. A wrong offering is refused theatrically, after which the same evidence and choices remain.

### 9 — Bind the Constellation

**Status:** Approved. **Challenge:** spatial relationships. **Interaction:** draw connections between points.

The player links stars or sigils using relational instructions such as nearest moon, then nearest thorn, then return to the eye. Generate coordinates and labels in SVG, calculate the relationships, reject ties or ambiguity, and snap strokes to generous point targets. Incorrect connections can be undone or cleared without changing the constellation.

### 10 — The Offering

**Status:** Approved. **Challenge:** a small unique combination problem. **Interaction:** select objects.

Choose a required number of symbolic offerings whose values or visible marks meet a target. Generate the solution first and enumerate all permitted subsets so only one combination works; keep arithmetic small and represent values visually as well as textually. A rejected selection remains editable against the same offering set.

### 11 — Broken Seal

**Status:** Approved. **Challenge:** spatial assembly. **Interaction:** reassemble pieces by dragging and/or rotating.

A geometric SVG seal is split into four pieces initially, with room to test up to six. Prefer constrained slots, limited rotations and generous snapping over arbitrary free placement; the source geometry guarantees an exact fit. A reset restores the same deterministic scatter and orientation, and failed placements never replace the seal.

### 12 — The Lanterns

**Status:** Approved. **Challenge:** state manipulation. **Interaction:** toggle lights.

A compact Lights Out-style board asks the guest to wake every lantern; tapping one changes itself and a clearly demonstrated set of neighbors. Generate states only one to three moves from solved, verify solvability and show state without relying on color alone. Provide a reset to the same initial state, and allow free experimentation with no attempt limit.

### 13 — Hidden Token

**Status:** Approved. **Challenge:** visual motion tracking. **Interaction:** follow a shuffled object, then choose.

Reveal a token beneath one of three containers, then animate four or five deterministic swaps using CSS or SVG transforms. A wrong guess produces a short reaction and replays the **same token position and same shuffle sequence**; it never quietly changes the answer. Keep motion smooth, readable and independent of audio.

### 14 — Unbroken Sigil

**Status:** **Provisionally approved pending good touch implementation.** **Challenge:** Euler-style route logic. **Interaction:** trace one continuous stroke.

Trace every edge of a small connected ritual glyph exactly once without lifting. Generate only graphs with an appropriate Euler path, normally five to seven edges, and mark start/end points when needed. The touch implementation must use large nodes, forgiving edge capture, clear progress and fair handling when a finger obscures the line. Repeating an edge may flash and reset the trace, but always on the same graph. Replace this family from the backup pool if real-device testing does not feel satisfying.

### 15 — Untangle the Threads

**Status:** Approved. **Challenge:** spatial rearrangement. **Interaction:** drag nodes.

Move four or a few more stones until their connecting cords or roots no longer cross. Generate a planar graph from a known clean layout, shuffle only its vertex positions, and complete automatically when intersection count reaches zero. Use generous drag targets and a reset that restores the same shuffled layout.

## Distinction guidelines

### Missing Sigil versus Rule of Three

**Missing Sigil** is matrix completion: the guest discovers how properties change across rows and columns and supplies a missing cell. It should look like an occult grid. **Rule of Three** is classification/induction: the guest studies accepted and refused examples to learn an entity's strange law, then chooses a new qualifying group. Do not present Rule of Three as a sequence or missing-cell puzzle.

### Brief Vision versus Hidden Token

**Brief Vision** tests memory for a static arrangement that disappears before the question. **Hidden Token** keeps the objects visible and tests continuous tracking through motion. Brief Vision retries replay the same static scene; Hidden Token retries replay the same animated shuffle.

### Path Through Thorns, Bind the Constellation, Unbroken Sigil and Untangle the Threads

These all contain lines, so their mental actions and visual language must stay distinct:

| Family | Mental action | Visual treatment |
|---|---|---|
| Path Through Thorns | Navigate a map under a route constraint | Vines, thorns and gates |
| Bind the Constellation | Infer which points relate, then connect them | Stars and a night sky |
| Unbroken Sigil | Trace every existing edge exactly once | A compact ritual glyph |
| Untangle the Threads | Move nodes until existing connections stop crossing | Cords or roots stretched between stones |

In shorthand: **navigate / connect / trace / rearrange**. Do not let two families share both the same gesture and the same visual treatment.

### False Reflection versus Turning Wheel

**False Reflection** is perceptual error spotting: the transform has already been shown and the player finds the one incorrect element. **Turning Wheel** is predictive spatial reasoning: the player applies stated operations mentally and selects the resulting arrangement. False Reflection should not ask the player to rotate or transform the source.

## Deterministic generation and validation

Conceptually, each family should later support:

```text
generate(game_id, player_id, entity_id, puzzle_version) -> PuzzleInstance
validate(instance, answer_or_state) -> bool
```

The stable game/player/entity combination selects all structural choices, layouts, animation paths and presentation variations. Puzzle versioning prevents later authoring changes from silently changing an in-progress assignment. Persist the instance or canonical seed/version after first issue. As an initial capacity target for 30–60 expected guests, prove that each family/entity can supply at least **100 materially distinct validated instances**, then revise that reserve against the final attendance cap. If the product requires every player at one entity to receive a distinct instance, detect and resolve structural collisions during assignment rather than assuming a hash modulo a small bank is unique.

Before a variant is eligible, automatically check its family-specific invariants: unique logical answer, unique legal route, exact transform, unique subset, solvable toggle state, unambiguous nearest-neighbor relationships, valid Euler graph, known seal fit or planar untangled target. Also manually playtest readability, touch comfort and the 20–45 / under-90-second timing goals on the supported phones.

Store the puzzle family/version, canonical seed or state, allowed inputs, solution/terminal condition, difficulty estimate and structural fingerprint. Keep unsolved answers and hidden state off guest-delivered data wherever possible. Cosmetics alone do not make two instances meaningfully different.

## Backup and deprioritized pool

These concepts remain available if a selected family, especially Unbroken Sigil, fails prototyping. They are not part of the active fifteen.

| Candidate | Mechanic | Why it is a backup |
|---|---|---|
| Turning Lock | Rotate concentric symbol rings to align a stated vertical combination | Attractive and code-renderable, but its solution communication was not yet intuitive enough |
| Divide the Offerings | Split weighted objects evenly between two bowls | Feasible, but too close to The Offering and felt less lively |
| Two-Sided Rune | Rotate/reflect/invert a rune to match a target | Easy to validate, but possibly too easy and overlaps False Reflection/Turning Wheel |
| Sort the Court | Sort sigil cards by a hidden visible property | Tactile only with excellent presentation and overlaps Rule of Three |
| Broken Name | Perform short letter/word transformations | Language-dependent and the first version was unclear |
| The Ferryman | Choose a legal miniature crossing/allocation | Risk of becoming too difficult or text-heavy for the party |
| Whisper Cipher / Offered Alphabet | Decode a very short word with a visible substitution key | Can collapse into transcription rather than a satisfying puzzle |
| Counting Creature | Count only illustrated objects meeting one condition | Correctness and polish would rely too much on asset composition |
| Which One Changed | Find the altered card after a transition | Too close to Brief Vision and dependent on polished visual assets |
| Bell Sequence | Continue a short rhythm | Party noise, muted phones and audio permissions make sound unreliable; a visual-only version remains possible |
| Growing Sigil | Choose the next frame in a visual transformation | Harder to author/generate intuitively and overlaps other pattern families |
| Two Doors | Evaluate tiny conditional rules to choose an opening door | Reliable but risks feeling like programming logic rather than a ritual |
| Missing Cycle | Complete a repeating symbol sequence | Too trivial unless structure changes substantially; Missing Sigil is stronger |
| Word anagram / Word Ladder | Rearrange letters or bridge familiar words | Vocabulary and language dependence; can become party homework |
| Reversible Path | Choose the inverse of a direction sequence | Valid but abstract and less tactile than Path Through Thorns |
| Unequal Offering | Infer an unusual weight from a small balance clue | Sound logic, but overlaps deduction and offering families |
| Little Grid | Complete a small Latin-square symbol grid | Clear but potentially dry or too difficult with multiple blanks |
| Witness Descriptions | Select a figure matching explicit attributes | Likely too easy unless it becomes another deduction puzzle |
| Repair the Sorting Ritual | Fix an explicit order by swapping two items | Likely too easy and overlaps The Procession |
| Shadow Match | Pick a rotated object's silhouette | Asset generation and validation risk |
| Forbidden Pair | Arrange marks so forbidden categories never touch | Overlaps The Procession |

Earlier brainstorming is preserved here as a source of replacement mechanics, not as an instruction to expand beyond fifteen. The next puzzle work is one polished sample and several validated instances per selected family, followed by real-phone playtesting; entity assignment comes afterward.
