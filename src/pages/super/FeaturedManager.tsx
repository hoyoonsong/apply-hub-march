import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { FeaturedSection } from "../../types/featured";

// ------------- helpers -------------
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

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
  section_id?: string | null;
};

export default function FeaturedManager() {
  const [placement, setPlacement] = useState<Placement>("carousel");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [sections, setSections] = useState<FeaturedSection[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TargetType>("org");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [items, setItems] = useState<FeaturedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [cardColor, setCardColor] = useState<string>("");
  const [showColorModal, setShowColorModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);

  // Section management states
  const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
  const [newSectionHeader, setNewSectionHeader] = useState("");
  const [newSectionPlacement, setNewSectionPlacement] =
    useState<Placement>("carousel");
  const [saving, setSaving] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");

  const loadItems = async () => {
    if (!selectedSectionId) {
      setItems([]);
      return;
    }

    // Load items for the selected section (any type) - only show active and non-expired items
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("featured")
      .select(
        "id, placement, target_type, target_id, sort_index, title, description, card_color, section_id, starts_at, ends_at"
      )
      .eq("section_id", selectedSectionId)
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("sort_index", { ascending: true });

    if (error) {
      console.error(error);
      alert("Failed to load featured items");
      return;
    }

    // Update items that don't have titles set
    const itemsToUpdate = (data || []).filter((item) => !item.title);
    if (itemsToUpdate.length > 0) {
      for (const item of itemsToUpdate) {
        try {
          // Fetch the actual name from the appropriate table
          let name = null;
          if (item.target_type === "org") {
            const { data: orgData } = await supabase
              .from("organizations")
              .select("name")
              .eq("id", item.target_id)
              .single();
            name = orgData?.name;
          } else if (item.target_type === "program") {
            const { data: programData } = await supabase
              .from("programs")
              .select("name")
              .eq("id", item.target_id)
              .single();
            name = programData?.name;
          } else if (item.target_type === "coalition") {
            const { data: coalitionData } = await supabase
              .from("coalitions")
              .select("name")
              .eq("id", item.target_id)
              .single();
            name = coalitionData?.name;
          }

          if (name) {
            // Update the featured item with the proper title
            await supabase
              .from("featured")
              .update({ title: name })
              .eq("id", item.id);
          }
        } catch (err) {
          console.error("Failed to update title for item:", item.id, err);
        }
      }

      // Reload items after updating titles
      const { data: updatedData } = await supabase
        .from("featured")
        .select(
          "id, placement, target_type, target_id, sort_index, title, description, card_color, section_id, starts_at, ends_at"
        )
        .eq("section_id", selectedSectionId)
        .eq("active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("sort_index", { ascending: true });
      setItems(updatedData || []);
    } else {
      setItems(data || []);
    }
  };

  const createSection = async () => {
    if (!newSectionHeader.trim()) {
      alert("Please enter a section header");
      return;
    }

    setSaving(true);
    try {
      const sectionType = newSectionPlacement;

      // Create section with proper sort_index (next available across all sections)
      const nextSortIndex = sections.length;
      const { data, error } = await supabase
        .from("featured_sections")
        .insert({
          section_type: sectionType, // 'carousel' or 'gallery'
          header: newSectionHeader.trim(), // e.g., "Drum Corps International"
          slug: slugify(newSectionHeader.trim()), // your slugify(header), make unique client-side if needed
          sort_index: nextSortIndex,
          active: true, // New sections are active by default
        })
        .select()
        .single();

      if (error) {
        // Handle slug collision by trying with suffix
        if (error.code === "23505") {
          const base = slugify(newSectionHeader.trim()) || "section";
          let slug = base;
          for (let i = 0; i < 15; i++) {
            slug = `${base}-${i + 2}`;
            const { data: retryData, error: retryError } = await supabase
              .from("featured_sections")
              .insert({
                section_type: sectionType,
                header: newSectionHeader.trim(),
                slug,
                sort_index: nextSortIndex,
              })
              .select()
              .single();

            if (!retryError) {
              // Success with retry
              const created = retryData;
              await handleSectionCreated(created);
              return;
            }
          }
          throw new Error("Could not create section after multiple attempts");
        }
        throw error;
      }

      const created = data;
      await handleSectionCreated(created);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to create section");
    } finally {
      setSaving(false);
    }
  };

  const handleSectionCreated = async (created: any) => {
    // Close modal and reset
    setShowCreateSectionModal(false);
    setNewSectionHeader("");
    setNewSectionPlacement("carousel");

    // Reload sections and select the new one
    await loadSections();
    setSelectedSectionId(created.id);

    alert(`Created: ${created.header}`);
  };

  const reorderSections = async (orderedSectionIds: string[]) => {
    try {
      // Update sort_index for each section based on the new order
      const updatePromises = orderedSectionIds.map((sectionId, index) =>
        supabase
          .from("featured_sections")
          .update({ sort_index: index })
          .eq("id", sectionId)
      );

      const results = await Promise.all(updatePromises);

      // Check if any updates failed
      const hasError = results.some((result) => result.error);
      if (hasError) {
        throw new Error("Some section updates failed");
      }

      // Reload sections to reflect new order
      await loadSections();
    } catch (error) {
      console.error("Failed to reorder sections:", error);
      alert("Failed to reorder sections");
    }
  };

  const moveSection = async (sectionId: string, direction: "up" | "down") => {
    const currentIndex = sections.findIndex((s) => s.id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    // Create new ordered array
    const newOrder = [...sections];
    [newOrder[currentIndex], newOrder[newIndex]] = [
      newOrder[newIndex],
      newOrder[currentIndex],
    ];

    const orderedIds = newOrder.map((s) => s.id);
    await reorderSections(orderedIds);
  };

  // Hide/unhide section functions
  const hideSection = async (sectionId: string) => {
    try {
      const { error } = await supabase
        .from("featured_sections")
        .update({
          active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", sectionId);

      if (error) throw error;

      // Reload sections to reflect changes
      await loadSections();
      alert("Section hidden. It will be permanently deleted in 30 days.");
    } catch (error) {
      console.error("Failed to hide section:", error);
      alert("Failed to hide section");
    }
  };

  const unhideSection = async (sectionId: string) => {
    try {
      const { error } = await supabase
        .from("featured_sections")
        .update({
          active: true,
          deleted_at: null,
        })
        .eq("id", sectionId);

      if (error) throw error;

      // Reload sections to reflect changes
      await loadSections();
      alert("Section restored successfully.");
    } catch (error) {
      console.error("Failed to unhide section:", error);
      alert("Failed to restore section");
    }
  };

  // Helper function to calculate days until purge
  const daysUntilPurge = (section: any) => {
    if (!section.deleted_at) return null;
    const ms = Date.now() - new Date(section.deleted_at).getTime();
    return Math.max(0, 30 - Math.floor(ms / 86_400_000));
  };

  // Helper function to convert datetime-local to ISO or null
  const toIsoOrNull = (v?: string) => (v ? new Date(v).toISOString() : null);

  // Helper function to get current section type
  const getCurrentSectionType = () => {
    const selectedSection = sections.find((s) => s.id === selectedSectionId);
    return selectedSection?.section_type || "carousel";
  };

  // Filter sections based on showHidden state
  const visibleSections = showHidden
    ? sections
    : sections.filter((s) => s.active);

  // Helper function to set duration presets
  const setDurationDays = (days: number) => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + days);
    setStartAt(start.toISOString().slice(0, 16)); // yyyy-MM-ddTHH:mm (local)
    setEndAt(end.toISOString().slice(0, 16));
  };

  // Helper function to get scheduling status
  const getSchedulingStatus = (item: any) => {
    const now = new Date();
    const startTime = item.starts_at ? new Date(item.starts_at) : null;
    const endTime = item.ends_at ? new Date(item.ends_at) : null;

    if (startTime && startTime > now) {
      return {
        status: "scheduled",
        text: `Starts ${startTime.toLocaleDateString()}`,
      };
    }
    if (endTime && endTime < now) {
      return {
        status: "expired",
        text: `Expired ${endTime.toLocaleDateString()}`,
      };
    }
    if (startTime || endTime) {
      return { status: "active", text: "Scheduled" };
    }
    return { status: "permanent", text: "Always visible" };
  };

  const loadSections = async () => {
    try {
      // Load ALL sections (both carousel and gallery) sorted by sort_index
      // Include deleted_at field for purge countdown
      const { data, error } = await supabase
        .from("featured_sections")
        .select(
          "id, section_type, header, slug, sort_index, active, deleted_at, created_at"
        )
        .order("sort_index", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      const sectionsData = data ?? [];
      setSections(sectionsData);

      // Auto-select first active section if none selected
      if (!selectedSectionId && sectionsData.length > 0) {
        const firstActiveSection = sectionsData.find((s) => s.active);
        if (firstActiveSection) {
          setSelectedSectionId(firstActiveSection.id);
          setPlacement(firstActiveSection.section_type);
        }
      }
    } catch (error) {
      console.error("Failed to load sections:", error);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      loadItems();
    }
  }, [selectedSectionId]);

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
    setStartAt(""); // Reset scheduling
    setEndAt(""); // Reset scheduling
    setShowColorModal(true);
  };

  const confirmAddItem = async () => {
    if (!selectedItem || !selectedSectionId) return;

    // Get the placement from the selected section to ensure it matches
    const selectedSection = sections.find((s) => s.id === selectedSectionId);
    if (!selectedSection) {
      alert("Selected section not found");
      return;
    }

    // Optional sanity check
    if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
      alert("End time must be after start time.");
      return;
    }

    const nextIndex = items.length; // Compute from current list length

    const { error } = await supabase.from("featured").upsert(
      {
        placement: selectedSection.section_type, // Use section's actual type
        section_id: selectedSectionId,
        target_type: selectedItem.type, // 'org' | 'program' | 'coalition'
        target_id: selectedItem.id,
        sort_index: nextIndex, // compute from current list length
        title: selectedItem.name, // Set the actual name as title
        card_color: cardColor?.trim() || null, // optional
        starts_at: toIsoOrNull(startAt), // scheduling
        ends_at: toIsoOrNull(endAt), // scheduling
      },
      {
        onConflict: "section_id,target_type,target_id",
      }
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
    setStartAt("");
    setEndAt("");
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
        <label className="text-sm text-gray-600">Section</label>
        <select
          value={selectedSectionId}
          onChange={(e) => {
            const sectionId = e.target.value;
            setSelectedSectionId(sectionId);
            // Update placement based on selected section
            const selectedSection = sections.find((s) => s.id === sectionId);
            if (selectedSection) {
              setPlacement(selectedSection.section_type);
            }
          }}
          className="border rounded px-3 py-2"
        >
          <option value="">Select a section...</option>
          {sections
            .filter((s) => s.active)
            .map((section) => (
              <option key={section.id} value={section.id}>
                {section.header} ({section.section_type})
              </option>
            ))}
        </select>

        <button
          onClick={() => setShowCreateSectionModal(true)}
          className="ml-4 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
        >
          + New Section
        </button>

        <button
          onClick={() => setShowHidden(!showHidden)}
          className={`ml-2 px-3 py-2 rounded text-sm ${
            showHidden
              ? "bg-gray-600 hover:bg-gray-700 text-white"
              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          }`}
        >
          {showHidden
            ? "Hide Deleted"
            : `Show Hidden (${sections.filter((s) => !s.active).length})`}
        </button>
      </div>

      {/* Section Reordering Controls */}
      {visibleSections.length > 1 && (
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">
            Reorder Sections:
          </label>
          <div className="space-y-2">
            {visibleSections.map((section, index) => (
              <div
                key={section.id}
                className="flex items-center gap-2 bg-gray-50 p-2 rounded"
              >
                <span className="text-sm font-medium">{section.header}</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    section.section_type === "carousel"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {section.section_type}
                </span>
                {/* Show purge countdown for hidden sections */}
                {!section.active && section.deleted_at && (
                  <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                    Hidden • deletes in {daysUntilPurge(section)}d
                  </span>
                )}
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={() => moveSection(section.id, "up")}
                    disabled={index === 0}
                    className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveSection(section.id, "down")}
                    disabled={index === visibleSections.length - 1}
                    className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded"
                  >
                    ↓
                  </button>
                  {/* Delete/Hide buttons */}
                  {section.active ? (
                    <button
                      onClick={() => hideSection(section.id)}
                      className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
                    >
                      Hide
                    </button>
                  ) : (
                    <button
                      onClick={() => unhideSection(section.id)}
                      className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded"
                    >
                      Unhide
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  Add to {getCurrentSectionType()}
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
                {/* Scheduling status indicator */}
                {(() => {
                  const scheduling = getSchedulingStatus(i);
                  return (
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        scheduling.status === "scheduled"
                          ? "bg-yellow-100 text-yellow-800"
                          : scheduling.status === "active"
                          ? "bg-green-100 text-green-800"
                          : scheduling.status === "permanent"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {scheduling.text}
                    </span>
                  );
                })()}
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
              Add "{selectedItem.name}" to {getCurrentSectionType()}
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

            {/* Scheduling Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600">
                Show from
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600">
                Hide after
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to show immediately and/or never auto-hide.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Quick presets
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDurationDays(7)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                >
                  7d
                </button>
                <button
                  type="button"
                  onClick={() => setDurationDays(14)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                >
                  14d
                </button>
                <button
                  type="button"
                  onClick={() => setDurationDays(30)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                >
                  30d
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowColorModal(false);
                  setSelectedItem(null);
                  setCardColor("");
                  setStartAt("");
                  setEndAt("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddItem}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
              >
                Add to {getCurrentSectionType()}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Section Modal */}
      {showCreateSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Section</h3>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600">
                Section Type
              </label>
              <select
                value={newSectionPlacement}
                onChange={(e) =>
                  setNewSectionPlacement(e.target.value as Placement)
                }
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="carousel">Carousel</option>
                <option value="gallery">Gallery</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose whether this section will display as a carousel or
                gallery
              </p>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600">
                Section Header
              </label>
              <input
                type="text"
                value={newSectionHeader}
                onChange={(e) => setNewSectionHeader(e.target.value)}
                placeholder="e.g., More Programs, Featured Organizations, etc."
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be displayed as the section title on the dashboard
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateSectionModal(false);
                  setNewSectionHeader("");
                  setNewSectionPlacement("carousel");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createSection}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium"
              >
                {saving
                  ? "Creating..."
                  : `Create ${
                      newSectionPlacement === "carousel"
                        ? "Carousel"
                        : "Gallery"
                    } Section`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
