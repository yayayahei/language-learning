## ADDED Requirements

### Requirement: Select words as weak points
The system SHALL allow users to highlight text within surfaced transcript sentences and save individual words as weak points.

#### Scenario: User selects a word
- **WHEN** user highlights a word in a surfaced sentence and clicks "Add as weak point"
- **THEN** the word is saved with its video context (video ID, timestamp, surrounding sentence)

#### Scenario: User selects a phrase
- **WHEN** user highlights a multi-word phrase and clicks "Add as weak point"
- **THEN** the phrase is saved as a single weak point with video context

### Requirement: Select idioms as weak points
The system SHALL allow users to flag entire sentences or multi-word expressions as idiom weak points, distinguishing them from regular word/phrase weak points.

#### Scenario: User marks an idiom
- **WHEN** user selects a sentence or expression and marks it as an idiom
- **THEN** the idiom is saved with a type flag differentiating it from regular words/phrases

### Requirement: View weak points list
The system SHALL display all saved weak points in a searchable, filterable list.

#### Scenario: Browse all weak points
- **WHEN** user navigates to the weak points view
- **THEN** all saved weak points are displayed with their type (word/phrase/idiom), video context, and creation date

#### Scenario: Filter by type
- **WHEN** user filters weak points by type (word, phrase, or idiom)
- **THEN** only matching weak points are displayed

#### Scenario: Search weak points
- **WHEN** user types a search query in the weak points list
- **THEN** only weak points whose text matches the query are displayed

### Requirement: Delete weak points
The system SHALL allow users to delete weak points they no longer need.

#### Scenario: User deletes a weak point
- **WHEN** user clicks delete on a weak point
- **THEN** the system prompts for confirmation and removes it from the list upon confirmation

### Requirement: Export weak point to training
The system SHALL allow users to select weak points to add to the spaced repetition training queue.

#### Scenario: User sends weak points to training
- **WHEN** user selects one or more weak points and clicks "Train these"
- **THEN** the selected weak points are added to the spaced repetition deck
