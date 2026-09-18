import fs from 'node:fs';
import assert from 'node:assert/strict';
const bank=JSON.parse(fs.readFileSync(new URL('../data/practice.json',import.meta.url),'utf8'));
assert.equal(bank.schemaVersion,1);
assert.equal(bank.items.length,30);
assert.equal(new Set(bank.items.map(x=>x.id)).size,30);
assert.deepEqual(bank.holdoutSourceExamIds,[]);
for(const q of bank.items){
  assert.equal(q.sourceType,'authored_practice');
  assert.equal(q.retired,false);
  assert.ok(q.familyId);
  assert.ok(q.skill);
  assert.ok(q.targetId);
  assert.ok(q.explanation);
  assert.ok(!JSON.stringify(q).includes('FY26B'),'practice must not leak final holdout content');
}
for(const skill of ['guided_completion','word_order','error_correction_rewrite','long_reading','paraphrase']){
  const rows=bank.items.filter(x=>x.skill===skill);
  assert.equal(rows.length,6,`${skill} practice count`);
  assert.ok(new Set(rows.map(x=>x.familyId)).size>=5,`${skill} needs >=5 distinct families for train3+confirm2`);
}
console.log('Rikkyo authored practice bank v0.1: CLEAN');
