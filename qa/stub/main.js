'use strict';

const fs = require('fs');
const path = require('path');
const { createStubServer } = require('./server');

const PORT = Number(process.env.QA_STUB_PORT || 3100);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_DIRS = ['build', 'dist'];

function appDir() {
  const configured = process.env.QA_APP_DIR;
  const candidates = configured ? [configured] : BUILD_DIRS;
  const found = candidates
    .map((dir) => path.resolve(REPO_ROOT, dir))
    .find((dir) => fs.existsSync(path.join(dir, 'index.html')));
  if (!found) {
    throw new Error(`No built app found in ${candidates.join(' or ')}. Run the build first.`);
  }
  return found;
}

createStubServer(appDir()).listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`qa stub listening on http://127.0.0.1:${PORT}\n`);
});
