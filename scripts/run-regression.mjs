import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { projectRoot } from './serve.mjs';

const commands = [['check', ['scripts/check.mjs']], ['engine-storage', ['--test', 'tests/engine.test.mjs', 'tests/storage.test.mjs']], ['build', ['scripts/build.mjs']], ['browser', ['scripts/verify-browser.mjs']], ['static-build', ['scripts/verify-build.mjs']]];
const report = { startedAt: new Date().toISOString(), node: process.version, platform: process.platform, results: [] };
await mkdir(join(projectRoot, 'artifacts'), { recursive: true });
for (const [name, args] of commands) {
  const started = Date.now(), child = spawn(process.execPath, args, { cwd: projectRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; for (const pipe of [child.stdout, child.stderr]) pipe.on('data', data => { output += data.toString(); process.stdout.write(data); });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  report.results.push({ name, code, durationMs: Date.now() - started });
  await writeFile(join(projectRoot, 'artifacts', 'regression-' + name + '.log'), output);
}
report.finishedAt = new Date().toISOString(); report.passed = report.results.every(result => result.code === 0);
await writeFile(join(projectRoot, 'artifacts', 'regression.json'), JSON.stringify(report, null, 2) + '\n');
console.log('REGRESSION ' + (report.passed ? 'PASS' : 'FAIL') + ' · ' + report.results.map(result => result.name + ':' + result.code).join(' '));
if (!report.passed) process.exitCode = 1;
