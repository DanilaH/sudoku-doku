# Release 0.15 — aligned shared icon

Runtime commit: c0883c905367fb347d8f1d159141ee63fda4cc8e.

Replaces irregular hand-drawn digits with optically centered outlined glyphs, increases the store artwork size and highlights one cell in blue. Android adaptive foreground preserves mask-safe margins. Store media now reads the shared web SVG. See ICON.md for regeneration.

Release workflow 39399217668 succeeded; artifact 12254616681. Offline launch/save, process-death restore and system Back each passed; no fatal exceptions in the two captured crash logs. Web and Android workflow 39399217966 succeeded. Local RuStore build passed.

Signed APK: version 0.15.0, code 15, 5675249 bytes. SHA-256 `1c7634e3ce4601dee562bff6ca5733f8dea9ae173da68c937bc3c9e14fa5d15b`. Production certificate unchanged; v2/v3 signatures verified. Inspected the signed APK: new bundled SVG matches the source byte for byte and the compiled launcher vector contains the updated blue selection and geometry.

Game logic and save schema unchanged. This turn did not perform a physical-device install-over test or verify live ad fill. No store submission performed.
