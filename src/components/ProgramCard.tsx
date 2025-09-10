import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startOrGetApplication } from "../lib/rpc";
import { isBeforeOpenDate, isPastDeadline } from "../lib/deadlineUtils";
import type { Program } from "../types/programs";

function formatDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

export default function ProgramCard({ program }: { program: Program }) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const open = formatDate(program.open_at);
  const close = formatDate(program.close_at);
  const isOpensSoon = isBeforeOpenDate(program.open_at);
  const isDeadlinePassed = isPastDeadline(program.close_at);

  const handleStartApplication = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (starting || isOpensSoon || isDeadlinePassed) return;

    setStarting(true);
    try {
      const app = await startOrGetApplication(program.id);
      navigate(`/applications/${app.id}`);
    } catch (error) {
      console.error("Failed to start application:", error);
      // You could show a toast or error message here
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      onClick={handleStartApplication}
      className={`relative block bg-white rounded-lg border shadow-sm transition-shadow ${
        isOpensSoon || isDeadlinePassed
          ? "border-gray-200 cursor-not-allowed"
          : "border-gray-200 hover:shadow-md cursor-pointer"
      }`}
    >
      <div
        className={`p-5 ${isOpensSoon || isDeadlinePassed ? "opacity-40" : ""}`}
      >
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
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded ${
              isOpensSoon || isDeadlinePassed
                ? "bg-gray-100 text-gray-500"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {starting
              ? "Starting..."
              : isOpensSoon
              ? "Coming Soon"
              : isDeadlinePassed
              ? "Closed"
              : "Apply"}
          </span>
        </div>
      </div>
    </div>
  );
}
