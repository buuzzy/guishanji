import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function findChrome() {
  /* 候选顺序 = 「最像用户会装的那个」优先。
     ⚠ 本机（macOS）只装了 Edge、没装 Chrome；Windows 那台同理 —— 所以
       **必须**把 Edge 也列进去，否则两台机器都得手动设 CHROME_BIN 才能跑门禁。
       Edge 与 Chrome 同为 Chromium 内核，行为一致。 */
  const candidates = [
    process.env.CHROME_BIN,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ].filter(Boolean);
  for (const path of candidates) { try { await access(path); return path; } catch { /* next */ } }
  throw new Error('没有找到 Chrome/Edge。可通过 CHROME_BIN 指定浏览器路径；浏览器检查没有被跳过。');
}

export async function launchBrowser() {
  /* 冷启动时 Chrome 可能十几秒都起不来（CI 上尤其明显：首次建 profile + 杀软扫描）。
     实测：Windows runner 上第一道浏览器门禁会在 10 秒等待里超时退出，
     后面同一台机器再起就都好了 ⇒ 是「第一次慢」，不是「起不来」。
     ⇒ 给足等待（30 秒），并且真的失败时**再试一次**（换一个新 profile）。
     反正这道门禁跑完就结束，多等几秒比误报红强。 */
  const attempts = 2;
  const portWaitMs = 30000;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await launchOnce(portWaitMs);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(1000);
    }
  }
  throw lastError;
}

async function launchOnce(portWaitMs) {
  /* ⚠ 临时档案**必须放在系统临时目录**，不能放在仓库里。
   *
   * 踩过的坑（2026-11-06）：原来写在 `<repo>/.local/browser-XXXX/`。
   * 每次门禁跑一次浏览器就留一个 profile（Chromium 会往里写上百个文件），
   * 跑几十次就攒出**五万多个文件、32 GB**。
   * ⇒ 微信开发者工具打开这个项目时会遍历整个仓库目录（它要算文件指纹、
   *   建文件监听），被这堆文件压垮 ⇒ 编译子进程 `spawn EBADF` 崩掉，
   *   表现为「编译进程崩溃」或「模拟器长时间没有响应」——
   *   **看起来像 IDE 的毛病，其实是仓库自己太胖。**
   * ⇒ 现在：profile 放 `os.tmpdir()`，关掉浏览器后**连目录一起删**。
   *
   * ⚠ 跨平台注意：
   *   · `os.tmpdir()` 在 Windows 上是 `%LOCALAPPDATA%\Temp` ⇒ **不在仓库里**，
   *     所以 IDE 不会扫到它；
   *   · Windows 上 Chrome 退出后可能还占着几个文件 ⇒ 删不掉要**忽略错误**
   *     （`force: true`），不能让「删临时目录失败」把整道门禁搞红。
   */
  const local = join(tmpdir(), 'guishanji-browser');
  await mkdir(local, { recursive: true });
  const profile = await mkdtemp(join(local, 'browser-'));
  const child = spawn(await findChrome(), ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-features=MediaRouter', '--password-store=basic', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let browserLog = ''; child.stderr.on('data', data => { browserLog += data.toString(); });
  let processError; child.once('error', error => { processError = error; });
  let portFile;
  for (let waited = 0; waited < portWaitMs; waited += 100) {
    if (processError) throw processError;
    try { portFile = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split(/\r?\n/u); break; } catch { await delay(100); }
  }
  if (!portFile) { child.kill(); throw new Error('独立 Chrome 调试入口未启动。\n' + browserLog.slice(-2000)); }
  const socket = new WebSocket('ws://127.0.0.1:' + portFile[0] + portFile[1]);
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('CDP 连接超时')), 10000); socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 1; const pending = new Map(), listeners = new Map();
  socket.addEventListener('message', event => {
    const payload = JSON.parse(event.data);
    if (payload.id) {
      const item = pending.get(payload.id); if (!item) return; clearTimeout(item.timer); pending.delete(payload.id);
      payload.error ? item.reject(new Error(item.method + ': ' + payload.error.message)) : item.resolve(payload.result);
    } else for (const listener of listeners.get(payload.method) || []) listener(payload.params, payload.sessionId);
  });
  const send = (method, params = {}, sessionId = null) => new Promise((resolve, reject) => {
    const id = sequence++; const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP 超时：' + method)); }, 15000);
    pending.set(id, { resolve, reject, timer, method }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const on = (method, listener) => { if (!listeners.has(method)) listeners.set(method, []); listeners.get(method).push(listener); };
  async function page(url = 'about:blank') {
    const { targetId } = await send('Target.createTarget', { url }); const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const command = (method, params = {}) => send(method, params, sessionId);
    await Promise.all([command('Page.enable'), command('Runtime.enable'), command('Network.enable')]);
    const errors = [], requests = [], responses = [];
    on('Runtime.exceptionThrown', (params, session) => { if (session === sessionId) errors.push(params.exceptionDetails.exception?.description || params.exceptionDetails.text); });
    on('Runtime.consoleAPICalled', (params, session) => { if (session === sessionId && params.type === 'error') errors.push(params.args.map(arg => arg.value || arg.description).join(' ')); });
    on('Network.requestWillBeSent', (params, session) => { if (session === sessionId) requests.push(params.request.url); });
    on('Network.responseReceived', (params, session) => { if (session === sessionId) responses.push({ url: params.response.url, status: params.response.status }); });
    const evaluate = async expression => {
      const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const waitFor = async (expression, timeout = 12000) => { const started = Date.now(); while (Date.now() - started < timeout) { if (await evaluate(expression)) return; await delay(70); } throw new Error('浏览器等待超时：' + expression.slice(0, 200)); };
    const navigate = async destination => { await command('Page.navigate', { url: destination }); await waitFor('document.readyState === "complete"'); };
    const click = async (selector, touch = false) => {
      await command('Page.bringToFront');
      // Pages, modal transitions and Canvas resizing can change the layout.
      // Resolve a visible, enabled control and measure after the next paint.
      const locate = '(() => { const scope = document.querySelector("dialog[open]") || document; const candidates = [...scope.querySelectorAll(' + JSON.stringify(selector) + ')].filter(el=>el.getClientRects().length); if (!candidates.length) throw new Error("未找到可见操作: " + ' + JSON.stringify(selector) + '); const el = candidates.find(el=>!el.disabled); if (!el) throw new Error("操作不可用: " + ' + JSON.stringify(selector) + '); el.scrollIntoView({block:"center",behavior:"instant"}); const r = el.getBoundingClientRect(); const x=r.x+r.width/2,y=r.y+r.height/2; return {x,y,hit:el.contains(document.elementFromPoint(x,y))}; })()';
      await evaluate(locate);
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      const point = await evaluate(locate);
      if (!point.hit) throw new Error('操作被遮挡：' + selector);
      delete point.hit;
      if (touch) { await command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] }); await command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      else { await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point }); await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point }); await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point }); }
    };
    const screenshot = async path => { const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(path, Buffer.from(data, 'base64')); };
    return { targetId, sessionId, send: command, eval: evaluate, waitFor, navigate, click, screenshot, errors, requests, responses, close: () => send('Target.closeTarget', { targetId }) };
  }
  return { profile, send, on, page, version: await send('Browser.getVersion'), close: async () => { try { await send('Browser.close'); } catch { /* owned process fallback */ } socket.close(); if (child.exitCode === null) { await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(3000)]); if (child.exitCode === null) child.kill(); } try { await writeFile(join(profile, 'browser.log'), browserLog); } catch { /* 目录没了也无所谓 */ } /* ⚠ 连 profile 一起删，别再攒垃圾。 ⚠ 删不掉（Windows 上文件还被占用）也**不能把门禁搞红** —— 那是清理问题，不是产品问题。 */ try { await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* 留给系统临时目录清理 */ } } };
}
