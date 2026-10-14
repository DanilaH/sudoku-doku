import {registerPlugin,Capacitor} from '@capacitor/core';
export interface DokuNativePlugin {read():Promise<{value:string|null}>;write(o:{value:string}):Promise<void>;banner(o:{visible:boolean;top:number;viewportWidth:number;width:number;height:number;bottom:number;left:number}):Promise<void>;prepareAd():Promise<void>;showAd():Promise<{shown:boolean}>;event(o:{name:string;params:string}):Promise<void>;keepAwake(o:{enabled:boolean}):Promise<void>;addListener(name:'adImpression'|'adsReady',fn:()=>void):Promise<{remove:()=>Promise<void>}>}
export const Native=registerPlugin<DokuNativePlugin>('DokuNative');
export const isAndroid=()=>Capacitor.getPlatform()==='android';
