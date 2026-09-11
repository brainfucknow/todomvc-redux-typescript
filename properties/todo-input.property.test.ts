import { describe, expect, it } from 'vitest'
import {
  commitOnBlur,
  commitOnKey,
  openingText,
  type FieldKind,
} from '../src/todo-input/field'
import {
  commitFromEditField,
  commitFromNewTodoField,
} from '../src/todo-input/effects'
import {
  elementOf,
  forAll,
  integer,
  text,
  tuple,
  type Arbitrary,
} from './tiny-check'

// Three claims no table reaches: the trim asymmetry as an equation over every text,
// the negative universal that no key but Enter acts, and the biconditional that the
// new-todo field refuses exactly the texts the edit field deletes on. All three pin
// preserved behavior, so a fix has to move them on purpose.

const FIELDS: readonly FieldKind[] = ['new-todo', 'edit']
const FIELD = elementOf(FIELDS)
const TEXT = text(12)
const ID = integer(0, 12)

const COMMIT_KEY = 'Enter'

const KEY = elementOf([
  COMMIT_KEY,
  'enter',
  'ENTER',
  'Enter ',
  ' Enter',
  'Return',
  'NumpadEnter',
  '\n',
  '\r',
  '13',
  'Escape',
  'Tab',
  'ArrowUp',
  'Backspace',
  ' ',
  'a',
  '',
])

const BLANK_CHARACTERS = ' \t\n\r\v\f   ﻿'

// Where the two commit paths disagree most: Enter turns it into nothing, losing
// focus hands it on whole.
const BLANK: Arbitrary<string> = {
  generate: (random) => {
    const length = 1 + Math.floor(random() * 4)
    let drawn = ''
    for (let index = 0; index < length; index += 1) {
      drawn += BLANK_CHARACTERS[Math.floor(random() * BLANK_CHARACTERS.length)]
    }
    return drawn
  },
  shrink: (value) =>
    value.length > 1 ? [' ', value.slice(1), value.slice(0, -1)] : [],
}

const onEnter = (field: FieldKind, held: string) =>
  commitOnKey(field, held, COMMIT_KEY)

describe('opening a field', () => {
  it('holds exactly the text it was opened on, whatever is in it', async () => {
    await forAll(TEXT, (held) => {
      expect(openingText(held)).toBe(held)
    })
  })

  it('holds nothing when there is no text, which is not the same as no field', () => {
    expect(openingText(undefined)).toBe('')
    expect(openingText()).toBe('')
  })

  it('hands back what it was opened on when focus moves away', async () => {
    await forAll(TEXT, (held) => {
      expect(commitOnBlur('edit', openingText(held))?.text).toBe(held)
    })
  })
})

describe('the one key that commits', () => {
  it('acts on Enter and on nothing else, in either field', async () => {
    await forAll(tuple(FIELD, TEXT, KEY), ([field, held, key]) => {
      expect({
        key,
        acts: commitOnKey(field, held, key) !== null,
      }).toStrictEqual({ key, acts: key === COMMIT_KEY })
    })
  })

  it('leaves the field alone for a key drawn from anywhere at all', async () => {
    await forAll(tuple(FIELD, TEXT, text(6)), ([field, held, key]) => {
      if (key === COMMIT_KEY) return
      expect(commitOnKey(field, held, key)).toBeNull()
    })
  })
})

describe('what Enter commits', () => {
  it('commits the held text with its surrounding whitespace gone, said three ways', async () => {
    await forAll(tuple(FIELD, TEXT), ([field, held]) => {
      const committed = onEnter(field, held)?.text as string

      expect(held).toContain(committed)
      expect(committed).toBe(committed.trim())
      if (held === held.trim()) expect(committed).toBe(held)
    })
  })

  it('commits what it committed, unchanged, when the commit is made again', async () => {
    await forAll(tuple(FIELD, TEXT), ([field, held]) => {
      const once = onEnter(field, held)?.text as string

      expect(onEnter(field, once)?.text).toBe(once)
    })
  })

  it('commits nothing at all from a field of whitespace, from either field', async () => {
    await forAll(tuple(FIELD, BLANK), ([field, held]) => {
      expect(onEnter(field, held)?.text).toBe('')
    })
  })
})

describe('which field is cleared', () => {
  it('clears the new-todo field and no other, whatever it committed', async () => {
    await forAll(tuple(FIELD, TEXT), ([field, held]) => {
      expect(onEnter(field, held)?.clearsField).toBe(field === 'new-todo')
    })
  })

  it('clears the new-todo field even when the commit is empty, so clearing turns on the field and not on the text', async () => {
    await forAll(BLANK, (held) => {
      expect(onEnter('new-todo', held)).toStrictEqual({
        text: '',
        clearsField: true,
      })
    })
  })

  it('never clears a field that lost focus', async () => {
    await forAll(tuple(FIELD, TEXT), ([field, held]) => {
      expect(commitOnBlur(field, held)?.clearsField ?? false).toBe(false)
    })
  })
})

describe('what losing focus commits', () => {
  it('commits the edit field untouched, character for character', async () => {
    await forAll(TEXT, (held) => {
      expect(commitOnBlur('edit', held)?.text).toBe(held)
    })
  })

  it('commits nothing from the new-todo field, for any text', async () => {
    await forAll(TEXT, (held) => {
      expect(commitOnBlur('new-todo', held)).toBeNull()
    })
  })
})

describe('the asymmetry between the two gestures', () => {
  it('agrees with Enter on exactly the texts that had no surrounding whitespace', async () => {
    await forAll(TEXT, (held) => {
      const pressed = onEnter('edit', held)?.text
      const blurred = commitOnBlur('edit', held)?.text

      expect(pressed === blurred).toBe(held === held.trim())
    })
  })
})

describe('what a committed text does', () => {
  it('refuses from the new-todo field exactly when it deletes from the edit field', async () => {
    await forAll(tuple(ID, TEXT), ([id, committed]) => {
      const refused = commitFromNewTodoField(committed).kind === 'refuse'
      const deleted =
        commitFromEditField(id, committed).change.kind === 'delete'

      expect({ committed, refused }).toStrictEqual({
        committed,
        refused: deleted,
      })
    })
  })

  it('carries the text and the id through untouched, whichever answer it gave', async () => {
    await forAll(tuple(ID, TEXT), ([id, committed]) => {
      const added = commitFromNewTodoField(committed)
      const { change } = commitFromEditField(id, committed)

      expect(added.kind === 'add' ? added.text : committed).toBe(committed)
      expect(change.id).toBe(id)
      expect(change.kind === 'edit' ? change.text : committed).toBe(committed)
    })
  })

  it('treats a text of whitespace as a text, because emptiness is length and not blankness', async () => {
    await forAll(tuple(ID, BLANK), ([id, committed]) => {
      expect(commitFromNewTodoField(committed)).toStrictEqual({
        kind: 'add',
        text: committed,
      })
      expect(commitFromEditField(id, committed).change).toStrictEqual({
        kind: 'edit',
        id,
        text: committed,
      })
    })
  })

  it('closes the editor whichever change it asked for, which is what the row acts on', async () => {
    await forAll(tuple(ID, TEXT), ([id, committed]) => {
      expect(commitFromEditField(id, committed).closesEditor).toBe(true)
    })
  })
})

// The two modules composed: the preserved defect lives in the join, where one
// gesture destroys the todo and the other saves a row whose label renders blank.
describe('an edit field holding nothing but whitespace', () => {
  it('deletes the todo when Enter commits it and edits it to those spaces when focus moves away', async () => {
    await forAll(tuple(ID, BLANK), ([id, held]) => {
      const pressed = onEnter('edit', held)?.text as string
      const blurred = commitOnBlur('edit', held)?.text as string

      expect(commitFromEditField(id, pressed).change).toStrictEqual({
        kind: 'delete',
        id,
      })
      expect(commitFromEditField(id, blurred).change).toStrictEqual({
        kind: 'edit',
        id,
        text: held,
      })
    })
  })
})
