#!/usr/bin/env node
/**
 * test-xianxia-storage.mjs — 修仙存档层的门禁
 * =========================================================================
 *
 * 守的是「修仙存档**不串**、**不丢**、**不碰官方**」这三件事。
 *
 * 为什么要这么多条
 * --------------
 * 存档是最容易「平时没事、出事就毁一生」的地方：写了一半、读回被截断、
 * 配额爆了、别的页面同时在写……任何一种都不能让玩家的存档**静默消失**。
 * 所以这一道门禁用**假的 wx 存储**把每种坏情况都演一遍，
 * 证明「旧档还在、新档没写坏、官方键一个字节都没动」。
 *
 * 覆盖
 * ----
 *   ① SHA-256 与 Node crypto 逐字一致（自带的实现不能算错）
 *   ② 正常保存 → 读回 → 状态逐值相同
 *   ③ manifest 两个槽交替写
 *   ④ 某个分片被改坏 ⇒ 读不出来，但**另一代**还在（回退可用）
 *   ⑤ 写到一半失败（存储抛错）⇒ 旧 manifest 与旧代**完好**
 *   ⑥ 配额爆了 ⇒ 旧档完好，报的错是「空间不够」
 *   ⑦ 存档清单整个损坏 ⇒ **停止写入**，不覆盖
 *   ⑧ 与官方键隔离：官方全部键的原文**逐字节不变**
 *   ⑨ 只碰 `xianxia.v1.` 开头的键
 *   ⑩ 旧代回收：只保留当前代与上一代
 *
 * 用法：node scripts/test-xianxia-storage.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const crypto = require('crypto');

/** 本仓库根目录（门禁**只读本仓库**，不依赖任何相邻目录）。 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 装载小程序里的 CommonJS 文件。
 * ⚠ 不能直接 require()：本仓库 package.json 是 `"type": "module"`，
 *   .js 会被当成 ESM ⇒ 文件里的 `module.exports` 直接炸。
 */
function loadCjs(file) {
  const code = fs.readFileSync(file, 'utf8');
  const mod = {exports: {}};
  const req = (id) => loadCjs(path.resolve(path.dirname(file), id));
  const fn = vm.runInThisContext(
    `(function (module, exports, require, console, globalThis) {\n${code}\n})`,
    {filename: file}
  );
  fn(mod, mod.exports, req, console, globalThis);
  return mod.exports;
}

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
};
const section = (t) => console.log(`\n▸ ${t}`);

const MP = path.join(ROOT, 'miniprogram');
/** 存档层在**主包**（主包与分包都要用它，见 miniprogram/bridge/storage.js 的说明）。 */
const hashUtil = loadCjs(path.join(MP, 'bridge', 'hash.js'));
const storageModule = loadCjs(path.join(MP, 'bridge', 'storage.js'));
const engine = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'runtime', 'engine.js'));

/* ══════════════════════════════════════════════ 假的 wx 存储 */

function fakeStorage(options = {}) {
  const data = new Map(Object.entries(options.seed || {}));
  const touched = [];
  let failNextSets = options.failNextSets || 0;
  let quotaOnSet = options.quotaOnSet || false;
  return {
    data,
    touched,
    /** 让接下来的 N 次 set 失败（用来演「写到一半崩了」）。 */
    failNext(times) { failNextSets = times; },
    setQuota(on) { quotaOnSet = on; },
    api: {
      get(key) {
        touched.push(key);
        return data.has(key) ? data.get(key) : null;
      },
      set(key, value) {
        touched.push(key);
        if (quotaOnSet) {
          const error = new Error('exceed storage max size');
          error.name = 'QuotaExceededError';
          throw error;
        }
        if (failNextSets > 0) {
          failNextSets -= 1;
          throw new Error('写坏了');
        }
        data.set(key, value);
      },
      remove(key) { touched.push(key); data.delete(key); },
      keys() { return [...data.keys()]; },
    },
  };
}

const canonical = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
};
const same = (a, b) => canonical(a) === canonical(b);

const life = (seed, id) => engine.createRun({seed, id});

/* ══════════════════════════════════════════════ ① 哈希 */

section('自带 SHA-256 与 Node crypto 对拍');
{
  const samples = ['', 'abc', '松风有信', 'a'.repeat(200), '混'.repeat(500), '😀'.repeat(50)];
  let allSame = true;
  for (const sample of samples) {
    const mine = hashUtil.sha256Hex(sample);
    const ref = crypto.createHash('sha256').update(sample, 'utf8').digest('hex');
    if (mine !== ref) { allSame = false; console.log(`    ✗ ${JSON.stringify(sample.slice(0, 10))}`); }
  }
  ok(allSame, `${samples.length} 组样本逐字一致`);
  ok(hashUtil.utf8Length('混') === 3 && hashUtil.utf8Length('😀') === 4, 'UTF-8 字节长度算得对');
}

/* ══════════════════════════════════════════════ ② 正常存取 */

section('正常保存与读回');
const fake = fakeStorage();
const store = storageModule.createStorage({storage: fake.api, now: () => 1700000000000});
{
  const run = life('松风有信', 'life-store-1');
  const result = await store.save(run, engine.validateRun);
  ok(result.ok !== false && result.revision >= 1, `保存成功（revision ${result.revision}）`);
  const back = store.readLife('life-store-1');
  ok(!!back, '读得到这段人生');
  ok(same(back, run), '读回来的状态与写进去的逐值相同');
  ok(store.listLives().length === 1, '往期人生清单里有 1 条');
  ok(store.activeId() === 'life-store-1', '当前人生编号正确');
}

/* ══════════════════════════════════════════════ ③ 双槽交替 */

section('manifest 双槽交替');
{
  const slots = [...fake.data.keys()].filter((k) => k.indexOf('manifest.') >= 0);
  ok(slots.length >= 1, `写了 manifest 槽：${slots.join('、')}`);
  const run = life('松风有信', 'life-store-1');
  engine.advance(run, 5);
  await store.save(run, engine.validateRun);
  const slots2 = [...fake.data.keys()].filter((k) => k.indexOf('manifest.') >= 0);
  ok(slots2.length === 2, '两次保存后两个槽都存在（交替写入）');
}

/* ══════════════════════════════════════════════ ④ 分片损坏 */

section('分片被改坏 ⇒ 读不出来，但上一代还能用');
{
  const fake2 = fakeStorage();
  const store2 = storageModule.createStorage({storage: fake2.api, now: () => 1700000000000});
  const run = life('灯下故人书', 'life-store-2');
  await store2.save(run, engine.validateRun);
  const firstShards = [...fake2.data.keys()].filter((k) => k.indexOf('life-store-2.') >= 0);
  ok(firstShards.length >= 1, `写出了 ${firstShards.length} 个分片`);

  /* 再存一代（新的分片），然后把**新**分片改坏。 */
  const run2 = life('灯下故人书', 'life-store-2');
  engine.advance(run2, 12);
  await store2.save(run2, engine.validateRun);
  const newest = [...fake2.data.keys()]
    .filter((k) => k.indexOf('life-store-2.2.') >= 0)
    .sort();
  ok(newest.length >= 1, '新一代的分片也在');
  for (const key of newest) fake2.data.set(key, '被改坏了');
  const afterBreak = store2.readLife('life-store-2');
  ok(!!afterBreak && afterBreak.month === 0, '新一代坏了 ⇒ 回退到上一代（不拿坏的糊弄）');

  /* 把新槽的 manifest 也弄坏 ⇒ 应该回退到旧槽（旧代完好）。 */
  const manifestKeys = [...fake2.data.keys()].filter((k) => k.indexOf('manifest.') >= 0);
  let newestSlot = null;
  let bestRevision = -1;
  for (const key of manifestKeys) {
    const doc = JSON.parse(fake2.data.get(key));
    if (doc.revision > bestRevision) { bestRevision = doc.revision; newestSlot = key; }
  }
  fake2.data.set(newestSlot, '{坏掉的');
  const back = store2.readLife('life-store-2');
  ok(!!back && back.month === 0, '回退到上一代（旧档还在）');
}

/* ══════════════════════════════════════════════ ⑤ 写到一半失败 */

section('写到一半失败 ⇒ 旧档完好');
{
  const fake3 = fakeStorage();
  const store3 = storageModule.createStorage({storage: fake3.api, now: () => 1700000000000});
  const run = life('归途未晚', 'life-store-3');
  await store3.save(run, engine.validateRun);
  const before = [...fake3.data.entries()].map(([k, v]) => [k, v]).sort();

  const run2 = life('归途未晚', 'life-store-3');
  engine.advance(run2, 30);
  fake3.failNext(1);          /* 第一片就写失败 */
  let threw = null;
  try {
    await store3.save(run2, engine.validateRun);
  } catch (error) {
    threw = error;
  }
  ok(!!threw, '保存如实报错');
  const after = [...fake3.data.entries()].map(([k, v]) => [k, v]).sort();
  const sameBefore = JSON.stringify(before) === JSON.stringify(after);
  ok(sameBefore, '旧 manifest 与旧分片一个字节都没变');
  const back = store3.readLife('life-store-3');
  ok(!!back && back.month === 0, '旧人生照样读得出来');
}

/* ══════════════════════════════════════════════ ⑥ 配额爆了 */

section('配额爆了 ⇒ 旧档完好，错误说的是「空间不够」');
{
  const fake4 = fakeStorage();
  const store4 = storageModule.createStorage({storage: fake4.api, now: () => 1700000000000});
  const run = life('三更听雨', 'life-store-4');
  await store4.save(run, engine.validateRun);
  fake4.setQuota(true);
  let code = null;
  let message = '';
  try {
    await store4.save(life('三更听雨', 'life-store-4'), engine.validateRun);
  } catch (error) {
    code = error.code;
    message = error.message;
  }
  ok(code === 'quota', `错误码是 quota（实际 ${code}）`);
  ok(/空间|不够/.test(message), `说的是空间不够：「${message}」`);
  fake4.setQuota(false);
  ok(!!store4.readLife('life-store-4'), '旧人生还在');
}

/* ══════════════════════════════════════════════ ⑦ 清单损坏 */

section('存档清单整个损坏 ⇒ 停止写入，不覆盖');
{
  const fake5 = fakeStorage();
  const store5 = storageModule.createStorage({storage: fake5.api, now: () => 1700000000000});
  const run = life('山门有灯', 'life-store-5');
  await store5.save(run, engine.validateRun);
  for (const key of [...fake5.data.keys()].filter((k) => k.indexOf('manifest.') >= 0)) {
    fake5.data.set(key, '不是 JSON');
  }
  let code = null;
  try {
    await store5.save(life('山门有灯', 'life-store-5'), engine.validateRun);
  } catch (error) {
    code = error.code;
  }
  ok(code === 'corrupt', `错误码是 corrupt（实际 ${code}）`);
  const rawLeft = [...fake5.data.entries()].filter(([k]) => k.indexOf('manifest.') >= 0);
  ok(rawLeft.every(([, v]) => v === '不是 JSON'), '损坏的清单没有被悄悄覆盖');
}

/* ══════════════════════════════════════════════ ⑧⑨ 隔离 */

section('与官方键隔离');
{
  const official = {
    'one8b.settings': '{"theme":"theme-light"}',
    'one8b.save.v3': '{"S":{"phase":"life"},"at":1}',
    'one8b.lives.v1': '[{"id":"x"}]',
    'o8b.one8b.save.v3': '{"S":{}}',
  };
  const fake6 = fakeStorage({seed: official});
  const store6 = storageModule.createStorage({storage: fake6.api, now: () => 1700000000000});
  await store6.save(life('渡口问舟人', 'life-store-6'), engine.validateRun);
  await store6.save(life('故纸残雪', 'life-store-7'), engine.validateRun);
  await store6.removeLife('life-store-6');

  const officialNow = {};
  for (const key of Object.keys(official)) officialNow[key] = fake6.data.get(key);
  ok(JSON.stringify(officialNow) === JSON.stringify(official), '官方四个键的原文逐字节不变');

  const foreign = fake6.touched.filter((k) => k.indexOf('xianxia.v1.') !== 0);
  ok(foreign.length === 0, `只碰了 xianxia.v1.* 的键（越界 ${foreign.length} 次）`);
}

/* ══════════════════════════════════════════════ ⑩ 旧代回收 */

section('旧代回收：只保留当前代与上一代');
{
  const fake7 = fakeStorage();
  const store7 = storageModule.createStorage({storage: fake7.api, now: () => 1700000000000});
  for (let i = 1; i <= 4; i++) {
    const run = life('旧约重来', 'life-store-8');
    engine.advance(run, i * 10);
    await store7.save(run, engine.validateRun);
  }
  const generations = [...fake7.data.keys()]
    .filter((k) => k.indexOf('life-store-8.') >= 0)
    .map((k) => {
      const parts = k.split('.');
      return parseInt(parts[parts.length - 2], 10);
    })
    .sort();
  const unique = [...new Set(generations)];
  ok(unique.length === 2, `只剩 ${unique.join('、')} 两代`);
  ok(unique[1] === 4 && unique[0] === 3, '保留的是当前代与上一代');
}

/* ══════════════════════════════════════════════ 汇总 */

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
