import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedCMRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const [loading, setLoading] = useState(true);
  const [isCoalitionManager, setIsCoalitionManager] = useState(false);

  useEffect(() => {
    const checkCoalitionManager = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsCoalitionManager(false);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        setIsCoalitionManager(profile?.role === "coalition_manager");
      } catch (error) {
        console.error("Error checking coalition manager status:", error);
        setIsCoalitionManager(false);
      } finally {
        setLoading(false);
      }
    };

    checkCoalitionManager();
  }, []);

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

  return isCoalitionManager ? children : <Navigate to="/" replace />;
}
