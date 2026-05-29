# PHASE 1C: KERNEL TRANSITION ARCHITECTURE & PRISMA MIGRATION PLAN

## 1. Context & Objective
The platform currently abstracts all Supabase interactions behind the `IKernel` interface located in `src/lib/kernel/core.ts`. This interface is deeply consumed by the application layer (`app/api/*`). The old Supabase backend is deprecated, meaning we must execute a controlled migration from a Supabase execution engine to a Prisma/PostgreSQL engine **while preserving the existing application contracts (`query`, `mutate`, `transaction`, `identity`)**.

This document defines the safe architectural transition map required for replacing the underlying engine without rewriting the vast surface area of business logic routes.

## 2. Kernel Transition Strategy

The `IKernel` interface is robust enough to act as a generic adapter. We will retain the interface fully but gut the Supabase internal implementation and rewire it directly to Prisma.

### Existing Interface (TO BE PRESERVED)
```typescript
type QueryOptions = { select?: string; filters?: Record<string, any>; limit?: number; offset?: number; orderBy?: { column: string; ascending?: boolean }; };

export interface IKernel {
  identity(): Promise<KernelIdentity>;
  query<T>(tableName: string, options?: QueryOptions): Promise<T[]>;
  mutate<T>(tableName: string, action: 'INSERT' | 'UPDATE' | 'DELETE', data: any, match?: Record<string, any>): Promise<T>;
  transaction<T>(callback: (txKernel: Omit<IKernel, 'transaction'>) => Promise<T>): Promise<T>;
}
```

### New Internal Engine Rules
1. **Dynamic Model Resolution**: The new implementation will dynamically map `tableName` inputs (e.g. `'leads'`) into Prisma model properties (`prisma.lead`).
2. **Dynamic Filter Translation**: Supabase `filter` structures (e.g. `is`, `in`, `eq`) will be mapped to Prisma standard `where` arguments (`equals`, `in`, etc.).
3. **True Transaction Support**: Prisma's `$transaction` will replace the fake sequential Supabase transaction implementation.

## 3. Prisma Execution Architecture

```mermaid
graph TD
    A[API Route / Server Action] -->|kernel.query()| B(IKernel Interface)
    B -->|Enforcement Middleware| C{Prisma Translator Engine}
    C -->|Query Building| D[Prisma Client]
    C -->|Hook Execution| E[AuditLogger]
    C -->|RBAC Guard| F[RBACEngine]
    D --> G[(PostgreSQL)]
```

*   **Prisma Translator Engine**: An internal module that maps snake_case legacy table names to camelCase Prisma model names. 
*   **Prisma Generic Payload Types**: Utilizing `prisma.$queryRaw` initially for unsupported/legacy tables while transitioning, and utilizing Prisma ORM directly for schema-bound entities.

## 4. Tenant-Safe Query Execution Flow

The defining feature of SaaS architecture is Multi-Tenant isolation. In Supabase, this was handled heavily by RLS. With Prisma natively, we must enforce isolation at the Application layer (Kernel layer).

*   **Implicit Injection**: The Kernel's `identity()` method extracts `tenantId`.
*   **Mutation Interception**: Any `mutate('INSERT')` call will automatically have `{ tenantId: identity.tenantId }` injected into its payload payload before reaching Prisma.
*   **Query Interception**: Any `query()` call will implicitly have `tenantId: identity.tenantId` merged into the `where` clause.
*   **Strict RLS Fallback**: For raw queries, we set local session variables (`SET LOCAL "app.current_tenant_id" = ?`) wrapped inside Prisma transactions to leverage PostgreSQL level RLS.

## 5. Identity Resolution Strategy

*   **Old Flow**: Parsed cookies against `@supabase/ssr` to read `user.id` and map to `profiles.agency_id`.
*   **New Flow**: Reads Next.js `req.headers.get('authorization')` or cookies, verifies against the new `JWTService`, and returns:
```typescript
{
  userId: session.userId,
  tenantId: session.tenantId,
  role: session.roles[0] || 'agent', // Normalized legacy fallback
  sessionId: session.sessionId,
  deviceId: session.deviceInfo || 'unknown'
}
```
*   This ensures 100% downstream compatibility with legacy API routes calling `kernel.identity()`.

## 6. RBAC Integration Points

The new `RBACEngine` will be hooked directly inside the Kernel.
Whenever `kernel.query(tableName)` or `kernel.mutate(tableName, action)` is called:
1.  Map `tableName` to an RBAC Resource (e.g., `'deals'` -> `DEALS`).
2.  Map kernel action to RBAC Action (e.g., `'INSERT'` -> `CREATE`, `query` -> `READ`).
3.  Execute `RBACEngine.hasPermission()`. Throw `403 Forbidden` if denied.

## 7. Audit Hook Integration Points

Mutation calls (`INSERT`, `UPDATE`, `DELETE`) are universally channeled through `kernel.mutate`. We will inject the `AuditLogger` here:
*   Pre-mutate: Record intended action.
*   Post-mutate: Async fire-and-forget `AuditLogger.logEvent()` capturing the `userId`, `tenantId`, action, and `resourceId` (if available from Prisma response).

## 8. Error Normalization Strategy

Supabase error objects (e.g., `error: { message, code }`) were previously caught and propagated. Prisma throws `PrismaClientKnownRequestError`.
*   The Kernel will wrap Prisma calls in `try/catch`. 
*   Prisma specific codes (`P2002` for Unique Constraint, `P2025` for Not Found) will be intercepted and translated into normalized HTTP API errors (409 Conflict, 404 Not Found), maintaining previous upstream route contracts.

## 9. Minimal Refactor Plan & Execution Sequencing 

### Step 1: Core System Replacement
Rewrite `src/lib/kernel/core.ts` dropping `@supabase/ssr` in favor of Prisma. Implement the dynamic `tableName` translation logic.

### Step 2: Schema Synchronization
Update `prisma/schema.prisma` to include the existing core application domains (Deals, Leads, Projects, Documents) that API routes rely on so Prisma generates standard typings.

### Step 3: Identity & JWT Replacement
Wire `kernel.identity()` into `src/lib/auth/jwt.ts` and ensure middleware properly passes cookies or bearer headers to API contexts.

### Step 4: Staged Deployment
Enable dual-write or read-only tests locally to ensure no type incompatibilities arise during Prisma translation. 

## 10. Runtime Risk Assessment
*   **Case Sensitivity Differences**: Supabase/PostgreSQL translates to Prisma camelCase sometimes differently. A mapping dictionary is needed between raw database tables and Prisma models.
*   **Prisma Client Pagination limits**: Limit/Offset operates slightly differently in Prisma vs PostgREST. Need to ensure edge cases in offset pagination behave correctly.
*   **JSON Field Mutations**: Mutating JSONB in Supabase was literal. Prisma might require specific object structuring for nested inserts.

## 11. API Compatibility Preservation

By strictly maintaining `IKernel`, we guarantee that out of ~50+ files relying on `kernel.query()`, virtually 0 changes will be required on the actual `app/api/.../route.ts` side. We intercept the translation securely at the execution layer.
