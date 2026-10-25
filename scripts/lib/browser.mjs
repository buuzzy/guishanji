import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { projectRoot } from '../serve.mjs';

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function findChrome() {
  const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  for (const path of candidates) { try { await access(path); return path; } catch { /* next */ } }
  throw new Error('没有找到 Chrome。可通过 CHROME_BIN 指定浏览器路径；浏览器检查没有被跳过。');
}

export async function launchBrowser() {
  const local = join(projectRoot, '.local'); await mkdir(local, { recursive: true });
  const profile = await mkdtemp(join(local, 'browser-'));
  const child = spawn(await findChrome(), ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-features=MediaRouter', '--password-store=basic', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let browserLog = ''; child.stderr.on('data', data => { browserLog += data.toString(); });
  let processError; child.once('error', error => { processError = error; });
  let portFile;
  for (let i = 0; i < 100; i++) {
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
      const point = await evaluate('(() => { const dialog = document.querySelector("dialog[open]"); const el = dialog?.querySelector(' + JSON.stringify(selector) + ') || document.querySelector(' + JSON.stringify(selector) + '); if (!el) throw new Error("未找到操作: " + ' + JSON.stringify(selector) + '); if (el.disabled) throw new Error("操作不可用"); el.scrollIntoView({block:"center",behavior:"instant"}); const r = el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()');
      if (touch) { await command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] }); await command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      else { await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point }); await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point }); }
    };
    const screenshot = async path => { const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(path, Buffer.from(data, 'base64')); };
    return { targetId, sessionId, send: command, eval: evaluate, waitFor, navigate, click, screenshot, errors, requests, responses, close: () => send('Target.closeTarget', { targetId }) };
  }
  return { profile, send, on, page, version: await send('Browser.getVersion'), close: async () => { try { await send('Browser.close'); } catch { /* owned process fallback */ } socket.close(); if (child.exitCode === null) { await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(3000)]); if (child.exitCode === null) child.kill(); } await writeFile(join(profile, 'browser.log'), browserLog); } };
}
