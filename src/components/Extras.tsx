import { useState } from "react";
import { monthProgress } from "../core/trophies";
import { board, type Game } from "../core/game";
export function Calendar({
  daily,
  today,
  start,
  open,
  initialMonth,
  onMonthChange,
  trophies,
}: {
  daily: Record<string, Game>;
  today: string;
  start: string;
  open: (date: string) => void;
  initialMonth?: string;
  onMonthChange?: (month: string) => void;
  trophies: () => void;
}) {
  const [month, setMonth] = useState(initialMonth ?? today.slice(0, 7));
  const progress = monthProgress(daily, month);
  const [year, m] = month.split("-").map(Number),
    days = new Date(year, m, 0).getDate(),
    offset = (new Date(year, m - 1, 1).getDay() + 6) % 7;
  const shift = (n: number) => {
    const d = new Date(year, m - 1 + n, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setMonth(next);
    onMonthChange?.(next);
  };
  return (
    <section className="simple calendar-page">
      <h1>Задача дня</h1>
      <p>
        Одно поле на дату. Обычная партия сохранится. Пропущенные дни можно
        решить позже.
      </p>
      <button className="primary" onClick={() => open(today)}>
        {daily[today]?.completed
          ? "Посмотреть результат за сегодня"
          : daily[today]
            ? "Продолжить сегодняшнюю"
            : "Играть сегодня"}{" "}
        →
      </button>
      <div className="calendar-heading">
        <button
          aria-label="Предыдущий месяц"
          disabled={month <= start.slice(0, 7)}
          onClick={() => shift(-1)}
        >
          ←
        </button>
        <h2>
          {new Date(year, m - 1, 1).toLocaleDateString("ru", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <button
          aria-label="Следующий месяц"
          disabled={month >= today.slice(0, 7)}
          onClick={() => shift(1)}
        >
          →
        </button>
      </div>
      <button className="month-reward" onClick={trophies}>
        <span>
          Медаль месяца · {progress.solved}/{progress.total}
        </span>
        <strong>
          {progress.tier === 3
            ? "Золото ✓"
            : `До ${progress.tier === 0 ? "бронзы" : progress.tier === 1 ? "серебра" : "золота"}: ${progress.target - progress.solved}`}
        </strong>
        <progress value={progress.solved} max={progress.total} />
      </button>
      <div key={month} className="calendar" aria-label="Календарь задач">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
          <small key={d}>{d}</small>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`gap-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`,
            g = daily[date];
          return (
            <button
              key={date}
              disabled={date > today || date < start}
              aria-label={`${date}${g?.completed ? ", решено" : g ? ", начато" : ""}`}
              aria-current={date === today ? "date" : undefined}
              onClick={() => open(date)}
            >
              {i + 1}
              <small>{g?.completed ? "✓" : g ? "•" : ""}</small>
            </button>
          );
        })}
      </div>
      <p className="footnote">
        ✓ решено · • начато
        <br />
        Даты определяются по времени устройства. Прогресс хранится здесь. Банк
        из 900 полей повторяется через 900 дней.
      </p>
    </section>
  );
}
export function ErrorBoard({
  game,
  cells,
  choose,
}: {
  game: Game;
  cells: number[];
  choose: (c: number) => void;
}) {
  if (!cells.length) return null;
  return (
    <>
      <div className="hint-grid error-grid" aria-label="Схема ошибок">
        {board(game).map((d, c) => (
          <button
            key={c}
            disabled={!cells.includes(c)}
            className={`${cells.includes(c) ? "bad" : ""} ${c % 9 === 2 || c % 9 === 5 ? "block-right" : ""} ${Math.floor(c / 9) === 2 || Math.floor(c / 9) === 5 ? "block-bottom" : ""}`}
            aria-label={`Строка ${Math.floor(c / 9) + 1}, столбец ${(c % 9) + 1}${cells.includes(c) ? ", ошибка" : ""}`}
            onClick={() => choose(c)}
          >
            {d || ""}
          </button>
        ))}
      </div>
      <p>Нажмите на отмеченную клетку, чтобы перейти к исправлению.</p>
    </>
  );
}
const lessons = [
  [
    "Правило девяти",
    "В каждой строке, столбце и блоке 3 × 3 цифры 1–9 встречаются один раз. Нажмите на строку: подсветка покажет её целиком.",
  ],
  [
    "Клетка → цифра",
    "Сначала выберите пустую клетку, затем цифру. Исходные цифры менять нельзя. Попробуйте поставить 3.",
  ],
  [
    "Цифра → клетки",
    "Выберите цифру один раз и нажимайте подходящие клетки. Режим удобен для поиска одной цифры по всему полю.",
  ],
  [
    "Заметки",
    "Включите заметки и отмечайте возможные цифры. Повторное нажатие убирает кандидата. Попробуйте включить и убрать 3.",
  ],
  [
    "Подсказки и отмена",
    "Подсказка объясняет логический шаг. Просмотр бесплатен: счётчик растёт только после применения. Отмена возвращает и ввод, и связанные заметки.",
  ],
] as const;
export function Tutorial({ done }: { done: () => void }) {
  const [step, setStep] = useState(0),
    [selected, setSelected] = useState(false),
    [digit, setDigit] = useState(false),
    [value, setValue] = useState(false),
    [noteMode, setNoteMode] = useState(false),
    [noteAdded, setNoteAdded] = useState(false);
  const next = () => {
    setStep(step + 1);
    setSelected(false);
    setDigit(false);
    setValue(false);
    setNoteMode(false);
    setNoteAdded(false);
  };
  return (
    <section className="simple tutorial">
      <span className="eyebrow">КАК ИГРАТЬ · {step + 1}/5</span>
      <h1>{lessons[step][0]}</h1>
      <p>{lessons[step][1]}</p>
      <div className="lesson-row" aria-label="Учебная строка">
        {[1, 2, 0, 4, 5, 6, 7, 8, 9].map((d, i) => (
          <button
            key={i}
            className={selected && (step === 0 || i === 2) ? "active" : ""}
            disabled={step !== 0 && i !== 2}
            aria-label={
              i === 2 ? "Учебная пустая клетка" : `Учебная цифра ${d}`
            }
            onClick={() => {
              setSelected(true);
              if (step === 2 && digit) setValue(!value);
            }}
          >
            {d ||
              (value ? (
                <span className={step === 3 ? "lesson-note" : ""}>3</span>
              ) : (
                ""
              ))}
          </button>
        ))}
      </div>
      {step === 3 && <><button className="text-button" aria-label="Заметки" aria-pressed={noteMode} onClick={() => setNoteMode(!noteMode)}>Заметки · {noteMode ? "Вкл" : "Выкл"}</button><p role="status">{!selected ? "Выберите пустую клетку" : !noteMode ? "Включите заметки" : value ? "Нажмите 3 ещё раз, чтобы убрать заметку" : noteAdded ? "Готово: заметка удалена" : "Нажмите 3, чтобы добавить заметку"}</p></>}
      {step > 0 && step < 4 && (
        <button
          className={`lesson-digit ${digit ? "active" : ""}`}
          aria-pressed={digit}
          disabled={(step !== 2 && !selected) || (step === 3 && !noteMode)}
          onClick={() => {
            setDigit(!digit);
            if (step !== 2) setValue(!value);
            if (step === 3) setNoteAdded(true);
          }}
        >
          3
        </button>
      )}
      {step === 4 && (
        <div className="lesson-explanation">
          <strong>Единственный кандидат</strong>
          <p>
            В учебной строке уже есть 1, 2, 4, 5, 6, 7, 8, 9. Для пустой клетки
            остаётся 3.
          </p>
          <button className="text-button" onClick={() => setValue(!value)}>
            {value ? "Отменить учебный шаг" : "Применить учебный шаг"}
          </button>
        </div>
      )}
      <button className="primary" onClick={step === 4 ? done : next}>
        {step === 4 ? "Готово" : "Дальше →"}
      </button>
      <button className="text-button" onClick={done}>
        Пропустить обучение
      </button>
      <p className="footnote">Учебные действия не меняют вашу партию.</p>
    </section>
  );
}
