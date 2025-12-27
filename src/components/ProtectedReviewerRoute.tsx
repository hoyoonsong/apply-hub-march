import { Navigate } from "react-router-dom";
import { useCapabilitiesContext } from "../providers/CapabilitiesProvider";

export default function ProtectedReviewerRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { capabilities, loading } = useCapabilitiesContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const hasReviewerPrograms = (capabilities?.reviewerPrograms?.length ?? 0) > 0;
  const isSuper = localStorage.getItem("isSuper") === "1";
  const ok = hasReviewerPrograms || isSuper;

  return ok ? children : <Navigate to="/" replace />;
}
