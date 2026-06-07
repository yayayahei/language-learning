# user-login Specification

## Purpose
TBD - created by archiving change add-email-login. Update Purpose after archive.
## Requirements
### Requirement: User can log in with email and password
The system SHALL authenticate a user by verifying the provided password against the stored bcrypt hash. On success, the system sets an HMAC-signed session cookie containing the user's ID.

#### Scenario: Successful login
- **WHEN** a user sends a POST request to `/api/auth/login` with a valid email and correct password
- **THEN** the system sets an HTTP-only session cookie and returns the user's ID and email

#### Scenario: Wrong password
- **WHEN** a user sends a login request with a valid email but incorrect password
- **THEN** the system returns 401 Unauthorized with an error message

#### Scenario: Unknown email
- **WHEN** a user sends a login request with an email not found in the system
- **THEN** the system returns 401 Unauthorized with a generic error message (not revealing whether the email exists)

### Requirement: User can log out
The system SHALL provide a logout endpoint that clears the session cookie.

#### Scenario: Successful logout
- **WHEN** a logged-in user sends a POST request to `/api/auth/logout`
- **THEN** the system clears the session cookie and returns a success response

### Requirement: Get current user from session
The system SHALL provide an endpoint to retrieve the currently authenticated user from the session cookie.

#### Scenario: Authenticated user
- **WHEN** a request with a valid session cookie is sent to `GET /api/auth/me`
- **THEN** the system returns the user's ID and email

#### Scenario: No session
- **WHEN** a request without a valid session cookie is sent to `GET /api/auth/me`
- **THEN** the system returns 401 Unauthorized

### Requirement: Session cookie security
The session cookie SHALL be HTTP-only (not accessible to JavaScript), set with SameSite=Lax, and signed with an HMAC secret to prevent tampering.

#### Scenario: Cookie attributes
- **WHEN** the system sets a session cookie
- **THEN** the cookie has HttpOnly=true, SameSite=Lax, and Path=/

