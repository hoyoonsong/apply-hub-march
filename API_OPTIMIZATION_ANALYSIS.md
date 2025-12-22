# API Call Optimization Analysis

## Executive Summary

Analysis of API calls reveals several optimization opportunities that could significantly reduce database load and improve performance. The main issues are:

1. **N+1 Query Pattern** - Multiple sequential calls per program/item
2. **Duplicate Calls** - Same API called multiple times (likely React StrictMode)
3. **Missing Batching** - Individual calls that could be batched
4. **Redundant Profile Checks** - Repeated queries for the same user data
5. **Inefficient Count Queries** - Using HEAD requests when batch queries would be better

---

## Critical Issues (High Impact)

### 1. N+1 Query Pattern in PublishResultsHomePage

**Location**: `src/pages/org-admin/PublishResultsHomePage.tsx:57-84`

**Problem**: For each program, making 2 separate API calls:

- `get_finalized_publish_queue_v1` RPC call per program
- `getProgramPublicationCount` HEAD request per program

**Impact**: If there are 20 programs, this results in 40 API calls instead of 2-3 batched calls.

**Current Code**:

```typescript
const programsWithCounts = await Promise.all(
  (data || []).map(async (program) => {
    const [finalizedResult, publishedResult] = await Promise.allSettled([
      supabase.rpc("get_finalized_publish_queue_v1", {
        p_program_id: program.id,
      }),
      getProgramPublicationCount(supabase, program.id),
    ]);
    // ...
  })
);
```

**Optimization**: Create a batch RPC function that accepts multiple program IDs and returns counts for all:

```sql
CREATE OR REPLACE FUNCTION get_program_counts_batch(p_program_ids uuid[])
RETURNS TABLE (
  program_id uuid,
  finalized_count bigint,
  published_count bigint
)
```

**Expected Reduction**: 40 calls → 2 calls (95% reduction)

---

### 2. Duplicate RPC Calls (React StrictMode)

**Locations**:

- `src/pages/super/Assignments.tsx:41-53` - `super_list_orgs_v1`, `super_list_coalitions_v1`, `super_list_programs_v1` called twice
- `src/hub/OrgAdminHome.tsx:34` - `assign_org_admin_as_reviewer` called twice
- Multiple `super_list_user_assignments_v1` calls

**Problem**: React StrictMode in development causes components to mount twice, triggering duplicate API calls. However, these duplicates also appear in production logs, suggesting the issue exists beyond StrictMode.

**Impact**: 2x the necessary API calls

**Optimization**:

1. Add request deduplication/caching at the API call level
2. Use React Query or SWR for automatic request deduplication
3. Add a simple in-memory cache with TTL for these list calls

**Expected Reduction**: 50% reduction for affected calls

---

### 3. Repeated Profile Queries for Same User IDs

**Locations**:

- `src/auth/AuthProvider.tsx:38-42` - Checks `deleted_at` periodically
- `src/lib/capabilities.ts:81-85` - Checks `role, deleted_at`
- Multiple components checking the same user's profile

**Problem**: Same user ID queried multiple times with slight variations:

- `?select=deleted_at&id=eq.1f5ef8f3-9b5d-4ad2-93f6-d3ad49a3383c` (appears 5+ times)
- `?select=role%2Cdeleted_at&id=eq.4ecacf5b-611d-4c45-9fdf-a7caba107360`

**Impact**: Unnecessary database queries for data that rarely changes

**Optimization**:

1. Implement a profile cache with TTL (5-10 minutes)
2. Combine `role` and `deleted_at` checks into a single query
3. Use React Context to share profile data across components

**Expected Reduction**: 70-80% reduction in profile queries

---

## Medium Priority Issues

### 4. Duplicate Organization Queries

**Location**: Multiple components querying organization by slug

**Problem**: Same organization (`demo-org`) queried 4+ times in quick succession:

```
GET /rest/v1/organizations?select=id%2Cname%2Cslug%2Cdescription&slug=eq.demo-org
```

**Impact**: Redundant database queries

**Optimization**:

1. Cache organization data by slug with TTL
2. Use React Context for organization data
3. Create a shared `useOrganization` hook

**Expected Reduction**: 75% reduction

---

### 5. Inefficient Publication Count Queries

**Location**: `src/lib/publicationQueries.ts:70-103`

**Problem**: Using HEAD requests with count for each program individually. The `getProgramPublicationCount` function makes a HEAD request per program.

**Current Pattern**:

```typescript
// Called once per program
await client
  .from("program_publications")
  .select("publication_id", { count: "exact", head: true })
  .eq("program_id", programId);
```

**Optimization**:

1. Batch count queries using `IN` clause
2. Create a batch RPC function: `get_program_publication_counts_batch(p_program_ids uuid[])`

**Expected Reduction**: N calls → 1 call

---

### 6. Multiple OPTIONS (Preflight) Requests

**Problem**: Many OPTIONS requests before actual API calls, especially for RPC endpoints

**Impact**: Adds latency and unnecessary network overhead

**Optimization**:

1. Ensure CORS headers are properly configured to reduce preflight requests
2. Use simple requests where possible (GET, POST with simple content-types)
3. Cache preflight responses (browser handles this, but ensure proper headers)

**Note**: Some OPTIONS requests are unavoidable for CORS, but the frequency suggests room for improvement.

---

## Low Priority / Nice to Have

### 7. Multiple WebSocket Connections

**Problem**: Multiple `/realtime/v1/websocket` connections (status 101)

**Impact**: Unnecessary connection overhead

**Optimization**: Ensure only one WebSocket connection per user session

---

### 8. Health Check Calls

**Problem**: `HEAD /rest-admin/v1/ready` and `GET /auth/v1/health` calls

**Impact**: Minimal - these are likely infrastructure health checks

**Optimization**: These are likely necessary for monitoring, but could be reduced in frequency if not critical.

---

## Recommended Implementation Priority

### Phase 1 (Immediate - High Impact)

1. ✅ **Batch RPC for program counts** - Create `get_program_counts_batch` function
2. ✅ **Profile query caching** - Add cache layer for profile queries
3. ✅ **Request deduplication** - Add deduplication for RPC calls

### Phase 2 (Short-term - Medium Impact)

4. ✅ **Organization caching** - Cache organization data
5. ✅ **Batch publication counts** - Create batch function for publication counts
6. ✅ **Combine profile queries** - Merge role and deleted_at checks

### Phase 3 (Long-term - Polish)

7. ✅ **WebSocket connection management** - Ensure single connection
8. ✅ **CORS optimization** - Reduce preflight requests where possible

---

## Implementation Examples

### Example 1: Batch Program Counts RPC

```sql
CREATE OR REPLACE FUNCTION get_program_counts_batch(p_program_ids uuid[])
RETURNS TABLE (
  program_id uuid,
  finalized_count bigint,
  published_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS program_id,
    COALESCE(COUNT(DISTINCT CASE
      WHEN ar.status = 'submitted' THEN a.id
    END), 0) AS finalized_count,
    COALESCE(COUNT(DISTINCT ap.id), 0) AS published_count
  FROM unnest(p_program_ids) AS p(id)
  LEFT JOIN applications a ON a.program_id = p.id
  LEFT JOIN application_reviews ar ON ar.application_id = a.id
  LEFT JOIN application_publications ap ON ap.id = a.results_current_publication_id
  GROUP BY p.id;
END;
$$;
```

### Example 2: Profile Query Cache

```typescript
// src/lib/profileCache.ts
const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedProfile(userId: string) {
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const { data } = await supabase
    .from("profiles")
    .select("role, deleted_at")
    .eq("id", userId)
    .single();

  profileCache.set(userId, { data, timestamp: Date.now() });
  return data;
}
```

### Example 3: Request Deduplication

```typescript
// src/lib/requestDeduplication.ts
const pendingRequests = new Map<string, Promise<any>>();

export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}
```

---

## Expected Overall Impact

- **API Call Reduction**: 60-70% reduction in total API calls
- **Database Load**: 50-60% reduction in query load
- **Page Load Time**: 30-40% improvement for pages with multiple programs
- **Network Overhead**: 40-50% reduction in request/response cycles

---

## Monitoring Recommendations

1. Add API call logging/monitoring to track improvements
2. Set up alerts for unusual API call patterns
3. Monitor database query performance before/after optimizations
4. Track page load times for affected pages
