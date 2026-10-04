import assert from 'node:assert/strict';
import {orderFor} from './material-integrity.test.mjs';
export async function runMaterialChecks(browser,url){
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===url?r.continue():r.abort());
  const page=await context.newPage(),errors=[],dialogs=[];let accept=true;
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await(accept?d.accept():d.dismiss())});
  await page.goto(url+'/index.html');await page.waitForFunction(()=>window.__RIKKYO_APP_READY__);
  const rows=await page.evaluate(()=>__RIKKYO_APP__.data().questions);
  assert.equal(rows.length,122);
  let total=0;
  for(const examId of ['FY26A','FY24A','FY24B','FY25A','FY25B']){
   await page.evaluate(id=>{const a=__RIKKYO_APP__;a.resetForTest();a.openExam(id);a.beginAttempt(id)},examId);
   const qs=rows.filter(q=>q.examId===examId),responses={};
   for(const q of qs){
    const a=q.answerSpec;
    if(q.tokens)responses[q.id]={order:orderFor(q),missing:q.missingWord||''};
    else if(q.scoringType==='multi_slot_text')responses[q.id]=a.slots.map(x=>x[0]);
    else if(q.scoringType==='single_choice')responses[q.id]=a.choice;
    else if(q.scoringType==='multiple_choice')responses[q.id]=a.choices;
    else if(q.scoringType==='select_five_and_rewrite')responses[q.id]={selected:a.errorNumbers,corrections:Object.fromEntries(a.errorNumbers.map(n=>[n,a.corrections[n][0]]))};
    else responses[q.id]=(a.accepted||a.text||[a.preferred||a.guidance])[0];
    if(q.primarySkill==='error_correction_rewrite'&&q.sourceSubset){
     const text=await page.locator('#problem-'+q.id).innerText();
     for(const label of ['ア','イ','ウ'])assert.ok(text.includes('（'+label+'）【'),q.id+' invisible label');
    }
    if(q.japanese)assert.ok((await page.locator('#problem-'+q.id).innerText()).includes(q.japanese),q.id+' invisible Japanese guide');
    if(q.wordOrderPrefix)assert.ok((await page.locator('#answer-'+q.id).innerText()).includes(q.wordOrderPrefix),q.id+' invisible fixed words');
   }
   await page.evaluate(responses=>{const a=__RIKKYO_APP__;for(const [id,r]of Object.entries(responses))a.setResponse(id,r);a.submitAttempt()},responses);
   const attempt=await page.evaluate(()=>__RIKKYO_APP__.getState().attempts.at(-1));
   for(const q of qs)assert.equal(attempt.results[q.id],true,q.id+' registered solution rejected through production grading');
   total+=qs.length;
  }
  // Alternatives are accepted as complete pairs, not arbitrary combinations.
  const check=async(examId,id,response)=>{
   await page.evaluate(({examId,id,response})=>{const a=__RIKKYO_APP__;a.resetForTest();a.beginAttempt(examId);a.setResponse(id,response);a.submitAttempt()},{examId,id,response});
   return page.evaluate(id=>__RIKKYO_APP__.getState().attempts.at(-1).results[id],id);
  };
  assert.equal(await check('FY25A','R25-ENG-A-G5-1',['less','easy']),true);
  assert.equal(await check('FY25A','R25-ENG-A-G5-1',['more','easy']),false);
  assert.equal(await check('FY26A','R26-ENG-A-Q5-1','ア'),true);
  assert.equal(await check('FY26A','R26-ENG-A-Q5-1','イ'),false);
  for(const q of rows)for(const sentence of q.answerSpec.acceptedSentences||[]){
   const variant={...q,answerSpec:{...q.answerSpec,sentence}};
   assert.equal(await check(q.examId,q.id,{order:orderFor(variant),missing:''}),true,q.id+' alternative rejected');
  }
  assert.equal(await check('FY26A','R26-ENG-A-Q3-1',{order:[0,1,5,2,3],missing:'had'}),false);
  // Exercise every practice item through the actual remediation path.
  await page.evaluate(()=>{const a=__RIKKYO_APP__;a.resetForTest();a.beginAttempt('FY26A');a.submitAttempt();a.startWeak(Object.keys(a.getState().weak)[0])});
  const template=await page.evaluate(()=>__RIKKYO_APP__.getState());
  const bank=await page.evaluate(()=>__RIKKYO_APP__.data().practice);
  async function practice(q,response){
   await page.evaluate(({template,q,response})=>{
    const a=__RIKKYO_APP__,s=structuredClone(template),d=s.currentDrill;
    d.q=q;d.response=response;d.answered=false;d.feedback=null;s.drillLog=[];
    a.importPayload({format:'rikkyo-uk-english-backup',version:1,appId:'rikkyo-uk-english',state:s},'replace');a.goto('drill');a.finishPractice();
   },{template,q,response});
   return page.evaluate(()=>__RIKKYO_APP__.getState().drillLog.at(-1));
  }
  for(const q of bank){assert.equal((await practice(q,q.answer||q.answerText)).ok,true,q.id);for(const alt of q.accepted||[])assert.equal((await practice(q,alt)).ok,true,q.id+' alternative rejected')}
  assert.equal((await practice(bank.find(q=>q.id==='rwo01'),'He realised that had forgotten his key.')).ok,false);
  assert.equal((await practice(bank.find(q=>q.id==='rec03'),'The man that lives next door is a doctor.')).ok,true);
  const short=bank.find(q=>q.id==='rsa01');
  assert.equal((await practice(short,'Mr Lee teaches geography.')).gradingMode,'registered_answer');
  const review=await practice(short,'The subject taught by Mr Lee is geography.');
  assert.equal(review.ok,true);assert.equal(review.gradingMode,'self_review');assert.ok(dialogs.at(-1).includes('短答の自己確認'));
  accept=false;assert.equal((await practice(short,'mathematics')).ok,false);accept=true;
  // Old unfinished drill snapshots adopt the revised bank without deleting their answer or past log.
  await page.evaluate(template=>{const s=structuredClone(template),a=__RIKKYO_APP__;s.selectedExamId='FY25B';s.currentDrill.q={...structuredClone(a.data().practice.find(q=>q.id==='rwo01')),contentVersion:1};s.currentDrill.q.tokens.pop();s.currentDrill.response='saved draft';s.currentDrill.answered=false;a.importPayload({format:'rikkyo-uk-english-backup',version:1,appId:'rikkyo-uk-english',state:s},'replace')},template);
  await page.reload();await page.waitForFunction(()=>window.__RIKKYO_APP_READY__);
  const resumed=await page.evaluate(()=>__RIKKYO_APP__.getState().currentDrill);
  assert.equal(await page.evaluate(()=>__RIKKYO_APP__.getState().selectedExamId),'FY25B');
  assert.equal(resumed.q.contentVersion,2);assert.equal(resumed.q.tokens.filter(t=>t==='he').length,2);assert.equal(resumed.response,'saved draft');
  assert.deepEqual(errors,[]);
  console.log(`Material browser ${width}px: ${total} runtime solutions, 42 practice answers, alternatives/negative controls, short-answer self-review, stale drill refresh: CLEAN`);
  await context.close();
 }
}
