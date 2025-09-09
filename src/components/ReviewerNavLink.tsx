import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  loadCapabilities,
  hasReviewerAssignments,
  type Capabilities,
} from "../lib/capabilities";

export default function ReviewerNavLink() {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCaps = async () => {
      try {
        const caps = await loadCapabilities();
        setCapabilities(caps);
      } catch (error) {
        console.error("Failed to load capabilities:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCaps();
  }, []);

  if (loading) return null;
  if (!hasReviewerAssignments(capabilities)) return null;

  return (
    <Link
      to="/review"
      className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-white hover:border-gray-400 text-gray-700 transition-all duration-200 hover:shadow-sm"
    >
      Reviews
    </Link>
  );
}
