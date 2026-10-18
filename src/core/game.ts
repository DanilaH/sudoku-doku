import {activityOf,legacyActivity,activityTotals,type Activity} from './activity';
import {
  bit,
  hint,
  parse,
  peers,
  valid,
  type Difficulty,
  type Hint,
  type Step,
} from "./engine";
export interface PuzzleRef {
  puzzle_id: string;
  givens: string;
  solution: string;
  difficulty: Difficulty;
}
export interface CellChange {
  cell: number;
  before: number;
  after: number;
  notesBefore: number;
  notesAfter: number;
}
export interface Move {
  kind: "input" | "erase" | "note" | "hint";
  changes: CellChange[];
}
export interface Game {
  updatedAt?: number;
  dailyDate?: string;
  inputMode?: "cell" | "digit";
  activeDigit?: number | null;
  id: string;
  puzzleId: string;
  bankVersion: number;
  givens: number[];
  solution: number[];
  difficulty: Difficulty;
  entries: number[];
  notes: number[];
  selected: number | null;
  noteMode: boolean;
  undo: Move[];
  redo: Move[];
  activeMs: number;
  hints: number;
  completed: boolean;
  replay: boolean;
}
export interface Result {
  dailyDate?: string;
  gameId: string;
  puzzleId: string;
  difficulty: Difficulty;
  activeMs: number;
  hints: number;
  completedAt: number;
  replay: boolean;
}
export interface Settings {
  theme: "system" | "light" | "dark";
  conflicts: boolean;
  keepAwake: boolean;
  sound: boolean;
  showTimer: boolean;
  largeDigits: boolean;
  highlightAreas: boolean;
  highlightSame: boolean;
  autoCheck: boolean;
  autoNotes: boolean;
}
export interface AdCaps {
  impressions: number[];
  lastWall: number;
  firstCompleted: boolean;
}
export interface State {
  profile?: {name:string;updatedAt:number};
  activity?: Activity;
  legacyActivity?: Record<Difficulty,number>;
  activeByLevel?: Record<Difficulty, number>;
  version: 2;
  revision: number;
  current: Game | null;
  normal: Game | null;
  daily: Record<string, Game>;
  results: Result[];
  settings: Settings;
  ads: AdCaps;
}
export const initialState = (): State => ({
  version: 2,
  revision: 0,
  current: null,
  normal: null,
  daily: {},
  results: [],
  settings: {
    theme: "system",
    conflicts: false,
    keepAwake: false,
    sound: true,
    showTimer: true,
    largeDigits: false,
    highlightAreas: true,
    highlightSame: true,
    autoCheck: false,
    autoNotes: true,
  },
  ads: { impressions: [], lastWall: 0, firstCompleted: false },
});
export function newGame(
  p: PuzzleRef,
  replay = false,
  id: string = crypto.randomUUID(),
): Game {
  const givens = parse(p.givens),
    solution = parse(p.solution);
  if (
    !valid(givens) ||
    !valid(solution) ||
    solution.includes(0) ||
    givens.some((d, i) => d && solution[i] !== d)
  )
    throw Error("Invalid puzzle");
  return {
    id,
    puzzleId: p.puzzle_id,
    bankVersion: 1,
    givens,
    solution,
    difficulty: p.difficulty,
    entries: Array(81).fill(0),
    notes: Array(81).fill(0),
    selected: null,
    noteMode: false,
    undo: [],
    redo: [],
    activeMs: 0,
    hints: 0,
    completed: false,
    replay,
  };
}
export const board = (g: Game) => g.givens.map((d, i) => d || g.entries[i]);
export const errors = (g: Game) =>
  g.entries.flatMap((d, i) => (d && d !== g.solution[i] ? [i] : []));
export const conflicts = (g: Game) => {
  const b = board(g);
  return b.flatMap((d, i) =>
    d && peers[i].some((p) => b[p] === d) ? [i] : [],
  );
};
function commit(
  g: Game,
  entries: number[],
  notes: number[],
  kind: Move["kind"],
): Game {
  const changes = g.entries.flatMap((before, cell) =>
    before !== entries[cell] || g.notes[cell] !== notes[cell]
      ? [
          {
            cell,
            before,
            after: entries[cell],
            notesBefore: g.notes[cell],
            notesAfter: notes[cell],
          },
        ]
      : [],
  );
  if (!changes.length) return g;
  return {
    ...g,
    entries,
    notes,
    undo: [...g.undo, { kind, changes }],
    redo: [],
    completed: board({ ...g, entries }).every((d, i) => d === g.solution[i]),
  };
}
export function input(g: Game, d: number, autoNotes = false): Game {
  if (!Number.isInteger(d) || d < 1 || d > 9) throw Error("Invalid digit");
  const c = g.selected;
  if (g.completed || c === null || g.givens[c]) return g;
  const e = [...g.entries],
    n = [...g.notes];
  if (g.noteMode) {
    if (e[c]) return g;
    n[c] ^= bit(d);
    return commit(g, e, n, "note");
  }
  e[c] = e[c] === d ? 0 : d;
  n[c] = 0;
  if (autoNotes && e[c]) for (const p of peers[c]) n[p] &= ~bit(d);
  return commit(g, e, n, "input");
}
export function erase(g: Game): Game {
  const c = g.selected;
  if (g.completed || c === null || g.givens[c]) return g;
  const e = [...g.entries],
    n = [...g.notes];
  e[c] = 0;
  n[c] = 0;
  return commit(g, e, n, "erase");
}
export function travel(g: Game, redo = false): Game {
  if (g.completed) return g;
  const from = redo ? g.redo : g.undo;
  if (!from.length) return g;
  const move = from[from.length - 1],
    e = [...g.entries],
    n = [...g.notes];
  for (const c of move.changes) {
    e[c.cell] = redo ? c.after : c.before;
    n[c.cell] = redo ? c.notesAfter : c.notesBefore;
  }
  return {
    ...g,
    entries: e,
    notes: n,
    undo: redo ? [...g.undo, move] : g.undo.slice(0, -1),
    redo: redo ? g.redo.slice(0, -1) : [...g.redo, move],
  };
}
export const gameHint = (g: Game): Hint =>
  hint(g.givens, g.entries, g.solution, g.difficulty);
export function applyHint(g: Game, steps: Step[], autoNotes = false): Game {
  if (g.completed) return g;
  const current = gameHint(g);
  if (
    current.kind !== "logical" ||
    JSON.stringify(current.steps) !== JSON.stringify(steps)
  )
    throw Error("Stale hint");
  const e = [...g.entries],
    n = [...g.notes];
  for (const s of steps) {
    for (const r of s.removals) n[r.cell] &= ~bit(r.digit);
    if (s.placement) {
      const [c, d] = s.placement;
      e[c] = d;
      n[c] = 0;
      if (autoNotes) for (const p of peers[c]) n[p] &= ~bit(d);
    }
  }
  return { ...commit(g, e, n, "hint"), hints: g.hints + 1 };
}
/** Current game and result live in one snapshot, persisted by a single atomic write. */
export function withGame(state: State, g: Game, now = Date.now()): State {
  const activity=activityOf(state), legacy=legacyActivity(state,activity);
  activity[g.id]={level:g.difficulty,ms:Math.max(activity[g.id]?.ms??0,g.activeMs)};
  const activeByLevel=activityTotals(activity,legacy);
  g={...g,updatedAt:now};
  const results = [...state.results];
  if (g.completed && !results.some((r) => r.gameId === g.id))
    results.push({
      gameId: g.id,
      puzzleId: g.puzzleId,
      difficulty: g.difficulty,
      activeMs: g.activeMs,
      hints: g.hints,
      completedAt: now,
      replay: g.replay,
      ...(g.dailyDate ? { dailyDate: g.dailyDate } : {}),
    });
  return {
    ...state,
    revision: state.revision + 1,
    current: g,
    activeByLevel,
    activity,
    legacyActivity:legacy,
    normal: g.dailyDate ? state.normal : g,
    daily: g.dailyDate ? { ...state.daily, [g.dailyDate]: g } : state.daily,
    results,
    ads: {
      ...state.ads,
      firstCompleted: state.ads.firstCompleted || g.completed,
    },
  };
}
export function nextPuzzle<T extends PuzzleRef>(
  ps: T[],
  s: State,
  l: Difficulty,
) {
  const done = new Set(
    s.results.filter((r) => !r.dailyDate).map((r) => r.puzzleId),
  );
  return ps.find((p) => p.difficulty === l && !done.has(p.puzzle_id)) ?? null;
}
export function validateState(value: unknown): State {
  const raw = value as State;
  if (!raw || ![1, 2].includes(raw.version)) throw Error("Unsupported save");
  const legacy = Number(raw.version) === 1;
  const s = structuredClone(raw);
  if (legacy) {
    if (
      !s.settings ||
      !["system", "light", "dark"].includes(s.settings.theme) ||
      typeof s.settings.conflicts !== "boolean" ||
      typeof s.settings.keepAwake !== "boolean"
    )
      throw Error("Corrupt legacy settings");
    s.version = 2;
    s.normal = s.current;
    s.daily = {};
    s.settings = { ...initialState().settings, ...s.settings };
  }
  const extra = [
    "sound",
    "showTimer",
    "largeDigits",
    "highlightAreas",
    "highlightSame",
    "autoCheck",
    "autoNotes",
  ] as const;
  if (
    extra.some((k) => typeof s.settings?.[k] !== "boolean") ||
    !s.daily ||
    Array.isArray(s.daily) ||
    typeof s.daily !== "object" ||
    !("normal" in s)
  )
    throw Error("Corrupt settings");
  const levelsForValidation=["EASY","MEDIUM","HARD"] as Difficulty[];
  const okNumber = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0;
  if (
    !s ||
    s.version !== 2 ||
    !Number.isSafeInteger(s.revision) ||
    s.revision < 0 ||
    !Array.isArray(s.results) ||
    !s.settings ||
    !["system", "light", "dark"].includes(s.settings.theme) ||
    typeof s.settings.conflicts !== "boolean" ||
    typeof s.settings.keepAwake !== "boolean" ||
    !s.ads ||
    !Array.isArray(s.ads.impressions) ||
    !s.ads.impressions.every(okNumber) ||
    !okNumber(s.ads.lastWall) ||
    typeof s.ads.firstCompleted !== "boolean"
  )
    throw Error("Unsupported or corrupt save");
  if (s.activeByLevel !== undefined && (!s.activeByLevel ||
    (["EASY","MEDIUM","HARD"] as Difficulty[]).some(l=>!okNumber(s.activeByLevel![l])))) throw Error("Corrupt activity totals");
  if(s.profile && (typeof s.profile.name!=='string'||s.profile.name.length>32||!okNumber(s.profile.updatedAt)))throw Error('Corrupt profile');
  if(s.legacyActivity && levelsForValidation.some(l=>!okNumber(s.legacyActivity![l])))throw Error('Corrupt activity');
  if(s.activity && Object.values(s.activity).some(v=>!v||!levelsForValidation.includes(v.level)||!okNumber(v.ms)))throw Error('Corrupt activity');
  const ids = new Set<string>();
  for (const r of s.results) {
    if (
      !r ||
      typeof r.gameId !== "string" ||
      ids.has(r.gameId) ||
      typeof r.puzzleId !== "string" ||
      !["EASY", "MEDIUM", "HARD"].includes(r.difficulty) ||
      !okNumber(r.activeMs) ||
      !Number.isInteger(r.hints) ||
      r.hints < 0 ||
      !okNumber(r.completedAt) ||
      typeof r.replay !== "boolean"
    )
      throw Error("Corrupt results");
    ids.add(r.gameId);
  }
  const dates = new Set<string>();
  for (const r of s.results)
    if (r.dailyDate) {
      if (!validDate(r.dailyDate) || dates.has(r.dailyDate))
        throw Error("Corrupt daily result");
      dates.add(r.dailyDate);
    }
  if (s.normal?.dailyDate) throw Error("Corrupt normal slot");
  for (const [date, g] of Object.entries(s.daily))
    if (!validDate(date) || g.dailyDate !== date)
      throw Error("Corrupt daily slot");
  if (
    s.current &&
    JSON.stringify(s.current) !==
      JSON.stringify(
        s.current.dailyDate ? s.daily[s.current.dailyDate] : s.normal,
      )
  )
    throw Error("Stale current slot");
  for (const g of [s.current, s.normal, ...Object.values(s.daily)]) {
    if (!g) continue;
    if (
      (g.dailyDate !== undefined && !validDate(g.dailyDate)) ||
      (g.inputMode !== undefined && !["cell", "digit"].includes(g.inputMode)) ||
      (g.activeDigit !== undefined &&
        g.activeDigit !== null &&
        (!Number.isInteger(g.activeDigit) ||
          g.activeDigit < 1 ||
          g.activeDigit > 9))
    )
      throw Error("Corrupt input mode");
    if (
      typeof g.id !== "string" ||
      typeof g.puzzleId !== "string" ||
      g.bankVersion !== 1 ||
      !["EASY", "MEDIUM", "HARD"].includes(g.difficulty) ||
      !valid(g.givens) ||
      !valid(g.solution) ||
      g.solution.includes(0) ||
      g.givens.some((d, i) => d && d !== g.solution[i]) ||
      !Array.isArray(g.entries) ||
      g.entries.length !== 81 ||
      g.entries.some(
        (d, i) =>
          !Number.isInteger(d) || d < 0 || d > 9 || (g.givens[i] && d !== 0),
      ) ||
      !Array.isArray(g.notes) ||
      g.notes.length !== 81 ||
      g.notes.some(
        (m, i) =>
          !Number.isInteger(m) ||
          (m & ~0x3fe) !== 0 ||
          (m && Boolean(g.givens[i] || g.entries[i])),
      ) ||
      !(
        g.selected === null ||
        (Number.isInteger(g.selected) && g.selected >= 0 && g.selected < 81)
      ) ||
      typeof g.noteMode !== "boolean" ||
      typeof g.completed !== "boolean" ||
      typeof g.replay !== "boolean" ||
      !okNumber(g.activeMs) ||
      !Number.isInteger(g.hints) ||
      g.hints < 0 ||
      !Array.isArray(g.undo) ||
      !Array.isArray(g.redo)
    )
      throw Error("Corrupt game");
    for (const move of [...g.undo, ...g.redo]) {
      if (
        !move ||
        !["input", "erase", "note", "hint"].includes(move.kind) ||
        !Array.isArray(move.changes) ||
        !move.changes.length
      )
        throw Error("Corrupt history");
      const cells = new Set<number>();
      for (const c of move.changes) {
        if (
          !Number.isInteger(c.cell) ||
          c.cell < 0 ||
          c.cell > 80 ||
          g.givens[c.cell] ||
          cells.has(c.cell) ||
          ![c.before, c.after].every(
            (d) => Number.isInteger(d) && d >= 0 && d <= 9,
          ) ||
          ![c.notesBefore, c.notesAfter].every(
            (n) => Number.isInteger(n) && (n & ~0x3fe) === 0,
          ) ||
          (c.before && c.notesBefore) ||
          (c.after && c.notesAfter)
        )
          throw Error("Corrupt history");
        cells.add(c.cell);
      }
    }
    const won = board(g).every((d, i) => d === g.solution[i]);
    if (
      won !== g.completed ||
      (g.completed && !ids.has(g.id)) ||
      (!g.completed && ids.has(g.id))
    )
      throw Error("Inconsistent completion");
    // Validate history continuity, preventing silent corruption from reappearing on undo/redo.
    for (const [history, back] of [
      [g.undo, true],
      [g.redo, false],
    ] as const) {
      const e = [...g.entries],
        n = [...g.notes];
      for (const m of [...history].reverse())
        for (const c of m.changes) {
          if (
            e[c.cell] !== (back ? c.after : c.before) ||
            n[c.cell] !== (back ? c.notesAfter : c.notesBefore)
          )
            throw Error("Broken history chain");
          e[c.cell] = back ? c.before : c.after;
          n[c.cell] = back ? c.notesBefore : c.notesAfter;
        }
    }
  }
  return structuredClone(s);
}

export function validDate(date: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
  );
}
export function digitComplete(g: Game, d: number) {
  const b = board(g);
  return (
    b.filter((n) => n === d).length === 9 &&
    b.every((n, i) => (n === d) === (g.solution[i] === d))
  );
}
export function chooseCell(g: Game, c: number, autoNotes: boolean): Game {
  const next = { ...g, selected: c };
  return g.inputMode === "digit" && g.activeDigit
    ? input(next, g.activeDigit, autoNotes)
    : next;
}
export function chooseDigit(g: Game, d: number, autoNotes: boolean): Game {
  return g.inputMode === "digit"
    ? { ...g, activeDigit: g.activeDigit === d ? null : d }
    : input(g, d, autoNotes);
}
