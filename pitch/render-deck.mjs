import {chromium} from '/srv/multi-vm-agent/workspace/make_money2/research/tapeout-video-20261023/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname);
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto('file://'+root+'/deck.html',{waitUntil:'load',timeout:18000});
 await page.evaluate(()=>document.fonts.ready);
 await page.pdf({path:root+'/MUSD-Signal-Glass-Mezo-Wave1-Pitch-20261023.pdf',width:'1280px',height:'720px',printBackground:true,preferCSSPageSize:true});
 for(let i=1;i<=7;i++){
   await page.locator('#s'+i).screenshot({path:root+'/frames/slide-'+String(i).padStart(2,'0')+'.png',animations:'disabled'});
 }
 console.log(JSON.stringify({response:response?.status(),slideCount:7,pdfBytes:fs.statSync(root+'/MUSD-Signal-Glass-Mezo-Wave1-Pitch-20261023.pdf').size,errors}));
 if(errors.length)process.exitCode=2;
}finally{await browser.close();}
