# Restored MVP frontend and complete app flow

This review extends the **original Next.js MVP frontend**. It uses the original story library, story details, full-screen player, story engine, characters, backgrounds, typography, reading aids, feedback and notebook. It does not use the replacement Expo screen layouts. The product remains intended for mobile; this browser preview uses a mobile-width layout, including on larger displays.

Run `npm run ui:dev`, then open **http://localhost:3000/welcome**. No voice API, authentication service or other backend is needed. Retired implementations are excluded from this repository.

## Screens and journeys

| Flow from the supplied infographic | Preview                                                                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing / splash                   | /welcome or /splash, centered logo on matcha green; automatically opens /onboarding after three seconds                                                                                 |
| Sign in / sign up                  | /auth, switchable forms and field validation                                                                                                    |
| Password recovery                  | Forgot password on /auth, explicit unsent-email confirmation                                                                                    |
| Language selection                 | /setup, English or Japanese                                                                                                                     |
| Current level                      | /setup, CEFR A1–C2 or JLPT N5–N1                                                                                                                |
| Complete setup                     | /setup, summary, save preferences, open Home                                                                                                    |
| Home                               | /, greeting, profile menu, resume story, Speak shortcut, recent words/phrases and real local progress                                           |
| Stories                            | /stories, original MVP library and language selector                                                                                            |
| Story details / episodes           | /story/new-in-london and /story/first-week-in-tokyo, original cast and episode lists                                                            |
| Story player                       | Existing /play routes, original full-screen scene, dialogue, choices, feedback, endings, plus line bookmarks                                    |
| Speak                              | /speak, scenario selection, character/context/goal, typed reply, listening-layout preview, authored feedback, retry and phrase saving           |
| Notebook                           | /notebook, original words/phrases/mistakes/known tabs, added bookmarks and editable personal notes, search/filter, add/remove words             |
| Profile                            | /profile, name/email/mobile, language/level, actual local progress and editable preferences                                                     |
| Change password                    | /change-password, validation and explicit preview confirmation                                                                                  |
| Settings                           | /settings, learning and interface preferences, appearance, reminder preference, original audio/reading/text/accessibility controls and sign out |
| Sign out / return                  | Home profile menu or Settings, confirmation, return to welcome, sign in resumes saved learning data                                             |

The four bottom tabs are **Home · Stories · Speak · Notebook**. Profile and Settings are accessed from the Home avatar menu, as in the supplied flow.

## Visual direction

- Keep warm parchment **#FFF7EC** and aubergine **#2B2340**.
- Use botanical teal **#21645C** for primary actions, focus and functional emphasis; soft teal **#E3EEE7** for supporting surfaces.
- Preserve the original rounded M PLUS / Noto typography, card geometry, paper texture, original SVG cast and scene illustrations.
- Reduce lavender/pink interface surfaces; preserve original character clothing and story art rather than recolouring the cast.
- Darken feedback text colours for legibility on their pale semantic backgrounds. Evening appearance and the MVP's existing text-size, contrast and reduced-motion controls can be reviewed in Settings.

## Frontend boundaries

Sign-in, sign-up, password recovery/change and account states are UI demonstrations. No accounts are created, no email is sent, and passwords are never persisted. The preview's personal details and preferences stay in a separate localStorage key; existing MVP learning progress stays in its original store.

Speak uses the MVP's authored mini-scenarios and character assets. Choosing an example shows that example's authored feedback. Typed input is matched only to an authored example; other replies remain ungraded. Voice preview shows the listening layout with **microphone off**. It does not record speech or claim ASR/AI evaluation. Listening to authored dialogue uses the MVP's browser text-to-speech when supported.

The full CEFR/JLPT selection is a preference UI. It does not invent advanced episodes or certify proficiency; the available content remains the original six MVP episodes.

Reminder and interface-language selections are saved preferences. They do not schedule notifications or imply complete Japanese localization. Notes, words, bookmarks, saved phrases, progress, theme and other working local controls persist across reloads.

## Verification

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run ui:verify
```

For an already-installed Chromium, set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. UI_PREVIEW_URL defaults to http://localhost:3000. UI_QA_DIR defaults to /private/tmp/language-stories-restored-ui.

The browser journey checks signup/setup, Home, profile editing, password UI, preferences and theme, the original library/details/player, line bookmarks, note creation/edit/reload, word saving/removal, scenario/listening/feedback/phrase saving, recovery, logout/return and viewport overflow at 360, 390 and 1440 pixels. It rejects runtime errors and persisted preview passwords. No screenshot or simulated voice state establishes native-device or production authentication behaviour.
