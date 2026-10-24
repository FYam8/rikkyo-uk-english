import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),E=require('../engine/core.js'),W=require('../ui/answer-widgets.js');
const bank=JSON.parse(fs.readFileSync(new URL('../data/practice.json',import.meta.url))).items;
const src=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const ctx={E,lastUse:()=>-1,ANSWER_WIDGETS:W,norm:v=>String(v??'').trim().toLowerCase().replace(/[.!?]+$/,'').replace(/\s+/g,' ')};
vm.createContext(ctx);
for(const name of ['practiceOrderOptions','practiceResponse','practiceComplete','practiceCorrect','rank','reserve']){
 const start=src.indexOf('function '+name+'('),end=src.indexOf('\nfunction ',start+1);
 vm.runInContext(src.slice(start,end),ctx);
}
for(const targetId of new Set(bank.filter(q=>q.type==='word_order').map(q=>q.targetId))){
 const pool=bank.filter(q=>q.targetId===targetId),w={skill:'word_order',targetId,focusTag:targetId,examFormat:'word_order_missing_word',status:'active',streak:0};
 assert.equal(pool.length,5);assert.equal(new Set(pool.map(q=>q.familyId)).size,5);
 assert.equal(pool.filter(q=>q.level===1&&!q.missingWord).length,1);
 assert.equal(pool.filter(q=>q.level===2&&q.missingWord).length,2);
 assert.equal(pool.filter(q=>q.level===3&&q.missingWord).length,2);
 const rank=(items,confirm)=>ctx.rank(w,items,confirm);
 w.reservedConfirm=[pool.find(q=>q.level===1).id];ctx.reserve(w,pool);const reserved=w.reservedConfirm;
 assert.equal(reserved.length,2);assert.ok(reserved.every(id=>pool.find(q=>q.id===id).level===3));
 let used=[];const seen=[];
 for(let i=0;i<3;i++){
  const selected=E.selectNextPracticeQuestion({pool,reservedIds:reserved,usedIds:used,mode:'train',streak:w.streak,rankChoices:rank});
  assert.ok(!reserved.includes(selected.question.id));assert.equal(selected.question.level,i?2:1);
  assert.equal(selected.question.targetId,targetId);used=selected.usedIds;seen.push(selected.question.id);w.streak++;
 }
 assert.equal(new Set(seen).size,3);
 for(const q of pool){
  assert.ok(q.japanese);assert.ok(q.explanation);assert.ok(q.tokens.every(t=>t.trim()));
  assert.equal(ctx.practiceCorrect(q,q.answer),true,q.id);
  assert.equal(ctx.practiceCorrect(q,'unrelated answer'),false,q.id);
  assert.equal(ctx.practiceCorrect(q,{order:[],missing:q.missingWord||''}),false,q.id);
  assert.equal(ctx.practiceComplete(q,{order:[0,0],missing:''}),false,q.id);
 }
}
assert.deepEqual(bank.filter(q=>q.targetId==='word-order-participle-modifier'&&q.missingWord).map(q=>q.missingWord),['made','sung','taken','painted'],'participle remediation must require the participle itself, matching the source skill');
assert.ok(src.includes('ANSWER_WIDGETS.reorder({tokens:q.tokens'));
assert.ok(src.includes('ANSWER_WIDGETS.refreshReorder(document.getElementById(\'practice-order\')'));
console.log('Order drills: exact topics, 5 families each, scaffold → missing word, unseen reserved confirmation and incomplete rejection CLEAN');
