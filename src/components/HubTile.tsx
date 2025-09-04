import { ReactNode } from "react";

type HubTileProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

export default function HubTile({
  title,
  subtitle,
  icon,
  disabled = true,
  onClick,
}: HubTileProps) {
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
        "w-full text-left rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition",
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:shadow-md hover:border-gray-300",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5">{icon}</div>
        <div>
          <div className="text-lg font-semibold">{title}</div>
          {subtitle && (
            <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
          )}
        </div>
      </div>
    </button>
  );
}
