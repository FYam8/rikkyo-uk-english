// Browser acceptance: the printed underlines and all footnotes must be visible.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(process.argv[2]||'.');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  try{
    res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html');
    res.end(fs.readFileSync(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  const url='http://127.0.0.1:'+server.address().port+'/index.html';
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const expected={FY24A:[6,9],FY24B:[5,11],FY25A:[7,10],FY25B:[6,9],FY26A:[7,9]};
  for(const width of [390,1280]){
    for(const [examId,[underlines,glossary]] of Object.entries(expected)){
      const page=await browser.newPage({viewport:{width,height:850}});
      await page.goto(url);
      await page.waitForFunction(()=>Boolean(window.__RIKKYO_APP_READY__));
      await page.evaluate(id=>{__RIKKYO_APP__.openExam(id);__RIKKYO_APP__.beginAttempt(id);},examId);
      const lines=page.locator('.source-block .passage u.source-underline');
      const notes=page.locator('.source-block .source-glossary dd');
      assert.equal(await lines.count(),underlines,width+' '+examId+' underlines');
      assert.equal(await notes.count(),glossary,width+' '+examId+' annotations');
      assert.equal(await page.locator('.question .prompt u.source-underline').count(),examId==='FY26A'?0:12,width+' '+examId+' Q4 correction underlines');
      assert.equal(await page.locator('.source-block .passage .source-note-marker').count(),glossary,width+' '+examId+' stars');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,width+' '+examId+' horizontal overflow');
      if(examId==='FY25B')assert.equal(await page.locator('u.source-underline').filter({hasText:'What trouble can come from such a little vine?'}).count(),1);
      await page.close();
      console.log(width+' '+examId+': source rendering CLEAN');
    }
  }
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
