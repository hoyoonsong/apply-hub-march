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
              path="/reviewer"
              element={
                <ProtectedReviewerRoute>
                  <ReviewerScopePicker />
                </ProtectedReviewerRoute>
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
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ScopeProvider>
    </AuthProvider>
  );
}
