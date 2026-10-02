import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={console};
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/gannwyck-model1.js','utf8'),context);
vm.runInContext(fs.readFileSync('src/mtf-scanner.js','utf8'),context);

const candles=Array.from({length:120},(_,i)=>({time:i,open:100+i*.1,high:101+i*.1,low:99+i*.1,close:100.5+i*.1,volume:1000+i}));
const result=context.GannWyckMTF.scan({'1h':candles,'4h':candles},{timeframes:['1h','4h']});
assert.equal(result.rows.length,2);
assert.ok(result.rows.every(x=>x.dataQualityScore===100));
assert.ok(result.rows.every(x=>x.evidenceScore>=0&&x.evidenceScore<=100));
assert.equal(JSON.stringify(result).includes('agentes'),false);

const incomplete=candles.map(x=>({...x}));
incomplete[50]={open:100,high:101,low:99,close:NaN};
const blocked=context.GannWyckMTF.scan({'1h':incomplete},{timeframes:['1h']});
assert.ok(blocked.rows[0].dataQualityScore<100);
assert.equal(blocked.rows[0].evidenceScore,0);
assert.ok(blocked.rows[0].riskFlags.includes('DADOS_INCOMPLETOS'));
assert.equal(blocked.confirmedSetups,0);

console.log('MTF SCANNER TESTS PASSED');
