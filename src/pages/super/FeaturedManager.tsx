import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Placement = "carousel" | "gallery";
type TargetType = "org" | "program" | "coalition";

type SearchResult = {
  id: string;
  name: string;
  slug?: string | null;
  type: TargetType;
  extra?: string | null;
};

type FeaturedRow = {
  id: string;
  placement: Placement;
  target_type: TargetType;
  target_id: string;
  sort_index: number;
  title: string | null;
  description: string | null;
  card_color: string | null;
};

export default function FeaturedManager() {
  const [placement, setPlacement] = useState<Placement>("carousel");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TargetType>("org");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [items, setItems] = useState<FeaturedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [cardColor, setCardColor] = useState<string>("");
  const [showColorModal, setShowColorModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from("featured")
      .select(
        "id, placement, target_type, target_id, sort_index, title, description, card_color"
      )
      .eq("placement", placement)
      .order("sort_index", { ascending: true });
    if (error) {
      console.error(error);
      alert("Failed to load featured items");
      return;
    }
    setItems(data || []);
  };

  useEffect(() => {
    loadItems();
  }, [placement]);

  // search using your existing RPCs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        if (filter === "org") {
          const { data } = await supabase.rpc("search_orgs", {
            q: query,
            max: 20,
          });
          if (!cancelled)
            setResults(
              (data || []).map((o: any) => ({
                id: o.id,
                name: o.name,
                slug: o.slug,
                type: "org",
              }))
            );
        } else if (filter === "program") {
          const { data } = await supabase.rpc("search_programs", {
            q: query,
            max: 20,
          });
          if (!cancelled)
            setResults(
              (data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                type: "program",
              }))
            );
        } else {
          const { data } = await supabase.rpc("search_coalitions", {
            q: query,
            max: 20,
          });
          if (!cancelled)
            setResults(
              (data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                type: "coalition",
              }))
            );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, filter]);

  const showAddModal = (sel: SearchResult) => {
    setSelectedItem(sel);
    setCardColor(""); // Reset color selection
    setShowColorModal(true);
  };

  const confirmAddItem = async () => {
    if (!selectedItem) return;

    const maxIndex = Math.max(-1, ...items.map((i) => i.sort_index));
    const { error } = await supabase.from("featured").upsert(
      {
        placement,
        target_type: selectedItem.type,
        target_id: selectedItem.id,
        sort_index: maxIndex + 1,
        title: selectedItem.name,
        card_color: cardColor?.trim() || null,
      },
      { onConflict: "placement,target_type,target_id" }
    );
    if (error) {
      console.error(error);
      alert("Failed to add");
      return;
    }

    // Close modal and reset
    setShowColorModal(false);
    setSelectedItem(null);
    setCardColor("");
    setQuery("");
    setResults([]);
    loadItems();
  };

  const removeItem = async (row: FeaturedRow) => {
    const { error } = await supabase.from("featured").delete().eq("id", row.id);
    if (error) {
      console.error(error);
      alert("Failed to remove");
      return;
    }
    loadItems();
  };

  const move = async (row: FeaturedRow, dir: -1 | 1) => {
    const idx = items.findIndex((i) => i.id === row.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const a = items[idx];
    const b = items[swapIdx];

    // Use separate update calls instead of upsert to avoid null constraint issues
    const { error: error1 } = await supabase
      .from("featured")
      .update({ sort_index: b.sort_index })
      .eq("id", a.id);

    const { error: error2 } = await supabase
      .from("featured")
      .update({ sort_index: a.sort_index })
      .eq("id", b.id);

    if (error1 || error2) {
      console.error(error1 || error2);
      alert("Failed to reorder");
      return;
    }
    loadItems();
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Featured Manager</h1>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-gray-600">Placement</label>
        <select
          value={placement}
          onChange={(e) => setPlacement(e.target.value as Placement)}
          className="border rounded px-3 py-2"
        >
          <option value="carousel">Carousel</option>
          <option value="gallery">Gallery</option>
        </select>
      </div>

      <div className="mb-6">
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TargetType)}
            className="border rounded px-3 py-2"
          >
            <option value="org">Orgs</option>
            <option value="program">Programs</option>
            <option value="coalition">Coalitions</option>
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="flex-1 border rounded px-3 py-2"
          />
        </div>
        {loading && (
          <div className="text-sm text-gray-500 mt-2">Searching…</div>
        )}
        {results.length > 0 && (
          <ul className="mt-2 border rounded divide-y">
            {results.map((r) => (
              <li
                key={`${r.type}:${r.id}`}
                className="flex items-center justify-between px-3 py-2"
              >
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {r.type}
                    {r.slug ? ` · ${r.slug}` : ""}
                  </div>
                </div>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  onClick={() => showAddModal(r)}
                >
                  Add to {placement}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="text-lg font-semibold mb-2">Current Items</h2>
      <ul className="border rounded divide-y">
        {items.map((i) => (
          <li
            key={i.id}
            className="flex items-center justify-between px-3 py-2"
          >
            <div>
              <div className="font-medium">{i.title ?? i.target_id}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="capitalize">
                  {i.target_type} · sort {i.sort_index}
                </span>
                {i.card_color && (
                  <span
                    className={`inline-block h-3 w-6 rounded ${
                      i.card_color.startsWith("bg-") ? i.card_color : ""
                    }`}
                    style={
                      !i.card_color.startsWith("bg-")
                        ? { backgroundColor: i.card_color }
                        : undefined
                    }
                    title={i.card_color}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 border rounded"
                onClick={() => move(i, -1)}
              >
                ↑
              </button>
              <button
                className="px-2 py-1 border rounded"
                onClick={() => move(i, +1)}
              >
                ↓
              </button>
              <button
                className="px-2 py-1 border rounded text-red-600"
                onClick={() => removeItem(i)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-3 py-4 text-sm text-gray-500">Nothing yet.</li>
        )}
      </ul>

      {/* Color Selection Modal */}
      {showColorModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Add "{selectedItem.name}" to {placement}
            </h3>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600">
                Card color
              </label>
              <select
                value={cardColor}
                onChange={(e) => setCardColor(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Default (Blue gradient)</option>
                <option value="bg-red-600">Red</option>
                <option value="bg-orange-600">Orange</option>
                <option value="bg-amber-600">Amber</option>
                <option value="bg-yellow-600">Yellow</option>
                <option value="bg-lime-600">Lime</option>
                <option value="bg-green-600">Green</option>
                <option value="bg-emerald-600">Emerald</option>
                <option value="bg-teal-600">Teal</option>
                <option value="bg-cyan-600">Cyan</option>
                <option value="bg-sky-600">Sky</option>
                <option value="bg-blue-600">Blue</option>
                <option value="bg-indigo-600">Indigo</option>
                <option value="bg-violet-600">Violet</option>
                <option value="bg-purple-600">Purple</option>
                <option value="bg-fuchsia-600">Fuchsia</option>
                <option value="bg-pink-600">Pink</option>
                <option value="bg-rose-600">Rose</option>
                <option value="bg-slate-600">Slate</option>
                <option value="bg-gray-600">Gray</option>
                <option value="bg-zinc-600">Zinc</option>
                <option value="bg-neutral-600">Neutral</option>
                <option value="bg-stone-600">Stone</option>
              </select>
              {/* Preview chip */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">Preview:</span>
                <span
                  className={`inline-block h-4 w-10 rounded ${
                    cardColor?.startsWith("bg-")
                      ? cardColor
                      : "bg-gradient-to-br from-blue-600 to-blue-800"
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowColorModal(false);
                  setSelectedItem(null);
                  setCardColor("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddItem}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
              >
                Add to {placement}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
