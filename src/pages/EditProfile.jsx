import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Upload, Sparkles, TrendingUp, BadgeCheck, ArrowLeft } from 'lucide-react'
import { get, put, post, upload, errMsg, assetUrl, parseList } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { PageLoader } from '../components/ui'
import './MyProfile.css'

const ROLE_PROFILE = {
  Model: '/profiles/model',
  Brand: '/profiles/brand',
  Agency: '/profiles/agency',
}

export default function EditProfile() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ai, setAi] = useState({ price: null, quality: null })
  const [active, setActive] = useState('profile')
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)

  const changePassword = async (e) => {
    e.preventDefault()
    if (pw.next.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (pw.next !== pw.confirm) { toast.error('Passwords do not match'); return }
    setPwBusy(true)
    try {
      await post('/auth/change-password', { currentPassword: pw.current, newPassword: pw.next })
      toast.success('Password updated')
      setPw({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(errMsg(err, 'Could not change password'))
    } finally {
      setPwBusy(false)
    }
  }

  useEffect(() => {
    const role = user?.roles?.[0]
    const path = ROLE_PROFILE[role]
    if (!path) { setLoading(false); return }
    (async () => {
      try {
        const res = await get(path)
        setProfile(res.profile)
      } catch { /* profile may not exist */ }
      setLoading(false)
    })()
  }, [user])

  const save = async () => {
    const role = user?.roles?.[0]
    const path = ROLE_PROFILE[role]
    if (!path) return
    const NUMERIC = ['height', 'weight', 'dailyRate', 'hourlyRate', 'yearsOfExperience', 'socialMediaFollowers', 'companySize', 'yearFounded', 'shoeSize', 'dressSize']
    const clean = {}
    for (const [k, v] of Object.entries(profile || {})) {
      if (v === null || v === undefined) continue
      if (typeof v === 'string' && v.trim() === '') continue
      if (typeof v === 'string' && NUMERIC.includes(k) && v.trim() !== '' && !isNaN(v)) clean[k] = Number(v)
      else clean[k] = v
    }
    setSaving(true)
    try {
      const res = await put(path, clean)
      setProfile((p) => ({ ...p, ...res }))
      toast.success('Profile saved')
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const set = (k, v) => setProfile((p) => ({ ...p, [k]: v }))

  const uploadPic = async (field, file) => {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await upload(`/profiles/${field}`, fd)
      if (field === 'picture') setUser((u) => ({ ...u, profilePictureUrl: res.url }))
      if (field === 'cover') setUser((u) => ({ ...u, coverImageUrl: res.url }))
      toast.success(res.message || 'Uploaded')
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const runAi = async () => {
    try {
      const [p, q] = await Promise.allSettled([
        get('/profiles/model/price-suggestion'),
        get('/profiles/model/quality'),
      ])
      if (p.status === 'fulfilled' && p.value.suggested) setAi((a) => ({ ...a, price: p.value }))
      if (q.status === 'fulfilled' && q.value.available) setAi((a) => ({ ...a, quality: q.value }))
    } catch { /* ignore */ }
  }

  if (loading) return <PageLoader />
  if (!profile) return <PageLoader text="Complete your profile…" />

  const isModel = user?.roles?.[0] === 'Model'
  const isBrand = user?.roles?.[0] === 'Brand'

  const tabs = [
    ['profile', 'Profile'],
    ...(isModel ? [['booking', 'Booking & rates'], ['ai', 'AI insights']] : []),
    ...(isBrand || user?.roles?.[0] === 'Agency' ? [['business', 'Business info']] : []),
  ]

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 900 }}>
      <Link to="/profile" style={{ color: 'var(--text-dim)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
        <ArrowLeft size={15} /> Back to my profile
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 26 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8 }}>My profile</span>
          <h1 className="section-title">Edit your <span className="grad-text">profile</span></h1>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>

      {/* Avatar / Cover */}
      <div className="mp-card edit-cover">
        <div className="edit-cover-img">
          {user?.coverImageUrl ? <img src={assetUrl(user.coverImageUrl)} alt="Cover" /> : <div className="edit-cover-fallback" />}
          <label className="edit-upload edit-cover-btn">
            <Upload size={15} /> Change cover
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && uploadPic('cover', e.target.files[0])} />
          </label>
        </div>
        <div className="edit-avatar-row">
          <div className="edit-avatar">
            {user?.profilePictureUrl ? <img src={assetUrl(user.profilePictureUrl)} alt="Avatar" /> : <span>{user?.displayName?.[0] || 'U'}</span>}
            <label className="edit-upload edit-avatar-btn"><Camera size={14} /><input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && uploadPic('picture', e.target.files[0])} /></label>
          </div>
          <div>
            <h2>{user?.displayName || user?.userName}</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {tabs.map(([k, l]) => (
          <button key={k} className={`profile-tab${active === k ? ' active' : ''}`} onClick={() => setActive(k)}>{l}</button>
        ))}
      </div>

      {active === 'profile' && (
        <div className="card profile-form">
          {isModel && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field"><label>First name</label><input value={profile.firstName || ''} onChange={(e) => set('firstName', e.target.value)} /></div>
              <div className="field"><label>Last name</label><input value={profile.lastName || ''} onChange={(e) => set('lastName', e.target.value)} /></div>
              <div className="field"><label>Gender</label>
                <select value={profile.gender || ''} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">Select</option><option>Female</option><option>Male</option><option>Non-binary</option>
                </select>
              </div>
              <div className="field"><label>Date of birth</label><input type="date" value={profile.dateOfBirth?.slice(0, 10) || ''} onChange={(e) => set('dateOfBirth', e.target.value)} /></div>
              <div className="field"><label>City</label><input value={profile.city || ''} onChange={(e) => set('city', e.target.value)} /></div>
              <div className="field"><label>Country</label><input value={profile.country || ''} onChange={(e) => set('country', e.target.value)} /></div>
              <div className="field"><label>Ethnicity</label><input value={profile.ethnicity || ''} onChange={(e) => set('ethnicity', e.target.value)} /></div>
              <div className="field"><label>Experience level</label>
                <select value={profile.experienceLevel || ''} onChange={(e) => set('experienceLevel', e.target.value)}>
                  <option value="">Select</option>
                  {['Newcomer', 'Beginner', 'Intermediate', 'Professional', 'Expert', 'Veteran'].map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
            </div>
          )}

          {isBrand && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field"><label>Company name</label><input value={profile.companyName || ''} onChange={(e) => set('companyName', e.target.value)} /></div>
              <div className="field"><label>Industry</label><input value={profile.industry || ''} onChange={(e) => set('industry', e.target.value)} /></div>
              <div className="field"><label>Website</label><input value={profile.website || ''} onChange={(e) => set('website', e.target.value)} /></div>
              <div className="field"><label>Company size</label><input type="number" value={profile.companySize || ''} onChange={(e) => set('companySize', e.target.value)} /></div>
              <div className="field"><label>City</label><input value={profile.city || ''} onChange={(e) => set('city', e.target.value)} /></div>
              <div className="field"><label>Country</label><input value={profile.country || ''} onChange={(e) => set('country', e.target.value)} /></div>
              <div className="field"><label>Tax ID</label><input value={profile.taxId || ''} onChange={(e) => set('taxId', e.target.value)} /></div>
              <div className="field"><label>Founded year</label><input type="number" value={profile.yearFounded || ''} onChange={(e) => set('yearFounded', e.target.value)} /></div>
            </div>
          )}

          {user?.roles?.[0] === 'Agency' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field"><label>Agency name</label><input value={profile.agencyName || ''} onChange={(e) => set('agencyName', e.target.value)} /></div>
              <div className="field"><label>Website</label><input value={profile.website || ''} onChange={(e) => set('website', e.target.value)} /></div>
              <div className="field"><label>City</label><input value={profile.city || ''} onChange={(e) => set('city', e.target.value)} /></div>
              <div className="field"><label>Country</label><input value={profile.country || ''} onChange={(e) => set('country', e.target.value)} /></div>
              <div className="field"><label>Phone</label><input value={profile.phoneNumber || ''} onChange={(e) => set('phoneNumber', e.target.value)} /></div>
              <div className="field"><label>Tax ID</label><input value={profile.taxId || ''} onChange={(e) => set('taxId', e.target.value)} /></div>
              <div className="field"><label>Specialties</label><input value={profile.specialties || ''} placeholder="e.g. Fashion, Commercial, Runway" onChange={(e) => set('specialties', e.target.value)} /></div>
              <div className="field"><label>Years in business</label><input type="number" min="0" value={profile.yearsInBusiness || ''} onChange={(e) => set('yearsInBusiness', e.target.value)} /></div>
              <div className="field"><label>Commission rate (%)</label><input type="number" min="0" max="100" step="0.5" value={profile.commissionRate || ''} onChange={(e) => set('commissionRate', e.target.value)} /></div>
            </div>
          )}

          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Bio</label>
            <textarea rows={4} value={user?.bio || ''} placeholder="Tell the world about yourself…"
              onChange={(e) => setUser((u) => ({ ...u, bio: e.target.value }))} />
          </div>
          <button className="btn btn-primary" onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      )}

      {active === 'booking' && isModel && (
        <div className="card profile-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field"><label>Daily rate</label><input type="number" value={profile.dailyRate || ''} onChange={(e) => set('dailyRate', e.target.value)} /></div>
            <div className="field"><label>Hourly rate</label><input type="number" value={profile.hourlyRate || ''} onChange={(e) => set('hourlyRate', e.target.value)} /></div>
            <div className="field"><label>Currency</label>
              <select value={profile.currency || 'USD'} onChange={(e) => set('currency', e.target.value)}>
                {['USD', 'EUR', 'GBP', 'EGP', 'AED', 'SAR', 'TRY'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Work region</label><input value={profile.workRegion || ''} onChange={(e) => set('workRegion', e.target.value)} /></div>
            <div className="field"><label>Height (cm)</label><input type="number" value={profile.height || ''} onChange={(e) => set('height', e.target.value)} /></div>
            <div className="field"><label>Weight (kg)</label><input type="number" value={profile.weight || ''} onChange={(e) => set('weight', e.target.value)} /></div>
            <div className="field"><label>Eye color</label><input value={profile.eyeColor || ''} onChange={(e) => set('eyeColor', e.target.value)} /></div>
            <div className="field"><label>Hair color</label><input value={profile.hairColor || ''} onChange={(e) => set('hairColor', e.target.value)} /></div>
            <div className="field"><label>Body type</label>
              <select value={profile.bodyType || ''} onChange={(e) => set('bodyType', e.target.value)}>
                <option value="">Select</option>
                {['Slim', 'Athletic', 'Average', 'Curvy', 'Plus-size', 'Petite', 'Tall'].map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div className="field"><label>Social handle</label><input value={profile.socialMediaHandle || ''} onChange={(e) => set('socialMediaHandle', e.target.value)} /></div>
            <div className="field"><label>Specialties (comma separated)</label>
              <input value={parseList(profile.specialties).join(', ')}
                onChange={(e) => set('specialties', JSON.stringify(e.target.value.split(',').map((s) => s.trim()).filter(Boolean)))} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--text-dim)' }}>
            <input type="checkbox" checked={!!profile.availableForTravel} onChange={(e) => set('availableForTravel', e.target.checked)} /> Available for travel
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, color: 'var(--text-dim)' }}>
            <input type="checkbox" checked={!!profile.agencyRepresentation} onChange={(e) => set('agencyRepresentation', e.target.checked)} /> Represented by an agency
          </label>
          <button className="btn btn-primary" onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      )}

      {active === 'ai' && isModel && (
        <div className="card profile-form" style={{ textAlign: 'center', padding: 40 }}>
          <span className="dash-ai-icon" style={{ margin: '0 auto 14px' }}><Sparkles size={24} /></span>
          <h2 style={{ marginBottom: 6 }}>AI Insights</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: 24, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
            Your rate suggestion and profile quality score are computed by ML models trained on thousands of profiles.
          </p>
          <button className="btn btn-primary" onClick={runAi} style={{ marginBottom: 24 }}>Run AI analysis</button>

          {(ai.price || ai.quality) && (
            <div className="grid-auto grid-2" style={{ marginTop: 10 }}>
              {ai.price && (
                <div className="ai-result">
                  <TrendingUp size={20} style={{ color: 'var(--primary-2)' }} />
                  <h3>Suggested daily rate</h3>
                  <strong style={{ fontSize: 30, fontFamily: 'var(--font-head)' }}>${ai.price.suggestedDailyRate}</strong>
                  <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Current: ${ai.price.currentDailyRate || 0} {ai.price.currency}</p>
                </div>
              )}
              {ai.quality && (
                <div className="ai-result">
                  <BadgeCheck size={20} style={{ color: 'var(--success)' }} />
                  <h3>Profile quality</h3>
                  <strong style={{ fontSize: 30, fontFamily: 'var(--font-head)' }}>{ai.quality.score}<span style={{ fontSize: 16, color: 'var(--text-dim)' }}>/100</span></strong>
                  <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Completeness & attractiveness</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {active === 'business' && (isBrand || user?.roles?.[0] === 'Agency') && (
        <div className="card profile-form">
          <div className="field"><label>Description</label><textarea rows={4} value={profile.description || ''} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="field"><label>Phone number</label><input value={profile.phoneNumber || ''} onChange={(e) => set('phoneNumber', e.target.value)} /></div>
          <button className="btn btn-primary" onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      )}

      <div className="card profile-form" style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 17, marginBottom: 4 }}>Change password</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>You'll stay signed in on this device after updating.</p>
        <form onSubmit={changePassword} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field"><label>Current password</label><input type="password" required autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
          <div className="field"><label>New password</label><input type="password" required minLength={6} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          <div className="field"><label>Confirm new password</label><input type="password" required minLength={6} autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-outline" type="submit" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
