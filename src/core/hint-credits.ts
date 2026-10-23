import {withGame,type Game,type State} from './game';
export const hintCredits=(g:Game)=>g.hintCredits??3;
export function spendHint(g:Game):Game {if(g.completed||hintCredits(g)<=0)throw Error('Нет подсказок');return {...g,hintCredits:hintCredits(g)-1};}
export function rewardHints(s:State,gameId:string,receipt:string):State {
 const g=[s.current,s.normal,...Object.values(s.daily)].find(g=>g?.id===gameId);
 if(!g||g.completed||g.lastHintReward===receipt||hintCredits(g)>0)return s;
 const next=withGame(s,{...g,hintCredits:3,lastHintReward:receipt});
 return s.current?.id===gameId?next:{...next,current:s.current};
}

export const hintAlreadyOpened=(g:Game)=>Boolean(g.openedHintPositions?.includes(g.entries.join('')));
export function openHint(g:Game,metered=true):Game {
 if(hintAlreadyOpened(g))return g;
 const next=metered?spendHint(g):g;
 return {...next,hints:g.hints+1,openedHintPositions:[...(g.openedHintPositions??[]).slice(-511),g.entries.join('')]};
}
