import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { projectRoot } from './serve.mjs';

const commands = [
  ['preview-assets', ['scripts/build-preview-assets.mjs']],
  ['check', ['scripts/check.mjs']],
  ['unit', ['--test', 'tests/adventure.test.mjs', 'tests/adventure-feedback.test.mjs','tests/cultivation.test.mjs','tests/decision-clarity.test.mjs','tests/life-richness.test.mjs','tests/story-network.test.mjs','tests/progression.test.mjs','tests/revision9.test.mjs','tests/story-rules10.test.mjs']],
  ['mundane-unit', ['--test','tests/mundane-life.test.mjs']],
  ['rules12-unit', ['--test','tests/story-rules12.test.mjs']],
  ['rules12-audit', ['scripts/audit-story-rules12.mjs','--count=600']],
  ['mundane-audit', ['scripts/audit-mundane-life.mjs','--count=600']],
  ['story-audit', ['scripts/audit-story-rules10.mjs']],
  ['life-simulation', ['scripts/verify-life-richness.mjs']],
  ['build', ['scripts/build.mjs']],
  ['adventure-browser', ['scripts/verify-cultivation-browser.mjs']],
  ['decision-browser', ['scripts/verify-decision-clarity-browser.mjs']],
  ['network-browser', ['scripts/verify-story-network-browser.mjs']],
  ['progression-browser', ['scripts/verify-progression-browser.mjs']],
  ['revision9-browser', ['scripts/verify-revision9-browser.mjs']],
  ['rules10-browser', ['scripts/verify-story-rules10-browser.mjs']],
  ['mundane-browser', ['scripts/verify-mundane-browser.mjs']],
  ['rules12-browser', ['scripts/verify-story-rules12-browser.mjs']],
  ['family-browser', ['scripts/verify-family-transfer-browser.mjs']],
  ['static-build', ['scripts/verify-build.mjs']],
  ['adventure-static', ['scripts/verify-cultivation-browser.mjs', '--built']],
  ['decision-static', ['scripts/verify-decision-clarity-browser.mjs', '--built']],
  ['network-static', ['scripts/verify-story-network-browser.mjs', '--built']],
  ['progression-static', ['scripts/verify-progression-browser.mjs','--built']],
  ['revision9-static', ['scripts/verify-revision9-browser.mjs', '--built']],
  ['rules10-static', ['scripts/verify-story-rules10-browser.mjs', '--built']],
  ['mundane-static', ['scripts/verify-mundane-browser.mjs', '--built']],
  ['rules12-static', ['scripts/verify-story-rules12-browser.mjs', '--built']],
  ['family-static', ['scripts/verify-family-transfer-browser.mjs', '--built']],
  /* ── 小程序端（微信）门禁 ────────────────────────────────────────────
     孤儿门禁 = 假门禁 ⇒ 这七道必须挂在这里，不能只靠手动跑。 */
  ['import', ['scripts/verify-migration-import.mjs']],
  ['xianxiabuild', ['scripts/test-xianxia-build.mjs']],
  ['xianxiaeq', ['scripts/test-xianxia-equivalence.mjs']],
  ['xianxiastore', ['scripts/test-xianxia-storage.mjs']],
  ['xianxiaart', ['scripts/test-xianxia-art.mjs']],
  ['xianxiamp', ['scripts/test-xianxia-mp.mjs']],
  ['xianxiastyle', ['scripts/test-xianxia-style.mjs']],
  ['xianxiastandalone', ['scripts/test-xianxia-standalone.mjs']],
  ['repohygiene', ['scripts/test-repo-hygiene.mjs']],
];
const report = { startedAt: new Date().toISOString(), node: process.version, platform: process.platform, results: [] };
await mkdir(join(projectRoot, 'artifacts'), { recursive: true });

/* ── 单门禁模式与门禁清单 ──────────────────────────────────────────────
   CI 要「每道门禁一个任务、实时可见、并行跑」，就需要能：
     --list           打印门禁清单（JSON），供 CI 生成矩阵
     --only=<名字>    只跑这一道门禁
     --group=<组>     跑某一组（fast / browser）
   组是按「要不要开浏览器」分的：fast 那组几分钟就完，browser 那组才是慢的。 */
const argv = process.argv.slice(2);
const only = (argv.find(a => a.startsWith('--only=')) || '').slice('--only='.length);
const group = (argv.find(a => a.startsWith('--group=')) || '').slice('--group='.length);
const isBrowserGate = ([name]) => /browser|static/.test(name);
if (argv.includes('--list')) {
  console.log(JSON.stringify(commands.map(([name, args]) => ({
    name,
    args,
    group: isBrowserGate([name]) ? 'browser' : 'fast',
    needsBuild: args.includes('--built'),
  })), null, 2));
  process.exit(0);
}
let selected = commands;
if (only) selected = commands.filter(([name]) => name === only);
if (group) selected = selected.filter(entry => (isBrowserGate(entry) ? 'browser' : 'fast') === group);
if (only && !selected.length) {
  console.error(`没有名为「${only}」的门禁。可用：${commands.map(([name]) => name).join(' ')}`);
  process.exit(2);
}
console.log(`门禁：${selected.length} 道（${group ? '组=' + group : only ? '单跑 ' + only : '全量'}）· ${process.platform} · ${process.version}`);

async function run([name, args]) {
  const started = Date.now(), child = spawn(process.execPath, args, { cwd: projectRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; for (const pipe of [child.stdout, child.stderr]) pipe.on('data', data => { output += data.toString(); process.stdout.write(data); });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  report.results.push({ name, code, durationMs: Date.now() - started });
  await writeFile(join(projectRoot, 'artifacts', 'regression-' + name + '.log'), output);
  console.log(`  ▸ ${name} ${code === 0 ? 'PASS' : 'FAIL'} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}
// Assets and build mutations finish before any page opens. Each browser gate
// owns its server, profile and artifacts, so two independent gates can run.
const boundary=selected.findIndex(([name])=>name==='build')+1;
for(const entry of selected.slice(0,boundary))await run(entry);
const pending=selected.slice(boundary);let index=0;
async function worker(){while(index<pending.length){const entry=pending[index++];await run(entry);}}
await Promise.all(Array.from({length:argv.includes('--parallel')?2:1},()=>worker()));
report.results.sort((a,b)=>selected.findIndex(([name])=>name===a.name)-selected.findIndex(([name])=>name===b.name));
report.finishedAt = new Date().toISOString(); report.passed = report.results.every(result => result.code === 0);
await writeFile(join(projectRoot, 'artifacts', 'regression.json'), JSON.stringify(report, null, 2) + '\n');
console.log('REGRESSION ' + (report.passed ? 'PASS' : 'FAIL') + ' · ' + report.results.map(result => result.name + ':' + result.code).join(' '));
if (!report.passed) process.exitCode = 1;
