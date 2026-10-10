import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('schools/rikkyo/writingPractice.js','utf8'),ctx);const w=ctx.RIKKYO_WRITING_PRACTICE;
assert.equal(w.count("I'm ready for a well-known adventure."),6);assert.equal(w.count(''),0);assert.equal(w.count('日本語'),0);
assert.equal(w.normalize({text:42,checks:{ability:'false',events:true}}).text,'');assert.equal(w.normalize({checks:{ability:'false'}}).checks.ability,false);
const html=w.render({text:'<script>alert(1)</script>'},'prompt',s=>s.replaceAll('<','&lt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('学校公式の採点基準ではありません'));
const policy=JSON.parse(fs.readFileSync('data/writing-runtime-policy.json'));assert.deepEqual(policy.selfReviewPractice.examIds,['FY25A','FY25B','FY26A']);assert.equal(policy.selfReviewPractice.automaticScoring,false);assert.equal(policy.selfReviewPractice.countsAsExamCompletion,false);
console.log('Writing practice: source boundary, no scoring, word count, safe rendering PASS');
