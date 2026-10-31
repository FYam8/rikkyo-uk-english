import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=file=>JSON.parse(fs.readFileSync(new URL('../data/'+file+'.json',import.meta.url),'utf8'));
const passages=[...read('supplied-source-passages').passages,...read('passages').passages,...read('fy26b-holdout-source').passages];
const expected={FY24A:[6,9],FY24B:[5,11],FY25A:[7,10],FY25B:[6,9],FY26A:[7,9],FY26B:[7,9]};
assert.equal(passages.length,6);
for(const passage of passages){
 const paper=passage.examId||'FY26B', [underlines,notes]=expected[paper]||[];
 assert.ok(underlines,paper+' unknown paper');
 assert.equal(passage.underlinedSpans.length,underlines,paper+' missing underlined fragments');
 assert.equal(Object.keys(passage.glossary||{}).length,notes,paper+' missing original footnotes');
 const raw=passage.text, ranges=[];
 for(const phrase of passage.underlinedSpans){
  assert.ok(typeof phrase==='string'&&phrase.length>1,paper+' invalid underline');
  const idx=raw.indexOf(phrase);
  assert.ok(idx>=0,paper+' fragment absent: '+phrase);
  assert.equal(raw.indexOf(phrase,idx+phrase.length),-1,paper+' ambiguous fragment: '+phrase);
  assert.ok(ranges.every(([a,b])=>idx>=b||idx+phrase.length<=a),paper+' overlapping underlines');
  ranges.push([idx,idx+phrase.length]);
 }
 const stars=[...raw.matchAll(/\\*[a-zA-Z]+/g)].map(x=>x[0]);
 assert.equal(stars.length,notes,paper+' starred source words differ from original glossary');
}
assert.ok(passages.find(p=>p.examId==='FY25B').underlinedSpans.includes('What trouble can come from such a little vine?'));
assert.ok(passages.find(p=>p.examId==='FY24A').text.includes('*leather'));
assert.ok(passages.find(p=>p.examId==='FY24B').text.includes('*path'));
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
assert.ok(app.includes('sourcePassageText(pass)'));
assert.ok(app.includes('sourcePassageGlossary(pass)'));
assert.ok(app.includes("pass.sourceAttribution||'',pass)"));
assert.ok(css.includes('.passage .source-underline'));
assert.ok(css.includes('.source-glossary-grid'));
console.log('All FY24–FY26 A/B original reading footnotes and underlines: CLEAN');
