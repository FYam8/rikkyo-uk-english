import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const q=read('data/supplied-source-questions.json');
const p=read('data/supplied-source-passages.json');
const sections=read('data/sections.json');

assert.equal(q.runtimeEnabled,false);
assert.equal(q.policy.officialKeyAvailable,false);
assert.equal(q.policy.missingSourceSectionsAreNotReconstructed,true);
assert.deepEqual(Object.keys(q.exams),['FY24A','FY24B','FY25A','FY25B']);

for(const id of ['FY24A','FY24B','FY25A','FY25B']){
  const records=q.exams[id];
  for(const major of [2,3,4,5,6])assert.ok(records.some(x=>x.majorQuestion===major),id+' missing supplied major '+major);
  assert.ok(records.every(x=>x.answerAuthority==='independent_solution_nonofficial'));
  assert.ok(records.every(x=>x.verificationStatus==='source_context_reviewed_v1'));
}
assert.ok(q.exams.FY25A.some(x=>x.majorQuestion===9&&x.imageRequired));
assert.ok(q.exams.FY25B.some(x=>x.majorQuestion===9&&x.imageRequired));
assert.ok(!q.exams.FY24A.some(x=>x.majorQuestion===9),'FY24A omitted Q9 must not be invented');
assert.ok(!q.exams.FY24B.some(x=>x.majorQuestion===9),'FY24B omitted Q9 must not be invented');

assert.equal(p.passages.length,4);
for(const id of ['FY24A','FY24B','FY25A','FY25B'])assert.equal(p.passages.filter(x=>x.examId===id).length,1);
assert.ok(p.passages.every(x=>x.transcriptionStatus==='source_checked_visual_v1'));

for(const id of ['FY24A','FY24B'])for(const qid of ['Q7','Q8','Q9'])assert.equal(sections.papers[id][qid].sourceStatus,'omitted_in_supplied_file');
for(const id of ['FY25A','FY25B'])for(const qid of ['Q7','Q8'])assert.equal(sections.papers[id][qid].sourceStatus,'omitted_in_supplied_file');

assert.deepEqual(q.exams.FY24A.find(x=>x.majorQuestion===6).subItems.find(x=>x.n===9).answer,['ア','ウ','オ']);
assert.deepEqual(q.exams.FY24B.find(x=>x.majorQuestion===6).subItems.find(x=>x.n===8).answer,['ア','エ']);
assert.deepEqual(q.exams.FY25A.find(x=>x.majorQuestion===6).subItems.find(x=>x.n===8).answer,['ウ','エ','カ']);
assert.deepEqual(q.exams.FY25B.find(x=>x.majorQuestion===6).subItems.find(x=>x.n===8).answer,['ア','ウ','エ']);

console.log('Rikkyo FY24/FY25 supplied-source coverage: CLEAN');
