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

/**
 * Properties of `src/todo-input/`, where features/todo-input-commits.feature,
 * features/todo-input-effects.feature and the two spec files say what holds for
 * particular texts, particular keys and particular ids.
 *
 * These rules are total functions over a small space - two fields, any string,
 * any key - which is the shape a property covers and a table cannot. Three of
 * them are here for reasons a row could not reach:
 *
 * - **The trim asymmetry as an equation rather than two examples.** Enter
 *   commits the surrounding whitespace away and losing focus does not, so the
 *   two gestures agree on exactly the texts that had none and differ on every
 *   other. A table shows that for the texts it lists; this says it for all of
 *   them, and goes red against a field that trims on blur - which is the
 *   plausible wrong implementation this task's done criteria name.
 * - **The negative universal about keys.** "No key but Enter does anything" is
 *   a claim about every key there is, and every table of keys is a claim about
 *   the keys someone thought of. Here it is checked against near-misses chosen
 *   to break a loose reading - `enter`, `ENTER`, `Return`, `NumpadEnter`,
 *   `\n`, `13` - and then against generated text as well.
 * - **One question, two answers.** `Header` refuses an empty commit and
 *   `TodoItem` deletes on one, and both read the same `isEmpty`. The property
 *   is the biconditional: for every text, the new-todo field refuses it exactly
 *   when the edit field would delete on it. Trim in one of the two callers and
 *   that equivalence breaks even though every example in both spec files still
 *   passes.
 *
 * Nothing here asks for a kinder rule. The asymmetry, the delete-on-empty and
 * "emptiness is length, not blankness" are current behavior that this plan
 * preserves; the properties pin them so that a fix has to move them on purpose.
 */

const FIELDS: readonly FieldKind[] = ['new-todo', 'edit']
const FIELD = elementOf(FIELDS)
const TEXT = text(12)
const ID = integer(0, 12)

const COMMIT_KEY = 'Enter'

/** Keys chosen to fail a reading looser than an exact match on `Enter`. */
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

/** Every character `String.prototype.trim` removes, and nothing else. */
const BLANK_CHARACTERS = ' \t\n\r\v\f   ﻿'

/**
 * A non-empty run of whitespace: the text that Enter turns into nothing and
 * losing focus hands on whole. It is where the two commit paths disagree most,
 * and where "emptiness is length" is visible.
 */
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

/** What Enter commits from a field holding this text, for a field that acts. */
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

/**
 * The two modules composed, because the defect this plan preserves lives in the
 * join rather than in either half. `todo-input-commits` stops at the text a
 * field hands on and `todo-input-effects` starts there, so no feature file can
 * state this: same field, same characters, two gestures, and one of them
 * destroys the todo while the other saves a row whose label renders blank.
 */
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
