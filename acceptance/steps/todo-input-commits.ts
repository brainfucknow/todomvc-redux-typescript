import { expect } from 'vitest'
import {
  commitOnBlur,
  commitOnKey,
  openingText,
  type FieldCommit,
  type FieldKind,
} from '../../src/todo-input/field'
import { text, textOrNothing } from './cells'
import type { StepDefinition, StepSuite } from '../runtime'

/**
 * The step vocabulary of features/todo-input-commits.feature, connected to
 * `src/todo-input/field.ts`. No React: the module answers these questions with
 * no component in the way, which is the whole reason the rules were extracted.
 *
 * This file plays the part `TodoTextInput` plays. It asks the rule what a
 * keystroke or a lost focus commits and then does what the answer says - noting
 * the text, and emptying the field when the answer says to - exactly as the
 * component does. It decides nothing itself: every question the feature asks is
 * answered by `src/`.
 *
 * It stops where the feature stops, at the text handed on. What that text then
 * does is `./todo-input-effects`, whose world this one never touches.
 */

/** A key press or a lost focus, and what the rule said it commits. */
interface FieldEvent {
  readonly commit: FieldCommit | null
}

export interface TodoInputCommitsWorld {
  field?: FieldKind
  held: string
  heldBefore: string
  event?: FieldEvent
}

type Definition = StepDefinition<TodoInputCommitsWorld>

const createWorld = (): TodoInputCommitsWorld => ({ held: '', heldBefore: '' })

/**
 * Runs one event against the field the scenario named, and applies the answer
 * the way the component does: what a commit clears, it clears.
 */
const act = (
  world: TodoInputCommitsWorld,
  decide: (field: FieldKind, held: string) => FieldCommit | null,
) => {
  const commit = decide(fieldOf(world), world.held)

  world.heldBefore = world.held
  world.event = { commit }
  if (commit?.clearsField) world.held = ''
}

const fieldOf = (world: TodoInputCommitsWorld): FieldKind => {
  if (!world.field) {
    throw new Error('No field is open: no step said which field holds the text')
  }
  return world.field
}

const commitOf = (world: TodoInputCommitsWorld): FieldCommit | null => {
  if (!world.event) {
    throw new Error('Nothing has happened to the field: no key, no lost focus')
  }
  return world.event.commit
}

/** `new-todo` and `edit`, the two fields a scenario can name. */
function fieldKind(name: string): FieldKind {
  if (name !== 'new-todo' && name !== 'edit') {
    throw new Error(`Not a field: ${name}`)
  }
  return name
}

const definitions: Definition[] = [
  {
    pattern: /^a field is opened on (.+)$/,
    handle: ({ world, expand }, opened) => {
      world.held = openingText(textOrNothing(expand(opened)))
    },
  },
  {
    pattern: /^the field starts holding (.+)$/,
    handle: ({ world, expand }, held) =>
      expect(world.held).toBe(text(expand(held))),
  },
  {
    pattern: /^the (.+) field holds (.+)$/,
    handle: ({ world, expand }, kind, held) => {
      world.field = fieldKind(expand(kind))
      world.held = text(expand(held))
    },
  },

  {
    pattern: /^the (.+) key is pressed$/,
    handle: ({ world, expand }, key) => {
      const pressed = expand(key)
      act(world, (field, held) => commitOnKey(field, held, pressed))
    },
  },
  {
    pattern: /^the field loses focus$/,
    handle: ({ world }) => act(world, commitOnBlur),
  },

  {
    pattern: /^the text (.+) is committed$/,
    handle: ({ world, expand }, committed) =>
      expect(commitOf(world)?.text).toBe(text(expand(committed))),
  },
  {
    pattern: /^nothing is committed$/,
    handle: ({ world }) => expect(commitOf(world)).toBeNull(),
  },
  {
    pattern: /^the field is cleared$/,
    handle: ({ world }) => expect(world.held).toBe(''),
  },
  {
    pattern: /^the field is left as it is$/,
    handle: ({ world }) => expect(world.held).toBe(world.heldBefore),
  },
]

export const todoInputCommitsSteps: StepSuite<TodoInputCommitsWorld> = {
  createWorld,
  definitions,
}
