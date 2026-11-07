#!/usr/bin/env node
/**
 * t7-reverse.mjs —— T7 表达域门禁与差异审查的反向验证（**不是门禁，是门禁的体检**）
 * ============================================================================
 *
 * ## 为什么要有这个
 * ----------------
 * AGENTS.md 写得很直白：**「门禁必须是真门禁」** ——
 * 每条关键断言都要做反向验证（注入一个坏值，必须报红）。
 * 否则一个「跑一遍没报错」的假门禁，比没有门禁更糟。
 *
 * 这道脚本给下面这些断言各注入一个坏值，**每一条都必须报红**：
 *
 *   门禁 `scripts/verify-event-expressions.mjs`
 *     ① 改一个字        → 逐值全等必须报红
 *     ② 漏一条卡        → 一条不漏必须报红
 *     ③ hint 数量对不上 → 提示语数对齐必须报红
 *     ④ 正文超 90 字    → 字数上限必须报红
 *     ⑤ 说法种数对不上  → 分支一致必须报红
 *     ⑥ 专名被发明      → 不许编必须报红
 *     ⑦ 专名被丢掉      → 不许丢必须报红
 *
 *   差异审查 `scripts/t7-diff.mjs`
 *     ⑧ 正文里的数量被改 → 必须报红
 *     ⑨ 提示语里编出数字 → 必须报红
 *     ⑩ 专名被丢掉       → 必须报红
 *
 * ⚠ **判据本身也要被反向验证**：判据改了口径（2026-11-08 改过三次），
 *   光看「跑一遍没报错」证明不了它还能抓住坏值。
 *
 * 用法：
 *   node scripts/t7-reverse.mjs            # 在**临时副本**上做，不碰工作区
 *   node scripts/t7-reverse.mjs --inplace  # 在工作区做（会改文件，用完要还原）
 *
 * ⚠ 默认模式走临时目录：把仓库整份复制到 `os.tmpdir()`，
 *   在副本上注入坏值、跑门禁、确认报红、删副本。
 *   ⇒ 工作区一个字节都不会被改。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPLACE = process.argv.includes('--inplace');

let failures = 0;
let skipped = 0;
function ok(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.error(`  ✗ ${msg}`); }
}
function skip(msg) {
  skipped++;
  console.log(`  · 跳过：${msg}`);
}

console.log('T7 表达域门禁与差异审查 · 反向验证（注入坏值，必须报红）\n');

/** 在指定根目录跑一个脚本，返回 {code, out}（**不抛异常**）。 */
function runScript(root, rel, args) {
  const cmd = [path.join(root, rel), ...(args || [])];
  try {
    const out = execFileSync(process.execPath, cmd, {
      cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {code: 0, out};
  } catch (err) {
    return {
      code: err.status === undefined ? 1 : err.status,
      out: `${err.stdout || ''}\n${err.stderr || ''}`,
    };
  }
}

const GATE = 'scripts/verify-event-expressions.mjs';
const DIFF = 'scripts/t7-diff.mjs';

/** 复制仓库到临时目录（只复制需要的部分，够门禁跑起来就行）。 */
function makeCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsj-t7-reverse-'));
  const copy = (rel) => {
    const from = path.join(ROOT, rel);
    const to = path.join(dir, rel);
    fs.mkdirSync(path.dirname(to), {recursive: true});
    fs.cpSync(from, to, {recursive: true});
  };
  for (const rel of ['content', 'packages', 'scripts', 'tests', 'docs']) copy(rel);
  copy('package.json');
  if (fs.existsSync(path.join(ROOT, 'node_modules'))) {
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  }
  return dir;
}

const workdir = INPLACE ? ROOT : makeCopy();
console.log(`工作副本：${workdir}${INPLACE ? '（⚠ 工作区本体！）' : '（临时目录，工作区不受影响）'}\n`);

/**
 * 注入一个坏值、跑脚本、还原、判红。
 * @param {object} o
 * @param {string} o.name  这一道验证叫什么
 * @param {string} o.file  要改的文件（相对 workdir）
 * @param {string} o.from  要替换的原串
 * @param {string} o.to    替换成什么
 * @param {string} o.script 要跑的脚本（相对 workdir）
 * @param {string[]} [o.args] 脚本参数
 * @param {RegExp} o.expect 报红时输出里必须出现的字样
 */
function inject({name, file, from, to, script, args, expect}) {
  const abs = path.join(workdir, file);
  if (!fs.existsSync(abs)) { skip(`${name}（文件不在：${file}）`); return; }
  const before = fs.readFileSync(abs, 'utf8');
  if (!before.includes(from)) { skip(`${name}（注入点找不到）`); return; }
  fs.writeFileSync(abs, before.replace(from, to));
  const r = runScript(workdir, script, args);
  fs.writeFileSync(abs, before);
  const red = r.code !== 0 && expect.test(r.out);
  ok(red, `${name}报红（退出码 ${r.code}）`);
  if (!red) {
    console.error('      门禁没报红 ⇒ 这是假门禁');
    console.error('      输出尾部：' + String(r.out).split('\n').slice(-6).join('\n      '));
  }
}

try {
  /* ── 门禁 ①：改一个字 ─────────────────────────────────────────────── */
  inject({
    name: '反向验证 ①「改一个字」',
    file: 'content/expressions/events/entry.js',
    from: '你小时候，一名幽灯堂修士把你带离战乱。',
    to: '你小时候，一名幽灯堂修士把你带离战乱。（测试改字）',
    script: GATE,
    expect: /逐值全等|正文变了|标题/,
  });

  /* ── 门禁 ②：漏一条卡 ─────────────────────────────────────────────── */
  {
    const abs = path.join(workdir, 'content/expressions/events/entry.js');
    const before = fs.readFileSync(abs, 'utf8');
    /* ⚠ 要**整块删掉一张卡**（键 + 三元组），不是删掉一行 ——
     *   删一行会让文件语法坏掉，门禁是「崩了」而不是「报红」⇒ 证明不了判据。 */
    const patched = before.replace(/^ {2}early_demonic: \[\n[\s\S]*?\n {2}\],/m, '');
    if (patched === before) {
      skip('反向验证 ②「漏一条卡」（注入点找不到）');
    } else {
      fs.writeFileSync(abs, patched);
      const r = runScript(workdir, GATE);
      fs.writeFileSync(abs, before);
      ok(r.code !== 0 && /都有说法|缺说法/.test(r.out),
        `反向验证 ②「漏一条卡」报红（退出码 ${r.code}）`);
      if (r.code === 0) console.error('      门禁没报红 ⇒ 这是假门禁');
    }
  }

  /* ── 门禁 ③：hint 数量对不上 ──────────────────────────────────────── */
  {
    const abs = path.join(workdir, 'content/expressions/events/entry.js');
    const before = fs.readFileSync(abs, 'utf8');
    /* 把 early_demonic 的两条提示语删成一条。 */
    const patched = before.replace(
      "      '这里的人都认得你，可门规还得自己摸清。',\n      '山下别处也能谋生，也能学法。',",
      "      '这里的人都认得你，可门规还得自己摸清。',",
    );
    if (patched === before) {
      skip('反向验证 ③「hint 数量对不上」（注入点找不到）');
    } else {
      fs.writeFileSync(abs, patched);
      const r = runScript(workdir, GATE);
      fs.writeFileSync(abs, before);
      ok(r.code !== 0 && /提示语数量都对得上|提示语/.test(r.out),
        `反向验证 ③「hint 数量对不上」报红（退出码 ${r.code}）`);
      if (r.code === 0) console.error('      门禁没报红 ⇒ 这是假门禁');
    }
  }

  /* ── 门禁 ④：正文超 90 字 ─────────────────────────────────────────── */
  inject({
    name: '反向验证 ④「正文超 90 字」',
    file: 'content/expressions/events/entry.js',
    from: '你小时候，一名幽灯堂修士把你带离战乱。他教你认字和打坐，如今要你在堂中登记，师兄会来查你的练习。',
    to: '你小时候，一名幽灯堂修士把你带离战乱。他教你认字和打坐，如今要你在堂中登记，师兄会来查你的练习。'
      + '这一句是故意写长的，用来把正文的字数上限那条断言顶破，看看门禁到底抓不抓得住。'
      + '要是抓不住，那这条断言就是一句空话，改了字数也没人管。',
    script: GATE,
    expect: /正文都不超过 90 字|超过 90 字/,
  });

  /* ── 门禁 ⑤：说法种数对不上 ───────────────────────────────────────── */
  inject({
    name: '反向验证 ⑤「说法种数对不上」',
    file: 'content/expressions/events/entry.js',
    /* ⚠ 光把 `if (noRoot)` 改成 `if (false)` **不够** ——
     *   那个函数本来还按灵根分好几支（松骨/水木/金火…），塌掉一条支还是好几种说法。
     *   ⇒ 这里直接把整段函数换成一个**只说一句**的函数。 */
    from: '    s => {\n      const c = s.life.cultivation;',
    to: '    s => {\n      if (true) return \'许执事在测灵簿上写下“松骨灵根”。\';\n      const c = s.life.cultivation;',
    script: GATE,
    expect: /说法种数与规则层一致|能说出的说法/,
  });

  /* ── 门禁 ⑥：专名被发明 ───────────────────────────────────────────── */
  inject({
    name: '反向验证 ⑥「专名被发明」',
    file: 'content/expressions/events/entry.js',
    from: '你小时候，一名幽灯堂修士把你带离战乱。',
    to: '你小时候，欧阳无敌把你带离战乱。',
    script: GATE,
    expect: /没有发明规则层没有的专名|发明了/,
  });

  /* ── 门禁 ⑦：专名被丢掉 ───────────────────────────────────────────── */
  inject({
    name: '反向验证 ⑦「专名被丢掉」',
    file: 'content/expressions/events/child.js',
    from: '与你一起捡柴的阿宁跑进渡口',
    to: '与你一起捡柴的小孩跑进渡口',
    script: GATE,
    expect: /专名表达域都留着|丢了/,
  });

  /* ── 门禁 ⑪：危险分支超 90 字（三态探针量不到的那一支）───────────── */
  inject({
    name: '反向验证 ⑪「危险分支超 90 字」',
    file: 'content/expressions/events/child.js',
    /* ⚠ 这一支只有「授业邀请危险」的探针状态才会跑到 ——
     *   早先长度判据只量三态探针（那里 offer 是空的）⇒ **这一支根本量不到**
     *   ⇒ 实测放过一句 129 字的正文。判据补强后必须能抓住它。 */
    from: "'前任铺位空着，领料册还写他名字；送水弟子说夜里锁门，长老不许谈前任。'",
    to: "'前任铺位空着，领料册还写他名字；送水弟子说夜里锁门，长老不许谈前任。"
      + '这句是故意加长的，用来把危险那一支顶破，看看长度判据到底量不量得到它。\'',
    script: GATE,
    expect: /正文都不超过 90 字|超过 90 字/,
  });

  /* ── 差异审查 ⑧：正文里的数量被改 ─────────────────────────────────── */
  {
    const abs = path.join(workdir, 'tests/fixtures/event-expressions.json');
    const before = fs.readFileSync(abs, 'utf8');
    let patched = before;
    /* 找一个正文里带「年」的卡，把它的「三年」改成「五年」。 */
    const doc = JSON.parse(before);
    const id = Object.keys(doc).find(k => JSON.stringify(doc[k]).includes('三年'));
    if (!id) {
      skip('反向验证 ⑧「正文里的数量被改」（找不到带数量的卡）');
    } else {
      const txt = JSON.stringify(doc);
      patched = txt.replace('三年', '五年');
      fs.writeFileSync(abs, patched);
      const r = runScript(workdir, DIFF, ['--before=tests/fixtures/event-expressions-pre-rewrite.json']);
      fs.writeFileSync(abs, before);
      ok(r.code !== 0 && /正文里的数量一个都没变/.test(r.out),
        `反向验证 ⑧「正文里的数量被改」报红（退出码 ${r.code}）`);
      if (r.code === 0) console.error('      差异审查没报红 ⇒ 这是假判据');
    }
  }

  /* ── 差异审查 ⑨：提示语里编出数字 ─────────────────────────────────── */
  {
    const abs = path.join(workdir, 'tests/fixtures/event-expressions.json');
    const before = fs.readFileSync(abs, 'utf8');
    const txt = before;
    if (!txt.includes('六个月')) {
      skip('反向验证 ⑨「提示语里编出数字」（基线里没有「六个月」）');
    } else {
      fs.writeFileSync(abs, txt.replace(/六个月/g, '八个月'));
      const r = runScript(workdir, DIFF, ['--before=tests/fixtures/event-expressions-pre-rewrite.json']);
      fs.writeFileSync(abs, before);
      ok(r.code !== 0 && /提示语里的数规则层本来就知道/.test(r.out),
        `反向验证 ⑨「提示语里编出数字」报红（退出码 ${r.code}）`);
      if (r.code === 0) console.error('      差异审查没报红 ⇒ 这是假判据');
    }
  }

  /* ── 差异审查 ⑩：专名被丢掉 ───────────────────────────────────────── */
  {
    const abs = path.join(workdir, 'tests/fixtures/event-expressions.json');
    const before = fs.readFileSync(abs, 'utf8');
    if (!before.includes('阿宁')) {
      skip('反向验证 ⑩「专名被丢掉」（基线里没有「阿宁」）');
    } else {
      fs.writeFileSync(abs, before.replace(/阿宁/g, '那个人'));
      const r = runScript(workdir, DIFF, ['--before=tests/fixtures/event-expressions-pre-rewrite.json']);
      fs.writeFileSync(abs, before);
      ok(r.code !== 0 && /变更前的专名都还在/.test(r.out),
        `反向验证 ⑩「专名被丢掉」报红（退出码 ${r.code}）`);
      if (r.code === 0) console.error('      差异审查没报红 ⇒ 这是假判据');
    }
  }
} finally {
  if (!INPLACE) {
    fs.rmSync(workdir, {recursive: true, force: true});
    console.log(`\n临时副本已删除：${workdir}`);
  }
}

if (failures) {
  console.error(`\n${failures} 道反向验证没通过。`);
  process.exit(1);
}
console.log(`\n结果：0 个问题${skipped ? `（跳过 ${skipped} 道）` : ''}`);
