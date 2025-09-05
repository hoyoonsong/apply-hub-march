import { Link } from "react-router-dom";
import type { Program } from "../types/programs";

function formatDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

export default function ProgramCard({ program }: { program: Program }) {
  const open = formatDate(program.open_at);
  const close = formatDate(program.close_at);

  return (
    <Link
      to={`/programs/${program.id}`}
      className="block bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {program.name}
          </h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              program.type === "audition"
                ? "bg-indigo-100 text-indigo-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {program.type}
          </span>
        </div>
        {program.description && (
          <p
            className="mt-2 text-sm text-gray-600 overflow-hidden"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {program.description}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div>
            {open && <span className="mr-3">Opens: {open}</span>}
            {close && <span>Closes: {close}</span>}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}
