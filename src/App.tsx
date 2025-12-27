import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ScopeProvider } from "./auth/ScopeProvider";
import { CapabilitiesProvider } from "./providers/CapabilitiesProvider";
import NewLaunchPage from "./NewLaunchPage";
import Features from "./pages/Features";
import About from "./pages/About";
import HelpfulLinks from "./pages/HelpfulLinks";
import OurPartners from "./pages/OurPartners";
import Dashboard from "./Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedSuperRoute from "./components/ProtectedSuperRoute";
import PostAuth from "./pages/PostAuth";
import Onboarding from "./Onboarding";
import NotFound from "./components/NotFound";
import Unauthorized from "./pages/Unauthorized";
import SuperHome from "./pages/super/SuperHome";
import Orgs from "./pages/super/Orgs";
import Coalitions from "./pages/super/Coalitions";
import Users from "./pages/super/Users";
import SuperProgramsReview from "./pages/super/SuperProgramsReview";
import ReviewerHome from "./pages/reviewer/ReviewerHome";
import Assignments from "./pages/super/Assignments";
import FeaturedManager from "./pages/super/FeaturedManager";
import Forms from "./pages/super/Forms";
import OrgHome from "./pages/public/OrgHome";
import CoalitionHome from "./pages/public/CoalitionHome";
import ProgramDetail from "./pages/public/ProgramDetail";
import PublicRouteGuard from "./components/PublicRouteGuard";
import ProtectedOrgAdminRoute from "./components/scopes/ProtectedOrgAdminRoute";
import ProtectedCoalitionRoute from "./components/scopes/ProtectedCoalitionRoute";
import ProtectedReviewerRoute from "./components/scopes/ProtectedReviewerRoute";
import CoalitionManagerHome from "./hub/CoalitionManagerHome";
import OrgAdminHomeV2 from "./hub/OrgAdminHomeV2";
import OrgProgramBuilder from "./pages/org-admin/OrgProgramBuilder";
import CoalitionProgramBuilder from "./pages/coalition-manager/CoalitionProgramBuilder";
import ApplicationForm from "./pages/apply/ApplicationForm";
import DirectApplication from "./pages/apply/DirectApplication";
import ApplicationPage from "./pages/applications/ApplicationPage";
import ProfilePage from "./pages/profile";
import QueuePage from "./pages/review/QueuePage";
import ReviewHome from "./pages/review/ReviewHome";
import ReviewAppPage from "./pages/review/ReviewAppPage";
import AllReviewsPage from "./pages/review/AllReviewsPage";
import OrgApplicationsInbox from "./pages/org-admin/OrgApplicationsInbox";
import OrgManageReviewers from "./pages/org-admin/OrgManageReviewers";
import OrgMyTeams from "./pages/org-admin/OrgMyTeams";
import PublishResultsPage from "./pages/org-admin/PublishResultsPage";
import PublishResultsHomePage from "./pages/org-admin/PublishResultsHomePage";
import MySubmissionsPage from "./pages/applicant/MySubmissionsPage";

export default function App() {
  return (
    <AuthProvider>
      <CapabilitiesProvider>
        <ScopeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<NewLaunchPage />} />
              <Route path="/features" element={<Features />} />
              <Route path="/about" element={<About />} />
              <Route path="/helpful-links" element={<HelpfulLinks />} />
              <Route path="/our-partners" element={<OurPartners />} />
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
                path="/super/featured"
                element={
                  <ProtectedSuperRoute>
                    <FeaturedManager />
                  </ProtectedSuperRoute>
                }
              />
              <Route
                path="/super/forms"
                element={
                  <ProtectedSuperRoute>
                    <Forms />
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
                      <OrgAdminHomeV2 />
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
                path="/org/:orgSlug/admin/reviewers"
                element={
                  <ProtectedRoute>
                    <ProtectedOrgAdminRoute>
                      <OrgManageReviewers />
                    </ProtectedOrgAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/org/:orgSlug/admin/teams"
                element={
                  <ProtectedRoute>
                    <ProtectedOrgAdminRoute>
                      <OrgMyTeams />
                    </ProtectedOrgAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/org/:orgSlug/admin/applications-inbox"
                element={
                  <ProtectedRoute>
                    <ProtectedOrgAdminRoute>
                      <OrgApplicationsInbox />
                    </ProtectedOrgAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/org/:orgSlug/admin/publish-results"
                element={
                  <ProtectedRoute>
                    <ProtectedOrgAdminRoute>
                      <PublishResultsHomePage />
                    </ProtectedOrgAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/org/:orgSlug/admin/programs/:programId/publish"
                element={
                  <ProtectedRoute>
                    <ProtectedOrgAdminRoute>
                      <PublishResultsPage />
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
                element={<DirectApplication />}
              />
              <Route
                path="/applications/:appId"
                element={<ApplicationPage />}
              />
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
              <Route
                path="/my-submissions"
                element={
                  <ProtectedRoute>
                    <MySubmissionsPage />
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
      </CapabilitiesProvider>
    </AuthProvider>
  );
}
