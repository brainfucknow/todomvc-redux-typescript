import type { StepDefinition, StepSuite } from '../runtime'
import { todoApiSteps, type TodoApiWorld } from './todo-api'
import { todoStateSteps, type TodoStateWorld } from './todo-state'

/**
 * The one step vocabulary the generated entry points run against, made of two
 * families that share no world: `todo-api-*` drives the todo API client
 * directly, and `todo-state-*` drives the store the app builds.
 *
 * An execution gets both worlds and each definition is handed its own, so
 * neither family can read the other's state by accident. Routing is still the
 * runtime's, by pattern: the two vocabularies are disjoint, and a step that
 * matched in both halves would be reported as ambiguous rather than run twice.
 */
interface ProjectWorld {
  api: TodoApiWorld
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
    state: todoStateSteps.createWorld(),
  }),
  definitions: [
    ...inWorld((world) => world.api, todoApiSteps.definitions),
    ...inWorld((world) => world.state, todoStateSteps.definitions),
  ],
}
