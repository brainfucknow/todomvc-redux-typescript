import type { StepDefinition, StepSuite } from '../runtime'
import { todoApiSteps, type TodoApiWorld } from './todo-api'
import { todoInputSteps, type TodoInputWorld } from './todo-input'
import { todoStateSteps, type TodoStateWorld } from './todo-state'

/**
 * The one step vocabulary the generated entry points run against, made of three
 * families that share no world: `todo-api-*` drives the todo API client
 * directly, `todo-state-*` drives the store the app builds, and `todo-input-*`
 * drives the text-input rules the components ask.
 *
 * An execution gets every world and each definition is handed its own, so no
 * family can read another's state by accident. Routing is still the runtime's,
 * by pattern: the three vocabularies are disjoint, and a step that matched in
 * more than one of them would be reported as ambiguous rather than run twice.
 */
interface ProjectWorld {
  api: TodoApiWorld
  input: TodoInputWorld
  state: TodoStateWorld
}

const inWorld = <W>(
  choose: (world: ProjectWorld) => W,
  definitions: StepDefinition<W>[],
): StepDefinition<ProjectWorld>[] =>
  definitions.map(({ pattern, handle }) => ({
    pattern,
    handle: (context, ...captures) =>
      handle({ ...context, world: choose(context.world) }, ...captures),
  }))

export const projectSteps: StepSuite<ProjectWorld> = {
  createWorld: () => ({
    api: todoApiSteps.createWorld(),
    input: todoInputSteps.createWorld(),
    state: todoStateSteps.createWorld(),
  }),
  definitions: [
    ...inWorld((world) => world.api, todoApiSteps.definitions),
    ...inWorld((world) => world.input, todoInputSteps.definitions),
    ...inWorld((world) => world.state, todoStateSteps.definitions),
  ],
}
