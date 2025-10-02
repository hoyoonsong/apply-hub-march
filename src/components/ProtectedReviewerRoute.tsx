import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { loadCapabilities } from "../lib/capabilities";

export default function ProtectedReviewerRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    loadCapabilities()
      .then((caps) => {
        const hasReviewerPrograms = caps.reviewerPrograms.length > 0;
        const isSuper = localStorage.getItem("isSuper") === "1";
        setOk(hasReviewerPrograms || isSuper);
      })
      .catch(() => setOk(false));
  }, []);

  if (ok === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return ok ? children : <Navigate to="/" replace />;
}
