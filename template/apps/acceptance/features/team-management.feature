Feature: Team management
  Team screens depend on tenant-scoped member APIs and plan seat limits.

  Scenario: Tenant can inspect active members
    Given I have an authenticated tenant session
    When I request my team members
    Then the response status is 200
