import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const previous=JSON.parse(await readFile('artifacts/regression.json','utf8'));
assert.equal(previous.passed,true);assert.equal(previous.results.length,31);
const report={startedAt:new Date().toISOString(),reason:'After full regression: actual breakthrough lifespan and living home receiver corrections.',results:[]};
async function run(name,args){
 const start=Date.now(),p=spawn(process.execPath,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';for(const stream of [p.stdout,p.stderr])stream.on('data',b=>output+=b.toString());
 const code=await new Promise((resolve,reject)=>{p.once('error',reject);p.once('exit',resolve);});await writeFile('artifacts/post-review-'+name+'.log',output);report.results.push({name,code,durationMs:Date.now()-start});console.log(name+': '+code);assert.equal(code,0,output);
}
try{
 await run('rules12-unit',['--test','tests/story-rules12.test.mjs']);
 await run('historical-unit',['--test','tests/engine.test.mjs','tests/storage.test.mjs','tests/feedback.test.mjs','tests/adventure.test.mjs','tests/adventure-feedback.test.mjs','tests/cultivation.test.mjs','tests/decision-clarity.test.mjs','tests/life-richness.test.mjs','tests/story-network.test.mjs','tests/progression.test.mjs','tests/revision9.test.mjs','tests/story-rules10.test.mjs']);
 await run('audit',['scripts/audit-story-rules12.mjs','--count=600']);
 await run('check',['scripts/check.mjs']);
 await run('build',['scripts/build.mjs']);
 await Promise.all([run('browser-source',['scripts/verify-story-rules12-browser.mjs']),run('browser-static',['scripts/verify-story-rules12-browser.mjs','--built'])]);
 await run('static-build',['scripts/verify-build.mjs']);
 report.passed=true;
}finally{report.finishedAt=new Date().toISOString();await writeFile('artifacts/rules12-post-review.json',JSON.stringify(report,null,2)+'\n');}
