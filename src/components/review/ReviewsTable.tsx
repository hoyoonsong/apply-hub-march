import { Link } from "react-router-dom";

export type ReviewRow = {
  review_id: string;
  application_id: string;
  app_status: string | null;
  program_id: string;
  program_name: string;
  organization_id: string;
  organization_name: string | null;
  applicant_id: string;
  applicant_name: string | null;
  reviewer_id?: string;
  reviewer_name?: string | null;
  score: number | null;
  status: string;
  submitted_at: string | null;
  updated_at: string | null;
};

export default function ReviewsTable({
  rows,
  variant, // "my" | "org"
}: {
  rows: ReviewRow[];
  variant: "my" | "org";
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Updated</th>
            <th className="py-2 pr-4">Program</th>
            <th className="py-2 pr-4">Applicant</th>
            {variant === "org" && <th className="py-2 pr-4">Reviewer</th>}
            <th className="py-2 pr-4">Review Status</th>
            <th className="py-2 pr-4">Score</th>
            <th className="py-2 pr-4">Open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const updated = r.submitted_at ?? r.updated_at;
            return (
              <tr key={r.review_id} className="border-b">
                <td className="py-2 pr-4">
                  {updated ? new Date(updated).toLocaleString() : "—"}
                </td>
                <td className="py-2 pr-4">
                  <div className="font-medium">{r.program_name}</div>
                  <div className="text-xs text-gray-500">
                    {r.organization_name ?? "—"}
                  </div>
                </td>
                <td className="py-2 pr-4">
                  {r.applicant_name ?? r.applicant_id}
                </td>
                {variant === "org" && (
                  <td className="py-2 pr-4">
                    {r.reviewer_name ?? r.reviewer_id ?? "—"}
                  </td>
                )}
                <td className="py-2 pr-4">{r.status}</td>
                <td className="py-2 pr-4">{r.score ?? "—"}</td>
                <td className="py-2 pr-4">
                  <Link
                    className="text-blue-600 underline"
                    to={`/review/app/${r.application_id}`}
                  >
                    Open
                  </Link>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td
                className="py-6 text-gray-500"
                colSpan={variant === "org" ? 7 : 6}
              >
                No reviews yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
