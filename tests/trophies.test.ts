import { it, expect } from "vitest";
import { archiveMonths, monthProgress } from "../src/core/trophies";
import { dailyPuzzle, openDaily } from "../src/core/daily";
import { puzzles } from "../src/core/bank";
import {
  initialState,
  input,
  withGame,
  validateState,
  type Game,
} from "../src/core/game";
it("extends archive without changing the v1 2026 mapping", () => {
  for (let i = 0; i < 900; i++) {
    const date = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    const level = (["EASY", "MEDIUM", "HARD"] as const)[i % 3];
    expect(dailyPuzzle(date)).toEqual(
      puzzles.filter((p) => p.difficulty === level)[Math.floor(i / 3)],
    );
  }
  expect(dailyPuzzle("2025-01-01")).toBeDefined();
  expect(() => dailyPuzzle("2024-12-31")).toThrow();
  expect(archiveMonths("2026-10-15", "2025-01-01")).toHaveLength(22);
});
it("awards exact tiers, handles February, and ignores unfinished days", () => {
  const daily: Record<string, Game> = {};
  for (let i = 1; i <= 28; i++) {
    const date = `2025-02-${String(i).padStart(2, "0")}`;
    daily[date] = {
      ...openDaily(initialState(), date, "2026-10-15"),
      completed: true,
    };
    expect(monthProgress(daily, "2025-02").tier).toBe(
      i === 28 ? 3 : i >= 15 ? 2 : i >= 7 ? 1 : 0,
    );
  }
  daily["2025-02-28"].completed = false;
  expect(monthProgress(daily, "2025-02")).toMatchObject({
    tier: 2,
    solved: 27,
    target: 28,
  });
  expect(monthProgress({}, "2028-02").total).toBe(29);
});
it("earned progress survives validated saves and repeated opening", () => {
  let s = initialState(),
    g = openDaily(s, "2025-01-01", "2026-10-15");
  for (let c = 0; c < 81; c++)
    if (!g.givens[c]) g = input({ ...g, selected: c }, g.solution[c]);
  s = validateState(JSON.parse(JSON.stringify(withGame(s, g))));
  s = withGame(s, openDaily(s, "2025-01-01", "2026-10-15"));
  expect(monthProgress(s.daily, "2025-01").solved).toBe(1);
  expect(s.results).toHaveLength(1);
});
