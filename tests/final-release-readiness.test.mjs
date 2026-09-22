import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const gate=json('release-gate.json');
assert.equal(gate.deployAllowed,true);
assert.equal(gate.releaseCandidate,false);
assert.equal(gate.releaseStatus,'production-ready');
assert.equal(gate.releaseVersion,'1.0.0');
assert.deepEqual(gate.blockers,[]);
assert.deepEqual(gate.releaseEvidence.cleanAttempts,[1,2]);
assert.equal(gate.releaseEvidence.postMergeVerifyConclusion,'success');

const requiredCompleted=[
  'Shared Engine v1.1 pinned',
  'Shared UI v1.0.0 pinned',
  'Rikkyo storage/cloud isolation',
  'FY26B holdout isolation',
  'Rikkyo question renderer compatibility',
  'desktop browser parity',
  'mobile browser parity',
  'backup/import browser parity',
  'supplied-source transcription/answer audit complete with explicit missing-source limitations',
  'FY24/FY25 Q2-Q5 source subsets runnable',
  'FY24/FY25 Q6 reading runtime promoted',
  'FY26A Q6-Q7 diagnostic runtime promoted',
  'unsupported writing tasks governed by explicit non-runtime policy',
  'final cross-year route/browser regression',
  'two consecutive CLEAN loops',
  'post-merge main verification'
];
for(const item of requiredCompleted)assert.ok(gate.completedGates.includes(item),item+' gate missing');

const engineLock=json('engine.lock.json'),uiLock=json('ui.lock.json');
assert.equal(engineLock.engineVersion,'1.1.0');
assert.equal(uiLock.uiVersion,'1.3.0');
assert.equal(engineLock.consumerPolicy,'pinned-vendor-pr-only');
assert.equal(uiLock.consumerPolicy,'pinned-vendor-pr-only');

const exams=json('data/exams.json').exams;
const byId=Object.fromEntries(exams.map(x=>[x.examId,x]));
for(const id of ['FY24A','FY24B','FY25A','FY25B']){
  assert.equal(byId[id].runtimeEnabled,true);
  assert.deepEqual(byId[id].runtimeMajors,[2,3,4,5,6]);
  assert.equal(byId[id].runtimeMode,'supplied_subset');
}
assert.deepEqual(byId.FY26A.runtimeMajors,[2,3,4,5,6,7]);
assert.equal(byId.FY26A.runtimeEnabled,true);
assert.equal(byId.FY26B.runtimeEnabled,false);
assert.equal(byId.FY26B.trainingExcluded,true);

const coverage=json('data/source-coverage.json');
assert.equal(coverage.policy.doNotInventMissingSource,true);
assert.equal(coverage.policy.unavailableListeningMustNotCountWrong,true);
assert.ok(coverage.suppliedWrittenCoverage.FY24A.sourceMissing.includes('Q7'));
assert.ok(coverage.suppliedWrittenCoverage.FY26B.sourceMissing.includes('Q1 listening audio/transcript'));

const writing=json('data/writing-runtime-policy.json');
assert.equal(writing.status,'explicit_non_runtime_until_marking_authority');
assert.equal(writing.rules.doNotInventPictureAssets,true);
assert.ok(writing.tasks.every(x=>x.runtimeEnabled===false));

const holdout=json('data/fy26b-holdout-source.json');
assert.equal(holdout.trainingExcluded,true);
assert.equal(holdout.runtimeEnabled,false);
assert.ok(holdout.records.find(x=>x.majorQuestion===1).subItems.every(x=>x.answerStatus==='unavailable_without_audio'));

const practice=json('data/practice.json');
for(const skill of ['guided_completion','word_order','error_correction_rewrite','paraphrase','long_reading','short_text_multiple_choice','reading_short_answer']){
  const rows=practice.items.filter(x=>x.skill===skill&&!x.retired);
  assert.ok(rows.length>=5,skill+' has insufficient practice');
  assert.ok(new Set(rows.map(x=>x.familyId)).size>=5,skill+' has insufficient practice families');
}

const app=read('app.js');
assert.doesNotMatch(app,/waseshibu\.adaptive|waseshibu-progress|waseshibu-writing-grader/i);
assert.ok(app.includes("const U=window.ENGLISH_UI_COMPONENTS"));
assert.ok(app.includes("fy26a-late-runtime"));
assert.ok(app.includes("supplied-reading-runtime"));
assert.ok(app.includes("manual_reading"));
assert.ok(app.includes('E.buildRemediationDailyPlan'));
assert.ok(app.includes('E.selectDailyLearningActionDescriptors'));
assert.ok(app.includes('U.answerPanel'));
assert.ok(app.includes('U.paperPage'));
assert.ok(app.includes('timerMarkup'));
assert.ok(app.includes('futureConfirmationMarkup'));
assert.ok(app.includes('renderProblemFlow'));
assert.ok(app.includes('wordOrderInput'));
assert.ok(app.includes('addWordOrderToken'));
assert.ok(app.includes('sourceText'));

const index=read('index.html');
assert.ok(index.includes('ui/base.css'));
assert.ok(index.includes('schools/rikkyo/ui.js'));
assert.ok(index.includes('ENGLISH_UI_SHELL.mount(window.ENGLISH_SCHOOL_UI)'));
assert.ok(!index.includes('href="styles.css"'));

console.log('Rikkyo English final release readiness: CLEAN');
