import {it,expect,vi,beforeEach} from 'vitest';
vi.mock('../src/platform/native',()=>({isAndroid:()=>true,Native:{addListener:vi.fn(),showReward:vi.fn(),readReward:vi.fn(),ackReward:vi.fn()}}));
import {Native} from '../src/platform/native';
import {showReward,recoverReward} from '../src/platform';
beforeEach(()=>vi.resetAllMocks());
it('deduplicates reward callback and close result, saves before acknowledgement',async()=>{
 const order:string[]=[];const remove=vi.fn(async()=>{});let listener:(r:{id?:string;gameId?:string})=>void=()=>{};
 vi.mocked(Native.addListener).mockImplementation(async(_,fn)=>{listener=fn;return{remove}});
 vi.mocked(Native.showReward).mockImplementation(async()=>{listener({id:'r',gameId:'g'});listener({id:'r',gameId:'g'});return{shown:true,rewarded:true,rewardId:'r'}});
 vi.mocked(Native.ackReward).mockImplementation(async()=>{order.push('ack')});
 const grant=vi.fn(async()=>{order.push('save')});expect((await showReward('g',grant)).rewarded).toBe(true);expect(grant).toHaveBeenCalledTimes(1);expect(order).toEqual(['save','ack']);expect(remove).toHaveBeenCalledOnce();
});
it('does not grant on no fill or early close',async()=>{vi.mocked(Native.addListener).mockResolvedValue({remove:async()=>{}});for(const shown of [false,true]){vi.mocked(Native.showReward).mockResolvedValue({shown,rewarded:false});const grant=vi.fn();await showReward('g',grant);expect(grant).not.toHaveBeenCalled()}});
it('keeps journal unacknowledged when saving fails, recovers after restart',async()=>{vi.mocked(Native.readReward).mockResolvedValue({id:'r',gameId:'g'});await expect(recoverReward(async()=>{throw Error('disk')})).rejects.toThrow();expect(Native.ackReward).not.toHaveBeenCalled();const grant=vi.fn(async()=>{});await recoverReward(grant);expect(grant).toHaveBeenCalledWith('r','g');expect(Native.ackReward).toHaveBeenCalledWith({id:'r'})});
