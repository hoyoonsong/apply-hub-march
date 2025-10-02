import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import SearchablePicker from "./SearchablePicker";

export type CoalitionLite = {
  id: string;
  name: string;
  slug: string;
};

interface CoalitionPickerProps {
  value?: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CoalitionPicker({
  value,
  onChange,
  placeholder = "Search coalitions...",
  className = "",
}: CoalitionPickerProps) {
  const [coalitions, setCoalitions] = useState<CoalitionLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCoalitions();
  }, []);

  async function loadCoalitions() {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc("super_list_coalitions_v1", {
        include_deleted: false,
      });

      if (error) throw error;
      setCoalitions(data || []);
    } catch (err: any) {
      console.error("Failed to load coalitions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const options = coalitions.map((coalition) => ({
    id: coalition.id,
    label: coalition.name,
    description: `/${coalition.slug}`,
  }));

  return (
    <SearchablePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      options={options}
      loading={loading}
      error={error}
      className={className}
    />
  );
}
