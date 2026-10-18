# Playtest 0.7 — profiles and expanded bank

## Implemented
- 1800 normal puzzles, 600 per difficulty. Original 900 and all published daily mappings immutable.
- 900 added puzzles generated from seeds 2000000+, separate from all 5400 new daily puzzles.
- Logical difficulty verification plus independent Algorithm X uniqueness and canonical duplicate checks.
- Calendar has icon, border, background and 44px tap target. Profile in header; home fits 360x640 with safe areas.
- Optional nickname/profile with statistics and trophies. No login at launch; no feature gating.
- Build-selected platform adapter (`production` local, `yandex`, `rustore`), lifecycle, ad facade, account/cloud contract.
- Yandex SDK account/login/getData/setData integration; platform ID checked for each operation.
- Local-first profile vault, atomic writes, guest migration once, isolated accounts and fresh guest after transfer.
- Idempotent result union by game ID/date; max activity per session including abandoned games.
- Compact compressed cloud format: stable bank references, columnar results, completed-game reconstruction, full unfinished history.
- 7200 completion archive tested under 195 KB. Very large replay histories can still exceed platform quota; uploads then fail explicitly without losing local saves.
- Sync on home after 1.5s and every minute outside play; explicit retry, offline fallback, timeouts. No mid-game merge.
- Stable PUBLIC DEVELOPMENT certificate from 0.7 onward. Production must use a separate private key.

## External blockers / not release-ready
- RuStore adapter is a typed bridge boundary, NOT a working native GameCenter integration. Capability stays false unless a real `RuStoreProfiles` plugin exists.
- Need actual RuStore application console configuration, activated Pay SDK/GameCenter and integration credentials. Published GameCenter docs show only data string, not a stable identity API; native bridge must verify current account identity per operation before enabling writes. Do not derive account identity from a mutable nickname or use one shared native account key.
- Yandex account tests use SDK mocks. Real signed-in draft and two actual devices still need verification.
- Cloud APIs do not expose compare-and-swap. Concurrent device writes are eventually merged on later sync; not transactional multiplayer storage. Keep local copy and retry.
- Unknown legacy discarded activity is merged conservatively via max, since old saves have no session ledger.
- 0.7 signature cannot update 0.5/0.6; those CI private keys were ephemeral. Do not delete old installation if progress matters.

## Verification
`npm test` — 28 tests, including full bank capacity, profile merge, migration, account isolation and failed local writes.
`npm run verify:bank` — all original, extra and daily banks independently checked.
`npm run build`, `npm run build:yandex`, `npm run build:rustore`.
Playwright: existing browser regression suite, compact safe-area home; SDK login cancellation, guest migration, network failure, account switch and second browser profile restore.
CI builds APK, lint and runs native offline/process-death tests.

## Integration sources
https://yandex.ru/dev/games/doc/ru/sdk/sdk-player
https://www.rustore.ru/help/sdk/game-center/kotlin/10-5-2
