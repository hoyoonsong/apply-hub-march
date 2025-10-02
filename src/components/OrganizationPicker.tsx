import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import SearchablePicker from "./SearchablePicker";

export type OrganizationLite = {
  id: string;
  name: string;
  slug: string;
};

interface OrganizationPickerProps {
  value?: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

export default function OrganizationPicker({
  value,
  onChange,
  placeholder = "Search organizations...",
  className = "",
}: OrganizationPickerProps) {
  const [organizations, setOrganizations] = useState<OrganizationLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations() {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc("super_list_orgs_v1", {
        include_deleted: false,
      });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (err: any) {
      console.error("Failed to load organizations:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const options = organizations.map((org) => ({
    id: org.id,
    label: org.name,
    description: `/${org.slug}`,
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
