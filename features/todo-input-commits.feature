# todo-input-commits
#
# Scenarios in this feature are named "todo-input-commits <n>". The name is a
# stable handle, not a description; the comment above each scenario says what it
# is for.
#
# What a todo text field hands on, and when. Two fields ask the same questions
# and get different answers: the new-todo field a todo is typed into, and the
# edit field an existing todo's text is changed in. What the handed-on text then
# does is todo-input-effects; this feature stops at the text.
#
# The field decides nothing about emptiness. It commits what the rule gives it,
# empty or not, and clearing is decided by which field it is rather than by
# whether the commit will be accepted. Scenario 2's second row is that.
#
# Enter trims and losing focus does not. That asymmetry is what scenarios 2 and
# 4 hold in place: a text committed by Enter has its surrounding spaces dropped
# and the same text committed by losing focus keeps them. It is recorded as
# observed, not as intended.
#
# Two free inputs, declared. Scenario 4's committed column is the text every
# assertion in the row expects back, in the practice todo-api-requests already
# records for its id column; it varies across rows to say the text is carried
# untouched rather than fixed, and every row goes red against a field that trims
# here. Scenario 6's two columns are both free, and unavoidably so: the claim is
# that no key but Enter commits anything, in either field, so no cell can be
# written that a correct implementation fails. They vary to name the class.
#
# Vocabulary
#   the new-todo field    the field a new todo is typed into
#   the edit field        the field an existing todo's text is changed in
#   holds T               the text the field currently holds. T is written as
#                         JSON, so surrounding spaces are visible
#   opened on T           the field is put on screen for the text T. In an
#                         examples cell, undefined is the JavaScript value of
#                         that name, not the text, and is what a field opened on
#                         no text at all is given
#   the text T is committed   the field hands T on, exactly. What T then does is
#                         todo-input-effects
#   nothing is committed  the field hands nothing on
#   the field is cleared  the field is left holding ""
#   the field is left as it is    the commit does not empty the field: it still
#                         holds exactly what it held. Whether the field is still
#                         on screen afterwards is todo-input-effects, not this
Feature: Todo text field commits

  # todo-input-commits 1: what a field holds before anyone types. An edit field
  # opens on the todo's text; the new-todo field is opened on no text at all,
  # which is the second row, and holds the empty string rather than nothing.
  Scenario Outline: todo-input-commits 1
    Given a field is opened on <text>
    Then the field starts holding <held>

    Examples:
      | text       | held       |
      | "Buy milk" | "Buy milk" |
      | undefined  | ""         |

  # todo-input-commits 2: Enter on the new-todo field commits the trimmed text
  # and empties the field. The second row is the one that says there is no
  # emptiness check here: a field of spaces commits the empty string and clears
  # just the same, which is why typing spaces and pressing Enter empties the
  # field while adding nothing.
  Scenario Outline: todo-input-commits 2
    Given the new-todo field holds <held>
    When the Enter key is pressed
    Then the text <committed> is committed
    And the field is cleared

    Examples:
      | held          | committed |
      | "  Ship it  " | "Ship it" |
      | "   "         | ""        |

  # todo-input-commits 3: Enter on the edit field trims the same way and leaves
  # the field alone. Only the new-todo field clears.
  Scenario: todo-input-commits 3
    Given the edit field holds "  Buy oats  "
    When the Enter key is pressed
    Then the text "Buy oats" is committed
    And the field is left as it is

  # todo-input-commits 4: losing focus on the edit field commits the text
  # exactly as typed, spaces and all. This is the other half of the asymmetry:
  # the same two texts committed by Enter in scenarios 2 and 3 arrive trimmed.
  Scenario Outline: todo-input-commits 4
    Given the edit field holds <committed>
    When the field loses focus
    Then the text <committed> is committed
    And the field is left as it is

    Examples:
      | committed      |
      | "  Buy oats  " |
      | "   "          |

  # todo-input-commits 5: losing focus on the new-todo field commits nothing, so
  # a half-typed todo survives a click elsewhere.
  Scenario: todo-input-commits 5
    Given the new-todo field holds "  Ship it  "
    When the field loses focus
    Then nothing is committed
    And the field is left as it is

  # todo-input-commits 6: Enter is the only key that commits. Escape in
  # particular does nothing in either field - it neither cancels an edit nor
  # clears the new-todo field, which is a departure from the TodoMVC reference
  # and is what this app does. The keys here are ones that move nothing else:
  # Tab is not among them because moving focus is what scenarios 4 and 5 are
  # about, and a row for it would be asserting two rules at once.
  Scenario Outline: todo-input-commits 6
    Given the <kind> field holds "Ship it"
    When the <key> key is pressed
    Then nothing is committed
    And the field is left as it is

    Examples:
      | kind     | key     |
      | new-todo | Escape  |
      | edit     | Escape  |
      | edit     | ArrowUp |
