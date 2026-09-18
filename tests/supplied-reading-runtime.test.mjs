import fs from 'node:fs';
import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync(new URL('../data/supplied-reading-runtime.json',import.meta.url),'utf8'));
assert.equal(d.schemaVersion,1);
assert.equal(d.records.length,33);
for(const id of ['FY24A','FY24B','FY25A','FY25B'])assert.ok(d.records.filter(x=>x.examId===id).length>=8,id+' reading coverage');
assert.equal(new Set(d.records.map(x=>x.id)).size,d.records.length);
for(const q of d.records){assert.equal(q.majorQuestion,6);assert.equal(q.sourceSubset,true);assert.equal(q.answerAuthority,'independent_solution_nonofficial');assert.ok(q.targetId)}
assert.equal(d.records.filter(x=>x.scoringType==='manual_reading').length,1);
assert.deepEqual(d.records.find(x=>x.id==='R24-ENG-A-Q6-9').answerSpec.choices,['ア','ウ','オ']);
assert.deepEqual(d.records.find(x=>x.id==='R25-ENG-B-Q6-8').answerSpec.choices,['ア','ウ','エ']);
console.log('Rikkyo supplied reading runtime dataset: CLEAN');
