import {hintCredits,spendHint,rewardHints} from './core/hint-credits';
import {version as appVersion} from '../package.json';
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
  repeatPuzzle,
  type Game,
  type State,
} from "./core/game";
import { ActiveClock } from "./core/time";
import { adEligibility, impression } from "./core/ads";
import { SaveQueue } from "./platform/storage";
import {
  event,
  keepAwake,
  nativeLifecycle,
} from "./platform";
import { Native, isAndroid } from "./platform/native";
import { DAILY_START, DAILY_END, dailyPuzzle, nextDaily, openDaily } from "./core/daily";
import { playSound, stopSound } from "./platform/sound";
import { Trophy, Trophies } from "./components/Trophies";
import { monthProgress } from "./core/trophies";
import { Calendar, Tutorial, ErrorBoard } from "./components/Extras";
import { bankProgress } from "./core/progress";
import { Statistics } from "./components/Statistics";
import { useToday, useTouchUI } from "./components/useDevice";
import {platform} from './platform/adapter';
import {ProfileStorage,fetchProfile,pushProfile} from './platform/accounts';
import {mergeProfiles} from './core/profile';
import {Profile} from './components/Profile';
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
  | "profile"
  | "stats"
  | "privacy"
  | "daily"
  | "tutorial"
  | "trophies";
type Modal =
  | { kind: "message"; text:string }
  | { kind: "reward" }
  | { kind: "difficulty" }
  | { kind: "new"; level: Difficulty; replay: boolean }
  | { kind: "hint"; value: Hint; index: number }
  | { kind: "check"; cells: number[] }
  | null;
function Glyph({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    calendar: <path d="M4 6h16v15H4zM8 3v6M16 3v6M4 11h16M8 15h2M14 15h2" />,
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
  const today = useToday(), touchUI = useTouchUI() || isAndroid();
  const [state, setState] = useState<State>(initialState),
    sref = useRef(state),
    queue = useRef<SaveQueue | null>(null);
  const [loaded, setLoaded] = useState(false),
    [failure, setFailure] = useState(""),
    [bootFailure, setBootFailure] = useState(false),
    [saving, setSaving] = useState(false);
  const profileStore=useRef<ProfileStorage|null>(null);
  const [profileBusy,setProfileBusy]=useState(false),[syncMessage,setSyncMessage]=useState(''),[accountId,setAccountId]=useState<string|null>(null);
  const profileLock=useRef(false);
  const [calendarMonth, setCalendarMonth] = useState<string | undefined>();
  const [page, setPage] = useState<Page>("home"),
    [modal, setModal] = useState<Modal>(null),
    [paused, setPaused] = useState(false),
    [external, setExternal] = useState(!document.hasFocus()),
    [platformPause, setPlatformPause] = useState(false),
    [adBusy, setAdBusy] = useState(false),
    [clockMs, setClockMs] = useState(0);
  const pageRef=useRef(page);pageRef.current=page;
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
  const trophyOrigin = useRef<Page>("home");
  function showTrophies() { trophyOrigin.current = page; setPage("trophies"); }
  const game = state.current;
  const completed = Boolean(game?.completed);
  useEffect(() => { if (completed && page === "play") window.scrollTo({top:0,behavior:"instant"}); }, [completed,page]);
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
    !failure && !profileBusy;
  function persist(next: State) {
    sref.current = next;
    setState(next);
    pending.current++;
    setSaving(true);
    const p = queue.current!.saveLocal(next);
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
  async function profileAction(action:'connect'|'sync'|'disconnect',background=false) {
    if(profileLock.current||!profileStore.current||!queue.current)return;
    profileLock.current=true;if(!background)setProfileBusy(true);setSyncMessage('');
    try {
      await queue.current.flush();
      let next:State;
      if(action==='disconnect')next=await profileStore.current.disconnect();
      else {
        const account=await platform.accounts.account(action==='connect');
        if(!account)throw Error('Вход не выполнен. Можно продолжать играть без аккаунта.');
        if(action==='sync'&&account.id!==profileStore.current.accountId)throw Error('Аккаунт изменился. Подключите нужный профиль. Текущий прогресс сохранён отдельно.');
        const remote=await fetchProfile(platform.accounts,account.id);
        if(background&&pageRef.current==='play')return;
        setProfileBusy(true);
        await queue.current.flush();
        if(action==='connect')next=await profileStore.current.connect(account.id,remote,account.name);
        else {next=remote?mergeProfiles(sref.current,remote):sref.current;await profileStore.current.write(JSON.stringify(next))}
        // Commit locally before upload: a network failure must not erase a successful merge.
      }
      queue.current=new SaveQueue(profileStore.current);await queue.current.load();
      sref.current=next;setState(next);setAccountId(profileStore.current.accountId);
      if(background)setProfileBusy(false);
      if(action!=='disconnect'){
        await pushProfile(platform.accounts,profileStore.current.accountId!,next);
        setSyncMessage('Сохранено в облаке');
      }else setSyncMessage('Гостевой режим. Прогресс аккаунта сохранён отдельно.');
    } catch(e){setSyncMessage(e instanceof Error&&/[А-Яа-яЁё]/.test(e.message)?e.message:'Облако недоступно. Прогресс сохранён на устройстве. Попробуйте ещё раз.')}
    finally {profileLock.current=false;setProfileBusy(false)}
  }
  useEffect(()=>{
    if(!loaded||!accountId||page==='play')return;
    const sync=()=>{if(document.visibilityState==='visible')void profileAction('sync',true)};
    const first=page==='home'?setTimeout(sync,1500):undefined;
    const timer=setInterval(sync,60000);const online=()=>sync();window.addEventListener('online',online);
    return()=>{clearTimeout(first);clearInterval(timer);window.removeEventListener('online',online)};
  },[loaded,accountId,page]);
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
    // Selection and input preferences are UI state. The next move/checkpoint saves them.
    if (next.entries === prev.entries && next.notes === prev.notes &&
        next.undo === prev.undo && next.redo === prev.redo &&
        next.completed === prev.completed && next.hints === prev.hints) {
      const current = sref.current;
      const updated = {...current, current:next,
        normal:next.dailyDate ? current.normal : next,
        daily:next.dailyDate ? {...current.daily,[next.dailyDate]:next} : current.daily};
      sref.current=updated;setState(updated);setClockMs(next.activeMs);
      return;
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
        await platform.init();
        profileStore.current=new ProfileStorage(platform.storage());
        queue.current = new SaveQueue(profileStore.current);
        const saved = await queue.current.load();
        if (dead) return;
        setAccountId(profileStore.current.accountId);
        if (saved) {
          sref.current = saved;
          setState(saved);
        }
        for (const p of puzzles) checkPuzzle(p);
        await platform.ads.recover(grantHintReward);
        setLoaded(true);
        platform.ready();
        void platform.ads.prepare();
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
    platform.gameplay(running);
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
        if (active) window.dispatchEvent(new Event("doku-native-active"));
        setExternal(!active);
      },
      () => backRef.current(),
    );
    const unYG = platform.listen(
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
      if (modal) {
        if (e.key === "Escape") { e.preventDefault(); setModal(null); }
        return;
      }
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
    const update = () => {
      const validSlot = running;
      const r = banner.current?.getBoundingClientRect();
      const visible =
        validSlot &&
        Boolean(r) && r!.width >= 280 && r!.height >= 50 &&
        r!.bottom <= window.innerHeight &&
        r!.top >= 0;
      void platform.ads.banner({
          visible,
          top: r?.top ?? 0,
          viewportWidth: window.innerWidth,
          width: r?.width ?? 0,
          height: r?.height ?? 0,
          bottom: window.innerHeight - (r?.bottom ?? 0),
          left: r?.left ?? 0,
        }).then(result=>{
          if(!visible || !banner.current || !result || typeof result!=='object' || !('height' in result))return;
          const height=Number(result.height);
          if(Number.isFinite(height)&&height>=50&&height<=Math.max(120,window.innerHeight*.35)){
            const requested=Math.max(50,Math.ceil(height));
            if(banner.current.style.height!==`${requested}px`){
              banner.current.style.height=`${requested}px`;
              (banner.current.closest(".game-page") as HTMLElement | null)?.style.setProperty("--banner-height",`${requested}px`);
            }
          }
        }).catch(() => {});

    };
    const readyListener = platform.ads.listenReady(update);
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
      void platform.ads.banner({
          visible: false,
          top: 0,
          viewportWidth: window.innerWidth,
          width: 0,
          height: 0,
          bottom: 0,
          left: 0,
        }).catch(() => {});

    };
  }, [running, page]);
  async function grantHintReward(id:string,gameId:string) {
    const next=rewardHints(sref.current,gameId,id);
    lastMono.current=performance.now();
    await persist({...next,revision:next.revision+1,ads:impression(next.ads,Date.now())});
    await queue.current!.flush();
    void event('hint_reward',{game_id:gameId,amount:3});
  }
  async function requestHint() {
    if(transition.current||!running||!sref.current.current)return;
    const g=sref.current.current;
    const value=gameHint(g);
    if(value.kind==='logical' && platform.adsAvailable && hintCredits(g)===0){void platform.ads.prepare();setModal({kind:'reward'});return}
    transition.current=true;setAdBusy(true);
    try{
      if(value.kind==='logical'&&platform.adsAvailable)await persist(withGame(sref.current,spendHint(g)));
      setModal({kind:'hint',value,index:0});
    }catch{setFailure('Не удалось сохранить подсказку. Повторите сохранение.')}
    finally{transition.current=false;setAdBusy(false)}
  }
  async function requestReward() {
    if(transition.current||failure||!sref.current.current)return;
    transition.current=true;setAdBusy(true);setModal(null);
    const gameId=sref.current.current.id;
    try{
      await queue.current!.flush();
      await platform.ads.recover(grantHintReward);
      if(sref.current.current?.id===gameId && hintCredits(sref.current.current)>0){setModal({kind:'message',text:'Подсказки восстановлены.'});return}
      const result=await platform.ads.reward(gameId,grantHintReward);
      // Protect from interstitials after any actually shown opt-in ad, including early close.
      if(result.shown){lastMono.current=performance.now();await persist({...sref.current,revision:sref.current.revision+1,ads:impression(sref.current.ads,Date.now())})}
      setModal({kind:'message',text:result.rewarded?'Добавлены 3 подсказки.':result.shown?'Просмотр не завершён. Подсказки не списаны.':'Реклама пока недоступна. Попробуйте позже — можно продолжать игру.'});
    }catch{setFailure('Не удалось сохранить награду. Повторите сохранение.');}
    finally{transition.current=false;setAdBusy(false)}
  }
  useEffect(()=>{const prepare=()=>{void platform.ads.prepare()};window.addEventListener('online',prepare);return()=>window.removeEventListener('online',prepare)},[]);
  function back() {
    if (adBusy || profileBusy) return;
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
    if (page === "trophies") { setPage(trophyOrigin.current); return; }
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
      (replay ? repeatPuzzle(puzzles, sref.current, level) : null);
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
  async function leaveResult(target: "home" | "new" | "daily") {
    if (transition.current || failure) return;
    transition.current = true;
    setAdBusy(true);
    void platform.ads.prepare();
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
        await platform.ads.show(() => {
          lastMono.current = performance.now();
          void persist({
            ...sref.current,
            revision: sref.current.revision + 1,
            ads: impression(sref.current.ads, Date.now()),
          }).catch(() => {});
        });
      if (target === "daily") { const next = nextDaily(sref.current, game!.dailyDate!, today); if (next) daily(next); else setPage("home"); }
      else if (target === "new") start(game!.difficulty);
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
    if (date < DAILY_START || date > DAILY_END || date > today) return;
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
  const progress = bankProgress(puzzles,state.results), reward = monthProgress(state.daily,today.slice(0,7));
  const earnedYear = Array.from({length:12},(_,i)=>`${today.slice(0,4)}-${String(i+1).padStart(2,"0")}`).filter(m=>monthProgress(state.daily,m).tier>0).length;
  const archivedGame = Object.values(state.daily).filter(g => !g.completed && g.dailyDate !== today).sort((a,b)=>(b.updatedAt??0)-(a.updatedAt??0))[0];
  const followingDay = game?.dailyDate ? nextDaily(state,game.dailyDate,today) : null;
  const dailyAvailable = today >= DAILY_START && today <= DAILY_END;
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
      className={`app page-${page} ${page === "play" ? "game-page" : ""} ${platform.adsAvailable ? "monetized" : ""} ${state.settings.largeDigits ? "large-digits" : ""}`}
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
                  page === "privacy" || page === "trophies"
                ? "Назад"
                : "На главную"
          }
        >
          <Glyph name={page === "home" ? "settings" : "back"} />
        </button>
        <span className="wordmark">Судоку</span>
        {page === "home" && <button className="home-profile" aria-label="Профиль" onClick={()=>setPage("profile")}>{state.profile?.name || "Профиль"}</button>}
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
                .current!.saveLocal(sref.current)
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

                    <button className="primary continue" disabled={Boolean(failure)} onClick={() => resume(state.normal!)}>Продолжить партию <span>→</span></button>
                    <button className="primary secondary" disabled={Boolean(failure)} onClick={() => setModal({kind:"difficulty"})}>Новая игра</button>
                  </> : <>
                    <h2 className="new-session-title">Обычные задачи</h2>
                    <button className="primary" disabled={Boolean(failure)} onClick={() => setModal({kind:"difficulty"})}>Новая игра <span>→</span></button>

                  </>}
                  <div className="bank-progress"><span>Решено {progress.solved} из {progress.total}</span><progress value={progress.solved} max={progress.total} aria-label="Прогресс обычных задач" /></div>
                </section>
                <section className="daily-panel">
                  <div className="daily-heading"><div><h2>Задача дня</h2><p>{new Date(today+"T12:00:00").toLocaleDateString("ru",{day:"numeric",month:"long"})}{dailyAvailable ? ` · ${labels[(state.daily[today] ?? dailyPuzzle(today)).difficulty]}` : ""}</p></div><button className="calendar-link" onClick={() => {setPage("daily");}}><Glyph name="calendar" />Календарь</button></div>
                  <button className="primary secondary" disabled={!dailyAvailable} onClick={() => daily(today)}>{!dailyAvailable ? "Нужен новый банк задач" : state.daily[today]?.completed ? "Решено ✓" : state.daily[today] ? "Продолжить задачу дня" : "Играть сегодня"}</button>
                  {archivedGame && <button className="archive-resume" disabled={Boolean(failure)} onClick={() => resume(archivedGame)}>Продолжить {archivedGame.dailyDate!.split('-').reverse().join('.')} →</button>}
                  <button className="home-medal" onClick={showTrophies}>
                    <Trophy tier={reward.tier} month={Number(today.slice(5,7))} />
                    <span><strong>{reward.tier===3 ? "Золото получено" : `До ${["бронзы","серебра","золота"][reward.tier]}: ${reward.target-reward.solved} задач`}</strong><small>Медали за {today.slice(0,4)} год: {earnedYear}/12</small></span>
                  </button>
                </section>
              </div>
              <nav className="home-links">
                <button onClick={showTutorial}>Как играть</button>
                <button onClick={() => setPage("stats")}>Статистика</button>
                <button onClick={showTrophies}>Трофеи</button>

              </nav>
            </section>
          )}

          {page === "play" && game && (
            <section className={`play ${completed ? "play-completed" : ""}`}>
              <div className="game-heading">
                {!completed && <p className="start-instruction" aria-live="polite">{game.selected !== null && game.givens[game.selected] ? "Исходная цифра — менять нельзя" : game.noteMode ? "Заметки включены — отмечайте кандидатов" : game.inputMode === "digit" ? game.activeDigit ? `Цифра ${game.activeDigit} выбрана — нажимайте клетки` : "Выберите цифру, затем клетки" : "Выберите пустую клетку, затем цифру"}</p>}
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
                            <span className={game.givens[c] ? "given-digit" : "entered-digit"} key={d}>{d}</span>
                          ) : (
                            <span className="notes">
                              {Array.from({ length: 9 }, (_, i) => (
                                <i key={`${i}:${Boolean(game.notes[c] & (1 << (i + 1)))}`} className={game.notes[c] & (1 << (i + 1)) ? "note-present" : ""}>
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
                              onClick={showTrophies}
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
                            ? void leaveResult(followingDay ? "daily" : "home")
                            : void leaveResult("new")
                        }
                      >
                        {game.dailyDate ? followingDay ? `Задача за ${followingDay.split("-").reverse().join(".")} →` : "На сегодня всё · В меню" : nextPuzzle(puzzles,state,game.difficulty) ? "Следующая задача →" : "Повторить уровень →"}
                      </button>
                      {game.dailyDate && <button className="text-button" disabled={adBusy} onClick={()=>{setCalendarMonth(game.dailyDate!.slice(0,7));setPage("daily")}}>К календарю</button>}
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
                          onClick={() => void requestHint()}
                        >
                          <Glyph name="hint" />
                          <span>{platform.adsAvailable ? hintCredits(game)>0 ? `Подсказка · ${hintCredits(game)}` : '▶ +3 за видео' : 'Подсказка'}</span>
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
              {(platform.adsAvailable) &&
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
                  {items.filter(([key])=>key!=="keepAwake" || touchUI).map(([key, label, description]) => (
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
              {!touchUI && <><h2>Управление с клавиатуры</h2>
              <p className="help">
                Стрелки — выбор клетки. 1–9 — ввод.
                <br />N — заметки. Delete — стереть.
                <br />Z — отменить. Y — повторить. Esc — назад.
              </p></>}
              <button
                className="text-button"
                onClick={() => setPage("privacy")}
              >
                Конфиденциальность и данные →
              </button>
              <p className="footnote">Версия {appVersion} · Банк 2 · Ежедневные 2</p>
            </section>
          )}
          {page === "profile" && <Profile key={`${accountId}:${state.profile?.updatedAt}`} state={state} accountId={accountId} available={platform.accounts.available} busy={profileBusy} message={syncMessage}
            rename={name=>{void persist({...sref.current,revision:sref.current.revision+1,profile:{name,updatedAt:Date.now()}})}}
            connect={()=>void profileAction('connect')} sync={()=>void profileAction('sync')} disconnect={()=>void profileAction('disconnect')} trophies={showTrophies} />}
          {page === "stats" && <Statistics state={state} />}
          {page === "daily" && (
            <Calendar
              daily={state.daily}
              today={today}
              end={DAILY_END}
              start={DAILY_START}
              open={daily}
              initialMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
              trophies={showTrophies}
            />
          )}
          {page === "trophies" && (
            <Trophies
              daily={state.daily}
              today={today < DAILY_END ? today : DAILY_END}
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
              <p>Имя профиля, партии, заметки, настройки и статистика сохраняются на устройстве. Удаление приложения или его данных может удалить прогресс.</p>
              {platform.accounts.available && <p>По вашему желанию профиль и прогресс сохраняются в облаке платформы. Отключение облака не удаляет ранее отправленные данные.</p>}
              {platform.id === 'rustore' || isAndroid() ? <>
                <p>Для рекламы используется Yandex Mobile Ads, для статистики работы игры и диагностики ошибок — AppMetrica. Эти сервисы могут обрабатывать рекламные и технические идентификаторы, IP-адрес, сведения об устройстве, события использования и ошибки.</p>
                <p>Имя локального профиля, полное поле и заметки не передаются в игровые события аналитики. Доступ к контактам и точной геолокации не запрашивается.</p>
              </> : <p>{platform.id === 'yandex' ? 'В Яндекс Играх используются SDK платформы, её реклама и правила обработки данных.' : 'Обычная веб-версия не подключает рекламные сети и игровую аналитику.'}</p>}
              <p><a href="https://danilah.github.io/sudoku-doku/privacy.html" target="_blank" rel="noreferrer">Политика конфиденциальности</a></p>
              <p><a href="https://yandex.ru/legal/confidential/" target="_blank" rel="noreferrer">Политика конфиденциальности Яндекса</a></p>
              <p>Разработчик: Хитев Данила Сергеевич.<br/><a href="mailto:hityov.danila@yandex.ru">hityov.danila@yandex.ru</a></p>
            </section>
          )}
        </div>
      </div>
      {modal && (
        <ModalView key={modal.kind} close={() => setModal(null)}>
          <>
            {modal.kind === "message" ? (<><h2>{modal.text}</h2><button className="primary" onClick={()=>setModal(null)}>К игре</button></>) : modal.kind === "reward" ? (<><h2>Ещё 3 подсказки</h2><p>Посмотрите рекламу, чтобы получить 3 подсказки для этой партии. Награда выдаётся после подтверждения просмотра.</p><button className="primary" onClick={()=>void requestReward()}>▶ +3 подсказки за видео</button><button className="text-button" onClick={()=>setModal(null)}>Продолжить без подсказки</button></>) : modal.kind === "difficulty" ? (
              <>
                <h2>Выберите сложность</h2>
                <div className="difficulty-list">{levels.map(level => <button key={level} aria-label={labels[level]} onClick={() => requestNew(level)}><span>{labels[level]}</span><small>{bankProgress(puzzles,state.results,level).solved}/{bankProgress(puzzles,state.results,level).total}</small><span>→</span></button>)}</div>
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
      {(adBusy || profileBusy) && (
        <div className="transition" role="status">
          {profileBusy ? "Синхронизация…" : "Переходим…"}
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
