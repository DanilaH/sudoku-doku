import {useState} from 'react';
import type {State} from '../core/game';
import {Statistics} from './Statistics';
import {bankProgress} from '../core/progress';
import {puzzles} from '../core/bank';
export function Profile({state,accountId,available,busy,message,rename,connect,sync,disconnect,trophies}:{state:State;accountId:string|null;available:boolean;busy:boolean;message:string;rename:(s:string)=>void;connect:()=>void;sync:()=>void;disconnect:()=>void;trophies:()=>void}){
 const [name,setName]=useState(state.profile?.name??'Игрок');const progress=bankProgress(puzzles,state.results);
 return <div className="profile-page"><section className="simple"><h1>Профиль</h1>
 <form className="profile-name" onSubmit={e=>{e.preventDefault();if(name.trim())rename(name.trim())}}><label>Имя<input value={name} maxLength={32} onChange={e=>setName(e.target.value)} disabled={busy}/></label><button disabled={busy||!name.trim()||name.trim()===state.profile?.name}>Сохранить имя</button></form>
 <p>{accountId?'Профиль '+(accountId.startsWith('yandex:')?'Яндекса':'RuStore'):'Гость · сохранение на устройстве'}</p>
 <p>Решено {progress.solved} из {progress.total}</p><button className="profile-trophies" onClick={trophies}>Мои трофеи →</button>
 {accountId?<div className="profile-actions"><button disabled={busy} onClick={sync}>Синхронизировать</button><button disabled={busy} onClick={disconnect}>Играть как гость</button></div>:available?<><p className="help">Подключите облако, чтобы продолжить на другом устройстве. Гостевой прогресс будет добавлен к вашему профилю.</p><button className="primary" disabled={busy} onClick={connect}>Подключить облачное сохранение</button></>:<p className="help">Все задачи доступны без входа. Облачное сохранение в этой сборке пока недоступно.</p>}
 {accountId&&<button disabled={busy} className="text-button" onClick={connect}>Подключить другой аккаунт платформы</button>}
 <p className="profile-status" role="status">{busy?'Синхронизация…':message}</p>
 </section><Statistics state={state}/></div>
}
