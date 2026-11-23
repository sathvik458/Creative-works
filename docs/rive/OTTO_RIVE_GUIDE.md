# Building Otto in Rive

Otto is a cheerful grandpa: bald and shiny on top, fluffy white hair at the sides, bushy brows, a big mustache, a round rosy nose, smiling eyes and round glasses. He uses **Tomo's rig**, so he has the same arms, the same five outfits, the same shirt label and the same view model properties. One app component drives all three characters.

Build Tomo first, or at least read `TOMO_RIVE_GUIDE.md` (and the Yap guide it points to). This guide only lists what is different. The motion reference is `otto-character-studio.html`.

## Step 1: Import the art

1. New file. Name the artboard **`Otto`** and set it to **400 × 480**.
2. Drag `otto-character.svg` onto it.
3. The hierarchy is Tomo's, with a different face and head:

```
Otto
├─ Body
│  ├─ Torso, Neck, Collar
│  ├─ Outfits ─ Outfit_Casual (cardigan + bow tie), Outfit_Police, Outfit_Station, Outfit_Cafe, Outfit_Shop
│  ├─ Label ─ (patch rectangle), Label_Text
│  ├─ Head
│  │  ├─ Hair_Back (side clouds), Ear_L, Ear_R, Head_Skin (with the bald shine and forehead lines)
│  │  ├─ Face ─ Cheeks, Smile_Lines,
│  │  │         Eye_L/Eye_R ─ Eye_*_Lines, Eye_*_Open ─ Iris_*, Eye_*_Happy
│  │  │         Brow_L, Brow_R, Mouth (13 mouths), Mustache, Nose
│  │  ├─ Hair_Front (temple curls), Glasses, Hair_Tuft (one curly wisp)
│  │  ├─ Cap_Police, Cap_Station
│  │  └─ Sweat
│  ├─ Arm_L, Arm_R (same as Tomo)
├─ Listen_Waves, Think_Dots, Stars
```

What changed from Tomo:
- **No `Freckles`.**
- **Eyes have no whites.** `Eye_*_Open` holds only the dark `Iris_*`. The new `Eye_*_Lines` (lower-lid smile line and crow's feet) stays visible in every state, including blinks and happy eyes.
- **`Mustache`** sits over the top of the mouth, and **`Nose`** sits over the mustache. Keep that order.
- **`Glasses` are on by default** and drawn above `Hair_Front`, so the arms of the glasses cross the hair.
- The **`Mouth`** group is a little lower (y 57 in `Face`) so the mustache covers its top edge.

4. **Glasses lenses** are SVG circles with a 16% white fill. If they import as solid white, set the fill opacity back to 16%.
5. **Shirt label text:** same as Tomo (add a Rive Text if `Label_Text` doesn't import). Otto's casual cardigan has no label, so the text is empty by default.

## Step 2: Arms with IK

Exactly as Tomo: same bone lengths (66 and 62), same pivots, same hand-target poses.

## Step 3: View model `Otto`

The same twelve properties as Tomo (`mouth`, `talking`, `listening`, `thinking`, `correct`, `wrong`, `outfit`, `shirtLabel`, `shirtColor`, `skinTone`, `hairColor`, `glasses`). Only the defaults and one binding differ:

| Property | Default | Notes |
| --- | --- | --- |
| `shirtColor` | #D9A441 (mustard) | Same bindings as Tomo: `Torso`, `Sleeve_*`, `Fore_Sleeve_*`. The cardigan has no hood roll. |
| `hairColor` | #F1EDE6 (white) | Bind `Hair_Back`, `Hair_Front`, `Hair_Tuft`, both `Brow_*` (strokes) **and the `Mustache` fill** (its first path). |
| `glasses` | true | `Glasses` opacity = `glasses`. |
| `shirtLabel` | "" (empty) | Bound to the label text, as for Tomo. |

The `Nose` is a skin shape with a pink tint on top, so binding its first ellipse to `skinTone` is enough. The tint and the shading are fixed colours at low opacity.

## Step 4: Timelines

Use Tomo's timelines with the same names, lengths and hand poses. Then make these changes.

**The mustache.** This is Otto's signature, so it moves with almost everything:

| Timeline | Mustache keys |
| --- | --- |
| `mouth_0` … `mouth_8` | y = −2.2 × openness. Openness per shape is 0, 0.05, 0.35, 0.6, 1, 0.6, 0.3, 0.35, 0.55, so `mouth_4` is y −2.2 and `mouth_1` is y −0.1. |
| `talk` | rotation ±1.5°, a 0.7 s wiggle (two cycles per loop) |
| `grin` and `correct` | y −2.5, scale X 1.05 (it lifts and widens when he laughs) |
| `wrong` | y +1.5, scale X 0.97 while `Mouth_Oops` shows (it droops), back by 1090 ms |

The mustache's y comes from the mouth timelines and its rotation comes from `talk`. They are different properties, so the layers don't fight.

**The idle chuckle.** `grin` (1.2 s) is Otto's laugh. On top of Tomo's happy eyes and `Mouth_Happy`:
- `Head` y lifts 3 px and back down (one arc).
- `Body` y bounces 0 → −2.2 → 0 five times. The bounces are biggest in the middle of the clip. Read the prototype's `chuckle` lines for the exact curve.

**Eyes.** `blink` scales `Eye_*_Open` Y to 0.1 and back, exactly like Tomo. Never key `Eye_*_Lines`. The happy eyes are a dark arc, so the smile lines underneath stay readable.

**Outfits.** Use the same `outfit_0` … `outfit_4` table as Tomo, with one change. In `outfit_0` casual, the label patch has opacity 0 and the label text is white. The text is empty unless the app sends one.

**Voice.** This isn't part of Rive, but it matters for the character: the app should use a lower, slower voice for Otto (rate about 0.9). The prototype uses pitch 0.82 with the browser voice.

## Step 5: State machine `Main`

Same five layers as Tomo: Mouth, Body, Blink, Ambient and Outfit.

## Step 6: Export

1. Compare every state with `otto-character-studio.html`. Check the mustache when he talks, grins and says "oops".
2. Export to **`public/rive/otto.riv`** and open `/otto` in the app. Until the file exists, the page shows a still image of casual Otto.

## With Claude Code and the Rive MCP connection

Same as Tomo. Import the SVG, fix the label text and lens opacity by hand, then paste `OTTO_MCP_PROMPT.md`. If you already built `tomo.riv`, it's often quicker to copy Tomo's timelines into Otto's file and add the mustache keys. The layer names are the same, except for the face parts listed above.
