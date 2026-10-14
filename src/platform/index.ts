import {App} from '@capacitor/app';
import {Native,isAndroid} from './native';
import {yandex} from './yandex';
export async function event(name:string,params:Record<string,unknown>={}){if(isAndroid())try{await Native.event({name,params:JSON.stringify(params)})}catch{/* Product functionality must not depend on diagnostics. */}}
export async function prepareAd(){if(isAndroid())try{await Native.prepareAd()}catch{}}
export async function showAd(onImpression:()=>void){if(isAndroid()){const listener=await Native.addListener('adImpression',onImpression);try{return(await Native.showAd()).shown}catch{return false}finally{await listener.remove()}}return yandex.showAd(onImpression)}
export async function keepAwake(enabled:boolean){if(isAndroid()){await Native.keepAwake({enabled});return}const nav=navigator as Navigator&{wakeLock?:{request(type:string):Promise<{release():Promise<void>}>}};if(enabled&&nav.wakeLock){try{wake=await nav.wakeLock.request('screen')}catch{}}else{await wake?.release();wake=null}}
let wake:{release():Promise<void>}|null=null;
export function nativeLifecycle(active:(v:boolean)=>void,back:()=>void){if(!isAndroid())return()=>{};let disposed=false;const p1=App.addListener('appStateChange',({isActive})=>active(isActive)),p2=App.addListener('backButton',back);Promise.all([p1,p2]).then(ls=>{if(disposed)ls.forEach(l=>l.remove())});return()=>{disposed=true;Promise.all([p1,p2]).then(ls=>ls.forEach(l=>l.remove()))}}
