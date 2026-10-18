import {Capacitor,registerPlugin} from '@capacitor/core';
import {type Account,type AccountAdapter} from './accounts';
/** Native integration boundary. Enable only after console activation and real-device verification.
 * The native bridge must recheck account identity for EVERY read/write, not reuse a cached user.
 */
interface RuStoreProfiles {
 account():Promise<Account>;
 read(o:{accountId:string}):Promise<{value:string|null}>;
 write(o:{accountId:string;value:string}):Promise<void>;
}
const bridge=registerPlugin<RuStoreProfiles>('RuStoreProfiles');
export const rustoreAccount:AccountAdapter={
 get available(){return Capacitor.isNativePlatform()&&Capacitor.isPluginAvailable('RuStoreProfiles')},
 account:async()=>{if(!rustoreAccount.available)throw Error('Облачное сохранение RuStore пока не подключено. Прогресс сохраняется на устройстве.');return bridge.account()},
 read:async id=>(await bridge.read({accountId:id})).value,
 write:async(id,value)=>bridge.write({accountId:id,value}),
};
