'use strict';

const fs = require('fs');
const path = require('path');
const { send } = require('./http-io');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function contentType(filePath) {
  return CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream';
}

function readable(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function resolveWithin(root, urlPath) {
  const resolved = path.resolve(root, `.${urlPath}`);
  return resolved.startsWith(root + path.sep) ? resolved : undefined;
}

/** The app must be served at the site root: it fetches the relative URL `api/todos/`. */
function createStaticFiles(appDir) {
  const root = path.resolve(appDir);
  const indexHtml = path.join(root, 'index.html');

  return function serveStatic(res, urlPath) {
    const candidate = resolveWithin(root, urlPath);
    const filePath = candidate && readable(candidate) ? candidate : indexHtml;
    send(res, 200, contentType(filePath), fs.readFileSync(filePath));
  };
}

module.exports = { createStaticFiles };
