# 0.14.0 — five-minute interstitial interval

Runtime commit: `5747ab9a6a8f30c00bc2c91a5ccda579d55d3837`.

The minimum interval between fullscreen ad impressions is now five minutes (300000 ms), checked both with monotonic session time and the persisted wall clock across restarts. There is no daily impression cap. The first completed game remains protected, and ads are still requested only when leaving the saved result screen. Banner behavior and save schema are unchanged.

Local verification: 8 core tests passed, including just-before/exactly-at-five-minute boundaries for both clocks, backward-clock protection and 20 eligible impressions without a daily cap. TypeScript and RuStore build passed.

Release workflow: 39395116320. All required CI checks passed: 34 unit tests, 22 browser scenarios and 4 Yandex scenarios (web job 118535817537); Android job 118535817703; release job 118535818244. Artifact 12251852167 has successful native offline/save, process-death restoration and system Back tests; no fatal exceptions in captured crash logs.

Signed APK: 0.14.0 / code 14; package ru.danilah.sudokudoku; min SDK 26; non-debuggable; 5671153 bytes. SHA-256 `b0abbdccb784e179f3be064307eb8757562a3b83cf7ee92a9668684eb37b26d5`. v2/v3 signatures verified; same production certificate as 0.13 (`6e18c5cf4c20e8a94539bcd5cd32cc32c4b4bca4be08e75508420b60052c303d`). The JavaScript extracted from the signed APK contains 300000 ms for both interval guards and no daily_cap branch.

No store submission performed. Live ad fill on a physical phone remains unverified. No new install-over test was run for this interval-only change; save schema is unchanged.
