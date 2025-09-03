import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session?.user);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6 text-center">Loading…</div>;
  return authed ? children : <Navigate to="/" replace />;
}
