# RuStore 0.8 release preparation

## Size changes

The 0.7 preview APK was 10,314,622 bytes. ZIP entries contained 8,026,613 bytes of DEX, 1,225,883 bytes of assets, 542,172 bytes of resource table and 288,288 bytes of resource files. These are compressed ZIP-entry sizes, not installed size.

The first signed 0.8 candidate is 5,109,586 bytes: 50.46% smaller. Its SHA-256 is `d81bd58e46d9a4ec34ce40fbd58aa3da4d57706636e09fdf2a33069ae5feeac4`. DEX ZIP entries total 3,140,163 bytes (down from 8,026,613). All game JavaScript/CSS assets match 0.7 byte-for-byte.

0.8 enables R8 code optimization and resource shrinking, uses the optimized default ProGuard configuration, and removes the standalone design-preview page from distributed assets. It preserves the full puzzle bank and bundled SDKs. The source banks, IDs, date mapping and save format are unchanged.

Reference: https://developer.android.com/topic/performance/app-optimization/enable-app-optimization

## Build and signing

`.github/workflows/release.yml` builds an unsigned production APK. Production values come from `YANDEX_BANNER_ID`, `YANDEX_INTERSTITIAL_ID` and `APPMETRICA_KEY` repository secrets, mapped to Gradle environment properties. Missing configuration stops the release build.

The production package is `ru.danilah.sudokudoku`, versionName `0.8.0`, versionCode `8`. The release is not debuggable. Production signing is performed outside the public repository with a private PKCS12 key; preserve that key and password for every future update. Never substitute the public preview key. The final APK and private signing backup are separate deliverables.

The `releaseSmoke` variant uses release optimization with a `.releasecheck` package and public preview certificate. It uses demo ad IDs and disables production AppMetrica events. Instrumentation checks offline launch, native saving, activity recreation and restore after process death. These checks do not establish live production ad fill or analytics delivery.

The production package installs alongside the older `.debug` preview. It does not automatically inherit preview progress. Do not uninstall the preview if its saves are needed.

## Remaining store work

The privacy policy is still a draft and needs completion and a public URL. A successful build does not publish an application or establish approval by RuStore. RuStore cloud account synchronization is not implemented in this release; the local profile is usable without sign-in.

## Configuration blocker found during APK inspection

The configured banner and interstitial values in the built candidate are the same eight-digit numeric value. They are not full mobile ad unit IDs. Their values are intentionally not recorded here. The AppMetrica value has UUID syntax, but dashboard event delivery remains unverified.

The candidate is for installation/testing only until the owner replaces both repository secrets with distinct full `R-M-PAGE_ID-INDEX` IDs. The release preflight now rejects numeric app IDs, identical ad units and malformed AppMetrica UUIDs without printing their values. After correcting secrets, rerun the release workflow; do not submit the existing candidate to RuStore.

Reference: https://ads.yandex.com/helpcenter/en/monetization/ad-unit/banner

Production certificate SHA-256: `6e18c5cf4c20e8a94539bcd5cd32cc32c4b4bca4be08e75508420b60052c303d`. Local apksigner verification passed for signature schemes v2 and v3.
