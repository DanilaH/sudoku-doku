# 0.13.0 — remove daily interstitial limit

Runtime commit: `43f4dc88c1ea5963be1da1382d725ef04ce47a6f`.

Requested change: remove the maximum of two fullscreen ad impressions per day. The first completed game still has no interstitial, and both monotonic and persisted wall-clock checks retain the ten-minute interval. Backward-clock protection remains. Placement is unchanged: after saving, when leaving the result screen. Banner behavior is unchanged.

The save format remains compatible. The existing recent-impression history is retained; there is no migration or reset of progress.

Local verification: 8 core tests passed, including 20 impressions without a daily cap; TypeScript and the RuStore web build passed. This tests eligibility logic, not live ad fill.

Release workflow: 39393545808. Release and CI passed. Web: 34 unit tests, 22 browser scenarios, 4 Yandex scenarios (job 118530589179). Android CI job 118530589437 passed. Release job 118530589662 passed. Artifact 12250842236 contains successful offline/save, process-death restoration and system Back checks; captured crash logs have no fatal exceptions.

Signed APK: version 0.13.0 / code 13; ru.danilah.sudokudoku; min SDK 26; non-debuggable. Size 5671153 bytes. SHA-256 `1f78b7e5d5d69e5cc05daa23130a1c2256bf9d9c19036d2e9757a11c75a0dc05`. v2/v3 signatures verified; certificate unchanged from 0.12 (`6e18c5cf4c20e8a94539bcd5cd32cc32c4b4bca4be08e75508420b60052c303d`). Packaged JavaScript inspected: daily_cap removed, first-game and backward-clock guards retained.

No store submission performed. Live ad fill on a physical device remains unverified. No new install-over upgrade test was run for this eligibility-only change; save schema is unchanged.
