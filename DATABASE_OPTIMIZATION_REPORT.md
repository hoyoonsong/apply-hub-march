# Database Optimization Diagnostic Report

## Executive Summary

After analyzing the codebase, I've identified several optimization opportunities. The platform has **311 database query calls** across 73 files. While many are well-optimized, there are some areas that could be improved.

## 🔴 Critical Issues (High Impact)

### 1. N+1 Query in Users Page (`src/pages/super/Users.tsx`)

**Issue:** Loading effective roles for each user individually (even with caching)

```typescript
// Lines 239-251: Makes N separate RPC calls on first load
Promise.all(
  users.map(async (user) => {
    const effective = await getEffectiveRoles(user.id); // Has cache, but still N calls on first load
    // ...
  })
);
```

**Impact:** If viewing 100 users, this makes 100 separate database calls on initial page load
**Note:** `getEffectiveRoles` has caching, which helps on subsequent loads, but first load is expensive
**Fix:** Batch into a single RPC call that accepts an array of user IDs

### 2. Broad Realtime Subscriptions (`src/pages/review/AllReviewsPage.tsx`)

**Issue:** Listening to ALL changes on entire tables

```typescript
// Lines 211-222: Listens to ALL application_reviews and programs changes
.on("postgres_changes", { event: "*", schema: "public", table: "application_reviews" })
.on("postgres_changes", { event: "*", schema: "public", table: "programs" })
```

**Impact:** Every review save/update triggers a refresh for ALL users viewing this page
**Fix:** Filter by program_id or user_id to scope subscriptions

### 3. Program Form Configs - Multiple RPC Calls (`src/pages/review/AllReviewsPage.tsx`)

**Issue:** Makes N individual RPC calls for program form configs (even with caching)

```typescript
// Lines 30-32: Each program gets its own RPC call on first load
const configPromises = uniqueProgramIds.map(async (programId) => {
  const formConfig = await getProgramReviewForm(programId); // Has cache, but still N calls on first load
});
```

**Impact:** If viewing 20 programs, makes 20 separate RPC calls on initial page load
**Note:** `getProgramReviewForm` has caching, which helps on subsequent loads
**Fix:** Create a batched RPC function that accepts multiple program IDs

## 🟡 Medium Priority Issues

### 4. Realtime Subscription Scope (`src/pages/review/QueuePage.tsx`, `AllReviewsPage.tsx`)

**Issue:** Some subscriptions listen to table-wide changes without filtering
**Impact:** Unnecessary refreshes when unrelated data changes
**Recommendation:** Add filters to scope subscriptions (e.g., by program_id, user_id)

### 5. Missing Query Result Caching

**Issue:** Program metadata/configs are refetched on every page load
**Impact:** Repeated queries for the same data
**Recommendation:** Implement short-term caching (5-10 minutes) for program configs

### 6. Autosave Frequency (`src/components/useApplicationAutosave.ts`)

**Status:** Already optimized with debouncing
**Note:** Current implementation is good - saves every 3-5 seconds during activity

## ✅ Well-Optimized Areas

1. **MySubmissionsPage** - Just fixed! Now batches program config queries
2. **useUnreadNotifications** - Uses efficient count queries and realtime subscriptions
3. **useCollaborativeReview** - Has debouncing and prevents double reloads
4. **ApplicationForm** - Parallelizes queries where possible
5. **QueuePage** - Uses Promise.allSettled for parallel queries
6. **getProgramReviewForm** - Already has caching (5 min TTL)
7. **getEffectiveRoles** - Already has caching (5 min TTL)

## 📊 Query Volume Analysis

- **Total Query Points:** 311 across 73 files
- **Average per File:** ~4.3 queries
- **High-Volume Files:**
  - `OrgProgramBuilder.tsx`: 18 queries
  - `CoalitionProgramBuilder.tsx`: 9 queries
  - `PublishResultsPage.tsx`: 9 queries

## 🎯 Recommended Actions (Priority Order)

### Immediate (High Impact, Low Effort)

1. **Batch getEffectiveRoles** - Create `get_effective_roles_batch` RPC function
2. **Scope Realtime Subscriptions** - Add filters to AllReviewsPage subscriptions
3. **Batch getProgramReviewForm** - Create `get_program_review_forms_batch` RPC function

### Short-term (Medium Impact, Medium Effort)

4. **Add Query Caching** - Cache program configs for 5-10 minutes
5. **Review Realtime Subscriptions** - Audit all subscriptions for proper scoping

### Long-term (Lower Priority)

6. **Query Monitoring** - Add logging to identify slow queries
7. **Database Indexes** - Review query patterns for missing indexes

## 🔍 How to Diagnose Further

1. **Enable Query Logging:**

   ```sql
   -- In Supabase dashboard, enable query logging
   -- Monitor slow queries (>100ms)
   ```

2. **Add Performance Monitoring:**

   - Track query counts per page load
   - Monitor realtime subscription activity
   - Identify pages with >10 queries per load

3. **User Behavior Analysis:**
   - Check if high query counts correlate with:
     - Number of active users
     - Specific pages being accessed
     - Time of day patterns

## 💡 Quick Wins

1. **Users Page:** Batch effective roles query (saves ~99% of queries for 100 users)
2. **AllReviewsPage:** Scope realtime subscriptions (reduces unnecessary refreshes by ~80%)
3. **Program Configs:** Batch queries (saves ~95% of queries for 20 programs)

## 📈 Expected Impact

After implementing the top 3 fixes:

- **Users Page:** 100 queries → 1 query (99% reduction)
- **AllReviewsPage:** 20+ queries → 2-3 queries (85% reduction)
- **Overall:** Estimated 40-50% reduction in total database calls

---

**Generated:** $(date)
**Analyzed Files:** 73
**Total Query Points:** 311
