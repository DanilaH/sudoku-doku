import {it,expect} from 'vitest';
import {puzzles} from '../src/core/bank';
import {initialState,newGame,input,withGame,validateState,repeatPuzzle} from '../src/core/game';
import {nextDaily} from '../src/core/daily';
it('repeats advance through a difficulty instead of restarting the first puzzle',()=>{
 let s=initialState();const first=repeatPuzzle(puzzles,s,'EASY')!;
 let g=newGame(first,true);for(let c=0;c<81;c++)if(!g.givens[c])g=input({...g,selected:c},g.solution[c]);
 s=withGame(s,g);expect(repeatPuzzle(puzzles,s,'EASY')!.puzzle_id).not.toBe(first.puzzle_id);
 expect(s.current!.undo).toEqual([]);expect(validateState(s).results).toHaveLength(1);
});
it('compacts completed legacy histories without changing caller state or live undo',()=>{
 let g=newGame(puzzles[0]);for(let c=0;c<81;c++)if(!g.givens[c])g=input({...g,selected:c},g.solution[c]);
 let s=withGame(initialState(),g);s.current=g;s.normal=g;const history=g.undo.length;
 expect(history).toBeGreaterThan(0);const copy=validateState(s);expect(copy.current!.undo).toEqual([]);expect(g.undo.length).toBe(history);
 const live=input({...newGame(puzzles[1]),selected:puzzles[1].givens.indexOf('0')},1);
 expect(validateState(withGame(copy,live)).current!.undo).toEqual(live.undo);
});
it('today offers the nearest missing archived day and skips completed dates',()=>{
 const s=initialState();expect(nextDaily(s,'2026-10-19','2026-10-19')).toBe('2026-10-18');
 s.results.push({gameId:'done',puzzleId:'done',difficulty:'EASY',activeMs:1,hints:0,completedAt:1,replay:false,dailyDate:'2026-10-18'});
 expect(nextDaily(s,'2026-10-19','2026-10-19')).toBe('2026-10-17');
});
