import { Locator, Page, expect } from '@playwright/test';

export const FILTER_NAMES = ['All', 'Active', 'Completed'] as const;
export type FilterName = (typeof FILTER_NAMES)[number];

/**
 * The element vocabulary of `qa/procedures/README.md`. Selectors are the app's
 * public UI surface (TodoMVC's standard markup), not internals.
 */
export class Screen {
  readonly newTodoField: Locator;
  readonly rows: Locator;
  readonly rowLabels: Locator;
  readonly editingRow: Locator;
  readonly editField: Locator;
  readonly toggleAllCheckbox: Locator;
  readonly toggleAllChevron: Locator;
  readonly count: Locator;
  readonly filterLinks: Locator;
  readonly clearCompleted: Locator;
  readonly footer: Locator;
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.newTodoField = page.locator('.new-todo');
    this.rows = page.locator('.todo-list li');
    this.rowLabels = page.locator('.todo-list li label');
    this.editingRow = page.locator('.todo-list li.editing');
    this.editField = page.locator('.todo-list li.editing input.edit');
    this.toggleAllCheckbox = page.locator('input.toggle-all');
    this.toggleAllChevron = page.locator('.toggle-all + label');
    this.count = page.locator('.todo-count');
    this.filterLinks = page.locator('.filters a');
    this.clearCompleted = page.locator('.clear-completed');
    this.footer = page.locator('.footer');
    this.heading = page.locator('.header h1');
  }

  row(text: string): Locator {
    return this.rows.filter({ has: this.page.getByText(text, { exact: true }) });
  }

  checkboxOf(text: string): Locator {
    return this.row(text).locator('input.toggle');
  }

  labelOf(text: string): Locator {
    return this.row(text).locator('label');
  }

  destroyButtonOf(text: string): Locator {
    return this.row(text).locator('button.destroy');
  }

  filterLink(name: FilterName): Locator {
    return this.filterLinks.filter({ hasText: name });
  }

  async addTodo(text: string): Promise<void> {
    await this.newTodoField.fill(text);
    await this.newTodoField.press('Enter');
  }

  async openEditor(text: string): Promise<void> {
    await this.labelOf(text).dblclick();
  }

  async deleteTodo(text: string): Promise<void> {
    await this.row(text).hover();
    await this.destroyButtonOf(text).click();
  }
}

export async function expectShownComplete(screen: Screen, text: string): Promise<void> {
  await expect(screen.checkboxOf(text)).toBeChecked();
  await expect(screen.labelOf(text)).toHaveCSS('text-decoration-line', 'line-through');
}

export async function expectShownActive(screen: Screen, text: string): Promise<void> {
  await expect(screen.checkboxOf(text)).not.toBeChecked();
  await expect(screen.labelOf(text)).toHaveCSS('text-decoration-line', 'none');
}

export async function expectSelectedFilter(screen: Screen, name: FilterName): Promise<void> {
  await expect(screen.filterLink(name)).toHaveClass(/selected/);
  for (const other of FILTER_NAMES.filter((candidate) => candidate !== name)) {
    await expect(screen.filterLink(other)).not.toHaveClass(/selected/);
  }
}

/** The app has no loading indicator and no error message; a failure is silent. */
export async function expectNoErrorUi(page: Page): Promise<void> {
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/error|failed|failure|loading|retry/i);
}
