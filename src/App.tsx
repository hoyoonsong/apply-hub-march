import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ScopeProvider } from "./auth/ScopeProvider";
import LaunchPage from "./LaunchPage";
import Dashboard from "./Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedSuperRoute from "./components/ProtectedSuperRoute";
import PostAuth from "./PostAuth";
import Onboarding from "./Onboarding";
import NotFound from "./components/NotFound";
import Unauthorized from "./pages/Unauthorized";
import SuperHome from "./pages/super/SuperHome";
import Orgs from "./pages/super/Orgs";
import Programs from "./pages/super/Programs";
import Coalitions from "./pages/super/Coalitions";
import Users from "./pages/super/Users";
import SuperProgramsReview from "./pages/super/SuperProgramsReview";
import ReviewerHome from "./pages/reviewer/ReviewerHome";
import ReviewerScopePicker from "./pages/reviewer/ReviewerScopePicker";
import ReviewerInbox from "./pages/review/ReviewerInbox";
import ReviewWorkspace from "./pages/review/ReviewWorkspace";
import ReviewQueue from "./pages/review/ReviewQueue";
import ReviewerIndex from "./pages/reviewer/index";
import ReviewerQueue from "./pages/reviewer/programs/[programId]/queue";
import ReviewerApplication from "./pages/reviewer/applications/[applicationId]";
import ProgramQueue from "./pages/review/ProgramQueue";
import ApplicationReview from "./pages/review/ApplicationReview";
import Assignments from "./pages/super/Assignments";
import OrgHome from "./pages/public/OrgHome";
import CoalitionHome from "./pages/public/CoalitionHome";
import ProgramDetail from "./pages/public/ProgramDetail";
import PublicRouteGuard from "./components/PublicRouteGuard";
import ProtectedOrgAdminRoute from "./components/scopes/ProtectedOrgAdminRoute";
import ProtectedCoalitionRoute from "./components/scopes/ProtectedCoalitionRoute";
import ProtectedReviewerRoute from "./components/scopes/ProtectedReviewerRoute";
import CoalitionManagerHome from "./hub/CoalitionManagerHome";
import OrgAdminHome from "./hub/OrgAdminHome";
import OrgAdminPrograms from "./pages/org-admin/OrgAdminPrograms";
import OrgProgramBuilder from "./pages/org-admin/OrgProgramBuilder";
import CoalitionProgramBuilder from "./pages/coalition-manager/CoalitionProgramBuilder";
import ApplicationForm from "./pages/apply/ApplicationForm";
import ApplyProgramPage from "./pages/programs/ApplyProgramPage";
import ApplicationPage from "./pages/applications/ApplicationPage";
import ProfilePage from "./pages/profile";
import QueuePage from "./pages/review/QueuePage";
import ReviewPage from "./pages/review/ReviewPage";
import ReviewHome from "./pages/review/ReviewHome";
import ReviewAppPage from "./pages/review/ReviewAppPage";
import AllReviewsPage from "./pages/review/AllReviewsPage";
import OrgReviewsPage from "./pages/org/admin/OrgReviewsPage";

export default function App() {
  return (
    <AuthProvider>
      <ScopeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LaunchPage />} />
            <Route path="/post-auth" element={<PostAuth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super"
              element={
                <ProtectedSuperRoute>
                  <SuperHome />
                </ProtectedSuperRoute>
              }
            />
            <Route
              path="/super/orgs"
              element={
                <ProtectedSuperRoute>
                  <Orgs />
                </ProtectedSuperRoute>
              }
            />
            <Route
              path="/super/programs"
              element={
                <ProtectedSuperRoute>
                  <SuperProgramsReview />
                </ProtectedSuperRoute>
              }
            />
            <Route
              path="/super/programs/:programId/builder"
              element={
                <ProtectedSuperRoute>
                  <OrgProgramBuilder />
                </ProtectedSuperRoute>
              }
            />
            <Route
              path="/super/coalitions"
              element={
                <ProtectedSuperRoute>
                  <Coalitions />
                </ProtectedSuperRoute>
              }
            />
            <Route
              path="/super/users"
              element={
                <ProtectedSuperRoute>
                  <Users />
                </ProtectedSuperRoute>
              }
            />
            <Route
              path="/super/assignments"
              element={
                <ProtectedSuperRoute>
                  <Assignments />
                </ProtectedSuperRoute>
              }
            />
            <Route
              path="/coalition/:slug/cm"
              element={
                <ProtectedRoute>
                  <ProtectedCoalitionRoute>
                    <CoalitionManagerHome />
                  </ProtectedCoalitionRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coalition/:coalitionSlug/cm/programs/:programId/builder"
              element={
                <ProtectedRoute>
                  <ProtectedCoalitionRoute>
                    <CoalitionProgramBuilder />
                  </ProtectedCoalitionRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/:orgSlug/admin"
              element={
                <ProtectedRoute>
                  <ProtectedOrgAdminRoute>
                    <OrgAdminHome />
                  </ProtectedOrgAdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/:orgSlug/admin/programs"
              element={
                <ProtectedRoute>
                  <ProtectedOrgAdminRoute>
                    <OrgAdminPrograms />
                  </ProtectedOrgAdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/:orgSlug/admin/programs/:programId/builder"
              element={
                <ProtectedRoute>
                  <ProtectedOrgAdminRoute>
                    <OrgProgramBuilder />
                  </ProtectedOrgAdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/:orgSlug/admin/reviews"
              element={
                <ProtectedRoute>
                  <ProtectedOrgAdminRoute>
                    <OrgReviewsPage />
                  </ProtectedOrgAdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/:orgSlug/reviewer"
              element={
                <ProtectedRoute>
                  <ProtectedReviewerRoute>
                    <ReviewerHome />
                  </ProtectedReviewerRoute>
                </ProtectedRoute>
              }
            />
            {/* Public routes */}
            <Route
              path="/org/:orgSlug"
              element={
                <PublicRouteGuard type="org">
                  <OrgHome />
                </PublicRouteGuard>
              }
            />
            <Route
              path="/coalitions/:slug"
              element={
                <PublicRouteGuard type="coalition">
                  <CoalitionHome />
                </PublicRouteGuard>
              }
            />
            <Route
              path="/programs/:id"
              element={
                <PublicRouteGuard type="program">
                  <ProgramDetail />
                </PublicRouteGuard>
              }
            />
            <Route
              path="/programs/:programId/apply"
              element={<ApplyProgramPage />}
            />
            <Route path="/applications/:appId" element={<ApplicationPage />} />
            <Route
              path="/applications/:id"
              element={
                <ProtectedRoute>
                  <ApplicationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            {/* New simplified reviewer routes */}
            <Route
              path="/review"
              element={
                <ProtectedRoute needsReviewer>
                  <ReviewHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/review/:programId"
              element={
                <ProtectedRoute needsReviewer>
                  <QueuePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/review/app/:applicationId"
              element={
                <ProtectedRoute needsReviewer>
                  <ReviewAppPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/review/all"
              element={
                <ProtectedRoute needsReviewer>
                  <AllReviewsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ScopeProvider>
    </AuthProvider>
  );
}
