## ADDED Requirements

### Requirement: Selected PDF text includes word spacing

The system SHALL produce text from PDF selections that matches the visual reading of the document, with spaces between words where the original PDF layout separates them.

#### Scenario: Selection across multiple words on one line
- **WHEN** user selects text spanning multiple words on the same line in the PDF viewer
- **THEN** the selected text SHALL include space characters between each word, matching the visual reading order

#### Scenario: Copy to clipboard preserves spacing
- **WHEN** user selects text in the PDF viewer
- **THEN** the text written to the clipboard SHALL include proper word spacing

#### Scenario: Weak point save preserves spacing
- **WHEN** user saves a PDF text selection as a weak point
- **THEN** the saved `text` field SHALL include proper word spacing

#### Scenario: Precious usage save preserves spacing
- **WHEN** user saves a PDF text selection as a precious usage
- **THEN** the saved `text` field SHALL include proper word spacing

#### Scenario: Single word selection unchanged
- **WHEN** user selects a single word in the PDF viewer
- **THEN** the selected text SHALL match the word exactly, with no extra spacing

#### Scenario: Words already containing trailing whitespace
- **WHEN** text items from the PDF already include trailing whitespace
- **THEN** the system SHALL NOT insert additional spaces, avoiding double-spacing
