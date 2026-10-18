import type {AccountAdapter} from './accounts';
interface Player {isAuthorized():boolean;getUniqueID():string;getName():string;getData(keys:string[]):Promise<{dokuProfile?:string}>;setData(data:{dokuProfile:string},flush:boolean):Promise<void>}
interface YSDK {getPlayer():Promise<Player>;auth:{openAuthDialog():Promise<void>};features:{LoadingAPI:{ready():void};GameplayAPI?:{start():void;stop():void}};adv:{showFullscreenAdv(o:{callbacks:{onOpen():void;onClose(shown:boolean):void;onError(e:unknown):void}}):void;showBannerAdv():Promise<unknown>;hideBannerAdv():Promise<unknown>};on(n:string,f:()=>void):void;off(n:string,f:()=>void):void}
declare global {interface Window {YaGames?:{init():Promise<YSDK>}}}
let sdk:YSDK|null=null;
export async function initYandex(){
 if(import.meta.env.MODE!=='yandex')return false;
 return new Promise<boolean>(resolve=>{
  let settled=false;const script=document.createElement('script');
  const finish=(value:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value)};
  const timer=setTimeout(()=>finish(false),5000);
  script.src='/sdk.js';script.onerror=()=>finish(false);
  script.onload=async()=>{try{const candidate=await window.YaGames!.init();if(settled)return;sdk=candidate;finish(true)}catch{finish(false)}};
  document.head.append(script);
 });
}
export const yandex={ready:()=>sdk?.features.LoadingAPI.ready(),gameplay:(running:boolean)=>{if(running)sdk?.features.GameplayAPI?.start();else sdk?.features.GameplayAPI?.stop()},listen:(paused:()=>void,resumed:()=>void)=>{sdk?.on('game_api_pause',paused);sdk?.on('game_api_resume',resumed);return()=>{sdk?.off('game_api_pause',paused);sdk?.off('game_api_resume',resumed)}},banner:async(show:boolean)=>{if(!sdk)return;if(show)await sdk.adv.showBannerAdv();else await sdk.adv.hideBannerAdv()},showAd:(onImpression:()=>void)=>new Promise<boolean>(resolve=>{if(!sdk){resolve(false);return}let finished=false;const done=(shown:boolean)=>{if(finished)return;finished=true;resolve(shown)};try{sdk.adv.showFullscreenAdv({callbacks:{onOpen:()=>{},onClose:shown=>{if(!finished&&shown)onImpression();done(shown)},onError:()=>done(false)}})}catch{done(false)}})};

function timeout<T>(promise:Promise<T>):Promise<T>{return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Нет ответа от облака. Прогресс сохранён на устройстве.')),12000);promise.then(v=>{clearTimeout(timer);resolve(v)},e=>{clearTimeout(timer);reject(e)})})}
async function playerFor(id:string){
 if(!sdk)throw Error('Нет подключения к платформе. Прогресс сохранён на устройстве.');
 const player=await timeout(sdk.getPlayer());
 if(!player.isAuthorized()||`yandex:${player.getUniqueID()}`!==id)throw Error('Аккаунт изменился. Подключите нужный профиль. Данные не смешаны.');
 return player;
}
export const yandexAccount:AccountAdapter={
 get available(){return Boolean(sdk?.getPlayer)},
 account:async(interactive)=>{
  if(!sdk)throw Error('Платформа недоступна. Попробуйте позже.');
  let p=await timeout(sdk.getPlayer());
  if(!p.isAuthorized()&&interactive){await timeout(sdk.auth.openAuthDialog());p=await timeout(sdk.getPlayer())}
  return p.isAuthorized()?{id:`yandex:${p.getUniqueID()}`,name:p.getName()}:null;
 },
 read:async id=>{const p=await playerFor(id);return(await timeout(p.getData(['dokuProfile']))).dokuProfile??null},
 write:async(id,value)=>{if(new TextEncoder().encode(JSON.stringify({dokuProfile:value})).length>195000)throw Error('Облачное сохранение превышает лимит платформы. Полный прогресс сохранён на устройстве.');const p=await playerFor(id);await timeout(p.setData({dokuProfile:value},true))},
};
