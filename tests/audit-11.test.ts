import {it,expect} from 'vitest';
import {initialState,newGame,input,withGame,validateState} from '../src/core/game';
import {puzzles} from '../src/core/bank';
import {mergeProfiles} from '../src/core/profile';
import {SaveQueue} from '../src/platform/storage';
import {ProfileStorage} from '../src/platform/accounts';
it('merges completion from another device over stale notes in either order',()=>{
 let g=newGame(puzzles[0],false,'shared');g=input({...g,selected:g.givens.indexOf(0),noteMode:true},3);
 const local=withGame(initialState(),g,300);
 const won={...g,completed:true,notes:Array(81).fill(0),entries:g.givens.map((d,i)=>d?0:g.solution[i]),undo:[],redo:[]};
 const remote=withGame(withGame(initialState(),won,100),newGame(puzzles[1],false,'next'),200);
 for(const [a,b] of [[local,remote],[remote,local]]){const merged=mergeProfiles(a,b);expect(merged.normal?.completed).toBe(true);expect(merged.normal?.notes.every(n=>n===0)).toBe(true);expect(merged.results).toHaveLength(1);expect(validateState(merged)).toBeTruthy()}
});
it('coalesces pending immutable snapshots without losing moves and waits for the latest commit',async()=>{
 let raw:string|null=null;let release:()=>void=()=>{};const writes:number[]=[];
 const store=new ProfileStorage({read:async()=>raw,write:async v=>{writes.push(JSON.parse(v).revision);if(writes.length===1)await new Promise<void>(r=>{release=r});raw=v}});
 await store.read();const q=new SaveQueue(store);let g=newGame(puzzles[0]);g={...g,selected:g.givens.indexOf(0)};
 let state=withGame(initialState(),g);const first=q.saveLocal(state);await new Promise(r=>setTimeout(r,0));
 g=input(g,3);state=withGame(state,g);const second=q.saveLocal(state);g=input(g,4);state=withGame(state,g);const third=q.saveLocal(state);
 let flushed=false;const flush=q.flush().then(()=>{flushed=true});await Promise.resolve();expect(flushed).toBe(false);release();await Promise.all([first,second,third,flush]);
 expect(writes).toEqual([1,3]);const restored=validateState(JSON.parse(raw!));expect(restored.current?.undo).toHaveLength(2);expect(restored.current?.entries[g.selected!]).toBe(4);
});
it('failed local write retains the confirmed snapshot and can retry the newest state',async()=>{
 let raw:string|null=null,fail=false;const store=new ProfileStorage({read:async()=>raw,write:async v=>{if(fail)throw Error('disk');raw=v}});await store.read();const q=new SaveQueue(store);
 const first={...initialState(),revision:1};await q.saveLocal(first);const saved=raw;fail=true;const next={...first,revision:2,profile:{name:'Игрок',updatedAt:10}};await expect(q.saveLocal(next)).rejects.toThrow('disk');expect(raw).toBe(saved);fail=false;await q.saveLocal(next);expect((await q.load())?.profile?.name).toBe('Игрок');
});
