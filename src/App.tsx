import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import LaunchPage from "./LaunchPage";
import Dashboard from "./Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import PostAuth from "./PostAuth";
import Onboarding from "./Onboarding";

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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
