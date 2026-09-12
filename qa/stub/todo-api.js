'use strict';

const COLLECTION_PATH = '/api/todos/';
const MEMBER_PATH = /^\/api\/todos\/(\d+)$/;

const COLLECTION_ACTIONS = { GET: 'list', POST: 'add' };
const MEMBER_ACTIONS = { PATCH: 'patch', DELETE: 'remove' };

function parseTodoRoute(method, path) {
  if (path === COLLECTION_PATH) {
    const action = COLLECTION_ACTIONS[method];
    return action && { action };
  }
  const member = MEMBER_PATH.exec(path);
  const action = member && MEMBER_ACTIONS[method];
  return action ? { action, id: Number(member[1]) } : undefined;
}

function changesFrom(body) {
  const changes = {};
  if ('text' in body) {
    changes.text = body.text;
  }
  if ('completed' in body) {
    changes.completed = body.completed;
  }
  return changes;
}

const NOT_FOUND = { status: 404, json: { error: 'not found' } };

function found(todo) {
  return todo ? { status: 200, json: todo } : NOT_FOUND;
}

const ACTIONS = {
  list: (store) => ({ status: 200, json: store.list() }),
  add: (store, route, body) => ({ status: 200, json: store.add(body.text) }),
  patch: (store, route, body) => found(store.patch(route.id, changesFrom(body))),
  remove: (store, route) => (store.remove(route.id) ? { status: 200, json: {} } : NOT_FOUND),
};

function applyTodoRoute(store, route, body) {
  return ACTIONS[route.action](store, route, body);
}

module.exports = { parseTodoRoute, applyTodoRoute };
