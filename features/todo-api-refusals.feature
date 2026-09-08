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
