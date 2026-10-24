import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const ctx={ANSWER_WIDGETS:require('../ui/answer-widgets.js'),response:()=>ctx.draft,qLabel:()=> '大問4 問1',document:{getElementById:()=>null},setSlot:(id,i,v)=>{ctx.draft[i]=v}};
vm.createContext(ctx);
for(const [start,end]of [['function norm(', 'function sameSet('],['function flattenSuppliedRuntime(', 'function examById('],['function correctionLabel(', 'function displayAnswer('],['function inputFor(', 'function problemQuestionCard(']])vm.runInContext(app.slice(app.indexOf(start),app.indexOf(end)),ctx);
const source=JSON.parse(fs.readFileSync(new URL('../data/supplied-source-questions.json',import.meta.url),'utf8'));
const qs=ctx.flattenSuppliedRuntime(source).filter(ctx.isLabelledCorrection);
assert.equal(qs.length,16);
for(const q of qs){
 assert.deepEqual(Array.from(q.errorCorrectionLabels),['ア','イ','ウ']);
 const [label,word]=q.answerSpec.slots.map(s=>s[0]);
 for(const symbol of [label,String.fromCharCode(label.charCodeAt(0)-0x60),'（'+label+'）',label.normalize('NFD')])assert.equal(ctx.evaluate(q,[symbol,word]),true,q.id);
 for(const r of [[label,''],['',word],[label,'wrong'],['エ',word],[word,label]])assert.equal(ctx.evaluate(q,r),false,q.id);
 ctx.draft=['',word];let html=ctx.inputFor(q);assert.equal((html.match(/type="radio"/g)||[]).length,3);assert.equal((html.match(/type="text"/g)||[]).length,1);assert.ok(!html.includes('空所'));assert.ok(html.includes('訂正後の語句'));
 ctx.setErrorLabel(q.id,label);assert.equal(ctx.draft[1],word);assert.equal(ctx.draft[0],label);
 html=ctx.inputFor(q);assert.equal((html.match(/checked=""/g)||[]).length,1);
}
assert.equal(ctx.evaluate({scoringType:'multi_slot_text',answerSpec:{slots:[['ア'],['of']]}},['あ','of']),false,'normalization must stay confined to correction symbols');
console.log('16 labelled corrections: symbol controls, legacy kana, drafts, grading and negative controls CLEAN');
