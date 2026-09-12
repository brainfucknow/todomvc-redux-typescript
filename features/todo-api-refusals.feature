# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-08T08:15:21Z","feature_name":"Todo API refusals","feature_path":"features/todo-api-refusals.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"sha256:bc9b60c701a82eed9c2d3b2ba0c37f7596a56fc9daf42c3f077254e2214a28ab","scenarios":[{"index":0,"name":"todo-api-refusals 1","scenario_hash":"5aa9938d3269e3ff27a723bfb0a4f4bb176763e44a835d7d2e4c7e3bccec0671","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-09-08T08:15:21Z"}]}
# acceptance-mutation-manifest-end

# todo-api-refusals
#
# Scenarios in this feature are named "todo-api-refusals <n>". The name is a
# stable handle, not a description; the comment above each scenario says what it
# is for.
#
# The two things the client refuses outright. A refusal is not a failure
# outcome: nothing is sent and nothing is reported.
#
# Vocabulary
#   refuses with M       the client raises an error whose message is exactly M
#   null / undefined     in an examples cell, the JavaScript value of that name,
#                        not the text
#   a JSON cell          in the outcome names column, the value written as JSON
Feature: Todo API refusals

  # todo-api-refusals 1: completing a todo with no flag to set. The check is
  # loose, so undefined is refused as well as null.
  Scenario Outline: todo-api-refusals 1
    When the client builds the request to set todo 1 completed to <completed>
    Then the client refuses with Expected completed to be non null
    And no request is built

    Examples:
      | completed |
      | null      |
      | undefined |

  # todo-api-refusals 2: running a call whose outcome names are not three
  # strings. Refused before anything is sent or reported.
  Scenario Outline: todo-api-refusals 2
    When the client is asked to run a call whose outcome names are <names>
    Then the client refuses with Expected an array of three string types.
    And no call is made
    And no outcome is produced

    Examples:
      | names                                                             |
      | ["LOAD_TODO_REQUEST","LOAD_TODO_SUCCESS"]                         |
      | ["LOAD_TODO_REQUEST","LOAD_TODO_SUCCESS","LOAD_TODO_FAILURE","X"] |
      | ["LOAD_TODO_REQUEST","LOAD_TODO_SUCCESS",3]                       |
      | "LOAD_TODO_REQUEST"                                               |
