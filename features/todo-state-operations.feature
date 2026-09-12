# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-08T19:58:26Z","feature_name":"Todo backend operations","feature_path":"features/todo-state-operations.feature","background_hash":"b417a1730d0c186557c6a7e1d46f2db4eb24e94fc2d1599b25512e9fa5b266dd","implementation_hash":"sha256:0891ec6dc2451674209300d348a84cc52c48e848b5775cd3aac5dda0c74cd8f0","scenarios":[{"index":8,"name":"todo-state-operations 9","scenario_hash":"c1a6360a88f6a1843db86746f894b9a468dff5f504309c84de8b7ff8b2aac6da","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-09-08T19:58:26Z"}]}
# acceptance-mutation-manifest-end

# todo-state-operations
#
# Scenarios in this feature are named "todo-state-operations <n>". The name is a
# stable handle, not a description; the comment above each scenario says what it
# is for.
#
# What the app's state does while one of the five backend operations runs and
# once it settles. What the operation sends and what it makes of an answer is
# todo-api-requests and todo-api-outcomes; this feature starts where those stop,
# at the state a settled operation leaves behind.
#
# Nothing here happens optimistically. Every scenario that starts an operation
# looks at the list while it is in flight, and the list is still the one the
# user was looking at; it changes when, and only when, the backend has answered.
#
# The error column in scenario 8 is a free input, in the practice
# todo-api-requests already records: the message the call fails with is the
# message the record is expected to hold, so a row cannot be written that a
# correct implementation fails. It varies across rows to say that the message
# is carried rather than fixed. The operation and progress columns are not
# free: they are two independent statements about the same row, and either one
# alone goes red when the other moves.
#
# Vocabulary
#   the state starts with the todo list L  a state whose list is exactly L, as
#                                          JSON, in that order
#   the app starts O                       O is dispatched and nothing has
#                                          answered it yet. O is one of:
#                                          loading every todo; adding the todo
#                                          <text>; editing todo <id> to <text>;
#                                          marking todo <id> complete; marking
#                                          todo <id> active; deleting todo <id>
#   the backend answers with B             the call completes, B is the body it
#                                          returned, and the operation is left
#                                          to settle before the next step
#   the backend answers                    the same, for the one operation whose
#                                          answer is never read
#   the call fails with error E            the call never completes; E is what
#                                          ended it
#   S is in flight                         the state shows that work as running.
#                                          S is one of: the load; the add; the
#                                          update of todo <id>
#   no operation is left in flight         nothing is shown as running: no load,
#                                          no add, and no todo updating
#   the todo list has not changed          the list is exactly what the state
#                                          started with
#   the recorded failure message is M      the state kept a failure and its
#                                          message is M. The shape it is kept in
#                                          is not specified, only the message
#   no failure is recorded                 the state kept none
Feature: Todo backend operations

  Background:
    Given the state starts with the todo list [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":true}]

  # todo-state-operations 1: a state that has started nothing shows nothing as
  # running. Every other scenario reads progress against this.
  Scenario: todo-state-operations 1
    Then no operation is left in flight
    And no failure is recorded

  # todo-state-operations 2: a load replaces the whole list with what came back.
  # Until it answers the old list stands, which is why a user who cannot reach
  # the backend keeps looking at the seed.
  Scenario: todo-state-operations 2
    When the app starts loading every todo
    Then the load is in flight
    And the todo list has not changed
    When the backend answers with [{"id":9,"text":"Ship it","completed":false}]
    Then the todo list is [{"id":9,"text":"Ship it","completed":false}]
    And no operation is left in flight
    And no failure is recorded

  # todo-state-operations 3: an add appends the todo the backend returned, not
  # the one that was asked for. The answer here differs from the request in both
  # text and flag, so an implementation that appends what it sent fails.
  Scenario: todo-state-operations 3
    When the app starts adding the todo Ship it
    Then the add is in flight
    And the todo list holds 2 todos
    When the backend answers with {"id":9,"text":"Ship it now","completed":true}
    Then the todo list holds 3 todos
    And the last todo is {"id":9,"text":"Ship it now","completed":true}
    And no operation is left in flight

  # todo-state-operations 4: an edit replaces that todo with what came back,
  # whole. The answer here contradicts the flag the list held, and the answer
  # wins, so an implementation that merges only the text fails. A marking
  # replaces it the same way; that is scenario 9.
  Scenario: todo-state-operations 4
    When the app starts editing todo 2 to Buy oats
    Then the update of todo 2 is in flight
    And the todo list has not changed
    When the backend answers with {"id":2,"text":"Buy oats","completed":false}
    Then the todo list is [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Buy oats","completed":false}]
    And no operation is left in flight

  # todo-state-operations 5: a delete removes the todo once the backend has
  # answered, and not before. There is no body to hand it: a delete never reads
  # its answer, per todo-api-outcomes 2.
  Scenario: todo-state-operations 5
    When the app starts deleting todo 1
    Then the update of todo 1 is in flight
    And the todo list has not changed
    When the backend answers
    Then the todo list is [{"id":2,"text":"Write tests","completed":true}]
    And no operation is left in flight

  # todo-state-operations 6: an answer naming a todo the list does not hold
  # changes nothing. A confirmation can outlive the todo it was about.
  Scenario: todo-state-operations 6
    When the app starts editing todo 9 to Buy oats
    And the backend answers with {"id":9,"text":"Buy oats","completed":false}
    Then the todo list has not changed
    And no operation is left in flight

  # todo-state-operations 7: two todos can be updating at once. Progress is kept
  # per todo, not one at a time.
  Scenario: todo-state-operations 7
    When the app starts deleting todo 1
    And the app starts editing todo 2 to Buy oats
    Then the update of todo 1 is in flight
    And the update of todo 2 is in flight

  # todo-state-operations 8: a call that never completes leaves the list alone,
  # stops showing progress, and records what ended it. All five operations
  # behave the same way, which is why the operation is a column.
  Scenario Outline: todo-state-operations 8
    When the app starts <operation>
    Then <progress> is in flight
    When the call fails with error <error>
    Then the todo list has not changed
    And no operation is left in flight
    And the recorded failure message is <error>

    Examples:
      | operation                  | progress             | error           |
      | loading every todo         | the load             | Failed to fetch |
      | adding the todo Ship it    | the add              | network down    |
      | editing todo 2 to Buy oats | the update of todo 2 | Failed to fetch |
      | marking todo 2 complete    | the update of todo 2 | it broke        |
      | deleting todo 1            | the update of todo 1 | Failed to fetch |

  # todo-state-operations 9: a marking replaces that todo with what came back,
  # whole, the way scenario 4's edit does, and it runs in both directions. It is
  # numbered last so the handles above it do not move; it belongs beside 4.
  # Until it existed the vocabulary could only ask for one half of an operation
  # the app has both halves of.
  #
  # The flag column is a free input, declared. State-side the two directions
  # differ only in what is sent, and what is sent is todo-api-requests 4, which
  # already covers both values; here the answer decides the list. It is a column
  # so that both phrasings exist and both are driven, rather than one of them
  # being unreachable from any scenario.
  Scenario Outline: todo-state-operations 9
    When the app starts marking todo <id> <flag>
    Then the update of todo <id> is in flight
    And the todo list has not changed
    When the backend answers with <answer>
    Then the todo list is <list>
    And no operation is left in flight

    Examples:
      | id | flag     | answer                                          | list                                                                                            |
      | 1  | complete | {"id":1,"text":"Buy milk","completed":true}     | [{"id":1,"text":"Buy milk","completed":true},{"id":2,"text":"Write tests","completed":true}]    |
      | 2  | active   | {"id":2,"text":"Write tests","completed":false} | [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":false}]  |
