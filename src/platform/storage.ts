import {validateState,type State} from '../core/game';
import {Native,isAndroid} from './native';
export interface Storage {read():Promise<string|null>;write(value:string):Promise<void>}
export class BrowserStorage implements Storage {
 private db:Promise<IDBDatabase>;
 constructor(){this.db=new Promise((resolve,reject)=>{const r=indexedDB.open('sudoku-doku',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Закройте другую вкладку игры и обновите страницу.'))})}
 async read(){const db=await this.db;return new Promise<string|null>((resolve,reject)=>{const t=db.transaction('state','readonly'),r=t.objectStore('state').get('root');r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error)})}
 async write(value:string){const db=await this.db;return new Promise<void>((resolve,reject)=>{const t=db.transaction('state','readwrite');t.objectStore('state').put(value,'root');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error??Error('Save aborted'))})}
}
export const nativeStorage:Storage={read:async()=>(await Native.read()).value,write:async value=>Native.write({value})};
export const yandexStorage:Storage={read:async()=>localStorage.getItem('sudoku-doku-v1'),write:async v=>{localStorage.setItem('sudoku-doku-v1',v)}};
export function defaultStorage(){return isAndroid()?nativeStorage:new BrowserStorage()}
export class SaveQueue {
 private tail=Promise.resolve();private committedRevision=-1;
 constructor(private storage:Storage){}
 async load(){const raw=await this.storage.read();if(raw===null)return null;const s=validateState(JSON.parse(raw));this.committedRevision=s.revision;return s}
 save(s:State){const copy=JSON.stringify(validateState(s));const revision=s.revision;const op=this.tail.catch(()=>{}).then(async()=>{if(revision<=this.committedRevision)return;await this.storage.write(copy);this.committedRevision=revision});this.tail=op;return op}
 flush(){return this.tail}
}
