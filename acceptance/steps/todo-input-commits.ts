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

// Plays the part `TodoTextInput` plays, against `src/todo-input/field.ts` with no
// React in the way. It stops at the text handed on; `./todo-input-effects` starts there.

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
