'use strict';

const KINDS = ['transport', 'status'];

function withLeadingSlash(path) {
  return path.startsWith('/') ? path : `/${path}`;
}

function validate(fault) {
  if (!KINDS.includes(fault.kind)) {
    throw new Error(`Unknown fault kind: ${fault.kind}. Known: ${KINDS.join(', ')}`);
  }
  if (!fault.method || !fault.path) {
    throw new Error('A fault needs a method and a path');
  }
}

/**
 * Faults are armed per method-and-path and stay armed until cleared, because
 * the initial GET is issued twice under StrictMode.
 */
function createFaultRegistry() {
  let armed = [];

  return {
    clear() {
      armed = [];
    },

    arm(fault) {
      validate(fault);
      armed.push({
        kind: fault.kind,
        method: fault.method.toUpperCase(),
        path: withLeadingSlash(fault.path),
        code: fault.code,
        body: fault.body,
        matched: 0,
      });
    },

    claim(method, path) {
      const fault = armed.find((candidate) => candidate.method === method && candidate.path === path);
      if (fault) {
        fault.matched += 1;
      }
      return fault;
    },

    report() {
      return armed.map(({ kind, method, path, matched }) => ({ kind, method, path, matched }));
    },
  };
}

module.exports = { createFaultRegistry };
