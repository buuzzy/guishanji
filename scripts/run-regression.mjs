import { spawn, execFileSync } from 'node:child_process';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { projectRoot } from './serve.mjs';

const commands = [
  ['preview-assets', ['scripts/build-preview-assets.mjs']],
  ['check', ['scripts/check.mjs']],
  ['unit', ['--test', 'tests/adventure.test.mjs', 'tests/adventure-feedback.test.mjs','tests/cultivation.test.mjs','tests/decision-clarity.test.mjs','tests/life-richness.test.mjs','tests/story-network.test.mjs','tests/progression.test.mjs','tests/revision9.test.mjs','tests/story-rules10.test.mjs','tests/radar.test.mjs','tests/items.test.mjs','tests/plot.test.mjs']],
  ['mundane-unit', ['--test','tests/mundane-life.test.mjs']],
  ['rules12-unit', ['--test','tests/story-rules12.test.mjs']],
  /* ── 发卡闸门禁（2026-11-07 · T2）────────────────────────────────────
     密度 / 冷却 / 阶段三道闸。闸是**护栏**：今天的内容本来就达标，
     所以它在正式跑里很少真的拦下什么 ⇒ 光看「跑一遍没报错」证明不了它有用。
     ⇒ 这道门禁用**造出来的状态**逐条证明三道闸真的拦得住，
       并且守「闸的口径 == 指标审计的规格」（谁把闸改松了，这里立刻报红）。 */
  ['gates-unit', ['--test','tests/gates.test.mjs']],
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
  /* ── 内容保真门禁 ───────────────────────────────────────────────────
     纯重构阶段这两个必须全绿：事件表的九个历史版本逐值全等、
     固定种子的完整人生决策序列逐条全等。
     有意行为变更阶段（突破必发 / 体力拆分 / 长线区间）才允许
     eventseq 变，且必须先存旧基线、逐条审差异、再更新基线。 */
  ['eventsfid', ['scripts/verify-events-fidelity.mjs', '--check']],
  ['eventseq', ['scripts/verify-event-sequence.mjs', '--check']],
  /* ── 结构边界门禁 ───────────────────────────────────────────────────
     谁归谁管、依赖朝哪个方向、越界有没有许可证。
     这道门禁管的是**结构**，不管内容好不好；内容由上面两道管。 */
  ['boundaries', ['scripts/check-boundaries.mjs']],
  /* ── 节奏门禁 ───────────────────────────────────────────────────────
     实跑一批人生，量「什么时候到哪一境、每岁发几张卡、每个阶段有没有内容」。
     这道门禁守的是**时间轴**：突破卡不能等十几年、也不能早到还没入门；
     修士不能 50 岁还卡在炼气；每个人生阶段都得有卡可看。 */
  ['cadence', ['scripts/audit-cadence.mjs', '--count=40', '--check']],
  /* ── 长线门禁 ─────────────────────────────────────────────────────────
     实跑一批人生，量「每条长线（宗门试炼、坊市契约、魔道献祭……）发得出来吗」。
     这道门禁守的是**内容覆盖**：一条长线一次都没发出来 ⇒ 那条内容等于不存在，
     而玩家不会知道自己错过了什么。
     它同时守着「年龄区间不许手填」（必须按 `chainAgeEnd` 的规则算出来）。 */
  ['chains', ['scripts/audit-chains.mjs', '--count=80', '--check']],
  /* ── 表达门禁 ─────────────────────────────────────────────────────────
     这道门禁守的是**说法**：事件的话不许留「还没定稿」的（voice:'pending'），
     表达域不许有孤儿条目（说了一条不存在的内容），
     每条内容的选项提示语数量必须和规则层对得上，
     表达域的输出必须与基线逐值全等（改一个字就报红）。
     它还核对「专有名词总表」：表达域不许发明内容。 */
  ['expressions', ['scripts/verify-expressions.mjs']],
  /* ── 修仙线表达门禁 ───────────────────────────────────────────────────
     修仙这条路上有 **285 张决策卡**，2026-11-07 之前**一张都没进过表达域**
     （经典线那 66 张早就在 `content/expressions/` 里了）⇒ 玩家读到的全是
     「一句里塞三件事」的老写法（用户 2026-11-06 提的第 10 条）。
     这道门禁守修仙线表达域的六件事：一条不漏、提示语数对齐、正文 ≤ 90 字、
     分支数一致、专名双向（不许发明也不许丢）、输出与基线逐值全等。
     ⚠ 它只管**当前版本（规则十二）**：旧版本走各自的事件表快照，
       那些快照一个字都不动（eventsfid 门禁盯着）。 */
  ['eventexpressions', ['scripts/verify-event-expressions.mjs']],
  /* ── 内容模块门禁 ───────────────────────────────────────────────────────
     content/adventure.js 拆成「境界与技艺 / 道具 / 地区与人物 / 结局与版本 / 节点」
     五个域文件之后，门面必须只转发、五个文件必须各管各的（没有重名），
     而且转出来的值必须与拆分前的基线逐值全等（函数按源码文本比）。
     纯重构 ⇒ 一个字都不该变；真要改内容，先改基线并说明理由。 */
  ['contentmodules', ['scripts/verify-content-modules.mjs']],
  /* ── 内容指标门禁 ─────────────────────────────────────────────────────
     六项「内容匀不匀」的指标：可达性（多少条内容发霉）／密度（最挤的 10 年
     有多少个抉择）／冷却（人生经历里 60 个月内的重复）／节奏对齐（每个境界段
     实际发出过多少种内容）／结局覆盖／阶段跨度。
     判据是「跟基线比」⇒ **只许变好，不许变差**。
     ⚠ 这道门禁补上的是 2026-11-06 那一轮漏掉的洞：当时量指标的脚本
       `scripts/content-map.mjs` 根本没进过 git ⇒ 六项指标长期没人盯着。 */
  ['metrics', ['scripts/audit-metrics.mjs', '--count=120', '--check']],
  /* ── 道具闭环门禁 ─────────────────────────────────────────────────────
     用户 2026-11-06 提的第 11 条：「人生经历能产出」＋「道具 87 发 10 耗」。
     这道门禁守的是**道具的来路与去处**：
     · 发霉的道具（表里有、源码里一次都没出现）
     · 拿不到却被消耗（玩家被扣了一个拿不到的东西）
     · 拿到却无出口（捡到的东西既不能花也没有下文）
     · 人生经历带道具的比例低于下限（日子只写事、从不产出）
     ⚠ 它是护栏 ⇒ 光看「跑一遍没报错」证明不了它有用 ⇒ 反向验证在
       tests/items.test.mjs（造坏数据逐条证明四条判据真抓得住）。 */
  ['items', ['scripts/audit-items.mjs', '--count=120']],
  /* ── 剧情承接门禁 ─────────────────────────────────────────────────────
     用户 2026-11-06 提的三条剧情问题：
     · B5「幽灯堂选项突兀」—— 十六岁测灵那张卡上，魔道的入口人人可见、也没有条件；
     · 「顾魇凭空出现」—— 选项提示里先抛出一个玩家还没见过的名字；
     · B6「铜匣线接不上童年钩子」—— 童年铜匣卡有一个结果选完就没有下文。
     这道门禁守的就是这三条：魔道入口必须挂条件、选项里的人名必须先被介绍过、
     童年卡的每个结果都要接上一条后续线。
     ⚠ 它是护栏 ⇒ 光看「跑一遍没报错」证明不了它有用 ⇒ 反向验证在
       tests/plot.test.mjs（造坏数据逐条证明三条判据真抓得住）。 */
  ['plot', ['scripts/audit-plot.mjs', '--count=120']],

  /* ── 内容完备度门禁 ─────────────────────────────────────────────────────
     用户 2026-11-06 提的第 12 条：「细节到底到哪了」。
     这道门禁把那份盘点变成**会报红的守门员**，守两件事：
     · **硬底线** —— 十一条故事线都不空、每境至少 5 种内容、每条长线至少 2 步、
       结局至少 20 个、每个灵根都有说明、晚年至少 30 种卡；
     · **已知缺口台账** —— 「还缺什么」记在 tests/fixtures/completeness-gaps.json，
       台账与现状**两个方向都要对上**：新缺口要登记，缺口被补上要更新台账。
     ⚠ 它是护栏 ⇒ 光看「跑一遍没报错」证明不了它有用 ⇒ 反向验证在
       scripts/t9-reverse.mjs（14 道：注入坏值逐条证明会报红，
       并证明台账正常时它是绿的 —— 不会「永远报红」）。 */
  ['completeness', ['scripts/audit-completeness.mjs', '--check']],
  /* ── 完备度门禁的体检 ───────────────────────────────────────────────────
     反向验证不是门禁，但它是「门禁有没有用」的证据 ⇒ 也挂进来，
     免得它变成没人跑的孤儿脚本（孤儿 = 假门禁）。 */
  ['t9reverse', ['scripts/t9-reverse.mjs']],
];
const report = { startedAt: new Date().toISOString(), node: process.version, platform: process.platform, results: [] };
await mkdir(join(projectRoot, 'artifacts'), { recursive: true });

/* ── 门禁结果绑「树」，不是绑「动作」 ───────────────────────────────────
   为什么：门禁验的是**代码树**。同一棵树跑第二次，什么都没多证明。
   所以报告里必须记下「验的是哪棵树」，
   下次要跑之前先比一次 —— 树没变就别跑（省 22 分钟），树变了才跑。

   ⚠ 用 tree 而不是 commit：提交本身不改变代码内容，
     但 commit 会变（提交号每次都不一样）。验的是内容 ⇒ 绑 tree。
   ⚠ dirty=true 时树哈希描述的是 HEAD，**不含**工作区改动 ⇒
     这种情况下报告一律不算数（后面 --status 会拒绝认它）。 */
function git(args) {
  try {
    return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8', windowsHide: true }).trim();
  } catch {
    return '';
  }
}
function currentTree() {
  return {
    commit: git(['rev-parse', 'HEAD']),
    tree: git(['rev-parse', 'HEAD^{tree}']),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    dirty: (git(['status', '--porcelain', '--untracked-files=all']) || '') !== '',
  };
}
report.code = currentTree();

/* ── 单门禁模式与门禁清单 ──────────────────────────────────────────────
   没有自动闸门了（2026-11-07 删除了 GitHub Actions 配置）⇒
   合并前要**手动**跑，并确认退出码是 0。
   为了能单独跑某一道、或只跑一组，这里提供：
     --list           打印门禁清单（JSON）
     --only=<名字>    只跑这一道门禁
     --group=<组>     跑某一组（fast / browser）
   组是按「要不要开浏览器」分的：fast 那组几分钟就完，browser 那组才是慢的。
   --status          查「这棵树验过没有」—— 验过就不跑，树变了就报要跑哪组

   ⚠ **门禁结果绑「树」，不绑「动作」**：
     同步 GitHub 不会改代码 ⇒ 同一棵树不用重跑。
     先跑门禁 → 树没动 → 再推 ⇒ 一次门禁就够。 */
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

/* ── --status：这棵树验过没有？ ──────────────────────────────────────────
   用法：node scripts/run-regression.mjs --status [--group=fast|browser]

   输出三态：
     GREEN    这棵树已经全量验过且全绿 ⇒ 不用再跑
     STALE    上次验的是别的树（或工作区脏）⇒ 需要跑（会告诉你跑哪组）
     UNKNOWN  从来没跑过 ⇒ 需要跑

   ⚠ 判据是**树哈希相同**，不是「最近跑过」。
     「最近跑过」会骗人：中间改了代码，跑过的结果早就不作数了。 */
if (argv.includes('--status')) {
  const LEDGER = join(projectRoot, 'artifacts', 'gate-ledger.json');
  let ledger = { trees: {} };
  try {
    const prev = JSON.parse(await readFile(LEDGER, 'utf8'));
    if (prev && prev.trees) ledger = prev;
  } catch {
    /* 从来没跑过 */
  }
  const now = currentTree();
  const need = group || 'all';
  const groupOf = (name) => (isBrowserGate([name]) ? 'browser' : 'fast');
  const allGates = commands.map(([name]) => name);
  const howToRun = () => {
    if (need === 'all') {
      console.log('  跑法：node scripts/run-regression.mjs --group=fast   （小程序端，约 1 分半）');
      console.log('       node scripts/run-regression.mjs                （全量，约 22 分钟）');
    } else {
      console.log(`  跑法：node scripts/run-regression.mjs --group=${need}`);
    }
  };
  /* 退出码：0 = 不用跑；1 = 要跑。 */
  const verdict = (state, msg) => {
    console.log(`${state} · ${msg}`);
    if (state !== 'GREEN') howToRun();
    process.exit(state === 'GREEN' ? 0 : 1);
  };
  if (now.dirty) {
    verdict('STALE', '工作区有未提交的改动 ⇒ 上次的结果不算数（树哈希只描述 HEAD，不含工作区改动）');
  }
  const entry = now.tree ? ledger.trees[now.tree] : null;
  if (!entry) {
    verdict('UNKNOWN', `这棵树（${(now.tree || '未知').slice(0, 8)}）从来没验过 ⇒ 要跑`);
  }
  const keys = Object.keys(entry).filter(k => k === 'fast' || k === 'browser' || k === 'all');
  const passed = keys.filter(k => entry[k] && entry[k].passed);
  if (!passed.length) {
    verdict('STALE', `这棵树跑过但没绿（记录：${keys.join(' ') || '无'}）⇒ 要重跑`);
  }
  const covered = new Set();
  for (const k of passed) for (const g of entry[k].gates) covered.add(g);
  const missing = allGates.filter(name => !covered.has(name) && (need === 'all' || groupOf(name) === need));
  if (missing.length) {
    verdict('STALE', `这棵树验过，但${need === 'all' ? '还有' : '这组还'}没跑过：${missing.join(' ')}`);
  }
  verdict('GREEN', `这棵树（${now.tree.slice(0, 8)}）已验过且全绿（${passed.map(k => entry[k].at).join(' / ')}）⇒ 不用再跑`);
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

/* ── 门禁台账：按「树」记住每组验过没有 ─────────────────────────────────
   为什么要有台账：`regression.json` 每次跑都被覆盖 ⇒ 跑完快组再跑全量，
   快组的记录就没了。台账**累积**，同一棵树上跑过的组都留着。

   结构：{ trees: { <树哈希>: { commit, fast: {...}, browser: {...} } } }
   ⇒ 「这棵树验过没有」= 台账里有没有这棵树的条目。

   ⚠ 只在**干净**的树上记台账：dirty 时树哈希描述的是 HEAD、不含工作区改动，
     记下来会变成一个「看起来验过、其实没验过」的假记录。 */
const LEDGER_FILE = join(projectRoot, 'artifacts', 'gate-ledger.json');
if (!report.code.dirty && report.code.tree) {
  let ledger = { trees: {} };
  try {
    const prev = JSON.parse(await readFile(LEDGER_FILE, 'utf8'));
    if (prev && prev.trees && typeof prev.trees === 'object') ledger = prev;
  } catch {
    /* 第一次 */
  }
  const entry = ledger.trees[report.code.tree] || { commit: report.code.commit, branch: report.code.branch };
  const groupKey = only ? 'only:' + only : (group || 'all');
  entry[groupKey] = {
    passed: report.passed,
    at: report.finishedAt,
    gates: report.results.map(r => r.name),
  };
  ledger.trees[report.code.tree] = entry;
  /* 只留最近 20 棵树的记录，别让台账自己长胖。 */
  const trees = Object.keys(ledger.trees);
  if (trees.length > 20) {
    for (const t of trees.slice(0, trees.length - 20)) delete ledger.trees[t];
  }
  await writeFile(LEDGER_FILE, JSON.stringify(ledger, null, 2) + '\n');
}
console.log('REGRESSION ' + (report.passed ? 'PASS' : 'FAIL') + ' · ' + report.results.map(result => result.name + ':' + result.code).join(' '));
if (!report.passed) process.exitCode = 1;
