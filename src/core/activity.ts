import type {State} from './game';
import {levels,type Difficulty} from './engine';
export type Activity=Record<string,{level:Difficulty;ms:number}>;
export function activityOf(s:State):Activity {
 const a=structuredClone(s.activity??{});
 for(const r of s.results)a[r.gameId]={level:r.difficulty,ms:Math.max(a[r.gameId]?.ms??0,r.activeMs)};
 for(const g of [s.normal,...Object.values(s.daily)])if(g)a[g.id]={level:g.difficulty,ms:Math.max(a[g.id]?.ms??0,g.activeMs)};
 return a;
}
export function legacyActivity(s:State,a=activityOf(s)){
 return s.legacyActivity??Object.fromEntries(levels.map(l=>[l,Math.max(0,(s.activeByLevel?.[l]??0)-Object.values(a).filter(v=>v.level===l).reduce((n,v)=>n+v.ms,0))])) as Record<Difficulty,number>;
}
export function activityTotals(a:Activity,legacy:Record<Difficulty,number>){return Object.fromEntries(levels.map(l=>[l,legacy[l]+Object.values(a).filter(v=>v.level===l).reduce((n,v)=>n+v.ms,0)])) as Record<Difficulty,number>}
