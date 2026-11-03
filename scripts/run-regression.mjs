import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { projectRoot } from './serve.mjs';

const commands = [
  ['preview-assets', ['scripts/build-preview-assets.mjs']],
  ['check', ['scripts/check.mjs']],
  ['engine-storage', ['--test', 'tests/engine.test.mjs', 'tests/storage.test.mjs', 'tests/feedback.test.mjs', 'tests/adventure.test.mjs', 'tests/adventure-feedback.test.mjs','tests/cultivation.test.mjs','tests/decision-clarity.test.mjs','tests/life-richness.test.mjs','tests/story-network.test.mjs','tests/progression.test.mjs']],
  ['life-simulation', ['scripts/verify-life-richness.mjs']],
  ['build', ['scripts/build.mjs']],
  ['browser', ['scripts/verify-browser.mjs']],
  ['feedback-browser', ['scripts/verify-feedback-browser.mjs']],
  ['adventure-browser', ['scripts/verify-cultivation-browser.mjs']],
  ['decision-browser', ['scripts/verify-decision-clarity-browser.mjs']],
  ['network-browser', ['scripts/verify-story-network-browser.mjs']],
  ['progression-browser', ['scripts/verify-progression-browser.mjs']],
  ['family-browser', ['scripts/verify-family-transfer-browser.mjs']],
  ['static-build', ['scripts/verify-build.mjs']],
  ['adventure-static', ['scripts/verify-cultivation-browser.mjs', '--built']],
  ['decision-static', ['scripts/verify-decision-clarity-browser.mjs', '--built']],
  ['network-static', ['scripts/verify-story-network-browser.mjs', '--built']],
  ['progression-static', ['scripts/verify-progression-browser.mjs','--built']],
  ['family-static', ['scripts/verify-family-transfer-browser.mjs', '--built']],
];
const report = { startedAt: new Date().toISOString(), node: process.version, platform: process.platform, results: [] };
await mkdir(join(projectRoot, 'artifacts'), { recursive: true });
async function run([name, args]) {
  const started = Date.now(), child = spawn(process.execPath, args, { cwd: projectRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; for (const pipe of [child.stdout, child.stderr]) pipe.on('data', data => { output += data.toString(); process.stdout.write(data); });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  report.results.push({ name, code, durationMs: Date.now() - started });
  await writeFile(join(projectRoot, 'artifacts', 'regression-' + name + '.log'), output);
}
// Assets and build mutations finish before any page opens. Each browser gate
// owns its server, profile and artifacts, so two independent gates can run.
const boundary=commands.findIndex(([name])=>name==='build')+1;
for(const entry of commands.slice(0,boundary))await run(entry);
const pending=commands.slice(boundary);let index=0;
async function worker(){while(index<pending.length){const entry=pending[index++];await run(entry);}}
await Promise.all(Array.from({length:process.argv.includes('--parallel')?2:1},()=>worker()));
report.results.sort((a,b)=>commands.findIndex(([name])=>name===a.name)-commands.findIndex(([name])=>name===b.name));
report.finishedAt = new Date().toISOString(); report.passed = report.results.every(result => result.code === 0);
await writeFile(join(projectRoot, 'artifacts', 'regression.json'), JSON.stringify(report, null, 2) + '\n');
console.log('REGRESSION ' + (report.passed ? 'PASS' : 'FAIL') + ' · ' + report.results.map(result => result.name + ':' + result.code).join(' '));
if (!report.passed) process.exitCode = 1;
