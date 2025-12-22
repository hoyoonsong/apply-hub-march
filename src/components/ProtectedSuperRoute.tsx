import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getCachedProfile } from "../lib/profileCache";

export default function ProtectedSuperRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        // First try cached profile (role + deleted_at)
        const cached = await getCachedProfile(session.user.id);

        let role: string | null = null;
        let deletedAt: string | null = null;

        if (cached) {
          role = cached.role;
          deletedAt = cached.deleted_at;
        } else {
          // Fallback to direct query (preserves existing behavior)
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, deleted_at")
            .eq("id", session.user.id)
            .single();
          role = (profile as any)?.role ?? null;
          deletedAt = (profile as any)?.deleted_at ?? null;
        }

        // Check if user is deleted or not superadmin
        if (deletedAt) {
          console.log("User is soft deleted, denying super admin access");
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(role === "superadmin");
        }
      } catch (error) {
        console.error("Error checking super admin status:", error);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
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

  return isSuperAdmin ? children : <Navigate to="/" replace />;
}
