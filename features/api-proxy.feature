Feature: API proxy

  Background:
    Given the todo backend on port 4000 replies to <path> with <stub_body>
    And the development server is running

# api proxy 1
  Scenario: api proxy 1
    When a client requests <path>
    Then the response status is 200
    And the response body equals <expected_body>

    Examples:
      | path         | stub_body                                       | expected_body                                   |
      | /api/todos/  | [{"id":1,"text":"Use Redux","completed":false}] | [{"id":1,"text":"Use Redux","completed":false}] |
      | /api/todos/1 | {"id":1,"text":"Use Redux","completed":true}    | {"id":1,"text":"Use Redux","completed":true}    |
