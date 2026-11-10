# Roshan Rozgar — Backend Architecture

## Overview

Machine B owns the backend, database rules, authentication, transactional state mutations, private storage, and AI extraction boundary for Roshan Rozgar.

The application targets the repository-root Next.js app browser boundary (`lib/api/index.js`). Machine A imports named functions from this contract and does not write database tables or SDK operations into frontend components.

```
+--------------------------------------------------------------------+
|                         Machine A (UI)                             |
|  app/**, components/**, styles, layout, client views               |
+---------------------------------+----------------------------------+
                                  | imports named functions
                                  v
+--------------------------------------------------------------------+
|                  Machine B Browser Service Facade                  |
|                         lib/api/index.js                           |
|  - 20 canonical named async functions returning { data, error }    |
|  - Strict normalization: snake_case DB rows -> camelCase entities  |
|  - Deterministic calculations: quote totals, fee credits           |
|  - Role-based allowedAction computation                            |
+-------------------+----------------------------+-------------------+
                    |                            |
       (when Supabase configured)       (tests / offline / CI)
                    |                            |
                    v                            v
+-------------------------------+    +-------------------------------+
|      Supabase Client          |    |     In-Memory Domain Engine   |
|  - Auth & anonymous sessions  |    |  - Exact schema & table maps  |
|  - Transactional RPCs         |    |  - Concurrency assignment lock|
|  - Row Level Security (RLS)   |    |  - Stale quote rejection      |
|  - Private storage (job-audio)|    |  - Role-based access control  |
+-------------------------------+    +-------------------------------+
```

## Contract Invariants

1. **Normalized Results**:
   Every service call resolves `{ data, error }`. On success, `error: null`. On failure, `data: null` and `error: { code, message, retryable }`.

2. **Standard Error Codes**:
   `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `INVALID_TRANSITION`, `QUOTE_STALE`, `WORKER_UNAVAILABLE`, `VERSION_CONFLICT`, `RATE_LIMITED`, `UPLOAD_FAILED`, `AI_UNAVAILABLE`, `NETWORK_ERROR`.

3. **Authoritative State Transitions**:
   Direct client table writes on `jobs`, `agreements`, `quotes` and `assignments` are denied by RLS policies. State mutations MUST execute through the transactional RPCs which perform row-locking (`FOR UPDATE`), optimistic version verification, and atomic state transitions.

4. **Currency Representation**:
   All money fields are integer minor units (PKR paisa, where Rs 800 = 80000). The server computes totals and credit arithmetic deterministically.

5. **Concurrency & Active Assignments**:
   A worker can hold at most one active immediate assignment at any time. When two customers race to book the same worker, exactly one transaction succeeds; the other is rejected with `WORKER_UNAVAILABLE`.
