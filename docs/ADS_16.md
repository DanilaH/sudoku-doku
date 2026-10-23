# 0.16 advertising and hint packs

- Three hint credits per game, including daily games. Older saves without the optional balance receive three credits once; the next saved change persists the balance.
- A credit is spent when a logical explanation opens, after persistence succeeds. Error/complete/no-step messages cost nothing. Closing the explanation does not refund it; undo/redo do not restore credits. Applying a hint retains the existing statistics semantics.
- At zero credits, an explicit video offer gives three more credits for that game. No daily rewarded cap. Only SDK reward confirmation grants credits; no fill, failure and early closure do not.
- The native bridge writes a pending reward receipt before notifying JavaScript. Receipt handling is idempotent and acknowledgement follows the save flush. Startup recovers unacknowledged rewards. A pending receipt prevents another reward show until recovered.
- Both reward confirmation and closing an actually displayed opt-in ad protect the next five minutes from interstitials. Existing first-game protection remains.
- Rewarded configuration: GitHub secret `YANDEX_REWARDED_AD_UNIT_ID` → Gradle `rewardedId` → `BuildConfig.REWARDED_ID`. Production validates a full R-M ad unit ID and requires three distinct units. Debug/releaseSmoke uses demo units.
- Banner placement subtracts the root FrameLayout padding from root-relative margins. Both orientations reserve a fixed bottom slot; no minimum viewport height is required. Layout rejects only zero-size/offscreen slots. Native size checks remain. The native bridge reports the required sticky height; the web slot reserves that size before showing the native view. On short screens the board shrinks and the game area scrolls above the banner; system safe insets are preserved.
- Reload after errors is opportunity-driven (foreground, network recovery, result exit or reward request), with a 30-second native cooldown. No tight retry timer and no manual creative refresh loop.

Verification distinguishes browser mocks, deterministic native container geometry, online demo loading and physical-device production fill. The online probe only observes loading; it does not prove rewarded video completion. Keep this distinction in release reports.

Version 0.15 was submitted to RuStore moderation by the user on 2026-10-20. Do not describe 0.16 as submitted. Update the store description from STORE_RUSTORE.md when submitting 0.16.

## Build and signing continuity

Runtime release commit: `249a93156ef43bada02f0bef007121c49fecd13e`. Final release run: `39471632747`. Local validation: 40 unit tests, 24 browser scenarios, 4 Yandex platform scenarios, TypeScript and both builds passed. Browser advertising tests use a mocked native bridge.

Test-only APK uses demo ad units and application ID suffix `.debug`, version 0.16.0/code 16. Prepared from artifact `12287777106` (commit `249a93156ef43bada02f0bef007121c49fecd13e`; runtime code matches the release candidate). SHA-256: `695fa1990aa9ea8ea45e2ee576537c619f59afe3f721f9892d490ade3f9b9751`. It is not a RuStore upload.

Production signing remains blocked: workspace maintenance removed the local production signing material. The saved `sudoku-doku-private-signing.zip` was found but materialization failed with HTTP 403. Do not create a replacement key. Recover the existing archive, verify its certificate against release 0.15 (`6e18c5cf4c20e8a94539bcd5cd32cc32c4b4bca4be08e75508420b60052c303d`), then sign and verify the new APK. Never commit the keystore or password to the repository.

The preceding native run 39469886252 passed offline/save, process restoration, Back and deterministic native banner geometry. The online probe loaded demo rewarded and interstitial ads. It revealed a missing banner request caused by a fixed-height slot. The final runtime reports the SDK-required height to the web layer before display; a browser regression checks this using a 96px banner.

Final run 39471632747 succeeded. Production build/lint/startup passed without crash; all five instrumentation probes completed. Online SDK log confirms banner request, load and impression, plus rewarded/interstitial loads. The captured banner is below controls and above system navigation. Full rewarded playback and production fill still require a physical-device check. Release artifact: 12288400333. Project run 39471632838 also passed web and Android jobs.

2026-10-23: Removed the 740px visibility threshold and the matching CSS hide rule. Browser regression covers 390×640, 390×1000, 844×390, 568×320 and 320×568, checks visibility plus non-overlap, and verifies hiding in settings. The ad-bearing screen uses a fade to avoid transformed ancestors changing the fixed slot coordinate system.

Update 2026-10-23: The production signing archive was successfully recovered and its certificate verified. The signing blocker above is resolved; see UI_REFRESH_17.md for the signed 0.17 artifact and current hint/cache behavior.
