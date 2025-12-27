# Database Calls Analysis - Root Causes

## The Problem: Multiple `useCapabilities()` Calls

### Current Situation:

1. **`ProtectedRoute` is used on 55+ routes** in `App.tsx`

   - Every route wrapped in `<ProtectedRoute>` calls `useCapabilities()` hook
   - `useCapabilities()` makes **4 RPC calls** on mount:
     - `my_admin_orgs_v1`
     - `my_reviewer_programs_v2`
     - `my_coalitions_v1`
     - `getUserRole()` (which queries profiles table)

2. **Additional direct calls:**

   - `SmartDashboard` calls `loadCapabilities()` directly
   - `ProtectedReviewerRoute` calls `loadCapabilities()` directly
   - `AllReviewsPage` calls `useCapabilities()` directly
   - `QueuePage` calls `useCapabilities()` directly
   - `ReviewHome` calls `useCapabilities()` directly

3. **When navigating between pages:**
   - Each page mount → `ProtectedRoute` mounts → `useCapabilities()` called → 4 RPCs
   - Even with 30-second cache, React StrictMode (dev) causes double renders
   - Multiple pages mounting quickly can bypass cache

### Example Flow (Navigating from Dashboard to Org Admin):

1. User on `/dashboard`

   - `ProtectedRoute` calls `useCapabilities()` → 4 RPCs
   - `SmartDashboard` calls `loadCapabilities()` → 4 RPCs (cached, but still checks)

2. User navigates to `/org/:orgSlug/admin`

   - `ProtectedRoute` mounts → `useCapabilities()` → 4 RPCs
   - `OrgAdminHomeV2` mounts → calls `assign_org_admin_as_reviewer` → 1 RPC
   - `OrgAdminHomeV2` fetches org data → 1 query
   - `OrgAdminHomeV2` fetches programs → 1 query

3. User navigates to `/org/:orgSlug/admin/teams`
   - `ProtectedRoute` mounts → `useCapabilities()` → 4 RPCs (might be cached)
   - `OrgMyTeams` mounts → fetches org data → 1 query
   - `OrgMyTeams` fetches team members → 1 query

**Total for 3 page navigations: ~20+ database calls**

## Why This Happens:

1. **No shared capabilities context** - Each component fetches independently
2. **ProtectedRoute is too low-level** - Should check auth, not capabilities on every page
3. **Multiple components need capabilities** - But they all fetch separately
4. **React StrictMode** - In development, causes double renders/mounts

## Solutions:

### Option 1: Create a CapabilitiesProvider (Recommended)

- Fetch capabilities once at app level
- Share via React Context
- All components use the context instead of calling `useCapabilities()` directly

### Option 2: Make ProtectedRoute smarter

- Only call `useCapabilities()` if actually needed (needsAdmin/needsReviewer)
- Use a shared cache/context for capabilities

### Option 3: Increase cache TTL further

- Current: 30 seconds
- Could increase to 2-5 minutes
- But this doesn't solve the root cause

### Option 4: Remove useCapabilities from ProtectedRoute

- Only check auth in ProtectedRoute
- Let individual pages check capabilities if needed
- But this might break some authorization logic

## Recommended Fix:

Create a `CapabilitiesProvider` that:

1. Fetches capabilities once on app mount
2. Shares via Context API
3. All components use `useCapabilities()` from context (no duplicate fetches)
4. Only refetches when explicitly needed (e.g., after role changes)

This would reduce database calls from ~20+ per navigation session to ~4-8 total.
