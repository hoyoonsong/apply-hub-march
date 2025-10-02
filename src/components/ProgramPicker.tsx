import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import SearchablePicker from "./SearchablePicker";

export type ProgramLite = {
  id: string;
  name: string;
  organization_id: string;
  organization_name: string;
};

interface ProgramPickerProps {
  value?: string;
  onChange: (id: string) => void;
  orgId?: string;
  placeholder?: string;
  className?: string;
}

export default function ProgramPicker({
  value,
  onChange,
  orgId,
  placeholder = "Search programs...",
  className = "",
}: ProgramPickerProps) {
  const [programs, setPrograms] = useState<ProgramLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrograms();
  }, [orgId]);

  async function loadPrograms() {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc("super_list_programs_v1", {
        include_deleted: false,
      });

      if (error) throw error;

      // If orgId is provided, filter by organization
      let filteredData = data || [];
      if (orgId) {
        filteredData = filteredData.filter(
          (program: any) => program.organization_id === orgId
        );
      }

      setPrograms(filteredData);
    } catch (err: any) {
      console.error("Failed to load programs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const options = programs.map((program) => ({
    id: program.id,
    label: `${program.organization_name} — ${program.name}`,
    description: "",
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
