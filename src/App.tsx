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
                <Programs />
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
            path="/reviewer"
            element={
              <ProtectedReviewerRoute>
                <ReviewerHome />
              </ProtectedReviewerRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
