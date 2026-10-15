# Roadmap and release gates

Accepted stack: TypeScript + React + Vite; Capacitor 8 for Android. Core and UI can be reused for iOS; iOS builds and publication are outside the current release scope.

1. TypeScript port: DONE. All 900 Kotlin step traces match exactly; independent uniqueness validation retained.
2. Game state: DONE. Input, notes, erase, undo/redo, previewed logical hint application, immutable givens, no mistake limit.
3. Persistence and time: DONE. Atomic IndexedDB snapshot in web; serial AtomicFile writes in Android; schema and history checks; monotonic active time; idempotent results in the same snapshot. Offline launch, Activity recreation and force-stop/redo restoration passed on the Android 15 emulator.
4. Interface: DONE. Light/dark/system, responsive grid, keyboard and touch controls, pause cover, new-game confirmation, local statistics and settings. Browser scenarios are automated; visual screenshots are actual UI renders.
5. Android: DONE for test builds. APK assembly, lint and actual touchscreen/emulator persistence checks passed. Capacitor lifecycle and Back, safe area layout, optional keep-awake.
6. Android monetization: IMPLEMENTED with Yandex Ads 8.6.0 and AppMetrica 8.6.0 bridge. Debug uses demo units and no analytics key. Actual fills, callbacks, revenue delivery and real-device UX remain release gates.
7. RuStore packaging: build instructions and draft store content. Needs production ad IDs, AppMetrica key, owner privacy contact/URL and release signing. No moderation submission authorized yet.
8. Yandex Games: separate build and SDK adapter. Includes loading/gameplay markup, pause events, fullscreen and banner APIs, SDK-backed localStorage. Must be tested in platform draft and moderated separately.

## Changes from original handoff

HANDOFF.md is retained as the original research/specification. This roadmap takes precedence for platform and architecture decisions.

- Kotlin is a regression reference and offline generator, not the shipping game runtime.
- Room/DataStore are replaced by one versioned snapshot per profile: IndexedDB for browser; AtomicFile behind a native Capacitor plugin for Android. Game/results/history commit together. Never reset a broken save silently.
- UI is React/DOM rather than Compose. The minSdk is 26; target/compile 36; Java 21 for Capacitor 8.
- Bank JSONL retains digit strings (parsed to arrays) and original stable puzzle IDs.
- Web offline support means an already loaded game works without network. Android includes all assets for offline first launch; a browser reload offline is not promised without a service worker.
- Human device checks, real ad fill and moderation are not implied by green CI.

## Release boundary

A debug APK is for testing, not publication. Production compilation rejects absent/demo ad IDs or an absent analytics key. A release must be signed with the owner's long-lived key. Test using demo blocks; never click live ads during QA. Do not claim proven commercial demand or revenue.

Final verification and remaining publication inputs: [reports/PROJECT_READINESS.md](../reports/PROJECT_READINESS.md).

## Version 0.2 — competitor review follow-up

Implemented scope: [POLISH_SPEC.md](POLISH_SPEC.md).

- Two input modes; notes in both; optional related-note cleanup as one reversible move.
- Digit completion markers; configurable highlights, large digits, timer and sound; settings accessible from the board without losing selection.
- Error diagrams with navigation, full-board mistake feedback, short transitions and reduced-motion support.
- Five interactive tutorial steps, available again from the home screen and settings.
- Deterministic daily challenges and past-date calendar; separate ordinary/daily save slots and daily totals; v1 → v2 migration.
- Core regression, persistence and browser tests cover the additions. Human difficulty assessment and live advertising/moderation remain the release gates above.

## Version 0.3 — reference-based interface redesign

Replaces the rejected beige/green interface and the exploratory A/B palettes. Uses the supplied Brainatee screenshots as the primary visual reference. See [UI_REDESIGN.md](UI_REDESIGN.md) for decisions, scope and acceptance. Core, bank and save schema remain v2-compatible; no new game systems are added.
