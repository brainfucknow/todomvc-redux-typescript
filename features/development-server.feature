Feature: Development server

  Background:
    Given the development server is running

# development server 1
  Scenario: development server 1
    When a client requests /
    Then the response status is 200
    And the response body contains <content>

    Examples:
      | content               |
      | class="todoapp"       |
      | id="root"             |
      | /src/index.tsx        |
      | Redux TodoMVC Example |
