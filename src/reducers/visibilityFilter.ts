import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import TodoFilters from '../constants/TodoFilters'

/** Which todos the app is showing. `src/selectors/` is what reads it. */
const visibilityFilterSlice = createSlice({
  name: 'visibilityFilter',
  initialState: TodoFilters.SHOW_ALL,
  reducers: {
    setVisibilityFilter: (_state, { payload }: PayloadAction<TodoFilters>) =>
      payload,
  },
})

export const visibilityFilterActions = visibilityFilterSlice.actions

export default visibilityFilterSlice.reducer
