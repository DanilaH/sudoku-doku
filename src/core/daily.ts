import { legacyPuzzles } from './bank';
import dailyRaw from '../../bank/daily-v2.jsonl?raw';
import { newGame, validDate, type State, type PuzzleRef } from './game';
export const DAILY_START='2025-01-01';
export const DAILY_V2_START='2026-10-19';
export const dailyBank: PuzzleRef[]=dailyRaw.trim().split('\n').map(l=>JSON.parse(l));
export const addDays=(date:string,n:number)=>new Date(Date.parse(date)+n*86400000).toISOString().slice(0,10);
export const DAILY_END=addDays(DAILY_V2_START,dailyBank.length-1);
export function localDate(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`}
export function dailyPuzzle(date:string){
 if(!validDate(date)||date<DAILY_START||date>DAILY_END)throw Error('Invalid daily date');
 if(date>=DAILY_V2_START)return dailyBank[Math.floor((Date.parse(date)-Date.parse(DAILY_V2_START))/86400000)];
 // Published archive stays immutable. Saved future sessions also win in openDaily.
 const elapsed=Math.floor((Date.parse(date)-Date.parse('2026-01-01'))/86400000),day=((elapsed%900)+900)%900;
 const level=(['EASY','MEDIUM','HARD'] as const)[day%3];return legacyPuzzles.filter(p=>p.difficulty===level)[Math.floor(day/3)];
}
export function openDaily(s:State,date:string,today=localDate()){
 if(!validDate(date)||date>today||date<DAILY_START)throw Error('Daily unavailable');
 return s.daily[date]??{...newGame(dailyPuzzle(date),false,`daily-v2-${date}`),dailyDate:date};
}
export function nextDaily(s:State,after:string,today:string){
 const end=today<DAILY_END?today:DAILY_END;
 if(end<DAILY_START)return null;
 const done=new Set(s.results.filter(r=>r.dailyDate).map(r=>r.dailyDate));
 const available=(d:string)=>d!==after&&!s.daily[d]?.completed&&!done.has(d);
 for(let date=addDays(after,1);date<=end;date=addDays(date,1))if(available(date))return date;
 for(let date=DAILY_START;date<=end&&date<after;date=addDays(date,1))if(available(date))return date;
 return null;
}
