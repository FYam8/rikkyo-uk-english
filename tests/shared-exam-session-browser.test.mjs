// Real-browser integration. Run with a local repository root; never seed production storage.
import assert from 'node:assert/strict';
import {runTodayPresenterChecks} from './today-presenter-browser-checks.mjs';
import {runAnswerWidgetChecks} from './answer-widget-browser-checks.mjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(process.argv[2]||'.'),isRikkyo=fs.existsSync(path.join(root,'schools/rikkyo'));
const mime={'.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)&&file!==root)return res.writeHead(403).end();try{res.setHeader('Content-Type',mime[path.extname(file)]||'text/html');res.end(fs.readFileSync(file===root||file===root+'/'?path.join(root,'index.html'):file))}catch{res.writeHead(404).end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 const scenarios=isRikkyo?['fresh','attempt','subset','reading','renderer','drill','resume','backup','mobile','coverage','crossyear','scheduler','holdout']:['fresh','attempt','drill','drill-legacy-choice','future'];
 for(const scenario of scenarios){
  const page=await browser.newPage();
  await page.goto(url+(isRikkyo?'/tests/rikkyo-browser-smoke.html':'/tests/waseda-browser-smoke.fixture.txt')+'?case='+scenario);
  await page.waitForFunction(()=>['CLEAN','FAIL'].includes(document.querySelector('[data-test-result]')?.dataset.testResult),null,{timeout:20000});
  assert.equal(await page.locator('[data-test-result]').getAttribute('data-test-result'),'CLEAN',scenario+': '+await page.locator('body').innerText());
  console.log(`${isRikkyo?'Rikkyo':'Waseda'} existing browser ${scenario}: CLEAN`);await page.close();
 }
 if(isRikkyo){
  const page=await browser.newPage();page.on('dialog',d=>d.accept());await page.clock.install({time:new Date('2026-09-22T12:00:00Z')});
  await page.goto(url+'/index.html');await page.waitForFunction(()=>window.__RIKKYO_APP_READY__);
  const key=await page.evaluate(()=>{const a=__RIKKYO_APP__;a.beginAttempt('FY26A');a.submitAttempt();const k=Object.keys(a.getState().weak)[0];a.startWeak(k);return k});
  const solve=async()=>page.evaluate(()=>{const a=__RIKKYO_APP__,q=a.getState().currentDrill.q;a.setPractice(q.type==='choice'?q.answer:q.answer||q.answerText);a.finishPractice();a.continuePractice()});
  for(let i=0;i<3;i++)await solve();
  const before=await page.evaluate(key=>__RIKKYO_APP__.getState().weak[key],key);assert.equal(before.status,'pending');assert.equal(before.reservedConfirm.length,2);
  await page.clock.setSystemTime(new Date('2026-09-23T12:00:00Z'));
  await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));__RIKKYO_APP__.goto('home')});
  const daily=await page.evaluate(()=>__RIKKYO_APP__.getState().dailyProgress);assert.equal(daily?.answeredCount||0,0);
  await page.evaluate(key=>__RIKKYO_APP__.startWeak(key),key);
  assert.equal(await page.evaluate(()=>__RIKKYO_APP__.getState().currentDrill.mode),'confirm');
  await solve();await solve();assert.equal(await page.evaluate(key=>__RIKKYO_APP__.getState().weak[key].status,key),'mastered');
  console.log('Rikkyo day rollover, 3 correct, reserved 2, next-day 2 correct: CLEAN');await page.close();
 }
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===url?route.continue():route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(url+'/index.html');
  if(isRikkyo)await page.waitForFunction(()=>window.__RIKKYO_APP_READY__);else await page.waitForFunction(()=>document.querySelector('.today-card'));
  await page.evaluate(isRikkyo=>{
   if(isRikkyo){const a=window.__RIKKYO_APP__;a.openExam('FY26A');a.beginAttempt('FY26A',{mode:'timed',limitMinutes:10})}
   else{S.currentAttempt={id:'qa-timer',year:2024,status:'active',mode:'timed',limitMinutes:10,startedAt:new Date().toISOString(),overtime:false};S.year=2024;save();goto('exam')}
  },isRikkyo);
  await page.waitForSelector('#examTimer');
  const state=()=>page.evaluate(isRikkyo=>isRikkyo?window.__RIKKYO_APP__.getState():JSON.parse(JSON.stringify(S)),isRikkyo);
  assert.ok(!(await page.locator('body').innerText()).includes(String.fromCharCode(92)+'n'),'literal newline escape in rendered page');
  const initial=await state();
  for(const fn of ['toggleAnswerSheet','toggleAnswerSheet','toggleAnswerSize','toggleExamInfo'])await page.evaluate(({isRikkyo,fn})=>{if(isRikkyo)window.__RIKKYO_APP__[fn]();else window[fn]()},{isRikkyo,fn});
  const changed=await state();assert.equal(changed.answerSheetOpen,initial.answerSheetOpen);assert.equal(changed.answerSheetExpanded,!initial.answerSheetExpanded);assert.equal(changed.examInfoCompact,!initial.examInfoCompact);
  assert.deepEqual(changed.currentAttempt,initial.currentAttempt,'presentation toggles altered attempt');
  const css=await page.locator('#answerPanel').evaluate(el=>getComputedStyle(el).position);assert.equal(css,width===390?'fixed':'sticky');
  await page.locator('.answer-jumps button').last().click();
  await page.waitForFunction(()=>document.querySelector('#answerPanel .focus-flash'));
  await page.locator('#answerPanel .q button').filter({hasText:'問題へ'}).last().click();
  await page.waitForFunction(()=>document.querySelector('[id^="problem-"].focus-flash'));
  // Real interval crossing. Production markup must lock Waseda objective answers immediately.
  await page.evaluate(isRikkyo=>{
   if(isRikkyo){const a=window.__RIKKYO_APP__,s=a.getState();s.currentAttempt.startedAt=new Date(Date.now()-599000).toISOString();a.importPayload({format:'rikkyo-uk-english-backup',version:1,appId:'rikkyo-uk-english',state:s},'replace');a.goto('exam')}
   else{S.currentAttempt.startedAt=new Date(Date.now()-599000).toISOString();S.currentAttempt.overtime=false;save();render()}
  },isRikkyo);
  await page.waitForFunction(()=>document.getElementById('examTimer')?.classList.contains('over'),null,{timeout:6000});
  assert.equal((await state()).currentAttempt.overtime,true);
  if(!isRikkyo)assert.ok(await page.locator('#answerPanel input:disabled').count()>0,'deadline lock missing');
  else assert.ok(await page.locator('#answerPanel input:not(:disabled)').count()>0,'Rikkyo policy accidentally locked');
  await page.reload();if(isRikkyo)await page.waitForFunction(()=>window.__RIKKYO_APP_READY__);
  const resumed=await state();assert.equal(resumed.currentAttempt.id,initial.currentAttempt.id);assert.equal(resumed.answerSheetExpanded,changed.answerSheetExpanded);
  assert.deepEqual(errors,[]);console.log(`${isRikkyo?'Rikkyo':'Waseda'} production index ${width}px interaction, timeout and Resume: CLEAN`);await context.close();
 }
 await runAnswerWidgetChecks(browser,url,isRikkyo);
 await runTodayPresenterChecks(browser,url,isRikkyo);
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
