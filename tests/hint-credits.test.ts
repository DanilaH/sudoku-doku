import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {initialState,newGame,withGame,validateState,input,travel,gameHint,applyHint} from '../src/core/game';
import {hintCredits,spendHint,rewardHints,openHint,hintAlreadyOpened} from '../src/core/hint-credits';
const p=JSON.parse(readFileSync('bank/puzzles-v1.jsonl','utf8').split('\n')[0]);
it('migrates old games, retains spent credits across reload and undo, isolates games',()=>{
 const g=newGame(p);delete g.hintCredits;expect(hintCredits(g)).toBe(3);
 let next=spendHint(spendHint(spendHint(g)));expect(()=>spendHint(next)).toThrow();
 next=input({...next,selected:next.givens.indexOf(0)},1);next=travel(next);
 const state=validateState(JSON.parse(JSON.stringify(withGame(initialState(),next))));expect(hintCredits(state.current!)).toBe(0);expect(hintCredits(newGame(p))).toBe(3);
});
it('grants exactly one pack for a receipt, preserving game selection and daily credits',()=>{
 const normal={...newGame(p),hintCredits:0},daily={...newGame(p),dailyDate:'2026-10-20',hintCredits:0};
 let s=withGame(withGame(initialState(),normal),daily);s=rewardHints(s,normal.id,'receipt-1');expect(s.current!.id).toBe(daily.id);expect(hintCredits(s.normal!)).toBe(3);expect(hintCredits(s.daily['2026-10-20'])).toBe(0);
 s={...s,normal:spendHint(spendHint(spendHint(s.normal!)))};expect(rewardHints(s,normal.id,'receipt-1')).toBe(s);expect(hintCredits(rewardHints(s,normal.id,'receipt-2').normal!)).toBe(3);
 expect(rewardHints(s,'missing','receipt')).toBe(s);
});
it('rejects malformed stored balances',()=>{for(const n of [-1,4,1.5])expect(()=>validateState(withGame(initialState(),{...newGame(p),hintCredits:n}))).toThrow()});

it('reading counts once and reopening the same position survives reload',()=>{
 const first=openHint(newGame(p));expect(first.hints).toBe(1);expect(first.hintCredits).toBe(2);
 const loaded=validateState(JSON.parse(JSON.stringify(withGame(initialState(),first)))).current!;
 expect(hintAlreadyOpened(loaded)).toBe(true);expect(openHint(loaded)).toBe(loaded);
 expect(openHint({...loaded,hintCredits:0}).hintCredits).toBe(0);
});

it('applying an already read hint does not count it twice',()=>{
 const g=openHint(newGame(p));const h=gameHint(g);expect(h.kind).toBe('logical');
 if(h.kind==='logical'){const next=applyHint(g,h.steps);expect(next.hints).toBe(1);expect(next.hintCredits).toBe(2);}
});
it('validates cached positions and counts free web explanations',()=>{
 expect(openHint(newGame(p),false).hintCredits).toBe(3);expect(openHint(newGame(p),false).hints).toBe(1);
 expect(()=>validateState(withGame(initialState(),{...newGame(p),openedHintPositions:['bad']}))).toThrow();
});
