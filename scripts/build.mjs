import { mkdir, readdir, readFile, writeFile, cp, rename, lstat } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { projectRoot } from './serve.mjs';

const output = resolve(projectRoot, 'dist'), local = resolve(projectRoot, '.local');
if (relative(projectRoot, output) !== 'dist') throw new Error('构建输出路径无效。');
await mkdir(local, { recursive: true });
const stamp = new Date().toISOString().replace(/[^0-9]/gu, '');
const stage = join(local, 'build-' + stamp); await mkdir(stage);
for (const folder of ['apps/web', 'packages', 'content']) await cp(join(projectRoot, folder), join(stage, folder), { recursive: true, dereference: false });
await cp(join(projectRoot, 'apps/web/index.html'), join(stage, 'index.html'));
await writeFile(join(stage, 'package.json'), JSON.stringify({ name: 'shanhai-life-static', type: 'module', private: true }, null, 2) + '\n');
const files = [];
async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) await walk(path); else if (entry.isFile()) { const data = await readFile(path); files.push({ path: relative(stage, path).replaceAll('\\', '/'), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') }); } else throw new Error('构建目录存在不支持的链接。'); } }
await walk(stage);
await writeFile(join(stage, 'xianxia-build.json'), JSON.stringify({ product: 'shanhai-life', version: '0.1.0', builtAt: new Date().toISOString(), files }, null, 2) + '\n');
let existing = false;
try { const info = await lstat(output); if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('dist 不是独立目录，已停止构建。'); existing = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (existing) {
  let marker; try { marker = JSON.parse(await readFile(join(output, 'xianxia-build.json'), 'utf8')); } catch { throw new Error('dist 缺少本项目标记，已有输出未被覆盖。'); }
  if (marker.product !== 'shanhai-life') throw new Error('dist 属于其他项目，已保留。');
  await rename(output, join(local, 'previous-dist-' + stamp));
}
await rename(stage, output);
console.log('BUILD PASS · ' + files.length + ' files · ' + files.reduce((sum, file) => sum + file.bytes, 0) + ' bytes · dist/');
