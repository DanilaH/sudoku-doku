import {App} from '@capacitor/app';
import {Native,isAndroid} from './native';
import {yandex} from './yandex';
export async function event(name:string,params:Record<string,unknown>={}){if(isAndroid())try{await Native.event({name,params:JSON.stringify(params)})}catch{/* Product functionality must not depend on diagnostics. */}}
export async function prepareAd(){if(isAndroid())try{await Native.prepareAd()}catch{}}
export async function showAd(onImpression:()=>void){let recorded=false;const record=()=>{if(recorded)return;recorded=true;onImpression()};if(isAndroid()){const listener=await Native.addListener('adImpression',record);try{return(await Native.showAd()).shown}catch{return false}finally{await listener.remove()}}return yandex.showAd(record)}
export async function keepAwake(enabled:boolean){if(isAndroid()){await Native.keepAwake({enabled});return}const nav=navigator as Navigator&{wakeLock?:{request(type:string):Promise<{release():Promise<void>}>}};if(enabled&&nav.wakeLock){try{wake=await nav.wakeLock.request('screen')}catch{}}else{await wake?.release();wake=null}}
let wake:{release():Promise<void>}|null=null;
export function nativeLifecycle(active:(v:boolean)=>void,back:()=>void){if(!isAndroid())return()=>{};let disposed=false;const p1=App.addListener('appStateChange',({isActive})=>active(isActive)),p2=App.addListener('backButton',back);Promise.all([p1,p2]).then(ls=>{if(disposed)ls.forEach(l=>l.remove())});return()=>{disposed=true;Promise.all([p1,p2]).then(ls=>ls.forEach(l=>l.remove()))}}

export async function recoverReward(grant:(id:string,gameId:string)=>Promise<void>){if(!isAndroid())return;const r=await Native.readReward();if(r.id&&r.gameId){await grant(r.id,r.gameId);await Native.ackReward({id:r.id})}}
export async function showReward(gameId:string,grant:(id:string,gameId:string)=>Promise<void>):Promise<{rewarded:boolean;shown:boolean}>{
 if(!isAndroid())return yandex.showReward(async()=>grant(crypto.randomUUID(),gameId));
 let pending:Promise<void>=Promise.resolve();let error:unknown;const seen=new Set<string>();
 const accept=(id?:string,target?:string)=>{if(!id||target!==gameId||seen.has(id))return;seen.add(id);pending=pending.then(async()=>{await grant(id,gameId);await Native.ackReward({id})}).catch(e=>{error=e})};
 const listener=await Native.addListener('hintReward',r=>accept(r.id,r.gameId));
 try{let result;try{result=await Native.showReward({gameId})}catch{result={shown:false,rewarded:false,rewardId:undefined}}accept(result.rewardId,gameId);await pending;if(error)throw error;return result}finally{await listener.remove()}
}
