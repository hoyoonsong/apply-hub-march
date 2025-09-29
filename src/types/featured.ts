export type FeaturedSection = {
  id: string;
  section_type: "carousel" | "gallery";
  header: string;
  slug: string;
  sort_index: number;
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
};
