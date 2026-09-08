# todo-input-effects
#
# Scenarios in this feature are named "todo-input-effects <n>". The name is a
# stable handle, not a description; the comment above each scenario says what it
# is for.
#
# What a committed text does. todo-input-commits stops at the text a field hands
# on; this feature starts there. What the resulting change then does to the todo
# list is todo-state-edits and todo-state-operations.
#
# One text, two answers. An empty commit from the new-todo field is refused and
# nothing is asked for; an empty commit from the edit field deletes the todo.
# Both are current behavior and neither is derived from the other, which is why
# scenarios 2 and 4 are separate claims rather than rows of one table.
#
# Emptiness is length, not blankness. Nothing on this side trims, so a text of
# spaces is a text: scenario 3's second row edits a todo to three spaces where a
# trimming rule would have deleted it. A field of spaces reaches this side as
# the empty string only when Enter trimmed it first, per todo-input-commits 2.
#
# One free input, declared. Scenario 3's text column is the text the assertion
# expects back, in the practice todo-api-requests records for its id column. It
# varies across rows to say the text is carried untouched, and both rows go red
# against a rule that trims before measuring.
#
# Vocabulary
#   the text T is committed from the new-todo field   the new-todo field handed
#                         T on. T is written as JSON, so surrounding spaces are
#                         visible
#   ... from the edit field for todo <id>   the same, for the field open on that
#                         todo
#   the todo T is added   the app asks for a new todo whose text is T
#   no todo is added      it asks for none
#   todo <id> is edited to T / no todo is edited      likewise, for an edit
#   todo <id> is deleted / no todo is deleted         likewise, for a delete
#   the editor is closed  the todo is no longer being edited
Feature: Todo committed text effects

  # todo-input-effects 1: a text from the new-todo field is asked for as a new
  # todo, exactly as committed.
  Scenario: todo-input-effects 1
    When the text "Ship it" is committed from the new-todo field
    Then the todo "Ship it" is added

  # todo-input-effects 2: an empty text from the new-todo field is refused. The
  # app asks for nothing at all; it does not add an empty todo and then remove
  # it.
  Scenario: todo-input-effects 2
    When the text "" is committed from the new-todo field
    Then no todo is added

  # todo-input-effects 3: a text from the edit field changes that todo's text
  # and closes the editor. The second row is a text of three spaces, which is
  # not empty and so is saved as it stands.
  Scenario Outline: todo-input-effects 3
    When the text <text> is committed from the edit field for todo 2
    Then todo 2 is edited to <text>
    And no todo is deleted
    And the editor is closed

    Examples:
      | text       |
      | "Buy oats" |
      | "   "      |

  # todo-input-effects 4: an empty text from the edit field deletes the todo
  # instead of saving it, and closes the editor the same way a save does.
  Scenario: todo-input-effects 4
    When the text "" is committed from the edit field for todo 2
    Then todo 2 is deleted
    And no todo is edited
    And the editor is closed
