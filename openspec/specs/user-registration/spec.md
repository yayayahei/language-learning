# user-registration Specification

## Purpose
TBD - created by archiving change add-email-login. Update Purpose after archive.
## Requirements
### Requirement: User can sign up with email and password
The system SHALL allow a new user to register by providing an email address and password. The password MUST be hashed with bcrypt before storage. The email MUST be unique across all users.

#### Scenario: Successful signup
- **WHEN** a user sends a POST request to `/api/auth/signup` with a valid email and password (min 6 characters)
- **THEN** the system creates a new user record, hashes the password with bcrypt, sets a session cookie, and returns the user's ID and email

#### Scenario: Duplicate email rejection
- **WHEN** a user tries to sign up with an email that already exists
- **THEN** the system returns 409 Conflict with an error message indicating the email is already registered

#### Scenario: Invalid email format
- **WHEN** a user sends a signup request with a malformed email (no `@`, no domain)
- **THEN** the system returns 400 Bad Request with an error message

#### Scenario: Short password rejection
- **WHEN** a user sends a signup request with a password shorter than 6 characters
- **THEN** the system returns 400 Bad Request with an error message

### Requirement: Password is never stored or returned in plaintext
The system SHALL store only bcrypt hashes of passwords. The password hash MUST never be included in API responses.

#### Scenario: Password not in response
- **WHEN** the system returns user data (signup response, `/api/auth/me`)
- **THEN** the response does NOT include the password or password hash

