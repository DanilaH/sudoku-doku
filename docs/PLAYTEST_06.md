# Playtest 0.6 — 2026-10-18

- Home fits 360×640 including simulated top/bottom system bars, with and without a saved game. Text scaling may scroll; content is never clipped.
- Android system/cutout insets applied to native content container. Browser safe-area CSS retained.
- Keyboard help hidden for coarse primary pointer/no hover and Android; screen wake option hidden on desktop (works on Android and supported mobile web).
- Normal progress counts distinct normal puzzle IDs only: 900, 300 per difficulty. Daily and replay completions do not inflate collection progress.
- Daily v2: 5400 independently generated puzzles, 1800 per difficulty, beginning 2026-10-19. Immutable sequential mapping; no modulo wrap. Older published archive retains v1 mapping. Existing saved daily games always win, including future-dated legacy saves.
- No exact or digit-renaming/rotation/reflection duplicates within new daily bank or against normal bank. Uniqueness verified independently with Algorithm X; difficulty verified by logical solver. No claim of exhaustive equivalence under all Sudoku symmetries.
- Daily date refreshes at midnight and browser/native foreground; current game is not replaced. Win action selects next later unlocked unsolved date, then earliest unsolved archive date; exhaustion returns home.
- Statistics include daily, normal and repeat sessions; all/per-level tabs. New active-time totals retain time in replaced sessions. Legacy totals recover only completed and retained unfinished sessions; abandoned historic time cannot be reconstructed.
- Monthly medal: bronze 7, silver 15, gold all days; annual count is months with any earned tier out of 12. Home has warm gold accent while unearned medal remains outline.

Reproduce bank: `node --import tsx tools/generate-daily.ts` (seed start 1000000). Do not regenerate or reorder a published bank. Append a versioned bank when extending the horizon.
Validation: `npm test`, `npm run verify:bank`, `npm run build`, Playwright browser/Yandex suites, Android lint + offline/native-save/process-death tests in GitHub Actions.
