## ADDED Requirements

### Requirement: Duplicate weak point detection

The system SHALL prevent saving a weak point with the same text for the same user. If the text already exists, the system SHALL reject the request and indicate that the weak point was already saved.

#### Scenario: Create duplicate weak point
- **WHEN** a user attempts to save a weak point with text that already exists for that user
- **THEN** the system returns HTTP 409 Conflict with a message indicating the weak point already exists

#### Scenario: Create new weak point unaffected
- **WHEN** a user saves a weak point with text that does not exist for that user
- **THEN** the system creates the weak point and returns HTTP 201 Created

#### Scenario: Duplicate detection is user-scoped
- **WHEN** different users save weak points with the same text
- **THEN** each user's weak point is saved independently without conflict

#### Scenario: Frontend shows already saved confirmation
- **WHEN** the frontend receives a 409 response from the weak point save endpoint
- **THEN** the UI displays "Already saved as weak point" and auto-dismises
