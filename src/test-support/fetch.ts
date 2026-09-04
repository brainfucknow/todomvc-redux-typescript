// The todo list loads todos on mount; a request that never settles keeps the
// store from changing underneath an assertion.
export const stubPendingFetch = () => {
  (global as any).fetch = vi.fn(() => new Promise(() => {}))
}
