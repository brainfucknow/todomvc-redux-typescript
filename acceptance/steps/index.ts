import type { StepDefinition, StepSuite } from '../runtime'
import { todoApiSteps, type TodoApiWorld } from './todo-api'
import {
  todoInputCommitsSteps,
  type TodoInputCommitsWorld,
} from './todo-input-commits'
import {
  todoInputEffectsSteps,
  type TodoInputEffectsWorld,
} from './todo-input-effects'
import { todoStateSteps, type TodoStateWorld } from './todo-state'

/**
 * The one step vocabulary the generated entry points run against, assembled
 * from the files in this directory. One file per world, and a world is whatever
 * one module under test needs remembering between steps: `todo-api-*` drives
 * the todo API client, `todo-state-*` drives the store the app builds, and the
 * two `todo-input-*` features drive the two text-input rule modules. That last
 * family is one family in two vocabularies because its two feature files cut
 * the pipeline in half - one stops at the text a field hands on, the other
 * starts there - and neither half remembers anything the other reads.
 *
 * An execution gets every world and each definition is handed its own, so no
 * vocabulary can read another's state by accident. Routing is still the
 * runtime's, by pattern: the vocabularies are disjoint, and a step that matched
 * in more than one of them would be reported as ambiguous rather than run twice.
 */
interface ProjectWorld {
  api: TodoApiWorld
  inputCommits: TodoInputCommitsWorld
  inputEffects: TodoInputEffectsWorld
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
    inputCommits: todoInputCommitsSteps.createWorld(),
    inputEffects: todoInputEffectsSteps.createWorld(),
    state: todoStateSteps.createWorld(),
  }),
  definitions: [
    ...inWorld((world) => world.api, todoApiSteps.definitions),
    ...inWorld(
      (world) => world.inputCommits,
      todoInputCommitsSteps.definitions,
    ),
    ...inWorld(
      (world) => world.inputEffects,
      todoInputEffectsSteps.definitions,
    ),
    ...inWorld((world) => world.state, todoStateSteps.definitions),
  ],
}
