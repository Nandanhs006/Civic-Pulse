export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
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
  created_at: string;
  updated_at: string;
}

export interface ProposedProject {
  id: number;
  title: string;
  description: string | null;
  category: string;
  target_ward_id: number;
  estimated_cost: number;
  priority_score: number;
  supporting_suggestions_count: number;
  ai_justification: string | null;
  status: string;
  created_at: string;
}

export interface AnalyticsSummary {
  total_suggestions: number;
  total_projects: number;
  category_counts: Record<string, number>;
  sentiment_distribution: Record<string, number>;
  unresolved_percentage: number;
}
