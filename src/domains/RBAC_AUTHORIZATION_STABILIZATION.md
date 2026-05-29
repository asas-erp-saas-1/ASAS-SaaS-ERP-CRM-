# PHASE 1G: RBAC & AUTHORIZATION STABILIZATION

## 1. Authorization Threat Model
*   **Privilege Escalation**: A user manipulating API payloads or bypassing UI checks to perform actions above their assigned role (e.g., an 'agent' approving a financial transaction).
*   **Broken Access Control (IDOR)**: A user accessing or modifying a resource belonging to their tenant, but to which they specifically lack rights (e.g., viewing another agent's private leads).
*   **Cross-Tenant Leakage**: Bypassing authorization checks to access resources in another tenant (Already heavily mitigated by Phase 1E: Tenant Security Hardening, but RBAC must not undermine it).
*   **Missing Function-Level Access Control**: API routes or kernel mutations that lack mandatory RBAC guards, defaulting to open access.
*   **Stale Permissions (Revocation Failure)**: A user's role is downgraded, but cached permissions or long-lived sessions allow them to continue performing unauthorized actions.

## 2. RBAC Architecture Design
The architecture relies on a **Centralized, Statically-Typed RBAC Engine**. We avoid complex, dynamic policy databases or custom DSLs in favor of predictable, code-based permission matrices.

*   **Subject**: The User (identified by `userId` and `tenantId`).
*   **Role**: A statically defined string representing a job function (e.g., `admin`, `manager`, `agent`).
*   **Action**: A standardized CRUD verb (`CREATE`, `READ`, `UPDATE`, `DELETE`, `APPROVE`).
*   **Resource**: A statically defined domain entity (e.g., `LEADS`, `DEALS`, `FINANCE`).

The Engine acts as a simple boolean gate: `authorize(identity, action, resource) => boolean`.

## 3. Role Hierarchy Strategy
Roles operate on a strict, flat matrix rather than complex DAG (Directed Acyclic Graph) inheritance trees. While conceptual inheritance exists (an Admin can do what a Manager can do), the implementation explicitly defines permissions for each role.
*   **`admin`**: Full access to all resources and tenant-level configurations.
*   **`manager`**: Access to team-level resources, reporting, and standard operations. Cannot modify billing or tenant settings.
*   **`agent`**: Access limited to assigned resources (e.g., their own deals, leads, tasks).

## 4. Permission Inheritance Model
Standard explicit mapping:
```typescript
const RolePermissions: Record<Role, Permission[]> = {
  admin: ['*'], // Wildcard for simplicity
  manager: ['LEADS:READ', 'LEADS:WRITE', ...], // and so on
  agent: ['LEADS:READ_OWN', 'LEADS:WRITE_OWN', ...] // contextual
};
```
*Note: Suffixes like `_OWN` denote contextual checks requiring ownership validation during the Service Layer execution.*

## 5. Declarative Authorization Guard Strategy
Authorization is declarative and embedded close to the execution layer.
We wrap API route handlers or Service layer methods with a guard:

```typescript
export const createLead = withAuthGuard(
  { action: 'CREATE', resource: 'LEADS' },
  async (req, identity) => { /* ... */ }
);
```
Alternatively, integrating directly into API route context wrapping guarantees mutations never bypass authorization. Given the generic nature of `IKernel`, route/service level guards are safer and more contextual than injecting RBAC into `IKernel` which lacks specific domain context.

## 6. Service-Layer Authorization Flow
1.  **Ingress**: Request reaches the Next.js API Route.
2.  **Identity Derivation**: `kernel.identity()` (or middleware context) provides the user's `[tenantId, role]`.
3.  **Static Check**: The route/service declares the required `[action, resource]`. The engine verifies if `role` possesses this permission.
4.  **Contextual Check (Optional)**: If the permission is conditional (e.g., `_OWN`), the service fetches the resource, verifies ownership (`resource.owner_id === userId`), and proceeds or denies.
5.  **Execution**: `IKernel` executes the query, applying the Tenant Security Hardening isolation physically.

## 7. Tenant-Scoped Permission Enforcement
*   A user's `role` is strictly bound to their `tenantId` within the JWT payload.
*   A user who is an `admin` in Tenant A and an `agent` in Tenant B will receive two distinct JWTs (or a JWT specifically scoped to the active tenant login).
*   The RBAC engine evaluates purely based on the active session's asserted `tenantId` and `role`. It does not cross-reference roles across tenants.

## 8. Permission Cache Invalidation Strategy
*   Permissions are primarily cached in the JWT payload (the user's `role`).
*   To avoid stale permissions if an admin downgrades a user, we use the **Refresh Token Rotation (RTR)** mechanism (from Phase 1F).
*   If a role changes, the backend invalidates the user's Refresh Token family. This forces the user to re-authenticate or transparently acquire a new Access Token reflecting the downgraded `role`, keeping cache consistency bounded by the short Access Token lifespan (e.g., 15 mins).

## 9. Revocation Propagation Strategy
*   Role demotions or terminations trigger an immediate `revokeAllSessions(userId, tenantId)`.
*   This drops the active database sessions. Within the Access Token's short TTL, the user hits a `401 Unauthorized` on their next refresh attempt.

## 10. Audit-Aware Authorization Design
The Authorization Guard automatically hooks into the `AuditLogger`:
*   **Authorization Success**: Usually implicitly logged via the downstream mutation audit.
*   **Authorization Failure**: Explicitly logs `ACCESS_DENIED` with `userId`, `tenantId`, Attempted `[action, resource]`, and `ip_address`. This flags potential internal malicious probing without disrupting execution flow.

## 11. Authorization Failure Model
*   The RBAC engine throws a specialized `AuthorizationError`.
*   The API layer explicitly catches this and normalizes it to an `HTTP 403 Forbidden`.
*   The response never leaks *why* authorization failed (e.g., never says "You need the ADMIN role"), only that access is denied, preventing state enumeration.

## 12. Minimal Safe Implementation Roadmap
1.  **Define Static Matrix**: Create `src/lib/auth/rbac/roles.ts` mapping standard `Role` enums to `Permission` strings.
2.  **Create Guard Decorator**: Implement `withAuth(action, resource)` for wrapping API routes safely.
3.  **Role Injection**: Ensure the identity stabilization phase (1F) correctly embeds the `role` into the `KernelIdentity` returning from JWT.
4.  **Gradual Route Application**: Wrap existing Next.js API routes incrementally with the Guard.
5.  **Audit Hooking**: Wire failed guard evaluations into the `AuditLogger`.
