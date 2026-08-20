export const ROLES = ['Model', 'Brand', 'Agency']

export const FEATURES = {
  'ai-studio': { label: 'Prediction Lab', desc: 'ML-powered predictions for match scores, pricing, career growth, fraud detection and more.' },
  'casting-apps': { label: 'Casting applications', desc: 'Apply to castings posted by brands and agencies.' },
  'campaign-apps': { label: 'Campaign applications', desc: 'Apply to brand campaigns and influencer collabs.' },
  'ai-matches': { label: 'AI brand matches', desc: 'AI-ranked castings and brands matched to your profile.' },
  'resume-site': { label: 'AI resume + portfolio site', desc: 'Auto-generated model resume and a standalone portfolio website.' },
  'profile-analytics': { label: 'Profile analytics', desc: 'See who views, saves and books you — with trend charts.' },
  'verified': { label: 'Verified badge', desc: 'A verified checkmark next to your name and profile.' },
  'featured': { label: 'Featured placement', desc: 'Priority, boosted placement in search and Explore.' },
  'boost': { label: 'Spotlight boosts', desc: 'Put your profile or casting at the top of feeds weekly.' },
  'advanced-analytics': { label: 'Advanced analytics', desc: 'Per-media performance, audience insights and booking trends.' },
  'priority-support': { label: 'Priority support', desc: 'Fast-tracked help from the support team.' },
  'unlimited-castings': { label: 'Unlimited castings', desc: 'Post as many casting calls as you need.' },
  'unlimited-campaigns': { label: 'Unlimited campaigns', desc: 'Launch unlimited campaigns and collabs.' },
  'social-hub': { label: 'Social Media Hub', desc: 'Connect social accounts, plan a content calendar, schedule posts and get AI captions.' },
  'brand-analytics': { label: 'Campaign analytics', desc: 'Reach, applicants, spend and ROI for every casting and campaign.' },
  'brand-voice': { label: 'Brand voice AI', desc: 'Generate a consistent brand tone for all your content.' },
  'competitor': { label: 'Competitor intel', desc: 'SWOT-style analysis of competing brands.' },
  'cmo': { label: 'CMO advisories', desc: 'Strategic marketing advice powered by AI.' },
  'roster': { label: 'Model roster', desc: 'Manage the models you represent in one workspace.' },
}

const MODEL = [
  {
    key: 'starter', name: 'Starter', price: 0, popular: false, color: '#6B6B80',
    tagline: 'Everything you need to get discovered — free forever.',
    features: [
      { f: 'casting-apps', limit: 5, label: 'Apply to 5 castings / month' },
      { f: 'campaign-apps', limit: 5, label: 'Apply to 5 campaigns / month' },
      { f: 'ai-studio', limit: 2, label: '2 Prediction Lab runs / month' },
      { f: 'portfolio-media', limit: 10, label: 'Portfolio with 10 media items' },
      { label: 'Standard support' },
    ],
  },
  {
    key: 'pro', name: 'Pro', price: 9, popular: true, color: '#8B5CF6',
    tagline: 'Stand out to brands and unlock your growth tools.',
    features: [
      { f: 'casting-apps', limit: null, label: 'Unlimited casting applications' },
      { f: 'campaign-apps', limit: null, label: 'Unlimited campaign applications' },
      { f: 'ai-studio', limit: 30, label: '30 Prediction Lab runs / month' },
      { f: 'portfolio-media', limit: null, label: 'Unlimited portfolio media' },
      { f: 'ai-matches', limit: null, label: 'AI brand matches' },
      { f: 'resume-site', limit: null, label: 'AI resume + portfolio website' },
      { f: 'profile-analytics', limit: null, label: 'Profile analytics' },
      { f: 'verified', limit: null, label: 'Verified badge' },
      { f: 'featured', limit: null, label: 'Priority placement in search' },
      { f: 'boost', limit: 1, label: '1 spotlight boost / week' },
      { f: 'priority-support', limit: null, label: 'Priority support' },
    ],
  },
  {
    key: 'elite', name: 'Elite', price: 19, popular: false, color: '#F59E0B',
    tagline: 'Maximum visibility, unlimited AI and VIP support.',
    features: [
      { f: 'casting-apps', limit: null, label: 'Unlimited casting applications' },
      { f: 'campaign-apps', limit: null, label: 'Unlimited campaign applications' },
      { f: 'ai-studio', limit: null, label: 'Unlimited Prediction Lab' },
      { f: 'portfolio-media', limit: null, label: 'Unlimited portfolio media' },
      { f: 'ai-matches', limit: null, label: 'AI brand matches' },
      { f: 'resume-site', limit: null, label: 'AI resume + portfolio website' },
      { f: 'profile-analytics', limit: null, label: 'Profile analytics' },
      { f: 'advanced-analytics', limit: null, label: 'Advanced analytics' },
      { f: 'verified', limit: null, label: 'Verified badge' },
      { f: 'featured', limit: null, label: 'Featured slot in Explore' },
      { f: 'boost', limit: 3, label: '3 spotlight boosts / week' },
      { f: 'priority-support', limit: null, label: 'Priority support' },
    ],
  },
]

const BRAND = [
  {
    key: 'starter', name: 'Starter', price: 0, popular: false, color: '#6B6B80',
    tagline: 'Try the marketplace and meet talented models — free.',
    features: [
      { f: 'unlimited-castings', limit: 2, label: 'Post up to 2 castings / month' },
      { f: 'unlimited-campaigns', limit: 1, label: 'Post 1 campaign / month' },
      { f: 'ai-studio', limit: 2, label: '2 Prediction Lab runs / month' },
      { label: 'Standard support' },
    ],
  },
  {
    key: 'growth', name: 'Growth', price: 29, popular: true, color: '#8B5CF6',
    tagline: 'Everything for brands that want to hire and market fast.',
    features: [
      { f: 'unlimited-castings', limit: null, label: 'Unlimited castings' },
      { f: 'unlimited-campaigns', limit: null, label: 'Unlimited campaigns' },
      { f: 'ai-studio', limit: 60, label: '60 Prediction Lab runs / month' },
      { f: 'brand-voice', limit: null, label: 'Brand voice AI' },
      { f: 'competitor', limit: null, label: 'Competitor intel' },
      { f: 'cmo', limit: null, label: 'CMO advisories' },
      { f: 'social-hub', limit: 3, label: 'Social Media Hub — 3 accounts' },
      { f: 'brand-analytics', limit: null, label: 'Campaign analytics' },
      { f: 'verified', limit: null, label: 'Verified badge' },
      { f: 'featured', limit: null, label: 'Featured in brand directory' },
      { f: 'priority-support', limit: null, label: 'Priority support' },
    ],
  },
  {
    key: 'enterprise', name: 'Enterprise', price: 79, popular: false, color: '#F59E0B',
    tagline: 'Scale hiring and marketing across every channel.',
    features: [
      { f: 'unlimited-castings', limit: null, label: 'Unlimited castings' },
      { f: 'unlimited-campaigns', limit: null, label: 'Unlimited campaigns' },
      { f: 'ai-studio', limit: null, label: 'Unlimited Prediction Lab' },
      { f: 'brand-voice', limit: null, label: 'Brand voice AI' },
      { f: 'competitor', limit: null, label: 'Competitor intel' },
      { f: 'cmo', limit: null, label: 'CMO advisories' },
      { f: 'social-hub', limit: null, label: 'Social Media Hub — unlimited accounts' },
      { f: 'brand-analytics', limit: null, label: 'Advanced analytics & reports' },
      { f: 'verified', limit: null, label: 'Verified badge' },
      { f: 'featured', limit: null, label: 'Featured homepage slot' },
      { f: 'priority-support', limit: null, label: 'Priority support' },
    ],
  },
]

const AGENCY = [
  {
    key: 'starter', name: 'Starter', price: 0, popular: false, color: '#6B6B80',
    tagline: 'Set up your agency and start representing models.',
    features: [
      { f: 'roster', limit: 5, label: 'Manage up to 5 models' },
      { f: 'unlimited-castings', limit: 2, label: 'Post up to 2 castings / month' },
      { f: 'ai-studio', limit: 2, label: '2 Prediction Lab runs / month' },
      { label: 'Standard support' },
    ],
  },
  {
    key: 'pro', name: 'Pro', price: 49, popular: true, color: '#8B5CF6',
    tagline: 'Run a full roster and market them everywhere.',
    features: [
      { f: 'roster', limit: null, label: 'Unlimited roster' },
      { f: 'unlimited-castings', limit: null, label: 'Unlimited castings' },
      { f: 'unlimited-campaigns', limit: null, label: 'Unlimited campaigns' },
      { f: 'ai-studio', limit: 80, label: '80 Prediction Lab runs / month' },
      { f: 'brand-voice', limit: null, label: 'Brand voice AI' },
      { f: 'competitor', limit: null, label: 'Competitor intel' },
      { f: 'cmo', limit: null, label: 'CMO advisories' },
      { f: 'social-hub', limit: 5, label: 'Social Media Hub — 5 accounts' },
      { f: 'brand-analytics', limit: null, label: 'Roster & campaign analytics' },
      { f: 'verified', limit: null, label: 'Verified agency badge' },
      { f: 'featured', limit: null, label: 'Priority agency placement' },
      { f: 'priority-support', limit: null, label: 'Priority support' },
    ],
  },
  {
    key: 'elite', name: 'Elite', price: 99, popular: false, color: '#F59E0B',
    tagline: 'The full power stack for scaling agencies.',
    features: [
      { f: 'roster', limit: null, label: 'Unlimited roster' },
      { f: 'unlimited-castings', limit: null, label: 'Unlimited castings' },
      { f: 'unlimited-campaigns', limit: null, label: 'Unlimited campaigns' },
      { f: 'ai-studio', limit: null, label: 'Unlimited Prediction Lab' },
      { f: 'brand-voice', limit: null, label: 'Brand voice AI' },
      { f: 'competitor', limit: null, label: 'Competitor intel' },
      { f: 'cmo', limit: null, label: 'CMO advisories' },
      { f: 'social-hub', limit: null, label: 'Social Media Hub — unlimited accounts' },
      { f: 'brand-analytics', limit: null, label: 'Advanced pipeline analytics' },
      { f: 'verified', limit: null, label: 'Verified agency badge' },
      { f: 'featured', limit: null, label: 'Featured agency placement' },
      { f: 'priority-support', limit: null, label: 'Priority support' },
    ],
  },
]

export const PLANS = { Model: MODEL, Brand: BRAND, Agency: AGENCY }

export function getPlans(role) {
  return PLANS[role] || MODEL
}

export function getPlan(role, planKey) {
  return (getPlans(role) || []).find((p) => p.key === planKey) || getPlans(role)[0]
}

export function getFeature(key) {
  return FEATURES[key] || { label: key, desc: '' }
}
