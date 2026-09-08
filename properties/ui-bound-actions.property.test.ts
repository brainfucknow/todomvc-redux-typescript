import { describe, expect, it } from 'vitest'
import * as actions from '../src/actions'
import { elementOf, forAll, type Arbitrary } from './tiny-check'

/**
 * The one thing `src/actions/local.ts`'s wrappers are load-bearing for, stated
 * where it can fail.
 *
 * `MainSection.tsx` writes `onClick={actions.completeAllTodos}` and hands
 * `actions.clearCompleted` to `Footer`'s `onClearCompleted`, both through
 * `bindActionCreators`. React calls a click handler with the DOM event, and a
 * `createSlice` action creator called with one argument puts that argument in
 * `action.payload` - so binding the slice's creator directly would put a
 * SyntheticEvent into the store: not serializable, warned about by Redux
 * Toolkit's development middleware, and nothing in the app would go red.
 *
 * The wrappers take no arguments, so the event is dropped at the boundary
 * rather than travelling inward. That held only as long as everyone remembered
 * why; this says it instead. Replace either wrapper with the slice's own
 * creator and this file fails.
 *
 * Everything else about these two actions is specified in
 * features/todo-state-edits.feature 7 and 8.
 */

/** What a UI event handler gets handed, and a few things it never gets. */
const anyArgument: Arbitrary<unknown> = elementOf<unknown>([
  {
    type: 'click',
    target: { value: 'a node the store must never hold' },
    nativeEvent: {},
    preventDefault: () => {},
  },
  { currentTarget: {}, bubbles: true },
  () => 'a handler',
  Symbol('an event'),
  0,
  'click',
  null,
  undefined,
])

/** The two the components bind bare, by the names the components use. */
const bound: [string, () => unknown][] = [
  ['completeAllTodos', actions.completeAllTodos],
  ['clearCompleted', actions.clearCompleted],
]

describe('the actions a component binds without calling', () => {
  it('answers the same action whatever the UI hands it', async () => {
    await forAll(anyArgument, (argument) => {
      for (const [name, creator] of bound) {
        const called = (creator as (...given: unknown[]) => unknown)(argument)

        expect({ name, called }).toStrictEqual({ name, called: creator() })
      }
    })
  })

  it('answers an action a store can hold: a type, and no payload', async () => {
    await forAll(anyArgument, (argument) => {
      for (const [, creator] of bound) {
        const called = (creator as (...given: unknown[]) => unknown)(
          argument,
        ) as Record<string, unknown>

        expect(typeof called['type']).toBe('string')
        expect(called['payload']).toBeUndefined()
        expect(JSON.parse(JSON.stringify(called)) as unknown).toStrictEqual({
          type: called['type'],
        })
      }
    })
  })
})
