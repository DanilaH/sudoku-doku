export type Difficulty='EASY'|'MEDIUM'|'HARD';
export const levels:Difficulty[]=['EASY','MEDIUM','HARD'];
export type Technique='NAKED_SINGLE'|'HIDDEN_SINGLE'|'LOCKED_CANDIDATES'|'NAKED_PAIR'|'HIDDEN_PAIR';
export type Board=readonly number[];
export interface Step { technique:Technique; sourceCells:number[]; digits:number[]; unitIndex:number|null; placement:[number,number]|null; removals:{cell:number;digit:number}[] }
export const ALL=0x3fe, bit=(d:number)=>1<<d;
export const digits=(mask:number)=>Array.from({length:9},(_,i)=>i+1).filter(d=>(mask&bit(d))!==0);
export const units:number[][]=[...Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>r*9+c)),...Array.from({length:9},(_,c)=>Array.from({length:9},(_,r)=>r*9+c)),...Array.from({length:9},(_,b)=>Array.from({length:9},(_,i)=>(Math.floor(b/3)*3+Math.floor(i/3))*9+(b%3)*3+i%3))];
export const peers=Array.from({length:81},(_,i)=>[...new Set(units.filter(u=>u.includes(i)).flat())].filter(p=>p!==i));
export function parse(s:string):number[]{if(!/^[0-9]{81}$/.test(s))throw Error('Invalid board');return [...s].map(Number)}
export function valid(b:Board){return b.length===81&&b.every(d=>Number.isInteger(d)&&d>=0&&d<=9)&&units.every(u=>{const ds=u.map(i=>b[i]).filter(Boolean);return new Set(ds).size===ds.length})}
export function solutions(input:Board,limit=2):number[][] {
 if(!Number.isInteger(limit)||limit<1)throw Error('Invalid limit');if(!valid(input))return [];
 const b=[...input],out:number[][]=[],rows=new Int32Array(9),cols=new Int32Array(9),boxes=new Int32Array(9),box=(i:number)=>Math.floor(i/27)*3+Math.floor(i%9/3);
 for(let i=0;i<81;i++)if(b[i]){const m=bit(b[i]);rows[Math.floor(i/9)]|=m;cols[i%9]|=m;boxes[box(i)]|=m}
 function visit(){let cell=-1,mask=0,best=10;for(let i=0;i<81;i++)if(!b[i]){const m=ALL&~(rows[Math.floor(i/9)]|cols[i%9]|boxes[box(i)]),n=digits(m).length;if(!n)return;if(n<best){cell=i;mask=m;best=n;if(n===1)break}}
 if(cell===-1){out.push([...b]);return}const r=Math.floor(cell/9),c=cell%9,k=box(cell);for(const d of digits(mask)){const m=bit(d);b[cell]=d;rows[r]|=m;cols[c]|=m;boxes[k]|=m;visit();rows[r]&=~m;cols[c]&=~m;boxes[k]&=~m;if(out.length>=limit)break}b[cell]=0}
 visit();return out;
}
const step=(technique:Technique,sourceCells:number[],ds:number[],unitIndex:number|null,placement:[number,number]|null=null,removals:Step['removals']=[]):Step=>({technique,sourceCells,digits:ds,unitIndex,placement,removals});
export class LogicalSession {
 private board:number[]; private masks:number[];
 constructor(input:Board){if(!valid(input))throw Error('Invalid board');this.board=[...input];this.masks=input.map((d,i)=>d?0:ALL&~peers[i].reduce((m,p)=>m|bit(input[p]),0))}
 snapshot(){return [...this.board]} candidates(){return [...this.masks]}
 next(level:Difficulty):Step|null {
 const m=this.masks;
 for(let i=0;i<81;i++)if(!this.board[i]&&digits(m[i]).length===1){const d=digits(m[i])[0];return step('NAKED_SINGLE',[i],[d],null,[i,d])}
 for(let ui=0;ui<27;ui++)for(let d=1;d<=9;d++){const cs=units[ui].filter(c=>m[c]&bit(d));if(cs.length===1)return step('HIDDEN_SINGLE',cs,[d],ui,[cs[0],d])}
 if(level==='EASY')return null;
 for(let ai=0;ai<27;ai++)for(let d=1;d<=9;d++){const a=units[ai],src=a.filter(c=>m[c]&bit(d));if(src.length<2)continue;for(let bi=0;bi<27;bi++)if(ai!==bi&&src.every(c=>units[bi].includes(c))){const rem=units[bi].filter(c=>!a.includes(c)&&(m[c]&bit(d))).map(cell=>({cell,digit:d}));if(rem.length)return step('LOCKED_CANDIDATES',src,[d],ai,null,rem)}}
 if(level==='MEDIUM')return null;
 for(let ui=0;ui<27;ui++){const u=units[ui],pairs=new Map<number,number[]>();for(const c of u)if(digits(m[c]).length===2)pairs.set(m[c],[...(pairs.get(m[c])??[]),c]);for(const [mask,src]of pairs)if(src.length===2){const rem=u.filter(c=>!src.includes(c)).flatMap(cell=>digits(m[cell]&mask).map(digit=>({cell,digit})));if(rem.length)return step('NAKED_PAIR',src,digits(mask),ui,null,rem)}
 for(let d1=1;d1<=8;d1++)for(let d2=d1+1;d2<=9;d2++){const s1=u.filter(c=>m[c]&bit(d1)),s2=u.filter(c=>m[c]&bit(d2));if(s1.length===2&&s1.join()===s2.join()){const mask=bit(d1)|bit(d2),rem=s1.flatMap(cell=>digits(m[cell]&~mask).map(digit=>({cell,digit})));if(rem.length)return step('HIDDEN_PAIR',s1,[d1,d2],ui,null,rem)}}}
 return null;
 }
 apply(s:Step,level:Difficulty){if(JSON.stringify(s)!==JSON.stringify(this.next(level)))throw Error('Stale or foreign step');if(s.placement){const[c,d]=s.placement;this.board[c]=d;this.masks[c]=0;for(const p of peers[c])this.masks[p]&=~bit(d)}for(const r of s.removals)this.masks[r.cell]&=~bit(r.digit);if(this.board.some((d,i)=>!d&&!this.masks[i]))throw Error('Contradiction')}
}
export function solveLogic(b:Board,level:Difficulty){const session=new LogicalSession(b),steps:Step[]=[];let s;while((s=session.next(level))){session.apply(s,level);steps.push(s);if(steps.length>=1000)throw Error('Step budget')}const board=session.snapshot();return{solved:board.every(Boolean),board,steps}}
export function classify(b:Board):Difficulty|null{return levels.find(l=>solveLogic(b,l).solved)??null}
export function explanation(s:Step){const cs=s.sourceCells.map(c=>`(${Math.floor(c/9)+1}, ${c%9+1})`).join(', '),ds=s.digits.join(', ');switch(s.technique){case'NAKED_SINGLE':return`В клетке ${cs} возможна только цифра ${ds}.`;case'HIDDEN_SINGLE':return`В выделенной группе цифра ${ds} возможна только в клетке ${cs}.`;case'LOCKED_CANDIDATES':return`В выделенной группе цифра ${ds} ограничена пересечением ${cs}. Она исключается из отмеченных клеток соседней группы.`;case'NAKED_PAIR':return`В двух клетках ${cs} возможны только ${ds}. Эти цифры исключаются из других клеток группы.`;case'HIDDEN_PAIR':return`Цифры ${ds} возможны в этой группе только в клетках ${cs}. Другие кандидаты в этих клетках исключаются.`}}
export type Hint={kind:'incorrect';cells:number[]}|{kind:'logical';steps:Step[]}|{kind:'complete'}|{kind:'unsupported'};
export function hint(g:Board,e:Board,sol:Board,level:Difficulty):Hint{
 if(!valid(g)||!valid(sol)||sol.some(d=>!d)||e.length!==81||e.some(d=>!Number.isInteger(d)||d<0||d>9)||g.some((d,i)=>d&&d!==sol[i]))throw Error('Invalid hint input');
 const wrong=e.flatMap((d,i)=>d&&d!==sol[i]?[i]:[]);if(wrong.length)return{kind:'incorrect',cells:wrong};const b=g.map((d,i)=>d||e[i]);if(b.every(Boolean))return{kind:'complete'};
 const session=new LogicalSession(b),steps:Step[]=[];let s;while((s=session.next(level))){steps.push(s);if(s.placement)return{kind:'logical',steps};session.apply(s,level)}return{kind:'unsupported'};
}
