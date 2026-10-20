import {it,expect,vi} from 'vitest';
vi.mock('../src/platform/native',()=>({isAndroid:()=>true,Native:{addListener:vi.fn(),showAd:vi.fn()}}));
import {Native} from '../src/platform/native';
import {showAd} from '../src/platform';
it('records duplicate impression callbacks once and releases the listener',async()=>{const remove=vi.fn(async()=>{}),seen=vi.fn();vi.mocked(Native.addListener).mockImplementation(async(_name,fn)=>{fn({});fn({});return{remove}});vi.mocked(Native.showAd).mockResolvedValue({shown:true});expect(await showAd(seen)).toBe(true);expect(seen).toHaveBeenCalledTimes(1);expect(remove).toHaveBeenCalledTimes(1)});
it('no fill and SDK failure complete without waiting for a late load',async()=>{const remove=vi.fn(async()=>{});vi.mocked(Native.addListener).mockResolvedValue({remove});vi.mocked(Native.showAd).mockResolvedValue({shown:false});const seen=vi.fn();expect(await showAd(seen)).toBe(false);vi.mocked(Native.showAd).mockRejectedValue(Error('SDK failure'));expect(await showAd(seen)).toBe(false);expect(seen).not.toHaveBeenCalled();expect(remove).toHaveBeenCalledTimes(2)});
