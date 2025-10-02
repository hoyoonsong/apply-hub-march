export interface FeaturedSection {
  id: string;
  section_type: "carousel" | "gallery";
  header: string;
  slug: string;
  sort_index: number;
  active: boolean;
  deleted_at?: string | null;
  created_at: string;
}

export interface FeaturedItem {
  id: string;
  placement: "carousel" | "gallery";
  target_type: "org" | "program" | "coalition";
  target_id: string;
  sort_index: number;
  title: string | null;
  description: string | null;
  card_color: string | null;
  section_id: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  active: boolean;

  // Enriched data from useFeaturedSections
  name?: string;
  slug?: string;
  program_type?: string;
  open_at?: string | null;
  close_at?: string | null;
  published?: boolean;
  organization?: string;
  org_slug?: string;
  coalition_slug?: string;
}
