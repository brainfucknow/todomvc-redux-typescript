import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import TodoFilters from '../constants/TodoFilters'

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
