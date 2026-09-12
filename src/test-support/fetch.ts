// A load that never settles keeps the mount-time fetch from moving the store under an assertion.
export const stubPendingFetch = () => {
  globalThis.fetch = vi.fn(() => new Promise<Response>(() => {}))
}
