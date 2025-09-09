import { Link } from "react-router-dom";
import { useCapabilities } from "../../lib/capabilities";
import { useEffect } from "react";

export default function ReviewHome() {
  const { reviewerPrograms } = useCapabilities();
  useEffect(() => {
    /* optional analytics */
  }, []);
  return (
    <div className="container">
      <h1 className="mb-4">Your Review Assignments</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {reviewerPrograms?.map((p: any) => (
          <Link
            key={p.id}
            className="block p-4 border rounded hover:bg-gray-50"
            to={`/review/${p.id}`}
          >
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-gray-500">{p.type}</div>
          </Link>
        ))}
        {(!reviewerPrograms || reviewerPrograms.length === 0) && (
          <div className="text-gray-500">No assignments yet.</div>
        )}
      </div>
    </div>
  );
}
