import type {Storage} from './storage';
import {initialState,validateState,type State} from '../core/game';
import {decodeProfile,encodeProfile,mergeProfiles} from '../core/profile';
export interface Account {id:string;name?:string}
export interface AccountAdapter {
 readonly available:boolean;
 /** Interactive only after explicit user action. Never prompt from startup/sync. */
 account(interactive:boolean):Promise<Account|null>;
 read(accountId:string):Promise<string|null>;
 write(accountId:string,value:string):Promise<void>;
}
export const guestAccount:AccountAdapter={available:false,account:async()=>null,read:async()=>null,write:async()=>{throw Error('Облако недоступно')}};
interface Vault {format:'profiles-v1';active:string;profiles:Record<string,State>}
export class ProfileStorage implements Storage {
 private vault:Vault={format:'profiles-v1',active:'guest',profiles:{}};
 private initialized=false;
 constructor(private base:Storage){}
 get accountId(){return this.vault.active==='guest'?null:this.vault.active}
 async read(){
  if(!this.initialized){const raw=await this.base.read();if(raw){const value=JSON.parse(raw);if(value.format==='profiles-v1'){
   if(typeof value.active!=='string'||!value.profiles||!Object.hasOwn(value.profiles,value.active))throw Error('Corrupt profiles');
   for(const state of Object.values(value.profiles))validateState(state);this.vault=value;
  }else this.vault.profiles.guest=validateState(value);}this.initialized=true;}
  const state=this.vault.profiles[this.vault.active];return state?JSON.stringify(state):null;
 }
 async write(value:string){await this.writeLocalState(validateState(JSON.parse(value)))}
 async writeLocalState(state:State){const next={...this.vault,profiles:{...this.vault.profiles,[this.vault.active]:state}};await this.commit(next)}
 private async commit(next:Vault){
  // Keep legacy guest storage readable by older builds until accounts are actually used.
  const value=next.active==='guest'&&Object.keys(next.profiles).length===1?next.profiles.guest:next;
  await this.base.write(JSON.stringify(value));this.vault=next;
 }
 async connect(id:string,remote:State|null,name?:string){
  const existing=this.vault.profiles[id];
  const local=existing??initialState();
  let state=remote?mergeProfiles(local,remote):local;
  if(this.vault.active==='guest'&&this.vault.profiles.guest)state=mergeProfiles(this.vault.profiles.guest,state);
  if(!state.profile)state.profile={name:name?.slice(0,32)||'Игрок',updatedAt:Date.now()};
  const profiles={...this.vault.profiles,[id]:state};
  // Guest progress has been transferred. A subsequent guest session belongs to no account.
  if(this.vault.active==='guest')profiles.guest=initialState();
  await this.commit({...this.vault,active:id,profiles});return state;
 }
 async disconnect(){const state=this.vault.profiles.guest??initialState();await this.commit({...this.vault,active:'guest',profiles:{...this.vault.profiles,guest:state}});return state}
}
export async function fetchProfile(adapter:AccountAdapter,id:string){const raw=await adapter.read(id);return raw?decodeProfile(raw):null}
export async function pushProfile(adapter:AccountAdapter,id:string,state:State){await adapter.write(id,await encodeProfile(state))}
