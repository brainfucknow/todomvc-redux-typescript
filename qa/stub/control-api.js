'use strict';

const { readJson, sendJson } = require('./http-io');

const CONTROL_PREFIX = '/__qa/';

const OK = { ok: true };

const HANDLERS = {
  'POST /__qa/reset': async (req, { store, faults }) => {
    const { fixture } = await readJson(req);
    store.reset(fixture);
    faults.clear();
    return OK;
  },
  'POST /__qa/faults': async (req, { faults }) => {
    faults.arm(await readJson(req));
    return OK;
  },
  'DELETE /__qa/faults': async (req, { faults }) => {
    faults.clear();
    return OK;
  },
  'GET /__qa/faults': async (req, { faults }) => ({ faults: faults.report() }),
};

function isControlPath(path) {
  return path.startsWith(CONTROL_PREFIX);
}

async function handleControl(req, res, path, deps) {
  const handler = HANDLERS[`${req.method} ${path}`];
  if (!handler) {
    sendJson(res, 404, { error: `No control route for ${req.method} ${path}` });
    return;
  }
  try {
    sendJson(res, 200, await handler(req, deps));
  } catch (error) {
    sendJson(res, 400, { error: String(error.message || error) });
  }
}

module.exports = { isControlPath, handleControl };
