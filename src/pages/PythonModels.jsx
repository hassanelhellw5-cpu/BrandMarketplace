import { useState, useEffect, useCallback } from 'react'
import { BrainCircuit, Play, Sparkles, TrendingUp, Users, DollarSign, FileText, Search, LayoutGrid, BarChart3, ShieldCheck, AlertTriangle, UserMinus, CalendarCheck, GraduationCap, RefreshCw, ChevronDown, ChevronUp, Zap, Target, Star, Image, Palette, Smile, PenLine } from 'lucide-react'
import { get, post, errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'

const f = (name, label, min, max, step, def, hint = '', isPct = false, group = '') => ({ name, label, min, max, step, def, hint, isPct, group })

const MODELS = [
  {
    id: 'match-score', label: 'Match Score', Icon: Users, category: 'Matching',
    desc: 'How well a model fits a casting or campaign brief.',
    output: 'A 0–100 compatibility score. The higher, the better the fit.',
    autoFields: ['locationMatch', 'genderMatch', 'experienceMatch', 'budgetRatio', 'rating'],
    fields: [
      f('locationMatch', 'Location match', 0, 1, 0.05, 0.7, '0–1 similarity', false, 'fit'),
      f('travelMatch', 'Travel flexibility', 0, 1, 0.05, 0.5, '0–1 willingness to travel', false, 'fit'),
      f('genderMatch', 'Gender match', 0, 1, 0.05, 0.8, '', false, 'fit'),
      f('experienceMatch', 'Experience match', 0, 1, 0.05, 0.6, '', false, 'fit'),
      f('ethnicityMatch', 'Ethnicity match', 0, 1, 0.05, 0.5, '', false, 'fit'),
      f('budgetRatio', 'Budget ratio', 0, 2, 0.05, 0.6, 'price vs budget (1 = at budget)', false, 'budget'),
      f('rating', 'Average rating', 0, 5, 0.1, 4.5, '', false, 'profile'),
      f('yearsExp', 'Years of experience', 0, 30, 0.5, 3, '', false, 'profile'),
      f('bookingCount', 'Bookings completed', 0, 500, 1, 12, '', false, 'profile'),
    ],
  },
  {
    id: 'booking-probability', label: 'Booking Probability', Icon: CalendarCheck, category: 'Matching',
    desc: 'Likelihood a model is booked after applying.',
    output: 'A 0–100 probability.',
    fields: [
      f('profileQuality', 'Profile quality', 0, 1, 0.05, 0.7, '', false, 'profile'),
      f('averageRating', 'Average rating', 0, 5, 0.1, 4.4, '', false, 'profile'),
      f('applicationsCount', 'Applications sent', 0, 200, 1, 15, '', false, 'activity'),
      f('castingFit', 'Casting fit', 0, 1, 0.05, 0.6, '', false, 'fit'),
      f('priceFit', 'Price fit', 0, 1, 0.05, 0.6, '', false, 'budget'),
      f('travelFlexibility', 'Travel flexibility', 0, 1, 0.05, 0.5, '', false, 'fit'),
      f('yearsExp', 'Years of experience', 0, 30, 0.5, 2, '', false, 'profile'),
      f('portfolioSize', 'Portfolio items', 0, 100, 1, 18, '', false, 'profile'),
    ],
  },
  {
    id: 'price', label: 'Rate Prediction', Icon: DollarSign, category: 'Pricing',
    desc: 'Suggested day rate for a model based on their profile.',
    output: 'A suggested dollar figure per day.',
    fields: [
      f('yearsExp', 'Years of experience', 0, 30, 0.5, 3, '', false, 'profile'),
      f('portfolioSize', 'Portfolio items', 0, 100, 1, 20, '', false, 'profile'),
      f('mediaCount', 'Media files', 0, 500, 1, 40, '', false, 'profile'),
      f('averageRating', 'Average rating', 0, 5, 0.1, 4.5, '', false, 'profile'),
      f('totalBookings', 'Total bookings', 0, 500, 1, 15, '', false, 'profile'),
      f('height', 'Height (cm)', 140, 210, 1, 175, '', false, 'profile'),
      f('hasAgency', 'Has agency', 0, 1, 1, 0, '0 = no agency, 1 = has agency', false, 'profile'),
      f('followersCount', 'Followers', 0, 1000000, 100, 5000, '', false, 'social'),
      f('bookingCount', 'Bookings (recent)', 0, 100, 1, 6, '', false, 'profile'),
      f('hasVerification', 'Verified badge', 0, 1, 1, 0, '', false, 'profile'),
      f('experienceLevel', 'Experience level', 0, 5, 1, 2, '0 = new … 5 = top', false, 'profile'),
      f('styleCount', 'Specialty styles', 0, 30, 1, 4, '', false, 'profile'),
    ],
  },
  {
    id: 'profile-quality', label: 'Profile Quality', Icon: Sparkles, category: 'Profile',
    desc: 'Overall quality score of a talent profile.',
    output: 'A 0–100 completeness score.',
    fields: [
      f('hasBio', 'Has bio', 0, 1, 1, 1, '', false, 'completeness'),
      f('hasMeasurements', 'Has measurements', 0, 1, 1, 1, '', false, 'completeness'),
      f('hasPhotos', 'Has photos', 0, 1, 1, 1, '', false, 'completeness'),
      f('hasExperience', 'Has experience', 0, 1, 1, 1, '', false, 'completeness'),
      f('hasSpecialties', 'Has specialties', 0, 1, 1, 1, '', false, 'completeness'),
      f('hasLanguages', 'Has languages', 0, 1, 1, 1, '', false, 'completeness'),
      f('hasAgency', 'Has agency', 0, 1, 1, 0, '', false, 'profile'),
      f('hasVerification', 'Verified badge', 0, 1, 1, 0, '', false, 'profile'),
      f('hasSocialLinks', 'Has social links', 0, 1, 1, 1, '', false, 'completeness'),
      f('fieldCount', 'Filled fields', 0, 40, 1, 18, '', false, 'completeness'),
      f('portfolioViews', 'Portfolio views', 0, 10000, 100, 800, '', false, 'activity'),
      f('totalBookings', 'Total bookings', 0, 500, 1, 8, '', false, 'profile'),
      f('averageRating', 'Average rating', 0, 5, 0.1, 4.3, '', false, 'profile'),
      f('yearsExp', 'Years of experience', 0, 30, 0.5, 2, '', false, 'profile'),
      f('mediaCount', 'Media files', 0, 500, 1, 25, '', false, 'profile'),
      f('followersCount', 'Followers', 0, 1000000, 100, 3000, '', false, 'social'),
    ],
  },
  {
    id: 'portfolio-score', label: 'Portfolio Score', Icon: LayoutGrid, category: 'Profile',
    desc: 'How strong a model portfolio is.',
    output: 'A 0–100 score. 70+ is strong, 90+ is top-tier.',
    fields: [
      f('mediaCount', 'Media items', 0, 500, 1, 25, '', false, 'content'),
      f('typesCount', 'Media types', 0, 10, 1, 3, '', false, 'content'),
      f('hasCover', 'Has cover image', 0, 1, 1, 1, '', false, 'content'),
      f('hasAltText', 'Has alt text', 0, 1, 1, 1, '', false, 'content'),
      f('maxFileSizeMb', 'Max file size (MB)', 1, 50, 1, 12, '', false, 'content'),
      f('hasDescription', 'Has descriptions', 0, 1, 1, 1, '', false, 'content'),
      f('hasCategory', 'Has categories', 0, 1, 1, 1, '', false, 'content'),
      f('hasTags', 'Has tags', 0, 1, 1, 1, '', false, 'content'),
      f('viewCount', 'Portfolio views', 0, 10000, 100, 900, '', false, 'activity'),
      f('likeCount', 'Likes', 0, 5000, 50, 300, '', false, 'activity'),
    ],
  },
  {
    id: 'content-score', label: 'Content Score', Icon: PenLine, category: 'Content',
    desc: 'Predicted engagement of a social post.',
    output: 'A 0–100 content score.',
    fields: [
      f('postLength', 'Post length (chars)', 0, 2000, 10, 220, '', false, 'content'),
      f('hasImage', 'Has image', 0, 1, 1, 1, '', false, 'content'),
      f('hasVideo', 'Has video', 0, 1, 1, 0, '', false, 'content'),
      f('hashtagCount', 'Hashtags', 0, 30, 1, 5, '', false, 'content'),
      f('mentionCount', 'Mentions', 0, 30, 1, 1, '', false, 'content'),
      f('hour', 'Hour posted', 0, 23, 1, 19, '', false, 'timing'),
      f('dayOfWeek', 'Day of week', 0, 6, 1, 4, '0 = Sun … 6 = Sat', false, 'timing'),
      f('followerCount', 'Followers', 0, 1000000, 100, 5000, '', false, 'social'),
      f('postType', 'Post type', 0, 5, 1, 1, '0 text · 1 image · 2 video · 3 reel · 4 story · 5 carousel', false, 'content'),
      f('sentimentScore', 'Sentiment', 0, 1, 0.05, 0.5, '0 negative → 1 positive', false, 'content'),
    ],
  },
  {
    id: 'search-rank', label: 'Search Rank', Icon: Search, category: 'Visibility',
    desc: 'Where a model should rank in talent search results.',
    output: 'A 0–100 ranking score.',
    fields: [
      f('textRelevance', 'Text relevance', 0, 1, 0.05, 0.6, '', false, 'fit'),
      f('averageRating', 'Average rating', 0, 5, 0.1, 4.4, '', false, 'profile'),
      f('profileQuality', 'Profile quality', 0, 1, 0.05, 0.7, '', false, 'profile'),
      f('bookingsCount', 'Bookings', 0, 500, 1, 10, '', false, 'profile'),
      f('hasPortfolio', 'Has portfolio', 0, 1, 1, 1, '', false, 'profile'),
      f('distanceScore', 'Distance fit', 0, 1, 0.05, 0.6, '', false, 'fit'),
      f('priceFit', 'Price fit', 0, 1, 0.05, 0.6, '', false, 'budget'),
      f('isFeatured', 'Featured', 0, 1, 1, 0, '', false, 'profile'),
    ],
  },
  {
    id: 'casting-success', label: 'Casting Success', Icon: Target, category: 'Matching',
    desc: 'Probability of winning a casting.',
    output: 'A 0–100 likelihood of being accepted.',
    fields: [
      f('locationMatch', 'Location match', 0, 1, 0.05, 0.7, '', false, 'fit'),
      f('genderMatch', 'Gender match', 0, 1, 0.05, 0.8, '', false, 'fit'),
      f('ethnicityMatch', 'Ethnicity match', 0, 1, 0.05, 0.5, '', false, 'fit'),
      f('experienceMatch', 'Experience match', 0, 1, 0.05, 0.6, '', false, 'fit'),
      f('budgetRatio', 'Budget ratio', 0, 2, 0.05, 0.6, '', false, 'budget'),
      f('profileQuality', 'Profile quality', 0, 1, 0.05, 0.7, '', false, 'profile'),
      f('portfolioScore', 'Portfolio score', 0, 1, 0.05, 0.65, '', false, 'profile'),
      f('applicationSpeed', 'Application speed', 0, 1, 0.05, 0.5, '0 slow → 1 fast', false, 'activity'),
      f('averageRating', 'Average rating', 0, 5, 0.1, 4.3, '', false, 'profile'),
      f('bookingHistory', 'Booking history', 0, 1, 0.05, 0.4, '', false, 'profile'),
    ],
  },
  {
    id: 'career-growth', label: 'Career Growth', Icon: BarChart3, category: 'Growth',
    desc: '12-month career growth prediction.',
    output: 'A 0–100 growth score.',
    fields: [
      f('yearsExp', 'Years of experience', 0, 30, 0.5, 3, '', false, 'profile'),
      f('averageRating', 'Average rating', 0, 5, 0.1, 4.4, '', false, 'profile'),
      f('bookingsGrowth', 'Bookings growth', -50, 200, 5, 20, '% YoY', true, 'growth'),
      f('portfolioGrowth', 'Portfolio growth', -50, 200, 5, 30, '% YoY', true, 'growth'),
      f('followersGrowth', 'Followers growth', -50, 200, 5, 15, '% YoY', true, 'growth'),
      f('hasAgency', 'Has agency', 0, 1, 1, 0, '', false, 'profile'),
      f('trainingCompleted', 'Training completed', 0, 1, 0.05, 0.4, '', false, 'growth'),
      f('eventsAttended', 'Events attended', 0, 50, 1, 5, '', false, 'growth'),
      f('profileQuality', 'Profile quality', 0, 1, 0.05, 0.7, '', false, 'profile'),
    ],
  },
  {
    id: 'client-risk', label: 'Client Risk', Icon: AlertTriangle, category: 'Safety',
    desc: 'Scores how risky a client is to work with.',
    output: 'A 0–100 risk score (higher = riskier).',
    fields: [
      f('accountAgeMonths', 'Account age (mo)', 0, 120, 1, 12, '', false, 'profile'),
      f('reviewsCount', 'Reviews', 0, 200, 1, 15, '', false, 'profile'),
      f('averageRating', 'Average rating', 0, 5, 0.1, 4.2, '', false, 'profile'),
      f('verificationStatus', 'Verified', 0, 1, 1, 1, '', false, 'profile'),
      f('disputesCount', 'Disputes', 0, 20, 1, 0, '', false, 'risk'),
      f('completedBookings', 'Completed bookings', 0, 200, 1, 10, '', false, 'profile'),
      f('profileCompleteness', 'Profile completeness', 0, 1, 0.05, 0.8, '', false, 'profile'),
      f('paymentVerified', 'Payment verified', 0, 1, 1, 1, '', false, 'profile'),
    ],
  },
  {
    id: 'fraud', label: 'Fraud Score', Icon: ShieldCheck, category: 'Safety',
    desc: 'Flags accounts that look fraudulent.',
    output: 'A 0–100 fraud risk score.',
    fields: [
      f('failedLogins', 'Failed logins', 0, 20, 1, 0, '', false, 'risk'),
      f('rapidTransactions', 'Rapid transactions', 0, 20, 1, 0, '', false, 'risk'),
      f('newAccount', 'New account (0/1)', 0, 1, 1, 0, '', false, 'profile'),
      f('unusualAmounts', 'Unusual amounts', 0, 20, 1, 0, '', false, 'risk'),
      f('differentIPs', 'Different IPs', 0, 20, 1, 1, '', false, 'risk'),
      f('chargebackHistory', 'Chargebacks', 0, 20, 1, 0, '', false, 'risk'),
      f('verificationGaps', 'Verification gaps', 0, 10, 1, 0, '', false, 'risk'),
      f('transactionVelocity', 'Tx velocity', 0, 20, 1, 1, '', false, 'risk'),
      f('smsVerified', 'SMS verified', 0, 1, 1, 1, '', false, 'profile'),
    ],
  },
  {
    id: 'churn', label: 'Churn Risk', Icon: UserMinus, category: 'Safety',
    desc: 'Predicts whether a user is about to leave the platform.',
    output: 'A 0–100 churn probability.',
    fields: [
      f('daysInactive', 'Days inactive', 0, 90, 1, 5, '', false, 'activity'),
      f('loginFrequency', 'Login freq', 0, 30, 0.5, 7, 'logins per week', false, 'activity'),
      f('messagesSent', 'Messages', 0, 200, 1, 20, '', false, 'activity'),
      f('applicationsCount', 'Applications', 0, 100, 1, 10, '', false, 'activity'),
      f('bookingsCount', 'Bookings', 0, 50, 1, 3, '', false, 'activity'),
      f('profileEdits', 'Profile edits', 0, 50, 1, 5, '', false, 'activity'),
      f('averageRating', 'Average rating', 0, 5, 0.1, 4.0, '', false, 'profile'),
      f('followersGrowth', 'Followers growth', -50, 200, 5, 5, '%', true, 'growth'),
      f('supportTickets', 'Support tickets', 0, 20, 1, 0, '', false, 'risk'),
    ],
  },
  {
    id: 'event-attendance', label: 'Event Attendance', Icon: CalendarCheck, category: 'Events',
    desc: 'Predicts expected attendance at an event.',
    output: 'A 0–100 expected attendance score.',
    fields: [
      f('attendeeLimit', 'Attendee limit', 0, 1000, 10, 100, '', false, 'event'),
      f('price', 'Price ($)', 0, 500, 5, 0, '', false, 'event'),
      f('isFree', 'Free (0/1)', 0, 1, 1, 1, '', false, 'event'),
      f('daysAhead', 'Days ahead', 0, 90, 1, 14, '', false, 'event'),
      f('ticketTypes', 'Ticket types', 0, 10, 1, 1, '', false, 'event'),
      f('isPublic', 'Public (0/1)', 0, 1, 1, 1, '', false, 'event'),
      f('locationType', 'Location type', 0, 2, 1, 1, '0 online · 1 indoor · 2 outdoor', false, 'event'),
      f('hostHistory', 'Host history', 0, 1, 0.05, 0.5, '', false, 'profile'),
      f('eventAgeDays', 'Event age (days)', 0, 365, 1, 30, '', false, 'event'),
    ],
  },
  {
    id: 'course-recommend', label: 'Course Recommend', Icon: GraduationCap, category: 'Growth',
    desc: 'Recommends a course level for a user.',
    output: 'A recommended level: Beginner / Intermediate / Advanced.',
    fields: [
      f('userExperience', 'User exp', 0, 10, 0.5, 2, '', false, 'profile'),
      f('courseLevel', 'Course level', 0, 2, 1, 1, '0 beginner · 1 intermediate · 2 advanced', false, 'course'),
      f('categoryMatch', 'Category match', 0, 1, 0.05, 0.7, '', false, 'fit'),
      f('specialtyMatch', 'Specialty match', 0, 1, 0.05, 0.6, '', false, 'fit'),
      f('courseRating', 'Course rating', 0, 5, 0.1, 4.3, '', false, 'course'),
      f('courseEnrollment', 'Enrollment', 0, 1000, 10, 100, '', false, 'course'),
      f('isFree', 'Free (0/1)', 0, 1, 1, 0, '', false, 'course'),
      f('userProgress', 'User progress', 0, 1, 0.05, 0.3, '', false, 'activity'),
    ],
  },
  {
    id: 'style', label: 'Style Detect', Icon: Palette, category: 'Content',
    desc: 'Classifies photography style from a text description.',
    output: 'A style label (Fashion, Commercial, Swimwear, Fitness, Beauty, Lifestyle, Wedding).',
    isText: true,
    fields: [
      f('description', 'Describe the look', 'text', '', '', '', 'A short text description of the outfit/look'),
    ],
  },
  {
    id: 'sentiment', label: 'Sentiment', Icon: Smile, category: 'Content',
    desc: 'Analyzes the tone of any text.',
    output: 'A label (Positive/Neutral/Negative) and confidence %.',
    isText: true,
    fields: [
      f('text', 'Text', 'text', '', '', '', 'The text to analyze'),
    ],
  },
  {
    id: 'review-authenticity', label: 'Review Authenticity', Icon: ShieldCheck, category: 'Safety',
    desc: 'Detects whether a review is genuine or fake.',
    output: '0–1 authenticity score (1 = looks genuine).',
    isText: true,
    fields: [
      f('text', 'Review text', 'text', '', '', '', 'The review text to check'),
    ],
  },
  {
    id: 'image-quality', label: 'Image Quality', Icon: Image, category: 'Profile',
    desc: 'Scores a single image by resolution, face detection, portrait orientation, brightness and sharpness.',
    output: 'A 0–100 quality score for the image.',
    fields: [
      f('resolutionMP', 'Resolution (MP)', 0, 50, 0.5, 12, 'Megapixels', false, 'content'),
      f('fileSizeKb', 'File size (KB)', 0, 50000, 100, 5000, '', false, 'content'),
      f('hasFace', 'Has face (0/1)', 0, 1, 1, 1, '', false, 'content'),
      f('hasColor', 'Color image (0/1)', 0, 1, 1, 1, '', false, 'content'),
      f('aspectRatio', 'Aspect ratio', 0.5, 3, 0.1, 1.5, 'width / height', false, 'content'),
      f('brightness', 'Brightness', 0, 1, 0.05, 0.6, '', false, 'content'),
      f('contrast', 'Contrast', 0, 1, 0.05, 0.5, '', false, 'content'),
      f('sharpness', 'Sharpness', 0, 1, 0.05, 0.6, '', false, 'content'),
      f('isPortrait', 'Portrait (0/1)', 0, 1, 1, 1, '', false, 'content'),
      f('noiseLevel', 'Noise level', 0, 1, 0.05, 0.2, '0 = clean, 1 = noisy', false, 'content'),
    ],
  },
]

const CATEGORIES = [...new Set(MODELS.map((m) => m.category))]

const pickNumber = (res) => {
  if (res == null) return null
  if (typeof res === 'number') return res
  const keys = ['score', 'probability', 'prediction', 'value', 'estimate', 'rate', 'price', 'growth', 'rank', 'confidence']
  for (const k of keys) {
    const v = res[k]
    if (typeof v === 'number') return v
    if (v && typeof v.value === 'number') return v.value
  }
  return null
}

const pickLabel = (res) => {
  if (res == null) return null
  if (typeof res === 'string') return res
  const keys = ['label', 'style', 'sentiment', 'level', 'recommendation']
  for (const k of keys) {
    if (typeof res[k] === 'string') return res[k]
  }
  return null
}

function ScoreGauge({ value, max = 100, label, color = 'var(--gold)' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const colorForScore = pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : pct >= 40 ? '#F97316' : '#EF4444'
  const activeColor = color === 'var(--gold)' ? colorForScore : color

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 12px' }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="60" fill="none" stroke="var(--bg-soft)" strokeWidth="10" />
          <circle cx="70" cy="70" r="60" fill="none" stroke={activeColor} strokeWidth="10"
            strokeDasharray={`${pct * 3.77} 377`} strokeLinecap="round"
            transform="rotate(-90 70 70)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <strong style={{ fontSize: 28, color: activeColor, lineHeight: 1 }}>{Math.round(value)}</strong>
          <small style={{ fontSize: 11, color: 'var(--text-dim)' }}>/ {max}</small>
        </div>
      </div>
      {label && <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>{label}</p>}
    </div>
  )
}

export default function PythonModels() {
  const { user, hasRole } = useAuth()
  const toast = useToast()
  const isModel = hasRole('Model')
  const isBrand = hasRole('Brand')
  const isAgency = hasRole('Agency')
  const business = isBrand || isAgency

  const [selectedCategory, setSelectedCategory] = useState('All')
  const [model, setModel] = useState(MODELS[0])
  const [form, setForm] = useState(() => Object.fromEntries(MODELS[0].fields.map((x) => [x.name, x.def])))
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [showFields, setShowFields] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)

  const filteredModels = selectedCategory === 'All' ? MODELS : MODELS.filter((m) => m.category === selectedCategory)

  const loadProfile = useCallback(async () => {
    if (!user?.id) { setLoadingProfile(false); return }
    setLoadingProfile(true)
    try {
      const profileType = isModel ? 'Model' : isBrand ? 'Brand' : isAgency ? 'Agency' : null
      const [profileRes, reviewsRes] = await Promise.allSettled([
        profileType ? get(`/profiles/${user.id}`, { type: profileType }).catch(() => null) : Promise.resolve(null),
        profileType ? get('/reviews', { targetUserId: user.id, targetType: profileType }).catch(() => null) : Promise.resolve(null),
      ])

      const profile = profileRes.status === 'fulfilled' ? profileRes.value : null
      const reviews = reviewsRes.status === 'fulfilled' ? reviewsRes.value : null

      if (!profile) { setLoadingProfile(false); return }

      const autoMap = {
        yearsExp: profile.yearsExperience || profile.experienceYears || 3,
        averageRating: reviews?.averageRating || profile.averageRating || 4.5,
        totalBookings: profile.totalBookings || profile.completedBookings || 10,
        height: profile.height || 175,
        followersCount: profile.followersCount || profile.socialFollowers || 2000,
        mediaCount: profile.mediaCount || profile.portfolioCount || 20,
        portfolioSize: profile.portfolioItems || profile.mediaCount || 20,
        fieldCount: profile.filledFields || 18,
        hasBio: profile.bio ? 1 : 0,
        hasMeasurements: profile.measurements ? 1 : 0,
        hasPhotos: (profile.mediaCount || 0) > 0 ? 1 : 0,
        hasExperience: profile.yearsExperience || profile.experienceYears ? 1 : 0,
        hasSpecialties: (profile.specialties?.length || 0) > 0 ? 1 : 0,
        hasLanguages: (profile.languages?.length || 0) > 0 ? 1 : 0,
        hasAgency: profile.agencyId ? 1 : 0,
        hasVerification: profile.isVerified ? 1 : 0,
        hasSocialLinks: profile.instagramUrl || profile.tiktokUrl ? 1 : 0,
        hasCover: profile.coverImage || profile.portfolioCoverUrl ? 1 : 0,
        bookingCount: profile.recentBookings || profile.totalBookings || 6,
        rating: reviews?.averageRating || profile.averageRating || 4.5,
        experienceLevel: Math.min(5, Math.floor((profile.yearsExperience || 2) / 2)),
        styleCount: profile.specialties?.length || profile.styleCount || 3,
        profileQuality: Math.min(1, ((profile.filledFields || 18) / 30)),
      }

      setForm((prev) => {
        const next = { ...prev }
        for (const [k, v] of Object.entries(autoMap)) {
          if (next[k] !== undefined) next[k] = v
        }
        return next
      })
      setProfileLoaded(true)
    } catch {
      // ignore
    } finally {
      setLoadingProfile(false)
    }
  }, [user?.id, isModel, isBrand, isAgency])

  useEffect(() => { loadProfile() }, [loadProfile])

  const switchModel = (m) => {
    setModel(m)
    setForm(Object.fromEntries(m.fields.map((x) => [x.name, x.def])))
    setResult(null)
    setShowFields(true)
  }

  const run = async () => {
    setRunning(true)
    setResult(null)
    try {
      const body = {}
      for (const x of model.fields) {
        if (x.isText) {
          body[x.name] = form[x.name] || ''
        } else {
          body[x.name] = Number(form[x.name])
        }
      }
      const res = await post(`/python-models/${model.id}`, body)
      setResult(res)
      setHistory((h) => [{ model: model.label, icon: model.Icon, result: res, time: new Date() }, ...h].slice(0, 20))
      setShowFields(false)
    } catch (err) {
      const msg = errMsg(err)
      const unavailable = /503|python|service|unavailable/i.test(msg) || err?.response?.status === 503
      toast.error(unavailable ? 'The AI prediction service is currently offline. Try again in a few minutes.' : msg)
    } finally {
      setRunning(false)
    }
  }

  const num = pickNumber(result)
  const label = pickLabel(result)
  const isPrice = model.id === 'price'
  const isText = model.isText
  const displayPct = num != null && num <= 1.05 && !isPrice ? num * 100 : num

  const groupedFields = model.fields.reduce((acc, x) => {
    const g = x.group || 'other'
    if (!acc[g]) acc[g] = []
    acc[g].push(x)
    return acc
  }, {})

  const groupLabels = { fit: 'Fit & Match', budget: 'Budget', profile: 'Profile', activity: 'Activity', social: 'Social', content: 'Content', growth: 'Growth', risk: 'Risk & Safety', completeness: 'Completeness', timing: 'Timing', event: 'Event', course: 'Course' }

  return (
    <div className="container" style={{ padding: '40px 24px 70px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(139,92,246,0.3)' }}>
            <BrainCircuit size={22} color="var(--gold)" />
          </div>
          <div>
            <h1 className="section-title" style={{ marginBottom: 2 }}>Prediction Lab</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>ML-powered insights for your career and business</p>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadProfile} disabled={loadingProfile}>
          <RefreshCw size={14} className={loadingProfile ? 'spin' : ''} /> {profileLoaded ? 'Refresh profile' : 'Load profile data'}
        </button>
      </div>

      {/* Category filter */}
      <div className="card" style={{ padding: 6, marginBottom: 20, display: 'flex', gap: 4, flexWrap: 'wrap', background: 'var(--bg-soft)' }}>
        {['All', ...CATEGORIES].map((c) => (
          <button key={c} className={`btn btn-sm ${selectedCategory === c ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedCategory(c)}>{c}</button>
        ))}
      </div>

      {/* Model selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 22 }}>
        {filteredModels.map((m) => {
          const Icon = m.Icon
          const active = model.id === m.id
          return (
            <button key={m.id} onClick={() => switchModel(m)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 12, border: active ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border)', background: active ? 'rgba(139,92,246,0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? 'rgba(139,92,246,0.2)' : 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={active ? 'var(--gold)' : 'var(--text-dim)'} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: active ? 'var(--text)' : 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{m.category}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid-auto" style={{ gridTemplateColumns: showFields ? 'minmax(0, 1fr) minmax(300px, 400px)' : '1fr', gap: 16, alignItems: 'start' }}>
        {/* Input panel */}
        {showFields && (
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <model.Icon size={18} color="var(--gold)" /> {model.label}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{model.desc}</p>
              </div>
              {profileLoaded && (
                <span className="badge badge-green" style={{ fontSize: 11, flexShrink: 0 }}>Profile loaded</span>
              )}
            </div>

            {model.isText ? (
              <div style={{ marginBottom: 16 }}>
                <div className="field">
                  <label>{model.fields[0].label}</label>
                  <textarea rows={4} value={form[model.fields[0].name] || ''}
                    onChange={(e) => setForm({ ...form, [model.fields[0].name]: e.target.value })}
                    placeholder={model.fields[0].hint || 'Enter text...'} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(groupedFields).map(([group, fields]) => (
                  <div key={group}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      {groupLabels[group] || group}
                    </div>
                    <div className="grid-auto grid-2" style={{ gap: 10 }}>
                      {fields.map((x) => (
                        <div className="field" key={x.name} style={{ marginBottom: 0 }}>
                          <label title={x.hint} style={{ fontSize: 12.5 }}>{x.label}{x.isPct ? ' (%)' : ''}</label>
                          <input type="number" min={x.min} max={x.max} step={x.step}
                            value={form[x.name] ?? ''}
                            onChange={(e) => setForm({ ...form, [x.name]: e.target.value })} />
                          {x.hint && <small style={{ color: 'var(--text-faint)', fontSize: 11 }}>{x.hint}</small>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-primary" style={{ marginTop: 18, width: '100%' }} onClick={run} disabled={running}>
              <Play size={15} /> {running ? 'Running prediction...' : 'Run prediction'}
            </button>
          </div>
        )}

        {/* Result panel */}
        <div className="card" style={{ padding: 22, position: showFields ? 'sticky' : 'static', top: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="var(--gold)" /> Result
          </h3>

          {running ? (
            <PageLoader />
          ) : result == null ? (
            <EmptyState title="No prediction yet" message="Select a model, adjust inputs and run to see results." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {isText ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  {label && <strong style={{ fontSize: 24, color: 'var(--gold)' }}>{label}</strong>}
                  {num != null && <p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 6 }}>Confidence: {(num * 100).toFixed(1)}%</p>}
                </div>
              ) : num != null ? (
                <ScoreGauge value={isPrice ? Math.min(100, num / 10) : displayPct} max={isPrice ? 100 : 100}
                  label={isPrice ? `$${Math.round(num).toLocaleString()} / day` : undefined} />
              ) : (
                <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>The model returned a non-numeric result.</p>
              )}

              {/* Insight */}
              {num != null && !isText && (
                <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-2)', marginBottom: 4 }}>Insight</div>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
                    {displayPct >= 80 ? 'Excellent! This metric is in the top tier. Keep maintaining this level.'
                      : displayPct >= 60 ? 'Good performance. A few improvements could push this to the top tier.'
                      : displayPct >= 40 ? 'Average. Consider focusing on the inputs below to improve this score.'
                      : 'Needs attention. Review the inputs to identify areas for improvement.'}
                  </p>
                </div>
              )}

              <details open>
                <summary style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 8 }}>Raw response</summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, color: 'var(--text-dim)', background: 'var(--bg-soft)', padding: 12, borderRadius: 8, maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(result, null, 2)}</pre>
              </details>

              <button className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setShowFields(true) }}>
                <RefreshCw size={13} /> New prediction
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12, color: 'var(--text-dim)' }}>Recent predictions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((h, i) => {
              const hNum = pickNumber(h.result)
              const hLabel = pickLabel(h.result)
              const Icon = h.icon
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <Icon size={16} color="var(--text-faint)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13 }}>{h.model}</strong>
                    <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 11 }}>{h.time.toLocaleTimeString()}</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {hNum != null ? (
                      <strong style={{ fontSize: 15, color: 'var(--gold)' }}>{h.model.includes('Price') || h.model.includes('Rate') ? `$${Math.round(hNum)}` : hLabel || `${Math.round(hNum * (hNum <= 1.05 ? 100 : 1))}${hNum <= 1.05 ? '%' : ''}`}</strong>
                    ) : hLabel ? (
                      <strong style={{ fontSize: 15, color: 'var(--gold)' }}>{hLabel}</strong>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
