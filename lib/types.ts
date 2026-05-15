export type StatusOption = {
  code: string;
  label: string;
  color: "green" | "amber" | "red" | "gray" | "blue" | "purple";
  passing: boolean | null;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "member";
  created_at: string;
};

export type Template = {
  id: string;
  name: string;
  description: string | null;
  status_options: StatusOption[];
  pass_threshold: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Section = {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Item = {
  id: string;
  section_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Location = {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
};

export type InstanceStatus = "draft" | "submitted";
export type OverallResult = "PASS" | "FAIL" | null;

export type Instance = {
  id: string;
  template_id: string;
  location_id: string | null;
  inspector_id: string;
  status: InstanceStatus;
  submitted_at: string | null;
  items_not_covered: string | null;
  overall_score: number | null;
  overall_result: OverallResult;
  created_at: string;
  updated_at: string;
};

export type Response = {
  id: string;
  instance_id: string;
  item_id: string;
  status_code: string | null;
  comments: string | null;
  updated_at: string;
};

export type SectionWithItems = Section & { items: Item[] };
export type TemplateWithSections = Template & { sections: SectionWithItems[] };
