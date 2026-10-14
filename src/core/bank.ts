import raw from '../../bank/puzzles-v1.jsonl?raw';
import {parse,type Difficulty} from './engine';
export interface Puzzle {puzzle_id:string;givens:string;solution:string;difficulty:Difficulty;technique_version:number;generator_version:number;seed:number;checksum:string;steps:number;techniques:Record<string,number>}
export const puzzles=raw.trim().split('\n').map(line=>JSON.parse(line) as Puzzle);
export const BANK_VERSION=1;
export function checkPuzzle(p:Puzzle){parse(p.givens);parse(p.solution);if(!['EASY','MEDIUM','HARD'].includes(p.difficulty)||p.technique_version!==1)throw Error('Unsupported puzzle')}
