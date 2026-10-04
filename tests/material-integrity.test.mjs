import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=n=>JSON.parse(fs.readFileSync(new URL('../data/'+n+'.json',import.meta.url),'utf8'));
const norm=s=>s.toLowerCase().replace(/[’]/g,"'").replace(/[.!?]+$/,'').trim().replace(/\s+/g,' ');
// Match whole selectable chunks (not just a word set), with duplicate indices kept distinct.
export function orderFor(q){
 let left=norm(q.answerSpec?.sentence||q.answerSentence||q.answer),prefix=norm(q.wordOrderPrefix||q.prefix||''),suffix=norm(q.wordOrderSuffix||q.suffix||'');
 if(prefix){assert.ok(left.startsWith(prefix+' '),q.id);left=left.slice(prefix.length).trim()}
 if(suffix){assert.ok(left.endsWith(' '+suffix),q.id);left=left.slice(0,-suffix.length).trim()}
 const tokens=q.tokens.map((v,i)=>({v:norm(v),i}));
 if(q.missingWord)tokens.push({v:norm(q.missingWord),i:'missing'});
 const unused=q.answerSpec?.unused||q.unused,needed=tokens.length-(unused?1:0);
 function search(rest,used){
  if(!rest)return used.length===needed&&(!unused||tokens.filter(x=>!used.includes(x.i)).every(x=>(q.answerSpec?.unusedOptions||q.unusedOptions||[unused]).map(norm).includes(x.v)))?used:null;
  for(const t of tokens)if(!used.includes(t.i)&&(rest===t.v||rest.startsWith(t.v+' '))){const result=search(rest.slice(t.v.length).trim(),[...used,t.i]);if(result)return result}
  return null;
 }
 const order=search(left,[]);assert.ok(order,q.id+' cannot be assembled from exactly the permitted chunks');return order;
}
const bank=read('practice').items;
assert.equal(bank.length,42);
for(const q of bank){
 if(q.type==='word_order'){orderFor(q);for(const a of q.accepted||[])orderFor({...q,answer:a})}
 if(q.type==='choice'){assert.equal(new Set(q.options.map(o=>o.id)).size,q.options.length,q.id);assert.ok(q.options.some(o=>o.id===q.answer),q.id)}
 if(q.accepted)assert.ok(q.accepted.map(norm).includes(norm(q.answerText||q.answer)),q.id+' preferred answer rejected');
}
// Regression negative controls: a missing duplicate or a broken multiword chunk must fail.
const first=bank.find(q=>q.id==='rwo01');assert.equal(first.tokens.filter(t=>t==='he').length,2);
assert.throws(()=>orderFor({...first,tokens:first.tokens.slice(0,-1)}));
assert.throws(()=>orderFor({id:'chunk-order',tokens:['I read','a story','by written'],answer:'I read a story written by.'}));
const direct=[...read('questions').records,...read('supplied-reading-runtime').records,...read('fy26a-late-runtime').records];
for(const q of direct){
 if(q.tokens)orderFor(q);
 if(q.scoringType==='single_choice')for(const a of q.answerSpec.acceptedChoices||[q.answerSpec.choice])assert.ok(q.options.some(o=>o.id===a),q.id);
 if(q.scoringType==='multiple_choice')for(const a of q.answerSpec.choices)assert.ok(q.options.some(o=>o.id===a),q.id);
 assert.equal(q.autoGradeAllowed,q.scoringType!=='manual_reading',q.id);
}
const source=read('supplied-source-questions');let labels=0,japanese=0;
for(const groups of Object.values(source.exams))for(const g of groups)for(const q of g.subItems||[]){
 if([2,3,4].includes(g.majorQuestion)){assert.ok(q.japanese,g.id);japanese++}
 if(q.tokens){orderFor({...q,id:g.id+'-'+q.n});for(const a of q.acceptedSentences||[])orderFor({...q,id:g.id+'-'+q.n,answerSentence:a})}
 if(g.majorQuestion===4){
  for(const label of ['ア','イ','ウ'])assert.equal(q.labelledSentence.split('（'+label+'）【').length,2,g.id);
  assert.equal(q.labelledSentence.replace(/（[アイウ]）【([^】]+)】/g,'$1'),q.sentence);
  const corrected=q.labelledSentence.replace(new RegExp('（'+q.errorLabel+'）【[^】]+】'),q.correction).replace(/（[アイウ]）【([^】]+)】/g,'$1');
  assert.equal(corrected,q.correctedSentence,g.id+' correction does not repair the labelled span');labels++;
 }
}
assert.equal(labels,16);assert.equal(japanese,48);
const holdout=read('fy26b-holdout-source');
assert.equal(holdout.runtimeEnabled,false);assert.equal(holdout.trainingExcluded,true);
for(const q of holdout.records.find(g=>g.majorQuestion===3).subItems)orderFor({...q,id:'FY26B-Q3-'+q.n});
const find=id=>direct.find(q=>q.id===id);
assert.ok(find('R25-ENG-A-Q6-2').answerSpec.accepted.includes('has caught'));
assert.ok(find('R25-ENG-A-Q6-3').answerSpec.accepted.includes('die'));
assert.ok(!find('R25-ENG-A-Q6-3').prompt.includes('soon'));
assert.ok(find('R25-ENG-A-Q6-4').prompt.includes('日本語'));
assert.ok(bank.find(q=>q.id==='rec03').accepted.includes('The man that lives next door is a doctor.'));
const writing=read('fy26a-late-runtime').nonRuntimeSource.find(q=>q.id==='R26-ENG-A-Q8');
for(const phrase of ['you can fly','you can speak to animals','you can become invisible','Use full sentences and paragraphs.','Check your spelling and grammar.'])assert.ok(writing.prompt.includes(phrase),'FY26A writing source instruction missing: '+phrase);
console.log('Material integrity: 42 practice items, all runtime/holdout Q3 reorder chunks, 48 Japanese guides, 16 labelled corrections: CLEAN');
