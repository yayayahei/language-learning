## ADDED Requirements

### Requirement: Generate flashcards from weak points
The system SHALL automatically generate flashcards for each weak point, where one side shows the weak point text and the other shows the surrounding sentence with the word/phrase/idiom blanked out.

#### Scenario: Word flashcard
- **WHEN** a weak point of type "word" is sent to training
- **THEN** a flashcard is created showing the word on the front and the sentence context (with the word blanked) plus a definition placeholder on the back

#### Scenario: Phrase flashcard
- **WHEN** a weak point of type "phrase" is sent to training
- **THEN** a flashcard is created showing the phrase on the front and the full sentence context (with the phrase blanked) on the back

#### Scenario: Idiom flashcard
- **WHEN** a weak point of type "idiom" is sent to training
- **THEN** a flashcard is created showing the idiom on the front and the full sentence with an explanation prompt on the back

### Requirement: Generate quizzes from weak points
The system SHALL generate multiple-choice quizzes where the user fills in the blank for the weak point within its sentence context.

#### Scenario: Fill-in-the-blank quiz
- **WHEN** user starts a quiz session
- **THEN** the system presents a sentence with the weak point blanked out and 4 choices (1 correct, 3 distractors)

#### Scenario: Quiz distractors
- **WHEN** a quiz is generated for a weak point
- **THEN** the 3 incorrect choices SHALL be selected from other weak points of the same type or from common words in the same language

### Requirement: Spaced repetition scheduling
The system SHALL schedule flashcard and quiz reviews using the SM-2 spaced repetition algorithm.

#### Scenario: Correct answer
- **WHEN** user answers a flashcard or quiz correctly
- **THEN** the weak point's interval increases (next review is scheduled further out)

#### Scenario: Incorrect answer
- **WHEN** user answers a flashcard or quiz incorrectly
- **THEN** the weak point's interval resets to 1 day and it re-enters the daily review queue

#### Scenario: Due for review
- **WHEN** a weak point's scheduled review date arrives
- **THEN** that weak point appears in the user's daily training session

### Requirement: Training session UI
The system SHALL provide an interactive training interface for reviewing flashcards and completing quizzes.

#### Scenario: Flashcard review flow
- **WHEN** user starts a flashcard session
- **THEN** the system shows one card at a time (front side), user taps to reveal the back, then rates their recall (correct/incorrect)

#### Scenario: Quiz flow
- **WHEN** user starts a quiz session
- **THEN** the system presents fill-in-the-blank questions one at a time, user selects an answer, and gets immediate feedback

#### Scenario: Session summary
- **WHEN** user completes a training session
- **THEN** the system displays a summary with accuracy, cards reviewed, and next review schedule
