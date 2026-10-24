import {createRequire} from 'node:module';
import {runOrderDrillChecks} from './order-drill-browser-checks.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{await runOrderDrillChecks(browser,'https://fyam8.github.io/rikkyo-uk-english')}finally{await browser.close()}
