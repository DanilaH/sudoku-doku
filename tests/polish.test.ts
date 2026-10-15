import { it, expect } from "vitest";
import { puzzles } from "../src/core/bank";
import { peers } from "../src/core/engine";
import {
  type Game,
  initialState,
  newGame,
  withGame,
  validateState,
  chooseCell,
  chooseDigit,
  input,
  travel,
  digitComplete,
} from "../src/core/game";
import { dailyPuzzle, openDaily, localDate } from "../src/core/daily";
it("migrates v1 without losing moves, notes, results or custom settings", () => {
  let g = newGame(puzzles[0]);
  g = input({ ...g, selected: g.givens.indexOf(0), noteMode: true }, 3);
  const v1: any = withGame(initialState(), g);
  v1.version = 1;
  delete v1.normal;
  delete v1.daily;
  v1.settings = { theme: "dark", conflicts: true, keepAwake: true };
  const s = validateState(v1);
  expect(s.version).toBe(2);
  expect(s.normal).toEqual(g);
  expect(s.current).toEqual(g);
  expect(s.settings).toMatchObject({
    theme: "dark",
    conflicts: true,
    sound: true,
    autoCheck: false,
  });
  expect(s.daily).toEqual({});
  expect(v1.version).toBe(1);
});
it("clears peer notes atomically and restores exact notes on undo and redo", () => {
  let g = newGame(puzzles[0]);
  const c = g.givens.indexOf(0),
    p = peers[c].find((i) => !g.givens[i])!,
    d = g.solution[c];
  g = input({ ...g, selected: p, noteMode: true }, d);
  const noted = g;
  g = input({ ...g, selected: c, noteMode: false }, d, true);
  expect(g.notes[p]).toBe(0);
  expect(g.undo).toHaveLength(2);
  const undone = travel(g);
  expect(undone.notes).toEqual(noted.notes);
  expect(undone.entries).toEqual(noted.entries);
  expect(travel(undone, true).entries).toEqual(g.entries);
  expect(() => validateState(withGame(initialState(), g))).not.toThrow();
});
it("digit-first selection is not a move, supports notes and protects givens", () => {
  let g: Game = { ...newGame(puzzles[0]), inputMode: "digit" };
  g = chooseDigit(g, 3, true);
  expect(g.undo).toHaveLength(0);
  expect(g.activeDigit).toBe(3);
  const c = g.givens.indexOf(0);
  g = chooseCell(g, c, true);
  expect(g.entries[c]).toBe(3);
  const given = g.givens.findIndex(Boolean);
  g = chooseCell(g, given, true);
  expect(g.entries[given]).toBe(0);
  expect(g.undo).toHaveLength(1);
  g = chooseCell(
    { ...g, noteMode: true },
    g.givens.findIndex((v, i) => !v && i !== c),
    true,
  );
  expect(g.notes[g.selected!]).toBe(1 << 3);
  expect(chooseDigit(g, 3, true).activeDigit).toBeNull();
});
it("nine misplaced instances never count as a completed digit", () => {
  let g = newGame(puzzles[0]);
  const d = 1;
  for (let c = 0; c < 81; c++)
    if (!g.givens[c] && g.solution[c] === d)
      g = input({ ...g, selected: c }, d);
  expect(digitComplete(g, d)).toBe(true);
  const c = g.entries.indexOf(d);
  g = input({ ...g, selected: c }, d);
  const wrong = g.givens.findIndex((v, i) => !v && g.solution[i] !== d);
  g = input({ ...g, selected: wrong }, d);
  expect(digitComplete(g, d)).toBe(false);
});
it("daily mapping is deterministic across timezone inputs and leap dates", () => {
  expect(localDate(new Date(2026, 9, 15, 23))).toBe("2026-10-15");
  expect(dailyPuzzle("2028-02-29")).toEqual(dailyPuzzle("2028-02-29"));
  expect(() => dailyPuzzle("2026-02-29")).toThrow();
  const ids = new Set(
    Array.from(
      { length: 900 },
      (_, i) =>
        dailyPuzzle(
          new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
        ).puzzle_id,
    ),
  );
  expect(ids.size).toBe(900);
  expect(() => openDaily(initialState(), "2026-10-16", "2026-10-15")).toThrow();
});
it("normal and dated slots survive switches, reloads and daily completion only once", () => {
  let g = newGame(puzzles[0]),
    s = withGame(initialState(), g);
  const normal = structuredClone(g);
  g = openDaily(s, "2026-10-15", "2026-10-15");
  for (let c = 0; c < 81; c++)
    if (!g.givens[c]) g = input({ ...g, selected: c }, g.solution[c]);
  s = withGame(s, g);
  s = withGame(s, normal);
  s = validateState(JSON.parse(JSON.stringify(s)));
  expect(s.normal).toEqual(normal);
  expect(s.daily["2026-10-15"].completed).toBe(true);
  s = withGame(s, openDaily(s, "2026-10-15", "2026-10-15"));
  expect(s.results).toHaveLength(1);
  expect(s.results[0].dailyDate).toBe("2026-10-15");
  expect(s.normal).toEqual(normal);
});
