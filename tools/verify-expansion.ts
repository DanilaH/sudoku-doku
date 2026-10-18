import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {classify,parse} from '../src/core/engine';
const rows=readFileSync('bank/puzzles-v2-extra.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
for(const p of rows)assert.equal(classify(parse(p.givens)),p.difficulty,p.puzzle_id);
console.log(`Expansion difficulty verified: ${rows.length}`);
