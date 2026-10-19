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
