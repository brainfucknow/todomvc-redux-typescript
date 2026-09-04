'use strict';

const FIXTURES = {
  EMPTY: [],
  ONE_ACTIVE: [{ id: 1, text: 'Buy milk', completed: false }],
  TWO_COMPLETED: [
    { id: 1, text: 'Buy milk', completed: true },
    { id: 2, text: 'Write tests', completed: true },
  ],
  THREE_MIXED: [
    { id: 1, text: 'Buy milk', completed: false },
    { id: 2, text: 'Write tests', completed: true },
    { id: 3, text: 'Ship it', completed: false },
  ],
};

function fixture(name) {
  const todos = FIXTURES[name];
  if (!todos) {
    throw new Error(`Unknown fixture: ${name}. Known: ${Object.keys(FIXTURES).join(', ')}`);
  }
  return todos.map((todo) => ({ ...todo }));
}

module.exports = { fixture };
