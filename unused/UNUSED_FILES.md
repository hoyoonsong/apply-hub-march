# Unused Files in Codebase

This document lists files that are currently not being used or hooked up to the website.

**All unused files have been moved to the `unused/` folder.**

## Review Pages (unused/pages/review/)

1. **ReviewQueue.tsx** - Not imported anywhere. Appears to be an older version replaced by QueuePage.tsx
2. **ReviewWorkspace.tsx** - Not imported anywhere
3. **ReviewerInbox.tsx** - Not imported anywhere
4. **ReviewPage.tsx** - Not imported anywhere
5. **ApplicationReview.tsx** - Not imported anywhere
6. **ProgramQueue.tsx** - Not imported anywhere

## Org Admin Pages (unused/pages/org/admin/)

7. **OrgReviewsPage.tsx** - Not imported anywhere. Replaced by OrgApplicationsInbox.tsx

## Hub Pages (unused/hub/)

8. **OrgAdminHome.tsx** - Not imported anywhere. Replaced by OrgAdminHomeV2.tsx
9. **ReviewerHome.tsx** - Not imported anywhere. Different from pages/reviewer/ReviewerHome.tsx which IS used

## Reviewer Pages (unused/pages/reviewer/)

10. **index.tsx** - Not imported anywhere
11. **applications/[applicationId].tsx** - Not imported anywhere
12. **programs/queue.tsx** - Not imported anywhere
13. **ReviewerScopePicker.tsx** - Not imported anywhere

## Other Pages (unused/pages/programs/)

14. **ApplyProgramPage.tsx** - Not imported anywhere

---

## Files That ARE Used (for reference)

- **ReviewHome.tsx** (pages/review/) - IS routed at `/review`
- **OrgManageReviewers.tsx** - IS routed at `/org/:orgSlug/admin/reviewers`
- **OrgAdminPrograms.tsx** - IS routed at `/org/:orgSlug/admin/programs`
- **ReviewerHome.tsx** (pages/reviewer/) - IS routed at `/org/:orgSlug/reviewer`
- **QueuePage.tsx** - IS routed at `/review/:programId`
- **ReviewAppPage.tsx** - IS routed at `/review/app/:applicationId`
- **AllReviewsPage.tsx** - IS routed at `/review/all`
