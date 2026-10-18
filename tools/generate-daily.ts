import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {classify,parse,levels} from '../src/core/engine';
const target=1800;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function canonical(s:string){const forms:string[]=[];const norm=(x:string)=>{const m=new Map([['0','0']]);return [...x].map(d=>{if(!m.has(d))m.set(d,String(m.size));return m.get(d)}).join('')};for(let i=0;i<4;i++){forms.push(norm(s),norm(Array.from({length:81},(_,j)=>s[Math.floor(j/9)*9+8-j%9]).join('')));s=Array.from({length:81},(_,j)=>s[(8-j%9)*9+Math.floor(j/9)]).join('')}return forms.sort()[0]}
function rng(seed:number){let a=seed;return()=>{a|=0;a=a+0x6d2b79f5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle<T>(xs:T[],rand:()=>number){for(let i=xs.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[xs[i],xs[j]]=[xs[j],xs[i]]}return xs}
function solve(input:number[],limit:number,rand?:()=>number){const b=[...input],out:number[][]=[];const r=Array(9).fill(0),c=Array(9).fill(0),k=Array(9).fill(0),box=(i:number)=>Math.floor(i/27)*3+Math.floor(i%9/3);for(let i=0;i<81;i++)if(b[i]){r[Math.floor(i/9)]|=1<<b[i];c[i%9]|=1<<b[i];k[box(i)]|=1<<b[i]}
function visit(){let cell=-1,mask=0,best=10;for(let i=0;i<81;i++)if(!b[i]){const m=1022&~(r[Math.floor(i/9)]|c[i%9]|k[box(i)]);let n=0;for(let t=m;t;t&=t-1)n++;if(!n)return;if(n<best){cell=i;mask=m;best=n;if(n===1)break}}if(cell<0){out.push([...b]);return}let ds=[];for(let d=1;d<=9;d++)if(mask&(1<<d))ds.push(d);if(rand)shuffle(ds,rand);const ri=Math.floor(cell/9),ci=cell%9,ki=box(cell);for(const d of ds){const m=1<<d;b[cell]=d;r[ri]|=m;c[ci]|=m;k[ki]|=m;visit();r[ri]&=~m;c[ci]&=~m;k[ki]&=~m;b[cell]=0;if(out.length>=limit)return}}
visit();return out}
const normal=readFileSync('bank/puzzles-v1.jsonl','utf8').trim().split('\n').map(JSON.parse as any) as any[];
const seen=new Set(normal.map(p=>canonical(p.givens)));const banks:Record<string,any[]>={EASY:[],MEDIUM:[],HARD:[]};let seed=1000000;
while(levels.some(l=>banks[l].length<target)){
const rand=rng(seed),full=solve(Array(81).fill(0),1,rand)[0],b=[...full];for(const i of shuffle(Array.from({length:81},(_,i)=>i),rand)){const old=b[i];b[i]=0;if(solve(b,2).length!==1)b[i]=old}
const level=classify(b),g=b.join(''),s=full.join('');if(level&&banks[level].length<target){const form=canonical(g);if(!seen.has(form)){seen.add(form);banks[level].push({puzzle_id:'daily2-'+hash(g).slice(0,20),givens:g,solution:s,difficulty:level,seed,checksum:hash(g+':'+s)});if(levels.reduce((n,l)=>n+banks[l].length,0)%100===0){console.log(seed,levels.map(l=>banks[l].length));writeFileSync('bank/daily-checkpoint.json',JSON.stringify(banks))}}}seed++;
}
const rows=Array.from({length:target},(_,i)=>levels.map(l=>banks[l][i])).flat();writeFileSync('bank/daily-v2.jsonl',rows.map(p=>JSON.stringify(p)).join('\n')+'\n');writeFileSync('reports/daily-generation.json',JSON.stringify({version:2,start:'2026-10-19',count:rows.length,per_level:target,seed_end:seed,canonical_duplicates:0},null,2));console.log('DONE',rows.length);
