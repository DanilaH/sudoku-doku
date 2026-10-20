import type {AdCaps} from './game';
export const day=(t:number)=>{const d=new Date(t);return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`};
export function adEligibility(c:AdCaps,completedCount:number,wall:number,mono:number,lastMono:number|null){if(completedCount<=1)return'first_game';if(wall<c.lastWall)return'clock_rollback';if(lastMono!==null&&mono-lastMono<600000)return'interval';if(c.impressions.length&&wall-c.lastWall<600000)return'interval';return'eligible'}
export function impression(c:AdCaps,now:number):AdCaps{return{...c,lastWall:Math.max(c.lastWall,now),impressions:[...c.impressions.filter(t=>now-t<3*86400000||t>now),now]}}
