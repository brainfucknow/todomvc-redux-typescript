'use strict';

const { fixture } = require('./fixtures');

function nextId(todos) {
  return todos.reduce((highest, todo) => Math.max(highest, todo.id), 0) + 1;
}

function createTodoStore() {
  let todos = [];

  return {
    reset(fixtureName) {
      todos = fixture(fixtureName);
    },

    list() {
      return todos.map((todo) => ({ ...todo }));
    },

    add(text) {
      const todo = { id: nextId(todos), text, completed: false };
      todos.push(todo);
      return { ...todo };
    },

    patch(id, changes) {
      const todo = todos.find((candidate) => candidate.id === id);
      if (!todo) {
        return undefined;
      }
      Object.assign(todo, changes);
      return { ...todo };
    },

    remove(id) {
      const remaining = todos.filter((todo) => todo.id !== id);
      const removed = remaining.length !== todos.length;
      todos = remaining;
      return removed;
    },
  };
}

module.exports = { createTodoStore };
