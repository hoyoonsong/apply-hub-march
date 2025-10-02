export type Program = {
  id: string;
  organization_id: string;
  name: string;
  type: "audition" | "scholarship" | "application" | "competition" | string; // keep open to avoid build breaks
  description: string | null;
  published: boolean;
  open_at: string | null;
  close_at: string | null;
  metadata: any | null;
  created_at: string;
  updated_at: string;
  published_scope: "org" | "coalition" | null;
  published_by: string | null;
  published_at: string | null;
  published_coalition_id: string | null;
  deleted_at: string | null;
};
