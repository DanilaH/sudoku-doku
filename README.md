# Судоку — спокойно

Native Android product for RuStore. Stage 1: pure Kotlin engine and offline puzzle bank. Android UI and advertising have not been implemented. See HANDOFF.md for scope.

## Build and reproduce

JDK 17+, Gradle 8.13, Kotlin JVM 2.2.20, Python 3. No runtime dependencies in engine.

```
gradle :engine:build
gradle :engine:run --args="300 ."
python3 tools/validate-bank.py
gradle :engine:verifyBank
```

Run Gradle from the repository root; bank generation runs there too. `tools/compile-local.sh` is an optional fallback for environments with the Kotlin 2.2.20 compiler already in Gradle's cache. It is not a Gradle wrapper.

## Engine contract

Cells are indexed 0..80 in row order. Boards are immutable lists at API boundaries. Zero means blank. LogicalSession keeps internal candidate eliminations separately from handwritten notes. `next` previews a step; `apply` accepts only the exact current deterministic step, rejecting stale/foreign steps. Source cells, unit index, placements and candidate removals provide data for visual explanations.

Hints reject values inconsistent with the verified solution. A logical hint includes prerequisite elimination steps followed by the next placement; the UI must preview and explain those steps before applying, and record the complete applied change in undo history. Never treat handwritten notes as the solver's candidates. The game-state integration is a later stage.

Difficulty is the weakest supported technique set that solves the puzzle to completion. Easy: singles; medium adds locked candidates; hard adds naked/hidden pairs. This is a product scale, not a promise of expert-level difficulty. Lower-tier solvers exhaust all available monotonic deductions before escalation.

Generation uses randomized MRV backtracking and removes clues only when the bounded solver finds exactly one solution. The independent Python validator uses Algorithm X exact cover with separate constraints and does not call the Kotlin solver. Canonical deduplication covers digit relabeling and the eight rotations/reflections, not every possible Sudoku group symmetry (band/stack permutations). Each bank task comes from its own random full-grid generation, not transformed copies.

The JSONL bank stores 81-character numeric strings rather than verbose integer arrays; Android loading must parse them using `parse`. Puzzle IDs derive from givens; do not key player progress by array position. Updating a bank must preserve active puzzle data.

## Current limits

No APK, Android module, persistence, game history, UI, analytics, advertising SDK or production ad identifiers yet. Release gating requires bank validation, device testing and the remaining handoff stages. No external puzzle collections or copied solver implementations were used.
