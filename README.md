# Language Stories MVP

The app running on **http://localhost:3000** is the only active application in this project. It uses Next.js, React, TypeScript, Tailwind CSS and Zustand, with a mobile-width interface.

## Run locally

```sh
npm ci
npm run ui:dev
```

Open http://localhost:3000/welcome for the matcha-green splash. After three seconds it opens the separate onboarding screen. Existing learners can resume from Home.

## Current frontend

- Splash, onboarding, demo sign-in/sign-up/recovery, language and CEFR/JLPT level setup.
- Home, Stories, story details, branching episode player and authored feedback.
- Speak scenarios, Notebook, flashcards, daily challenges and practice.
- Profile, Settings, reading/audio/accessibility preferences and local learning backup export.
- Original English/Japanese stories, six episodes, original characters and illustrations.
- Matcha-green bottom navigation with filled, shaded icons; mobile layout on larger screens.

Authentication screens are frontend demonstrations. Speak supports typed authored examples and a listening-layout preview; it does not record or evaluate live speech. Browser text-to-speech plays authored dialogue where supported. CEFR/JLPT choices save preferences; available episodes remain the original MVP content.

Progress, notebook entries and preferences persist in browser localStorage. No separate API, Expo server or database is required.

## Project layout

- `src/app`: application routes and shared styling.
- `src/components`: current screens, player and learning controls.
- `src/content`, `src/lib`, `src/store`: schemas, story engine, utilities and local state.
- `content`: canonical story and daily challenge JSON.
- `public`: current artwork, mascot logo, fonts and navigation icons.
- `scripts`: content validation and browser journey checks.
- `docs/ui-preview`: frontend screens, behavior and verification guide.

Enterprise product and system-design documents are maintained separately and are not part of this source submission.

## Verify

```sh
npm run lint
npm run validate
npm test
npm run build
npm run ui:verify
```

Browser verification requires Playwright Chromium installed locally, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` pointing to an installed executable. It uses an isolated browser context and does not alter your normal browser data.

See [screen details](docs/ui-preview/README.md). Retired native apps and voice prototypes are excluded from this repository.
