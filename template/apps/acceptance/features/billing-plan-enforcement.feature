Feature: Billing plan enforcement
  Plans expose the tenant capabilities that the API and UI use for feature gating.

  Scenario: Tenant can inspect centralized capabilities
    Given I have an authenticated tenant session
    When I request my billing capabilities
    Then the response status is 200
    And the capability response includes "platform.api-keys"
    And the capability response includes "platform.members"
    And the capability response includes "platform.storage-bytes"
