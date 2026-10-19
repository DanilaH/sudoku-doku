# RuStore 0.9 release handoff

Production package: `ru.danilah.sudokudoku`. Version 0.9.0, code 9.

## Changes

- Local profile wording replaces guest/unavailable-cloud text.
- Privacy screen has actual developer contact and public policy; cloud wording appears only where an account adapter is available.
- Removed obsolete pre-0.6 statistics note.
- Published `public/privacy.html` at https://danilah.github.io/sudoku-doku/privacy.html (HTTP content verified).
- Store text in `STORE_RUSTORE.md`; reproducible native screenshot layout in `tools/store-media.mjs`.
- No gameplay or save-format changes. No social features enabled.

## Signed deliverable

`sudoku-doku-0.9.apk`, 5,671,153 bytes.
SHA-256: `7e1fba27c86975bc93d1ba8463a0559da879a9d97528b6b9ab292f466b76b9f5`.
Certificate SHA-256: `6e18c5cf4c20e8a94539bcd5cd32cc32c4b4bca4be08e75508420b60052c303d`.
Same private production certificate as 0.8; v2/v3 verified. Key stays outside repository.
Size increased by 4,168 bytes over 0.8; remains about 45% smaller than 0.7.
Two distinct production ad unit IDs and no demo IDs verified without exposing values.

Runtime source commit: `e84396280defa4faec6280441f829b25b0467376`.
Production build: https://github.com/DanilaH/sudoku-doku/actions/runs/39251527389
Later commits change only tests, capture timing, docs and media tooling.

## Verification

28 unit tests passed. All 13 browser tests and 4 Yandex adapter tests passed in CI run 39252283730. Native offline save/restore tests passed. Production startup crash log empty. Four Yandex adapter tests passed after updating the expected local-profile label; initial CI failure was the stale label assertion.

Native screenshot recapture completed and visually inspected: five 1080×1920 frames, with and without captions; 512×512 opaque icon. Source Android screenshots: run 39252283730, artifact 12186515159.

Functional 0.8 → 0.9 upgrade verification PASSED: https://github.com/DanilaH/sudoku-doku/actions/runs/39253237245 . The old production APK created a saved game and undo history, the new APK was installed with `adb install -r`, and redo restored the entered digit after updating. Both instrumentation phases reported OK (1 test). Production package and data survived without uninstalling.
The upgrade check re-signs test copies with one development certificate; release delivery is separately signed and verified with the private production certificate. Do not distribute the test copies.

## Remaining external checks

Live advertising inventory and AppMetrica delivery require a connected device. Store console form and age-rating questionnaire must be completed against actual content and advertising settings. No store submission or publication has been performed.

## Delivered files

- `sudoku-doku-0.9.apk` — private production signature.
- `sudoku-rustore-media-0.9.zip` — both five-frame screenshot sets, original native captures, icon, listing text, public-policy copy and preview.
- Standalone `preview.jpg` and `icon-512.png`.

The draft/helper-only upgrade attempts first exposed ActivityScenario dependency stripping and then a declaration-generation typo; both harness issues were corrected. No production-code change was needed for the passing upgrade.
