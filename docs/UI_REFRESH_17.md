# UI refresh 0.17

Implements the 2026-10-23 UI/UX audit. Menu uses available viewport height with separate session and daily cards; compact variants preserve both saved modes and safe insets. Progress has difficulty breakdowns, trophies count the selected year, and the profile presents identity/results before editing. Statistics has an actionable empty state. Calendar and rewarded text are shorter. Shared surfaces, typography, progress bars and dark interactive text have been refreshed. Victory shows collection progress while keeping the next action ahead of secondary information in short landscape.

Advertising: portrait has a reserved bottom slot; short landscape places the SDK-sized slot below the control column, alongside the full board. The previous scrolling/clipped puzzle area is removed. Browser tests check the board and controls against the ad rectangle, not only the outer layout. At the minimum landscape size, secondary controls are compact. Real demo SDK orientation checks run in the Android release workflow.

Hints: every new logical explanation increments assisted statistics, even when manually applying its answer. Applying an already read explanation does not double-count. Its position key is saved in the game and reopening is free across restart/undo. Notes do not change the solver position. A bounded cache stores the last 512 explained positions per game. Older saves without this field remain valid; historical completed results are not rewritten. Three free credits per game and +3 per completed rewarded video remain.

Version 0.17.0 / code 17. The original signing archive was recovered on 2026-10-23; the production APK is signed and verified against the 0.15 certificate. Preview/demo signing is not valid for a RuStore update. No store submission was performed.

## Final verification and deliverables

Runtime commit: f97cc1ed1c32e7d2f438fbaea6671530b1a5fc59. Test-only follow-up: 664e982c1321d9df1ea5e4da1678ab34281b2667. Release workflow 39967898372 succeeded; project workflow 39968252793 succeeded. 43 unit tests, 26 browser scenarios and 4 Yandex platform scenarios passed. Native offline/save, process-restoration, Back, native slot geometry and online orientation probes passed. Real demo banner request/load/impression was recorded in portrait and landscape; rewarded/interstitial loaded. This does not claim physical-device production ad fill or completed rewarded playback.

Production APK: sudoku-0.17-rustore.apk (5,683,441 bytes). SHA-256: 0d630e3f596aa8988126a3c471c4f32693c85d725d2c04e1c5127ec0c4c109e6.
Test APK: sudoku-0.17-test-ads.apk (10,323,011 bytes), demo units, separate application ID. SHA-256: f7f3062172f644e33b9c98147f95aeb664f08b627fa3589b5d3c94f7f65f262c.
Original signing certificate SHA-256: 6e18c5cf4c20e8a94539bcd5cd32cc32c4b4bca4be08e75508420b60052c303d. The archived signing material remains private and is not committed.

The prior UI audit is historical: its prioritized defects are addressed by this release. New native screenshots confirm the landscape ad beside the complete board. On the smallest screens controls are necessarily more compact; physical-device touch comfort remains a useful user playtest.
