import { createSlice, isRejected, type SerializedError } from '@reduxjs/toolkit'

/**
 * The last failure the app recorded, and nothing else: it is written by any
 * rejected action whatever, so this module names no operation of its own.
 *
 * Nothing in the UI reads it, and nothing but the branch below ever clears it.
 * `features/todo-state-failures.feature` specifies both; surfacing a failure to
 * a user would be new behavior and is not this project's plan.
 */
const errorMessageSlice = createSlice({
  name: 'errorMessage',
  initialState: null as SerializedError | null,
  reducers: {
    /**
     * Nothing asks. The branch is live and callerless, as it was before there
     * were slices, and `features/todo-state-failures.feature` 4 is what holds
     * it.
     */
    resetErrorMessage: () => null,
  },
  extraReducers: (builder) => {
    builder.addMatcher(isRejected, (_state, action) => action.error)
  },
})

export const errorActions = errorMessageSlice.actions

export const errorMessage = errorMessageSlice.reducer
