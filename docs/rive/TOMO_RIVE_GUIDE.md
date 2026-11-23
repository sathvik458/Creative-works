# Building Tomo in Rive

Tomo is a friendly human guide who can play any role: casual, police, station head, café, shop. What his shirt says is typed by the app. This guide turns `tomo-character.svg` into `tomo.riv`. The motion to copy is the prototype page `tomo-character-studio.html`; every value below comes from it.

Tomo follows the same rules as Yap. Read `RIVE_BUILD_GUIDE.md` (Yap) first: the lip-sync mouths, the blink and grin layers, and the "later layers win" rule work identically. This guide covers what is different: a human rig with arms, outfits, recolouring and a text label.

## Step 1: Import the art (by hand)

1. New file. Name the artboard **`Tomo`** and set it to **400 × 480**.
2. Drag `tomo-character.svg` onto it.
3. Check the hierarchy. The app and state machine use these names:

```
Tomo
├─ Body                         ← breathing, sway, the "yay" hop (pivot: bottom-centre of torso)
│  ├─ Torso, Neck, Collar
│  ├─ Outfits ─ Outfit_Casual, Outfit_Police, Outfit_Station, Outfit_Cafe, Outfit_Shop
│  ├─ Label ─ (patch rectangle), Label_Text
│  ├─ Head                      ← tilts and nods (pivot: top of the neck)
│  │  ├─ Hair_Back, Ear_L, Ear_R, Head_Skin
│  │  ├─ Face ─ Cheeks, Freckles, Eye_L/Eye_R (…_Open with Iris_*, …_Happy), Brow_L, Brow_R, Nose, Mouth (13 mouths)
│  │  ├─ Glasses, Hair_Front, Hair_Tuft
│  │  ├─ Cap_Police, Cap_Station
│  │  └─ Sweat
│  ├─ Arm_L ─ Upper_L, Sleeve_L, Forearm_L ─ Fore_Sleeve_L, Hand_L
│  └─ Arm_R ─ (same)
├─ Listen_Waves, Think_Dots, Stars
```

4. Pivots are already set, as in the Yap file. `Arm_*` sits at the shoulder, `Forearm_*` at the elbow, `Hand_*` at the end of the forearm.
5. **Text:** Rive may not import the SVG `<text>` element. If `Label_Text` is missing or not editable, delete it and add a **Rive Text** object inside `Label`, centred at (0, 7.5). Use M PLUS Rounded 1c, weight 800, size 20, centre-aligned, letter spacing 1.2.

## Step 2: Arms with IK

Big-head characters need bent elbows to reach their face, so animate the **hands** and let Rive bend the arms:

1. Convert each arm to two bones: shoulder → elbow (66 px), and elbow → hand (62 px). Bind `Upper_*` and `Sleeve_*` to the first bone, and `Forearm_*`, `Fore_Sleeve_*` and `Hand_*` to the second. Alternatively, keep the groups and rotate them directly (FK). The bones only need to match the pivots.
2. Add an empty node per hand, **`Hand_Target_L`** and **`Hand_Target_R`**, and an **IK constraint** on each forearm bone pointing at its target. Set the elbow to bend outward, away from the body.
3. Every pose below is just a target position. Artboard coordinates:

| Pose | Left hand | Right hand |
| --- | --- | --- |
| Rest | (121, 450) | (279, 450) |
| Talking (gesture) | rest | (306, 396), wobbling ±4 x and ±7 y |
| Listening (hand to ear) | rest | (322, 228) |
| Thinking (hand on chin) | (194, 294), tapping 2.5 px | rest |
| Correct ("yay") | (82, 214) | (318, 214) |
| Wrong (rubs neck) | rest | (292, 266), scratching ±3 px |

## Step 3: View model `Tomo`

The first six properties are the same as Yap's, so the app drives both characters with one component.

| Property | Type | What it does |
| --- | --- | --- |
| `mouth` | Number | Lip-sync shape 0–8 while talking (the Yap guide has the table) |
| `talking`, `listening`, `thinking` | Boolean | The current state |
| `correct`, `wrong` | Trigger | One-shot reactions |
| `outfit` | Number | 0 casual · 1 police · 2 station · 3 café · 4 shop |
| `shirtLabel` | String | What the shirt says |
| `shirtColor` | Color | Torso, sleeves and long sleeves |
| `skinTone` | Color | Face, ears, neck, arms, hands |
| `hairColor` | Color | Hair, tuft and eyebrows |
| `glasses` | Boolean | Shows the glasses |

**Bind the colours:** select every fill listed below and bind its colour to the matching property.
- **`shirtColor`:** the `Torso` fill, both `Sleeve_*`, both `Fore_Sleeve_*`, and the hood roll in `Outfit_Casual`.
- **`skinTone`:** `Head_Skin`, both `Ear_*`, `Neck`, `Upper_*`, the `Forearm_*` arm, and the `Hand_*` palm and thumb.
- **`hairColor`:** `Hair_Back`, `Hair_Front` and the side pieces, `Hair_Tuft`, and the `Brow_*` strokes.

Shading layers are black at low opacity, so they need no binding: they darken any colour correctly.

**Bind the text:** bind the label's Text value to `shirtLabel`. The app sends upper-case text of up to 16 characters. At size 20 about 12 characters fit, so if your Rive version offers a text fit or shrink option, use it. The prototype shrinks long labels such as "STATION HEAD" to fit 116 px.

**Bind glasses:** `Glasses` opacity = `glasses` (true → 1).

## Step 4: Timelines

These are the same names and lengths as Yap's, adapted for a human. Values are offsets from the imported pose.

- **`idle`** (loop, 3 s): `Body` scale Y 1 → 1.01, scale X ±0.006, rotation ±0.8° (slower, about 7 s, if you make a separate loop). `Head` rotation ±1.2°. `Hair_Tuft` rotation ±4°.
- **`talk`** (loop, 1.2 s): `Head` rotation ±2° with a small dip. Right hand target in the talking pose. `Brow_L` and `Brow_R` y −2.
- **`listening`** (loop, 1.85 s): `Head` rotation −7° with a ±1.8° nod. Brows y −6, `Brow_L` −6°, `Brow_R` +6°. `Iris_L` and `Iris_R` +2.75, +2.25 (looking at the answer box). `Listen_Waves` opacity 1, pulsing scale 1 → 1.12. Right hand target to the ear. `Mouth_Smile` 0, `Mouth_X` 1.
- **`thinking`** (loop, 1.96 s): `Head` rotation 5°. `Brow_R` y −8, rotation −10°. `Brow_L` y +1. Irises −3.3, −3.8 (looking up and left). Left hand target on the chin, tapping. `Mouth_Hmm` 1. `Think_Dot_1`–`3` pulse as in the Yap guide.
- **`correct`** (one-shot, 1.5 s):
  - `Body` y: 0 → +4 (120 ms) → −24 (420 ms) → 0 (690 ms) → +3 (840 ms) → 0 (1050 ms). Scale Y 0.95 at the crouch, 1.04 in the air, 0.95 on landing.
  - Both hand targets to "yay" by 390 ms, pumping ±8 px three times, back by 1500 ms.
  - Happy eyes and `Mouth_Happy` throughout, brows y −3.
  - `Hair_Tuft` rotation −14° (450 ms) → +10° (750 ms) → −5° (1050 ms) → 0.
  - Stars burst as in the Yap guide. `Head` wiggles ±4° after 750 ms.
- **`wrong`** (one-shot, 1.4 s):
  - `Head` shakes ±6° between 140 and 980 ms, fading out.
  - Brows worried: `Brow_L` −14°, `Brow_R` +14°, y −3.
  - `Mouth_Oops` (the "eek" teeth) until 1090 ms, then back to `Mouth_Smile`.
  - `Sweat`: opacity in at 225 ms, slides +14 px, out by 1290 ms.
  - Irises −2.2, +2.25 (looking down).
  - Right hand target to the neck by 170 ms, scratching, back by 1330 ms.
- **`blink`**, **`grin`**, **`mouth_0`…`mouth_8`** and **`smile`**: exactly as in the Yap guide (the eye layers are named `Eye_L_Open`, `Eye_L_Happy` and so on, the same as Yap's).
- **`outfit_0` … `outfit_4`** (one frame each):

| Timeline | Shows | Hides | Label patch | Label text colour |
| --- | --- | --- | --- | --- |
| `outfit_0` casual | `Outfit_Casual`, `Hair_Tuft` | caps, `Fore_Sleeve_*` | opacity 0 (printed on the hoodie) | white |
| `outfit_1` police | `Outfit_Police`, `Cap_Police` | `Hair_Tuft`, `Cap_Station`, `Fore_Sleeve_*` | #11182C | white |
| `outfit_2` station | `Outfit_Station`, `Cap_Station`, `Fore_Sleeve_*` | `Hair_Tuft`, `Cap_Police` | #E8B931 | #2B2340 |
| `outfit_3` café | `Outfit_Cafe`, `Hair_Tuft` | caps, `Fore_Sleeve_*` | opacity 0 (printed on the apron) | #FBF3E6 |
| `outfit_4` shop | `Outfit_Shop`, `Hair_Tuft` | caps, `Fore_Sleeve_*` | white | #35765D |

Do not key the shirt colour in these timelines. It comes only from the `shirtColor` binding, and the app sends each outfit's default colour.

## Step 5: State machine `Main`

These are the same layers as Yap, plus one:

1. **Mouth**, 2. **Body**, 3. **Blink**, 4. **Ambient**: exactly as in the Yap guide.
5. **Outfit:** Entry → `outfit_0`. Any State → `outfit_k` when `outfit` equals k, duration 0.

## Step 6: Export

1. Play every state against the prototype and try all five outfits.
2. Export `tomo.riv` to **`public/rive/tomo.riv`**.
3. Open `/tomo` in the app to check it. Until the file exists, the page shows a still image of casual Tomo.

## With Claude Code and the Rive MCP connection

Same setup as Yap (see the end of the Yap guide). Import the SVG and add the Rive Text by hand, then paste `TOMO_MCP_PROMPT.md`. Set up the bones and IK constraint by hand if the MCP tools can't create them; IK is the step most likely to need a human touch.
