interface YSDK {features:{LoadingAPI:{ready():void};GameplayAPI?:{start():void;stop():void}};adv:{showFullscreenAdv(o:{callbacks:{onOpen():void;onClose(shown:boolean):void;onError(e:unknown):void}}):void;showBannerAdv():Promise<unknown>;hideBannerAdv():Promise<unknown>};on(n:string,f:()=>void):void;off(n:string,f:()=>void):void}
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
