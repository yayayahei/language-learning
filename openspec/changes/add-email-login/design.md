## Context

The app is a single-user language-learning tool with no authentication. A Go backend (Chi router) serves a REST API, and a React frontend (Vite) consumes it. All data is stored in MySQL without user scoping. The `dbGuardMiddleware` pattern is already in place for per-request middleware. Adding email login transforms this into a multi-user app where each user's data is private.

## Goals / Non-Goals

**Goals:**
- Email + password signup and login with bcrypt-hashed passwords
- Cookie-based sessions signed with HMAC to prevent tampering
- Auth middleware that rejects unauthenticated API requests
- `user_id` scoping on all existing data tables
- Frontend auth guard (redirect to login if no session)

**Non-Goals:**
- Email verification (send confirmation email). Out of scope for v1.
- Password reset flow. Out of scope for v1.
- OAuth / social login (Google, GitHub, etc.)
- Rate limiting on login attempts
- Server-side session store (Redis, etc.) — cookies only for v1
- Role-based access (admin vs user) — all users are equal

## Decisions

### 1. Cookie-based sessions with HMAC signing

**Decision**: Store `user_id` in a cookie signed with HMAC-SHA256. No server-side session store.

**Cookie structure**:
```
session=<user_id>.<expiry_timestamp>.<hmac_signature>
```
The signature is `HMAC-SHA256(user_id.expiry, secret)`. On each request, the middleware verifies the signature and checks expiry.

**Why**: Stateless — no session table needed, no database lookups for auth check. The cookie payload is small enough for a cookie (no 4KB limit concern). HMAC prevents tampering; the secret stays on the server.

**Alternatives considered**:
- JWT — adds complexity (header, claims, base64 encoding) for no benefit over HMAC-signed cookie. JWT tokens are larger and harder to revoke.
- Server-side session table — requires a `sessions` table and per-request DB lookup. More robust (can revoke sessions), but unnecessary for v1.
- `gorilla/sessions` — popular but adds a dependency for a simple cookie. We only store one value (`user_id`).

### 2. bcrypt for password hashing

**Decision**: Use `golang.org/x/crypto/bcrypt` with cost factor 12.

**Why**: bcrypt is the standard for password hashing — slow by design (resists brute force), built-in salt, well-audited. Cost 12 balances security with login latency (~250ms).

**Alternatives considered**:
- Argon2 — newer, but Go standard library doesn't include it; requires an external package. bcrypt is simpler and sufficient.
- SHA-256 + salt — too fast, vulnerable to brute force. Rejected on security grounds.

### 3. `user_id` via request context

**Decision**: The auth middleware parses the session cookie, validates it, and stores `user_id` in `r.Context()` using a context key. Handlers extract it with a helper function.

```go
type contextKey string
const UserIDKey contextKey = "user_id"

func GetUserID(r *http.Request) (string, bool) {
    id, ok := r.Context().Value(UserIDKey).(string)
    return id, ok
}
```

**Why**: Standard Go pattern. Avoids passing `user_id` through every function signature. Middleware can reject unauthenticated requests before handlers run.

**Middleware placement**: The auth middleware is applied per-route-group, not globally. Auth routes (`/api/auth/*`) and health check are unprotected. All other `/api/*` routes require auth.

```go
r.Group(func(r chi.Router) {
    r.Use(authMiddleware)
    // Protected handlers registered here
})
```

### 4. Session secret via environment variable

**Decision**: Read `SESSION_SECRET` from environment, with a hard requirement at startup. If not set, log a fatal error.

**Why**: Secrets must not be hardcoded. A 32-byte random secret is generated once and stored in `.env` for development, and in production environment for deployment.

### 5. Database migration: `user_id` on existing tables

**Decision**: Add `user_id BIGINT NOT NULL` to all data tables with a default of 1 (placeholder user for migration). After migration, existing data belongs to user 1. New data will use the real `user_id` from the session.

**Schema changes**:
```sql
ALTER TABLE videos ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE weak_points ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE interactions ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE rewatch_sessions ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE pdf_documents ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE precious_usages ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1;
```

After migration, existing data belongs to the first created user (or a placeholder).

### 6. Frontend auth flow

**Decision**: A `ProtectedRoute` wrapper component checks authentication by calling `GET /api/auth/me`. While loading, it shows nothing (or a spinner). If 401, redirect to `/login`. If 200, render the child route.

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<'loading' | 'authed' | 'unauthed'>('loading')
    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => setStatus(r.ok ? 'authed' : 'unauthed'))
            .catch(() => setStatus('unauthed'))
    }, [])
    if (status === 'loading') return null
    if (status === 'unauthed') return <Navigate to="/login" />
    return <>{children}</>
}
```

**Login/Signup pages**: Simple forms that POST to `/api/auth/login` or `/api/auth/signup`. On success, redirect to `/`.

### 7. API route structure

All auth routes are under `/api/auth/`:

```
POST   /api/auth/signup  — Register (unprotected)
POST   /api/auth/login   — Login (unprotected)
POST   /api/auth/logout  — Logout (protected)
GET    /api/auth/me       — Current user (protected)
```

All existing API routes (`/api/transcripts`, `/api/weak-points`, etc.) become protected.

## Risks / Trade-offs

- **Cookie-based sessions can't be revoked server-side**: If a session cookie is stolen, there's no way to invalidate it except changing the `SESSION_SECRET` (which invalidates all sessions). → Acceptable for v1; can add a `sessions` table later if needed.
- **Existing data migration**: Tables with existing data need the `user_id` column with a default value. → Use `ALTER TABLE ... ADD COLUMN user_id ... DEFAULT 1` to preserve existing data. The first user to sign up should get ID 1.
- **CSRF**: The app is a React SPA with cookie auth. POST/PUT/DELETE requests need CSRF protection. → For v1, SameSite=Lax provides basic protection. Can add CSRF tokens later if needed.
- **No password reset**: Users who forget their password are locked out. → Document this limitation. Password reset can be added in a follow-up change.

## Migration Plan

1. Run `docker compose down && docker compose up -d` to restart MySQL fresh, OR manually run ALTER TABLE statements on existing DB
2. Deploy new backend binary (includes schema migration in `InitSchema()`)
3. Deploy new frontend build
4. No data loss: existing rows get `user_id = 1`. The first user to sign up should be manually set to ID 1, or a migration step assigns existing data to the first user.

## Open Questions

- Should the first signup automatically claim existing data (user_id = 1)? Recommend: yes — the first user to sign up gets ID 1 and thus owns all pre-migration data.
- Should we auto-login after signup? Recommend: yes — set the session cookie immediately after signup, same as login.
