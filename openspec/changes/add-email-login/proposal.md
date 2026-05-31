## Why

The app currently has no user concept — all data is shared in a single pool. Adding email login enables personal accounts so each user's weak points, training progress, videos, and PDFs are private. This is foundational for any multi-user or persisted personal use.

## What Changes

- Add a `users` table to MySQL with email, password hash, and timestamps
- Add sign-up endpoint: register with email + password (bcrypt-hashed)
- Add login endpoint: authenticate with email + password, set a session cookie (HMAC-signed)
- Add logout endpoint: clear the session cookie
- Add auth middleware on the Go backend that validates the session cookie and injects `user_id` into the request context
- Add `user_id` column to all existing data tables to scope data per user
- Add a `LoginPage` and `SignupPage` in the React frontend with simple email/password forms
- Add an auth guard (`ProtectedRoute` component) that redirects unauthenticated users to login
- **BREAKING**: All existing data without a `user_id` will be inaccessible after migration — a default placeholder user or migration script is needed

## Capabilities

### New Capabilities

- `user-registration`: Allow users to create an account with email and password. Passwords are bcrypt-hashed and stored in the `users` table. Duplicate emails are rejected.
- `user-login`: Authenticate a user by email and password. On success, set an HMAC-signed session cookie. Provide logout to clear the cookie. Include a `/api/auth/me` endpoint that returns the current user from the session.
- `user-data-isolation`: All API responses are filtered by the authenticated user's ID. Newly created data (weak points, interactions, videos, PDFs, precious usages) is automatically associated with the current user. Re-watch sessions and training state are also scoped per user.

### Modified Capabilities

None — all existing capabilities remain but now require authentication and return user-scoped data.

## Impact

- **Database**: New `users` table, `user_id` column added to `videos`, `weak_points`, `interactions`, `rewatch_sessions`, `pdf_documents`, `precious_usages`
- **Backend**: New `handler/auth.go` (signup/login/logout/me), new auth middleware in `main.go`, all existing handlers updated to read `user_id` from context and filter/write accordingly
- **Frontend**: New `LoginPage`, `SignupPage`, `ProtectedRoute` wrapper, `App.tsx` routing updated with auth flow
- **Go dependencies**: `golang.org/x/crypto/bcrypt` for password hashing
- **Session storage**: Cookie-based (no server-side session store needed for v1)
