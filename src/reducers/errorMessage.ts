import { createSlice, isRejected, type SerializedError } from '@reduxjs/toolkit'

// Nothing in the UI reads this; features/todo-state-failures.feature is what holds it.
const errorMessageSlice = createSlice({
  name: 'errorMessage',
  initialState: null as SerializedError | null,
  reducers: {
    // Callerless and live: specified, not dead code.
    resetErrorMessage: () => null,
  },
  extraReducers: (builder) => {
    builder.addMatcher(isRejected, (_state, action) => action.error)
  },
})

export const errorActions = errorMessageSlice.actions

export const errorMessage = errorMessageSlice.reducer
