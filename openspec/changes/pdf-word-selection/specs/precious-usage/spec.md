## ADDED Requirements

### Requirement: List precious usage entries
The system SHALL provide a dedicated page that lists all precious usage entries, ordered by most recent first, with ability to filter by type (word, phrase, expression) and search by text.

#### Scenario: No entries
- **WHEN** user navigates to the precious usage page and no entries exist
- **THEN** an empty state message "No precious usages saved yet" is displayed

#### Scenario: Browse entries
- **WHEN** user navigates to the precious usage page and entries exist
- **THEN** each entry shows its text, type badge, source indicator (PDF/video), and the date it was saved

#### Scenario: Filter by type
- **WHEN** user selects a type filter (word/phrase/expression)
- **THEN** only entries matching that type are shown

#### Scenario: Search by text
- **WHEN** user types in the search input
- **THEN** only entries whose text matches the search term are shown

### Requirement: Delete precious usage entry
The system SHALL allow users to delete a precious usage entry.

#### Scenario: Delete entry
- **WHEN** user clicks the delete button on a precious usage entry
- **THEN** the entry is removed from the database and the list refreshes

### Requirement: Precious usage API endpoints
The system SHALL provide REST API endpoints for precious usage CRUD operations, following the same pattern as the existing weak points API.

#### Scenario: Create precious usage via API
- **WHEN** a POST request is sent to `/api/precious-usages` with valid JSON body (text, pu_type, source_type, source_id, sentence)
- **THEN** the entry is created and the response returns the new entry's ID with status 201

#### Scenario: List precious usages via API
- **WHEN** a GET request is sent to `/api/precious-usages`
- **THEN** the response returns a JSON array of all entries, with optional `?search=` and `?type=` query parameter filtering

#### Scenario: Delete precious usage via API
- **WHEN** a DELETE request is sent to `/api/precious-usages/{id}`
- **THEN** the entry is deleted and the response returns status 200
