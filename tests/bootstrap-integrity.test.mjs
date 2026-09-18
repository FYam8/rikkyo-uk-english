import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const lock=json('engine.lock.json');
const manifest=json('engine/manifest.json');
const papers=json('data/papers.json');

assert.equal(lock.sourceRepository,'FYam8/waseshibu-english');
assert.equal(lock.sourceCommit,'7490132b85a40cc91ae3f4570b3bd8551b49e14a');
assert.equal(lock.engineVersion,'1.0.0');
assert.equal(lock.contractVersion,1);
assert.equal(lock.consumerPolicy,'pinned-vendor-pr-only');
assert.equal(manifest.engineVersion,lock.engineVersion);
assert.equal(manifest.contractVersion,lock.contractVersion);

const engineFiles=fs.readdirSync(path.join(root,'engine')).sort();
assert.deepEqual(engineFiles,['bootstrap.js','contract.js','core.js','manifest.json']);
for(const file of ['engine/bootstrap.js','engine/contract.js','engine/core.js']){
  const text=read(file);
  assert.doesNotMatch(text,/rikkyo|waseshibu|立教|早稲|workers\.dev|localStorage|indexedDB/i,`${file} must remain school-neutral`);
}

assert.equal(papers.schemaVersion,1);
assert.equal(papers.papers.length,6);
assert.deepEqual(papers.papers.map(x=>x.paperId),['FY24A','FY24B','FY25A','FY25B','FY26A','FY26B']);
assert.equal(new Set(papers.papers.map(x=>x.paperId)).size,6);
for(const p of papers.papers){
  assert.ok([2024,2025,2026].includes(p.year));
  assert.ok(['A','B'].includes(p.schedule));
  assert.ok(p.sourceFile.startsWith('立教_'));
  assert.ok(p.pageCount===7||p.pageCount===10);
}
for(const p of papers.papers.filter(x=>x.year<2026))assert.equal(p.sourceCompleteness,'partial');
for(const p of papers.papers.filter(x=>x.year===2026)){
  assert.ok(p.observedSections.includes('listening_short_answer'));
  assert.ok(p.observedSections.includes('reading_short_answer'));
}

const configTemplate=read('schools/rikkyo/config.template.js');
for(const forbidden of ['waseshibu.adaptive','waseshibu-progress-sync','waseshibu-progress-api'])assert.ok(!configTemplate.includes(forbidden));
assert.match(configTemplate,/rikkyo\.uk\.english\.v1/);
assert.match(configTemplate,/progress:Object\.freeze\(\{enabled:false/);
assert.match(configTemplate,/aiWriting:Object\.freeze\(\{enabled:false/);

console.log('Rikkyo English bootstrap integrity: CLEAN');
