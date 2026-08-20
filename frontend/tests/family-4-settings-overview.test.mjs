import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source=readFileSync(new URL('../src/features/business-settings/overview.ts',import.meta.url),'utf8'); const m={exports:{}}; Function('exports','require','module',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m.exports,()=>{},m);
test('overview maps reliable aggregate summaries',()=>{assert.equal(m.exports.businessSummary({name:'a',category:'b',phone:'c',address:'d'}).status,'complete');assert.equal(m.exports.businessSummary({name:'a'}).status,'attention');assert.equal(m.exports.hoursSummary([{startTime:'09:00',endTime:'18:00'}]).text,'1 天營業');assert.equal(m.exports.hoursSummary([]).status,'attention');assert.match(m.exports.serviceSummary([{active:true},{active:false}]).text,/1 項服務已啟用/);assert.equal(m.exports.notificationSummary({emailVerified:false}).status,'attention');assert.equal(m.exports.lineSummary({configured:true,enabled:true},{tokenValid:false}).status,'attention');assert.equal(m.exports.lineSummary({configured:false},null).text,'LINE 尚未設定');});
