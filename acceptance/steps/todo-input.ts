import { expect } from 'vitest'
import {
  commitOnBlur,
  commitOnKey,
  openingText,
  type FieldCommit,
  type FieldKind,
} from '../../src/todo-input/field'
import {
  commitFromEditField,
  commitFromNewTodoField,
  type EditCommit,
  type NewTodoCommit,
  type TodoChange,
} from '../../src/todo-input/effects'
import type { StepDefinition, StepSuite } from '../runtime'

/**
 * The step vocabulary of features/todo-input-*.feature, connected to
 * `src/todo-input/`. No React: the two modules answer these questions with no
 * component in the way, which is the whole reason the rules were extracted.
 *
 * This file plays the part a component plays. It asks a rule what a keystroke
 * or a lost focus commits and then does what the answer says - handing the text
 * on, and emptying the field when the answer says to - exactly as
 * `TodoTextInput` does. It decides nothing itself: every question the features
 * ask is answered by `src/`.
 *
 * One convention the features declare and this file honours: a text cell is
 * JSON, quotes included, so the surrounding spaces this family is about survive
 * the parser. `undefined` is the bare word, as in todo-api-refusals, and means
 * a field opened on no text at all.
 */

/** A key press or a lost focus, and what the rule said it commits. */
interface FieldEvent {
  readonly commit: FieldCommit | null
}

export interface TodoInputWorld {
  field?: FieldKind
  held: string
  heldBefore: string
  event?: FieldEvent
  added?: NewTodoCommit
  edited?: EditCommit
}

type Definition = StepDefinition<TodoInputWorld>

const createWorld = (): TodoInputWorld => ({ held: '', heldBefore: '' })

/**
 * Runs one event against the field the scenario named, and applies the answer
 * the way the component does: what a commit clears, it clears.
 */
const act = (
  world: TodoInputWorld,
  decide: (field: FieldKind, held: string) => FieldCommit | null,
) => {
  const commit = decide(fieldOf(world), world.held)

  world.heldBefore = world.held
  world.event = { commit }
  if (commit?.clearsField) world.held = ''
}

const fieldOf = (world: TodoInputWorld): FieldKind => {
  if (!world.field) {
    throw new Error('No field is open: no step said which field holds the text')
  }
  return world.field
}

const commitOf = (world: TodoInputWorld): FieldCommit | null => {
  if (!world.event) {
    throw new Error('Nothing has happened to the field: no key, no lost focus')
  }
  return world.event.commit
}

const addedBy = (world: TodoInputWorld): NewTodoCommit => {
  if (!world.added) {
    throw new Error('No text was committed from the new-todo field')
  }
  return world.added
}

const editBy = (world: TodoInputWorld): EditCommit => {
  if (!world.edited) {
    throw new Error('No text was committed from the edit field')
  }
  return world.edited
}

const changeBy = (world: TodoInputWorld): TodoChange => editBy(world).change

/** `new-todo` and `edit`, the two fields a scenario can name. */
function fieldKind(name: string): FieldKind {
  if (name !== 'new-todo' && name !== 'edit') {
    throw new Error(`Not a field: ${name}`)
  }
  return name
}

/** A text cell: JSON, so that surrounding spaces are visible and survive. */
function text(cell: string): string {
  let value: unknown
  try {
    value = JSON.parse(cell)
  } catch {
    throw new Error(`Not a text: ${cell}`)
  }
  if (typeof value !== 'string') throw new Error(`Not a text: ${cell}`)
  return value
}

/** The same, plus the bare word a field opened on no text at all is given. */
function textOrNothing(cell: string): string | undefined {
  return cell === 'undefined' ? undefined : text(cell)
}

function wholeNumber(value: string): number {
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`Not a whole number: ${value}`)
  }
  return Number(value)
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

export const todoInputSteps: StepSuite<TodoInputWorld> = {
  createWorld,
  definitions,
}
