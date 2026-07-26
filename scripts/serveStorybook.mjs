import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const outputDirectory = resolve('.storybook-static-test');
const port = Number.parseInt(process.env.STORYBOOK_TEST_PORT ?? '6008', 10);

const build = spawnSync(
  'npm',
  ['run', 'storybook:build', '--', '--output-dir', outputDirectory],
  { stdio: 'inherit' },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl ?? '/', 'http://localhost').pathname);
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = resolve(outputDirectory, `.${requestedPath}`);
  const outputPrefix = `${outputDirectory}${sep}`;
  if (filePath !== outputDirectory && !filePath.startsWith(outputPrefix)) return undefined;
  if (!existsSync(filePath)) return undefined;
  if (statSync(filePath).isDirectory()) {
    const indexPath = resolve(filePath, 'index.html');
    return existsSync(indexPath) ? indexPath : undefined;
  }
  return filePath;
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url);
  if (!filePath) {
    response.writeHead(404).end('Not found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Storybook test server listening on http://127.0.0.1:${port}\n`);
});

function shutDown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);
