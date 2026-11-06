import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from './serve.mjs';

const port = Number(process.argv.find(arg => arg.startsWith('--port='))?.slice(7) || 8866), url = 'http://127.0.0.1:' + port + '/';
const expected = await readFile(join(projectRoot, 'apps/preview/index.html'), 'utf8');
async function ready() { try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); return await response.text() === expected; } catch { return false; } }
if (await ready()) { console.log('READY · ' + url); process.exit(0); }
const local = join(projectRoot, '.local'); await mkdir(local, { recursive: true });
const out = openSync(join(local, 'server-out.log'), 'a'), err = openSync(join(local, 'server-err.log'), 'a');
const child = spawn(process.execPath, [join(projectRoot, 'scripts/serve.mjs'), '--port=' + port], { cwd: projectRoot, detached: true, windowsHide: true, stdio: ['ignore', out, err] });
child.unref(); closeSync(out); closeSync(err);
for (let i = 0; i < 25; i++) { if (await ready()) { await writeFile(join(local, 'server.json'), JSON.stringify({ product: 'guishanji', pid: child.pid, port, url, startedAt: new Date().toISOString() }, null, 2)); console.log('READY · ' + url + ' · owned PID ' + child.pid); process.exit(0); } await new Promise(resolve => setTimeout(resolve, 200)); }
throw new Error('服务未能启动，请查看 .local/server-err.log；没有停止其他进程。');
