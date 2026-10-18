import {it,expect} from 'vitest';
import {initialState,newGame,withGame,validateState} from '../src/core/game';
import {mergeProfiles,encodeProfile,decodeProfile} from '../src/core/profile';
import {ProfileStorage} from '../src/platform/accounts';
import {puzzles} from '../src/core/bank';
const won=(id:string)=>{const g=newGame(puzzles[0],false,id);return {...g,completed:true,entries:g.givens.map((d,i)=>d?0:g.solution[i]),activeMs:1000}};
it('merges results and abandoned activity idempotently across devices',()=>{
 let a=withGame(initialState(),won('one'));const b=withGame(a,won('two'));
 a=withGame(a,{...newGame(puzzles[1],false,'abandoned'),activeMs:400});a=withGame(a,newGame(puzzles[2]));
 const merged=mergeProfiles(a,b),again=mergeProfiles(merged,b);
 expect(merged.results).toHaveLength(2);expect(again.results).toEqual(merged.results);
 expect(Object.values(again.activeByLevel!).reduce((n,v)=>n+v,0)).toBe(2400);
 expect(validateState(again)).toBeTruthy();
});
it('same daily date from different devices counts only once',()=>{
 const a=withGame(initialState(),{...won('daily-a'),dailyDate:'2026-10-18'},10);
 const b=withGame(initialState(),{...won('daily-b'),dailyDate:'2026-10-18'},20);
 const s=mergeProfiles(a,b);expect(s.results).toHaveLength(1);expect(s.daily['2026-10-18'].id).toBe('daily-a');expect(validateState(s)).toBeTruthy();
});
it('compressed save round-trips current game and rejects unknown versions',async()=>{
 const s=withGame(initialState(),won('one'));const restored=await decodeProfile(await encodeProfile(s));expect(restored.results).toEqual(s.results);expect(restored.current?.completed).toBe(true);expect(restored.activeByLevel).toEqual(s.activeByLevel);
 await expect(decodeProfile('newversion')).rejects.toThrow();
});
it('guest transfers once, accounts stay isolated, failed local write is atomic',async()=>{
 let raw:string|null=JSON.stringify(withGame(initialState(),won('guest'))),fail=false;
 const store=new ProfileStorage({read:async()=>raw,write:async v=>{if(fail)throw Error('disk');raw=v}});
 await store.read();const a=await store.connect('yandex:a',null);expect(a.results).toHaveLength(1);
 await store.disconnect();expect(JSON.parse((await store.read())!).results).toHaveLength(0);
 const b=await store.connect('yandex:b',null);expect(b.results).toHaveLength(0);
 fail=true;await expect(store.connect('yandex:a',null)).rejects.toThrow();expect(store.accountId).toBe('yandex:b');
 fail=false;expect((await store.connect('yandex:a',null)).results).toHaveLength(1);
 const restored=new ProfileStorage({read:async()=>raw,write:async v=>{raw=v}});await restored.read();expect(restored.accountId).toBe('yandex:a');
});
it('expanded normal bank keeps published first 900 and has 600 each',()=>{expect(puzzles).toHaveLength(1800);for(const l of ['EASY','MEDIUM','HARD'])expect(puzzles.filter(p=>p.difficulty===l)).toHaveLength(600);expect(puzzles.slice(900).every(p=>p.puzzle_id.startsWith('normal2-'))).toBe(true)});
it('full normal and daily completion archive fits Yandex cloud quota',async()=>{
 const {readFileSync}=await import('node:fs');const daily=readFileSync('bank/daily-v2.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
 const s=initialState();
 for(const [i,p] of [...puzzles,...daily].entries()){
  const date=i>=puzzles.length?new Date(Date.parse('2026-10-19')+(i-puzzles.length)*86400000).toISOString().slice(0,10):undefined;
  const id=date?`daily-v2-${date}`:crypto.randomUUID();
  s.results.push({gameId:id,puzzleId:p.puzzle_id,difficulty:p.difficulty,activeMs:100000+i*123,hints:i%3,completedAt:Date.now()+i*86400000,replay:false,...(date?{dailyDate:date}:{})});
  if(date){const g=newGame(p,false,id);s.daily[date]={...g,dailyDate:date,completed:true,activeMs:100000+i*123,hints:i%3,entries:g.givens.map((d,j)=>d?0:g.solution[j])}}
 }
 const raw=await encodeProfile(s);expect(raw.length).toBeLessThan(195000);
 const restored=await decodeProfile(raw);expect(restored.results).toHaveLength(7200);expect(Object.keys(restored.daily)).toHaveLength(5400);
},20000);
