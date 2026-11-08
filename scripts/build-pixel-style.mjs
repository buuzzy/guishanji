/**
 * build-pixel-style.mjs —— 画面调色板门禁（2026-11-08 · 网页端清理后）
 * ============================================================================
 *
 * ## 它守什么
 *
 * `apps/preview/pixel-style.js` 是**小程序包的构建输入**
 * （`scripts/build-xianxia-mp.mjs` 的 `ALLOWED` 精确清单里那一项），
 * 它的内容是官方 1in8b 的调色板与人物像素比例。
 *
 * ⚠ 网页端删掉后，这个文件**没有别的生成器**了 ⇒ 这道门禁必须留着：
 * 它按官方原文**重新生成一遍**（生成物与提交进仓库的那份必须逐字节相同），
 * 并与锁定快照 `vendor/xianxia-r12-art/apps/preview/pixel-style.js` 比对。
 *
 * ## 三道检查
 *
 *   ① `apps/preview/reference/` 里的官方素材与 `provenance.json` 记的哈希一致
 *      （官方原文被动过 ⇒ 这里立刻报红）。
 *   ② 由 `reference/art.cjs` 重新生成的 `pixel-style.js` 与仓库里那份**逐字节相同**
 *      （生成过程被人手改过 ⇒ 这里立刻报红）。
 *   ③ 仓库里那份与锁定快照 `vendor/xianxia-r12-art/…` **逐字节相同**
 *      （我们这份与官方基线漂了 ⇒ 这里立刻报红）。
 *
 * ## 为什么不再生成 `base.css`
 *
 * `base.css` 是网页端的样式表，2026-11-08 随网页端一起删除。
 * 官方那几份 `.wxss` 仍留在 `reference/` 里（哈希锁着），将来要做别的用途还能取。
 */
import {readFile, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {projectRoot} from './serve.mjs';

/** 官方素材目录（1in8b 的逐字节副本）。 */
const REFERENCE = join(projectRoot, 'apps/preview/reference');
/** 调色板输出（小程序构建输入 + 画面门禁的比对基准）。 */
const TARGET = join(projectRoot, 'apps/preview/pixel-style.js');
/** 锁定快照（迁移时带来的官方原件）。 */
const LOCKED = join(projectRoot, 'vendor/xianxia-r12-art/apps/preview/pixel-style.js');

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/* ── ① 官方素材与 provenance.json 对得上吗 ─────────────────────────────── */

const provenance = JSON.parse(await readFile(join(REFERENCE, 'provenance.json'), 'utf8'));
for (const file of provenance.files) {
  const text = await readFile(join(REFERENCE, file.file), 'utf8');
  const hash = sha256(text);
  if (hash !== file.normalizedSha256) {
    throw new Error(`引用素材哈希不符：${file.file}（期望 ${file.normalizedSha256}，实际 ${hash}）`);
  }
}
console.log(`  ✓ 官方素材 ${provenance.files.length} 份与 provenance.json 记的哈希一致`);

/* ── ② 重新生成，与仓库里那份逐字节相同 ─────────────────────────────── */

const art = createRequire(import.meta.url)(join(REFERENCE, 'art.cjs'));
const generated =
  '// Palette and human sprite proportions from the existing authorized 1in8b reference.\n' +
  'export const PIXEL_STYLE = ' + JSON.stringify({PAL: art.PAL, PEOPLE: art.PEOPLE}) + ';\n';

const committed = await readFile(TARGET, 'utf8');
if (committed !== generated) {
  await writeFile(TARGET, generated);
  throw new Error('apps/preview/pixel-style.js 与官方原文重新生成的结果不一致（已按官方原文重写，请核对差异后再提交）');
}
console.log('  ✓ 调色板与官方原文重新生成的结果逐字节相同');

/* ── ③ 与锁定快照逐字节相同 ─────────────────────────────────────────── */

const locked = await readFile(LOCKED, 'utf8');
if (locked !== committed) {
  throw new Error(
    `apps/preview/pixel-style.js 与锁定快照不一致（快照 ${sha256(locked)}，本仓库 ${sha256(committed)}）`
  );
}
console.log('  ✓ 与 vendor/xianxia-r12-art 的锁定快照逐字节相同');

console.log('PIXEL STYLE PASS · ' + Buffer.byteLength(committed, 'utf8') + ' bytes · apps/preview/pixel-style.js');
