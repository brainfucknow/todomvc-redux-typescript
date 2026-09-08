# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-08T08:14:29Z","feature_name":"Todo API request construction","feature_path":"features/todo-api-requests.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"sha256:d16c3906c1f1b0fafd15391324e076f25e6d1b6b91c154df4b4ca5b3ba9ae789","scenarios":[{"index":1,"name":"todo-api-requests 2","scenario_hash":"97cd52b99ac302134c4c48f77adec5ce0cbc5ad18daf05bf4ee03e734ae248b6","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-09-08T08:14:29Z"}]}
# acceptance-mutation-manifest-end

# todo-api-requests
#
# Scenarios in this feature are named "todo-api-requests <n>". The name is a
# stable handle, not a description; the comment above each scenario says what it
# is for.
#
# One user-level operation becomes one HTTP request plus three outcome names.
# This feature covers what the client builds. What it makes of the answer is
# todo-api-outcomes; what it refuses to build is todo-api-refusals.
#
# Vocabulary
#   the request path        the URL the client asks for, exactly as written; it
#                           is relative, so it resolves against the document URL
#   the request body        the bytes sent, compared as text, not as parsed JSON
#   sends no body           no request body at all
#   the outcome names       the three names the client reports progress under,
#                           in this order: started, succeeded, failed
#   the outcome fields      the operation's own fields, carried on every outcome,
#                           written here as JSON
#   reads / leaves unread   whether the client parses the response body at all
Feature: Todo API request construction

  # todo-api-requests 1: loading every todo. Trailing slash, no method of its
  # own, and no content type, because it sends nothing.
  Scenario: todo-api-requests 1
    When the client builds the request to load every todo
    Then the request method is GET
    And the request path is api/todos/
    And the request accept header is application/json
    And the request has no content type header
    And the request sends no body
    And the outcome names are LOAD_TODO_REQUEST, LOAD_TODO_SUCCESS and LOAD_TODO_FAILURE
    And the outcome fields are {}
    And the client reads the response body

  # todo-api-requests 2: adding a todo. Same trailing slash as the load. The
  # last row is the one that tells JSON encoding apart from string pasting.
  Scenario Outline: todo-api-requests 2
    When the client builds the request to add the todo <text>
    Then the request method is POST
    And the request path is api/todos/
    And the request accept header is application/json
    And the request content type header is application/json
    And the request body is <body>
    And the outcome names are POST_TODO_REQUEST, POST_TODO_SUCCESS and POST_TODO_FAILURE
    And the outcome fields are {"text":"<text>"}
    And the client reads the response body

    Examples:
      | text         | body                       |
      | Buy milk     | {"text":"Buy milk"}        |
      | Write tests  | {"text":"Write tests"}     |
      | He said "hi" | {"text":"He said \"hi\""}  |

  # todo-api-requests 3: editing a todo's text. Per-id path, no trailing slash,
  # and the body carries the text alone.
  Scenario Outline: todo-api-requests 3
    When the client builds the request to edit todo <id> to <text>
    Then the request method is PATCH
    And the request path is api/todos/<id>
    And the request accept header is application/json
    And the request content type header is application/json
    And the request body is <body>
    And the outcome names are PATCH_TODO_REQUEST, PATCH_TODO_SUCCESS and PATCH_TODO_FAILURE
    And the outcome fields are {"id":<id>,"text":"<text>"}
    And the client reads the response body

    Examples:
      | id | text        | body                   |
      | 1  | Buy milk    | {"text":"Buy milk"}    |
      | 42 | Write tests | {"text":"Write tests"} |

  # todo-api-requests 4: completing or reactivating a todo. Same outcome names
  # as an edit, and the body carries the flag alone.
  Scenario Outline: todo-api-requests 4
    When the client builds the request to set todo <id> completed to <completed>
    Then the request method is PATCH
    And the request path is api/todos/<id>
    And the request accept header is application/json
    And the request content type header is application/json
    And the request body is <body>
    And the outcome names are PATCH_TODO_REQUEST, PATCH_TODO_SUCCESS and PATCH_TODO_FAILURE
    And the outcome fields are {"id":<id>,"completed":<completed>}
    And the client reads the response body

    Examples:
      | id | completed | body                 |
      | 1  | true      | {"completed":true}   |
      | 42 | false     | {"completed":false}  |

  # todo-api-requests 5: deleting a todo. It announces a content type it never
  # uses, and it is the one operation whose answer is never read.
  Scenario Outline: todo-api-requests 5
    When the client builds the request to delete todo <id>
    Then the request method is DELETE
    And the request path is api/todos/<id>
    And the request accept header is application/json
    And the request content type header is application/json
    And the request sends no body
    And the outcome names are DELETE_TODO_REQUEST, DELETE_TODO_SUCCESS and DELETE_TODO_FAILURE
    And the outcome fields are {"id":<id>}
    And the client leaves the response body unread

    Examples:
      | id |
      | 1  |
      | 42 |
