import { expect, test } from './support/app-test';

// Procedure qa/procedures/04-add-todo-text-rules.md
test('the new-todo field trims, discards blank input, and ignores Escape', async ({ openApp, screen }) => {
  await openApp('EMPTY');
  await expect(screen.rows).toHaveCount(0);

  await screen.addTodo('   Buy milk   ');
  await expect(screen.rows).toHaveCount(1);
  await expect(screen.rowLabels).toHaveText(['Buy milk']);

  await screen.addTodo('   ');
  await expect(screen.newTodoField).toHaveValue('');
  await expect(screen.rows).toHaveCount(1);
  await expect(screen.count).toHaveText('1 item left');

  await screen.newTodoField.fill('Ship it');
  await screen.newTodoField.press('Escape');
  await screen.heading.click();

  await expect(screen.rows).toHaveCount(1);
  await expect(screen.newTodoField).toHaveValue('Ship it');
});
