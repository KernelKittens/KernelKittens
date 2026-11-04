/** Local-only accessibility audit server. Never part of the deployed site/. */
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = await realpath(resolve(projectRoot, 'site'));
const qaFiles = new Map([
  ['/__qa/axe.min.js', resolve(projectRoot, '.qa/node_modules/axe-core/axe.min.js')],
  ['/__qa/audit-page.js', resolve(projectRoot, 'scripts/audit-page.js')],
]);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.vtt': 'text/vtt; charset=utf-8',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};
const injections = '\n<script defer src="/__qa/axe.min.js"></script>\n<script defer src="/__qa/audit-page.js"></script>\n';
const isInside = (path) => path === siteRoot || path.startsWith(siteRoot + sep);

async function resolveSiteFile(pathname) {
  let file = resolve(siteRoot, '.' + pathname);
  if (!isInside(file)) throw Object.assign(new Error('Outside site root'), { status: 403 });
  const info = await stat(file);
  if (info.isDirectory()) file = resolve(file, 'index.html');
  file = await realpath(file);
  if (!isInside(file)) throw Object.assign(new Error('Outside site root'), { status: 403 });
  return file;
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Method not allowed');
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1:4174').pathname);
      if (pathname.includes('\0') || pathname.includes('\\')) throw new Error('Invalid path');
    } catch {
      response.writeHead(400);
      response.end('Invalid path');
      return;
    }
    const file = qaFiles.get(pathname) ?? await resolveSiteFile(pathname);
    const extension = extname(file).toLowerCase();
    let body = await readFile(file);
    if (extension === '.html') {
      const html = body.toString('utf8');
      body = Buffer.from(html.includes('</body>') ? html.replace('</body>', injections + '</body>') : html + injections);
    }
    response.writeHead(200, { 'Content-Type': types[extension] ?? 'application/octet-stream', 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const status = error.status ?? (['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500);
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(status === 404 ? 'Not found' : status === 403 ? 'Forbidden' : 'Audit server error');
    if (status === 500) console.error(error.message);
  }
});

server.listen(4174, '127.0.0.1', () => {
  console.log('Local axe audit: http://127.0.0.1:4174');
  console.log('Read #qa-audit after each route loads. This server injects QA scripts only; production site/ is unchanged.');
});
