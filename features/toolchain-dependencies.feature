Feature: Toolchain dependencies

# Each removed package is named in the step text, never in an example column:
# a step asserting an absence is true of every value a mutated cell could hold,
# so the column would be unkillable and the scenario could not fail for its own reason.

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
      | test:e2e        |

# toolchain dependencies 3
  Scenario: toolchain dependencies 3
    Then <location> contains no reference to react-shallow-renderer

    Examples:
      | location          |
      | package.json      |
      | package-lock.json |
      | src               |
