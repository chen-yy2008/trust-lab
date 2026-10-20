import {describe,it,expect,vi,afterEach} from 'vitest';
import {load,importReports,csv,reportCSV,persist,empty} from './storage';
import type {Report} from './storage';
import {defaults,match,tournament,evolve,ids} from './engine';
const make=(kind:Report['kind'],data:unknown):Report=>({version:1,id:'test',name:'实验',date:'2026-10-20T00:00:00.000Z',kind,config:defaults,data});
afterEach(()=>vi.unstubAllGlobals());
describe('安全档案读写',()=>{
 it('损坏的 localStorage 不阻止启动',()=>{vi.stubGlobal('localStorage',{getItem:()=>'{oops'});expect(load().store).toEqual(empty);expect(load().error).not.toBe('');});
 it('存储配额异常可解释',()=>{vi.stubGlobal('localStorage',{setItem:()=>{throw Error('quota');}});expect(persist(empty)).toContain('空间已满');});
 it('各类型 JSON 真实往返',()=>{const e=evolve({...defaults,generations:3}),rs=[make('match',{opponent:'tft',history:match('random','tft',defaults)}),make('tournament',tournament([...ids],defaults)),make('evolution',e),make('comparison',{a:e,b:e,configB:defaults})];const result=importReports(JSON.stringify(rs));expect(result.map(r=>r.data)).toEqual(rs.map(r=>r.data));expect(result[0].id).not.toBe('test');});
 it('拒绝未知/损坏/过大档案',()=>{expect(()=>importReports('oops')).toThrow();expect(()=>importReports(JSON.stringify(make('evolution',{history:[[2]],averages:[0]})))).toThrow();expect(()=>importReports(' '.repeat(10_000_001))).toThrow();});
 it('CSV 正确转义与原始数据一致',()=>{expect(csv([['a,b','"quote"','=SUM(A1)']])).toContain('"a,b","""quote""","\'=SUM(A1)"');const r=make('match',{opponent:'tft',history:match('cooperate','tft',{...defaults,rounds:2})});expect(reportCSV(r).split('\r\n')).toHaveLength(3);expect(reportCSV(r)).toContain('"C","C","C","C","3","3"');});
});
