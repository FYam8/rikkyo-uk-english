import assert from 'node:assert/strict';
export async function runAnswerReviewChecks(browser,url){
 for(const width of [320,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===url?r.continue():r.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(url+'/index.html');await page.waitForFunction(()=>window.__RIKKYO_APP_READY__);
  const ids=await page.evaluate(async()=>{
   const a=__RIKKYO_APP__;a.beginAttempt('FY26A');
   const qs=a.data().questions.filter(q=>q.examId==='FY26A');
   const slots=qs.find(q=>q.targetId==='grammar-gerund-enjoy'),choice=qs.find(q=>q.scoringType==='single_choice'),multi=qs.find(q=>q.scoringType==='multiple_choice');
   a.setResponse(slots.id,['play','golf']);a.setResponse(choice.id,choice.answerSpec.choice);
   const extra=multi.options.find(o=>!multi.answerSpec.choices.includes(o.id));a.setResponse(multi.id,[extra.id]);
   await a.submitAttempt();return {slots:slots.id,choice:choice.id,multi:multi.id};
  });
  assert.ok(await page.getByRole('heading',{name:'FY26A 解答結果',exact:true}).isVisible());
  const slot=page.locator('#review-'+ids.slots);
  assert.match(await slot.innerText(),/× 空所1：play/);assert.match(await slot.innerText(),/○ 空所2：golf/);
  assert.match(await page.locator('#review-'+ids.multi).innerText(),/選び過ぎ/);
  assert.match(await page.locator('#review-'+ids.multi).innerText(),/選び漏れ/);
  assert.equal(await page.locator('#review-'+ids.choice).count(),0);
  await page.getByRole('button',{name:'全問',exact:true}).click();
  assert.match(await page.locator('#review-'+ids.choice).innerText(),/○ 正解/);
  await slot.locator('summary').click();assert.ok(await slot.locator('.question').isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'result overflow at '+width);
  assert.equal(await slot.locator('.review-answer-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),width===320?1:2);
  const saved=await page.evaluate(()=>__RIKKYO_APP__.getState().attempts[0]);
  assert.ok(saved.reviewQuestions.length);assert.ok(saved.reviewPassages.length);
  await page.reload();await page.waitForFunction(()=>window.__RIKKYO_APP_READY__);
  await page.getByRole('button',{name:'過去問',exact:true}).click();
  await page.getByRole('button',{name:'解答履歴',exact:true}).click();
  assert.equal(await page.locator('.history-row').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'history overflow');
  await page.getByRole('button',{name:'答案を見る',exact:true}).click();
  assert.match(await slot.innerText(),/× 空所1：play/);
  await page.evaluate(id=>__RIKKYO_APP__.startWeak('FY26A:'+id),ids.slots);
  assert.equal(await page.evaluate(()=>__RIKKYO_APP__.getState().currentDrill),null);
  assert.match(await slot.innerText(),/同じ論点の類題セットは整備中/);
  await page.getByRole('button',{name:'解答履歴へ',exact:true}).click();
  await page.getByRole('button',{name:'問題を解く',exact:true}).click();
  await page.locator('.exam-card').filter({has:page.getByRole('heading',{name:'FY26A',exact:true})}).getByRole('button',{name:'履歴を見る（1）',exact:true}).click();
  assert.equal(await page.locator('.history-row').count(),1);
  await page.getByRole('button',{name:'すべての履歴',exact:true}).click();
  await page.evaluate(()=>__RIKKYO_APP__.openHistory('FY24A'));
  assert.match(await page.locator('main').innerText(),/まだ解答履歴はありません/);
  // Historical records without saved responses must not invent learner answers or per-slot verdicts.
  await page.evaluate(()=>{const a=__RIKKYO_APP__,s=a.getState();delete s.attempts[0].responses;delete s.attempts[0].reviewQuestions;delete s.attempts[0].reviewPassages;a.importPayload({format:'rikkyo-uk-english-backup',version:1,appId:'rikkyo-uk-english',state:s},'replace');a.openResult(0)});
  assert.match(await slot.innerText(),/この履歴には答案が保存されていません/);
  assert.equal(await slot.locator('.review-part').count(),0);
  assert.deepEqual(errors,[]);await context.close();
  console.log('Answer review '+width+'px: comparison, slots, choices, filters, source, saved history and exact-topic fallback CLEAN');
 }
}
