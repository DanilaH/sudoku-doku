import { useState } from "react";
import type { Game } from "../core/game";
import { archiveMonths, monthProgress } from "../core/trophies";
export function Trophy({ tier, month }: { tier: number; month: number }) {
  return (
    <svg
      className={`trophy-art tier-${tier}`}
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <path
        className="trophy-ribbon"
        d="M38 75 31 111 49 101 60 112 69 77M60 77 71 112 89 101 85 75"
      />
      <circle className="trophy-metal" cx="60" cy="49" r="37" />
      <circle className="trophy-rim" cx="60" cy="49" r="30" />
      <path
        className="trophy-cup"
        d="M45 32H75L71 53Q60 68 49 53ZM45 36H35Q35 53 49 53M75 36H85Q85 53 71 53M60 61V72M48 73H72"
      />
      <text x="60" y="48" textAnchor="middle">
        {String(month).padStart(2, "0")}
      </text>
      {tier === 3 && (
        <path
          className="trophy-spark"
          d="m99 12 3 8 8 3-8 3-3 8-3-8-8-3 8-3z"
        />
      )}
    </svg>
  );
}
export function Trophies({
  daily,
  today,
  start,
  open,
}: {
  daily: Record<string, Game>;
  today: string;
  start: string;
  open: (month: string) => void;
}) {
  const [year, setYear] = useState(today.slice(0, 4));
  const months = archiveMonths(today, start);
  const yearMonths = months.filter(m=>m.startsWith(year));
  const earned = yearMonths.filter((m) => monthProgress(daily, m).tier > 0).length;
  return (
    <section className="simple trophy-page">
      <h1>Трофеи</h1>
      <p>
        Медаль за каждый месяц. Пропущенные дни тоже можно решать.
      </p>
      <div className="trophy-rules">
        <span>
          Бронза <b>7 дней</b>
        </span>
        <span>
          Серебро <b>15 дней</b>
        </span>
        <span>
          Золото <b>Весь месяц</b>
        </span>
      </div>
      <div className="trophy-heading">
        <label>
          Год{" "}
          <select
            aria-label="Год трофеев"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {[...new Set(months.map((m) => m.slice(0, 4)))]
              .reverse()
              .map((y) => (
                <option key={y}>{y}</option>
              ))}
          </select>
        </label>
        <span>
          За {year}: {earned}/12
        </span>
      </div>
      <div key={year} className="trophy-grid">
        {months
          .filter((m) => m.startsWith(year))
          .map((month) => {
            const p = monthProgress(daily, month),
              m = Number(month.slice(5));
            const title = new Date(Number(year), m - 1, 1).toLocaleDateString(
              "ru",
              { month: "long" },
            );
            const rank = ["Не получена", "Бронза", "Серебро", "Золото"][p.tier];
            return (
              <button
                key={month}
                className={`trophy-card ${p.tier ? "earned" : ""}`}
                onClick={() => open(month)}
                aria-label={`${title} ${year}: ${rank}, ${p.solved} из ${p.total}. Открыть календарь`}
              >
                <Trophy tier={p.tier} month={m} />
                <strong>{title}</strong>
                <span>{rank}</span>
                <progress value={p.solved} max={p.total} />
                <small>
                  {p.solved}/{p.total}
                </small>
              </button>
            );
          })}
      </div>
      <p className="footnote">
        Архив с января 2025 года. Медали выдаются за решённые дни и сохраняются
        на этом устройстве.
      </p>
    </section>
  );
}
