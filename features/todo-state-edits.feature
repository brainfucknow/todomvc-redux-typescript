# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-08T12:00:45Z","feature_name":"Todo list edits","feature_path":"features/todo-state-edits.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"sha256:012dff0a78d7fa0d3ff3206259f29f324893e98f5c14bcc801af2485da48f59a","scenarios":[]}
# acceptance-mutation-manifest-end

# todo-state-edits
#
# Scenarios in this feature are named "todo-state-edits <n>". The name is a
# stable handle, not a description; the comment above each scenario says what it
# is for.
#
# What the todo list becomes when the app changes it on its own, deciding the
# whole change itself. What it becomes when a backend operation completes is
# todo-state-operations.
#
# Two of these edits have a caller today: toggling every todo and clearing the
# completed ones. Adding, deleting, editing and marking a single todo reach the
# backend instead, so their local rules are live branches with no caller. They
# are specified anyway, because they are behavior this project carries and
# because scenarios 2 and 3 are the only place an id is ever allocated.
#
# Vocabulary
#   a fresh state                          the state the app holds before
#                                          anything has happened to it
#   the state starts with the todo list L  a state whose list is exactly L, as
#                                          JSON, in that order
#   locally                                decided by the app alone: nothing is
#                                          sent, nothing is waited for
#   the todo list is L                     the whole list, in order, as JSON
#   the last todo is T                     the final entry of the list, as JSON
#   reads complete / reads active          the todo's completed flag is true /
#                                          is false
#   marked completed true / false          set to that value, which is not the
#                                          same as toggled
Feature: Todo list edits

  # todo-state-edits 1: what the app holds before anything loads. The seed is
  # one real todo, not an empty list, and a user meets it whenever a load fails.
  Scenario: todo-state-edits 1
    Given a fresh state
    Then the todo list is [{"id":0,"text":"Use Redux","completed":false}]

  # todo-state-edits 2: a new todo takes one more than the highest id in the
  # list, which is not the same as one more than its length. The third row is
  # the one that tells those two rules apart.
  Scenario Outline: todo-state-edits 2
    Given the state starts with the todo list <todos>
    When a todo Write more is added locally
    Then the last todo is {"id":<id>,"text":"Write more","completed":false}
    And the todo list holds <count> todos

    Examples:
      | todos                                                                                         | id | count |
      | []                                                                                            | 0  | 1     |
      | [{"id":0,"text":"Buy milk","completed":false}]                                                | 1  | 2     |
      | [{"id":5,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":true}] | 6  | 3     |

  # todo-state-edits 3: the id rule holds across a clear, so an id that was
  # cleared away is not handed out again.
  Scenario: todo-state-edits 3
    Given the state starts with the todo list [{"id":0,"text":"Use Redux","completed":false},{"id":1,"text":"Write tests","completed":false}]
    When todo 0 is marked completed true locally
    And the completed todos are cleared
    And a todo Write more is added locally
    Then the todo list is [{"id":1,"text":"Write tests","completed":false},{"id":2,"text":"Write more","completed":false}]

  # todo-state-edits 4: editing changes one todo's text and nothing else, its
  # completed flag included.
  Scenario: todo-state-edits 4
    Given the state starts with the todo list [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":true}]
    When todo 2 is edited locally to Buy oats
    Then the todo list is [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Buy oats","completed":true}]

  # todo-state-edits 5: marking one todo writes that todo's flag and leaves the
  # rest of the list alone.
  Scenario: todo-state-edits 5
    Given the state starts with the todo list [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":true}]
    When todo 1 is marked completed true locally
    Then the todo list is [{"id":1,"text":"Buy milk","completed":true},{"id":2,"text":"Write tests","completed":true}]

  # todo-state-edits 6: marking writes the value it is given. A todo that is
  # already complete stays complete, which is what tells this apart from a
  # toggle.
  Scenario: todo-state-edits 6
    Given the state starts with the todo list [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":true}]
    When todo 2 is marked completed true locally
    Then the todo list is [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":true}]

  # todo-state-edits 7: toggling asks one question - is every todo complete? -
  # and writes its negation to all of them. The second row is the only row that
  # answers yes, and the third shows that one complete todo is not enough.
  Scenario Outline: todo-state-edits 7
    Given the state starts with the todo list <todos>
    When every todo is toggled
    Then every todo in the list reads <state>
    And the todo list holds 2 todos

    Examples:
      | todos                                                                                          | state    |
      | [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":false}] | complete |
      | [{"id":1,"text":"Buy milk","completed":true},{"id":2,"text":"Write tests","completed":true}]   | active   |
      | [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":true}]  | complete |

  # todo-state-edits 8: clearing keeps the todos that are not complete, with the
  # ids they already had, and drops the rest.
  Scenario: todo-state-edits 8
    Given the state starts with the todo list [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":true}]
    When the completed todos are cleared
    Then the todo list is [{"id":1,"text":"Buy milk","completed":false}]

  # todo-state-edits 9: deleting removes the todo with that id and leaves the
  # rest in place.
  Scenario: todo-state-edits 9
    Given the state starts with the todo list [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":true}]
    When todo 1 is deleted locally
    Then the todo list is [{"id":2,"text":"Write tests","completed":true}]
