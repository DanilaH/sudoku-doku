import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {classify,parse,solveLogic,solutions,hint,LogicalSession,type Step,type Difficulty} from '../src/core/engine';
const reference=new Map(readFileSync('bank/kotlin-traces.sha256','utf8').trim().split('\n').map(l=>l.split(' ') as [string,string]));
const signature=(s:Step)=>[s.technique,s.sourceCells.join(','),s.digits.join(','),s.unitIndex??'-',s.placement?.join(',')??'-',s.removals.map(r=>`${r.cell},${r.digit}`).join(';')].join('|');
const counts:Record<string,number>={},techniques=new Set<string>();let deductions=0;
for(const line of readFileSync('bank/puzzles-v1.jsonl','utf8').trim().split('\n')){const p=JSON.parse(line),g=parse(p.givens),sol=parse(p.solution),level=p.difficulty as Difficulty;assert.equal(classify(g),level);assert.deepEqual(solutions(g),[sol]);const t=solveLogic(g,level);assert.deepEqual(t.board,sol);assert.equal(createHash('sha256').update(t.steps.map(signature).join('\n')).digest('hex'),reference.get(p.puzzle_id));for(const s of t.steps){techniques.add(s.technique);if(s.placement)assert.equal(sol[s.placement[0]],s.placement[1]);for(const r of s.removals)assert.notEqual(sol[r.cell],r.digit);deductions++}assert.equal(hint(g,Array(81).fill(0),sol,level).kind,'logical');const wrong=Array(81).fill(0),c=g.indexOf(0);wrong[c]=sol[c]%9+1;assert.deepEqual(hint(g,wrong,sol,level),{kind:'incorrect',cells:[c]});const session=new LogicalSession(g),first=session.next(level)!;session.apply(first,level);assert.throws(()=>session.apply(first,level));counts[level]=(counts[level]??0)+1}
assert.deepEqual(counts,{MEDIUM:300,EASY:300,HARD:300});assert.equal(techniques.size,5);
const report={validated:900,kotlin_trace_matches:900,deductions,counts,techniques:[...techniques]};writeFileSync('reports/typescript-engine.json',JSON.stringify(report,null,2)+'\n');console.log(report);
