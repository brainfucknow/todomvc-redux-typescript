# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-08T08:15:15Z","feature_name":"Todo API outcome interpretation","feature_path":"features/todo-api-outcomes.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"sha256:7f18c37660fc0d223a7b21680ef9a490a862d22a75fd7403d90ef17367dc7a4f","scenarios":[]}
# acceptance-mutation-manifest-end

# todo-api-outcomes
#
# Scenarios in this feature are named "todo-api-outcomes <n>". The name is a
# stable handle, not a description; the comment above each scenario says what it
# is for.
#
# What the client makes of an answer, once a request built by todo-api-requests
# has been sent. The sending itself is not this feature's business: the client
# is told what came back.
#
# Vocabulary
#   answered with status S and body B   the call completed and the server
#                                       returned that status and those bytes
#   the call fails with error E         the call never completed; E is what
#                                       ended it
#   the outcomes are A then B           exactly two outcomes, in that order,
#                                       and no others
#   the ... outcome fields              the operation's own fields carried on
#                                       that outcome, written here as JSON
#   the success outcome json            the value the client parsed out of the
#                                       response body
#   carries no parsed body              nothing from the response rides along,
#                                       because it was never read
Feature: Todo API outcome interpretation

  # todo-api-outcomes 1: an operation that reads its answer. The parsed body
  # rides along with the operation's own fields.
  #
  # The status column varies deliberately: the client never looks at it, so a
  # 500 carrying a well-formed body succeeds exactly like a 200. That is a
  # defect, characterized here rather than fixed.
  Scenario Outline: todo-api-outcomes 1
    When the add call for the todo <text> is answered with status <status> and body <body>
    Then the outcomes are POST_TODO_REQUEST then POST_TODO_SUCCESS
    And the request outcome fields are {"text":"<text>"}
    And the success outcome fields are {"text":"<text>"}
    And the success outcome json is <body>

    Examples:
      | text        | status | body                                          |
      | Buy milk    | 200    | {"id":7,"text":"Buy milk","completed":false}   |
      | Write tests | 500    | {"id":8,"text":"Write tests","completed":true} |

  # todo-api-outcomes 2: the one operation that never reads its answer. Neither
  # the status nor the body can change what it reports, so both columns vary
  # and neither is asserted on.
  Scenario Outline: todo-api-outcomes 2
    When the delete call for todo 1 is answered with status <status> and body <body>
    Then the outcomes are DELETE_TODO_REQUEST then DELETE_TODO_SUCCESS
    And the success outcome fields are {"id":1}
    And the success outcome carries no parsed body

    Examples:
      | status | body                                        |
      | 200    | {"id":1,"text":"Buy milk","completed":false} |
      | 500    | boom                                        |

  # todo-api-outcomes 3: an operation that reads its answer fails when the body
  # will not parse, whatever the status says.
  Scenario Outline: todo-api-outcomes 3
    When the load call is answered with status <status> and body <body>
    Then the outcomes are LOAD_TODO_REQUEST then LOAD_TODO_FAILURE
    And the failure outcome fields are {}

    Examples:
      | status | body                  |
      | 200    | boom                  |
      | 500    | Internal Server Error |

  # todo-api-outcomes 4: a call that never completes. The failure carries what
  # ended it, next to the operation's own fields, and the client reports rather
  # than throws.
  Scenario Outline: todo-api-outcomes 4
    When the edit call for todo <id> to <text> fails with error <error>
    Then the outcomes are PATCH_TODO_REQUEST then PATCH_TODO_FAILURE
    And the request outcome fields are {"id":<id>,"text":"<text>"}
    And the failure outcome fields are {"id":<id>,"text":"<text>"}
    And the failure outcome error is <error>

    Examples:
      | id | text        | error           |
      | 1  | Buy milk    | Failed to fetch |
      | 42 | Write tests | network down    |
