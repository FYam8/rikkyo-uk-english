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

import vm from 'node:vm';
import {createRequire} from 'node:module';
import {orderFor} from './material-integrity.test.mjs';
const W=createRequire(import.meta.url)('../ui/answer-widgets.js');
const passages=JSON.parse(fs.readFileSync(new URL('../data/supplied-source-passages.json',import.meta.url),'utf8')).passages;
const appSource=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const snippet=appSource.slice(appSource.indexOf('function wordOrderFrame(q){'),appSource.indexOf('\nfunction wordOrderInput(q,r){'));
assert.ok(snippet.includes('sourceContextBefore'),'both panes must render source context metadata');
assert.equal((appSource.match(/wordOrderFrame\(q\)/g)||[]).length,3,'word-order frame definition + question/answer panes');
const ctx=vm.createContext({sourceText:v=>String(v)});
vm.runInContext(snippet,ctx);
const orders=d.records.filter(q=>q.scoringType==='word_order');
assert.equal(orders.length,6,'all available FY24/FY25 Q6 reorder questions covered');
const normalize=s=>String(s).toLowerCase().replace(/[.!?]+$/,'').trim().replace(/\s+/g,' ');
for(const q of orders){
 const p=passages.find(x=>x.passageId===q.passageId);
 assert.ok(p,q.id+' original passage is missing');
 assert.ok(q.sourceContextBefore&&q.sourceContextAfter,q.id+' context incomplete');
 const originalTokens='( '+q.tokens.join(' / ')+' )';
 const spot=p.text.indexOf(originalTokens);
 assert.ok(spot>=0,q.id+' selectable chunks differ from source');
 assert.ok(p.text.slice(0,spot).endsWith(q.sourceContextBefore+' '),q.id+' leading context not verbatim');
 const follows=p.text.slice(spot+originalTokens.length);
 const separator=/^[,.;:!?！？。，）)”’]/.test(q.sourceContextAfter)?'':' ';
 assert.ok(follows.startsWith(separator+q.sourceContextAfter),q.id+' trailing context not verbatim');
 const frame=ctx.wordOrderFrame(q);
 assert.ok(frame.includes(q.sourceContextBefore),q.id+' answer pane has no fixed leading words');
 assert.ok(frame.includes(q.sourceContextAfter),q.id+' answer pane has no fixed trailing words');
 assert.ok(frame.includes('［並べ替え］'),q.id+' selectable position not shown');
 const order=orderFor(q);
 const selected=order.map(i=>q.tokens[i]).join(' ');
 const answer=[q.wordOrderPrefix,selected,q.wordOrderSuffix].filter(Boolean).join(' ');
 assert.equal(normalize(answer),normalize(q.answerSpec.sentence),q.id+' correct response grade should not change');
 assert.equal(W.reorderSentence({order},q.tokens,{}),selected,q.id+' tap answer order');
}
assert.equal(d.records.find(q=>q.id==='R25-ENG-B-Q6-4').sourceContextBefore,'(4) He thought');
assert.equal(d.records.find(q=>q.id==='R25-ENG-B-Q6-4').sourceContextAfter,'and decided to climb up the vine using his torch.');
const core=JSON.parse(fs.readFileSync(new URL('../data/questions.json',import.meta.url),'utf8')).records;
for(const q of core.filter(q=>q.scoringType==='word_order_missing_word')){
 assert.ok(ctx.wordOrderFrame(q).includes(q.wordOrderPrefix||''),q.id+' FY26 original fixed words hidden');
}
console.log('All 6 FY24/FY25 Q6 source-verbatim context frames and FY26 order fallback: CLEAN');

console.log('Rikkyo supplied reading runtime dataset: CLEAN');
