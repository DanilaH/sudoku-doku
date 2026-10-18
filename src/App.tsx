import { useEffect, useRef, useState, type ReactNode } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { puzzles, checkPuzzle } from "./core/bank";
import {
  levels,
  units,
  digits,
  explanation,
  type Difficulty,
  type Hint,
} from "./core/engine";
import {
  initialState,
  newGame,
  chooseCell,
  chooseDigit,
  digitComplete,
  erase,
  travel,
  applyHint,
  gameHint,
  board,
  errors,
  conflicts,
  withGame,
  nextPuzzle,
  type Game,
  type State,
} from "./core/game";
import { ActiveClock } from "./core/time";
import { adEligibility, impression } from "./core/ads";
import { SaveQueue, defaultStorage, yandexStorage } from "./platform/storage";
import { initYandex, yandex } from "./platform/yandex";
import {
  event,
  keepAwake,
  nativeLifecycle,
  prepareAd,
  showAd,
} from "./platform";
import { Native, isAndroid } from "./platform/native";
import { DAILY_START, localDate, openDaily } from "./core/daily";
import { playSound, stopSound } from "./platform/sound";
import { Trophy, Trophies } from "./components/Trophies";
import { monthProgress } from "./core/trophies";
import { Calendar, Tutorial, ErrorBoard } from "./components/Extras";
import "./style.css";
const labels: Record<Difficulty, string> = {
  EASY: "Лёгкий",
  MEDIUM: "Средний",
  HARD: "Сложный",
};
const technique: Record<string, string> = {
  NAKED_SINGLE: "Единственный кандидат",
  HIDDEN_SINGLE: "Единственное место",
  LOCKED_CANDIDATES: "Пересечение групп",
  NAKED_PAIR: "Открытая пара",
  HIDDEN_PAIR: "Скрытая пара",
};
const time = (ms: number) => {
  const t = Math.floor(ms / 1000);
  return `${Math.floor(t / 60)
    .toString()
    .padStart(2, "0")}:${(t % 60).toString().padStart(2, "0")}`;
};
type Page =
  | "home"
  | "play"
  | "settings"
  | "stats"
  | "privacy"
  | "daily"
  | "tutorial"
  | "trophies";
type Modal =
  | { kind: "difficulty" }
  | { kind: "new"; level: Difficulty; replay: boolean }
  | { kind: "hint"; value: Hint; index: number }
  | { kind: "check"; cells: number[] }
  | null;
function Glyph({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    back: <path d="m14 5-7 7 7 7" />,
    pause: (
      <>
        <path d="M9 5v14M15 5v14" />
      </>
    ),
    undo: (
      <>
        <path d="m8 4-4 4 4 4" />
        <path d="M4 8h9a6 6 0 0 1 0 12" />
      </>
    ),
    redo: (
      <>
        <path d="m16 4 4 4-4 4" />
        <path d="M20 8h-9a6 6 0 0 0 0 12" />
      </>
    ),
    erase: (
      <>
        <path d="m4 13 9-9 7 7-9 9H8zM10 7l7 7M11 20h10" />
      </>
    ),
    note: (
      <>
        <path d="m5 16 11-11 3 3L8 19l-4 1zM13 8l3 3" />
      </>
    ),
    hint: (
      <>
        <path d="M8 14a6 6 0 1 1 8 0l-1 3H9zM9 20h6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export default function Doku() {
  const [state, setState] = useState<State>(initialState),
    sref = useRef(state),
    queue = useRef<SaveQueue | null>(null);
  const [loaded, setLoaded] = useState(false),
    [failure, setFailure] = useState(""),
    [bootFailure, setBootFailure] = useState(false),
    [saving, setSaving] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<string | undefined>();
  const [page, setPage] = useState<Page>("home"),
    [modal, setModal] = useState<Modal>(null),
    [paused, setPaused] = useState(false),
    [external, setExternal] = useState(!document.hasFocus()),
    [platformPause, setPlatformPause] = useState(false),
    [adBusy, setAdBusy] = useState(false),
    [clockMs, setClockMs] = useState(0);
  const clock = useRef(new ActiveClock()),
    clockGame = useRef<string | null>(null),
    lastMono = useRef<number | null>(null),
    transition = useRef(false),
    banner = useRef<HTMLDivElement>(null),
    pending = useRef(0),
    backRef = useRef(() => {}),
    actionRef = useRef<(key: string) => void>(() => {}),
    releaseLock = useRef<() => void>(() => {});
  const [celebrated, setCelebrated] = useState<number[]>([]);
  useEffect(() => {
    if (!celebrated.length) return;
    const timer = setTimeout(() => setCelebrated([]), 450);
    return () => clearTimeout(timer);
  }, [celebrated]);
  const settingsOrigin = useRef<Page>("home"),
    tutorialOrigin = useRef<Page>("home");
  function showSettings() {
    settingsOrigin.current = page;
    setPage("settings");
  }
  function showTutorial() {
    tutorialOrigin.current = page;
    setPage("tutorial");
  }
  const game = state.current;
  const completed = Boolean(game?.completed);
  const running =
    loaded &&
    page === "play" &&
    Boolean(game) &&
    !completed &&
    !paused &&
    !external &&
    !platformPause &&
    !modal &&
    !adBusy &&
    !failure;
  function persist(next: State) {
    sref.current = next;
    setState(next);
    pending.current++;
    setSaving(true);
    const p = queue.current!.save(next);
    p.catch((e) => {
      setFailure(
        "Не удалось сохранить партию. Последнее подтверждённое сохранение осталось на устройстве.",
      );
      void event("save_failed", { code: "write" });
    }).finally(() => {
      pending.current--;
      setSaving(pending.current > 0);
    });
    return p;
  }
  function gameAction(fn: (g: Game) => Game) {
    if (failure || adBusy) return;
    const prev = sref.current.current;
    if (!prev) return;
    const timed = { ...prev, activeMs: clock.current.value(performance.now()) };
    const next = fn(timed);
    if (next === timed && timed.activeMs === prev.activeMs) return;
    const before = prev.completed;
    if (next.undo !== prev.undo) {
      const beforeBoard = board(prev),
        afterBoard = board(next);
      const groups = units.filter(
        (u) =>
          u.every((c) => afterBoard[c] === next.solution[c]) &&
          !u.every((c) => beforeBoard[c] === prev.solution[c]),
      );
      if (groups.length) setCelebrated(groups.flat());
    }
    if (state.settings.sound && !external && !platformPause && !adBusy) {
      if (next.completed && !before) playSound("win");
      else if (next.undo !== prev.undo || next.redo !== prev.redo)
        playSound(
          next.noteMode
            ? "note"
            : next.undo.at(-1)?.kind === "erase"
              ? "erase"
              : "input",
        );
      else if (
        next.noteMode !== prev.noteMode ||
        next.inputMode !== prev.inputMode ||
        next.activeDigit !== prev.activeDigit
      )
        playSound("mode");
      else if (next.selected !== prev.selected) playSound("select");
    }
    void persist(withGame(sref.current, next))
      .then(() => {
        if (next.completed && !before)
          void event("game_completed", {
            game_id: next.id,
            difficulty: next.difficulty,
            active_seconds: Math.floor(next.activeMs / 1000),
            hints: next.hints,
          });
      })
      .catch(() => {});
    setClockMs(next.activeMs);
  }
  function checkpoint() {
    const g = sref.current.current;
    if (g && !g.completed && clockGame.current === g.id) {
      const ms = clock.current.value(performance.now());
      if (ms !== g.activeMs)
        void persist(withGame(sref.current, { ...g, activeMs: ms })).catch(
          () => {},
        );
    }
  }
  useEffect(() => {
    let dead = false;
    async function boot() {
      try {
        // The Web Locks lease lasts until page unload, protecting a save from two active tabs.
        if (!isAndroid() && navigator.locks)
          await new Promise<void>((resolve, reject) => {
            void navigator.locks.request(
              "sudoku-doku-owner",
              { ifAvailable: true },
              async (lock) => {
                if (!lock) {
                  reject(
                    Error(
                      "Игра уже открыта в другой вкладке. Закройте её и обновите эту страницу.",
                    ),
                  );
                  return;
                }
                resolve();
                await new Promise<void>((r) => {
                  releaseLock.current = r;
                });
              },
            );
          });
        if (import.meta.env.MODE === "yandex") await initYandex();
        queue.current = new SaveQueue(
          import.meta.env.MODE === "yandex" ? yandexStorage : defaultStorage(),
        );
        const saved = await queue.current.load();
        if (dead) return;
        if (saved) {
          sref.current = saved;
          setState(saved);
        }
        for (const p of puzzles) checkPuzzle(p);
        setLoaded(true);
        yandex.ready();
        void prepareAd();
      } catch (e) {
        if (!dead) {
          setFailure(
            e instanceof Error && /[А-Яа-яЁё]/.test(e.message)
              ? e.message
              : "Не удалось прочитать сохранение. Данные не удалены. Попробуйте загрузить их снова.",
          );
          setBootFailure(true);
        }
      }
    }
    void boot();
    return () => {
      dead = true;
      releaseLock.current();
    };
  }, []);
  useEffect(() => {
    if (external || platformPause || adBusy || !state.settings.sound)
      stopSound();
  }, [external, platformPause, adBusy, state.settings.sound]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    const updateChrome = () =>
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          "content",
          getComputedStyle(document.documentElement)
            .getPropertyValue("--paper")
            .trim(),
        );
    updateChrome();
    const media = matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", updateChrome);
    return () => media.removeEventListener("change", updateChrome);
  }, [state.settings.theme]);
  useEffect(() => {
    if (game && clockGame.current !== game.id) {
      clockGame.current = game.id;
      clock.current = new ActiveClock(game.activeMs);
      setClockMs(game.activeMs);
    }
    clock.current.setRunning(running, performance.now());
    if (!running) {
      setClockMs(clock.current.value(performance.now()));
      checkpoint();
      const g = sref.current.current;
      if (g)
        void event("game_checkpoint", {
          game_id: g.id,
          active_seconds: Math.floor(g.activeMs / 1000),
          filled_count: board(g).filter(Boolean).length,
          hints: g.hints,
        });
    }
    yandex.gameplay(running);
    void keepAwake(running && state.settings.keepAwake).catch(() => {});
  }, [running, game?.id, state.settings.keepAwake]);
  useEffect(() => {
    const interval = setInterval(
      () => setClockMs(clock.current.value(performance.now())),
      500,
    );
    const save = setInterval(() => {
      if (running) checkpoint();
    }, 5000);
    return () => {
      clearInterval(interval);
      clearInterval(save);
    };
  }, [running]);
  useEffect(() => {
    const update = () => {
        const off = document.hidden || !document.hasFocus();
        if (off) {
          clock.current.setRunning(false, performance.now());
          checkpoint();
        }
        setExternal(off);
      },
      blur = () => update(),
      focus = () => update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    const unNative = nativeLifecycle(
      (active) => {
        if (!active) {
          clock.current.setRunning(false, performance.now());
          checkpoint();
        }
        setExternal(!active);
      },
      () => backRef.current(),
    );
    const unYG = yandex.listen(
      () => setPlatformPause(true),
      () => setPlatformPause(false),
    );
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      unNative();
      unYG();
    };
  }, [loaded]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== "Escape" && !running) return;
      if (modal) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const keys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Backspace",
        "Delete",
        "n",
        "N",
        "z",
        "Z",
        "y",
        "Y",
        "Escape",
        ...digits(0x3fe).map(String),
      ];
      if (keys.includes(e.key)) {
        e.preventDefault();
        actionRef.current(e.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running, page, modal]);
  useEffect(() => {
    const validSlot = running && window.innerHeight >= 740;
    const update = () => {
      const r = banner.current?.getBoundingClientRect();
      const visible =
        validSlot &&
        Boolean(r) &&
        r!.bottom <= window.innerHeight &&
        r!.top >= 0;
      if (isAndroid())
        void Native.banner({
          visible,
          top: r?.top ?? 0,
          viewportWidth: window.innerWidth,
          width: r?.width ?? 0,
          height: r?.height ?? 0,
          bottom: window.innerHeight - (r?.bottom ?? 0),
          left: r?.left ?? 0,
        }).catch(() => {});
      else if (import.meta.env.MODE === "yandex")
        void yandex.banner(visible).catch(() => {});
    };
    const readyListener = isAndroid()
      ? Native.addListener("adsReady", update)
      : null;
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update);
    const ro = new ResizeObserver(update);
    if (banner.current) ro.observe(banner.current);
    return () => {
      if (readyListener) void readyListener.then((l) => l.remove());
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      if (isAndroid())
        void Native.banner({
          visible: false,
          top: 0,
          viewportWidth: window.innerWidth,
          width: 0,
          height: 0,
          bottom: 0,
          left: 0,
        }).catch(() => {});
      else void yandex.banner(false).catch(() => {});
    };
  }, [running, page]);
  function back() {
    if (adBusy) return;
    if (modal) {
      setModal(null);
      return;
    }
    if (page === "home") {
      if (isAndroid()) void CapacitorApp.exitApp();
      return;
    }
    if (page === "settings") {
      setPage(settingsOrigin.current);
      return;
    }
    if (page === "tutorial") {
      setPage(tutorialOrigin.current);
      return;
    }
    if (page === "privacy") {
      setPage("settings");
      return;
    }
    setPaused(false);
    setPage("home");
  }
  backRef.current = back;
  actionRef.current = (key) => {
    if (key === "Escape") {
      back();
      return;
    }
    if (!running) return;
    const g = sref.current.current!;
    if (/^[1-9]$/.test(key))
      gameAction((g) => chooseDigit(g, Number(key), state.settings.autoNotes));
    else if (key === "Backspace" || key === "Delete") gameAction(erase);
    else if (key.toLowerCase() === "n")
      gameAction((g) => ({ ...g, noteMode: !g.noteMode }));
    else if (key.toLowerCase() === "z") gameAction((g) => travel(g));
    else if (key.toLowerCase() === "y") gameAction((g) => travel(g, true));
    else if (key.startsWith("Arrow")) {
      const c = g.selected ?? 40,
        r = Math.floor(c / 9),
        col = c % 9;
      const next =
        key === "ArrowUp"
          ? Math.max(0, r - 1) * 9 + col
          : key === "ArrowDown"
            ? Math.min(8, r + 1) * 9 + col
            : key === "ArrowLeft"
              ? r * 9 + Math.max(0, col - 1)
              : r * 9 + Math.min(8, col + 1);
      gameAction((g) => ({ ...g, selected: next }));
      document
        .querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)
        ?.focus();
    }
  };
  function start(level: Difficulty, replay = false) {
    if (failure) return;
    const p =
      nextPuzzle(puzzles, sref.current, level) ??
      (replay ? puzzles.find((p) => p.difficulty === level) : null);
    if (!p) {
      setModal({ kind: "new", level, replay: true });
      return;
    }
    const g = newGame(p, replay);
    clock.current = new ActiveClock();
    clockGame.current = g.id;
    setClockMs(0);
    void persist(withGame(sref.current, g)).catch(() => {});
    setModal(null);
    setPaused(false);
    setPage("play");
    void event("game_started", {
      game_id: g.id,
      puzzle_id: g.puzzleId,
      difficulty: g.difficulty,
      replay,
      bank_version: 1,
    });
  }
  function requestNew(level: Difficulty) {
    if (state.normal && !state.normal.completed) {
      setModal({ kind: "new", level, replay: false });
      return;
    }
    start(level);
  }
  async function leaveResult(target: "home" | "new") {
    if (transition.current || failure) return;
    transition.current = true;
    setAdBusy(true);
    try {
      await queue.current!.flush();
      const wall = Date.now(),
        reason = adEligibility(
          sref.current.ads,
          sref.current.results.length,
          wall,
          performance.now(),
          lastMono.current,
        );
      void event("ad_opportunity", {
        placement: "result",
        eligible: reason === "eligible",
        reason,
      });
      if (reason === "eligible")
        await showAd(() => {
          lastMono.current = performance.now();
          void persist({
            ...sref.current,
            revision: sref.current.revision + 1,
            ads: impression(sref.current.ads, Date.now()),
          }).catch(() => {});
        });
      if (target === "new") start(game!.difficulty);
      else setPage("home");
    } catch {
      setFailure("Не удалось сохранить результат. Повторите сохранение.");
    } finally {
      transition.current = false;
      setAdBusy(false);
    }
  }
  function resume(g: Game) {
    clock.current.setRunning(false, performance.now());
    checkpoint();
    void persist(
      withGame(
        sref.current,
        sref.current.current?.id === g.id ? sref.current.current : g,
      ),
    ).catch(() => {});
    setPaused(false);
    setPage("play");
  }
  function daily(date: string) {
    setCalendarMonth(date.slice(0, 7));
    resume(openDaily(sref.current, date));
  }
  function settings(patch: Partial<State["settings"]>) {
    void persist({
      ...sref.current,
      revision: sref.current.revision + 1,
      settings: { ...sref.current.settings, ...patch },
    }).catch(() => {});
  }
  const b = game ? board(game) : [],
    selected = game?.selected ?? null,
    related =
      selected === null ? [] : units.filter((u) => u.includes(selected)).flat(),
    bad = game
      ? [
          ...(state.settings.conflicts ? conflicts(game) : []),
          ...(state.settings.autoCheck ? errors(game) : []),
        ]
      : [];
  if (!loaded)
    return (
      <main className="boot">
        <img src="./icon.svg" width="80" />
        <h1>Судоку</h1>
        <p>{failure || "Готовим поле…"}</p>
        {failure && (
          <button onClick={() => location.reload()}>Повторить загрузку</button>
        )}
      </main>
    );
  return (
    <main
      onClickCapture={(e) => {
        const target = (e.target as HTMLElement).closest("button");
        if (
          target &&
          !target.disabled &&
          !target.closest(".board,.game-controls,.error-grid,.hint-grid") &&
          state.settings.sound &&
          !external &&
          !platformPause &&
          !adBusy
        )
          playSound("mode");
      }}
      className={`app page-${page} ${page === "play" ? "game-page" : ""} ${isAndroid() || import.meta.env.MODE === "yandex" ? "monetized" : ""} ${state.settings.largeDigits ? "large-digits" : ""}`}
    >
      <header className="top">
        <button
          className="icon-button"
          onClick={page === "home" ? showSettings : back}
          aria-label={
            page === "home"
              ? "Настройки"
              : (page === "settings" && settingsOrigin.current === "play") ||
                  page === "tutorial" ||
                  page === "privacy"
                ? "Назад"
                : "На главную"
          }
        >
          <Glyph name={page === "home" ? "settings" : "back"} />
        </button>
        <span className="wordmark">Судоку</span>
        <span className="save-status" role="status" aria-live="off">
          {saving ? "Сохраняем…" : "Сохранено"}
        </span>
        {page === "play" && game && !completed && (
          <button
            className="icon-button"
            aria-label="Пауза"
            onClick={() => {
              clock.current.setRunning(false, performance.now());
              setClockMs(clock.current.value(performance.now()));
              checkpoint();
              setPaused(true);
            }}
          >
            <Glyph name="pause" />
          </button>
        )}
        {page === "play" && (
          <button
            className="icon-button"
            aria-label="Настройки"
            onClick={showSettings}
          >
            <Glyph name="settings" />
          </button>
        )}
      </header>
      {failure && (
        <aside className="error" role="alert">
          <p>{failure}</p>
          <button
            onClick={() => {
              if (bootFailure) {
                location.reload();
                return;
              }
              void queue
                .current!.save(sref.current)
                .then(() => setFailure(""))
                .catch(() => {});
            }}
          >
            Повторить сохранение
          </button>
        </aside>
      )}
      <div className="screen-viewport">
        <div
          key={page}
          className={`screen-content ${page === "home" ? "screen-back" : ""}`}
        >
          {page === "home" && (
            <section className="home">
              <div className="intro"><h1>Судоку</h1></div>
              <div className="home-columns">
                <section className="session-card new-game">
                  {state.normal && !state.normal.completed ? <>
                    <div className="saved-overview">
                      <BoardPreview game={state.normal} />
                      <div><span className="eyebrow">ВАША ПАРТИЯ</span>
                        <h2>{labels[state.normal.difficulty]} уровень</h2>
                        <span>{time(state.normal.activeMs)}</span>
                        <p className="preview-caption">Сохранённое поле</p>
                      </div>
                    </div>
                    <SessionProgress game={state.normal} />
                    <button className="primary continue" disabled={Boolean(failure)} onClick={() => resume(state.normal!)}>Продолжить партию <span>→</span></button>
                    <button className="primary secondary" disabled={Boolean(failure)} onClick={() => setModal({kind:"difficulty"})}>Новая игра</button>
                  </> : <>
                    <div className="welcome-illustration" aria-hidden="true"><BoardPreview /></div>
                    <button className="primary" disabled={Boolean(failure)} onClick={() => setModal({kind:"difficulty"})}>Новая игра <span>→</span></button>
                    <p className="footnote">900 задач · 3 уровня сложности</p>
                  </>}
                </section>
                <section className="daily-panel">
                  <div className="daily-heading"><span className="date-badge" aria-hidden="true"><small>{new Date().toLocaleDateString("ru",{month:"short"})}</small>{new Date().getDate()}</span><div><h2>Задача дня</h2><p>{new Date().toLocaleDateString("ru",{day:"numeric",month:"long"})}</p></div></div>
                  <button className="primary secondary" onClick={() => daily(localDate())}>{state.daily[localDate()]?.completed ? "Результат за сегодня" : state.daily[localDate()] ? "Продолжить задачу дня" : "Играть сегодня"}</button>
                  <button className="calendar-link" onClick={() => {setCalendarMonth(undefined);setPage("daily");}}>Календарь задач <span>→</span></button>
                  <button className="home-medal" onClick={() => setPage("trophies")}>
                    <Trophy tier={monthProgress(state.daily, localDate().slice(0,7)).tier} month={new Date().getMonth()+1} />
                    <span><strong>Медаль месяца</strong><small>{monthProgress(state.daily, localDate().slice(0,7)).tier === 3 ? "Золото получено" : `До ${["бронзы","серебра","золота"][monthProgress(state.daily, localDate().slice(0,7)).tier]}: ${monthProgress(state.daily, localDate().slice(0,7)).target - monthProgress(state.daily, localDate().slice(0,7)).solved} задач`}</small><small>{monthProgress(state.daily, localDate().slice(0,7)).solved} из {monthProgress(state.daily, localDate().slice(0,7)).total} дней решено</small></span>
                  </button>
                </section>
              </div>
              <nav className="home-links">
                <button onClick={showTutorial}>Как играть</button>
                <button onClick={() => setPage("stats")}>Статистика</button>
                <button onClick={() => setPage("trophies")}>Трофеи</button>
                <button onClick={showSettings}>Настройки</button>
              </nav>
            </section>
          )}

          {page === "play" && game && (
            <section className="play">
              <div className="game-heading">
                {!completed && game.selected === null && <p className="start-instruction">{game.inputMode === "digit" ? "Выберите цифру, затем нажимайте пустые клетки" : "Выберите пустую клетку, затем цифру"}</p>}
                <div>
                  <span className="eyebrow">
                    {game.dailyDate ? `${game.dailyDate} · ` : ""}
                    {labels[game.difficulty]}
                    {game.replay ? " · повтор" : ""}
                  </span>
                </div>
                <div className="clock">
                  {state.settings.showTimer && (
                    <span aria-label="Активное время">
                      {time(completed ? game.activeMs : clockMs)}
                    </span>
                  )}
                </div>
              </div>
              <div className="game-layout">
                <div className="board-wrap">
                  <div
                    className={`board ${paused || external || platformPause ? "hidden-board" : ""}`}
                    role="group"
                    aria-label="Поле судоку 9 на 9"
                  >
                    {b.map((d, c) => {
                      const focusDigit =
                          game.inputMode === "digit"
                            ? game.activeDigit
                            : selected === null
                              ? null
                              : b[selected],
                        same =
                          state.settings.highlightSame &&
                          Boolean(focusDigit) &&
                          d === focusDigit,
                        classes = [
                          "cell",
                          celebrated.includes(c) ? "group-complete" : "",
                          game.givens[c] ? "given" : "entry",
                          state.settings.highlightAreas && related.includes(c)
                            ? "related"
                            : "",
                          same ? "same" : "",
                          selected === c ? "selected" : "",
                          bad.includes(c) ? "bad" : "",
                          c % 9 === 2 || c % 9 === 5 ? "block-right" : "",
                          Math.floor(c / 9) === 2 || Math.floor(c / 9) === 5
                            ? "block-bottom"
                            : "",
                        ].join(" ");
                      return (
                        <button
                          key={c}
                          data-cell={c}
                          className={classes}
                          disabled={!running || Boolean(failure)}
                          tabIndex={
                            selected === c || (selected === null && c === 0)
                              ? 0
                              : -1
                          }
                          aria-pressed={selected === c}
                          aria-label={`Строка ${Math.floor(c / 9) + 1}, столбец ${(c % 9) + 1}, ${d ? `цифра ${d}${game.givens[c] ? ", исходная" : ""}` : `пусто${game.notes[c] ? `, заметки ${digits(game.notes[c]).join(", ")}` : ""}`}${bad.includes(c) ? ", конфликт" : ""}`}
                          onClick={() =>
                            gameAction((g) =>
                              chooseCell(g, c, state.settings.autoNotes),
                            )
                          }
                        >
                          {d ? (
                            <span key={d}>{d}</span>
                          ) : (
                            <span className="notes">
                              {Array.from({ length: 9 }, (_, i) => (
                                <i key={i}>
                                  {game.notes[c] & (1 << (i + 1)) ? i + 1 : ""}
                                </i>
                              ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {!completed && (paused || external || platformPause) && (
                    <div className="pause-cover">
                      <Glyph name="pause" />
                      <h2>Пауза</h2>
                      <p>Время остановлено</p>
                      <button
                        className="primary"
                        onClick={() => {
                          setPaused(false);
                          setExternal(document.hidden);
                          setPlatformPause(false);
                        }}
                        disabled={platformPause}
                      >
                        Продолжить
                      </button>
                    </div>
                  )}
                </div>
                <div className="game-controls">
                  {completed ? (
                    <div className="result">
                      <div className="win-mark" aria-hidden="true">
                        <Glyph name="check" />
                      </div>
                      <h2>Судоку решено</h2>
                      <p className="result-caption">
                        Все цифры на своих местах.
                      </p>
                      {game.dailyDate &&
                        (() => {
                          const p = monthProgress(
                            state.daily,
                            game.dailyDate.slice(0, 7),
                          );
                          return (
                            <button
                              className="month-reward"
                              onClick={() => setPage("trophies")}
                            >
                              <span>
                                Месяц: {p.solved}/{p.total}
                              </span>
                              <strong>
                                {p.solved === 7
                                  ? "Бронзовая медаль получена"
                                  : p.solved === 15
                                    ? "Серебряная медаль получена"
                                    : p.tier === 3
                                      ? "Золотая медаль получена"
                                      : `До следующей медали: ${p.target - p.solved}`}
                              </strong>
                              <progress value={p.solved} max={p.total} />
                            </button>
                          );
                        })()}
                      <dl>
                        <div>
                          <dt>Активное время</dt>
                          <dd>{time(game.activeMs)}</dd>
                        </div>
                        <div>
                          <dt>Подсказки</dt>
                          <dd>{game.hints}</dd>
                        </div>
                        <div>
                          <dt>Сложность</dt>
                          <dd>{labels[game.difficulty]}</dd>
                        </div>
                      </dl>
                      <button
                        className="primary"
                        disabled={saving || adBusy || Boolean(failure)}
                        onClick={() =>
                          game.dailyDate
                            ? setPage("daily")
                            : void leaveResult("new")
                        }
                      >
                        {game.dailyDate ? "К календарю →" : "К новой игре →"}
                      </button>
                      <button
                        className="text-button"
                        disabled={adBusy || Boolean(failure)}
                        onClick={() => void leaveResult("home")}
                      >
                        На главную
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="tools">
                        <button
                          onClick={() => gameAction((g) => travel(g))}
                          disabled={!running || !game.undo.length}
                        >
                          <Glyph name="undo" />
                          <span>Отмена</span>
                        </button>
                        <button
                          onClick={() => gameAction(erase)}
                          disabled={
                            !running ||
                            selected === null ||
                            Boolean(game.givens[selected])
                          }
                        >
                          <Glyph name="erase" />
                          <span>Стереть</span>
                        </button>
                        <button
                          aria-label="Заметки"
                          aria-pressed={game.noteMode}
                          onClick={() =>
                            gameAction((g) => ({ ...g, noteMode: !g.noteMode }))
                          }
                          disabled={!running}
                        >
                          <span className="note-state" aria-hidden="true">
                            {game.noteMode ? "Вкл" : "Выкл"}
                          </span>
                          <Glyph name="note" />
                          <span>Заметки</span>
                        </button>
                        <button
                          disabled={!running}
                          onClick={() => {
                            const h = gameHint(game);
                            setModal({ kind: "hint", value: h, index: 0 });
                            void event("hint_used", {
                              technique:
                                h.kind === "logical"
                                  ? h.steps.at(-1)!.technique
                                  : "none",
                              applied: false,
                            });
                          }}
                        >
                          <Glyph name="hint" />
                          <span>Подсказка</span>
                        </button>
                      </div>
                      <p className="input-caption">
                        {game.noteMode
                          ? "Заметки включены — отмечайте кандидатов"
                          : game.inputMode === "digit"
                            ? game.activeDigit
                              ? `Цифра ${game.activeDigit} выбрана — нажимайте клетки`
                              : "Выберите цифру, затем клетки"
                            : selected === null
                              ? "Выберите клетку, затем цифру"
                              : game.givens[selected]
                                ? "Исходная цифра — менять нельзя"
                                : `Строка ${Math.floor(selected / 9) + 1}, столбец ${(selected % 9) + 1}`}
                      </p>
                      <div className="numpad" aria-label="Ввод цифр">
                        {digits(0x3fe).map((d) => (
                          <button
                            key={d}
                            disabled={
                              !running ||
                              (game.inputMode !== "digit" &&
                                (selected === null ||
                                  Boolean(game.givens[selected])))
                            }
                            onClick={() =>
                              gameAction((g) =>
                                chooseDigit(g, d, state.settings.autoNotes),
                              )
                            }
                            aria-label={`Ввести ${d}`}
                            aria-pressed={
                              game.inputMode === "digit" &&
                              game.activeDigit === d
                            }
                            className={`${game.noteMode ? "pencil" : ""} ${digitComplete(game, d) ? "digit-complete" : ""}`}
                          >
                            {d}
                            <small>
                              {digitComplete(game, d)
                                ? "✓"
                                : Math.max(
                                    0,
                                    9 - b.filter((n) => n === d).length,
                                  )}
                            </small>
                          </button>
                        ))}
                      </div>
                      <div className="secondary-tools">
                        <details className="mode-picker">
                          <summary aria-label="Режим ввода">
                            {game.inputMode === "digit"
                              ? "Цифра → клетки"
                              : "Клетка → цифра"}{" "}
                            <span>⌄</span>
                          </summary>
                          <div
                            className="input-modes"
                            role="group"
                            aria-label="Способ ввода"
                          >
                            {(["cell", "digit"] as const).map((mode) => (
                              <button
                                key={mode}
                                disabled={!running}
                                aria-pressed={
                                  (game.inputMode ?? "cell") === mode
                                }
                                onClick={(e) => {
                                  gameAction((g) => ({
                                    ...g,
                                    inputMode: mode,
                                  }));
                                  e.currentTarget
                                    .closest("details")
                                    ?.removeAttribute("open");
                                }}
                              >
                                {mode === "cell"
                                  ? "Клетка → цифра"
                                  : "Цифра → клетки"}
                              </button>
                            ))}
                          </div>
                        </details>
                        <button
                          disabled={!running || !game.redo.length}
                          onClick={() => gameAction((g) => travel(g, true))}
                        >
                          <Glyph name="redo" />
                          <span>Повтор</span>
                        </button>
                        <button
                          disabled={!running}
                          onClick={() =>
                            setModal({ kind: "check", cells: errors(game) })
                          }
                        >
                          <Glyph name="check" />
                          <span>Проверить</span>
                        </button>
                      </div>
                      {b.every(Boolean) && !completed && (
                        <p className="full-warning" role="status">
                          Поле заполнено, но есть ошибки.{" "}
                          <button
                            onClick={() =>
                              setModal({ kind: "check", cells: errors(game) })
                            }
                          >
                            Показать
                          </button>
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              {(isAndroid() || import.meta.env.MODE === "yandex") &&
                !completed && (
                  <div
                    ref={banner}
                    className="ad-slot"
                    aria-label="Место для рекламы"
                  >
                    <span>Реклама</span>
                  </div>
                )}
            </section>
          )}
          {page === "settings" && (
            <section className="simple">
              <h1>Настройки</h1>
              <h2>Оформление</h2>
              <div className="levels" aria-label="Цветовая тема">
                {(["system", "light", "dark"] as const).map((t, i) => (
                  <button
                    key={t}
                    aria-pressed={state.settings.theme === t}
                    className={state.settings.theme === t ? "active" : ""}
                    onClick={() => settings({ theme: t })}
                  >
                    {["Как в системе", "Светлое", "Тёмное"][i]}
                  </button>
                ))}
              </div>
              {(
                [
                  [
                    "Экран",
                    [
                      [
                        "largeDigits",
                        "Крупные цифры",
                        "Увеличить цифры на поле",
                      ],
                      [
                        "showTimer",
                        "Показывать таймер",
                        "При скрытом таймере время тоже учитывается",
                      ],
                      [
                        "keepAwake",
                        "Не выключать экран",
                        "Только во время активной игры",
                      ],
                    ],
                  ],
                  [
                    "Подсветка",
                    [
                      [
                        "highlightAreas",
                        "Строка, столбец и блок",
                        "Области выбранной клетки",
                      ],
                      [
                        "highlightSame",
                        "Одинаковые цифры",
                        "Все вхождения выбранной цифры",
                      ],
                      [
                        "conflicts",
                        "Подсвечивать конфликты",
                        "Повторы в строке, столбце или блоке",
                      ],
                      [
                        "autoCheck",
                        "Проверять ввод по решению",
                        "Неверные цифры подчёркиваются сразу",
                      ],
                    ],
                  ],
                  [
                    "Управление",
                    [
                      [
                        "autoNotes",
                        "Убирать связанные заметки",
                        "Ввод убирает эту цифру из заметок соседних клеток. Отмена возвращает их.",
                      ],
                      ["sound", "Звуки", "Отклик на ввод и действия"],
                    ],
                  ],
                ] as const
              ).map(([title, items]) => (
                <section className="settings-group" key={title}>
                  <h2>{title}</h2>
                  {items.map(([key, label, description]) => (
                    <label className="setting" key={key}>
                      <span>
                        <strong>{label}</strong>
                        <small>{description}</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={state.settings[key]}
                        onChange={(e) => settings({ [key]: e.target.checked })}
                      />
                    </label>
                  ))}
                </section>
              ))}
              <button className="text-button" onClick={showTutorial}>
                Как играть →
              </button>
              <h2>Управление с клавиатуры</h2>
              <p className="help">
                Стрелки — выбор клетки. 1–9 — ввод.
                <br />N — заметки. Delete — стереть.
                <br />Z — отменить. Y — повторить. Esc — назад.
              </p>
              <button
                className="text-button"
                onClick={() => setPage("privacy")}
              >
                Конфиденциальность и данные →
              </button>
              <p className="footnote">Версия 0.5 · Банк 1</p>
            </section>
          )}
          {page === "stats" && (
            <section className="simple">
              <h1>Статистика</h1>
              <div className="total">
                <strong>
                  {state.results.filter((r) => !r.dailyDate).length}
                </strong>
                <span>решённых партий</span>
              </div>
              {levels.map((l) => {
                const rs = state.results.filter(
                  (r) => !r.dailyDate && r.difficulty === l,
                );
                const best = (hints: boolean) => {
                  const filtered = rs.filter((r) => r.hints > 0 === hints);
                  return filtered.length
                    ? time(Math.min(...filtered.map((r) => r.activeMs)))
                    : "—";
                };
                return (
                  <div className="stats-row" key={l}>
                    <h2>
                      {labels[l]} <small>{rs.length} решено</small>
                    </h2>
                    <dl>
                      <div>
                        <dt>Лучшее без подсказок</dt>
                        <dd>{best(false)}</dd>
                      </div>
                      <div>
                        <dt>С подсказками</dt>
                        <dd>{best(true)}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
              <div className="total daily-total">
                <strong>
                  {state.results.filter((r) => r.dailyDate).length}
                </strong>
                <span>ежедневных задач решено</span>
              </div>
              <p className="footnote">
                Результаты хранятся на этом устройстве.
                <br />
                Время рекламы и пауз не учитывается.
              </p>
            </section>
          )}
          {page === "daily" && (
            <Calendar
              daily={state.daily}
              today={localDate()}
              start={DAILY_START}
              open={daily}
              initialMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
              trophies={() => setPage("trophies")}
            />
          )}
          {page === "trophies" && (
            <Trophies
              daily={state.daily}
              today={localDate()}
              start={DAILY_START}
              open={(month) => {
                setCalendarMonth(month);
                setPage("daily");
              }}
            />
          )}
          {page === "tutorial" && <Tutorial done={back} />}
          {page === "privacy" && (
            <section className="simple">
              <h1>Конфиденциальность</h1>
              <p>
                Партия, заметки, настройки и статистика сохраняются на
                устройстве. Удаление приложения или данных браузера может
                удалить прогресс.
              </p>
              <p>
                Обычная веб-версия не отправляет игровую аналитику и не
                подключает рекламные сети.
              </p>
              <p>
                Android-версия использует Yandex Mobile Ads для рекламы.
                AppMetrica включается только при настроенном ключе приложения и
                собирает технические сведения, события игры и ошибки. Геолокация
                и контакты не запрашиваются. Рекламный SDK может обрабатывать
                рекламный идентификатор, сведения об устройстве и сетевом
                подключении.
              </p>
              <p>
                В Яндекс Играх применяются SDK платформы, её реклама и правила
                обработки данных.
              </p>
              <p>
                <a
                  href="https://yandex.ru/legal/confidential/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Политика конфиденциальности Яндекса
                </a>
              </p>
              <p className="footnote">
                Политика владельца и контакт для обращений должны быть указаны
                перед публикацией приложения.
              </p>
            </section>
          )}
        </div>
      </div>
      {modal && (
        <ModalView close={() => setModal(null)}>
          <>
            {modal.kind === "difficulty" ? (
              <>
                <h2>Выберите сложность</h2>
                <div className="difficulty-list">{levels.map(level => <button key={level} onClick={() => requestNew(level)}>{labels[level]} <span>→</span></button>)}</div>
              </>
            ) : modal.kind === "new" ? (
              <>
                <span className="eyebrow">НОВАЯ ПАРТИЯ</span>
                <h2>
                  {modal.replay
                    ? "Все задачи уровня решены."
                    : "Заменить текущую партию?"}
                </h2>
                <p>
                  {modal.replay
                    ? "Можно повторить задачи этого уровня. Повторы учитываются как отдельные партии."
                    : "Текущее поле и его заметки будут заменены. Решённые партии останутся в статистике."}
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    if (game && !game.completed)
                      void event("game_replaced", { game_id: game.id });
                    start(modal.level, modal.replay);
                  }}
                >
                  {modal.replay ? "Начать повтор" : "Заменить и начать"}
                </button>
                <button className="text-button" onClick={() => setModal(null)}>
                  Отмена
                </button>
              </>
            ) : modal.kind === "check" ? (
              <>
                <span className="eyebrow">ПРОВЕРКА</span>
                <h2>
                  {modal.cells.length
                    ? "Есть неверные цифры."
                    : "Ошибок не найдено."}
                </h2>
                <p>
                  {modal.cells.length
                    ? `Проверьте клетки: ${modal.cells.map((c) => `(${Math.floor(c / 9) + 1}, ${(c % 9) + 1})`).join(", ")}. Первая цифра — строка, вторая — столбец.`
                    : "Все заполненные клетки совпадают с решением. Продолжайте в своём темпе."}
                </p>
                <ErrorBoard
                  game={game!}
                  cells={modal.cells}
                  choose={(c) => {
                    gameAction((g) => ({ ...g, selected: c }));
                    setModal(null);
                  }}
                />
                <button
                  className="primary"
                  onClick={() => {
                    if (modal.cells.length)
                      gameAction((g) => ({ ...g, selected: modal.cells[0] }));
                    setModal(null);
                  }}
                >
                  Вернуться к полю
                </button>
              </>
            ) : modal.value.kind === "logical" ? (
              <HintView
                value={modal.value}
                index={modal.index}
                game={game!}
                onNext={() => setModal({ ...modal, index: modal.index + 1 })}
                apply={() => {
                  gameAction((g) =>
                    applyHint(
                      g,
                      modal.value.kind === "logical" ? modal.value.steps : [],
                      state.settings.autoNotes,
                    ),
                  );
                  void event("hint_used", {
                    technique:
                      modal.value.kind === "logical"
                        ? modal.value.steps.at(-1)!.technique
                        : "none",
                    applied: true,
                  });
                  setModal(null);
                }}
              />
            ) : (
              <>
                <h2>
                  {modal.value.kind === "incorrect"
                    ? "Сначала исправим ввод."
                    : modal.value.kind === "complete"
                      ? "Поле уже решено."
                      : "Шаг не найден."}
                </h2>
                <p>
                  {modal.value.kind === "incorrect"
                    ? `Неверные цифры в клетках ${modal.value.cells.map((c) => `(${Math.floor(c / 9) + 1}, ${(c % 9) + 1})`).join(", ")}. Подсказка появится после исправления.`
                    : "Попробуйте проверку поля."}
                </p>
                {modal.value.kind === "incorrect" && (
                  <ErrorBoard
                    game={game!}
                    cells={modal.value.cells}
                    choose={(c) => {
                      gameAction((g) => ({ ...g, selected: c }));
                      setModal(null);
                    }}
                  />
                )}
                <button
                  className="primary"
                  onClick={() => {
                    if (modal.value.kind === "incorrect")
                      gameAction((g) => ({
                        ...g,
                        selected:
                          modal.value.kind === "incorrect"
                            ? modal.value.cells[0]
                            : g.selected,
                      }));
                    setModal(null);
                  }}
                >
                  К полю
                </button>
              </>
            )}
          </>
        </ModalView>
      )}
      {adBusy && (
        <div className="transition" role="status">
          Переходим…
        </div>
      )}
    </main>
  );
}
function ModalView({
  children,
  close,
}: {
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => prev?.focus();
  }, []);
  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Диалог игры"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
          if (e.key === "Tab") {
            const els = ref.current!.querySelectorAll<HTMLElement>(
              "button:not(:disabled),a,input",
            );
            if (!els.length) return;
            const first = els[0],
              last = els[els.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <button
          className="modal-close"
          aria-label="Закрыть диалог"
          onClick={close}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
function HintView({
  value,
  index,
  game,
  onNext,
  apply,
}: {
  value: Extract<Hint, { kind: "logical" }>;
  index: number;
  game: Game;
  onNext: () => void;
  apply: () => void;
}) {
  const s = value.steps[index],
    b = board(game);
  return (
    <>
      <span className="eyebrow">
        ПОДСКАЗКА · {index + 1}/{value.steps.length}
      </span>
      <h2>{technique[s.technique]}</h2>
      <p>{explanation(s)}</p>
      <div className="hint-grid" aria-label="Схема логического шага">
        {b.map((d, c) => (
          <span
            key={c}
            className={`${s.sourceCells.includes(c) ? "source" : ""} ${s.removals.some((r) => r.cell === c) ? "removal" : ""} ${s.unitIndex !== null && units[s.unitIndex].includes(c) ? "hint-unit" : ""} ${c % 9 === 2 || c % 9 === 5 ? "block-right" : ""} ${Math.floor(c / 9) === 2 || Math.floor(c / 9) === 5 ? "block-bottom" : ""}`}
          >
            {d ||
              (s.sourceCells.includes(c)
                ? s.digits.join("·")
                : s.removals
                    .filter((r) => r.cell === c)
                    .map((r) => r.digit)
                    .join("·"))}
          </span>
        ))}
      </div>
      <p className="hint-legend">
        Обводка — основание шага. Перечёркнутые цифры — исключения.
      </p>
      {index < value.steps.length - 1 ? (
        <button className="primary" onClick={onNext}>
          Следующий шаг →
        </button>
      ) : (
        <button className="primary" onClick={apply}>
          Применить подсказку
        </button>
      )}
    </>
  );
}

function BoardPreview({game}: {game?: Game}) {
  const cells = game ? board(game) : Array.from(puzzles[0].givens, Number);
  return <div className="board-preview" aria-hidden="true">{Array.from(cells).map((digit, i) => <span key={i} className={`${i%9===2 || i%9===5 ? "block-right" : ""} ${Math.floor(i/9)===2 || Math.floor(i/9)===5 ? "block-bottom" : ""}`}>{digit || ""}</span>)}</div>;
}
function SessionProgress({game}: {game: Game}) {
  const values = board(game), total = game.givens.filter(d => !d).length;
  const filled = values.filter((d,i) => !game.givens[i] && d === game.solution[i]).length;
  if (!filled) return null;
  return <div className="session-progress"><progress value={filled} max={total} aria-label="Решено пустых клеток"/><small>{filled} из {total} пустых клеток решено</small></div>;
}
