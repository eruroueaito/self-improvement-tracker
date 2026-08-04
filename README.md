# Self Improvement Tracker

A fully open-source, local-first mobile tracker for turning long-term goals into a small next action, timing the work, settling the result, and receiving gentle progress feedback.

The basic MVP contains no account, cloud sync, analytics, advertising, remote assets, or AI calls. Android is packaged with Capacitor; the browser build is a development shell.

## Basic MVP capabilities

- Create and edit goals plus their first executable activity, cadence, rest, context, energy, and reward settings.
- Deterministically Roll up to three actions from local facts.
- Run Flowtime or Countdown sessions, then manually settle and annotate them.
- Maintain an idempotent XP ledger, reversible history, and a non-punitive local companion.
- Export, clear, validate, and re-import the complete local dataset.
- Persist with SQLite on Android and versioned localStorage in the browser development shell.

## Development

Requirements: Node.js 24.14.0 and npm 11.12.1.

```bash
npm install
npm run dev
npm run test:run
npm run build
```

To synchronize and build the Android project after installing Android SDK 36:

```bash
npm run cap:sync
cd android
./gradlew assembleDebug
```

Architecture and product decisions are recorded in `docs/adr/` and the accepted MVP specification is in `docs/superpowers/specs/2026-08-04-basic-mvp-design.md`.

The repository has passed TypeScript, Vitest, Playwright, Vite build, Capacitor sync, and clean Ubuntu CI assembly of a verified debug APK. Installation and native plugin smoke evidence still require a ready API 33+ emulator or physical Android device.
