Feature: Toolchain dependencies

# toolchain dependencies 1
  Scenario: toolchain dependencies 1
    Then <location> contains no reference to react-scripts

    Examples:
      | location          |
      | package.json      |
      | package-lock.json |
      | src               |

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
