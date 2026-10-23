# UI refresh 0.17

Implements the 2026-10-23 UI/UX audit. Menu uses available viewport height with separate session and daily cards; compact variants preserve both saved modes and safe insets. Progress has difficulty breakdowns, trophies count the selected year, and the profile presents identity/results before editing. Statistics has an actionable empty state. Calendar and rewarded text are shorter. Shared surfaces, typography, progress bars and dark interactive text have been refreshed. Victory shows collection progress while keeping the next action ahead of secondary information in short landscape.

Advertising: portrait has a reserved bottom slot; short landscape places the SDK-sized slot below the control column, alongside the full board. The previous scrolling/clipped puzzle area is removed. Browser tests check the board and controls against the ad rectangle, not only the outer layout. At the minimum landscape size, secondary controls are compact. Real demo SDK orientation checks run in the Android release workflow.

Hints: every new logical explanation increments assisted statistics, even when manually applying its answer. Applying an already read explanation does not double-count. Its position key is saved in the game and reopening is free across restart/undo. Notes do not change the solver position. A bounded cache stores the last 512 explained positions per game. Older saves without this field remain valid; historical completed results are not rewritten. Three free credits per game and +3 per completed rewarded video remain.

Version 0.17.0 / code 17. A production APK still requires the original production signing archive; preview/demo signing is not valid for a RuStore update. No store submission was performed.
