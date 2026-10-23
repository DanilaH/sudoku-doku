import {useState} from 'react';
import {statistics} from '../core/progress';
import type {State} from '../core/game';
import {levels,type Difficulty} from '../core/engine';
const labels={EASY:'Лёгкие',MEDIUM:'Средние',HARD:'Сложные'};
const duration=(ms:number|null)=>{if(ms===null)return '—';const secs=Math.floor(ms/1000);return `${Math.floor(secs/3600)?Math.floor(secs/3600)+' ч ':''}${Math.floor(secs/60)%60} мин ${secs%60} с`};
export function Statistics({state,start}:{state:State;start?:()=>void}){
 const [level,setLevel]=useState<Difficulty|undefined>();const p=statistics(state,level);
 return <section className="simple statistics"><h1>Статистика</h1><div className="stats-tabs" role="group" aria-label="Сложность статистики">{[undefined,...levels].map(l=><button key={l??'all'} aria-pressed={level===l} onClick={()=>setLevel(l)}>{l?labels[l]:'Все'}</button>)}</div>
 {p.count===0&&<div className="stats-empty"><strong>Первая победа впереди</strong><p>{level?"Здесь появятся результаты этой сложности.":"Решите задачу — здесь появятся ваши результаты."}</p>{start&&<button className="primary" onClick={start}>Начать игру →</button>}</div>}
 <dl className="stats-metrics"><div><dt>Завершено партий</dt><dd>{p.count}</dd></div><div><dt>Без подсказок</dt><dd>{p.unassisted}</dd></div><div><dt>Время в игре</dt><dd>{duration(p.activeMs)}</dd></div><div><dt>Среднее время решения</dt><dd>{duration(p.average)}</dd></div>{level&&<><div><dt>Лучшее без подсказок</dt><dd>{duration(p.best(false))}</dd></div><div><dt>Лучшее с подсказками</dt><dd>{duration(p.best(true))}</dd></div></>}</dl>
 <p className="footnote">Обычные и ежедневные партии, включая повторные прохождения. Паузы и реклама не учитываются.</p></section>
}
