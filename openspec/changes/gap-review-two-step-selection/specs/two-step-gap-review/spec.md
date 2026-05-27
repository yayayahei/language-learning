## ADDED Requirements

### Requirement: Two-step gap marking flow
The GapReview component SHALL provide a two-step interface for identifying comprehension problems. In step one, the user SHALL click entire transcript sentences to mark them as containing something unclear. In step two, within the marked sentences, the user SHALL drag-select the specific word, phrase, or idiom they didn't understand and tag it with a type.

#### Scenario: Mark unclear sentences
- **WHEN** the user sees transcript sentences in the GapReview
- **THEN** clicking a sentence toggles it as "marked" with a visual highlight

#### Scenario: Select specific text within marked sentences
- **WHEN** the user drag-selects text within a marked sentence
- **THEN** a popup appears showing the selected text with type options (word, phrase, idiom)

#### Scenario: Select across segment boundaries
- **WHEN** the user drag-selects text that spans multiple transcript segments
- **THEN** the entire selected text is captured as a single weak point with the first segment's timestamp

### Requirement: Weak point type tagging
The system SHALL allow the user to tag each selected text as one of "word", "phrase", or "idiom" before saving.

#### Scenario: Tag and save selected text
- **WHEN** the user selects text and a popup appears
- **THEN** the user can choose a type (word/phrase/idiom) and click Save to persist the weak point

#### Scenario: Default type
- **WHEN** the popup first appears for a new selection
- **THEN** the type defaults to "phrase"
