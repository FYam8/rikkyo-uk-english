import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const gate=JSON.parse(read('release-gate.json'));
const lock=JSON.parse(read('ui.lock.json'));
const manifest=JSON.parse(read('ui/manifest.json'));

assert.equal(gate.deployAllowed,true,'Rikkyo deployment gate should be open only after final CLEAN evidence');
assert.deepEqual(gate.blockers,[]);
assert.equal(gate.releaseCandidate,false);
assert.equal(gate.releaseStatus,'production-ready');
assert.equal(gate.releaseVersion,'1.0.0');
assert.deepEqual(gate.releaseEvidence.cleanAttempts,[1,2]);
for(const completed of ['Rikkyo question renderer compatibility','desktop browser parity','mobile browser parity','backup/import browser parity','supplied-source transcription/answer audit complete with explicit missing-source limitations','FY24/FY25 Q2-Q5 source subsets runnable','FY24/FY25 Q6 reading runtime promoted','FY26A Q6-Q7 diagnostic runtime promoted','unsupported writing tasks governed by explicit non-runtime policy' ,'final cross-year route/browser regression','two consecutive CLEAN loops','post-merge main verification'])assert.ok(gate.completedGates.includes(completed),completed+' completion marker missing');

assert.equal(lock.sourceRepository,'FYam8/waseshibu-english');
assert.equal(lock.sourceCommit,'ff379eb24808449f0387e58b0dcc493453dc9531');
assert.equal(lock.uiVersion,'1.0.0');
assert.equal(lock.contractVersion,1);
assert.equal(lock.consumerPolicy,'pinned-vendor-pr-only');
assert.equal(manifest.uiVersion,lock.uiVersion);
assert.equal(manifest.contractVersion,lock.contractVersion);

for(const file of ['ui/base.css','ui/components.js','ui/contract.js','ui/shell.js']){
  assert.doesNotMatch(read(file),/rikkyo|立教|waseshibu|早稲|workers\.dev/i,file+' must stay school-neutral');
}

const index=read('index.html');
for(const path of ['schools/rikkyo/theme.css','ui/base.css','schools/rikkyo/ui-compat.css'])assert.ok(index.includes('href="'+path+'"'),path+' stylesheet missing');
for(const path of ['ui/contract.js','schools/rikkyo/ui.js','ui/shell.js','ui/components.js'])assert.ok(index.includes('src="'+path+'"'),path+' script missing');
assert.ok(index.includes('ENGLISH_UI_SHELL.mount(window.ENGLISH_SCHOOL_UI)'));
assert.ok(!index.includes('href="styles.css"'),'prototype CSS must not be loaded');
assert.ok(index.indexOf('src="ui/components.js"')<index.indexOf('src="app.js"'));

const ctx={};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(read('ui/contract.js'),ctx,{filename:'ui/contract.js'});
vm.runInContext(read('schools/rikkyo/ui.js'),ctx,{filename:'schools/rikkyo/ui.js'});
const result=ctx.ENGLISH_UI_CONTRACT.validateSchoolUi(ctx.ENGLISH_SCHOOL_UI);
assert.equal(result.ok,true,result.errors.join('\n'));
assert.equal(ctx.ENGLISH_SCHOOL_UI.features.scoreDisplay,false);
assert.equal(ctx.ENGLISH_SCHOOL_UI.features.listeningScore,false);
assert.equal(ctx.ENGLISH_SCHOOL_UI.features.aiWriting,false);

const app=read('app.js');
assert.ok(app.includes('window.ENGLISH_UI_COMPONENTS'));
for(const helper of ['todayCard','routeStepCard','weaknessCard','drillCard','metricCard','progressBar','completionMark','backupPanel','attemptBar']){
  assert.ok(app.includes('U.'+helper),helper+' not consumed by Rikkyo app');
}
assert.doesNotMatch(read('schools/rikkyo/ui.js'),/waseshibu|早稲/i,'Rikkyo UI adapter leaked Waseda identity');

console.log('Rikkyo Shared UI v1 consumer wiring: CLEAN');
