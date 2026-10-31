import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const json=p=>JSON.parse(read(p));
const app=read('app.js');
const context={};vm.createContext(context);
for(const name of ['h','sourceText','sourceQuestionPrompt','qLabel','flattenSuppliedRuntime','questionInstruction','problemQuestionCard','sourceBlock','renderProblemFlow']){
  const start=app.indexOf('function '+name+'(');
  const end=app.indexOf('\nfunction ',start+1);
  assert.ok(start>=0,name);
  vm.runInContext(app.slice(start,end),context);
}
const rows=[...json('data/questions.json').records,...context.flattenSuppliedRuntime(json('data/supplied-source-questions.json')),...json('data/supplied-reading-runtime.json').records,...json('data/fy26a-late-runtime.json').records];
const counts={};
for(const q of rows){
  const card=context.problemQuestionCard(q);
  const instruction=context.questionInstruction(q);
  assert.ok(q.prompt||instruction,'Missing task instruction: '+q.id);
  if(instruction){
    counts[q.primarySkill]=(counts[q.primarySkill]||0)+1;
    assert.ok(card.includes(instruction),q.id);
    if(q.prompt)assert.ok(card.indexOf(instruction)<card.indexOf(context.sourceQuestionPrompt(q)),q.id);
    if(q.primarySkill==='paraphrase')assert.match(instruction,/AとB.*同じ意味.*1語ずつ/);
    if(q.primarySkill==='guided_completion')assert.match(instruction,/日本語.*1語ずつ/);
    if(q.scoringType==='word_order_missing_word')assert.match(instruction,/不足.*1語.*並べ替え/);
  }
}
assert.equal(counts.paraphrase,12);
assert.equal(counts.guided_completion,21);
assert.equal(counts.word_order,5);
const sample=rows.find(q=>q.id==='R25-ENG-A-G5-1');
const flow=context.renderProblemFlow([sample],[]);
assert.ok(flow.includes('A: I think Spanish is easier than English.'));
assert.ok(flow.includes('B: I think English is'));
assert.ok(flow.includes(context.questionInstruction(sample)));
assert.ok(!flow.includes('more difficult'),'Must not reveal answers');
assert.ok(context.problemQuestionCard({...sample,prompt:'<script>bad</script>'}).includes('&lt;script&gt;'));
console.log('Instructions audited: '+rows.length+' tasks; added to 38 tasks across FY24A/B, FY25A/B, FY26A.');
