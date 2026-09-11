import { expect } from 'vitest'
import {
  commitFromEditField,
  commitFromNewTodoField,
  type EditCommit,
  type NewTodoCommit,
  type TodoChange,
} from '../../src/todo-input/effects'
import { text, wholeNumber } from './cells'
import type { StepDefinition, StepSuite } from '../runtime'

// Plays the part `Header` and `TodoItem` play, against `src/todo-input/effects.ts`.
// Its sentences name the field - "committed from the new-todo field" - where
// `./todo-input-commits` does not, so that no pattern matches a step of both.

export interface TodoInputEffectsWorld {
  added?: NewTodoCommit
  edited?: EditCommit
}

type Definition = StepDefinition<TodoInputEffectsWorld>

const createWorld = (): TodoInputEffectsWorld => ({})

const addedBy = (world: TodoInputEffectsWorld): NewTodoCommit => {
  if (!world.added) {
    throw new Error('No text was committed from the new-todo field')
  }
  return world.added
}

const editBy = (world: TodoInputEffectsWorld): EditCommit => {
  if (!world.edited) {
    throw new Error('No text was committed from the edit field')
  }
  return world.edited
}

const changeBy = (world: TodoInputEffectsWorld): TodoChange =>
  editBy(world).change

const definitions: Definition[] = [
  {
    pattern: /^the text (.+) is committed from the new-todo field$/,
    handle: ({ world, expand }, committed) => {
      world.added = commitFromNewTodoField(text(expand(committed)))
    },
  },
  {
    pattern: /^the text (.+) is committed from the edit field for todo (.+)$/,
    handle: ({ world, expand }, committed, id) => {
      world.edited = commitFromEditField(
        wholeNumber(expand(id)),
        text(expand(committed)),
      )
    },
  },

  {
    pattern: /^the todo (.+) is added$/,
    handle: ({ world, expand }, added) =>
      expect(addedBy(world)).toStrictEqual({
        kind: 'add',
        text: text(expand(added)),
      }),
  },
  {
    pattern: /^no todo is added$/,
    handle: ({ world }) => expect(addedBy(world).kind).toBe('refuse'),
  },
  {
    pattern: /^todo (.+) is edited to (.+)$/,
    handle: ({ world, expand }, id, edited) =>
      expect(changeBy(world)).toStrictEqual({
        kind: 'edit',
        id: wholeNumber(expand(id)),
        text: text(expand(edited)),
      }),
  },
  {
    pattern: /^no todo is edited$/,
    handle: ({ world }) => expect(changeBy(world).kind).not.toBe('edit'),
  },
  {
    pattern: /^todo (.+) is deleted$/,
    handle: ({ world, expand }, id) =>
      expect(changeBy(world)).toStrictEqual({
        kind: 'delete',
        id: wholeNumber(expand(id)),
      }),
  },
  {
    pattern: /^no todo is deleted$/,
    handle: ({ world }) => expect(changeBy(world).kind).not.toBe('delete'),
  },
  {
    pattern: /^the editor is closed$/,
    handle: ({ world }) => expect(editBy(world).closesEditor).toBe(true),
  },
]

export const todoInputEffectsSteps: StepSuite<TodoInputEffectsWorld> = {
  createWorld,
  definitions,
}
