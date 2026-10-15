# Судоку

TypeScript engine, React/DOM interface, Vite builds, Capacitor Android wrapper, separate Yandex Games package. Kotlin remains the offline generator and regression reference. See [docs/ROADMAP.md](docs/ROADMAP.md) for scope and release gates.

## Version 0.3 — interface redesign

The shipped interface follows the reviewed Brainatee Sudoku screenshots: neutral surfaces, clear 3×3 borders, regular-weight digits, solid muted-blue number keys and four primary tools. Narrow phones use two keypad rows; wider phones use one row when every key remains at least 48px wide. Input mode, redo and checking sit below the keypad. Settings are grouped; home, calendar, statistics, tutorials, dialogs and both themes use the same visual system.

The save format and puzzle bank remain unchanged. A pause-display timing issue is fixed: the timer shows its final active value immediately when paused. Design decisions and acceptance: [docs/UI_REDESIGN.md](docs/UI_REDESIGN.md).

## Version 0.2

Play the web build at https://danilah.github.io/sudoku-doku/.

Two input modes (cell → digit / digit → cells), optional peer-note cleanup with atomic undo, completed-digit markers, in-game settings, sound, larger digits, interactive tutorial, error diagrams and an archive of daily challenges. Ordinary and daily progress are stored independently; schema v1 saves migrate to v2 without losing history. Daily tasks follow the device's local date, use the frozen bank v1 and repeat after 900 dates. Daily and ordinary results have separate totals.

Implementation scope and acceptance: [docs/POLISH_SPEC.md](docs/POLISH_SPEC.md). Automated coverage: 16 core/platform unit tests, 7 web browser scenarios, 2 Yandex SDK scenarios, and the existing Android emulator checks. Screenshots cover small phones, landscape, light/dark themes, larger digits and the daily calendar.

## Web

Node 24 / npm. Exact dependencies are in package-lock.json.

```
npm ci
npm test
npm run verify:bank
npm run build
npm run dev
```

`dist/` is the generic web build; serve over HTTP(S). A loaded game works offline. Offline browser reload is not implemented; Android includes all assets for offline first launch.

## Android

JDK 21, SDK 36 / Build Tools 36.0.0, Gradle 8.14.3.

```
npm ci
npm run android:sync
cd android
./gradlew :app:assembleDebug :app:lintDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. Debug uses only demo ads and does not activate AppMetrica. A small application-owned Capacitor plugin integrates SDKs and serial AtomicFile persistence. Optional screen wake is limited to active gameplay. Build with `-PdisableAds=true` to disable ad initialization/requests; `-PforceNoFill=true` exercises no-fill. Both are debug-only switches.

Production properties: `bannerId`, `interstitialId`, `appMetricaKey`. Release compilation rejects absent/demo IDs. Sign with the owner's existing keystore; never commit passwords/key material. No invented production signing key is configured. Check a signed update preserves data. Complete and host docs/PRIVACY_DRAFT.md and finish docs/STORE_RUSTORE.md. Debug APKs are for testing, not moderation.

## Yandex Games

```
npm run build:yandex
cd dist-yandex
zip -r ../sudoku-yandex.zip .
```

index.html must be at the archive root. Yandex mode loads `/sdk.js`, sends LoadingAPI.ready and gameplay markup, handles pause/resume, uses fullscreen/sticky banners and platform-backed localStorage after SDK initialization. Storage remains localStorage when initialization fails; platform services then stay disabled. This is not platform readiness. Test the package in a platform draft. No fullscreen ads at launch, on Back or inside a party. Platform provisioning/moderation are external release gates.

## Core

Cells are 0..80. Givens are immutable; handwritten notes are separate from solver candidates. Difficulty is the weakest supported technique set completing a puzzle: singles; plus locked candidates; plus naked/hidden pairs. This is a product scale, not universal human difficulty.

Hints include prerequisite eliminations and the next placement. Every step is previewed with an explanation and diagram; application is one undoable action. Incorrect inputs are detected before hint construction. Hint usage remains counted after undo.

A versioned profile snapshot includes the game, notes, undo/redo, settings, ad caps and solved-game records. Writes are serial and atomic; stale revisions are rejected. Corrupt/unsupported saves are not silently erased. Completed games are locked and recorded once by game ID. Best times distinguish applied hints. Uninstall/browser data removal can remove local progress.

## Checks

- `npm test`: input/history, persistence failure, timer and frequency caps.
- `npm run verify:bank`: 900 tasks, exact Kotlin trace match, deduction correctness and independent Python uniqueness validation.
- `npx playwright test`: browser play, restore, hints, pause, completion, statistics, loaded offline gameplay and responsive themes. Screenshots in artifacts/.
- Project workflow: web/Yandex packages, browser tests, Android build/lint and downloadable artifacts.
- Engine workflow: independently compiles/tests the Kotlin reference.

Green CI does not prove ad fill, analytics dashboard delivery, human play quality or store acceptance. Device/platform checks remain required.
