const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { copyWeb } = require('./copy-web.js');

function makeFakeSource() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-web-src-'));
  fs.writeFileSync(path.join(tmp, 'index.html'), '<html></html>');
  fs.mkdirSync(path.join(tmp, 'assets', 'js'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'assets', 'js', 'app.js'), 'console.log(1)');
  fs.mkdirSync(path.join(tmp, 'character'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'character', 'index.html'), '<html></html>');
  fs.writeFileSync(path.join(tmp, 'proxy-worker.js'), '// worker');
  fs.mkdirSync(path.join(tmp, 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'node_modules', 'junk.js'), 'junk');
  fs.writeFileSync(path.join(tmp, 'LICENSE'), 'CC BY-NC');
  fs.writeFileSync(path.join(tmp, 'README.md'), '# readme');
  return tmp;
}

it('copyWeb copies index.html, assets, character to dst', () => {
  const src = makeFakeSource();
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-web-dst-'));
  copyWeb({ src, dst });
  assert.ok(fs.existsSync(path.join(dst, 'index.html')), 'index.html should exist');
  assert.ok(fs.existsSync(path.join(dst, 'assets', 'js', 'app.js')), 'assets/js/app.js should exist');
  assert.ok(fs.existsSync(path.join(dst, 'character', 'index.html')), 'character/index.html should exist');
});

it('copyWeb skips proxy-worker.js, node_modules, LICENSE, README.md', () => {
  const src = makeFakeSource();
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-web-dst-'));
  copyWeb({ src, dst });
  assert.ok(!fs.existsSync(path.join(dst, 'proxy-worker.js')), 'proxy-worker.js should NOT be copied');
  assert.ok(!fs.existsSync(path.join(dst, 'node_modules')), 'node_modules should NOT be copied');
  assert.ok(!fs.existsSync(path.join(dst, 'LICENSE')), 'LICENSE should NOT be copied');
  assert.ok(!fs.existsSync(path.join(dst, 'README.md')), 'README.md should NOT be copied');
});

it('copyWeb creates fresh dst (removes existing contents)', () => {
  const src = makeFakeSource();
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-web-dst-'));
  fs.writeFileSync(path.join(dst, 'stale.txt'), 'stale');
  copyWeb({ src, dst });
  assert.ok(!fs.existsSync(path.join(dst, 'stale.txt')), 'stale file should be cleaned');
});
