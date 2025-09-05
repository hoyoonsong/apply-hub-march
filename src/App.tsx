import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import LaunchPage from "./LaunchPage";
import Dashboard from "./Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedSuperRoute from "./components/ProtectedSuperRoute";
import ProtectedCMRoute from "./components/ProtectedCMRoute";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import ProtectedReviewerRoute from "./components/ProtectedReviewerRoute";
import PostAuth from "./PostAuth";
import Onboarding from "./Onboarding";
import NotFound from "./components/NotFound";
import SuperHome from "./pages/super/SuperHome";
import Orgs from "./pages/super/Orgs";
import Programs from "./pages/super/Programs";
import Coalitions from "./pages/super/Coalitions";
import Users from "./pages/super/Users";
import SuperProgramsReview from "./pages/super/SuperProgramsReview";
import AdminPrograms from "./pages/admin/AdminPrograms";
import OrgHome from "./pages/public/OrgHome";
import CoalitionHome from "./pages/public/CoalitionHome";
import ProgramDetail from "./pages/public/ProgramDetail";
import PublicRouteGuard from "./components/PublicRouteGuard";
import CoalitionManagerHome from "./hub/CoalitionManagerHome";
import OrgAdminHome from "./hub/OrgAdminHome";
import ReviewerHome from "./hub/ReviewerHome";

export default function App() {
  return (
    <AuthProvider>
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
            path="/cm"
            element={
              <ProtectedCMRoute>
                <CoalitionManagerHome />
              </ProtectedCMRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <OrgAdminHome />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/programs"
            element={
              <ProtectedAdminRoute>
                <AdminPrograms />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/reviewer"
            element={
              <ProtectedReviewerRoute>
                <ReviewerHome />
              </ProtectedReviewerRoute>
            }
          />
          {/* Public routes */}
          <Route
            path="/orgs/:slug"
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
