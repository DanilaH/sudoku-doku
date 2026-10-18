# RuStore 0.8 release preparation

## Size changes

The 0.7 preview APK was 10,314,622 bytes. ZIP entries contained 8,026,613 bytes of DEX, 1,225,883 bytes of assets, 542,172 bytes of resource table and 288,288 bytes of resource files. These are compressed ZIP-entry sizes, not installed size.

The verified signed 0.8 APK is **5,666,985 bytes**, down **45.06%**. SHA-256: `2903b8992391389ff81f0a3abedc31d5ea6ecb3a774ca35d81f95d5a4e5ae052`. DEX ZIP entries total 3,695,458 bytes (down from 8,026,613). All game JavaScript/CSS assets match 0.7 byte-for-byte. The first 5.1 MB experimental candidate was superseded by this compatibility-checked build.

0.8 enables R8 code optimization and resource shrinking, uses the optimized default ProGuard configuration, and removes the standalone design-preview page from distributed assets. It preserves the full puzzle bank and bundled SDKs. The source banks, IDs, date mapping and save format are unchanged.

Reference: https://developer.android.com/topic/performance/app-optimization/enable-app-optimization

## Build and signing

`.github/workflows/release.yml` builds an unsigned production APK. Production values come from `YANDEX_BANNER_ID`, `YANDEX_INTERSTITIAL_ID` and `APPMETRICA_KEY` repository secrets, mapped to Gradle environment properties. Missing configuration stops the release build.

The production package is `ru.danilah.sudokudoku`, versionName `0.8.0`, versionCode `8`. The release is not debuggable. Production signing is performed outside the public repository with a private PKCS12 key; preserve that key and password for every future update. Never substitute the public preview key. The final APK and private signing backup are separate deliverables.

The `releaseSmoke` variant uses release optimization with a `.releasecheck` package and public preview certificate. It uses demo ad IDs and disables production AppMetrica events. Instrumentation checks offline launch, native saving, activity recreation and restore after process death. These checks do not establish live production ad fill or analytics delivery.

The production package installs alongside the older `.debug` preview. It does not automatically inherit preview progress. Do not uninstall the preview if its saves are needed.

## Remaining store work

The privacy policy is still a draft and needs completion and a public URL. A successful build does not publish an application or establish approval by RuStore. RuStore cloud account synchronization is not implemented in this release; the local profile is usable without sign-in.

## Ad configuration correction

Initial candidate inspection found identical numeric app IDs instead of ad unit IDs. The owner corrected both secrets on 2026-10-19 (Asia/Yekaterinburg). Subsequent APK inspection confirmed two distinct full mobile ad unit IDs and no demo IDs. Secret values are not recorded here. The AppMetrica value has UUID syntax; dashboard delivery remains unverified.

The release preflight rejects numeric app IDs, identical ad units and malformed AppMetrica UUIDs without printing their values. Earlier candidates with incorrect IDs are superseded and must not be submitted to RuStore.

Reference: https://ads.yandex.com/helpcenter/en/monetization/ad-unit/banner

Production certificate SHA-256: `6e18c5cf4c20e8a94539bcd5cd32cc32c4b4bca4be08e75508420b60052c303d`. Local apksigner verification passed for signature schemes v2 and v3.

## Optimized native test compatibility

R8 full mode requires explicit retention of Capacitor runtime annotation types. The instrumentation APK also shares tracing and Kotlin standard-library classes with the app, so their ABI is preserved. The tests inspect WebView through the native Android view hierarchy rather than methods that R8 can inline/remove. Production startup is checked with a screenshot and absence of fatal errors; the WebView text is not reliably exposed by UIAutomator on this emulator.

## Final validation and delivery

- Verified source commit: `5bbafad563cdb76571fe205c9d09da6730f65227`.
- Production build, lint, native startup and minified save/restore checks: https://github.com/DanilaH/sudoku-doku/actions/runs/39159456052 — success.
- Independent optimized Android check: https://github.com/DanilaH/sudoku-doku/actions/runs/39159455956 — success.
- Both instrumentation scenarios report `OK (1 test)`: offline native save/activity recreation and redo restoration after process death.
- Production screenshot visually verified; fatal-crash log empty. APK package/version/debug flag, two distinct production ad IDs, absence of demo IDs and preservation of game assets checked locally.
- Private v2/v3 production signature verified locally. CI temporarily signs the exact production payload with the preview certificate for emulator startup; the delivered APK uses the private production certificate recorded above.
- Delivered `sudoku-doku-0.8-candidate.apk` and separate `sudoku-doku-private-signing.zip`. Earlier candidate bytes were replaced with the verified APK.
- Live advertising fill and AppMetrica dashboard event arrival still need a connected-device check. Store listing/privacy completion remains separate from APK validation.
