'use strict';

const http = require('http');
const { createTodoStore } = require('./todo-store');
const { createFaultRegistry } = require('./faults');
const { parseTodoRoute, applyTodoRoute } = require('./todo-api');
const { isControlPath, handleControl } = require('./control-api');
const { createStaticFiles } = require('./static-files');
const { readJson, send, sendJson } = require('./http-io');

async function handleTodo(req, res, route, path, { store, faults }) {
  const fault = faults.claim(req.method, path);
  if (fault && fault.kind === 'transport') {
    req.socket.destroy();
    return;
  }
  const body = await readJson(req);
  if (fault) {
    send(res, fault.code, 'application/json', String(fault.body ?? ''));
    return;
  }
  const result = applyTodoRoute(store, route, body);
  sendJson(res, result.status, result.json);
}

function route(req, res, deps) {
  const path = new URL(req.url, 'http://stub').pathname;
  if (isControlPath(path)) {
    return handleControl(req, res, path, deps);
  }
  const todoRoute = parseTodoRoute(req.method, path);
  if (todoRoute) {
    return handleTodo(req, res, todoRoute, path, deps);
  }
  return deps.serveStatic(res, path);
}

function createStubServer(appDir) {
  const deps = {
    store: createTodoStore(),
    faults: createFaultRegistry(),
    serveStatic: createStaticFiles(appDir),
  };
  deps.store.reset('EMPTY');

  const server = http.createServer((req, res) => {
    req.on('error', () => {});
    res.on('error', () => {});
    Promise.resolve(route(req, res, deps)).catch((error) => sendJson(res, 500, { error: String(error) }));
  });
  server.on('clientError', (error, socket) => socket.destroy());
  return server;
}

module.exports = { createStubServer };
