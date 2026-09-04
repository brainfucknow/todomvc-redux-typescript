Feature: Production build

  Background:
    Given the project has been built for production
    And the preview server is serving the build output
    And a client has requested /

# production build 1
  Scenario: production build 1
    Then the response status is 200
    And the response body contains <content>

    Examples:
      | content               |
      | class="todoapp"       |
      | id="root"             |
      | Redux TodoMVC Example |

# production build 2
  Scenario: production build 2
    When a client requests every script and stylesheet referenced by the index page
    Then every referenced asset responds with status 200

# production build 3
  Scenario: production build 3
    Then the response body does not contain /src/index.tsx
