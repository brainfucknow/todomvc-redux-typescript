# todo-state-filter
#
# Scenarios in this feature are named "todo-state-filter <n>". The name is a
# stable handle, not a description; the comment above each scenario says what it
# is for.
#
# Which todos the app is showing. The filter is looked at through what it makes
# visible rather than through the value it stores, because the value is a name
# only this app uses and the choice of name is not behavior.
#
# Vocabulary
#   the state starts with the todo list L  a state whose list is exactly L, as
#                                          JSON, in that order
#   the F filter is chosen                 F is one of all, active, completed -
#                                          the three the footer offers
#   the visible todos are T                the texts of the todos the app shows,
#                                          in order, as JSON. This is read the
#                                          way the app reads it, through the
#                                          selector the list already uses, so a
#                                          filter recorded somewhere the
#                                          selector cannot see fails here
Feature: Visibility filter

  Background:
    Given the state starts with the todo list [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":true}]

  # todo-state-filter 1: before anything is chosen, every todo is visible.
  Scenario: todo-state-filter 1
    Then the visible todos are ["Buy milk","Write tests"]

  # todo-state-filter 2: choosing a filter decides which todos are visible. The
  # all row is the choice the app already starts with, made explicitly.
  Scenario Outline: todo-state-filter 2
    When the <filter> filter is chosen
    Then the visible todos are <visible>

    Examples:
      | filter    | visible                    |
      | all       | ["Buy milk","Write tests"] |
      | active    | ["Buy milk"]               |
      | completed | ["Write tests"]            |
