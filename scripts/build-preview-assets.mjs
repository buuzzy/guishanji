import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {createRequire} from 'node:module';
import { projectRoot } from './serve.mjs';

const target = join(projectRoot, 'apps/preview');
const reference = join(target, 'reference');
await mkdir(reference, { recursive: true });
const modules = {
  art: 'miniprogram/art/art.js',
  pixel: 'miniprogram/art/pixel.js',
  room: 'miniprogram/subpkg/engine/art/room.js',
  shelf: 'miniprogram/subpkg/engine/art/shelf.js',
  scene: 'miniprogram/subpkg/engine/art/room-art.js',
};
const styles = {
  theme: 'miniprogram/app.wxss',
  life: 'miniprogram/subpkg/engine/styles/life.wxss',
  sheet: 'miniprogram/subpkg/engine/styles/sheet.wxss',
  roll: 'miniprogram/subpkg/engine/styles/roll.wxss',
};
const sourceArg = process.argv.find(arg => arg.startsWith('--source='));
if (sourceArg) {
  const source = resolve(sourceArg.slice(9));
  const files = [];
  for (const [id, path] of Object.entries({ ...modules, ...styles })) {
    const bytes = await readFile(join(source, path));
    const text = bytes.toString('utf8').replaceAll('\r\n', '\n');
    const file = id + (modules[id] ? '.cjs' : '.wxss');
    await writeFile(join(reference, file), text);
    files.push({ file, source: path, sourceSha256: createHash('sha256').update(bytes).digest('hex'), normalizedSha256: createHash('sha256').update(text).digest('hex') });
  }
  await writeFile(join(reference, 'provenance.json'), JSON.stringify({ project: '1in8b', purpose: 'User requested reuse of the existing frontend in the isolated HTML prototype', files }, null, 2) + '\n');
}
let css = '/* Existing 1in8b theme and cards; rpx converted using 750rpx = 375px. */\n';
for (const id of ['theme', 'sheet', 'life', 'roll']) {
  let source = await readFile(join(reference, id + '.wxss'), 'utf8');
  source = source.replace(/^[\t ]*@import[^;\r\n]*;[\t ]*$/gmu, '').replace(/(-?(?:\d+\.?\d*|\.\d+))rpx\b/gu, (_, number) => Number(number) / 2 + 'px');
  source = source.replace(/\bpage(?=\s*[{,:])/gu, 'body').replace(/>\s*view\b/gu, '> div');
  css += source + '\n';
}
await writeFile(join(target, 'base.css'), css.trimEnd() + '\n');
const provenance=JSON.parse(await readFile(join(reference,'provenance.json'),'utf8'));
for(const file of provenance.files){const text=await readFile(join(reference,file.file));if(createHash('sha256').update(text).digest('hex')!==file.normalizedSha256)throw Error('引用素材哈希不符：'+file.file);}
const art=createRequire(import.meta.url)(join(reference,'art.cjs'));
await writeFile(join(target,'pixel-style.js'),'// Palette and human sprite proportions from the existing authorized 1in8b reference.\nexport const PIXEL_STYLE = '+JSON.stringify({PAL:art.PAL,PEOPLE:art.PEOPLE})+';\n');
console.log('PREVIEW ASSETS PASS · existing theme / life / sheet / birth roller; independent cultivation canvas');
