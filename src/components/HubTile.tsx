import { ReactNode } from "react";

type HubTileProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  accent?: "blue" | "green" | "purple" | "orange";
};

export default function HubTile({
  title,
  subtitle,
  icon,
  disabled = true,
  onClick,
  accent,
}: HubTileProps) {
  const accentStyles = {
    blue: "border-blue-200/60 bg-gradient-to-br from-blue-50/40 via-white to-white hover:border-blue-300 hover:from-blue-50/60",
    green: "border-green-200/60 bg-gradient-to-br from-green-50/40 via-white to-white hover:border-green-300 hover:from-green-50/60",
    purple: "border-purple-200/60 bg-gradient-to-br from-purple-50/40 via-white to-white hover:border-purple-300 hover:from-purple-50/60",
    orange: "border-orange-200/60 bg-gradient-to-br from-orange-50/40 via-white to-white hover:border-orange-300 hover:from-orange-50/60",
  };

  const baseStyles = accent
    ? accentStyles[accent]
    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50";

  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) {
          alert("Coming soon");
          return;
        }
        onClick?.();
      }}
      aria-disabled={disabled}
      className={[
        "w-full text-left rounded-xl border p-6 shadow-sm transition-all duration-200",
        "flex flex-col h-full min-h-[140px]",
        baseStyles,
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 flex-1">
        {icon && <div className="mt-0.5 flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold text-gray-900 leading-tight">
            {title}
          </div>
          {subtitle && (
            <div className="text-sm text-gray-600 mt-2 leading-relaxed">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
