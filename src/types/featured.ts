// Featured types used across dashboard and super tools

export type FeaturedSection = {
  id: string;
  header: string;
  section_type: "carousel" | "gallery";
  sort_index: number;
  active: boolean;
  deleted_at: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type FeaturedItem = {
  id: string;
  placement: "carousel" | "gallery";
  target_type: "org" | "program" | "coalition";
  target_id: string;
  sort_index: number;
  title: string | null;
  subtitle?: string | null;
  description: string | null;
  gradient?: string | null;
  tag_color?: string | null;
  button_label?: string | null;
  button_color?: string | null;
  image_url?: string | null;
  card_color?: string | null;

  // Program-specific fields (optional, present when target_type === "program")
  program_type?: string | null;
  open_at?: string | null;
  close_at?: string | null;
  published?: boolean | null;
  slug?: string | null;
  organization?: string | null;
  organizationSlug?: string | null;
  coalitionDisplay?: string | null;

  // Org/coalition slugs for routing (optional)
  org_slug?: string | null;
  coalition_slug?: string | null;
};

