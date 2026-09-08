# todo-state-failures
#
# Scenarios in this feature are named "todo-state-failures <n>". The name is a
# stable handle, not a description; the comment above each scenario says what it
# is for.
#
# The one thing the state remembers about a call that failed, and how long it
# remembers it. Which operations record a failure at all is
# todo-state-operations 7; this feature is about the record's own life.
#
# Nothing in the UI reads this record, so no user ever sees any of these states.
# It is specified because it is state the app keeps and this task moves it.
#
# Vocabulary
#   a fresh state                      the state the app holds before anything
#                                      has happened to it
#   the app starts O                   O is dispatched and nothing has answered
#                                      it yet, spelled as in todo-state-operations
#   the backend answers with B         the call completes, B is the body it
#                                      returned, and the operation is left to
#                                      settle before the next step
#   the call fails with error E        the call never completes; E is what ended
#                                      it
#   the recorded failure message is M  the state kept a failure and its message
#                                      is M. The shape it is kept in is not
#                                      specified, only the message
#   no failure is recorded             the state kept none
#   the recorded failure is forgotten  the state is asked to drop what it kept
Feature: Recorded failures

  Background:
    Given a fresh state

  # todo-state-failures 1: a state nothing has happened to has nothing to say
  # about failure.
  Scenario: todo-state-failures 1
    Then no failure is recorded

  # todo-state-failures 2: a call that never completes leaves its message
  # behind.
  Scenario: todo-state-failures 2
    When the app starts loading every todo
    And the call fails with error Failed to fetch
    Then the recorded failure message is Failed to fetch

  # todo-state-failures 3: nothing clears the record, a later success included.
  # It says that a call failed once, not that anything is wrong now. The add
  # here does land, so the success is real and the record survives it anyway.
  Scenario: todo-state-failures 3
    When the app starts loading every todo
    And the call fails with error Failed to fetch
    And the app starts adding the todo Ship it
    And the backend answers with {"id":9,"text":"Ship it","completed":false}
    Then the todo list holds 2 todos
    And the recorded failure message is Failed to fetch

  # todo-state-failures 4: the record is dropped when the state is asked to drop
  # it, and nothing else moves. Nothing asks today: the branch is live and
  # callerless, and this task neither removes it nor gives it a caller.
  Scenario: todo-state-failures 4
    When the app starts loading every todo
    And the call fails with error Failed to fetch
    And the recorded failure is forgotten
    Then no failure is recorded
    And the todo list has not changed
