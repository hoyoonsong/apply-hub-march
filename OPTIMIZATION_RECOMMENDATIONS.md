# Database Call Optimization Recommendations

## Current Situation

- **Capabilities calls**: ~30-40% of total calls
- **Profile queries** (getUserRole): ~10+ calls per session
- **Organization queries**: Multiple calls (should be cached)
- **assign_org_admin_as_reviewer**: Called 2x (should be 1x per session)

## Recommended Actions (Prioritized)

### 🎯 **Priority 1: Create CapabilitiesProvider** (High Impact, Medium Effort)

**Impact**: Reduces capabilities calls from ~20+ per navigation to ~4-8 total
**Effort**: 2-3 hours
**Risk**: Low (can be done incrementally)

**What to do:**

1. Create a `CapabilitiesProvider` component that fetches capabilities once at app level
2. Share via React Context
3. Update `ProtectedRoute` and other components to use context instead of calling `useCapabilities()` directly
4. Keep the hook for backward compatibility during migration

**Why this helps:**

- Currently, every page wrapped in `ProtectedRoute` (55+ routes) calls `useCapabilities()` independently
- Each call makes 4 RPCs: `my_admin_orgs_v1`, `my_reviewer_programs_v2`, `my_coalitions_v1`, `getUserRole()`
- With a provider, capabilities are fetched once and shared across all components

**Expected reduction**: ~60-70% reduction in capabilities-related calls

---

### 🎯 **Priority 2: Optimize getUserRole() Profile Queries** (Medium Impact, Low Effort)

**Impact**: Reduces profile queries from ~10+ to ~2-3 per session
**Effort**: 30 minutes
**Risk**: Very Low

**What to do:**

1. Increase the cache TTL for `getUserRole()` from 30 seconds to 2-5 minutes
2. The role rarely changes during a session, so longer cache is safe
3. Already has deduplication, just needs longer cache

**Why this helps:**

- `getUserRole()` is called as part of every `loadCapabilities()` call
- Currently cached for 30 seconds, but with multiple pages mounting, it's called frequently
- User roles don't change during a session (only when admin changes them)

**Expected reduction**: ~70-80% reduction in profile queries

---

### 🎯 **Priority 3: Verify Organization Cache is Working** (Low Impact, Low Effort)

**Impact**: Ensures org queries are properly cached
**Effort**: 15 minutes
**Risk**: None

**What to do:**

1. Check that `getOrgBySlug()` is using `getOrgBySlugCached()` everywhere
2. Verify the 10-minute cache is working
3. Add logging if needed to confirm cache hits

**Why this helps:**

- Organization data rarely changes
- Already has 10-minute cache, just need to verify it's being used

---

### 🎯 **Priority 4: Fix assign_org_admin_as_reviewer Double Call** (Low Impact, Low Effort)

**Impact**: Reduces from 2 calls to 1 call per session
**Effort**: Already done! (sessionStorage check added)
**Risk**: None

**Status**: ✅ Already implemented - should be working now

---

## Implementation Order

### Phase 1: Quick Wins (1 hour)

1. ✅ Increase `getUserRole()` cache TTL to 2-5 minutes
2. ✅ Verify organization cache is working
3. ✅ Confirm `assign_org_admin_as_reviewer` sessionStorage is working

**Expected reduction**: ~30-40% reduction in total calls

### Phase 2: Big Win (2-3 hours)

1. Create `CapabilitiesProvider`
2. Migrate `ProtectedRoute` to use context
3. Migrate other components incrementally

**Expected reduction**: Additional ~40-50% reduction in capabilities calls

---

## Alternative: Do Nothing (Not Recommended)

**Current state**:

- ~20-30 database calls per navigation session
- Most are cached/deduplicated, so actual DB load is lower
- But still more than necessary

**If you're on a paid Supabase plan:**

- Current calls are likely within limits
- But optimization is still good practice

**If you're on free tier:**

- Should definitely optimize to stay within limits

---

## My Recommendation

**Start with Phase 1 (Quick Wins)** - Takes ~1 hour, reduces calls by 30-40% with minimal risk.

**Then evaluate:**

- If calls are still too high → Do Phase 2 (CapabilitiesProvider)
- If calls are acceptable → You're done!

**Why this approach:**

- Low risk (doesn't change architecture)
- Quick results
- Can stop after Phase 1 if satisfied
- Phase 2 is optional but provides biggest win

---

## Code Changes Needed

### Phase 1: Quick Wins

**1. Increase getUserRole cache TTL:**

```typescript
// src/lib/capabilities.ts
const ROLE_CACHE_TTL = 300000; // 5 minutes (increased from 30 seconds)
```

**2. Verify organization cache:**

- Already implemented, just verify it's working

**3. assign_org_admin_as_reviewer:**

- Already fixed with sessionStorage

### Phase 2: CapabilitiesProvider (if needed)

Would need to:

1. Create `src/providers/CapabilitiesProvider.tsx`
2. Wrap app in provider
3. Update components to use context
4. Keep hook for backward compatibility

---

## Expected Results

**Before optimization:**

- ~20-30 calls per navigation session
- Multiple duplicate capabilities calls
- Frequent profile queries

**After Phase 1:**

- ~12-18 calls per navigation session
- Fewer profile queries
- Better cache utilization

**After Phase 2:**

- ~8-12 calls per navigation session
- Single capabilities fetch per session
- Minimal duplicate calls

---

## Bottom Line

**If you're worried about calls, start with Phase 1.** It's quick, safe, and provides immediate improvement. Phase 2 is optional but gives the biggest win if you need more reduction.
