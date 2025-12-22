# Remaining Optimization Opportunities

## ✅ Already Optimized (Recent Work)

1. ✅ **OrgMyTeams** - Batch assignments, add/remove optimized, local state updates
2. ✅ **PublishResultsHomePage** - Batch counts function
3. ✅ **Profile caching** - Comprehensive cache with 5-min TTL
4. ✅ **Organization caching** - 10-min TTL cache
5. ✅ **RPC deduplication** - Applied to key pages (Assignments, OrgAdminHome, OrgMyTeams, capabilities)

---

## 🔍 Potential Remaining Issues

### 1. RPC Calls Without Deduplication

**Status**: ⚠️ **PARTIALLY DONE** - Some pages have it, others don't

**Files to check**:

- `src/pages/review/*.tsx` - Review pages might benefit from deduplication
- `src/pages/org-admin/OrgProgramBuilder.tsx` - 5 RPC calls, check if duplicates occur
- `src/lib/programs.ts` - 19 RPC calls, check for duplicates
- `src/services/super.ts` - 18 RPC calls, check for duplicates
- `src/lib/programAssignments.ts` - 6 RPC calls

**Action**: Add `deduplicateRequest` wrapper to RPC calls in useEffect hooks that might trigger on double-mount.

---

### 2. Missing Batch Functions

**Status**: ⚠️ **MOSTLY DONE** - Key areas batched, but check for edge cases

**Potential areas**:

- **Program metadata queries** - Already has batch function ✅
- **Review forms** - Already has batch function ✅
- **Effective roles** - Already has batch function ✅
- **Program assignments** - Already has batch function ✅

**Check**: Are there any other places making N calls for similar data?

---

### 3. Unnecessary Data Reloads

**Status**: ⚠️ **PARTIALLY DONE** - OrgMyTeams fixed, but check other pages

**Files to review**:

- `src/pages/review/AllReviewsPage.tsx` - Does it reload unnecessarily?
- `src/pages/super/Users.tsx` - Already optimized with batch ✅
- `src/pages/org-admin/PublishResultsPage.tsx` - Check if operations reload unnecessarily

**Action**: Review pages where operations (add/remove/edit) trigger full data reloads instead of local state updates.

---

### 4. Profile Query Bypasses

**Status**: ⚠️ **NEEDS VERIFICATION** - Cache exists but might be bypassed

**Potential issues**:

- Direct `.from("profiles")` queries that bypass `getCachedProfile()`
- Different query patterns (`select=deleted_at` vs `select=role,deleted_at`)

**Action**: Search for all `.from("profiles")` calls and ensure they use the cache when possible.

---

### 5. Organization Query Bypasses

**Status**: ⚠️ **NEEDS VERIFICATION** - Cache exists but might be bypassed

**Potential issues**:

- Direct `.from("organizations")` queries that bypass `getOrgBySlug()`
- Queries by ID instead of slug

**Action**: Search for all `.from("organizations")` calls and ensure they use the cache when possible.

---

### 6. Realtime Subscription Scope

**Status**: ⚠️ **LOW PRIORITY** - Performance impact is minimal

**Issue**: Some subscriptions listen to entire tables instead of filtered changes.

**Files**:

- `src/pages/review/AllReviewsPage.tsx` - Listens to all `application_reviews` changes
- `src/hooks/useCollaborativeReview.ts` - Already scoped by `application_id` ✅

**Action**: Consider scoping subscriptions by `program_id` or `user_id` if performance becomes an issue.

---

## 📊 Summary by Priority

### High Priority (Do Now)

1. ✅ **DONE** - OrgMyTeams optimizations
2. ✅ **DONE** - PublishResultsHomePage batch function
3. ⚠️ **REVIEW** - Add deduplication to remaining RPC calls in useEffect hooks

### Medium Priority (Do Soon)

4. ⚠️ **REVIEW** - Check for profile query bypasses
5. ⚠️ **REVIEW** - Check for organization query bypasses
6. ⚠️ **REVIEW** - Check for unnecessary reloads in other pages

### Low Priority (Nice to Have)

7. ⚠️ **OPTIONAL** - Scope realtime subscriptions more narrowly
8. ⚠️ **OPTIONAL** - Add request-level caching for frequently accessed data

---

## 🔧 Quick Wins

### 1. Add Deduplication to Review Pages

**Files**: `src/pages/review/*.tsx`

**Pattern to add**:

```typescript
import {
  deduplicateRequest,
  createRpcKey,
} from "../../lib/requestDeduplication";

// Wrap RPC calls in useEffect
const { data, error } = await deduplicateRequest(
  createRpcKey("reviews_list_v1", { p_program_id: programId }),
  () => supabase.rpc("reviews_list_v1", { p_program_id: programId })
);
```

### 2. Check Profile Query Usage

**Search for**: `.from("profiles")`

**Action**: Ensure all profile queries use `getCachedProfile()` when possible, or add cache wrapper.

### 3. Check Organization Query Usage

**Search for**: `.from("organizations")`

**Action**: Ensure all organization queries use `getOrgBySlug()` or org cache when possible.

---

## ✅ Verification Checklist

- [x] OrgMyTeams - Fully optimized
- [x] PublishResultsHomePage - Batch function added
- [x] Profile caching - Comprehensive cache implemented
- [x] Organization caching - Cache implemented
- [x] RPC deduplication - Applied to key pages
- [ ] Review pages - Add deduplication if needed
- [ ] Profile queries - Verify no bypasses
- [ ] Organization queries - Verify no bypasses
- [ ] Other pages - Check for unnecessary reloads

---

## 📝 Notes

- Most critical optimizations are **DONE**
- Remaining items are mostly **defensive** (preventing future issues)
- The platform should now be significantly faster than before
- Monitor network tabs in production to catch any new N+1 patterns
