# Prompt for Claude Code + Rive MCP

Use this after the SVG is imported into the `Yap` artboard (guide, step 1) and the Rive desktop app is open with that file. Run Claude Code from the app repo so it can read the guide.

---

You are connected to the Rive editor through MCP. The open file has an artboard named `Yap` that contains the imported mascot art. Your job is to add the view model, timelines and state machine described in `docs/rive/RIVE_BUILD_GUIDE.md` (steps 2, 3 and 4). Read that file first. It is the specification, and the timings in it come from a working prototype.

Rules:
1. **Do not rename, move, delete or redraw any art layer.** Only add a view model, timelines, keyframes, a state machine and bindings. The app finds layers and properties by their exact names.
2. **Use view model properties, not state machine inputs.** Inputs are deprecated in Rive's runtimes.
3. **Work in this order, and stop after each step:** view model → `mouth_0`…`mouth_8` and `smile` → `idle`, `ambient`, `blink`, `grin` → `talk`, `listening`, `thinking` → `correct`, `wrong` → state machine `Main`, layers 1 to 4. After each step, list what you created and anything you could not do, then wait for me to say "continue".
4. **Before keyframing,** query the hierarchy and confirm that every layer named in the guide exists. If one is missing or named differently, tell me instead of guessing.
5. **Values in the guide are offsets from the imported pose.** Read each layer's current position first, then add the offset.
6. **If a tool call fails or a feature isn't available through MCP,** say which step and why, skip it, and carry on. I will do that part by hand.

When you finish, summarise:
- the view model properties and their types
- every timeline with its duration and loop setting
- the state machine layers in order, with their states and transition conditions
- anything that differs from the guide.
