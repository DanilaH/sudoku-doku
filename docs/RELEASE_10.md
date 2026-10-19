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
