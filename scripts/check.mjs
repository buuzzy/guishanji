import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { projectRoot } from './serve.mjs';
import { createRun, validateRun } from '../packages/adventure/engine.js';

// 小程序支线（另一条工作流）由它自己的门禁覆盖导入依赖；本门禁只守网页产品的源码树。
// 等该支线补齐 scripts/lib/frozen-baseline.mjs 之后，可以把这份名单删掉。
const otherWorkstream = new Set([
  'scripts/build-xianxia-mp.mjs',
  'scripts/test-xianxia-art.mjs',
  'scripts/test-xianxia-build.mjs',
  'scripts/test-xianxia-equivalence.mjs',
  'scripts/test-xianxia-storage.mjs',
  'scripts/test-xianxia-style.mjs',
]);

const files = [];
// vendor/ 与 reference/ 是锁定的来源快照（字节级证据），不是本仓库的活动源码。
async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { if (['.git', '.local', 'dist', 'artifacts', 'node_modules', 'vendor', 'reference'].includes(entry.name)) continue; const path = join(dir, entry.name); if (entry.isDirectory()) await walk(path); else files.push(path); } }
await walk(projectRoot);
const normalized = new Set(files.map(file => relative(projectRoot, file).replaceAll('\\', '/')));
const fold = new Set();
for (const path of normalized) { if (fold.has(path.toLowerCase())) throw new Error('大小写重复路径：' + path); fold.add(path.toLowerCase()); }
let checked = 0;
const missing = [];
for (const file of files.filter(file => /\.(?:m?js)$/u.test(file))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(relative(projectRoot, file) + '\n' + result.stderr);
  const source = await readFile(file, 'utf8');
  if (source.includes('\r')) throw new Error('源文件需要 LF 行尾：' + relative(projectRoot, file));
  const name = relative(projectRoot, file).replaceAll('\\', '/');
  if (!otherWorkstream.has(name)) {
    for (const match of source.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/gu)) {
      const target = relative(projectRoot, resolve(dirname(file), match[2])).replaceAll('\\', '/');
      if (!normalized.has(target)) missing.push(name + ' -> ' + match[2]);
    }
  }
  checked++;
}
if (missing.length) throw new Error('导入不存在或大小写不一致：\n' + missing.join('\n'));
for (const seed of ['first', 'second', '第三种机缘']) validateRun(createRun({ seed }));
console.log('CHECK PASS · ' + checked + ' JavaScript modules · import paths / syntax / LF / birth contracts');
