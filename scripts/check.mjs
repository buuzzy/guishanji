import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { projectRoot } from './serve.mjs';
import { STORIES, AGE_EVENTS } from '../content/stories.js';
import { newLife } from '../packages/core/state.js';
import { validateState } from '../packages/core/validate.js';

const files = [];
async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { if (['.git', '.local', 'dist', 'artifacts', 'node_modules'].includes(entry.name)) continue; const path = join(dir, entry.name); if (entry.isDirectory()) await walk(path); else files.push(path); } }
await walk(projectRoot);
const normalized = new Set(files.map(file => relative(projectRoot, file).replaceAll('\\', '/')));
const fold = new Set();
for (const path of normalized) { if (fold.has(path.toLowerCase())) throw new Error('大小写重复路径：' + path); fold.add(path.toLowerCase()); }
let checked = 0;
for (const file of files.filter(file => /\.(?:m?js)$/u.test(file))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(relative(projectRoot, file) + '\n' + result.stderr);
  const source = await readFile(file, 'utf8');
  if (source.includes('\r')) throw new Error('源文件需要 LF 行尾：' + relative(projectRoot, file));
  for (const match of source.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/gu)) {
    const target = relative(projectRoot, resolve(dirname(file), match[2])).replaceAll('\\', '/');
    if (!normalized.has(target)) throw new Error('导入不存在或大小写不一致：' + target);
  }
  checked++;
}
for (const [id, story] of Object.entries(STORIES)) {
  if (!story.title || !story.text || story.choices.length < 2 || new Set(story.choices.map(choice => choice[0])).size !== story.choices.length) throw new Error('故事内容无效：' + id);
}
for (const rule of AGE_EVENTS) if (!STORIES[rule.event]) throw new Error('年龄故事引用无效。');
for (const seed of ['first', 'second', '第三种机缘']) validateState(newLife({ seed }));
console.log('CHECK PASS · ' + checked + ' JavaScript modules · ' + Object.keys(STORIES).length + ' original stories · import paths / syntax / LF / birth contracts');
