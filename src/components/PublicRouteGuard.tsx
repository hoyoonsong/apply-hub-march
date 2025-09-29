import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getOrgBySlug } from "../lib/orgs";

type PublicRouteGuardProps = {
  children: React.ReactNode;
  type: "org" | "coalition" | "program";
};

export default function PublicRouteGuard({
  children,
  type,
}: PublicRouteGuardProps) {
  const { orgSlug, slug, id } = useParams();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function validate() {
      if (!mounted) return;
      setLoading(true);

      try {
        if (type === "org" && orgSlug) {
          const org = await getOrgBySlug(orgSlug);
          if (!mounted) return;
          setIsValid(!!org);
          setLoading(false);
        } else if (type === "coalition" && slug) {
          const { data, error } = await supabase.rpc(
            "super_list_coalitions_v1",
            {
              include_deleted: false,
            }
          );

          if (error || !data) {
            if (!mounted) return;
            setIsValid(false);
            setLoading(false);
            return;
          }

          const exists = data.some((coalition: any) => coalition.slug === slug);
          if (!mounted) return;
          setIsValid(exists);
          setLoading(false);
        } else if (type === "program" && id) {
          const { data, error } = await supabase.rpc("super_list_programs_v1");

          if (error || !data) {
            if (!mounted) return;
            setIsValid(false);
            setLoading(false);
            return;
          }

          const exists = data.some(
            (program: any) => program.id === id && program.published
          );
          if (!mounted) return;
          setIsValid(exists);
          setLoading(false);
        } else {
          if (!mounted) return;
          setIsValid(false);
          setLoading(false);
        }
      } catch (err) {
        if (!mounted) return;
        setIsValid(false);
        setLoading(false);
      }
    }

    validate();
    return () => {
      mounted = false;
    };
  }, [type, orgSlug, slug, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isValid === false) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-16 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            {type === "org"
              ? "Organization"
              : type === "coalition"
              ? "Coalition"
              : "Program"}
          </h1>
          <p className="mt-3 text-gray-600">Not found</p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
