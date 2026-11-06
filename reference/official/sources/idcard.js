/**
 * idcard.js — 官方「身份证卡片」(p-id) 与出生登记卡三项的等价实现
 * =====================================================
 *
 * 官方人生页顶部有一张**身份证卡片**（`panel idcard p-id`），小程序这边一直没有：
 *
 *   idTop    L`<span>신원 기록 · ${S.born}</span><span>${S.by}</span>`   顶部条
 *   portrait renderPortrait()                                           头像（canvas 优先，SVG 兜底）
 *   idName   nameHTML(S.name)                                            姓名（官方只在 ja 下加注音）
 *   idDl     idRows().map(...)                                           身份明细（15+ 条件性行）
 *   mrz      mrz()                                                       机读区两行
 *   idG      guilloche(320, 220)                                         雕版底纹
 *
 * 出生登记卡（cert）另有三项也缺：
 *   certPace  「活到预期寿命约需 X（1 年 ≈ N 秒）…中途关闭也会保存」
 *   certHome  出身地对比（同国不同家 / 跨国对照表）
 *   certComps 「同一秒出生的 4 个人」
 *
 * ── 做法 ────────────────────────────────────────────────────────────────
 * ① **idRows / mrz 直接用官方代码**：它们是 UI 段的纯逻辑函数（不碰 DOM），
 *    已按名连依赖闭包搬进引擎段（scripts/extract-engine.mjs 的 UI_PULL_SEEDS），
 *    由引擎导出。所以本模块拿到的字段值与官方**逐字相同**。
 * ② **重画的是「渲染」，不是「取值」**：官方 idRows 的 value 是 HTML 片段
 *    （<small> / <span class="qdots"> / <b>），这里只把它拆成 WXML 能画的片段，
 *    文字一个不改。
 * ③ **certHome / certComps / certPace 照抄官方模板**：官方那几处是
 *    `L\`…\`` 模板 + 少量算术，模板逐字照抄（抄错一个字就回落韩文，
 *    有机器校验兜底）。
 * ④ **guilloche 是 SVG** —— 微信不能渲染内联 SVG，于是把官方那条正弦公式
 *    原样搬到 canvas 上画（同一个公式、同一个取整），形态换了、结果一致。
 *
 * 位置：**主包**。引擎在分包，微信禁止主包 require 分包，所以本模块
 * 和 edu.js 一样，在**调用时**从 globalThis.__O8B 懒取引擎。
 */

/** 官方引擎 API（懒取，理由同 edu.js）。 */
function A() {
  const api = globalThis.__O8B;
  if (!api) throw new Error('idcard.js：官方引擎还没加载（globalThis.__O8B 是空的）');
  return api;
}

/* ── 官方 HTML 片段 → WXML 片段 ───────────────────────────────────────── */

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

/** 反转义：官方 esc() 的逆运算 */
function unesc(s) {
  return String(s == null ? '' : s)
    .replace(/&(amp|lt|gt|quot|#39);/g, (m, k) => ENT['&' + k + ';']);
}

/**
 * 官方 idRows() 的 value 里只可能出现这几种标记：
 *   <small>…</small>               小字注解（改宗来源、富裕度）
 *   <span class="qdots">…</span>   出身家庭的 5 颗点（qdots）
 *   <span class="nw">…</span>      不加粗的普通片段（certFields 的「家境」「父母的工作」）
 *   <b>…</b>                      粗体（国家名）
 * 其余是纯文本。这里把它们拆成 WXML 能画的片段，**文字一个不改**。
 */
function lite(v) {
  const src = String(v == null ? '' : v);
  const out = [];
  // ⚠️ class 后面可能还有别的属性（官方的 qdots 就带 aria-label）⇒ 用 [^>]* 放宽
  const re = /<small>([\s\S]*?)<\/small>|<b>([\s\S]*?)<\/b>|<span class="qdots"[^>]*>([\s\S]*?)<\/span>|<span class="nw"[^>]*>([\s\S]*?)<\/span>/g;
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ t: unesc(src.slice(last, m.index)) });
    if (m[1] != null) out.push({ small: unesc(m[1]) });
    else if (m[2] != null) out.push({ b: unesc(m[2]) });
    else if (m[4] != null) out.push({ nw: unesc(m[4]) });
    else {
      const dots = [];
      const dre = /<i class="([^"]*)"><\/i>/g;
      let dm;
      while ((dm = dre.exec(m[3]))) dots.push(dm[1] === 'on' ? 1 : 0);
      out.push({ dots });
    }
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ t: unesc(src.slice(last)) });
  return out;
}

/* ── 身份证卡片 ─────────────────────────────────────────────────────────── */

/**
 * 人生页的身份证卡片。
 *
 * @param {object} S 当前人生（引擎的 S）
 * @returns {{top:string[], name:string, rows:{k:string,v:object[]}[], mrz:string[]}}
 */
function idCard(S) {
  const api = A();

  // 官方 renderId()：$('#idTop').innerHTML = L`<span>신원 기록 · ${S.born}</span><span>${S.by}</span>`
  // ⚠️ 模板必须**含 <span>** 照抄：官方 L() 的查表键是模板静态片段，
  //    写成裸的 `신원 기록 · ${S.born}` 查不到译文、会回落韩文。
  const topHtml = api.L`<span>신원 기록 · ${S.born}</span><span>${S.by}</span>`;
  const top = topHtml
    .split(/<\/span>\s*<span>/)
    .map((s) => unesc(s.replace(/<[^>]*>/g, '')));

  // 官方 renderId()：$('#idName').innerHTML = nameHTML(S.name)
  // nameHTML 只在 ja 语言下加注音，简中就是纯姓名。
  const name = (S.name && S.name.full) || '';

  // 官方 renderId()：$('#idDl').innerHTML = idRows().map(([k,v]) => `<dt>${k}</dt><dd>${v}</dd>`)
  const rows = api.idRows().map(([k, v]) => ({ k: String(k), v: lite(v) }));

  // 官方 renderId()：$('#mrz').innerHTML = mrz()  →  esc(l1) + '<br>' + esc(l2)
  const mrz = api.mrz().split('<br>').map(unesc);

  return { top, name, rows, mrz };
}

/**
 * 官方 guilloche(w, h)：14 条正弦曲线叠出的雕版花纹。
 * 官方输出的是 SVG，小程序画不了内联 SVG —— 这里把**同一个公式**搬到 canvas。
 * 公式与取整（toFixed(1)）逐字照抄，所以画出来与官方同形。
 *
 * @returns {number[][]} 每条曲线一个 [x0,y0,x1,y1,…] 的点数组
 */
function guilloche(w, h) {
  const paths = [];
  for (let i = 0; i < 14; i++) {
    const ph = i * 0.45;
    const amp = h * (0.16 + 0.012 * i);
    const lam = w / (2.2 + i * 0.07);
    const pts = [];
    for (let x = 0; x <= w; x += 6) {
      const y = h / 2 + amp * Math.sin(2 * Math.PI * x / lam + ph) * Math.cos(Math.PI * x / w * 1.3 + i * 0.2);
      pts.push(x, parseFloat(y.toFixed(1)));
    }
    paths.push(pts);
  }
  return paths;
}

/**
 * 把 guilloche() 的曲线画到 canvas 上（官方是 SVG，这里换 canvas）。
 *
 * 官方那张 SVG 是 `viewBox="0 0 w h" preserveAspectRatio="none" width="100%" height="100%"`
 * ⇒ **图案按 w×h 的网格算出来，再拉伸铺满容器**。
 * 所以这里也支持传入目标尺寸（tw/th），把网格坐标映射过去。
 *
 * @param {object} ctx canvas 2d 上下文
 * @param {number} w   官方那份 viewBox 的宽（如出生卡 720 / 身份证 320）
 * @param {number} h   官方那份 viewBox 的高（如出生卡 420 / 身份证 220）
 * @param {string} color 描边色
 * @param {number} [tw] 目标宽（CSS px）；不给就是 1:1
 * @param {number} [th] 目标高（CSS px）；不给就是 1:1
 */
function drawGuilloche(ctx, w, h, color, tw, th) {
  const sx = tw == null || !w ? 1 : tw / w;
  const sy = th == null || !h ? 1 : th / h;
  ctx.save();
  ctx.strokeStyle = color || 'rgba(15,110,104,.09)';
  ctx.lineWidth = 0.7;
  for (const pts of guilloche(w, h)) {
    ctx.beginPath();
    ctx.moveTo(pts[0] * sx, pts[1] * sy);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] * sx, pts[i + 1] * sy);
    ctx.stroke();
  }
  ctx.restore();
}

/* ── 出生登记卡：certPace / certHome / certComps ───────────────────────── */

/**
 * 官方 certPace（ui.zh-hans 的 showCert 里）：
 *   const pm = UI.prefs.pace || 60,
 *         pl = pm === 30 ? L`30분` : pm === 90 ? L`1시간 30분` : L`1시간`;
 *   $('#certPace').textContent = L`기대수명까지 살면 약 ${pl}이 걸려요 (1년 ≈ ${Math.round(S.yearSec)}초). …`
 *
 * ⚠️ 模板逐字照抄：抄错一个字 L() 就回落韩文。
 */
function certPace(S, pace) {
  const api = A();
  const pm = pace || 60;
  const pl = pm === 30 ? api.L`30분` : pm === 90 ? api.L`1시간 30분` : api.L`1시간`;
  return api.L`기대수명까지 살면 약 ${pl}이 걸려요 (1년 ≈ ${Math.round(S.yearSec)}초). 중간에 닫아도 이 브라우저에 저장돼서, 같은 브라우저로 다시 오면 이어서 살 수 있어요.`;
}

/**
 * 官方 certHome：出身地对比。
 *   H0 = S.home && CBY[S.home] ? CBY[S.home] : null
 *   H  = H0 && S.era && S.era !== 'now' ? eraAt(H0, S.by) : H0
 *   G  = !!S.homeG
 * 同国 → 两句文案；跨国 → 一张对照表。
 *
 * ⚠️ 官方的表头是**包含在整张表的大模板里**的（`<table><thead><tr><th>…`），
 *    单独写 `L\`같은 날 태어났다면\`` 查表键不一样 ⇒ 回落韩文。
 *    所以这里**照抄官方那个大模板**（连 `${rows}` 的位置都一样），
 *    再把生成的 HTML 拆成 WXML 的表格结构。
 *
 * @returns {null|{kind:'same'|'table', text?:object[], head?:string[], rows?:string[][], note?:string}}
 */
function certHome(S) {
  const api = A();
  const CBY = api.CBY;
  const H0 = S.home && CBY[S.home] ? CBY[S.home] : null;
  const H = H0 && S.era && S.era !== 'now' ? api.eraAt(H0, S.by) : H0;
  if (!H) return null;

  const c = CBY[S.born];
  const G = !!S.homeG;
  const u5c = 1 - api.cohortL(S.born, S.sex, 5);

  // 官方 showCert 里的 rows（每格的文案都是**独立**的 L() 模板，逐字照抄）
  const rows = [
    [api.L`기대수명`, api.L`${api.leOf(H, S.sex).toFixed(1)}세`, api.L`${api.leOf(c, S.sex).toFixed(1)}세`],
    [api.L`5세 전에 세상을 떠날 확률`, api.pctStr(1 - api.cohortL(H.id, S.sex, 5), 1), api.pctStr(u5c, 1)],
    [api.L`기대 교육연수`, api.L`${H.eys}년`, api.L`${c.eys}년`],
    [api.L`1인당 GDP (PPP)`, api.usdStr(H.ppp), api.usdStr(c.ppp)],
  ];

  if (H.id === c.id) {
    // 官方：capS(L`당신이 태어난 곳으로 짐작한 <b>${esc(H.ko)}</b>에서 태어났습니다.`) + ' ' + L`같은 곳, 다른 집, 다른 삶입니다.`
    // （0.9.8 官方把这句里的「나라」改成了「곳」——词典实测：旧句已回落韩文）
    const html = G
      ? api.capS(api.L`당신이 태어난 곳으로 짐작한 <b>${api.esc(H.ko)}</b>에서 태어났습니다.`)
        + ' ' + api.L`같은 곳, 다른 집, 다른 삶입니다.`
      : api.L`당신이 실제로 태어난 <b>${api.esc(H.ko)}</b>에서 태어났습니다. 같은 곳, 다른 집, 다른 삶입니다.`;
    return { kind: 'same', text: lite(html) };
  }

  // 官方：整张表是一个大模板，表头也在里面 ⇒ 必须照抄
  const rowsHtml = rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
  const tableHtml = G
    ? api.L`<table><thead><tr><th>같은 날 태어났다면</th><th>당신이 태어난 ${api.esc(H.ko)}(추정)</th><th>이 아이의 ${api.esc(c.ko)}</th></tr></thead><tbody>${rowsHtml}</tbody></table>`
    : api.L`<table><thead><tr><th>같은 날 태어났다면</th><th>당신이 태어난 ${api.esc(H.ko)}</th><th>이 아이의 ${api.esc(c.ko)}</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;

  const head = [...tableHtml.matchAll(/<th>([\s\S]*?)<\/th>/g)].map((m) => unesc(m[1]));
  const body = [...tableHtml.matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)]
    .map((m) => [unesc(m[1]), unesc(m[2]), unesc(m[3])]);

  let note = '';
  if (G) {
    // 官方 homeGuessNote()：三个独立 L() 模板拼起来，再 capS + esc
    const guess = api.capS(
      api.L`브라우저 언어 설정만 보고 짐작한 곳이에요.`
      + ' ' + api.L`이 기기에만 저장돼요.`
      + ' ' + api.L`처음 화면의 '당신이 실제로 태어난 곳'에서 바꾸거나 '고르지 않을래요'로 끌 수 있어요.`,
    );
    note = unesc(api.esc(guess));
  }
  return { kind: 'table', head, rows: body, note };
}

/**
 * 官方 certComps：「同一秒出生的 4 个人」。
 *
 * ⚠️ 官方那是一整个**含 HTML 的大模板**：
 *   L`<span class="lbl">…</span><ul>${items}</ul><p>…</p>`
 *    拆成两个小模板查表键就变了 ⇒ 回落韩文。所以这里照抄整个模板。
 *
 * @returns {null|{label:string, items:{name:string,meta:string}[], note:string}}
 */
function certComps(S) {
  const api = A();
  if (!S.comps || !S.comps.length) return null;
  const CBY = api.CBY;

  // 官方逐条 <li>：`<b>姓名</b><span>地点 · 性别 · 家境</span>`
  const itemsHtml = S.comps.map((cp) =>
    `<li><b>${api.esc(cp.name.full)}</b><span>${
      cp.urban && cp.city
        ? api.esc(api.cityIn(CBY[cp.iso].ko, cp.city))
        : api.esc(CBY[cp.iso].ko) + api.L` 농촌`
    } · ${cp.sex === 'F' ? api.L`여` : api.L`남`} · ${api.QSHORT_E[cp.q]}</span></li>`,
  ).join('');

  const html = api.L`<span class="lbl">같은 1초에 지구 어딘가에서 태어난 사람들</span><ul>${itemsHtml}</ul><p>이들의 삶도 같은 통계를 따라 끝까지 흘러갑니다. 당신 곁에서 함께 보여 드릴게요.</p>`;

  const labelM = html.match(/<span class="lbl">([\s\S]*?)<\/span>/);
  const noteM = html.match(/<p>([\s\S]*?)<\/p>/);
  const items = [...html.matchAll(/<li><b>([\s\S]*?)<\/b><span>([\s\S]*?)<\/span><\/li>/g)]
    .map((m) => ({ name: unesc(m[1]), meta: unesc(m[2]) }));

  return {
    label: labelM ? unesc(labelM[1]) : '',
    items,
    note: noteM ? unesc(noteM[1]) : '',
  };
}

/* ── 出生登记卡：certFields / ruralLine ───────────────────────────────── */

/**
 * 官方 showCert() 里的 `certFields` 字段表。
 *
 * 官方那段代码（ui.zh-hans 的 showCert）：
 *   const qd = [1,2,3,4,5].map(k => `<i class="${k <= S.q ? 'on' : ''}"></i>`).join('');
 *   $('#certFields').innerHTML = (era?[[…]]:[]).concat([
 *     [L`성별`, …], [L`출생국`, c.ko], [L`출생지`, …],
 *     …(royal/eth/caste/adopt 的条件行),
 *     [L`가정 형편`, L`<span class="qdots" …>${qd}</span> ${S.q}분위` + ` · <span class="nw">${QCERT[S.q]}</span>` + …],
 *     [L`부모 나이`, …], …(pj?[[L`부모님 일`, pj]]:[]), [L`부모님 집`, pHomeWord()], [L`종교`, relName()],
 *     [L`기대수명`, …], [L`5세 전 사망 확률`, …], [L`1인당 GDP (PPP)`, …],
 *   ]).map(([k, v]) => `<div><span class="lbl">${k}</span><b>${v}</b></div>`).join('');
 *
 * 这里**逐字照抄**：
 *   · 每个 L() 模板原样写（抄错一个字就回落韩文，有机器校验兜底）
 *   · 条件行的顺序、个数与官方一致
 *   · qdots / nw 交给 lite() 拆成 WXML 片段，**文字一个不改**
 *
 * @returns {{k:string, v:object[]}[]} 每一行是「标签 + 值片段」
 */
function certFields(S) {
  const api = A();
  const CBY = api.CBY;

  // 官方 BB()：出生国（时代错位时按当年换算）
  const c = (S.era && S.era !== 'now') ? api.eraAt(CBY[S.born], S.by) : CBY[S.born];
  const u5c = 1 - api.cohortL(S.born, S.sex, 5);

  // 官方 qd：五颗点，点亮前 S.q 颗
  const qdHtml = [1, 2, 3, 4, 5].map((k) => `<i class="${k <= S.q ? 'on' : ''}"></i>`).join('');

  // 官方 pj：「母亲：… · 父亲：…」，每段各自包一层 .nw
  const pj = [
    S.fam.mom.job ? api.L`어머니 ${api.parentJobName(S.fam.mom)}` : '',
    S.fam.dad.job && !S.fam.dad.absent ? api.L`아버지 ${api.parentJobName(S.fam.dad)}` : '',
  ].filter(Boolean)
    .map((x, i, a) => `<span class="nw">${api.esc(x)}${i < a.length - 1 ? ' ·' : ''}</span>`)
    .join(' ');

  const rows = [];

  if (S.era && S.era !== 'now') {
    rows.push([api.L`태어난 세상`, S.era === 'past' ? api.L`지난 세상 · ${S.by}년` : api.L`다가올 세상 · ${S.by}년`]);
  }
  rows.push([api.L`성별`, S.sex === 'F' ? api.L`여성${api.LBL}` : api.L`남성${api.LBL}`]);
  rows.push([api.L`출생 국가·지역`, c.ko]);
  rows.push([api.L`출생지`, S.urban ? api.L`${S.city} (도시)` : api.ruralLbl()]);

  if (S.flags && S.flags.royal) rows.push([api.L`집안`, api.esc(api.royalHouse())]);
  if (typeof api.ethG === 'function' && api.ethG()) rows.push([api.L`가족의 뿌리`, api.esc(api.ethLabel())]);
  if (typeof api.casteG === 'function' && api.casteG()) rows.push([api.casteRowName(), api.esc(api.casteLabel())]);
  if (S.adopt) rows.push([api.L`입양`, api.esc(api.adoptPlan())]);

  rows.push([
    api.L`가정 형편`,
    api.L`<span class="qdots" aria-label="소득 ${S.q}분위">${qdHtml}</span> ${S.q}분위`
      + ` · <span class="nw">${api.QCERT[S.q]}</span>`
      + (S.flags && S.flags.rich ? ` · ${api.esc(api.richWord())}` : ''),
  ]);

  /* 0.9.8 官方把「부모 나이」行也拆成原子模板并加同性分支（逐字照抄官方原文） */
  rows.push([api.L`부모 나이`, (S.fam.mom.ss ? api.L`아버지 ${S.fam.mom.age}세` : api.L`어머니 ${S.fam.mom.age}세`) + `${S.fam.dad.absent ? '' : S.fam.dad.ss ? api.L` · 어머니 ${S.fam.dad.age}세` : api.L` · 아버지 ${S.fam.dad.age}세`}`]);
  if (pj) rows.push([api.L`부모님 일`, pj]);
  rows.push([api.L`부모님 집`, api.pHomeWord()]);
  rows.push([api.L`종교`, api.relName()]);
  rows.push([api.L`기대수명`, api.L`${api.leOf(c, S.sex).toFixed(1)}세`]);
  rows.push([api.L`5세 전 사망 확률`, api.pctStr(u5c, 1)]);
  rows.push([S.era === 'past' ? api.L`1인당 GDP (오늘 물가)` : api.L`1인당 GDP (PPP)`, api.usdStr(c.ppp)]);

  return rows.map((r) => ({ k: String(r[0]), v: lite(r[1]) }));
}

/**
 * 官方 ruralLine()（UI 段）：certOdds 末尾那句「世界上大约多少比例的婴儿出生在农村」。
 *
 * 官方读的是 `UI.prefs.mode`（浏览器里的 UI 状态），小程序没有那个对象
 * ⇒ **只把 mode 改成参数**，其余公式逐字照抄。
 *
 * @param {object} S 当前人生
 * @param {string} mode 'birth'（按出生数）| 'pop'（按现有人口）
 */
function ruralLine(S, mode) {
  const api = A();
  const pop = mode === 'pop';
  let t = 0;
  let r = 0;
  for (const x0 of api.COUNTRIES) {
    const x = (S && S.era && S.era !== 'now') ? api.eraAt(x0, S.by) : x0;
    const w = pop ? x.pop : x.b;
    t += w;
    r += (w * (100 - x.urb)) / 100;
  }
  const sh = r / t;
  const two = Math.round(1 / sh) === 2;
  if (S && S.era === 'past') {
    return pop
      ? api.L`${S.by}년에는 세계 사람의 약 ${api.pctStr(sh)}가 농촌에 살았습니다.`
      : api.L`${S.by}년에는 세계 아기의 약 ${api.pctStr(sh)}가 농촌에서 태어났습니다.`;
  }
  if (pop) return api.L`세계 사람의 약 ${api.pctStr(sh)}는 농촌에 삽니다.`;
  if (!two) {
    return S.urban
      ? api.L`세계 아기의 약 ${api.pctStr(sh)}는 농촌에서 태어납니다.`
      : api.L`세계 아기의 약 ${api.pctStr(sh)}가 당신처럼 농촌에서 태어납니다.`;
  }
  return S.urban
    ? api.L`세계 아기 둘 중 한 명은 농촌에서 태어납니다.`
    : api.L`그리고 세계 아기 둘 중 한 명은 당신처럼 농촌에서 태어납니다.`;
}

module.exports = {
  idCard, guilloche, drawGuilloche,
  certPace, certHome, certComps, certFields, ruralLine,
  lite, unesc,
};
