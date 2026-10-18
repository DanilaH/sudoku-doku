import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {classify,parse} from '../src/core/engine';
const rows=readFileSync('bank/daily-v2.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
for(const p of rows)assert.equal(classify(parse(p.givens)),p.difficulty,p.puzzle_id);
console.log(`Daily difficulty verified: ${rows.length}`);
