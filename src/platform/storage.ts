import {validateState,type State} from '../core/game';
import {Native,isAndroid} from './native';
export interface Storage {read():Promise<string|null>;write(value:string):Promise<void>;writeLocalState?(state:State):Promise<void>}
export class BrowserStorage implements Storage {
 private db:Promise<IDBDatabase>;
 constructor(){this.db=new Promise((resolve,reject)=>{const r=indexedDB.open('sudoku-doku',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Закройте другую вкладку игры и обновите страницу.'))})}
 async read(){const db=await this.db;return new Promise<string|null>((resolve,reject)=>{const t=db.transaction('state','readonly'),r=t.objectStore('state').get('root');r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error)})}
 async write(value:string){const db=await this.db;return new Promise<void>((resolve,reject)=>{const t=db.transaction('state','readwrite');t.objectStore('state').put(value,'root');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error??Error('Save aborted'))})}
}
export const nativeStorage:Storage={read:async()=>(await Native.read()).value,write:async value=>Native.write({value})};
export const yandexStorage:Storage={read:async()=>localStorage.getItem('sudoku-doku-v1'),write:async v=>{localStorage.setItem('sudoku-doku-v1',v)}};
export function defaultStorage(){return isAndroid()?nativeStorage:new BrowserStorage()}
type PendingSave = {state:State;waiters:Array<{resolve:()=>void;reject:(e:unknown)=>void}>};
export class SaveQueue {
 private tail:Promise<void>=Promise.resolve();private committedRevision=-1;
 private pending:PendingSave|null=null;private draining=false;
 constructor(private storage:Storage){}
 async load(){const raw=await this.storage.read();if(raw===null)return null;const s=validateState(JSON.parse(raw));this.committedRevision=s.revision;return s}
 /** External snapshots are validated and detached before entering the queue. */
 save(s:State){return this.enqueue(validateState(s))}
 /** Internal reducers use immutable snapshots; validate external data at load/merge boundaries. */
 saveLocal(s:State){return this.enqueue(s)}
 private enqueue(state:State):Promise<void>{
  if(!Number.isSafeInteger(state.revision)||state.revision<0)return Promise.reject(Error('Invalid revision'));
  if(state.revision<=this.committedRevision)return this.tail;
  const promise=new Promise<void>((resolve,reject)=>{
   if(this.pending){if(state.revision>this.pending.state.revision)this.pending.state=state;this.pending.waiters.push({resolve,reject})}
   else this.pending={state,waiters:[{resolve,reject}]};
  });
  // flush observes the newest requested revision. Earlier callers also settle on its commit.
  this.tail=promise;
  if(!this.draining){this.draining=true;queueMicrotask(()=>{void this.drain()})}
  return promise;
 }
 private async drain(){
  while(this.pending){
   const batch=this.pending;this.pending=null;
   try{
    if(batch.state.revision>this.committedRevision){
     if(this.storage.writeLocalState)await this.storage.writeLocalState(batch.state);
     else await this.storage.write(JSON.stringify(batch.state));
     this.committedRevision=batch.state.revision;
    }
    for(const waiter of batch.waiters)waiter.resolve();
   }catch(error){for(const waiter of batch.waiters)waiter.reject(error)}
  }
  this.draining=false;
 }
 flush(){return this.tail}
}
