import fs from 'node:fs';
import assert from 'node:assert/strict';
export async function runOrderDrillChecks(browser,url){
 for(const width of [390,1280]){
  const c=await browser.newContext({viewport:{width,height:850},isMobile:width===390,hasTouch:width===390,serviceWorkers:'block'});
  await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.abort());
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.clock.install({time:new Date('2026-10-25T12:00:00Z')});
  await p.goto(url+'/index.html');await p.waitForFunction(()=>window.__RIKKYO_APP_READY__);
  const key=await p.evaluate(()=>{const a=__RIKKYO_APP__;a.beginAttempt('FY26A');a.submitAttempt();const key=Object.keys(a.getState().weak).find(k=>a.getState().weak[k].targetId==='word-order-past-perfect');a.startWeak(key);return key});
  const read=()=>p.evaluate(()=>__RIKKYO_APP__.getState());
  const click=async locator=>width===390?locator.tap():locator.click();
  const tokens=p.locator('#practice-order .tokens button'),preview=p.locator('#practice-order-answer'),submit=p.locator('#practice-submit');
  assert.equal(await submit.isDisabled(),true);
  assert.equal(await tokens.count(),8);
  fs.mkdirSync('test-results',{recursive:true});await p.locator('main').screenshot({path:`test-results/order-drill-${width}.png`});
  const choose=async i=>{
   await tokens.nth(i).scrollIntoViewIfNeeded();
   const node=await p.locator('#practice-order').elementHandle();
   const before=await p.evaluate(()=>scrollY);await click(tokens.nth(i));
   assert.ok(await node.evaluate(e=>e.isConnected),'selection replaced drill DOM');
   assert.ok(Math.abs(await p.evaluate(()=>scrollY)-before)<=1,'selection moved scroll position');
  };
  await choose(4);await choose(7);assert.equal(await preview.innerText(),'he he');
  assert.equal(await tokens.nth(4).isDisabled(),true);assert.equal(await tokens.nth(7).isDisabled(),true);
  await click(p.getByRole('button',{name:'1語戻す',exact:true}));assert.equal(await tokens.nth(7).isDisabled(),false);
  await click(p.getByRole('button',{name:'やり直す',exact:true}));assert.equal(await preview.innerText(),'語句をタップして並べてください');
  await choose(4);const saved=(await read()).currentDrill.response;
  await p.reload();await p.waitForFunction(()=>window.__RIKKYO_APP_READY__);await p.evaluate(()=>__RIKKYO_APP__.resumeDrill());
  assert.deepEqual((await read()).currentDrill.response,saved);assert.equal(await preview.innerText(),'he');
  await click(p.getByRole('button',{name:'やり直す',exact:true}));
  // Drive the UI from the sentence, preserving duplicate token indices.
  async function assemble(missingOverride){
   const q=(await read()).currentDrill.q,normalize=s=>s.toLowerCase().replace(/[.!?]+$/,'').trim();
   let rest=normalize(q.answer),used=[];
   const choices=q.tokens.map((t,i)=>({text:normalize(t),i}));if(q.missingWord)choices.push({text:q.missingWord,i:'missing'});
   while(rest){
    const x=choices.find(t=>!used.includes(t.i)&&(rest===t.text||rest.startsWith(t.text+' ')));assert.ok(x,q.id+' assembly');
    if(x.i==='missing'){
     await p.locator('#practice-order .missing-word-row input').fill(missingOverride||q.missingWord);
     await click(p.getByRole('button',{name:'不足語を追加',exact:true}));
    }else await choose(x.i);
    used.push(x.i);rest=rest.slice(x.text.length).trim();
   }
   assert.equal(await submit.isEnabled(),true);
  }
  const trained=[];
  for(let i=0;i<3;i++){
   const d=(await read()).currentDrill;trained.push(d.q.id);assert.equal(d.q.level,i?2:1);assert.equal(d.q.targetId,'word-order-past-perfect');
   await assemble();await click(submit);assert.equal((await read()).drillLog.at(-1).ok,true);
   assert.ok(!(await read()).drillLog.at(-1).answerText.includes('[object Object]'));
   await click(p.getByRole('button',{name:'次へ',exact:true}));
  }
  assert.equal((await read()).weak[key].status,'pending');assert.equal(new Set(trained).size,3);
  assert.ok((await read()).weak[key].reservedConfirm.every(id=>!trained.includes(id)));
  await p.clock.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  await p.evaluate(key=>{dispatchEvent(new Event('focus'));__RIKKYO_APP__.startWeak(key)},key);
  for(let i=0;i<2;i++){
   const d=(await read()).currentDrill;assert.equal(d.mode,'confirm');assert.equal(d.q.level,3);assert.ok(!trained.includes(d.q.id));
   await assemble();await click(submit);await click(p.getByRole('button',{name:'次へ',exact:true}));
  }
  assert.equal((await read()).weak[key].status,'mastered');
  // A wrong inferred word must fail even after every token has been used.
  await p.evaluate(()=>{const a=__RIKKYO_APP__;a.resetForTest();a.beginAttempt('FY26A');a.submitAttempt();a.startWeak(Object.keys(a.getState().weak).find(k=>a.getState().weak[k].targetId==='word-order-past-perfect'))});
  await assemble();await click(submit);await click(p.getByRole('button',{name:'次へ',exact:true}));
  await assemble('has');await click(submit);assert.equal((await read()).drillLog.at(-1).ok,false);assert.equal((await read()).weak[key].streak,0);
  // Restore the exact legacy mismatch from the reported screenshot. Completed logs survive.
  await p.evaluate(()=>{const a=__RIKKYO_APP__,s=a.getState();s.currentDrill.q=structuredClone(a.data().practice.find(q=>q.id==='rwo05'));s.currentDrill.answered=false;s.currentDrill.response='old unrelated draft';a.importPayload({format:'rikkyo-uk-english-backup',version:1,appId:'rikkyo-uk-english',state:s},'replace');a.resumeDrill()});
  assert.equal((await read()).currentDrill.q.targetId,'word-order-past-perfect');assert.equal((await read()).currentDrill.response,null);assert.ok((await read()).drillLog.length>=2);
  // A saved old confirmation must not earn mastery on the upgraded foundation item.
  await p.evaluate(()=>{const a=__RIKKYO_APP__,s=a.getState(),d=s.currentDrill,w=s.weak[d.key];d.q.contentVersion=1;d.mode='confirm';d.response='legacy same-topic draft';w.status='pending';w.confirmStreak=1;w.reservedConfirm=[d.q.id];a.importPayload({format:'rikkyo-uk-english-backup',version:1,appId:'rikkyo-uk-english',state:s},'replace');a.resumeDrill()});
  const migrated=await read();assert.equal(migrated.currentDrill.mode,'train');assert.equal(migrated.weak[key].status,'active');assert.equal(migrated.weak[key].confirmStreak,0);
  assert.equal(await p.evaluate(key=>{const a=__RIKKYO_APP__;return a.getState().weak[key].reservedConfirm.every(id=>a.data().practice.find(q=>q.id===id).level===3)},key),true);
  assert.equal(migrated.recoveredDrills.at(-1).response,'legacy same-topic draft');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log(`Order drill ${width}px: real taps/clicks, duplicate words, undo/clear, reload, 3+2 next day, negative answer, legacy mismatch CLEAN`);
  await c.close();
 }
}
