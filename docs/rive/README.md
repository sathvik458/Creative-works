# Rive characters

| Character | Art to import | Motion reference | Build guide | MCP prompt | Export to | Preview |
| --- | --- | --- | --- | --- | --- | --- |
| Yap (mascot, from the app icon) | `yap-character.svg` | `yap-mascot-studio.html` | `RIVE_BUILD_GUIDE.md` | `RIVE_MCP_PROMPT.md` | `public/rive/yap.riv` | `/yap` |
| Tomo (human guide, any role) | `tomo-character.svg` | `tomo-character-studio.html` | `TOMO_RIVE_GUIDE.md` (read the Yap guide first) | `TOMO_MCP_PROMPT.md` | `public/rive/tomo.riv` | `/tomo` |
| Otto (cheerful grandpa, Tomo's rig) | `otto-character.svg` | `otto-character-studio.html` | `OTTO_RIVE_GUIDE.md` (changes from Tomo) | `OTTO_MCP_PROMPT.md` | `public/rive/otto.riv` | `/otto` |

Open the `.html` prototypes in a browser; they are the reference for every movement.

Using them in the app:

```tsx
<YapCharacter mood="listening" />
<TomoCharacter outfit="police" mood="talking" mouthSource={getMouth} reaction={{ kind: "correct", id: 3 }} />
<TomoCharacter outfit="shop" shirtLabel="BOOKSHOP" shirtColor="#594566" glasses />
<OttoCharacter outfit="station" mood="listening" />
```

Each component shows a still image until its `.riv` exists.
