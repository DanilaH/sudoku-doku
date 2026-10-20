# 0.12.0 — short landscape layout

Runtime commit: `a68415a48a8e437edc5d820d47c4343435505bae`.

- The two-column landscape layout now includes 568 px screens. The board follows available height, with a narrower gap and full available page width.
- Large digits scale down with the short board. Candidate-note padding is removed in landscape so all nine candidates fit.
- Completed games keep the board in the left column and the next-task action visible in the right column. Result details may scroll on a short screen.
- Eight focused browser regressions passed locally: six viewport sizes (320×568, 360×640, 568×320, 600×320, 640×360, 844×390), existing date/version behavior, and completing a game then starting the next task at 568×320. Geometry checks use reduced motion to measure settled layout.
- Geometry checks cover large digits, all nine notes, square board rows, horizontal/vertical overflow during play, and keypad bounds.

Package 0.12.0 / code 12. Guest/local mode, puzzle bank, save schema and account integration are unchanged. No RuStore submission performed.

## Verification

- Final-source CI web job 118516884624 passed: 34 unit tests, 22 browser scenarios, 4 Yandex scenarios. Normal and daily banks were verified by the same workflow.
- Release workflow: 39389365814 (final source), following the candidate-note adjustment. The earlier 39389040200 build is superseded.
- A new install-over upgrade test was not run for this CSS-only runtime change. Save schema and persistence code are unchanged from 0.11.
- Physical-device TalkBack, OS font scaling, live ad fill and audio feel remain manual checks.

## Signed APK

- File: sudoku-doku-0.12.apk; 5671153 bytes (~5.7 MB).
- SHA-256: `2398c9d172d3313a6348c79f41216382f67ac0dd1e2d92974bb21e280f47e133`.
- Verified manifest: package `ru.danilah.sudokudoku`, version 0.12.0, code 12, min SDK 26, non-debuggable.
- v2/v3 signatures verified. Production certificate unchanged: `6e18c5cf4c20e8a94539bcd5cd32cc32c4b4bca4be08e75508420b60052c303d`.
- Release artifact 12249395735. Release job 118516884295 succeeded; offline native save/restore, process-death redo restoration and system Back each report `OK (1 test)`. No fatal exceptions in the captured crash logs.
- Final-source Android CI job 118516884326 succeeded.
- Browser check on files extracted from the signed APK passed all six viewports in dark theme with large digits and all candidates: no page errors, overflowing digits, notes or horizontal/vertical scroll during play. 568×320 and 600×320: board 180×180; controls bottom 298 px. 640×360: board 220×220. 844×390: board 250×250. The 568×320 screenshot was visually inspected.
- File identity: `libfile_883b716152788191b29b28999cde87d0`, version 0.

