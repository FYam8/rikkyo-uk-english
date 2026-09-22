import assert from 'node:assert/strict';
export async function runAnswerWidgetChecks(browser,url,isRikkyo){
 for(const width of [390,1280]){
  const c=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390,serviceWorkers:'block'});
  await c.route('**/*',r=>new URL(r.request().url()).origin===url?r.continue():r.abort());
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(url+'/index.html');if(isRikkyo)await p.waitForFunction(()=>window.__RIKKYO_APP_READY__);else await p.waitForSelector('.today-card');
  async function stableClick(locator){
   await locator.click({trial:true});
   const before=await p.evaluate(()=>{const nodes=[document.querySelector('.answer-sheet-body'),document.querySelector('.problem-column'),document.querySelector('.drill-card')];window.__scrollNodes=nodes;return {y:scrollY,positions:nodes.map(e=>e?e.scrollTop:null)}});
   if(width===390)await locator.tap();else await locator.click();
   const after=await p.evaluate(()=>{const nodes=[document.querySelector('.answer-sheet-body'),document.querySelector('.problem-column'),document.querySelector('.drill-card')];return {y:scrollY,positions:nodes.map(e=>e?e.scrollTop:null),same:nodes.every((e,i)=>e===window.__scrollNodes[i])}});
   assert.equal(after.same,true,'reorder replaced the scrolling container');
   assert.ok(Math.abs(after.y-before.y)<=1,'reorder moved the document');
   assert.deepEqual(after.positions,before.positions,'reorder reset a nested scroll position');
  }
  if(isRikkyo){
   await p.evaluate(()=>{__RIKKYO_APP__.openExam('FY26A');__RIKKYO_APP__.beginAttempt('FY26A')});
   await p.locator('#problem-R26-ENG-A-Q5-1').evaluate(e=>e.scrollIntoView());
   const id='R26-ENG-A-Q3-1',row=p.locator('#answer-'+id),read=()=>p.evaluate(id=>__RIKKYO_APP__.getState().currentAttempt.responses[id],id);
   await stableClick(row.locator('.tokens button').nth(0));assert.equal(await row.locator('.tokens button').nth(0).isDisabled(),true);
   await stableClick(row.locator('.tokens button').nth(1));
   await stableClick(row.getByRole('button',{name:'1語戻す',exact:true}));assert.deepEqual((await read()).order,[0]);
   await stableClick(row.getByRole('button',{name:'wallet',exact:true}));
   await stableClick(row.getByRole('button',{name:'1語戻す',exact:true}));
   await row.locator('.missing-word-row input').fill('had');await stableClick(row.getByRole('button',{name:'不足語を追加',exact:true}));
   await row.locator('.missing-word-row input').fill('edited');assert.ok((await row.locator('.reorder-answer').innerText()).includes('edited'),'inserted missing-word edit is stale');
   const draft=await read();await p.reload();await p.waitForFunction(()=>window.__RIKKYO_APP_READY__);await p.evaluate(()=>__RIKKYO_APP__.goto('exam'));
   assert.deepEqual(await read(),draft);assert.equal(await row.locator('.missing-word-row input').inputValue(),'edited');
   await stableClick(row.getByRole('button',{name:'やり直す',exact:true}));assert.deepEqual((await read()).order,[]);assert.equal((await read()).missing,'edited');
   const slot=p.locator('.slot-row input').first();await slot.fill('slot draft');
   const radio=p.locator('.choice-grid input[type=radio]').first();await radio.check();
   const check=p.locator('.choice-grid input[type=checkbox]').first();await check.check();await check.uncheck();await check.check();
   const manual=p.locator('#answerPanel textarea').first();await manual.fill('manual draft');
   const responses=await p.evaluate(()=>__RIKKYO_APP__.getState().currentAttempt.responses);
   // Actual import round trips must preserve array/object widget state.
   await p.evaluate(()=>{const a=__RIKKYO_APP__,b={format:'rikkyo-uk-english-backup',version:1,appId:'rikkyo-uk-english',state:a.getState()};a.importPayload(b,'replace');a.importPayload(b,'merge');a.goto('exam')});
   assert.deepEqual(await p.evaluate(()=>__RIKKYO_APP__.getState().currentAttempt.responses),responses);
   assert.equal(await slot.inputValue(),'slot draft');assert.equal(await radio.isChecked(),true);assert.equal(await check.isChecked(),true);assert.equal(await manual.inputValue(),'manual draft');
   // A surplus-word question is complete with one token unused; no answer is exposed before submission.
   const results=await p.evaluate(()=>{
    const a=__RIKKYO_APP__,results=[];
    for(const examId of ['FY24A','FY24B','FY25A','FY25B']){
     a.resetForTest();a.openExam(examId);a.beginAttempt(examId);
     const qs=a.data().questions.filter(q=>q.examId===examId&&q.scoringType==='word_order'&&q.answerSpec.unused);
     for(const q of qs){
      const normalize=v=>String(v).toLowerCase().replace(/[.!?]+$/,'').trim();let left=normalize(q.answerSpec.sentence),used=[];
      if(q.wordOrderPrefix)left=left.slice(normalize(q.wordOrderPrefix).length).trim();
      if(q.wordOrderSuffix)left=left.slice(0,-normalize(q.wordOrderSuffix).length).trim();
      while(left){const candidates=q.tokens.map((v,i)=>({v:normalize(v),i})).filter(x=>!used.includes(x.i)&&(left===x.v||left.startsWith(x.v+' '))).sort((a,b)=>b.v.length-a.v.length);if(!candidates.length)throw Error(q.id+' cannot map supplied answer to tokens');const x=candidates[0];used.push(x.i);left=left.slice(x.v.length).trim()}
      for(const i of used)a.addWordOrderToken(q.id,i);
      results.push({id:q.id,used:used.length,total:q.tokens.length});
     }
     a.submitAttempt();const scored=a.getState().attempts.at(-1).results;for(const q of qs)results.find(x=>x.id===q.id).correct=scored[q.id];
    }
    return results;
   });assert.equal(results.length,16);for(const result of results){assert.equal(result.used,result.total-1,result.id);assert.equal(result.correct,true,result.id+' surplus-word answer incorrectly treated as unanswered')}

  }else{
   await p.evaluate(()=>{S.year=2024;S.currentAttempt={id:'p1-qa',year:2024,status:'active',mode:'untimed',startedAt:new Date().toISOString()};save();goto('exam')});
   const q=await p.evaluate(()=>D[2024].find(q=>q.type==='choice'));
   await p.locator('[id="answer-2024-'+q.id+'"] .answer-kana').first().click();
   const text=p.locator('#answerPanel input[type=text]').first();await text.fill('saved draft');
   const answers=await p.evaluate(()=>S.answers);await p.reload();await p.evaluate(()=>goto('exam'));assert.deepEqual(await p.evaluate(()=>S.answers),answers);assert.equal(await text.inputValue(),'saved draft');
   // Exercise the legacy reorder renderer without changing the live bank or selection policy.
   await p.evaluate(()=>{
    const q={id:'p1-fixture',type:'reorder',tokens:['we','had','had','enough'],lead:'local fixture',skill:'reorder'};
    drillState=normalizeDrillState({key:'p1-fixture',q,mode:'train',order:[],orderIndices:[],shuffled:q.tokens,answered:false});
    S.weak['p1-fixture']={year:2024,id:'p1-fixture',label:'local fixture',skill:'reorder',status:'active'};goto('drill');
   });
   const tokens=p.locator('.drill-card .tokens button');await stableClick(tokens.nth(1));await stableClick(tokens.nth(2));assert.equal(await p.locator('#orderBox').innerText(),'had had');
   await stableClick(p.getByRole('button',{name:'1語戻す',exact:true}));assert.equal(await p.locator('#orderBox').innerText(),'had');
   const order=await p.evaluate(()=>JSON.parse(JSON.stringify(S.currentDrill)));
   await p.evaluate(saved=>{drillState=normalizeDrillState(saved);render()},order);assert.equal(await p.locator('#orderBox').innerText(),'had');
   await stableClick(p.getByRole('button',{name:'やり直す',exact:true}));assert.equal(await p.locator('#orderBox').innerText(),'');
   await p.evaluate(()=>{drillState.answered=true;app.innerHTML=drillInput(drillState.q)});
   for(const label of ['1語戻す','やり直す'])assert.equal(await p.getByRole('button',{name:label,exact:true}).isDisabled(),true);
  }
  assert.deepEqual(errors,[]);console.log(`${isRikkyo?'Rikkyo':'Waseda'} P1 ${width}px selection, input, reorder, restore: CLEAN`);await c.close();
 }
}
