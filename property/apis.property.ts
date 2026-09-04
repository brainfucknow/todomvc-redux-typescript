import fc from 'fast-check'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ActionMessage } from '../src/constants/ActionMessage.ts'
import { errorMessage, executing } from '../src/reducers/apis.ts'

type Updating = Record<string, { isUpdating: boolean } | undefined>

const executingState = fc.record({
  isLoadingAll: fc.boolean(),
  isAdding: fc.boolean(),
  t: fc.dictionary(fc.stringMatching(/^[0-9]{1,3}$/), fc.record({ isUpdating: fc.boolean() }), { maxKeys: 3 }),
})
const anyId = fc.integer({ min: 0, max: 999 })
const todoArb = fc.record({ id: anyId, text: fc.string({ maxLength: 20 }), completed: fc.boolean() })
const updating = (state: { t: unknown }): Updating => state.t as Updating

// errorMessage infers its state type from a default of null, so the message it
// just stored cannot be handed back to it without this cast. Task 06 owns the fix.
type ErrorState = Parameters<typeof errorMessage>[0]
const held = (message: string): ErrorState => message as unknown as ErrorState

const loadAnswers: ActionMessage[] = [{ type: 'LOAD_TODO_SUCCESS', json: [] }, { type: 'LOAD_TODO_FAILURE' }]

// src/reducers/apis.ts logs every PATCH and DELETE request; task 06 removes it.
beforeAll(() => { vi.spyOn(console, 'log').mockImplementation(() => undefined) })
afterAll(() => { vi.restoreAllMocks() })

describe('executing', () => {
  it('is loading from the request until either answer arrives', () => {
    fc.assert(fc.property(executingState, fc.constantFrom(...loadAnswers), (state, answer) => {
      const loading = executing(state, { type: 'LOAD_TODO_REQUEST' })
      expect(loading.isLoadingAll).toBe(true)
      expect(executing(loading, answer).isLoadingAll).toBe(false)
    }))
  })

  it('is adding from the request until either answer arrives', () => {
    fc.assert(fc.property(executingState, fc.string(), (state, text) => {
      const adding = executing(state, { type: 'POST_TODO_REQUEST', text })
      expect(adding.isAdding).toBe(true)
      expect(executing(adding, { type: 'POST_TODO_SUCCESS', text, json: { id: 0, text, completed: false } }).isAdding)
        .toBe(false)
    }))
  })

  it('marks the todo being deleted, and only that one', () => {
    fc.assert(fc.property(executingState, anyId, (state, id) => {
      const next = executing(state, { type: 'DELETE_TODO_REQUEST', id })
      expect(updating(next)[id]).toEqual({ isUpdating: true })
      for (const other of Object.keys(updating(state)).filter((key) => key !== String(id))) {
        expect(updating(next)[other]).toEqual(updating(state)[other])
      }
    }))
  })

  it('clears the mark when the patch answers, either way', () => {
    fc.assert(fc.property(executingState, todoArb, fc.boolean(), (state, todo, succeeded) => {
      const requested = executing(state, { ...todo, type: 'PATCH_TODO_REQUEST' })
      expect(updating(requested)[todo.id]).toEqual({ isUpdating: true })
      const answer: ActionMessage = succeeded
        ? { ...todo, type: 'PATCH_TODO_SUCCESS', json: todo }
        : { ...todo, type: 'PATCH_TODO_FAILURE' }
      expect(updating(executing(requested, answer))[todo.id]).toEqual({ isUpdating: false })
    }))
  })

  it('leaves the state alone for an action it does not handle', () => {
    fc.assert(fc.property(executingState, (state) => {
      expect(executing(state, { type: 'NONE' })).toBe(state)
    }))
  })
})

describe('errorMessage', () => {
  it('remembers the error any failed action carries', () => {
    fc.assert(fc.property(fc.string(), fc.string({ minLength: 1 }), (state, error) => {
      expect(errorMessage(held(state), { type: 'LOAD_TODO_FAILURE', error })).toBe(error)
    }))
  })

  it('forgets it when the app resets the message', () => {
    fc.assert(fc.property(fc.string(), (state) => {
      expect(errorMessage(held(state), { type: 'RESET_ERROR_MESSAGE' })).toBe(null)
    }))
  })

  it('keeps what it had for any action carrying no error', () => {
    fc.assert(fc.property(fc.string(), fc.stringMatching(/^[A-Z_]{1,15}$/), (state, type) => {
      fc.pre(type !== 'RESET_ERROR_MESSAGE')
      expect(errorMessage(held(state), { type })).toBe(state)
    }))
  })
})
