import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8'));
const exams=read('data/exams.json');
const passages=read('data/passages.json');
const questions=read('data/questions.json');

assert.equal(exams.scoringPolicy,'unscored_until_authority_established');
assert.equal(exams.exams.length,6);
assert.equal(exams.exams.find(x=>x.examId==='FY26B').trainingExcluded,true);

assert.equal(passages.schemaVersion,1);
assert.equal(passages.passages.length,1);
const p=passages.passages[0];
assert.equal(p.passageId,'R26-ENG-A-P5');
assert.equal(p.examId,'FY26A');
assert.ok(p.text.includes('Suzzanna'));
assert.ok(p.text.includes('Paul')===false,'attribution belongs in metadata, not story text');
assert.equal(p.glossary.robin,'コマドリ');

assert.equal(questions.examId,'FY26A');
assert.equal(questions.learnerVisibleTaskCount,19);
assert.equal(questions.records.length,19);
assert.equal(new Set(questions.records.map(x=>x.id)).size,19);
for(const q of questions.records){
  assert.equal(q.examId,'FY26A');
  assert.equal(q.sourceType,'past_exam');
  assert.equal(q.answerAuthority,'independently_solved');
  assert.equal(q.verificationStatus,'provisional_needs_second_check');
  assert.equal(q.autoGradeAllowed,false);
  assert.ok(q.targetId);
}
assert.equal(questions.records.filter(x=>x.majorQuestion===2).length,5);
assert.equal(questions.records.filter(x=>x.majorQuestion===3).length,5);
assert.equal(questions.records.filter(x=>x.majorQuestion===4).length,1);
assert.equal(questions.records.filter(x=>x.majorQuestion===5).length,8);
const group=questions.records.find(x=>x.id==='R26-ENG-A-G4');
assert.equal(group.subItems.length,10);
assert.deepEqual(group.answerSpec.errorNumbers,[2,3,6,8,9]);
const q53=questions.records.find(x=>x.id==='R26-ENG-A-Q5-3');
assert.equal(q53.answerSpec.requiresAuthorityReview,true);

for(const q of questions.records)assert.notEqual(q.examId,'FY26B','holdout content must not enter diagnostic MVP');
console.log('Rikkyo FY26A canonical MVP registry: CLEAN');
