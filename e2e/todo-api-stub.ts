// The stub contract from `qa/todo-app-regression.md`, installed in the browser
// as route interception. The network boundary is the only thing faked: the app
// under test is the real build, driven through the real UI.
import type { Page, Route } from '@playwright/test'

export type Todo = {
  id: number
  text: string
  completed: boolean
}

export const SEED: Todo[] = [
  { id: 1, text: 'Buy milk', completed: false },
  { id: 2, text: 'Walk the dog', completed: true },
]

export type Call = {
  method: string
  path: string
  body: unknown
}

export type TodoApi = {
  calls: Call[]
  since: (mark: number) => Call[]
  mark: () => number
  abortLoads: (abort: boolean) => void
}

const json = (route: Route, body: unknown): Promise<void> =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const idIn = (path: string): number => Number(path.split('/').filter(Boolean).at(-1))

export async function installTodoApi(page: Page): Promise<TodoApi> {
  let todos: Todo[] = SEED.map((todo) => ({ ...todo }))
  let nextId = Math.max(...SEED.map((todo) => todo.id)) + 1
  let aborting = false
  const calls: Call[] = []

  const answer = async (route: Route, method: string, path: string, body: unknown): Promise<void> => {
    if (method === 'GET') {
      return json(route, todos)
    }
    if (method === 'POST') {
      const created: Todo = { id: nextId++, text: String((body as { text: string }).text), completed: false }
      todos = [...todos, created]
      return json(route, created)
    }
    if (method === 'PATCH') {
      const updated = todos.map((todo) => (todo.id === idIn(path) ? { ...todo, ...(body as Partial<Todo>) } : todo))
      todos = updated
      return json(route, updated.find((todo) => todo.id === idIn(path)))
    }
    if (method === 'DELETE') {
      todos = todos.filter((todo) => todo.id !== idIn(path))
      return route.fulfill({ status: 200, body: '' })
    }
    throw new Error(`the stub contract has no answer for ${method} ${path}`)
  }

  await page.route((url) => url.pathname.startsWith('/api/todos'), async (route) => {
    const request = route.request()
    const method = request.method()
    const path = new URL(request.url()).pathname
    const body = request.postData() === null ? null : request.postDataJSON()
    calls.push({ method, path, body })
    if (aborting && method === 'GET') {
      return route.abort()
    }
    return answer(route, method, path, body)
  })

  return {
    calls,
    mark: () => calls.length,
    since: (mark: number) => calls.slice(mark),
    abortLoads: (abort: boolean) => {
      aborting = abort
    },
  }
}
