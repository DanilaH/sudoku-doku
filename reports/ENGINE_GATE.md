# Stage 1 gate — 2026-10-14

PASS for the engine/bank stage. This is not Android release readiness.

- 900 generated puzzles: 300 easy, 300 medium, 300 hard.
- 4,884 seeds tried; 3,984 candidates rejected or outside filled quotas.
- Every puzzle has exactly one solution, independently confirmed by Python Algorithm X.
- No duplicates under digit relabeling, rotation or reflection.
- All 900 difficulty labels rechecked by exhausting each weaker technique set.
- All 53,507 logical deductions checked against the independently validated solution: placements agree; removals never eliminate the solution digit.
- All five techniques occur in the bank, including 247 naked-pair and 180 hidden-pair steps.
- Hint checks on every puzzle: first hint, incorrect value rejection, completed board. Additional partial-board and stale-step checks on 30 puzzles.
- Empty grid correctly reports at least two solutions; contradictory givens report zero.
- Local compilation and execution: Kotlin 2.2.20 compiler, JDK 17 target. Gradle itself was unavailable locally; the Gradle build is covered by the added GitHub workflow, whose result must be checked separately.

Machine results: generation.json, validation.json, and the executable engine verification harness. Runtime timings are machine-specific. Independent validation proves uniqueness, not enjoyment or perceived difficulty. Device/UI/persistence/ad lifecycle testing belongs to subsequent stages.
