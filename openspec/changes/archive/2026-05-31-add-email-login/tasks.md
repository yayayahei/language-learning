## 1. Database Schema

- [x] 1.1 Create `users` table (id, email UNIQUE, password_hash, created_at) in `db.go` InitSchema and `schema.sql`
- [x] 1.2 Add `user_id BIGINT NOT NULL DEFAULT 1` column to videos, transcripts, interactions, weak_points, rewatch_sessions, pdf_documents, precious_usages in `db.go` via ALTER TABLE migrations

## 2. Backend Auth Endpoints

- [x] 2.1 Add `golang.org/x/crypto` dependency for bcrypt password hashing
- [x] 2.2 Create `handler/auth.go` with signup endpoint (`POST /api/auth/signup`): validate email format, validate password length >= 6, bcrypt-hash password, insert user, set session cookie, return user
- [x] 2.3 Add login endpoint (`POST /api/auth/login`): find user by email, compare bcrypt hash, set session cookie on success, return 401 on failure
- [x] 2.4 Add logout endpoint (`POST /api/auth/logout`): clear session cookie
- [x] 2.5 Add me endpoint (`GET /api/auth/me`): return current user ID and email from session cookie

## 3. Session Management

- [x] 3.1 Create `auth/session.go` with `WriteSessionCookie(w, userID)` that sets HMAC-signed cookie (user_id.expiry.signature) with HttpOnly=true, SameSite=Lax
- [x] 3.2 Create `ParseSessionCookie(r)` that validates HMAC signature and expiry, returns user_id or error
- [x] 3.3 Read `SESSION_SECRET` env var at startup, require it to be set

## 4. Auth Middleware

- [x] 4.1 Create `auth/middleware.go`: Chi middleware that parses session cookie, stores user_id in request context, returns 401 if invalid/missing
- [x] 4.2 Create `auth/context.go` with `UserIDKey` and `GetUserID(r)` helper
- [x] 4.3 Wire middleware in `main.go`: auth routes are unprotected, all other `/api/*` routes require auth

## 5. Update Existing Handlers

- [x] 5.1 Update VideoHandler: filter list by user_id, set user_id on upsert, check ownership on delete/position
- [x] 5.2 Update WeakPointHandler: filter list by user_id, set user_id on create, check ownership on delete/grasp
- [x] 5.3 Update InteractionHandler: set user_id on create, filter list by user_id
- [x] 5.4 Update TrainingHandler: scope due cards to user's training_state
- [x] 5.5 Update RewatchHandler: scope sessions to user_id
- [x] 5.6 Update PDFHandler: scope list/position/delete to user_id
- [x] 5.7 Update PreciousUsageHandler: set user_id on create, filter list by user_id

## 6. Frontend Auth Pages

- [x] 6.1 Create `pages/LoginPage.tsx` with email + password form, POST to `/api/auth/login`, redirect to `/` on success
- [x] 6.2 Create `pages/SignupPage.tsx` with email + password + confirm password form, POST to `/api/auth/signup`, redirect to `/` on success
- [x] 6.3 Create `components/ProtectedRoute.tsx`: fetch `/api/auth/me`, show nothing while loading, redirect to `/login` if 401, render children if authed
- [x] 6.4 Update `App.tsx`: wrap all existing routes in ProtectedRoute, add `/login` and `/signup` routes (unprotected), add logout button to nav

## 7. Integration & Polish

- [x] 7.1 Test full flow: signup → auto-login → create data → logout → login → data still there
- [x] 7.2 Test data isolation: user A's data not visible to user B
- [x] 7.3 Update `schema.sql` with all new tables and columns for fresh Docker setups
