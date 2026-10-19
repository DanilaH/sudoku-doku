import {initialState,validateState,type State,type Game} from './game';
import {puzzles} from './bank';
import dailyRaw from '../../bank/daily-v2.jsonl?raw';
import {newGame} from './game';
import {levels,type Difficulty} from './engine';
import {activityOf,legacyActivity,activityTotals} from './activity';
function pick(a:Game|null|undefined,b:Game|null|undefined):Game|null {
 if(!a)return b??null;if(!b)return a;
 if(a.id===b.id&&a.completed!==b.completed)return a.completed?a:b;
 return (a.updatedAt??a.activeMs)>=(b.updatedAt??b.activeMs)?a:b;
}
/** Idempotent union: results use session ID (daily results use date); activity uses max per session. */
export function mergeProfiles(local:State,remote:State):State {
 const a=validateState(local),b=validateState(remote),activity=activityOf(a),other=activityOf(b);
 for(const [id,v] of Object.entries(other))if(!activity[id]||v.ms>activity[id].ms)activity[id]=v;
 const la=legacyActivity(a),lb=legacyActivity(b),legacy=Object.fromEntries(levels.map(l=>[l,Math.max(la[l],lb[l])])) as Record<Difficulty,number>;
 const results=new Map<string,State['results'][number]>();
 for(const r of [...a.results,...b.results].sort((x,y)=>x.completedAt-y.completedAt||x.gameId.localeCompare(y.gameId))) {
  const key=r.dailyDate?`daily:${r.dailyDate}`:r.gameId;if(!results.has(key))results.set(key,r);
 }
 const daily:State['daily']={};
 for(const date of new Set([...Object.keys(a.daily),...Object.keys(b.daily)])){
  const result=results.get(`daily:${date}`),candidates=[a.daily[date],b.daily[date]];
  daily[date]=(result?candidates.find(g=>g?.completed&&g.id===result.gameId):null)??pick(...candidates as [Game,Game])!;
 }
 let normal=pick(a.normal,b.normal);
 const completedNormal=normal&&[...results.values()].find(r=>r.gameId===normal!.id);
 if(normal&&!normal.completed&&completedNormal)normal={...normal,completed:true,notes:Array(81).fill(0),entries:normal.givens.map((d,i)=>d?0:normal!.solution[i]),undo:[],redo:[],activeMs:completedNormal.activeMs,hints:completedNormal.hints};
 const current=a.current?(a.current.dailyDate?daily[a.current.dailyDate]:normal):b.current?(b.current.dailyDate?daily[b.current.dailyDate]:normal):null;
 return validateState({...a,profile:a.profile?.updatedAt&&a.profile.updatedAt>=(b.profile?.updatedAt??0)?a.profile:b.profile??a.profile,
  revision:Math.max(a.revision,b.revision)+1,normal,current,daily,results:[...results.values()],activity,legacyActivity:legacy,activeByLevel:activityTotals(activity,legacy)});
}
const dailyCatalog=dailyRaw.trim().split('\n').map(l=>JSON.parse(l));
const catalog=new Map([...puzzles,...dailyCatalog].map(p=>[p.puzzle_id,p]));
const shortIds=new Map<string,string>(),longIds=new Map<string,string>();
for(const [prefix,bank] of [['o',puzzles.slice(0,900)],['n',puzzles.slice(900)],['d',dailyCatalog]] as const)bank.forEach((p,i)=>{const code=prefix+i;shortIds.set(p.puzzle_id,code);longIds.set(code,p.puzzle_id)});
/** Compact completed sessions into result references; retain full unfinished undo/redo. */
export async function encodeProfile(state:State){
 const s=validateState(state), activity=activityOf(s);
 for(const r of s.results)if(activity[r.gameId]?.ms===r.activeMs)delete activity[r.gameId];
 for(const g of [s.normal,...Object.values(s.daily)])if(g&&activity[g.id]?.ms===g.activeMs)delete activity[g.id];
 const resultIndex=new Map(s.results.map((r,i)=>[r.gameId,i]));
 const pack=(g:Game|null)=>g?.completed&&catalog.has(g.puzzleId)?{done:resultIndex.get(g.id)}:g;
 const payload={codec:1,state:{...s,current:undefined,normal:undefined,daily:undefined,results:undefined,activity},
  results:s.results.map(r=>[r.dailyDate&&r.gameId===`daily-v2-${r.dailyDate}`?null:r.gameId,shortIds.get(r.puzzleId)??r.puzzleId,r.difficulty,r.activeMs,r.hints,r.completedAt,r.replay?1:0,r.dailyDate?Math.floor(Date.parse(r.dailyDate)/86400000):null]),
  normal:pack(s.normal),daily:Object.entries(s.daily).map(([date,g])=>[Math.floor(Date.parse(date)/86400000),pack(g)]),current:s.current?(s.current.dailyDate??'normal'):null};
 const rows=payload.results;
 const packed={...payload,results:Array.from({length:8},(_,i)=>rows.map(r=>r[i]))};
 const bytes=new TextEncoder().encode(JSON.stringify(packed));
 const compressed=await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
 let text='';for(const b of new Uint8Array(compressed))text+=String.fromCharCode(b);
 return 'gz1:'+btoa(text);
}
export async function decodeProfile(raw:string):Promise<State>{
 if(!raw.startsWith('gz1:'))throw Error('Неизвестный формат облачного сохранения. Обновите игру.');
 const bytes=Uint8Array.from(atob(raw.slice(4)),c=>c.charCodeAt(0));
 const text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 const p=JSON.parse(text);if(p.codec!==1)throw Error('Неизвестный формат профиля');
 const resultRows=p.results[0].map((_:unknown,i:number)=>p.results.map((column:unknown[])=>column[i]));
 const results:State['results']=resultRows.map((r:any[])=>{const date=r[7]===null?undefined:new Date(r[7]*86400000).toISOString().slice(0,10);return {gameId:r[0]??`daily-v2-${date}`,puzzleId:longIds.get(r[1])??r[1],difficulty:r[2],activeMs:r[3],hints:r[4],completedAt:r[5],replay:Boolean(r[6]),...(date?{dailyDate:date}:{})}});
 const unpack=(g:any):Game|null=>{
  if(!g||!Object.hasOwn(g,'done'))return g;
  const r=results[g.done];if(!r)throw Error('Corrupt completed session');
  const puzzle=catalog.get(r.puzzleId);if(!puzzle)throw Error('Обновите игру для загрузки новых задач');
  const base=newGame(puzzle,r.replay,r.gameId);
  return {...base,completed:true,entries:base.givens.map((d,i)=>d?0:base.solution[i]),activeMs:r.activeMs,hints:r.hints,updatedAt:r.completedAt,...(r.dailyDate?{dailyDate:r.dailyDate}:{})};
 };
 const normal=unpack(p.normal),daily=Object.fromEntries(p.daily.map(([date,g]:[number,any])=>[new Date(date*86400000).toISOString().slice(0,10),unpack(g)]));
 const s=validateState({...p.state,normal,daily,results,current:p.current==='normal'?normal:p.current?daily[p.current]:null});
 s.activity=activityOf(s);return s;
}
