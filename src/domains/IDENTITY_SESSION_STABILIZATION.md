# PHASE 1F: IDENTITY & SESSION STABILIZATION

## 1. Authentication Threat Model
*   **Token Theft (XSS / Network Interception)**: Attackers intercepting access or refresh tokens to impersonate users.
*   **CSRF & Session Hijacking**: Forging requests while a user is authenticated.
*   **Replay Attacks**: Re-transmitting intercepted valid tokens.
*   **Privilege Escalation & Cross-Tenant Spoofing**: Manipulating token payloads to access unauthorized resources or other tenants.
*   **Stale Session / Revocation Failures**: Terminated employees or compromised devices retaining access because tokens weren't properly revoked.

## 2. Session Lifecycle Architecture
The session lifecycle transitions from a direct Supabase magic-link/password flow to a standard OAuth2-style JWT pair flow managed internally:
1.  **Authentication**: User provides credentials. Server validates against the db.
2.  **Token Issuance**: Server issues a short-lived **Access Token (JWT)** and a long-lived, opaque **Refresh Token**.
3.  **Active Life**: Next.js middleware and `IKernel` validate the Access Token cryptographically on every request. No database lookup required.
4.  **Refresh**: Client hits `/api/auth/refresh` with the Refresh Token. Server issues a new Access/Refresh pair.
5.  **Termination**: User signs out, wiping cookies and flagging the Refresh Token as revoked in the database.

## 3. JWT Rotation Strategy
*   **Access Token**: Cryptographically signed, contains `userId`, `tenantId`, `role`. Short expiration (e.g., 15 to 60 minutes) to minimize the vulnerability window of a stolen token.
*   **Refresh Token**: Stored in a database `sessions` table. Longer duration (e.g., 7-30 days).

## 4. Secure Refresh Strategy (Refresh Token Rotation - RTR)
*   Each time a Refresh Token is used, it is **invalidated** and replaced with a new one.
*   **Reuse Detection**: If a previously used Refresh Token is presented, it indicates either a replay attack or a cloned session. In this event, the system **revokes all active sessions** for that `userId`/`deviceId` chain automatically, terminating the attacker and forcing the legitimate user to re-authenticate.

## 5. Revocation Strategy
*   Because Access Tokens are stateless and not checked against the database (for performance), they cannot essentially be revoked instantly. Their short lifespan mitigates this.
*   **Hard Revocation**: Real-time revocation targets the associated Refresh Token in the database. Once revoked, the session cannot be refreshed, and access naturally expires within minutes.
*   Emergency actions (e.g., password reset, "sign out everywhere") immediately invalidate all Refresh Tokens for that user.

## 6. Middleware Trust Guarantees
*   The Next.js `middleware.ts` serves as the primary trust boundary ingress.
*   It performs **cryptographic verification** of the Access Token signature.
*   Missing, expired, or invalid tokens result in immediate rejection (401 API response or redirect to `/login`).
*   The middleware operates synchronously and statelessly, shielding the backend execution engine (Kernel) from unauthenticated load.

## 7. Tenant-Bound Identity Guarantees
*   The `tenantId` (internal `agency_id`) is deeply embedded exactly when the JWT is minted.
*   It is cryptographically signed; clients cannot tamper with it to cross tenant boundaries.
*   `IKernel.identity()` trusts this JWT payload implicitly because the middleware previously verified the signature. This forms an unbroken, unforgeable chain from authentication to query execution.

## 8. Concurrent Session Policy
*   Users may log in from multiple devices (e.g., phone and desktop).
*   Each login generates a unique `sessionId` mapped to a new row in the `sessions` DB table, issuing a distinct Refresh Token chain.
*   This allows users to manage and revoke specific devices independently without interrupting active sessions elsewhere.

## 9. Replay Attack Mitigation
*   **Strict Expirations (`exp`)**: Middleware strictly enforces token time-to-live.
*   **Transport Security**: Enforcement of `HTTPS/TLS` via HSTS prevents at-rest physical network interception.
*   **Reuse Detection on Refresh**: Prevents replay of intercepted Refresh Tokens.

## 10. Cookie Hardening Strategy
Access and Refresh tokens will be transported via HTTP cookies to shield them from XSS attacks that target Web Storage (`localStorage` / `sessionStorage`).
*   **Flags**: `HttpOnly`, `Secure`
*   **SameSite**: `Lax` for standard navigation safety, or `Strict` for aggressive API isolation.
*   **Prefixes**: Utilizing `__Host-` prefixes (e.g., `__Host-session`) where domain setup permits, preventing sub-domain cookie injection attacks.

## 11. Audit / Security Event Integration
The Auth service hooks directly into the `AuditLogger`:
*   `LOGIN_SUCCESS`, `LOGIN_FAILED`
*   `TOKEN_REFRESHED`
*   `SESSION_REVOKED` (Explicit sign-out)
*   `SECURITY_ALERT_TOKEN_REUSE` (Possible replay attack detected)
Each event logs the relevant `userId`, `tenantId`, `ip_address`, and `user_agent`.

## 12. Legacy Auth Migration Sequencing
To remove Supabase Auth without destabilizing the current routing:
1.  **Prisma Session Schema**: Add a `Session` model for Refresh Tokens and device tracking.
2.  **JWT Service Core**: Implement the cryptographic signing/verification logic.
3.  **Auth Route Overhaul**: Replace Supabase `signInWithPassword` API flow with internal database lookup, password hashing verification, and JWT pair issuance via cookies.
4.  **Middleware Switch**: Point `middleware.ts` to verify the internal JWT instead of using `@supabase/ssr` to read old session cookies.
5.  **Kernel Switch**: Ensure `src/lib/kernel/core.ts` parses the standard standardized JWT configuration (implemented conceptually in Phase 1D).
6.  **Cleanup**: Purge all remnants of `@supabase/ssr`, `@supabase/supabase-js`, and `src/app/auth/callback` routes.

## 13. Minimal Safe Implementation Roadmap
1.  Update `schema.prisma` with User Authentication/Session tables.
2.  Create `src/lib/auth/jwt.ts` for standardized token construction.
3.  Rewrite `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`.
4.  Rewrite `middleware.ts` to enforce the new JWT schema.
5.  Perform a full purge of `@supabase/*` imports globally.
6.  Verify frontend `login/page.tsx` submits correctly to the internal API route rather than a third-party SDK.
