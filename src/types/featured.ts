export type FeaturedSection = {
  id: string;
  section_type: "carousel" | "gallery";
  header: string;
  slug: string;
  sort_index: number;
  active: boolean;
  deleted_at: string | null;
  created_at: string;
};

export type FeaturedItem = {
  id: string;
  placement: "carousel" | "gallery";
  target_type: "org" | "program" | "coalition";
  target_id: string;
  sort_index: number;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  gradient: string | null;
  tag_color: string | null;
  button_label: string | null;
  button_color: string | null;
  image_url: string | null;
  card_color: string | null;
  // Program-specific fields (populated when target_type is "program")
  program_type?: string | null;
  open_at?: string | null;
  close_at?: string | null;
  published?: boolean | null;
  slug?: string | null;
  // Organization fields (populated when target_type is "org")
  org_slug?: string | null;
  // Coalition fields (populated when target_type is "coalition")
  coalition_slug?: string | null;
};
