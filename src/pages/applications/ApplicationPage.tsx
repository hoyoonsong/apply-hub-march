import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Minimal shim to satisfy import and keep routes working.
// Redirect users to My Submissions (or any desired destination).
export default function ApplicationPage() {
  const navigate = useNavigate();
  const { appId } = useParams();

  useEffect(() => {
    if (appId) navigate(`/applications/${appId}`, { replace: true });
    else navigate("/my-submissions", { replace: true });
  }, [appId, navigate]);

  return null;
}

