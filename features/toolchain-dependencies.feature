Feature: Toolchain dependencies

# toolchain dependencies 1
  Scenario: toolchain dependencies 1
    Then <location> contains no reference to <package>

    Examples:
      | location          | package                |
      | package.json      | react-scripts          |
      | package-lock.json | react-scripts          |
      | src               | react-scripts          |
      | package.json      | react-shallow-renderer |
      | package-lock.json | react-shallow-renderer |
      | src               | react-shallow-renderer |

# toolchain dependencies 2
  Scenario: toolchain dependencies 2
    Then npm run <script> is an available command

    Examples:
      | script          |
      | dev             |
      | build           |
      | preview         |
      | test            |
      | test:acceptance |
      | test:property   |
      | test:hardening  |
      | test:mutation   |
      | test:e2e        |
