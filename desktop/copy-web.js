const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SRC = path.join(__dirname, '..');
const DEFAULT_DST = path.join(__dirname, 'dist-stage');

// 顶层需要拷贝的条目
const TOP_LEVEL_COPY = ['index.html', 'assets', 'character'];

// 任何层级都要跳过的目录/文件名
const SKIP_NAMES = new Set([
  'proxy-worker.js',
  'cards',
  'node_modules',
  '.git',
  '.wrangler',
  '.superpowers',
  'desktop',
  'docs',
  'tests',
  'LICENSE',
  'README.md',
  'AGENTS.md',
  'selfUse.md',
  '.gitignore',
]);

function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (SKIP_NAMES.has(entry)) continue;
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

function copyWeb({ src = DEFAULT_SRC, dst = DEFAULT_DST } = {}) {
  if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });
  for (const item of TOP_LEVEL_COPY) {
    const srcPath = path.join(src, item);
    if (!fs.existsSync(srcPath)) continue;
    copyRecursive(srcPath, path.join(dst, item));
  }
}

if (require.main === module) {
  copyWeb();
  console.log('[copy-web] staged to', DEFAULT_DST);
}

module.exports = { copyWeb, TOP_LEVEL_COPY, SKIP_NAMES: [...SKIP_NAMES] };
