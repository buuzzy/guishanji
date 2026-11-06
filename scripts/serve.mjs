import { createServer as httpServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
function within(parent, path) { const rel = relative(parent, path); return rel === '' || (rel !== '..' && !rel.startsWith('..' + sep) && !rel.startsWith(sep) && !/^[a-z]:/iu.test(rel)); }

// 默认服务当前产品「归山记」。entry / allow 让 legacy/old-web 的历史快照能用同一份
// 服务实现把旧页面单独跑起来；产品侧的默认值不随它们改变。
export async function startServer({ root = projectRoot, host = '127.0.0.1', port = 8866, entry = '/apps/preview/index.html', allow = ['/apps/preview/', '/preview/', '/packages/', '/content/'] } = {}) {
  const actualRoot = await realpath(root);
  if (!within(await realpath(projectRoot), actualRoot)) throw new Error('服务根目录必须位于本项目内。');
  const server = httpServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part === '..' || part.startsWith('.'))) throw new Error('Invalid path');
      // 根入口是当前产品「归山记」；/preview 是同一页面的旧路径，保留兼容。
      if (pathname === '/' || pathname === '/index.html') pathname = entry;
      if (pathname === '/preview' || pathname === '/preview/') pathname = '/apps/preview/index.html';
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
  console.log('归山记 · 本地服务：' + service.url);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await service.close(); process.exit(0); });
}
