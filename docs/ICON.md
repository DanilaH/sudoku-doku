# Shared Sudoku icon

`public/icon.svg` and the Android adaptive foreground use the same grid and outlined DejaVu Sans digits. The selected cell uses #D5E8FA; ink uses #365F8B. Glyphs are centered using their visible bounds, with equal height and padding. No font is required at runtime.

The adaptive foreground stays in the central 50 × 50 units of a 108 × 108 canvas, keeping the entire grid inside a 72-unit circular launcher mask. Store and web artwork is scaled up separately to occupy 69.4% of its canvas.

Regenerate vector assets with `python3 tools/generate-icon.py` (requires fontTools and DejaVu Sans). Render the store PNG with `PLAYWRIGHT_EXECUTABLE=/path/to/chromium node tools/render-icon.mjs OUTPUT_DIR`. Store screenshot generation also reads the shared SVG.

Check 512, 128, 64 and 48 px output and rounded/square crops after any artwork changes. Release 0.15 updates the launcher and bundled web icon; no game state or gameplay changes.
