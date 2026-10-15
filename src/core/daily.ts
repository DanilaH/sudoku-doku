import { puzzles } from "./bank";
import { newGame, validDate, type State } from "./game";
export const DAILY_START = "2025-01-01";
// Keep the v1 epoch: extending the archive must never remap existing dates.
const DAILY_EPOCH = "2026-01-01";
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
/** Bank order is frozen in v1: exactly 900 dates before tasks repeat. No random seed or timezone-dependent hashing. */
export function dailyPuzzle(date: string) {
  if (!validDate(date) || date < DAILY_START) throw Error("Invalid daily date");
  const elapsed = Math.floor(
    (Date.parse(date) - Date.parse(DAILY_EPOCH)) / 86400000,
  );
  const day = ((elapsed % 900) + 900) % 900;
  const level = (["EASY", "MEDIUM", "HARD"] as const)[day % 3];
  const bank = puzzles.filter((p) => p.difficulty === level);
  return bank[Math.floor(day / 3) % bank.length];
}
export function openDaily(s: State, date: string, today = localDate()) {
  if (!validDate(date) || date > today || date < DAILY_START)
    throw Error("Daily unavailable");
  return (
    s.daily[date] ?? {
      ...newGame(dailyPuzzle(date), false, `daily-v1-${date}`),
      dailyDate: date,
    }
  );
}
