import {useState} from 'react';
import type {State} from '../core/game';
import {statistics as profileStats} from '../core/progress';
import {bankProgress} from '../core/progress';
import {puzzles} from '../core/bank';
export function Profile({state,accountId,available,busy,message,rename,connect,sync,disconnect,trophies,statistics}:{state:State;accountId:string|null;available:boolean;busy:boolean;message:string;rename:(s:string)=>void;connect:()=>void;sync:()=>void;disconnect:()=>void;trophies:()=>void;statistics:()=>void}){
 const [editing,setEditing]=useState(false);const [name,setName]=useState(state.profile?.name??'Игрок');const stats=profileStats(state);const progress=bankProgress(puzzles,state.results);
 return <div className="profile-page"><section className="simple"><h1>Профиль</h1>
 <div className="profile-identity"><span className="profile-avatar" aria-hidden="true">{(state.profile?.name??'Игрок').slice(0,1).toUpperCase()}</span><div><h2>{state.profile?.name??'Игрок'}</h2><span>{accountId?'Облачное сохранение':'На этом устройстве'}</span></div><button className="text-button" onClick={()=>setEditing(!editing)}>{editing?'Отмена':'Изменить имя'}</button></div>
 {editing&&<form className="profile-name" onSubmit={e=>{e.preventDefault();if(name.trim()){rename(name.trim());setEditing(false)}}}><label>Имя<input value={name} maxLength={32} onChange={e=>setName(e.target.value)} disabled={busy}/></label><button disabled={busy||!name.trim()||name.trim()===state.profile?.name}>Сохранить имя</button></form>}
 <p>{accountId?'Профиль '+(accountId.startsWith('yandex:')?'Яндекса':'RuStore'):'Локальный профиль'}</p>
 <div className="profile-summary"><div><strong>{progress.solved}<small>/{progress.total}</small></strong><span>Задач в коллекции</span></div><div><strong>{stats.unassisted}</strong><span>Партий без подсказок</span></div></div><button className="profile-trophies" onClick={trophies}>Мои трофеи →</button>
 {accountId?<div className="profile-actions"><button disabled={busy} onClick={sync}>Синхронизировать</button><button disabled={busy} onClick={disconnect}>Играть как гость</button></div>:available?<><p className="help">Подключите облако, чтобы продолжить на другом устройстве. Гостевой прогресс будет добавлен к вашему профилю.</p><button className="primary" disabled={busy} onClick={connect}>Подключить облачное сохранение</button></>:<p className="help">Прогресс сохраняется на этом устройстве. Все задачи доступны без входа.</p>}
 {accountId&&<button disabled={busy} className="text-button" onClick={connect}>Подключить другой аккаунт платформы</button>}
 <p className="profile-status" role="status">{busy?'Синхронизация…':message}</p>
 <button className="profile-stats-link" onClick={statistics}>Вся статистика →</button></section></div>
}
