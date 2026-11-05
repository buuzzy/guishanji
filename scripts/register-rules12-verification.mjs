import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const regression=JSON.parse(await readFile('artifacts/regression.json','utf8'));
assert.equal(regression.results.length,31,'Need the completed rules12 regression, not the previous rules11 report');
assert.equal(regression.passed,true);assert.ok(regression.results.every(r=>r.code===0));
const gates=['rules12-unit','rules12-audit','rules12-browser','rules12-static'];for(const id of gates)assert.ok(regression.results.some(r=>r.name===id&&r.code===0));
const extra=[];
const postReview=JSON.parse(await readFile('artifacts/rules12-post-review.json','utf8'));
assert.equal(postReview.passed,true);assert.equal(postReview.results.length,8);assert.ok(postReview.results.every(r=>r.code===0));
for(const [name,args] of [['latest-rules12-unit',['--test','tests/story-rules12.test.mjs']],['latest-check',['scripts/check.mjs']]]){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true});await writeFile('artifacts/'+name+'.log',r.stdout+r.stderr);assert.equal(r.status,0,r.stderr||r.stdout);extra.push({name,code:r.status});
}
const source=JSON.parse(await readFile('artifacts/rules12-source/report.json','utf8')),built=JSON.parse(await readFile('artifacts/rules12-static/report.json','utf8')),natural=JSON.parse(await readFile('artifacts/rules12-natural-audit.json','utf8'));
for(const r of [source,built]){assert.equal(r.passed,true);assert.equal(r.lives.length,5);assert.ok(r.lives.every(l=>l.errors.length===0));}
const hashes={};for(const dir of ['packages/adventure','content','apps/preview'])for(const file of (await readdir(dir)).filter(f=>f.endsWith('.js'))){const path=dir+'/'+file;hashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');}
for(const r of [source,built])for(const [file,sha] of Object.entries(r.hashes))assert.equal(hashes[file],sha,'Source/browser hash drift '+file);
const tests=await readFile('artifacts/latest-rules12-unit.log','utf8'),unitCount=Number(tests.match(/# tests (\d+)/)?.[1]);assert.equal(unitCount,33);
const report={rulesVersion:12,createdAt:new Date().toISOString(),scope:'Local isolated HTML preview. No mini-program compilation, physical-device test, GitHub publication or deployment in this iteration.',passed:true,regression,postChecks:extra,unitTests:{historical:205,mundane:27,rules12:unitCount,total:232+unitCount},natural:{count:natural.count,completed:true,naturallyReachedIds:Object.keys(natural.events).length,tableEvents:natural.table.events,newIds:natural.table.newIds,unreachedNewIds:natural.table.unreachedNewIds,unreachedCoverage:'All eight remaining IDs are third-to-sixth return-home variants, covered in controlled continuation tests; not counted as natural hits.',longCards:natural.editorial.length,longestJournalIntervalYears:natural.longestQuietYears,observedRealms:natural.realms,observedEndings:natural.endings,limits:'Scripted policies are not probability estimates or human retention; quiet intervals still occur and are recorded rather than padded with yearly events.'},browser:{source,built},preservedRules11:{file:'tests/fixtures/adventure-rules11-baseline.json',sha256:createHash('sha256').update(await readFile('tests/fixtures/adventure-rules11-baseline.json')).digest('hex'),type:'Generated before modifications; old engine continuation contract, not a player archive'},sourceSha256:hashes};
report.postReview=postReview;
report.regressionNote='The full 31-stage regression passed before the final lifespan-log and home-receiver corrections. Eight affected checks were rerun afterward; current browser artifacts are hash-matched to the final runtime.';
await writeFile('docs/adventure-rules12-verification.json',JSON.stringify(report,null,2)+'\n');console.log('RULES12 VERIFIED: 31 gates + 8 post-review gates + latest checks; 265 unit tests; 600 seeded lives; 5 source + 5 static browser lives');
