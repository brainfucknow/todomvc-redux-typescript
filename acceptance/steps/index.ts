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

// One file per world, and each definition is handed only its own, so no vocabulary
// can read another's state. A step file decides nothing: every question a feature
// asks is answered by `src/`.
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
