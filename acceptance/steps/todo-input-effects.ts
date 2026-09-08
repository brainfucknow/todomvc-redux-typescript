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

/**
 * The step vocabulary of features/todo-input-effects.feature, connected to
 * `src/todo-input/effects.ts`. No React: the module answers these questions
 * with no component in the way.
 *
 * This file plays the part `Header` and `TodoItem` play, each of which commits
 * a text and performs the answer. It decides nothing itself, and in particular
 * it does not decide that an empty text means different things to the two
 * callers - that is the module's answer, which is why both callers ask it.
 *
 * It starts where `./todo-input-commits` stops, at a text already handed on.
 * The two sentences for that one event are deliberately different - "the text T
 * is committed" there, "the text T is committed from the new-todo field" here -
 * so that no pattern matches both.
 */

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
