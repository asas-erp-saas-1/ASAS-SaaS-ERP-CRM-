# Prisma Execution Engine Implementation Strategy

## 1. Risks
- **Dynamic Queries in Prisma**: Prisma is highly typed. Abstracting it behind a string-based generic interface (`kernel.query('leads')`) works against its design. We risk losing type safety internally, and dynamic queries might require us to use Prisma's `$queryRawUnsafe` or type-casting Prisma delegates `(prisma as any)[tableName]`.
- **Legacy Table Names vs Prisma Conventions**: Supabase uses `snake_case` tables (e.g. `journal_entries`). Prisma prefers `camelCase` (e.g. `journalEntry`). A static mapping dictionary is required.
- **Relational Selects (`select: '*, profiles(full_name)'`)**: Legacy code fetches relations via Supabase's PostgREST syntax. Prisma uses `.include`. Matching PostgREST strings exactly in Prisma is difficult without a complex parser, which leads to overengineering.

## 2. Tradeoffs
- **Raw SQL fallback**: To perfectly preserve PostgREST compatibility for edge-case selects without overengineering a parser, we will use parameterized `$queryRawUnsafe` where dynamic builds are complex, or map directly to Prisma client models where feasible. However, to keep it simple and safe for Phase 1, we will translate the simple JSON-like `options` into Prisma's where/orderBy/take syntax using Prisma model delegates. For complex nested selects, we might temporarily return raw or just fetch flat data until the API routes themselves are refactored to use standard Prisma.
- **Type Safety internal erosion**: Inside `kernel/core.ts` we will rely heavily on `any` because we are creating a generic adapter. The routes will still get the types they requested.

## 3. Tenant Enforcement Strategy
- The Kernel's `mutate` and `query` functions will implicitly extract `tenantId` from the `identity()` promise.
- For `query`: `{ tenantId: currentTenantId }` will be deeply injected / intersected into the `options.filters` object before translating to Prisma `where`.
- For `mutate`: Any `INSERT` payload will have `tenantId: currentTenantId` (or mapped `agency_id`) forcibly set.
- This creates an inescapable tenant boundary inside the execution layer.

## 4. Transaction Safety Strategy
- `IKernel.transaction()` will wrap Prisma's `$transaction`. 
- The callback receives a transaction-scoped Kernel instance. This instance holds the `Prisma.TransactionClient` and executes its queries/mutations through it instead of the global `prisma` client.

## 5. Rollback Strategy
- If the Prisma execution layer fails, or if a transaction throws, the Prisma client natively rolls back.
- If we encounter breaking compatibility issues, we can easily revert `kernel/core.ts` to the previous `@supabase/ssr` logic within a single file since the rest of the app relies on the `IKernel` abstraction.

## 6. Compatibility Guarantees
- The upstream `query` and `mutate` signatures remain unchanged.
- `kernel.identity()` will return the exact shape expected by all API routes.
- The `action` types (`INSERT`, `UPDATE`, `DELETE`) will be routed to Prisma's `.create`, `.updateMany`, `.deleteMany` respectively.
