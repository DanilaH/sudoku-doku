import {it,expect} from 'vitest';
import {initialState,newGame,withGame,validateState} from '../src/core/game';
import {puzzles} from '../src/core/bank';
import {dailyBank,dailyPuzzle,openDaily,nextDaily,DAILY_END} from '../src/core/daily';
import {bankProgress,statistics} from '../src/core/progress';
it('daily bank is separate and dates never wrap; existing saves win',()=>{
 const ordinary=new Set(puzzles.map(p=>p.givens));expect(dailyBank.length).toBe(5400);
 expect(new Set(dailyBank.map(p=>p.givens)).size).toBe(5400);
 expect(dailyBank.some(p=>ordinary.has(p.givens))).toBe(false);
 expect(dailyPuzzle('2028-06-20')).not.toEqual(dailyPuzzle('2026-01-02'));
 expect(()=>dailyPuzzle('2099-01-01')).toThrow();expect(dailyPuzzle(DAILY_END)).toBeDefined();
 let s=initialState();const old={...newGame(puzzles[0]),dailyDate:'2028-06-20'};s=withGame(s,old);expect(openDaily(validateState(s),'2028-06-20','2028-06-20')).toMatchObject(old);
});
it('progress counts unique ordinary puzzles; activity includes replaced games',()=>{
 let s=initialState();let a={...newGame(puzzles[0]),activeMs:12000};s=withGame(s,a);s=withGame(s,a);expect(statistics(s).activeMs).toBe(12000);
 s=withGame(s,{...newGame(puzzles[1]),activeMs:5000});expect(statistics(s).activeMs).toBe(17000);
 a={...a,completed:true,activeMs:20000};s=withGame(s,a);s=withGame(s,a);
 // Resume of a replaced unsaved game is not an app action; use normal completion below.
 const normal={...newGame(puzzles[2]),completed:true,activeMs:6000};s=withGame(s,normal);s=withGame(s,{...normal,id:'repeat',replay:true});
 s=withGame(s,{...newGame(puzzles[3]),dailyDate:'2026-10-18',completed:true,activeMs:4000});
 expect(bankProgress(puzzles,s.results).solved).toBe(2);expect(statistics(s).count).toBe(4);
});
it('next daily chooses later unlocked days then archive; exhaustion and legacy totals',()=>{
 let s=initialState();expect(nextDaily(s,'2025-01-01','2025-01-03')).toBe('2025-01-02');
 for(const date of ['2025-01-01','2025-01-02','2025-01-03']){const g=newGame(puzzles[0],false,date);s=withGame(s,{...g,entries:g.solution.map((d,i)=>g.givens[i]?0:d),dailyDate:date,completed:true,activeMs:1000});}
 expect(nextDaily(s,'2025-01-03','2025-01-03')).toBe(null);delete s.activeByLevel;expect(statistics(validateState(s)).activeMs).toBe(3000);
 s=withGame(s,{...newGame(puzzles[1]),activeMs:2000});expect(statistics(s).activeMs).toBe(5000);
});
