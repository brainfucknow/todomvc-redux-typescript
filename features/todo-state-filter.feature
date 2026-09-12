# mutation-stamp: sha256=893362bf94e4f8d1467e96e1ef9d1dc9a58eb0966bf2cf27268c753e7abd613a
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-08T11:59:31Z","feature_name":"Visibility filter","feature_path":"features/todo-state-filter.feature","background_hash":"b417a1730d0c186557c6a7e1d46f2db4eb24e94fc2d1599b25512e9fa5b266dd","implementation_hash":"sha256:612ebbecc0e40fc8fd93505829034dbaa2771461eacd634a1455ed918e8073b7","scenarios":[{"index":1,"name":"todo-state-filter 2","scenario_hash":"45bbe36ffd7bad0439bd9f43f175ce196d44163b3c44f1f2c9fe2d89a2064eb9","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-09-08T11:59:31Z"}]}
# acceptance-mutation-manifest-end

# todo-state-filter
#
# Scenarios in this feature are named "todo-state-filter <n>". The name is a
# stable handle, not a description; the comment above each scenario says what it
# is for.
#
# Which todos the app is showing. The filter is looked at through what it makes
# visible rather than through the value it stores, because the value is a name
# only this app uses and the choice of name is not behavior.
#
# Vocabulary
#   the state starts with the todo list L  a state whose list is exactly L, as
#                                          JSON, in that order
#   the F filter is chosen                 F is one of all, active, completed -
#                                          the three the footer offers
#   the visible todos are T                the texts of the todos the app shows,
#                                          in order, as JSON. This is read the
#                                          way the app reads it, through the
#                                          selector the list already uses, so a
#                                          filter recorded somewhere the
#                                          selector cannot see fails here
Feature: Visibility filter

  Background:
    Given the state starts with the todo list [{"id":1,"text":"Buy milk","completed":false},{"id":2,"text":"Write tests","completed":true}]

  # todo-state-filter 1: before anything is chosen, every todo is visible.
  Scenario: todo-state-filter 1
    Then the visible todos are ["Buy milk","Write tests"]

  # todo-state-filter 2: choosing a filter decides which todos are visible. The
  # all row is the choice the app already starts with, made explicitly.
  Scenario Outline: todo-state-filter 2
    When the <filter> filter is chosen
    Then the visible todos are <visible>

    Examples:
      | filter    | visible                    |
      | all       | ["Buy milk","Write tests"] |
      | active    | ["Buy milk"]               |
      | completed | ["Write tests"]            |
