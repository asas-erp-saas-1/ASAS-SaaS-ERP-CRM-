# PHASE 1E: TENANT SECURITY HARDENING

## 1. Context & Objective
The platform has transitioned from Supabase to a centralized Prisma Execution Engine behind the `IKernel` interface. During this transition, we lost the database-level guarantees of PostgreSQL Row Level Security (RLS) and replaced them with application-level enforcement.

This document outlines the security architecture to harden this application-level boundary, ensuring absolute tenant isolation for a multi-tenant SaaS.

## 2. Tenant Enforcement Threat Model & Attack Surface

### 2.1 Middleware & Identity Spoofing
*   **Risk**: If the `authorization` header or JWT verification is weakly enforced, an attacker could forge a token or manipulate claims to impersonate another `tenantId`.
*   **Mitigation**: Strict cryptographic validation of the JWT in `kernel.identity()`. No fallback to arbitrary cookies if the signature is invalid. Ensure `deviceId` and `sessionId` are validated against revocation lists where applicable.

### 2.2 Prisma Query & Relation Traversal Risks
*   **Risk**: A nested Prisma `include` or `select` might allow a user to traverse relationships across tenant boundaries if the nested model doesn't explicitly filter by tenant. For example, fetching a global resource and using `.include` to fetch its relations attached to *other* tenants.
*   **Mitigation**: The Execution Engine must either explicitly prohibit deep `include` relation crawling through the generic `IKernel` interface, or forcibly inject the `tenantId` into every nested `where` clause. Given the generic nature of `IKernel`, we will restrict deep relational fetching at this layer and require flattened querying.

### 2.3 UpdateMany / DeleteMany Vulnerabilities
*   **Risk**: A malicious or malformed `match` payload passed to `kernel.mutate('UPDATE')` might omit specific filters. If the `tenantId` is not explicitly and un-overridably injected into the `.updateMany` or `.deleteMany` where clause, it could result in cross-tenant data destruction.
*   **Mitigation**: Mandatory, overriding injection of `agency_id: tenantId` into the root of every `where` object prior to execution.

### 2.4 Transaction Leakage
*   **Risk**: Context loss during async execution inside `$transaction` callbacks could cause a fallback to a different tenant context or global context.
*   **Mitigation**: The `IKernel.transaction` callback provides a scoped `txKernel`. The identity resolution must resolve before the transaction begins, and the scoped `txKernel` must inherit and lock that specific identity for the lifecycle of the transaction.

## 3. Hardened Enforcement Strategy

We will implement a **Centralized Query Guard Architecture** via the existing `enforceExecution` wrapper located in `src/lib/enforcement/core.ts` (or deeply embedded in `KernelCore`).

### 3.1 Un-overridable Injection
The `IKernel` implementation will intercept all `options.filters` (for queries) and `match` payloads (for mutations):
1. Resolve `identity = await this.identity()`.
2. Construct the `where` clause.
3. Universally apply: `where.agency_id = identity.tenantId`.
4. Ensure no user-provided input can override the `agency_id` key.

### 3.2 Schema Assumption
The generic `IKernel` assumes that any table queried directly has an `agency_id` column for physical isolation. Models bridging domains without tenant IDs cannot be queried through this generic interface and must be handled via specialized internal services.

## 4. Tenant-Safe Transaction Strategy
*   Identity resolution (`await this.identity()`) happens **once** at the start of a transaction.
*   The resolved identity is cached on the `KernelCore` instance constructed for the transaction (`new KernelCore(txClient, resolvedIdentity)`).
*   This prevents the transaction from relying on async header resolution mid-flight (which can fail or drift in Next.js).

## 5. Audit Integrity Guarantees
*   Audit logging must occur *after* the enforcement boundary.
*   The `AuditLogger` will record the forced `tenantId` alongside the attempted operation.
*   It protects against "shadow writes" by logging the exact constraints passed to Prisma, explicitly verifying that `agency_id: <tenant_id>` was part of the executed statement.

## 6. Safe RBAC Integration Points
*   **RBAC Execution Order**:
    1. Resolve Identity -> `[userId, tenantId, role]`
    2. RBAC Guard -> Check `role` against `[action, resource]`
    3. Tenant Injection -> Inject `agency_id: tenantId`
    4. Prisma Execution
*   This ensures RBAC operates on the intended action before payload execution, but acts purely as an authorization gate. The physical data isolation (Tenant Injection) remains an inescapable, independent mechanism.

## 7. Minimal Safe Implementation Plan

1. **Update `KernelCore` Constructor**: Allow an optional `preResolvedIdentity` to lock tenant context for transactions.
2. **Refactor `enforceExecution` / `KernelCore`**:
    * Hardcode the `{ agency_id: identity.tenantId }` injection in the `translateFiltersToWhere` logic.
    * Hardcode the injection into the `data` payload for `mutate('INSERT')`.
3. **Verify Middleware Trust**: Ensure the `JWTService` creates signed tokens where `tenantId` is immutable.
4. **Deploy & Audit**: Introduce a mandatory unit test pattern proving that passing a malicious `agency_id: 'other_tenant'` in a filter is actively overwritten by the guard.
