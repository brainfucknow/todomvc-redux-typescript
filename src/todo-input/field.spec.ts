import { commitOnBlur, commitOnKey, openingText, type FieldKind } from './field'

/**
 * The two fields are peers, so every claim that holds for both is written over
 * both. A claim that names one field is a claim the other is free to break.
 *
 * The texts here carry surrounding spaces on purpose: trimming is the one thing
 * the two commit paths disagree about, and a test whose texts are already
 * trimmed cannot tell them apart.
 */
const FIELDS: FieldKind[] = ['new-todo', 'edit']

describe('todo-input/field', () => {
  describe('openingText', () => {
    it('opens on the text it is given, whatever it is', () => {
      expect(openingText('Buy milk')).toBe('Buy milk')
      expect(openingText('  Buy oats  ')).toBe('  Buy oats  ')
    })

    it('opens on the empty string when there is no text', () => {
      expect(openingText(undefined)).toBe('')
      expect(openingText()).toBe('')
    })

    it('opens on the empty string when the text is empty', () => {
      expect(openingText('')).toBe('')
    })
  })

  describe('commitOnKey', () => {
    it('commits the trimmed text on Enter, from either field', () => {
      for (const field of FIELDS) {
        expect(commitOnKey(field, '  Ship it  ', 'Enter')?.text).toBe('Ship it')
        expect(commitOnKey(field, '  Buy oats  ', 'Enter')?.text).toBe(
          'Buy oats',
        )
      }
    })

    it('commits the empty string for a field of spaces, from either field', () => {
      for (const field of FIELDS) {
        expect(commitOnKey(field, '   ', 'Enter')?.text).toBe('')
      }
    })

    it('clears the new-todo field and leaves the edit field alone', () => {
      expect(commitOnKey('new-todo', '  Ship it  ', 'Enter')?.clearsField).toBe(
        true,
      )
      expect(commitOnKey('edit', '  Ship it  ', 'Enter')?.clearsField).toBe(
        false,
      )
    })

    it('clears the new-todo field even when the commit is empty', () => {
      expect(commitOnKey('new-todo', '   ', 'Enter')?.clearsField).toBe(true)
    })

    it('commits nothing for any other key, from either field', () => {
      for (const field of FIELDS) {
        for (const key of ['Escape', 'ArrowUp', 'Tab', 'a', ' ', 'enter']) {
          expect(commitOnKey(field, 'Ship it', key)).toBeNull()
        }
      }
    })
  })

  describe('commitOnBlur', () => {
    it('commits the edit field untrimmed', () => {
      expect(commitOnBlur('edit', '  Buy oats  ')?.text).toBe('  Buy oats  ')
      expect(commitOnBlur('edit', '   ')?.text).toBe('   ')
    })

    it('commits nothing from the new-todo field', () => {
      expect(commitOnBlur('new-todo', '  Ship it  ')).toBeNull()
      expect(commitOnBlur('new-todo', '')).toBeNull()
    })

    it('clears neither field', () => {
      expect(commitOnBlur('edit', '  Buy oats  ')?.clearsField).toBe(false)
    })
  })
})
