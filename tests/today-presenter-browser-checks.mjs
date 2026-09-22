import assert from 'node:assert/strict';
// Disposable local origins only. School data/selection remain real; states are controlled QA fixtures.
export async function runTodayPresenterChecks(browser,url,isRikkyo){
 for(const width of [390,1280]){
  const c=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await c.route('**/*',r=>new URL(r.request().url()).origin===url?r.continue():r.abort());
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(url+'/index.html');if(isRikkyo)await p.waitForFunction(()=>window.__RIKKYO_APP_READY__);else await p.waitForSelector('.today-card');
  assert.equal(await p.evaluate(()=>ENGLISH_UI_TODAY.contractVersion),1);
  const card=p.locator('.today-card');assert.match(await card.innerText(),/あと10問/);
  if(isRikkyo){assert.match(await card.innerText(),/配点が未確認/);assert.equal(await card.locator('.goal-selector').count(),0)}
  else{assert.equal(await card.locator('.target-chip').count(),3);await card.getByRole('button',{name:'B 70点',exact:true}).click();assert.match(await card.locator('.goal-block').innerText(),/70/)}
  await card.locator('.primary').click();await p.waitForSelector('.exam-gate');
  const seed=async(mode,count=0)=>p.evaluate(({r,mode,count})=>{
   const a=r?__RIKKYO_APP__:null;
   let state,base,keys;
   if(r){
    a.resetForTest();a.beginAttempt('FY26A');a.submitAttempt();state=a.getState();base=Object.values(state.weak)[0];keys=Object.keys(state.weak).slice(0,4);
   }else{
    const q=BANK.find(x=>!x.retired&&new Set(poolForWeak({skill:x.skill,targetId:x.targetId,focusTag:x.focusTag}).map(y=>y.familyId)).size>=5);
    if(!q)throw Error('no five-family practice');
    base={year:2024,id:'today-fixture',skill:q.skill,targetId:q.targetId,focusTag:q.focusTag,priority:'A'};
    state=JSON.parse(JSON.stringify(INIT));keys=[0,1,2,3].map(i=>'2024:today-fixture-'+i+':main');
   }
   const now=ENGLISH_ENGINE_CORE.localDate(),tomorrow=ENGLISH_ENGINE_CORE.plusDays(1);
   state.weak={};state.currentDrill=null;state.currentSkill=null;state.currentAttempt=null;state.dailyPlan=null;state.dailyProgress={date:now,answeredCount:count};
   state.attempts=[];
   if(mode==='complete')state.attempts=(r?ENGLISH_ENGINE_ADAPTER.config.exam.route:ROUTE).map((id,i)=>({id:'qa-complete-'+i,status:'graded',...(r?{examId:id}:{year:id})}));
   else{
    keys.forEach((key,i)=>state.weak[key]={...base,label:'Today fixture '+i,status:mode==='future'||i===0&&mode==='due'?'pending':'active',streak:i===1?1:0,confirmStreak:0,next:mode==='future'?tomorrow:now});
    if(mode==='due')state.currentAttempt={id:'today-attempt',status:'active',mode:'untimed',startedAt:new Date().toISOString(),...(r?{examId:'FY26A',responses:{}}:{year:2024})};
   }
   if(r){a.importPayload({format:'rikkyo-uk-english-backup',version:1,appId:'rikkyo-uk-english',state},'replace');a.goto('home')}
   else{S=state;drillState=null;save();goto('home')}
   return keys;
  },{r:isRikkyo,mode,count});
  const state=()=>p.evaluate(r=>r?__RIKKYO_APP__.getState():JSON.parse(JSON.stringify(S)),isRikkyo);
  const home=()=>p.evaluate(r=>r?__RIKKYO_APP__.goto('home'):goto('home'),isRikkyo);
  await seed('due');assert.equal(await card.locator('.primary').innerText(),'今日の定着チェックへ');
  assert.match(await card.locator('.alternative-actions').innerText(),/この弱点を続ける/);assert.match(await card.locator('.alternative-actions').innerText(),/続きへ/);
  const before=await state();await home();assert.deepEqual(await state(),before,'Today rerender changed stored learning state');
  await card.locator('.primary').click();assert.equal((await state()).currentDrill.mode,'confirm');
  await home();assert.equal(await card.locator('.primary').innerText(),'途中の1問を再開');assert.equal(await card.locator('.queued-actions button').count(),0);assert.equal(await card.locator('.alternative-actions').count(),0);
  const draft=await p.evaluate(r=>r?ENGLISH_ENGINE_CORE.normalizeDrillState(__RIKKYO_APP__.getState().currentDrill):JSON.parse(JSON.stringify(normalizeDrillState(S.currentDrill))),isRikkyo);await p.reload();if(isRikkyo)await p.waitForFunction(()=>window.__RIKKYO_APP_READY__);await home();
  await card.locator('.primary').click();assert.deepEqual((await state()).currentDrill,draft,'Today Resume changed the reserved question/draft');
  for(const n of [0,9,10,12]){
   await seed('active',n);assert.equal(await card.locator('.primary').innerText(),'この弱点を続ける');
   assert.match(await card.locator('.daily-summary').innerText(),new RegExp(n<10?'あと'+(10-n)+'問':(n-10)+'問'));
   assert.equal(await card.locator('.eyebrow').innerText(),n<10?'TODAY · STANDARD 10 QUESTIONS':'TARGET ACHIEVED · KEEP GOING');
  }
  await card.locator('.primary').click();assert.equal((await state()).currentDrill.mode,'train');
  await seed('future');assert.match(await card.locator('.future-confirmations').innerText(),/明日の定着確認予定/);assert.match(await card.locator('.future-confirmations').innerText(),/ほか1件/);assert.equal(await card.locator('.future-confirmations > div').count(),3);
  await seed('complete');assert.ok(await card.evaluate(e=>e.classList.contains('today-complete')));assert.equal(await card.locator('.primary').count(),0);
  await card.getByRole('button',{name:'学習ルートを見る',exact:true}).click();await p.waitForSelector('.route-list');
  if(isRikkyo){const keys=await p.evaluate(()=>Object.keys(localStorage));assert.ok(keys.every(x=>!x.startsWith('waseshibu')));assert.ok(!(await state()).currentAttempt,'completion must not start holdout')}
  assert.deepEqual(errors,[]);console.log(`${isRikkyo?'Rikkyo':'Waseda'} P2 ${width}px Today, actions, target continuation, Resume, future and completion: CLEAN`);await c.close();
 }
}
