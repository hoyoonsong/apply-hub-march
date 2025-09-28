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
};

export default function FeaturedManager() {
  const [placement, setPlacement] = useState<Placement>("carousel");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TargetType>("org");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [items, setItems] = useState<FeaturedRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from("featured")
      .select(
        "id, placement, target_type, target_id, sort_index, title, description"
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

  const addItem = async (sel: SearchResult) => {
    const maxIndex = Math.max(-1, ...items.map((i) => i.sort_index));
    const { error } = await supabase.from("featured").upsert(
      {
        placement,
        target_type: sel.type,
        target_id: sel.id,
        sort_index: maxIndex + 1,
        title: sel.name, // sensible default; can be edited later if you add a modal
      },
      { onConflict: "placement,target_type,target_id" }
    );
    if (error) {
      console.error(error);
      alert("Failed to add");
      return;
    }
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

    const { error } = await supabase.from("featured").upsert([
      { id: a.id, sort_index: b.sort_index },
      { id: b.id, sort_index: a.sort_index },
    ]);
    if (error) {
      console.error(error);
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
                  onClick={() => addItem(r)}
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
              <div className="text-xs text-gray-500 capitalize">
                {i.target_type} · sort {i.sort_index}
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
    </div>
  );
}
