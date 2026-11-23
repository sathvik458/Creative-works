# Prompt for Claude Code + Rive MCP (Otto)

Use this after importing `otto-character.svg` into the `Otto` artboard and adding the Rive Text for the shirt label (guide, step 1). Keep the Rive desktop app open with that file, and run Claude Code from the app repo.

---

You are connected to the Rive editor through MCP. The open file has an artboard named `Otto` with the imported character. Build the rig and animation described in `docs/rive/OTTO_RIVE_GUIDE.md`, steps 2 to 5. Otto uses Tomo's rig, so that guide lists only the changes from `docs/rive/TOMO_RIVE_GUIDE.md`, which in turn reuses parts of `docs/rive/RIVE_BUILD_GUIDE.md` (the Yap guide). Read all three first. They are the specification; the values come from a working prototype.

Rules:
1. **Do not rename, move, delete or redraw art layers.** Only add bones, IK constraints and hand targets, a view model, bindings, timelines and a state machine.
2. **Use view model properties, not state machine inputs.**
3. **Work in this order, and stop after each step:**
   1. view model `Otto`
   2. colour, text and glasses bindings (including the `Mustache` fill to `hairColor`)
   3. hand targets and IK (or report that you can't create them)
   4. `mouth_0`…`mouth_8` (with the mustache keys), `smile` and `outfit_0`…`outfit_4`
   5. `idle`, `blink`, `grin` (with the chuckle)
   6. `talk`, `listening`, `thinking`
   7. `correct`, `wrong`
   8. state machine `Main`, layers 1 to 5

   After each step, list what you created and anything you couldn't do, then wait for "continue".
4. **Before keyframing,** query the hierarchy and confirm that every layer named in the guide exists. If one is missing, say so instead of guessing.
5. **Values are offsets from the imported pose,** except hand-target positions, which are artboard coordinates.
6. **Never key the shirt colour in a timeline.** It comes only from the `shirtColor` binding.
7. **If a tool call fails or a feature isn't available through MCP,** name the step, skip it, and carry on.
8. **Never key `Eye_L_Lines` or `Eye_R_Lines`.** They stay visible in every state.

When you finish, summarise:
- the view model properties and bindings
- every timeline with its length and loop setting
- the state machine layers with their states and conditions
- anything that differs from the guide.
