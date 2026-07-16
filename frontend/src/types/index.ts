export type Role = 'pmo' | 'mp';

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  role: Role | null;
  constituency_id: number | null;
}

export interface Constituency {
  id: number;
  name: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
}

export interface MP {
  id: number;
  constituency_id: number;
  constituency_name: string | null;
  name: string;
  party: string | null;
  party_abbr: string | null;
  state: string | null;
  photo_url: string | null;
  email: string | null;
  wikipedia_url: string | null;
  total_suggestions: number;
  resolved_suggestions: number;
  pending_suggestions: number;
  unresolved_percentage: number;
  sanctioned_projects: number;
}

export interface AssemblyConstituency {
  id: number;
  name: string;
  ac_no: number | null;
  state: string;
  pc_name: string | null;
  district: string | null;
  parliamentary_constituency_id: number | null;
}

export interface MLA {
  id: number;
  assembly_constituency_id: number;
  assembly_constituency_name: string | null;
  name: string;
  party: string | null;
  party_abbr: string | null;
  state: string | null;
  photo_url: string | null;
  wikipedia_url: string | null;
}

export interface CivicOfficial {
  id: number;
  body: string;
  zone: string | null;
  role: string;
  name: string | null;
  contact: string | null;
  is_placeholder: boolean;
}

export interface Hierarchy {
  parliamentary?: { constituency: Constituency; mp: MP | null } | null;
  assembly?: { assembly_constituency: AssemblyConstituency; mla: MLA | null } | null;
  civic?: { officials: CivicOfficial[] } | null;
}

export interface Ward {
  id: number;
  name: string;
  population: number;
  area_sq_km: number;
  demographics: {
    literacy_rate?: number;
    income_tier?: string;
    [key: string]: any;
  } | null;
  infrastructure_gaps: {
    school_ratio_deficit?: number;
    water_supply_hrs?: number;
    pothole_index?: number;
    [key: string]: any;
  } | null;
  created_at: string;
}

export interface Suggestion {
  id: string;
  citizen_phone: string | null;
  content: string;
  english_translation: string | null;
  language_code: string;
  audio_url: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  sentiment: string | null;
  priority_score: number;
  status: string;
  ward_id: number | null;
  constituency_id: number | null;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposedProject {
  id: number;
  title: string;
  description: string | null;
  category: string;
  target_ward_id: number | null;
  constituency_id: number | null;
  estimated_cost: number;
  priority_score: number;
  supporting_suggestions_count: number;
  ai_justification: string | null;
  status: string;
  created_at: string;
}

export interface MapIssue {
  id: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  priority_score: number;
  status: string;
  sentiment: string | null;
  content: string;
  english_translation: string | null;
  image_url: string | null;
  constituency_id: number | null;
  created_at: string;
}

export interface AnalyticsSummary {
  total_suggestions: number;
  total_projects: number;
  category_counts: Record<string, number>;
  sentiment_distribution: Record<string, number>;
  unresolved_percentage: number;
}
