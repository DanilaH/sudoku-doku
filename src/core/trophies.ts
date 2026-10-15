import type { Game } from "./game";
export function monthProgress(daily: Record<string, Game>, month: string) {
  const [year, m] = month.split("-").map(Number);
  const total = new Date(year, m, 0).getDate();
  const solved = Array.from(
    { length: total },
    (_, i) =>
      daily[`${month}-${String(i + 1).padStart(2, "0")}`]?.completed === true,
  ).filter(Boolean).length;
  const tier = solved === total ? 3 : solved >= 15 ? 2 : solved >= 7 ? 1 : 0;
  return {
    total,
    solved,
    tier,
    target: tier === 0 ? 7 : tier === 1 ? 15 : total,
  };
}
export function archiveMonths(today: string, start: string) {
  const months: string[] = [];
  for (
    let year = Number(start.slice(0, 4));
    year <= Number(today.slice(0, 4));
    year++
  )
    for (let m = 1; m <= 12; m++) {
      const month = `${year}-${String(m).padStart(2, "0")}`;
      if (month >= start.slice(0, 7) && month <= today.slice(0, 7))
        months.push(month);
    }
  return months;
}
