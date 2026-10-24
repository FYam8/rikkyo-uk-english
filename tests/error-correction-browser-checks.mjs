import assert from 'node:assert/strict';
export async function runErrorCorrectionChecks(browser,url){
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===url?r.continue():r.abort());
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(url+'/index.html');await p.waitForFunction(()=>window.__RIKKYO_APP_READY__);
  for(const examId of ['FY24A','FY24B','FY25A','FY25B']){
   const qs=await p.evaluate(id=>{const a=__RIKKYO_APP__;a.resetForTest();a.openExam(id);a.beginAttempt(id);return a.data().questions.filter(q=>q.examId===id&&q.errorCorrectionLabels)},examId);
   assert.equal(qs.length,4);
   for(const q of qs){
    const row=p.locator('#answer-'+q.id),text=row.getByLabel('訂正後の語句'),[label,word]=q.answerSpec.slots.map(s=>s[0]);
    assert.equal(await row.getByRole('radio').count(),3);
    await text.fill(word);
    const wrong=row.getByRole('radio',{name:label==='ア'?'イ':'ア',exact:true});await wrong.check();
    const radio=row.getByRole('radio',{name:label,exact:true});await radio.scrollIntoViewIfNeeded();
    await p.evaluate(id=>{const r=document.getElementById('answer-'+id);window.correctionNode=r;window.panelNode=document.querySelector('.answer-sheet-body');window.panelScroll=window.panelNode.scrollTop},q.id);
    await radio.check();
    assert.equal(await text.inputValue(),word);
    assert.equal(await row.getByRole('radio',{checked:true}).count(),1);
    assert.equal(await p.evaluate(id=>window.correctionNode===document.getElementById('answer-'+id)&&window.panelNode===document.querySelector('.answer-sheet-body')&&window.panelScroll===window.panelNode.scrollTop,q.id),true,'selection replaced/reset the panel');
   }
   const saved=await p.evaluate(()=>__RIKKYO_APP__.getState().currentAttempt.responses);
   await p.reload();await p.waitForFunction(()=>window.__RIKKYO_APP_READY__);await p.evaluate(()=>__RIKKYO_APP__.goto('exam'));
   assert.deepEqual(await p.evaluate(()=>__RIKKYO_APP__.getState().currentAttempt.responses),saved);
   await p.evaluate(()=>{const a=__RIKKYO_APP__;a.importPayload({format:'rikkyo-uk-english-backup',version:1,appId:'rikkyo-uk-english',state:a.getState()},'replace');a.goto('exam')});
   for(const q of qs){const row=p.locator('#answer-'+q.id);assert.equal(await row.getByRole('radio',{name:q.answerSpec.slots[0][0],exact:true}).isChecked(),true);assert.equal(await row.getByLabel('訂正後の語句').inputValue(),q.answerSpec.slots[1][0]);}
   await p.evaluate(()=>__RIKKYO_APP__.submitAttempt());
   const results=await p.evaluate(()=>__RIKKYO_APP__.getState().attempts.at(-1).results);for(const q of qs)assert.equal(results[q.id],true,q.id);
   console.log('Correction UI '+width+' '+examId+': selection, draft, reload/import, grading CLEAN');
  }
  await p.evaluate(()=>{const a=__RIKKYO_APP__;a.resetForTest();a.beginAttempt('FY26A')});
  assert.equal(await p.locator('.error-label-options').count(),0,'FY26 full-sentence correction must retain its original format');
  assert.deepEqual(errors,[]);await context.close();
 }
}
