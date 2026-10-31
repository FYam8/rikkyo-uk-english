import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {orderFor} from './material-integrity.test.mjs';
const require=createRequire(import.meta.url);
const src=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const bank=JSON.parse(fs.readFileSync(new URL('../data/practice.json',import.meta.url))).items;
const ctx={ANSWER_WIDGETS:require('../ui/answer-widgets.js'),norm:v=>String(v??'').trim().toLowerCase().replace(/[.!?]+$/,'').replace(/\s+/g,' ')};
vm.createContext(ctx);
for(const name of ['practiceOrderOptions','practiceResponse','practiceComplete','practiceCorrect']){
 const start=src.indexOf('function '+name+'('),end=src.indexOf('\nfunction ',start+1);
 vm.runInContext(src.slice(start,end),ctx);
}
// Independent responses: do not derive these from the stored preferred answers.
export const solutions=[
 ['rrd02','seeing','forgetting'],
 ['rwo02-3','He is the teacher that I talked with yesterday.','with'],
 ['rwo05-3','We heard a song performed by a famous singer.','performed'],
 ['rwo05-5','I like the picture drawn by my sister.','drawn'],
 ['rec01','I have known her since three years ago.','I have known her since three years.']
];
for(const [id,answer,missingOrWrong]of solutions){
 const q=bank.find(q=>q.id===id);
 const response=q.tokens?{order:orderFor({...q,answer,missingWord:missingOrWrong}),missing:missingOrWrong}:answer;
 assert.equal(ctx.practiceCorrect(q,response),true,id+' valid independent answer rejected');
 const wrong=q.tokens?{...response,missing:'is'}:missingOrWrong;
 assert.equal(ctx.practiceCorrect(q,wrong),false,id+' wrong answer accepted');
}
console.log('Independent solutions: five valid alternative responses accepted, five negative controls rejected');
