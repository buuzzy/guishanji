import { createServer as httpServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
function within(parent, path) { const rel = relative(parent, path); return rel === '' || (rel !== '..' && !rel.startsWith('..' + sep) && !rel.startsWith(sep) && !/^[a-z]:/iu.test(rel)); }

// 默认服务**开发者面板**（`apps/viz/`）——
// 2026-11-08 清理网页端之后，本仓库**唯一能开的网页**就是这一个面板
// （产品端是微信小程序，不在浏览器里跑）。
// ⚠ `/apps/viz/` 是**开发者面板**（给我们自己看的，不给玩家看）；
//   `/packages/`、`/content/` 是面板要 import 的规则层与内容层；
//   `/scripts/lib/` 只为面板里那份「选哪个选项」的策略而放行（纯函数，无 Node 内置模块）。
//   三者都**不进小程序包**（`build-xianxia-mp.mjs` 的 `ALLOWED` 白名单里没有它们）。
export async function startServer({ root = projectRoot, host = '127.0.0.1', port = 8866, entry = '/apps/viz/index.html', allow = ['/apps/viz/', '/scripts/lib/', '/packages/', '/content/'] } = {}) {
  const actualRoot = await realpath(root);
  if (!within(await realpath(projectRoot), actualRoot)) throw new Error('服务根目录必须位于本项目内。');
  const server = httpServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part === '..' || part.startsWith('.'))) throw new Error('Invalid path');
      // 根入口就是开发者面板。
      if (pathname === '/' || pathname === '/index.html') pathname = entry;
      // 开发者面板的目录形式（/apps/viz/）→ 具体文件。
      // ⚠ 不然它会以「没有扩展名」被判成私有路径（types 表按扩展名放行）。
      if (pathname === '/apps/viz' || pathname === '/apps/viz/') pathname = '/apps/viz/index.html';
      if (!allow.some(prefix => pathname.startsWith(prefix)) || !types[extname(pathname)]) throw new Error('Private path');
      const path = resolve(actualRoot, '.' + pathname);
      if (!within(actualRoot, path) || !within(actualRoot, await realpath(path)) || !(await stat(path)).isFile()) throw new Error('Invalid file');
      const data = await readFile(path);
      response.writeHead(200, { 'Content-Type': types[extname(path)], 'Content-Length': data.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); response.end('没有找到这处山河。'); }
  });
  await new Promise((resolvePromise, reject) => { server.once('error', reject); server.listen(port, host, resolvePromise); });
  const actualPort = server.address().port;
  return { server, url: 'http://' + host + ':' + actualPort + '/', close: () => new Promise(resolvePromise => server.close(resolvePromise)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const value = (name, fallback) => args.find(arg => arg.startsWith('--' + name + '='))?.slice(name.length + 3) || fallback;
  const port = Number(value('port', '8866')); if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('端口无效。');
  const service = await startServer({ root: resolve(projectRoot, value('dir', '.')), host: value('host', '127.0.0.1'), port });
  console.log('归山记 · 开发者面板：' + service.url + 'apps/viz/');
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await service.close(); process.exit(0); });
}
