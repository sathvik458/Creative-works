# Building Yap in Rive

This guide turns `yap-character.svg` into `yap.riv`, the animated mascot the app plays. The motion to copy is the prototype page (`yap-mascot-studio.html`): open it next to Rive and match what you see. Every timing below comes from that page.

You can build it by hand in the Rive editor (about a day for someone new to Rive), or let Claude Code build most of it through Rive's MCP connection (see the end of this guide). Either way, do step 1 by hand.

## What you are building

| State | When the app shows it | What Yap does |
| --- | --- | --- |
| Idle | Nothing is happening | Floats and breathes, blinks, glances around; leaves sway; now and then flashes the signature grin from the app icon |
| Talking | Character audio is playing | Mouth follows the speech (9 shapes), gentle bob, right hand gestures |
| Listening | Learner is speaking or typing | Leans in, cups a hand to its "ear", sound waves pulse, brows up |
| Thinking | The answer is being checked | Looks up, hand on chin, thought dots, "hmm" mouth |
| Correct | Answer was right (one-shot, 1.5 s) | Squash, jump, hands up, signature grin, stars burst, a book page flips |
| Wrong | Answer was wrong (one-shot, 1.4 s) | Small flinch and head shake, worried brows, sweat drop, scratches its head, then back to a smile |

The "wrong" reaction is deliberately kind. Yap is surprised, never disappointed, and returns to smiling so the learner wants to try again.

## Before you start

- Install the **Rive desktop app** (Windows or macOS). The browser editor works for building, but the MCP connection only works in the desktop app.
- **Plan:** the free plan is enough to build and test. Check [Rive's pricing page](https://rive.app/pricing) for which plan your team needs to export `.riv` files for a shipped app, because published summaries disagree.
- Have the prototype page open. When unsure how something should feel, copy the page.

## Step 1: Import the art (by hand)

1. Create a new file. Rename the artboard to **`Yap`** and set it to **400 × 420**.
2. Drag `yap-character.svg` onto the artboard. Rive turns it into editable shapes and keeps the groups.
3. Check that the hierarchy matches the list below. Each name is a group in the SVG. The app and the state machine both rely on these names, so do not rename them.

```
Yap
├─ Shadow
├─ Leaves ─ Leaf_1 (Leaf_1_Art), Leaf_2 (Leaf_2_Art)
├─ Book ─ cover, page edges, pages, Page_Flip
├─ Stars ─ Star_1 … Star_6
└─ Rig                      ← moves, squashes and jumps the whole body
   ├─ Sparks ─ Sparks_Green, Sparks_Yellow
   ├─ Listen_Waves ─ Listen_Wave_L, Listen_Wave_R
   ├─ Body ─ Body_Rim, Body_Fill, Body_Gloss
   ├─ Face
   │  ├─ Cheeks
   │  ├─ Eye_L ─ Eye_L_Open, Eye_L_Happy      (same for Eye_R)
   │  ├─ Brow_L, Brow_R
   │  ├─ Mouth ─ Mouth_X, Mouth_A … Mouth_H, Mouth_Smile, Mouth_Happy, Mouth_Oops, Mouth_Hmm
   │  └─ Sweat
   ├─ Hand_L, Hand_R
   └─ Think_Dots ─ Think_Dot_1 … Think_Dot_3
```

4. **Pivots are already set.** Every group's position is its pivot. `Rig` is at the bottom centre of the bubble, each eye at its centre, each hand at its centre, `Page_Flip` at the book's spine. So scaling and rotating behave without moving origins. If a group's origin ended up at the artboard corner after import, move the origin back to the group's position before animating.
5. Hidden layers (brows, waves, sweat, stars, other mouths) import at **opacity 0**. Animations only change opacity, position, rotation and scale. Never delete a hidden layer.

## Step 2: The view model (what the app controls)

The app talks to Rive only through these properties. Create a view model named **`Yap`** with exactly these properties, then set it as the artboard's view model and create a default instance.

| Property | Type | Default | Set by the app when… |
| --- | --- | --- | --- |
| `mouth` | Number | 0 | Every frame while talking: the current mouth shape, 0 to 8 (table in step 5) |
| `talking` | Boolean | false | Character audio starts (true) and ends (false) |
| `listening` | Boolean | false | The learner starts speaking or typing (true) and stops (false) |
| `thinking` | Boolean | false | An answer is submitted (true) and the result arrives (false) |
| `correct` | Trigger | | The answer was right |
| `wrong` | Trigger | | The answer was wrong |
| `lookX` | Number | 0 | Optional. -1 (left) to 1 (right): where the eyes look |
| `lookY` | Number | 0 | Optional. -1 (up) to 1 (down) |

State machine inputs are deprecated in Rive's current runtimes, so use **view model properties**, not inputs.

## Step 3: Timelines

Create these timelines on the `Yap` artboard. Values are changes from the imported pose. "Rest" means the imported position. Use cubic ease in and out unless noted.

**`idle`** (loop, 3.0 s)
- `Rig`: y 0 → −4 → 0. Scale X 1 → 1.012 → 1 and scale Y 1 → 0.988 → 1, a quarter-cycle behind the float, so it breathes.

**`ambient`** (loop, 4.8 s)
- `Leaf_1`: rotation 0 → 4° → 0 → −4° → 0. `Leaf_2`: 0 → −5° → 0 → 5° → 0, offset by about a third of the loop.
- `Sparks_Green` and `Sparks_Yellow`: rotation ±5°, out of step with each other.

**`blink`** (one-shot, 0.16 s)
- `Eye_L_Open` and `Eye_R_Open`: scale Y 1 → 0.1 (0.08 s) → 1.

**`grin`** (one-shot, 1.2 s): the signature face from the app icon
- `Eye_L_Open` and `Eye_R_Open` opacity 0, `Eye_L_Happy` and `Eye_R_Happy` opacity 1, for the whole 1.2 s.
- `Mouth_Smile` 0, `Mouth_Happy` 1 for the whole 1.2 s.
- `Rig`: scale Y 1 → 0.965 → 1, scale X 1 → 1.025 → 1.

**`talk`** (loop, 1.2 s)
- `Rig`: rotation −1.5° → 1.5° → −1.5°.
- `Hand_R`: move to rest + (6, −16), rotation −14°. During the loop add ±4 px of y and ±8° of rotation, so the hand gestures as it speaks.

**`listening`** (loop, 1.85 s)
- `Rig`: x −3, rotation −5°, with a nod of ±1.6° and a y lift of up to −2.5 at the top of each cycle.
- `Brow_L` and `Brow_R`: opacity 1, y −5. `Brow_L` rotation −7°, `Brow_R` +7°.
- `Listen_Waves`: opacity 1. `Listen_Wave_L` and `Listen_Wave_R`: scale 1 → 1.14 → 1, twice per loop, drifting 4 px outward.
- `Hand_R`: rest + (52, −126), rotation −24°. This is the hand cupped beside its "ear".
- `Eye_L_Open` and `Eye_R_Open`: +2.75, +1.8, looking down towards the answer box. Skip this if you bind `lookX`/`lookY` (step 6).
- `Sparks`: opacity 0.3.
- `Mouth_Smile` 0, `Mouth_X` 1. This is a quiet, attentive mouth.

**`thinking`** (loop, 1.96 s)
- `Rig`: rotation 4° ± 1.2°.
- `Brow_R`: opacity 1, y −2, rotation −12°. `Brow_L` stays hidden, so only one brow rises.
- `Eye_L_Open` and `Eye_R_Open`: −3, −3.4, looking up and to the left.
- `Mouth_Smile` 0, `Mouth_Hmm` 1.
- `Hand_L`: rest + (58, −36), rotation 20°, tapping (y −2.5) about twice a second, as if on its chin.
- `Think_Dot_1`, `_2` and `_3`: opacity 0.25 → 1 → 0.25, scale 0.85 → 1.05, y 0 → −3, each 0.28 s after the previous one.
- `Sparks`: opacity 0.3.

**`correct`** (one-shot, 1.5 s)

| Time (ms) | 0 | 120 | 270 | 450 | 480 | 690 | 795 | 840 | 960 | 1080 | 1170 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Rig` y | 0 | +5 | | −54 | | 0 | | +3 | | 0 | |
| `Rig` scale Y | 1 | 0.86 | 1.10 | | 1.02 | 1.04 | 0.88 | | 1.04 | | 1 |
| `Rig` scale X | 1 | 1.12 | 0.92 | | 0.99 | 0.97 | 1.10 | | 0.98 | | 1 |

- After landing (840–1440 ms): `Rig` rotation wiggles ±4°, fading out.
- Whole duration: happy eyes on, open eyes off, `Mouth_Happy` 1, `Mouth_Smile` 0.
- Hands: by 420 ms, `Hand_L` at rest + (−50, −150) rotated −25° and `Hand_R` at rest + (50, −150) rotated 25°. Wave them ±14° three times, and bring them back by 1500 ms.
- `Page_Flip` (450–1200 ms): opacity 1, scale X 1 → −1, y lifts −6 at the midpoint, then opacity 0. The page turns from right to left over the spine.
- `Star_1` … `Star_6` (150–1275 ms, each 40 ms after the previous): opacity 1, scale 0 → 1.2 → 0.9 → 0, rotation 0 → 140°, drifting 12% further from the centre.
- `Book`: scale Y 0.94 at 780 ms (it squashes under the landing), back to 1 by 930 ms.
- `Shadow`: scale 0.6 and opacity 0.55 at the top of the jump (450 ms), back to 1 on landing.
- `Sparks`: scale 1.25 at 750 ms.

**`wrong`** (one-shot, 1.4 s)
- `Rig` flinch: scale Y 0.94 and y +3 at 110 ms, back by 280 ms.
- `Rig` head shake: from 140 ms to 980 ms, rotation ±7°, three full shakes, fading out.
- `Brow_L` (−14°) and `Brow_R` (+14°): opacity 1 from 85 ms to 1120 ms, fade out by 1330 ms. The inner ends tilt up, which reads as worried, not angry.
- `Mouth_Oops` 1 and `Mouth_Smile` 0 until 1090 ms, then back to the smile.
- `Sweat`: opacity 1 at 225 ms, slides y +14 by 1190 ms, fades out 1090–1290 ms.
- Eyes: −1.5, +1.6 (looking down) until 980 ms.
- `Hand_R`: to rest + (18, −200) rotated 28° by 170 ms, so it rests on top of its head. Scratch with ±12° rotation and ±2 px of y about 2.5 times a second, then return by 1330 ms.
- `Sparks`: opacity 0.2.

**`mouth_0` … `mouth_8` and `smile`** (one frame each)
- `mouth_k` sets the matching mouth layer to 1 and every other `Mouth_*` layer to 0. `mouth_0` shows `Mouth_X`, `mouth_1` shows `Mouth_A`, and so on to `mouth_8`, which shows `Mouth_H`.
- `smile` shows `Mouth_Smile` only.

## Step 4: The state machine

Create a state machine named **`Main`** with four layers, in this order. When two layers animate the same property, the later layer wins, which is why the order matters.

**Layer 1: Mouth**
- Entry → `smile`.
- Any State → `smile` when `talking` is false.
- Any State → `mouth_k` when `talking` is true **and** `mouth` equals k, for each k from 0 to 8.
- Every transition has duration 0. Leave "transition to self" off.

**Layer 2: Body**
- Entry → `idle`.
- `idle` ↔ `listening` on `listening` true / false. `idle` ↔ `thinking` on `thinking` true / false. `idle` ↔ `talking` on `talking` true / false. Use 0.25 s cubic transitions; they give the same easing as the prototype.
- Any State → `correct` on the `correct` trigger (0.08 s), then `correct` → `idle` at exit time 100%.
- Any State → `wrong` on the `wrong` trigger (0.08 s), then `wrong` → `idle` at exit time 100%.
- Rule: the `idle` and `talk` timelines must **not** animate any `Mouth_*` layer, or they would override the lip sync. The other timelines may, because they never play while Yap is talking.

**Layer 3: Blink**
- `wait_a` (an empty 3.2 s timeline) → `blink` → `wait_b` (4.6 s) → `blink` → back to `wait_a`, using exit time 100% on each transition.

**Layer 4: Ambient**
- Plays `ambient` (leaves and sparks) on loop.
- Add a second chain on this layer, the signature grin: `rest` (an empty 9 s timeline) → `grin` → back to `rest`. Only allow `rest` → `grin` when `talking`, `listening` and `thinking` are all false.

## Step 5: Lip sync numbers

Rive only needs a number. The app works it out from the audio and sets `mouth` every frame. These are the [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) mouth shapes.

| `mouth` | Layer | Sounds | Rhubarb shape |
| --- | --- | --- | --- |
| 0 | `Mouth_X` | silence, rest | X |
| 1 | `Mouth_A` | M, B, P (closed lips) | A |
| 2 | `Mouth_B` | K, S, T, EE, most consonants | B |
| 3 | `Mouth_C` | EH, AE | C |
| 4 | `Mouth_D` | AA (wide open) | D |
| 5 | `Mouth_E` | AO, ER (rounded) | E |
| 6 | `Mouth_F` | OO, W (puckered) | F |
| 7 | `Mouth_G` | F, V (teeth on lip) | G |
| 8 | `Mouth_H` | L, TH (tongue up) | H |

Where the timings come from (the app code handles both):

- **Recorded or generated audio files** (story lines): run Rhubarb once per line when the audio is produced, and store the JSON next to the clip. For example: `rhubarb -f json --dialogFile line.txt -o line.json line.wav`. For Japanese, add `-r phonetic`.
- **Azure text-to-speech** (live replies): Azure sends viseme events, each an ID from 0 to 21 plus an audio time. `src/lib/lipsync.ts` maps them to the 0–8 numbers above.
- **Browser speech** (today's MVP): the browser gives no timings, so the app estimates them from the text. It looks fine, but it is approximate.

## Step 6 (optional): Eye direction

Bind `Eye_L_Open` and `Eye_R_Open` X position to `lookX × 5` and Y position to `lookY × 4`, using a converter. If you do, remove the eye offsets from the `listening`, `thinking` and `wrong` timelines, and the app sets `lookX`/`lookY` instead (listening 0.55, 0.45; thinking −0.6, −0.85; wrong −0.3, 0.4). Skip this step for the first version.

## Step 7: Test, then export

1. In the editor, play the state machine `Main`. Flip the view model properties and fire the triggers from the data panel. Compare each state with the prototype page.
2. Check the file size: aim for under 150 KB.
3. Export for runtime (`.riv`) and save it as **`public/rive/yap.riv`** in the app repo. The app's `YapCharacter` component picks it up automatically. Until that file exists, it shows the still image `public/rive/yap.svg`.
4. Open `/yap` in the app (the preview page in this branch) and check every state against the prototype.

## Building it with Claude Code and Rive's MCP connection

Rive's desktop editor runs an MCP server that lets Claude Code create view models, timelines, keyframes and state machines inside the open file. It can do steps 2 to 4 from this guide. Importing the SVG (step 1) is still manual.

1. Open the Rive desktop app, open your file with the imported `Yap` artboard, and keep it open.
2. In a terminal inside the app repo, run:
   ```bash
   claude mcp add --transport http rive http://127.0.0.1:9791/mcp
   claude
   ```
3. Paste the prompt from `RIVE_MCP_PROMPT.md`. Follow Rive's [MCP page](https://rive.app/docs/editor/ai/mcp) for how the editor applies the changes.
4. Review the result in the editor before exporting: play every state and compare it with the prototype. AI tools can get eases and timings slightly off, and those are fastest to fix by hand.

The MCP connection is new; Rive's docs say its feature list is still growing. If a step fails, do that step by hand from this guide and let Claude continue with the next one.
