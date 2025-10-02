import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useCapabilities } from "../lib/capabilities";

type Props = {
  children: JSX.Element;
  needsReviewer?: boolean;
  needsAdmin?: boolean;
};

export default function ProtectedRoute({
  children,
  needsReviewer,
  needsAdmin,
}: Props) {
  const { user, loading: authLoading } = useAuth();
  const {
    hasReviewerAssignments,
    isSuperAdmin,
    isOrgAdmin,
    loading: capsLoading,
    userRole: _userRole,
  } = useCapabilities();
  const loc = useLocation();

  if (authLoading || capsLoading)
    return <div className="p-6 text-center">Loading…</div>;
  if (!user) return <Navigate to="/" state={{ from: loc }} replace />;

  if (needsAdmin && !(isSuperAdmin || isOrgAdmin)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (needsReviewer && !(isSuperAdmin || hasReviewerAssignments)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
