import { commitFromEditField, commitFromNewTodoField } from './effects'

describe('todo-input/effects', () => {
  describe('commitFromNewTodoField', () => {
    it('asks for the committed text, exactly as committed', () => {
      expect(commitFromNewTodoField('Ship it')).toStrictEqual({
        kind: 'add',
        text: 'Ship it',
      })
      expect(commitFromNewTodoField('Buy oats')).toStrictEqual({
        kind: 'add',
        text: 'Buy oats',
      })
    })

    it('refuses an empty text and asks for nothing', () => {
      expect(commitFromNewTodoField('')).toStrictEqual({ kind: 'refuse' })
    })

    it('asks for a text of spaces: emptiness is length, not blankness', () => {
      expect(commitFromNewTodoField('   ')).toStrictEqual({
        kind: 'add',
        text: '   ',
      })
    })
  })

  describe('commitFromEditField', () => {
    it('edits that todo to the committed text, exactly as committed', () => {
      expect(commitFromEditField(2, 'Buy oats').change).toStrictEqual({
        kind: 'edit',
        id: 2,
        text: 'Buy oats',
      })
      expect(commitFromEditField(7, 'Ship it').change).toStrictEqual({
        kind: 'edit',
        id: 7,
        text: 'Ship it',
      })
    })

    it('edits to a text of spaces: emptiness is length, not blankness', () => {
      expect(commitFromEditField(2, '   ').change).toStrictEqual({
        kind: 'edit',
        id: 2,
        text: '   ',
      })
    })

    it('deletes that todo when the committed text is empty', () => {
      expect(commitFromEditField(2, '').change).toStrictEqual({
        kind: 'delete',
        id: 2,
      })
      expect(commitFromEditField(7, '').change).toStrictEqual({
        kind: 'delete',
        id: 7,
      })
    })

    it('closes the editor whichever way it went', () => {
      for (const text of ['Buy oats', '   ', '']) {
        expect(commitFromEditField(2, text).closesEditor).toBe(true)
      }
    })
  })
})
