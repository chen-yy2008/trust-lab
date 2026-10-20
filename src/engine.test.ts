import {describe,it,expect} from 'vitest';
import {defaults,ids,rng,scores,choose,step,match,stats,tournament,evolve,generation,validate,conditions} from './engine';
import type {Round,Config} from './engine';
const c=structuredClone(defaults);
const round=(a:'C'|'D',b:'C'|'D'):Round=>{const[sa,sb]=scores(a,b,c.payoff);return{a,b,sa,sb,intendedA:a,intendedB:b};};
describe('囚徒困境和同时行动',()=>{
 it('四格收益与条件',()=>{expect(scores('C','C',c.payoff)).toEqual([3,3]);expect(scores('D','C',c.payoff)).toEqual([5,0]);expect(scores('C','D',c.payoff)).toEqual([0,5]);expect(scores('D','D',c.payoff)).toEqual([1,1]);expect(conditions(c.payoff)).toEqual({dilemma:true,cooperation:true});expect(conditions({...c.payoff,T:8}).cooperation).toBe(false);});
 it('当轮玩家行动无法被对手读取',()=>{const past=[round('C','D')],snapshot=structuredClone(past);expect(step(past,'D','tft',c,rng(1)).b).toBe('C');expect(step(past,'C','tft',c,rng(1)).b).toBe('C');expect(past).toEqual(snapshot);});
 it('固定和概率终止，安全上限',()=>{expect(match('tft','tft',c)).toHaveLength(30);expect(match('tft','tft',{...c,mode:'random',stop:1})).toHaveLength(1);expect(match('tft','tft',{...c,mode:'random',stop:0})).toHaveLength(30);});
 it('噪声极值与经验频率',()=>{const clean=match('cooperate','cooperate',{...c,rounds:500,noise:0});expect(stats(clean).cooperation).toBe(1);const noisy=match('cooperate','cooperate',{...c,rounds:500,noise:1});expect(stats(noisy).cooperation).toBe(0);const sample=match('cooperate','cooperate',{...c,rounds:500,noise:.25});expect(stats(sample).cooperation).toBeGreaterThan(.68);expect(stats(sample).cooperation).toBeLessThan(.82);});
});
describe('八种独立策略',()=>{
 it('永远合作 / 背叛',()=>{expect(choose('cooperate',[round('D','D')],'a',c,rng(1))).toBe('C');expect(choose('defect',[],'a',c,rng(1))).toBe('D');});
 it('以牙还牙首轮合作，随后复制对手实际行动',()=>{expect(choose('tft',[],'a',c,rng(1))).toBe('C');expect(choose('tft',[round('C','D')],'a',c,rng(1))).toBe('D');expect(choose('tft',[round('D','C')],'a',c,rng(1))).toBe('C');});
 it('宽恕概率控制行为',()=>{expect(choose('generous',[round('C','D')],'a',{...c,forgiveness:1},rng(1))).toBe('C');expect(choose('generous',[round('C','D')],'a',{...c,forgiveness:0},rng(1))).toBe('D');});
 it('记仇一旦触发不再复原',()=>{expect(choose('grudger',[round('C','C')],'a',c,rng(1))).toBe('C');expect(choose('grudger',[round('C','D'),round('D','C')],'a',c,rng(1))).toBe('D');});
 it('赢则保持 / 输则切换，双方视角正确',()=>{expect(choose('pavlov',[round('D','C')],'a',c,rng(1))).toBe('D');expect(choose('pavlov',[round('C','C')],'a',c,rng(1))).toBe('C');expect(choose('pavlov',[round('D','D')],'a',c,rng(1))).toBe('C');expect(choose('pavlov',[round('D','C')],'b',c,rng(1))).toBe('D');});
 it('随机策略可配置且可复现',()=>{expect(choose('random',[],'a',{...c,cooperation:1},rng(1))).toBe('C');expect(choose('random',[],'a',{...c,cooperation:0},rng(1))).toBe('D');expect(match('random','random',c)).toEqual(match('random','random',c));});
 it('机会主义者明确伪装、利用及退出条件',()=>{const h=[round('C','C'),round('C','C'),round('C','C')];expect(choose('opportunist',h.slice(0,2),'a',{...c,exploit:1},rng(1))).toBe('C');expect(choose('opportunist',h,'a',{...c,exploit:1},rng(1))).toBe('D');expect(choose('opportunist',h,'a',{...c,exploit:0},rng(1))).toBe('C');expect(choose('opportunist',[round('C','D'),round('C','D'),round('C','D')],'a',c,rng(1))).toBe('D');expect(match('opportunist','generous',c)).toEqual(match('opportunist','generous',c));});
});
describe('锦标赛与演化',()=>{
 it('总收益、均值和合作率确实来自交锋日志',()=>{const t=tournament(['cooperate','defect'],{...c,rounds:10,repeats:2});expect(t.matrix).toEqual([[3,0],[5,1]]);expect(t.cooperation).toEqual([[1,1],[0,0]]);expect(t.ranking[0].id).toBe('defect');expect(t.ranking[0].total).toBe(120);expect(t.ranking[0].average).toBe(3);expect(t.logs).toHaveLength(6);});
 it('参数改变会改变结果，同种子可复现',()=>{const a=tournament([...ids],c);expect(a).toEqual(tournament([...ids],c));expect(a.matrix).not.toEqual(tournament([...ids],{...c,noise:.2}).matrix);});
 it('演化分布有限、非负、归一化且可复现',()=>{const result=evolve({...c,generations:40});for(const x of result.history){expect(x.reduce((a,b)=>a+b,0)).toBeCloseTo(1,12);for(const v of x){expect(Number.isFinite(v)).toBe(true);expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(1);}}expect(result).toEqual(evolve({...c,generations:40}));expect(result.history.at(-1)).not.toEqual(evolve({...c,generations:40,mutation:.4}).history.at(-1));});
 it('零选择强度与全变异的解析边界',()=>{const x=[.9,.1],matrix=[[3,0],[5,1]];expect(generation(x,matrix,0,0).next[0]).toBeCloseTo(.9);expect(generation(x,matrix,20,1).next).toEqual([.5,.5]);});
 it('极端收益与选择压力仍稳定',()=>{const g=generation([.5,.5],[[100,-100],[-100,100]],20,.01);expect(g.next.every(Number.isFinite)).toBe(true);expect(g.next.reduce((a,b)=>a+b,0)).toBeCloseTo(1);});
 it('拒绝非法参数和空群体',()=>{expect(validate({...c,rounds:0})).not.toHaveLength(0);expect(validate({...c,population:ids.map(()=>0)})).not.toHaveLength(0);expect(validate({...c,noise:NaN})).not.toHaveLength(0);expect(()=>match('tft','tft',{...c,rounds:100000})).toThrow();});
});
