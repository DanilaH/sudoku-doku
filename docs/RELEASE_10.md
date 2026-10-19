# 0.10.0 — independent audit fixes

Changes:
- Mobile victory panel before the completed board; return to top on victory.
- Height-aware landscape layout, legible tool labels on tablets, stable guidance row.
- Resume the most recently updated unfinished archive puzzle directly from Home.
- Calendar month retained during navigation; trophies return to their origin.
- Next daily task labels its date; once caught up, offer the nearest missing past date.
- Completed-bank replay cycles through puzzles instead of always returning the first.
- Selection no longer triggers digit-entry animation; newly added notes animate.
- Completed games discard undo/redo; old saves validate their history before compaction. Active-game history remains intact. Removed redundant second clone in validation.

Validation before packaging: 31 unit tests passed; Rustore web build passed.
A controlled 180-day fixture (200 edits per completed game) shrank from 4,467,568 to 210,892 bytes. Wall-clock timings on the shared host are noisy and are not Android frame-rate claims. Full archive validation/serialization still scales with archive length.

Independent audit of 0.9: 36,000 randomized actions, 1,800 serialized-state validations, 6,085 input/undo/redo comparisons, all 1,800 regular plus 5,400 daily bank puzzles independently verified. UI findings were reproduced in Chromium viewports; physical-phone ads, TalkBack and OS text scaling remain separate manual checks.

Follow-up verification:
- Victory CTA fully visible at 360×640, 390×844 and 844×390.
- Board selection shift is zero at 320×568, 360×640, 390×844, 844×390, 768×1024 and 1366×768; no horizontal overflow.
- Landscape 844×390 board ends at y≈343 and tools at y≈297.
- Both saved modes fit Home at 320×568 after the final compact-spacing pass.
- Archive resume restores the intended date; calendar → trophies → back returns to the same month.
- Repeat successor changed from sdk-dd821682043f13544ab8 to sdk-de781d2cb5c076c8247e.
- Given digit animation is `none`; added note uses `digit-in`; immutable-digit guidance is visibly rendered.
- Save-error recovery preserves the old snapshot and persists the retried entry; rapid nine-note input retains all nine notes.
- Randomized 36,000-action core audit repeated after the changes: passed.

Local Chromium on this shared host hit time limits in full click-through scenarios; these are not recorded as product defects. GitHub run 39277497471's web job passed all 13 browser scenarios in 37.3 seconds; its Yandex assertion still referred to the deliberately hidden decorative victory caption, so the assertion was updated to the visible victory heading. No persistence/ad assertion was removed.

Final short-screen follow-up: a daily victory's medal panel pushed the CTA bottom to y=395 on an 844×390 viewport. The final CSS places the action before reward/statistics in short landscape layouts; the verified CTA now spans y=134…186. This was fixed before delivering the APK.


## Delivered APK
- Version 0.10.0 / code 10, package `ru.danilah.sudokudoku`, non-debuggable, min SDK 26.
- 5,671,153 bytes; SHA-256 `92027001247a618f6ae1712a8975216c527ecc234ba53d7e7387acf9bdb43dcb`.
- Same private production certificate as 0.8/0.9; v2/v3 signatures verified.
- Final runtime commit `d2ee28392d2dcbc70e27cc66773576de60c28b8d`.
- Final build run 39279448618, artifact 12199242500. Production startup, offline play and process-death/redo restoration passed. Packaged CSS checked for both final compact-home and daily-victory fixes.
- Upgrade run 39277348329, artifact 12198083609: both pre-update and post-update tests passed (0.9 → initial 0.10 candidate, before the later CSS-only layout adjustments). Test copies use the same preview certificate; delivered APK is separately signed with the private production certificate. A follow-up upgrade run 39278201338 was also scheduled for the intermediate layout candidate.
- Local platform suite: 4/4 passed. New dual-save menu and short-landscape daily-victory regression scenarios passed. Core unit suite: 31/31 passed.
- Delivered file `sudoku-doku-0.10.apk`, Library identity `libfile_4b334735a45c81918a6f5b7a52f1bc17`, version 1.
- Not submitted to RuStore. Live ad fill/analytics delivery and physical-device accessibility remain outside this automated verification.
