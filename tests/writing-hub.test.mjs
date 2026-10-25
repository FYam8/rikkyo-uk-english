import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx=vm.createContext({});for(const file of ['schools/rikkyo/writingTasks.js','schools/rikkyo/writingPractice.js','schools/rikkyo/writingHub.js','ui/writing-feedback.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const hub=ctx.RIKKYO_WRITING_HUB,w=ctx.RIKKYO_WRITING_PRACTICE,h=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
assert.deepEqual(Array.from(hub.entries,x=>x.key),['FY25B','FY25A']);
for(const entry of hub.entries){assert.equal(entry.mode,'full_story');assert.equal(entry.model.length,4);assert.ok(w.count(entry.model.join(' '))>=80&&w.count(entry.model.join(' '))<=100);assert.ok(entry.model[0].startsWith(entry.opening.replace('…','')));assert.ok(ctx.RIKKYO_WRITING_TASKS[entry.key]);assert.ok(fs.existsSync('assets/writing/'+entry.key+'-pictures.png'));}
const feedback={score:20,maxScore:28,semantic:[1,1,1,1,0,0],breakdown:[],issues:[],reasons:[],strengths:[],revisedExample:'An improved answer.'};
const rows=Array.from({length:25},(_,i)=>({id:'old-'+i,answer:'My story '+i,feedback:structuredClone(feedback),generatedAt:new Date(1760000000000+i*1000).toISOString(),guide:JSON.parse(JSON.stringify(hub.snapshot('FY25A')))}));
const draft={text:'My story 24',history:rows};assert.equal(w.normalize(draft).history.length,25,'never silently discard old feedback');
let rendered=w.feedback(draft,h,ctx.RIKKYO_WRITING_TASKS.FY25A);assert.ok(rendered.includes('25回'));assert.ok(rendered.includes('第1回'));assert.ok(rendered.includes('提出時の型'));
assert.ok(w.feedback({...draft,text:'changed'},h,ctx.RIKKYO_WRITING_TASKS.FY25A).includes('前の評価は無効'));
const copy=JSON.stringify(rows[0]);const incoming={text:'Imported text',history:[rows[0],{...rows[0],id:'imported-only',answer:'Another answer'}]};
const merged=w.merge(draft,incoming);assert.equal(merged.text,draft.text);assert.equal(merged.history.length,26);assert.equal(w.merge(merged,incoming).history.length,26);assert.equal(JSON.stringify(rows[0]),copy);
const exported=JSON.parse(JSON.stringify(merged));assert.equal(w.normalize(exported).history.length,26);
const html=hub.render({text:'<script>bad()</script>'},'',h,ctx.RIKKYO_WRITING_TASKS.FY25A,false);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('書き方のヒント'));assert.ok(!html.includes('書き方の型'),'no model before first submission');
const catalog=hub.catalog(id=>w.normalize(id==='FY25A'?draft:{}),h);assert.ok(catalog.indexOf('A Day Out by Bicycle')<catalog.indexOf('An Island Adventure'));assert.ok(catalog.includes('25回提出'));assert.ok(!catalog.includes('FY26B'));assert.ok(!catalog.includes('mysterious door'));
const legacy=w.merge({text:'old',history:[{answer:'Legacy answer',feedback,generatedAt:'2026-10-01T00:00:00Z'}]},{history:[{answer:'Another legacy answer',feedback:{...feedback,score:19},generatedAt:'2026-10-01T00:00:00Z'}]});assert.equal(legacy.history.length,2,'same timestamp must not collapse different legacy feedback');
console.log('Writing hub catalog, models, escaping, >20 immutable records, backup union and legacy migration PASS');
