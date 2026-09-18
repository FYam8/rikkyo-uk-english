import fs from 'node:fs';
import assert from 'node:assert/strict';
const papers=JSON.parse(fs.readFileSync(new URL('../data/papers.json',import.meta.url),'utf8'));
const sections=JSON.parse(fs.readFileSync(new URL('../data/sections.json',import.meta.url),'utf8'));

assert.equal(sections.schemaVersion,1);
assert.deepEqual(Object.keys(sections.papers),papers.papers.map(x=>x.paperId));
for(const paper of papers.papers){
  const row=sections.papers[paper.paperId];
  assert.ok(row);
  const qKeys=Object.keys(row);
  assert.ok(qKeys.length>=8);
  for(const [qid,section] of Object.entries(row)){
    assert.match(qid,/^Q\d+$/);
    assert.ok(typeof section.type==='string'&&section.type);
    assert.ok(['visible','omitted_in_supplied_file'].includes(section.sourceStatus));
    if(section.sourceStatus==='visible')assert.ok(Number.isInteger(section.count)&&section.count>0);
  }
}
for(const id of ['FY24A','FY24B']){
  assert.equal(sections.papers[id].Q1.sourceStatus,'omitted_in_supplied_file');
  assert.equal(sections.papers[id].Q7.sourceStatus,'omitted_in_supplied_file');
  assert.equal(sections.papers[id].Q9.sourceStatus,'omitted_in_supplied_file');
}
for(const id of ['FY25A','FY25B']){
  assert.equal(sections.papers[id].Q9.type,'picture_story_writing');
  assert.equal(sections.papers[id].Q9.approxWords,'80-100');
}
for(const id of ['FY26A','FY26B']){
  assert.deepEqual(sections.papers[id].Q1.subtypes,{multiple_choice:4,short_answer:4});
  assert.equal(sections.papers[id].Q4.candidateSentences,10);
  assert.equal(sections.papers[id].Q4.count,5);
  assert.equal(sections.papers[id].Q6.count,6);
  assert.equal(sections.papers[id].Q7.count,4);
  assert.equal(sections.papers[id].Q8.approxWords,'80-100');
}
console.log('Rikkyo English paper structure registry: CLEAN');
