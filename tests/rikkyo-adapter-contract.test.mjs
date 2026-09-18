import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function read(path){return fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8')}
function run(path,ctx={}){ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(read(path),ctx,{filename:path});return ctx}
function plain(v){return JSON.parse(JSON.stringify(v))}

const contractCtx=run('engine/contract.js');
const configCtx=run('schools/rikkyo/config.js');
const policyCtx=run('schools/rikkyo/policy.js');
const contract=contractCtx.ENGLISH_ENGINE_CONTRACT;
const config=configCtx.ENGLISH_SCHOOL_CONFIG;
const policy=policyCtx.ENGLISH_SCHOOL_POLICY;

const result=contract.validateSchoolConfig(config);
assert.equal(result.ok,true,result.errors.join('\n'));
assert.equal(contract.validateSchoolPolicy(policy).ok,true);

assert.equal(config.schoolId,'rikkyo-uk');
assert.equal(config.exam.identityMode,'examId');
assert.deepEqual([...config.exam.examIds],['FY24A','FY24B','FY25A','FY25B','FY26A','FY26B']);
assert.deepEqual([...config.exam.route],['FY26A','FY24A','FY24B','FY25A','FY25B','FY26B']);
assert.equal(config.exam.defaultExamId,'FY26A');
assert.equal(config.exam.diagnosticExamId,'FY26A');
assert.equal(config.exam.holdoutExamId,'FY26B');
assert.equal(config.exam.holdoutTrainingExcluded,true);
assert.equal(config.exam.goalMode,'stage');
assert.deepEqual([...config.exam.goalTiers],[1]);
assert.equal(config.exam.defaultGoal,1);
assert.equal(config.exam.scoring.enabled,false);
for(const key of ['writtenMaxScore','listeningMaxScore','totalMaxScore'])assert.equal(key in config.exam,false,`${key} must not be invented`);

assert.equal(config.storage.key,'rikkyo.uk.english.v1');
assert.equal(config.storage.recoveryPrefix,'rikkyo.uk.english.pre-migration');
assert.equal(config.storage.importRecoveryPrefix,'rikkyo.uk.english.pre-import');
assert.equal(config.storage.syncDb,'rikkyo-uk-english-progress-sync');
assert.equal(config.progress.enabled,false);
assert.equal(config.progress.endpoint,'');
assert.equal(config.progress.appId,'rikkyo-english');
assert.equal(config.aiWriting.enabled,false);

const serialized=JSON.stringify(plain(config));
for(const forbidden of ['waseshibu.adaptive','waseshibu-progress-sync','waseshibu-progress-api','waseshibu-writing-grader'])assert.ok(!serialized.includes(forbidden),`Rikkyo adapter leaked Waseda identity: ${forbidden}`);

assert.equal(policy.routeRole('FY26A'),'初回診断');
assert.equal(policy.routeRole('FY26B'),'最終判定');
assert.equal(policy.routeRole('FY24A'),'弱点補強・実戦確認');
assert.equal(policy.isPriorityInGoal('anything',1),true);
assert.equal(policy.goalLabel(1),'全範囲');
assert.match(policy.goalAdvice(),/点数換算は行わず/);
assert.equal(policy.skillName('reading_short_answer'),'読解短答');
assert.equal(policy.skillName('word_order'),'語順整序');

const boot={};
boot.window=boot;boot.globalThis=boot;vm.createContext(boot);
for(const path of ['engine/contract.js','schools/rikkyo/config.js','schools/rikkyo/policy.js','engine/bootstrap.js'])vm.runInContext(read(path),boot,{filename:path});
assert.equal(boot.ENGLISH_ENGINE_ADAPTER.contractVersion,1);
assert.equal(boot.ENGLISH_ENGINE_ADAPTER.config.schoolId,'rikkyo-uk');

const papers=JSON.parse(read('data/papers.json'));
assert.deepEqual(papers.papers.map(x=>x.paperId),[...config.exam.examIds]);
assert.equal(papers.papers.find(x=>x.paperId===config.exam.holdoutExamId).paperId,'FY26B');

console.log('Rikkyo English school adapter contract: CLEAN');
