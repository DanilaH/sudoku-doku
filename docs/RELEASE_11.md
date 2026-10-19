# 0.11.0 — second independent audit fixes

Runtime commit: `c6cb0bebaf25833e5a6d117653e4b199ae3160d3`. RuStore remains guest/local; no account requirement or cloud activation.

Changes:
- Fixed nine equal grid rows and constrained note layout. Filled candidates no longer stretch the board or separate cell borders. Short portrait controls use tighter spacing without reducing number buttons below 48 px.
- Selection and input preferences update local React state; the next move or lifecycle/periodic checkpoint includes them. Actual edits are still queued immediately.
- SaveQueue coalesces pending immutable snapshots and settles callers after the corresponding/latest snapshot commits. Local reducer states avoid repeated full validation/cloning. External snapshots retain validation and detachment; load and cloud merge remain fully validated. ProfileStorage writes the trusted snapshot once, retaining the previous vault if disk writing fails.
- Cloud completion reconstruction clears stale notes. Cloud remains disabled in RuStore.
- Calendar explains dates outside the supported range and disables the unavailable daily action. Future end-of-bank dates are no longer called today.
- Settings read the app version from package.json. Trophy return button announces “Назад”.
- Added Android regression for system Back from calendar to Home and from Home to activity exit (the exit implementation already existed).

Verification before packaging:
- 11 focused unit tests passed, including coalescing during an in-flight write, preservation of two undo moves, retry after failed disk write, and bidirectional merge with stale notes.
- Browser disk-full simulation: previous snapshot retained, further input blocked, retry persisted the digit and restart restored it; no page errors. Rapid nine-note input retained bitmask 1022. Victory CTA remained visible at 360×640, 390×844 and 844×390.
- Four new Playwright regressions passed: filled-note grids at 320×568, 360×640, 844×390; unsupported date and build version.
- Controlled filled-note geometry: 252×252, 290×290, 240×240 respectively; row borders aligned. The 320×568 spacing was additionally tightened after the initial diagnostic so lower commands also fit.
- 30 unfinished daily sessions × 200 moves: measured selection handler 2.1–4 ms in this environment versus 36.6–64.4 ms in the prior audit. Host load affects timings; these are not Android FPS measurements. Histories are retained.
- Local full-suite attempt hit the existing 20-second large-cloud-fixture timeout under host load. CI web job 118246896560 passed all 34 unit tests, all 18 browser scenarios and all 4 Yandex platform scenarios. The unchanged normal and daily banks were verified again by the CI workflow.

Release workflow 39307099017; upgrade workflow is pinned to previous 0.10 run 39279448618 and current 0.11 run 39307099017. Upgrade verification uses production package APK copies signed with the same public test certificate; the delivered file is signed separately with the existing private production certificate.

Not submitted to RuStore. Physical-phone TalkBack, OS font scaling, audio feel and live ad fill remain manual checks.

## Signed APK

- Filename: `sudoku-doku-0.11.apk`; version 0.11.0 / code 11; package `ru.danilah.sudokudoku`; min SDK 26; non-debuggable.
- Size: 5671153 bytes (~5.7 MB).
- SHA-256: `a31ee77a98946f5ed7bc4ee0b7faedc68057a6cc9d0af2708c6f95e39ac3ee6a`.
- v2/v3 signatures verified; same private production certificate as 0.10 (`6e18c5cf4c20e8a94539bcd5cd32cc32c4b4bca4be08e75508420b60052c303d`).
- Release artifact 12214179495. Offline native save/restore, process-death redo restoration and system Back tests each report `OK (1 test)`; production and instrumentation crash logs are empty.
- Packaged CSS inspected: equal grid rows and final compact-portrait rule present (Vite emits range media-query syntax).
- Delivered file identity: `libfile_e415bdad469c81919143ee4cc6e63ddc`, version 0.
- Upgrade run 39307194682, artifact 12215505477: production-package 0.10 → 0.11 install-over passed. Both before-update and after-update instrumentation tests report `OK (1 test)`; persisted entries and redo history restored. This uses the final 0.11 runtime artifact, not an earlier candidate.
