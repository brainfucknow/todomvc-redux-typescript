Feature: TypeScript compilation

# typescript compilation 1
  Scenario: typescript compilation 1
    When the TypeScript compiler checks the project
    Then the compiler reports no errors

# typescript compilation 2
  Scenario: typescript compilation 2
    Then the TypeScript compiler major version is at least 5
