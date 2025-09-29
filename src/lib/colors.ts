const ALLOWED_BG = new Set([
  "bg-blue-600",
  "bg-purple-600",
  "bg-gray-700",
  "bg-orange-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-sky-600",
  "bg-red-600",
  "bg-green-600",
  "bg-yellow-600",
  "bg-indigo-600",
  "bg-pink-600",
  "bg-teal-600",
  "bg-cyan-600",
  "bg-lime-600",
  "bg-amber-600",
  "bg-violet-600",
  "bg-fuchsia-600",
  "bg-slate-600",
  "bg-zinc-600",
  "bg-neutral-600",
  "bg-stone-600",
]);

export function toCardStyle(input?: string | null) {
  if (!input) return {};
  const v = input.trim();
  // hex or rgb → inline style
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) || /^rgb/.test(v))
    return { style: { background: v } };
  // tailwind utility → ensure it's safelisted above
  if (ALLOWED_BG.has(v)) return { className: v };
  return {};
}
