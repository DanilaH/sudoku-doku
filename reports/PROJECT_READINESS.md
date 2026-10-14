# Project readiness — 2026-10-15

Working multiplatform test project completed. Production publication is pending external configuration and human/platform checks.

Tested code commit: b94f359e87fde58fb520406766c4bc8565442530.
CI: https://github.com/DanilaH/sudoku-doku/actions/runs/38628147464 — web and Android jobs succeeded.

## Implemented

- TypeScript Sudoku engine with all five techniques, explanations and exactly matching Kotlin reference traces for 900 bank tasks.
- Playable React interface: input, notes, erase, undo/redo, previewed multi-step hints, optional conflict highlighting, on-request solution check, pause, result, statistics and three themes.
- Single atomic versioned snapshot, serialized writes, structural/history checks, preservation of unsupported/corrupt saves, game-ID completion deduplication.
- Monotonic active time, background/focus/modal pause handling and opt-in screen wake.
- Capacitor Android wrapper, native AtomicFile storage, Back/lifecycle handling, Yandex Ads 8.6.0 and AppMetrica 8.6.0 bridge.
- Separate generic web and Yandex Games builds, platform loading/gameplay markup, pause events, localStorage, banner/fullscreen adapters.
- Ad limits, first-completion exemption, clock rollback protection and duplicate impression protection. Native no-fill returns without waiting for a later ad load.
- Debug APKs with demo ad units and with ad initialization disabled; release configuration gate rejects missing/demo ad IDs or missing analytics key.

## Checks actually completed

- All 900 tasks independently verified by Python Algorithm X as uniquely solvable. No digit/rotation/reflection-normalized duplicates.
- All 900 Kotlin/TypeScript step signatures match. All 53,507 deductions agree with independently verified solutions.
- 10 core/adapter regression tests: entries/notes/history, hint application, completion deduplication, corrupted saves, monotonic time, ad caps, duplicate callbacks, no-fill/failure, serialized/stale/failed saves.
- 5 browser scenarios: play/history/restore/pause/hints/themes; completion/statistics/loaded offline play; compact/landscape layout and >=48px number targets; second-tab lock; corrupt-save preservation.
- 2 Yandex-mode browser scenarios using a mock SDK: ready/gameplay/pause/storage/result-ad callbacks, and SDK network failure. These are contract tests, not live platform verification.
- Android debug assembly and lint.
- Android 15 (API 35) Pixel 2 x86_64 emulator, 1080x1920: offline first launch, actual injected touchscreen input, full keypad visibility, native save, Activity recreation, paused timer, force-stop and restoration of redo history. Both instrumented scenarios passed. APKs remained installed between the process-death scenarios.
- Actual Android screenshots visually inspected. A clipped keypad found during inspection was corrected and now fits the screen. A late write into a stopped executor found by instrumentation was fixed; it no longer crashes teardown.

## Deliverables

GitHub workflow artifacts contain the demo/offline APKs, web files, Yandex ZIP, native screenshots and test logs. A downloadable Sudoku-Doku-builds.zip also contains APKs, compiled web files, Yandex ZIP, native screenshots and checksums. No production key or real ad unit is embedded.

APK SHA-256:
- sudoku-demo.apk: 5fde5f4b2b9798593633ed7920f271589f2705f68bebc621a79c91fbee10a8c5
- sudoku-offline.apk: f8d753f04878c9836dd8b9069e62eab21e4f277e0c71ac43aa3c7849727d5f5e

## Before publication

Owner inputs: production banner/interstitial IDs, AppMetrica key, long-lived release signing key, privacy-policy owner/contact and hosted URL. Name/package availability is not independently confirmed. Store description and privacy drafts are in docs/.

Still required: real-device human play/large-font/navigation checks, live demo ad fill/lifecycle behavior, AppMetrica dashboard and automatic revenue receipt with the configured key, signed-update preservation, and testing the Yandex archive in the platform draft. No real ads were clicked. No store/moderation submission or hosting deployment was performed. iOS remains a future port, not a delivered native build.

Known boundaries: browser offline reload has no service worker; Android first launch is offline-capable. Data is local and can be removed by uninstall/browser data clearing. Hint-assisted records remain classified as assisted after undo. Completed-game history is locked. Difficulty is technique-based, not a promise of expert challenge or fun. Commercial traffic/revenue remain unproven.
