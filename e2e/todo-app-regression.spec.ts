// `qa/todo-app-regression.md`, executed. One test per procedure, one step per
// lettered row.
//
// The app is served by `npm run preview`, so this drives the production build.
// Nothing here imports a project module or reads Redux state: every assertion
// is something a person looking at the page or the network tab could make.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { npm, startServer, type Server } from './harness.ts'
import { installTodoApi, type Call, type TodoApi } from './todo-api-stub.ts'

let server: Server
let api: TodoApi
let consoleErrors: string[]

// Not serial: each procedure resets the stub and loads the app afresh, so one
// failing procedure must not hide the result of the next.
test.beforeAll(async () => {
  const built = npm('run', 'build')
  expect(built.code, built.output).toBe(0)
  server = await startServer('preview')
})

test.afterAll(async () => {
  await server?.stop()
})

test.beforeEach(async ({ page }) => {
  consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })
  page.on('pageerror', (error) => consoleErrors.push(String(error)))
  api = await installTodoApi(page)
})

// "no browser console error appears outside K4"
test.afterEach(({}, testInfo) => {
  if (!testInfo.title.startsWith('Procedure K')) {
    expect(consoleErrors).toEqual([])
  }
})

const newTodoInput = (page: Page): Locator => page.locator('input.new-todo')
const items = (page: Page): Locator => page.locator('ul.todo-list li')
const labels = (page: Page): Locator => page.locator('ul.todo-list li label')
const toggleOf = (page: Page, text: string): Locator => items(page).filter({ hasText: text }).locator('input.toggle')
const editInput = (page: Page): Locator => page.locator('ul.todo-list li input.edit')
const toggleAllBox = (page: Page): Locator => page.locator('input.toggle-all')
const toggleAllControl = (page: Page): Locator => page.locator('input.toggle-all + label')
const todoCount = (page: Page): Locator => page.locator('span.todo-count')
const filter = (page: Page, name: string): Locator => page.locator('ul.filters a', { hasText: name })
const clearCompleted = (page: Page): Locator => page.locator('button.clear-completed')

const load = async (page: Page): Promise<void> => {
  await page.goto(server.url)
}

// Long enough for a request the app would have issued to have been recorded.
const settle = (page: Page): Promise<void> => page.waitForTimeout(500)

const addTodo = async (page: Page, text: string): Promise<void> => {
  await newTodoInput(page).fill(text)
  await newTodoInput(page).press('Enter')
}

const startEditing = async (page: Page, text: string): Promise<void> => {
  await labels(page).filter({ hasText: text }).dblclick()
}

const callsSince = async (page: Page, mark: number, expected: Call[]): Promise<void> => {
  await expect.poll(() => api.since(mark)).toEqual(expected)
  await settle(page)
  expect(api.since(mark)).toEqual(expected)
}

const noCallsSince = async (page: Page, mark: number): Promise<void> => {
  await settle(page)
  expect(api.since(mark)).toEqual([])
}

test('Procedure F: initial render', async ({ page }) => {
  await test.step('F1 navigate to the app URL', async () => {
    await load(page)
    await expect(items(page)).toHaveCount(2)
    await settle(page)
    // The initial load is the one exemption: a development build mounts effects
    // twice under StrictMode and fires this twice. Nothing else may be issued.
    expect(api.calls.length).toBeGreaterThanOrEqual(1)
    expect(api.calls.length).toBeLessThanOrEqual(2)
    expect(api.calls.every((call) => call.method === 'GET' && call.path === '/api/todos/')).toBe(true)
  })

  await test.step('F2 read the page', async () => {
    await expect(page).toHaveTitle('Redux TodoMVC Example')
    await expect(page.locator('h1')).toHaveText('todos')
    await expect(newTodoInput(page)).toHaveAttribute('placeholder', 'What needs to be done?')
    await expect(newTodoInput(page)).toBeFocused()
  })

  await test.step('F3 read the todo list', async () => {
    await expect(labels(page)).toHaveText(['Buy milk', 'Walk the dog'])
  })

  await test.step('F4 read the item states', async () => {
    await expect(items(page).nth(1)).toHaveClass(/completed/)
    await expect(toggleOf(page, 'Walk the dog')).toBeChecked()
    await expect(items(page).nth(0)).not.toHaveClass(/completed/)
    await expect(toggleOf(page, 'Buy milk')).not.toBeChecked()
  })

  await test.step('F5 read the footer', async () => {
    await expect(todoCount(page)).toHaveText('1 item left')
    await expect(page.locator('ul.filters a')).toHaveText(['All', 'Active', 'Completed'])
    await expect(filter(page, 'All')).toHaveClass(/selected/)
    await expect(clearCompleted(page)).toBeVisible()
  })

  await test.step('F6 read the toggle-all control', async () => {
    await expect(toggleAllBox(page)).toHaveCount(1)
    await expect(toggleAllBox(page)).not.toBeChecked()
  })
})

test('Procedure G: adding', async ({ page }) => {
  await load(page)
  await expect(items(page)).toHaveCount(2)

  await test.step('G1 add Read a book', async () => {
    const mark = api.mark()
    await addTodo(page, 'Read a book')
    await callsSince(page, mark, [{ method: 'POST', path: '/api/todos/', body: { text: 'Read a book' } }])
  })

  await test.step('G2 read the page', async () => {
    await expect(labels(page)).toHaveText(['Buy milk', 'Walk the dog', 'Read a book'])
    await expect(newTodoInput(page)).toHaveValue('')
    await expect(todoCount(page)).toHaveText('2 items left')
  })

  await test.step('G3 add a padded title', async () => {
    const mark = api.mark()
    await addTodo(page, ' Trim me ')
    await callsSince(page, mark, [{ method: 'POST', path: '/api/todos/', body: { text: 'Trim me' } }])
  })

  await test.step('G4 press Enter on the empty input', async () => {
    const mark = api.mark()
    await newTodoInput(page).press('Enter')
    await noCallsSince(page, mark)
    await expect(items(page)).toHaveCount(4)
  })

  await test.step('G5 type without pressing Enter, then click elsewhere', async () => {
    const mark = api.mark()
    await newTodoInput(page).fill('Never saved')
    await page.locator('h1').click()
    await noCallsSince(page, mark)
    await expect(items(page)).toHaveCount(4)
    await expect(newTodoInput(page)).toHaveValue('Never saved')
  })
})

test('Procedure H: completing and clearing', async ({ page }) => {
  await load(page)
  await expect(items(page)).toHaveCount(2)

  await test.step('H1 complete Buy milk', async () => {
    const mark = api.mark()
    await toggleOf(page, 'Buy milk').click()
    await callsSince(page, mark, [{ method: 'PATCH', path: '/api/todos/1', body: { completed: true } }])
    await expect(items(page).nth(0)).toHaveClass(/completed/)
    await expect(toggleAllBox(page)).toBeChecked()
    await expect(todoCount(page)).toHaveText('No items left')
  })

  await test.step('H2 un-complete Buy milk', async () => {
    const mark = api.mark()
    await toggleOf(page, 'Buy milk').click()
    await callsSince(page, mark, [{ method: 'PATCH', path: '/api/todos/1', body: { completed: false } }])
    await expect(items(page).nth(0)).not.toHaveClass(/completed/)
    await expect(todoCount(page)).toHaveText('1 item left')
  })

  await test.step('H3 toggle all', async () => {
    const mark = api.mark()
    await toggleAllControl(page).click()
    await noCallsSince(page, mark)
    await expect(items(page).nth(0)).toHaveClass(/completed/)
    await expect(items(page).nth(1)).toHaveClass(/completed/)
    await expect(todoCount(page)).toHaveText('No items left')
  })

  await test.step('H4 toggle all again', async () => {
    const mark = api.mark()
    await toggleAllControl(page).click()
    await noCallsSince(page, mark)
    await expect(items(page).nth(0)).not.toHaveClass(/completed/)
    await expect(items(page).nth(1)).not.toHaveClass(/completed/)
    await expect(todoCount(page)).toHaveText('2 items left')
  })

  await test.step('H5 complete Walk the dog', async () => {
    const mark = api.mark()
    await toggleOf(page, 'Walk the dog').click()
    await callsSince(page, mark, [{ method: 'PATCH', path: '/api/todos/2', body: { completed: true } }])
    await expect(items(page).nth(1)).toHaveClass(/completed/)
  })

  await test.step('H6 clear completed', async () => {
    const mark = api.mark()
    await clearCompleted(page).click()
    await noCallsSince(page, mark)
    await expect(labels(page)).toHaveText(['Buy milk'])
    await expect(todoCount(page)).toHaveText('1 item left')
    await expect(clearCompleted(page)).toHaveCount(0)
  })

  await test.step('H7 reload', async () => {
    await load(page)
    await expect(labels(page)).toHaveText(['Buy milk', 'Walk the dog'])
    await expect(items(page).nth(0)).not.toHaveClass(/completed/)
    await expect(items(page).nth(1)).toHaveClass(/completed/)
  })
})

test('Procedure I: editing and deleting', async ({ page }) => {
  await load(page)
  await expect(items(page)).toHaveCount(2)

  await test.step('I1 double-click the Buy milk label', async () => {
    await startEditing(page, 'Buy milk')
    await expect(items(page).nth(0)).toHaveClass(/editing/)
    await expect(editInput(page)).toHaveValue('Buy milk')
    await expect(editInput(page)).toBeFocused()
  })

  await test.step('I2 rename with Enter', async () => {
    const mark = api.mark()
    await editInput(page).fill('Buy oat milk')
    await editInput(page).press('Enter')
    await callsSince(page, mark, [{ method: 'PATCH', path: '/api/todos/1', body: { text: 'Buy oat milk' } }])
    await expect(editInput(page)).toHaveCount(0)
    await expect(labels(page).nth(0)).toHaveText('Buy oat milk')
  })

  await test.step('I3 rename by clicking outside', async () => {
    const mark = api.mark()
    await startEditing(page, 'Buy oat milk')
    await editInput(page).fill('Buy soy milk')
    await page.locator('h1').click()
    await callsSince(page, mark, [{ method: 'PATCH', path: '/api/todos/1', body: { text: 'Buy soy milk' } }])
    await expect(editInput(page)).toHaveCount(0)
    await expect(labels(page).nth(0)).toHaveText('Buy soy milk')
  })

  await test.step('I4 clear the text and press Enter', async () => {
    const mark = api.mark()
    await startEditing(page, 'Buy soy milk')
    await editInput(page).fill('')
    await editInput(page).press('Enter')
    await callsSince(page, mark, [{ method: 'DELETE', path: '/api/todos/1', body: null }])
    await expect(labels(page)).toHaveText(['Walk the dog'])
  })

  await test.step('I5 destroy Walk the dog', async () => {
    const mark = api.mark()
    const row = items(page).filter({ hasText: 'Walk the dog' })
    await row.hover()
    await row.locator('button.destroy').click()
    await callsSince(page, mark, [{ method: 'DELETE', path: '/api/todos/2', body: null }])
    await expect(items(page)).toHaveCount(0)
  })

  await test.step('I6 read the empty page', async () => {
    await expect(toggleAllBox(page)).toHaveCount(0)
    await expect(page.locator('footer.footer')).toHaveCount(0)
  })
})

test('Procedure J: filtering', async ({ page }) => {
  await load(page)
  await expect(items(page)).toHaveCount(2)
  const url = page.url()

  await test.step('J1 show active', async () => {
    const mark = api.mark()
    await filter(page, 'Active').click()
    await noCallsSince(page, mark)
    await expect(labels(page)).toHaveText(['Buy milk'])
    await expect(filter(page, 'Active')).toHaveClass(/selected/)
    expect(page.url()).toBe(url)
  })

  await test.step('J2 show completed', async () => {
    const mark = api.mark()
    await filter(page, 'Completed').click()
    await noCallsSince(page, mark)
    await expect(labels(page)).toHaveText(['Walk the dog'])
    await expect(filter(page, 'Completed')).toHaveClass(/selected/)
    expect(page.url()).toBe(url)
  })

  await test.step('J3 show all', async () => {
    const mark = api.mark()
    await filter(page, 'All').click()
    await noCallsSince(page, mark)
    await expect(labels(page)).toHaveText(['Buy milk', 'Walk the dog'])
    await expect(filter(page, 'All')).toHaveClass(/selected/)
  })

  await test.step('J4 add while showing active', async () => {
    await filter(page, 'Active').click()
    const mark = api.mark()
    await addTodo(page, 'Read a book')
    await callsSince(page, mark, [{ method: 'POST', path: '/api/todos/', body: { text: 'Read a book' } }])
    await expect(labels(page)).toHaveText(['Buy milk', 'Read a book'])
  })

  await test.step('J5 reload while showing completed', async () => {
    await filter(page, 'Completed').click()
    await load(page)
    await expect(filter(page, 'All')).toHaveClass(/selected/)
    await expect(filter(page, 'Completed')).not.toHaveClass(/selected/)
    expect(page.url()).toBe(url)
  })
})

test('Procedure K: backend failure', async ({ page }) => {
  await test.step('K1 load with the request aborted', async () => {
    api.abortLoads(true)
    await load(page)
    await expect(page.locator('header.header')).toBeVisible()
    await expect(page.locator('ul.todo-list')).toBeVisible()
    await expect(toggleAllBox(page)).toHaveCount(1)
    await expect(page.locator('footer.footer')).toBeVisible()
  })

  await test.step('K2 read the todo list', async () => {
    await expect(labels(page)).toHaveText(['Use Redux'])
    await expect(items(page).nth(0)).not.toHaveClass(/completed/)
    await expect(todoCount(page)).toHaveText('1 item left')
  })

  await test.step('K3 look for an error message on the page', async () => {
    const text = await page.locator('body').innerText()
    expect(text).not.toMatch(/error|failed|failure/i)
  })

  await test.step('K4 read the browser console', async () => {
    await expect.poll(() => consoleErrors.length).toBeGreaterThan(0)
  })
})
