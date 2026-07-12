export type Post = {
  id: string;
  user_id: string | null;
  raw_text: string;
  final_text: string | null;
  status: "draft" | "accepted" | "published";
  created_at: string;
};

export type Analysis = {
  id: string;
  post_id: string;
  user_id: string | null;
  hook_score: number | null;
  hook_score_source: string | null;
  hook_score_confidence: number | null;
  hook_score_review_status: string | null;
  cta_score: number | null;
  cta_score_source: string | null;
  cta_score_confidence: number | null;
  cta_score_review_status: string | null;
  urgency_score: number | null;
  urgency_score_source: string | null;
  urgency_score_confidence: number | null;
  urgency_score_review_status: string | null;
  lead_gen_score: number | null;
  lead_gen_score_source: string | null;
  lead_gen_score_confidence: number | null;
  lead_gen_score_review_status: string | null;
  rewritten_text: string | null;
  rewritten_text_source: string | null;
  rewritten_text_confidence: number | null;
  rewritten_text_review_status: string | null;
  rationale: string | null;
  follow_up_posts: string[];
  image_url: string | null;
  image_prompt: string | null;
  rewrite_tokens_used: number | null;
  image_tokens_used: number | null;
  created_at: string;
};

export type Revision = {
  id: string;
  post_id: string;
  user_id: string | null;
  rewritten_text: string | null;
  lead_gen_score: number | null;
  tokens_used: number | null;
  created_at: string;
};

export type PostWithRelations = Post & {
  analyses: Analysis[];
  revisions: Revision[];
};

export type CurrentUser = {
  id: string;
  email: string;
};

export type Profile = {
  id: string;
  email: string | null;
  weekly_credit_allocation: number;
  expiry_date: string | null;
  ip_address: string | null;
  browser: string | null;
  status: string;
  referral: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type BrandVoice = {
  id: string;
  user_id: string;
  voice_keywords: string[];
  words_to_use: string[];
  words_to_avoid: string[];
  content_style: string[];
  caption_length_pref: string | null;
  script_length_pref: string | null;
  cta_style: string[];
  cta_examples: string[];
  topics: string[];
  persona_note: string | null;
  audience_feelings: string[];
  target_audience: string | null;
  color_theme: string | null;
  created_at: string;
  updated_at: string;
};

export type QuotaRequest = {
  id: string;
  user_id: string;
  message: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  post_id: string | null;
  risk_level: string | null;
  before_value: string | null;
  after_value: string | null;
  created_at: string;
};
