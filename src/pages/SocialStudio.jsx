import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Camera, Share2, Plus, Trash2, CalendarRange, Wand2, BarChart3, Check, Clock,
  Globe, Tv, MonitorPlay, Briefcase, Sparkles, Image as ImageIcon, Lock, RefreshCw, TrendingUp,
} from 'lucide-react'
import { get, post, put, del, errMsg } from '../api/client'
import { useSubscription } from '../context/SubscriptionContext'
import { useToast } from '../components/Toast'
import { LockedUpgrade } from '../components/plans'
import Modal from '../components/Modal'
import './SocialStudio.css'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Camera },
  { id: 'tiktok', label: 'TikTok', icon: Tv },
  { id: 'facebook', label: 'Facebook', icon: Globe },
  { id: 'x', label: 'X (Twitter)', icon: Share2 },
  { id: 'youtube', label: 'YouTube', icon: MonitorPlay },
  { id: 'linkedin', label: 'LinkedIn', icon: Briefcase },
]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const blankComposer = () => ({ accountId: '', content: '', mediaUrl: '', mediaType: 'image', schedule: '', status: 'Scheduled' })
const blankAnalytics = () => ({ date: new Date().toISOString().slice(0, 10), impressions: '', reach: '', engagement: '', gained: '', lost: '', posts: '' })

export default function SocialStudio() {
  const sub = useSubscription()
  const toast = useToast()

  const [accounts, setAccounts] = useState([])
  const [posts, setPosts] = useState([])
  const [entries, setEntries] = useState([])
  const [smart, setSmart] = useState(null)
  const [analytics, setAnalytics] = useState({})
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState('overview')
  const [addOpen, setAddOpen] = useState(false)
  const [accForm, setAccForm] = useState({ platform: 'instagram', accountName: '', profileUrl: '', followers: '', following: '', postsCount: '', accessToken: '', instagramAccountId: '', facebookPageId: '' })
  const [statsFor, setStatsFor] = useState(null)
  const [statsForm, setStatsForm] = useState({ followers: '', following: '', postsCount: '' })
  const [composer, setComposer] = useState(blankComposer())
  const [composerOpen, setComposerOpen] = useState(false)
  const [metricsFor, setMetricsFor] = useState(null)
  const [metricsForm, setMetricsForm] = useState({ likes: '', comments: '', shares: '', impressions: '', reach: '' })
  const [genning, setGenning] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [entryFor, setEntryFor] = useState(null)
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [entryForm, setEntryForm] = useState({ title: '', scheduledDate: '', timeSlot: '', contentType: 'photo', platform: 'instagram', status: 'Planned', notes: '' })
  const [analyticsFor, setAnalyticsFor] = useState(null)
  const [analyticsForm, setAnalyticsForm] = useState(blankAnalytics())
  const [syncing, setSyncing] = useState(null)

  const canSocial = sub.can('social-hub')
  const accountLimit = sub.limit('social-hub')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [a, p, c, s] = await Promise.allSettled([
        get('/social/accounts'),
        get('/social/posts', { pageSize: 200 }),
        get('/content-calendar', { pageSize: 200 }),
        get('/social/smart/dashboard'),
      ])
      if (a.status === 'fulfilled') setAccounts(a.value.data || [])
      if (p.status === 'fulfilled') setPosts(p.value.data || [])
      if (c.status === 'fulfilled') setEntries(c.value.data || [])
      if (s.status === 'fulfilled') setSmart(s.value)
    } catch { /* handled per promise */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (canSocial) loadAll() }, [canSocial, loadAll])

  const loadAnalytics = useCallback(async (accountId) => {
    try {
      const res = await get('/social/analytics', { accountId })
      setAnalytics((prev) => ({ ...prev, [accountId]: res.data || [] }))
    } catch { setAnalytics((prev) => ({ ...prev, [accountId]: [] })) }
  }, [])

  useEffect(() => {
    if (tab === 'analytics') accounts.forEach((a) => loadAnalytics(a.id))
  }, [tab, accounts, loadAnalytics])

  if (!canSocial) {
    return (
      <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 900 }}>
        <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 26px' }}>
          <span className="badge" style={{ marginBottom: 10 }}><Share2 size={13} /> Social Studio</span>
          <h1 className="section-title">Manage your brand's <span className="grad-text">social media</span></h1>
        </div>
        <LockedUpgrade feature="social-hub" />
        <div className="card soc-free-peek" style={{ marginTop: 18 }}>
          <h3>What you unlock with Social Studio</h3>
          <div className="soc-peek-grid">
            {[
              ['Connect accounts', 'Link Instagram, TikTok, Facebook, X and more.'],
              ['Content calendar', 'Plan a full month of posts on a visual calendar.'],
              ['Scheduling', 'Schedule posts across platforms in advance.'],
              ['AI captions', 'Generate on-brand captions and hashtags.'],
              ['Analytics', 'Real followers, reach, engagement and growth per account.'],
            ].map(([t, d]) => (
              <div key={t}><Lock size={14} /><div><strong>{t}</strong><p>{d}</p></div></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="container" style={{ padding: '40px 24px' }}><div className="skeleton" style={{ height: 400 }} /></div>
  }

  const first = new Date(year, month, 1)
  const cells = []
  for (let i = 0; i < first.getDay(); i++) cells.push(null)
  for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) cells.push(d)

  const totalFollowers = accounts.reduce((a, x) => a + (x.followersCount || 0), 0)
  const scheduledPosts = posts.filter((p) => p.status === 'Scheduled')
  const publishedPosts = posts.filter((p) => p.status === 'Published')

  // ── Accounts ──

  const addAccount = async () => {
    if (!accForm.accountName.trim()) { toast.error('Enter your account name or handle'); return }
    try {
      const isToken = Boolean(accForm.accessToken?.trim())
      await post('/social/accounts', {
        platform: accForm.platform,
        accountName: accForm.accountName.replace(/^@/, ''),
        profileUrl: accForm.profileUrl || null,
        followersCount: Number(accForm.followers || 0),
        followingCount: Number(accForm.following || 0),
        postsCount: Number(accForm.postsCount || 0),
        accessToken: accForm.accessToken?.trim() || null,
        tokenKind: isToken ? (accForm.platform === 'facebook' ? 'facebook' : 'instagram') : null,
        instagramAccountId: accForm.instagramAccountId?.trim() || null,
        facebookPageId: accForm.facebookPageId?.trim() || null,
      })
      toast.success(`${PLATFORMS.find((p) => p.id === accForm.platform)?.label} account connected${isToken ? ' — real data will sync from Instagram' : ''}`)
      setAccForm({ platform: 'instagram', accountName: '', profileUrl: '', followers: '', following: '', postsCount: '', accessToken: '', instagramAccountId: '', facebookPageId: '' })
      setAddOpen(false)
      loadAll()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const refreshAccount = async (id) => {
    setSyncing(id)
    try {
      const res = await post(`/social/accounts/${id}/refresh`)
      const acc = res?.account || res
      toast.success(acc?.lastError ? `Refresh failed: ${acc.lastError}` : 'Live data refreshed from the platform')
      loadAll()
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSyncing(null)
    }
  }

  const removeAccount = async (id) => {
    if (!window.confirm('Disconnect this account?')) return
    try {
      await del(`/social/accounts/${id}`)
      toast.success('Account disconnected')
      loadAll()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const openStats = (a) => {
    setStatsFor(a)
    setStatsForm({ followers: a.followersCount ?? '', following: a.followingCount ?? '', postsCount: a.postsCount ?? '' })
  }

  const saveStats = async () => {
    try {
      await put(`/social/accounts/${statsFor.id}`, {
        ...statsFor,
        followersCount: Number(statsForm.followers || 0),
        followingCount: Number(statsForm.following || 0),
        postsCount: Number(statsForm.postsCount || 0),
      })
      toast.success('Stats updated')
      setStatsFor(null)
      loadAll()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  // ── Posts ──

  const createPost = async () => {
    if (!composer.accountId) { toast.error('Pick the account to post to'); return }
    if (!composer.content.trim()) { toast.error('Write your post content'); return }
    try {
      const body = {
        accountId: Number(composer.accountId),
        content: composer.content.trim(),
        mediaType: composer.mediaType,
        scheduledAt: composer.schedule ? new Date(composer.schedule).toISOString() : null,
        status: composer.status,
        mediaUrls: composer.mediaUrl ? JSON.stringify([composer.mediaUrl]) : null,
      }
      const res = await post('/social/posts', body)
      if (res?.predictedEngagement != null) toast.success(`Post saved — AI predicts ${res.predictedEngagement}/100 engagement`)
      else toast.success('Post saved to calendar')
      setComposer(blankComposer())
      setComposerOpen(false)
      loadAll()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const publishPost = async (p) => {
    const url = window.prompt('Paste the published post URL (optional):', '')
    if (url === null) return
    try {
      await post(`/social/posts/${p.id}/publish`, { postUrl: url || null })
      toast.success('Post marked as published')
      loadAll()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const openMetrics = (p) => {
    setMetricsFor(p)
    setMetricsForm({ likes: p.likesCount ?? '', comments: p.commentsCount ?? '', shares: p.sharesCount ?? '', impressions: p.impressions ?? '', reach: p.reach ?? '' })
  }

  const saveMetrics = async () => {
    try {
      await put(`/social/posts/${metricsFor.id}`, {
        ...metricsFor,
        likesCount: Number(metricsForm.likes || 0),
        commentsCount: Number(metricsForm.comments || 0),
        sharesCount: Number(metricsForm.shares || 0),
        impressions: Number(metricsForm.impressions || 0),
        reach: Number(metricsForm.reach || 0),
      })
      toast.success('Post metrics saved — these feed your analytics')
      setMetricsFor(null)
      loadAll()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const removePost = async (id) => {
    if (!window.confirm('Delete this post?')) return
    try {
      await del(`/social/posts/${id}`)
      loadAll()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const genCaption = async () => {
    if (!composer.content.trim()) { toast.error('Add a topic or draft first'); return }
    setGenning(true)
    try {
      const res = await post('/social/smart/caption', { topic: composer.content.trim(), contentType: composer.mediaType })
      setComposer((c) => ({ ...c, content: res.caption || c.content }))
      toast.success(`Caption generated (${res.source || 'AI'})`)
    } catch (e) {
      toast.info(`AI caption service offline (${errMsg(e)})`)
    } finally { setGenning(false) }
  }

  const accountLabel = (id) => {
    const a = accounts.find((x) => x.id === Number(id))
    return a ? `${a.accountName} (@${a.platform})` : 'Account'
  }

  // ── Content calendar entries ──

  const openAddEntry = (day) => {
    const d = day != null ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : new Date().toISOString().slice(0, 10)
    setEntryFor(null)
    setEntryForm({ title: '', scheduledDate: d, timeSlot: '10:00', contentType: 'photo', platform: 'instagram', status: 'Planned', notes: '' })
    setEntryModalOpen(true)
  }

  const openEditEntry = (en) => {
    setEntryFor(en)
    setEntryForm({ title: en.title || '', scheduledDate: en.scheduledDate?.slice(0, 10) || '', timeSlot: en.timeSlot || '', contentType: en.contentType || 'photo', platform: en.platform || 'instagram', status: en.status || 'Planned', notes: en.notes || '' })
    setEntryModalOpen(true)
  }

  const saveEntry = async () => {
    if (!entryForm.title.trim()) { toast.error('Title is required'); return }
    if (!entryForm.scheduledDate) { toast.error('Pick a date'); return }
    const body = {
      title: entryForm.title.trim(),
      scheduledDate: new Date(entryForm.scheduledDate + 'T' + (entryForm.timeSlot || '10:00')).toISOString(),
      timeSlot: entryForm.timeSlot,
      contentType: entryForm.contentType,
      platform: entryForm.platform,
      status: entryForm.status,
      notes: entryForm.notes,
    }
    try {
      if (entryFor) {
        await put(`/content-calendar/${entryFor.id}`, body)
        toast.success('Calendar entry updated')
      } else {
        await post('/content-calendar', body)
        toast.success('Calendar entry added')
      }
      setEntryModalOpen(false)
      loadAll()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const removeEntry = async (id) => {
    if (!window.confirm('Delete this calendar entry?')) return
    try {
      await del(`/content-calendar/${id}`)
      loadAll()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const entryByDay = (day) => entries.filter((en) => {
    const d = new Date(en.scheduledDate)
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
  })

  // ── Analytics ──

  const syncAnalytics = async (id) => {
    setSyncing(id)
    try {
      const res = await post(`/social/accounts/${id}/analytics/sync`)
      toast.success(`Analytics synced from ${res.days || 0} day(s) of post data`)
      loadAnalytics(id)
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSyncing(null)
    }
  }

  const openRecordAnalytics = (a) => {
    setAnalyticsFor(a)
    setAnalyticsForm(blankAnalytics())
  }

  const saveAnalytics = async () => {
    if (!analyticsForm.date) { toast.error('Pick a date'); return }
    try {
      await post('/social/analytics', {
        accountId: analyticsFor.id,
        date: new Date(analyticsForm.date + 'T12:00:00').toISOString(),
        totalImpressions: Number(analyticsForm.impressions || 0),
        totalReach: Number(analyticsForm.reach || 0),
        totalEngagement: Number(analyticsForm.engagement || 0),
        followersGained: Number(analyticsForm.gained || 0),
        followersLost: Number(analyticsForm.lost || 0),
        totalPosts: Number(analyticsForm.posts || 0),
      })
      toast.success('Daily stats recorded')
      setAnalyticsFor(null)
      loadAnalytics(analyticsFor.id)
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const accTotals = (id) => {
    const rows = analytics[id] || []
    return rows.reduce((a, r) => ({
      impressions: a.impressions + (r.totalImpressions || 0),
      reach: a.reach + (r.totalReach || 0),
      engagement: a.engagement + (r.totalEngagement || 0),
      gained: a.gained + (r.followersGained || 0),
      lost: a.lost + (r.followersLost || 0),
      rate: rows.length ? rows.reduce((x, r) => x + (r.engagementRate || 0), 0) / rows.length : 0,
    }), { impressions: 0, reach: 0, engagement: 0, gained: 0, lost: 0, rate: 0 })
  }

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 1080 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <span className="badge" style={{ marginBottom: 8 }}><Share2 size={13} /> Social Studio · {sub.plan?.name} plan</span>
          <h1 className="section-title">Your brand's <span className="grad-text">social hub</span></h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={() => { setComposer(blankComposer()); setComposerOpen(true) }}><Wand2 size={15} /> New post</button>
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}><Plus size={15} /> Connect account</button>
        </div>
      </div>

      <div className="profile-tabs" style={{ margin: '18px 0 22px' }}>
        {[['overview', 'Overview', BarChart3], ['calendar', 'Calendar', CalendarRange], ['composer', 'Composer', Wand2], ['analytics', 'Analytics', BarChart3]].map(([k, l, I]) => (
          <button key={k} className={`profile-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}><I size={14} /> {l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div className="soc-stats">
            <div className="card soc-stat"><small>Connected accounts</small><strong>{accounts.length}<span> / {accountLimit ?? '∞'}</span></strong></div>
            <div className="card soc-stat"><small>Total followers</small><strong>{totalFollowers.toLocaleString()}</strong></div>
            <div className="card soc-stat"><small>Scheduled posts</small><strong>{scheduledPosts.length}</strong></div>
            <div className="card soc-stat"><small>Posts published</small><strong>{publishedPosts.length}</strong></div>
          </div>

          {smart && (smart.insights?.length > 0 || smart.trendPercent != null) && (
            <div className="card soc-panel" style={{ marginTop: 20 }}>
              <h3><TrendingUp size={15} style={{ color: 'var(--primary-2)' }} /> AI insights</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {smart.trendPercent != null && (
                  <div className="soc-post-row">
                    <span className="soc-post-icon"><TrendingUp size={15} /></span>
                    <div style={{ flex: 1 }}>
                      <strong>{smart.trendPercent >= 0 ? 'Engagement trend' : 'Engagement trend'}</strong>
                      <small>{smart.trendPercent >= 0 ? `+${smart.trendPercent}% this week vs last week` : `${smart.trendPercent}% this week vs last week`}</small>
                    </div>
                  </div>
                )}
                {(smart.insights || []).map((ins, i) => (
                  <div key={i} className="soc-post-row">
                    <span className="soc-post-icon"><Sparkles size={15} /></span>
                    <div style={{ flex: 1 }}>
                      <strong>{ins.title}</strong>
                      <small>{ins.message}</small>
                    </div>
                  </div>
                ))}
                {smart.bestTimes?.length > 0 && (
                  <div className="soc-post-row">
                    <span className="soc-post-icon"><Clock size={15} /></span>
                    <div style={{ flex: 1 }}>
                      <strong>Best posting time</strong>
                      <small>Top slots: {smart.bestTimes.map((b) => `${b.day} ${b.hour}:00`).join(' · ')}</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid-auto grid-2" style={{ marginTop: 20 }}>
            <div className="card soc-panel">
              <h3>Connected accounts</h3>
              {accounts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-faint)' }}>
                  <Globe size={30} style={{ opacity: 0.5, marginBottom: 10 }} />
                  <p style={{ fontSize: 13.5 }}>Connect your first social account to start scheduling.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {accounts.map((a) => {
                    const Icon = PLATFORMS.find((p) => p.id === a.platform)?.icon || Share2
                    const real = Boolean(a.accessToken && (a.isConnected !== false))
                    return (
                      <div key={a.id} className="soc-account">
                        <span className="soc-acc-icon"><Icon size={16} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong>{a.accountName}</strong>
                          <small>@{a.platform} · {(a.followersCount || 0).toLocaleString()} followers{a.lastSyncedAt ? ` · synced ${new Date(a.lastSyncedAt).toLocaleDateString()}` : ''}</small>
                          {a.lastError && <small style={{ display: 'block', color: 'var(--red)' }}>{a.lastError}</small>}
                        </div>
                        {real
                          ? <span className="badge badge-green" style={{ fontSize: 11 }}><Check size={11} /> Live</span>
                          : <span className="badge" style={{ fontSize: 11 }}><Check size={11} /> Connected</span>}
                        <button className="btn btn-ghost btn-sm" onClick={() => refreshAccount(a.id)} disabled={syncing === a.id} title="Refresh real data"><RefreshCw size={13} /></button>
                        <button className="soc-remove" onClick={() => removeAccount(a.id)}><Trash2 size={14} /></button>
                      </div>
                    )
                  })}
                </div>
              )}
              {accountLimit != null && accounts.length >= accountLimit && (
                <Link to="/plans" className="soc-limit-hint"><Sparkles size={13} /> Account limit reached — upgrade for more</Link>
              )}
            </div>

            <div className="card soc-panel">
              <h3>Next scheduled posts</h3>
              {scheduledPosts.slice(0, 5).length === 0 ? (
                <p style={{ color: 'var(--text-faint)', fontSize: 13.5, textAlign: 'center', padding: '30px 0' }}>Nothing scheduled yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {scheduledPosts.slice(0, 5).map((p) => (
                    <div key={p.id} className="soc-post-row">
                      <span className="soc-post-icon"><ImageIcon size={15} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>{p.content?.slice(0, 40) || 'Untitled post'}</strong>
                        <small style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={11} /> {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : 'No schedule'} · {accountLabel(p.accountId)}
                        </small>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => publishPost(p)}>Publish</button>
                      <button className="soc-remove" onClick={() => removePost(p.id)}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="card soc-cal-wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 18 }}>{MONTHS[month]} <span className="grad-text">{year}</span></h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { if (month === 0) { setYear((y) => y - 1); setMonth(11) } else setMonth((m) => m - 1) }}>←</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth()) }}>Today</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { if (month === 11) { setYear((y) => y + 1); setMonth(0) } else setMonth((m) => m + 1) }}>→</button>
            </div>
          </div>
          <div className="cal-grid">
            {WEEKDAYS.map((w) => <div key={w} className="cal-weekday">{w}</div>)}
            {cells.map((day, i) => (
              <div key={i} className={`cal-day soc-cal-day${day === null ? ' empty' : ''}`}>
                {day !== null && (
                  <>
                    <div className="cal-day-top">
                      <span className="cal-day-num">{day}</span>
                      <span className="cal-day-add" role="button" onClick={() => openAddEntry(day)}><Plus size={11} /></span>
                    </div>
                    <div className="cal-day-events">
                      {entryByDay(day).map((en) => (
                        <span key={en.id} className="cal-event" style={{ background: en.status === 'Published' ? 'var(--success)' : 'var(--primary)', cursor: 'pointer' }} onClick={() => openEditEntry(en)}>
                          {en.title}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'composer' && (
        <div className="grid-auto grid-2">
          <div className="card soc-panel">
            <h3 style={{ marginBottom: 14 }}>Compose a post</h3>
            <div className="field">
              <label>Account</label>
              <select value={composer.accountId} onChange={(e) => setComposer({ ...composer, accountId: e.target.value })}>
                <option value="">Select account…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName} (@{a.platform})</option>)}
              </select>
            </div>
            <div className="field"><label>Content</label><textarea rows={4} value={composer.content} onChange={(e) => setComposer({ ...composer, content: e.target.value })} placeholder="Write your caption or generate one with AI…" /></div>
            <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }} onClick={genCaption} disabled={genning}><Wand2 size={14} /> {genning ? 'Generating…' : 'Generate AI caption'}</button>
            <div className="field"><label>Media URL (optional)</label><input value={composer.mediaUrl} onChange={(e) => setComposer({ ...composer, mediaUrl: e.target.value })} placeholder="https://…" /></div>
            <div className="field">
              <label>Media type</label>
              <select value={composer.mediaType} onChange={(e) => setComposer({ ...composer, mediaType: e.target.value })}>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="text">Text only</option>
              </select>
            </div>
            <div className="field"><label>Schedule (optional)</label><input type="datetime-local" value={composer.schedule} onChange={(e) => setComposer({ ...composer, schedule: e.target.value })} /></div>
            <div className="field">
              <label>Status</label>
              <select value={composer.status} onChange={(e) => setComposer({ ...composer, status: e.target.value })}>
                <option value="Scheduled">Scheduled</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={createPost}><CalendarRange size={15} /> Save to calendar</button>
          </div>
          <div className="card soc-panel">
            <h3 style={{ marginBottom: 14 }}>All posts</h3>
            {posts.length === 0 ? <p style={{ color: 'var(--text-faint)', fontSize: 13.5, textAlign: 'center', padding: '30px 0' }}>Your content plan lives here.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
                {posts.map((p) => (
                  <div key={p.id} className="soc-post-row" style={{ flexWrap: 'wrap' }}>
                    <span className="soc-post-icon"><ImageIcon size={15} /></span>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <strong>{p.content?.slice(0, 50) || 'Untitled post'}</strong>
                      <small style={{ display: 'block', color: 'var(--text-faint)' }}>
                        {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : 'No schedule'} · {accountLabel(p.accountId)}
                      </small>
                      {p.status === 'Published' && <small style={{ display: 'block', color: 'var(--text-dim)' }}>{p.likesCount} likes · {p.commentsCount} comments · {p.sharesCount} shares · {p.impressions} impressions</small>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {p.status !== 'Published' && <button className="btn btn-ghost btn-sm" onClick={() => publishPost(p)}><Check size={12} /> Publish</button>}
                      {p.status === 'Published' && <button className="btn btn-ghost btn-sm" onClick={() => openMetrics(p)}>Metrics</button>}
                      <button className="soc-remove" onClick={() => removePost(p.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div>
          {accounts.length === 0 ? (
            <div className="card soc-panel" style={{ textAlign: 'center', padding: '40px' }}>
              <Globe size={34} style={{ opacity: 0.5, marginBottom: 12 }} />
              <h3>Connect accounts to see analytics</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 13.5, margin: '8px 0 16px' }}>Once connected, real follower, reach and engagement data appears here.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Connect account</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {accounts.map((a) => {
                const Icon = PLATFORMS.find((p) => p.id === a.platform)?.icon || Share2
                const t = accTotals(a.id)
                const rows = analytics[a.id] || []
                const bars = [
                  ['Followers', a.followersCount || 0, Math.max(a.followersCount || 1, 1000)],
                  ['Reach (30d)', t.reach, 100000],
                  ['Impressions (30d)', t.impressions, 100000],
                  ['Avg engagement rate', t.rate, 15],
                ]
                return (
                  <div key={a.id} className="card soc-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                      <span className="soc-acc-icon"><Icon size={18} /></span>
                      <div style={{ flex: 1 }}>
                        <strong>{a.accountName}</strong>
                        <small style={{ color: 'var(--text-faint)' }}>@{a.platform} · last synced {a.lastSyncedAt ? new Date(a.lastSyncedAt).toLocaleDateString() : 'never'}</small>
                      </div>
                      <span className="badge">Net growth: {t.gained - t.lost} in 30d</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => refreshAccount(a.id)} disabled={syncing === a.id}><RefreshCw size={13} /> {syncing === a.id ? 'Syncing…' : 'Refresh live'}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => syncAnalytics(a.id)} disabled={syncing === a.id}><RefreshCw size={13} /> Sync from posts</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openRecordAnalytics(a)}><Plus size={13} /> Record stats</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openStats(a)}>Update</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {bars.map(([label, val, max]) => (
                        <div key={label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                            <span style={{ color: 'var(--text-dim)' }}>{label}</span>
                            <strong>{typeof val === 'number' ? val.toLocaleString() : val}</strong>
                          </div>
                          <div className="plan-usage-bar"><div style={{ width: `${Math.min(100, (val / max) * 100)}%` }} /></div>
                        </div>
                      ))}
                    </div>
                    {rows.length > 0 && (
                      <div style={{ marginTop: 16, maxHeight: 200, overflowY: 'auto' }}>
                        <table className="admin-table" style={{ fontSize: 12.5 }}>
                          <thead>
                            <tr><th>Date</th><th>Impressions</th><th>Reach</th><th>Engagement</th><th>Rate</th><th>Net followers</th></tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.id}>
                                <td>{new Date(r.date).toLocaleDateString()}</td>
                                <td>{r.totalImpressions}</td>
                                <td>{r.totalReach}</td>
                                <td>{r.totalEngagement}</td>
                                <td>{r.engagementRate}%</td>
                                <td>{(r.followersGained || 0) - (r.followersLost || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Connect a social account">
        <div className="field">
          <label>Platform</label>
          <select value={accForm.platform} onChange={(e) => setAccForm({ ...accForm, platform: e.target.value })}>
            {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="field"><label>Account name / handle *</label><input value={accForm.accountName} onChange={(e) => setAccForm({ ...accForm, accountName: e.target.value })} placeholder="@yourbrand" /></div>
        <div className="field"><label>Profile URL (optional)</label><input value={accForm.profileUrl} onChange={(e) => setAccForm({ ...accForm, profileUrl: e.target.value })} placeholder="https://instagram.com/yourbrand" /></div>
        {(accForm.platform === 'instagram' || accForm.platform === 'facebook') && (
          <div className="field">
            <label>Access token (optional — enables real Instagram data)</label>
            <input value={accForm.accessToken} onChange={(e) => setAccForm({ ...accForm, accessToken: e.target.value })} placeholder="IG access token (long-lived)" />
            <small style={{ color: 'var(--text-faint)', fontSize: 12 }}>Paste a long-lived token from the Meta Graph API to sync real followers, reach and engagement. Without a token, stats are entered manually.</small>
          </div>
        )}
        {accForm.platform === 'instagram' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Instagram account ID (optional)</label><input value={accForm.instagramAccountId} onChange={(e) => setAccForm({ ...accForm, instagramAccountId: e.target.value })} placeholder="e.g. 17841400000000000" /></div>
            <div className="field"><label>Facebook page ID (optional)</label><input value={accForm.facebookPageId} onChange={(e) => setAccForm({ ...accForm, facebookPageId: e.target.value })} placeholder="e.g. 1024000000000000" /></div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div className="field"><label>Followers</label><input type="number" min="0" value={accForm.followers} onChange={(e) => setAccForm({ ...accForm, followers: e.target.value })} placeholder="0" /></div>
          <div className="field"><label>Following</label><input type="number" min="0" value={accForm.following} onChange={(e) => setAccForm({ ...accForm, following: e.target.value })} placeholder="0" /></div>
          <div className="field"><label>Posts</label><input type="number" min="0" value={accForm.postsCount} onChange={(e) => setAccForm({ ...accForm, postsCount: e.target.value })} placeholder="0" /></div>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
          Numbers are used to build your analytics. Add a token to pull live numbers from the platform automatically.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setAddOpen(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={addAccount}><Plus size={14} /> Connect</button>
        </div>
      </Modal>

      <Modal open={!!statsFor} onClose={() => setStatsFor(null)} title={`Update stats — ${statsFor?.accountName || ''}`}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div className="field"><label>Followers</label><input type="number" min="0" value={statsForm.followers} onChange={(e) => setStatsForm({ ...statsForm, followers: e.target.value })} /></div>
          <div className="field"><label>Following</label><input type="number" min="0" value={statsForm.following} onChange={(e) => setStatsForm({ ...statsForm, following: e.target.value })} /></div>
          <div className="field"><label>Posts</label><input type="number" min="0" value={statsForm.postsCount} onChange={(e) => setStatsForm({ ...statsForm, postsCount: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveStats}>Save stats</button>
      </Modal>

      <Modal open={composerOpen} onClose={() => setComposerOpen(false)} title="New post">
        <div className="field">
          <label>Account</label>
          <select value={composer.accountId} onChange={(e) => setComposer({ ...composer, accountId: e.target.value })}>
            <option value="">Select account…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName} (@{a.platform})</option>)}
          </select>
        </div>
        <div className="field"><label>Content</label><textarea rows={4} value={composer.content} onChange={(e) => setComposer({ ...composer, content: e.target.value })} placeholder="Write your caption or generate one with AI…" /></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <button className="btn btn-outline btn-sm" onClick={genCaption} disabled={genning}><Wand2 size={14} /> {genning ? 'Generating…' : 'Generate AI caption'}</button>
        </div>
        <div className="field"><label>Media URL (optional)</label><input value={composer.mediaUrl} onChange={(e) => setComposer({ ...composer, mediaUrl: e.target.value })} placeholder="https://…" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field">
            <label>Media type</label>
            <select value={composer.mediaType} onChange={(e) => setComposer({ ...composer, mediaType: e.target.value })}>
              <option value="image">Image</option><option value="video">Video</option><option value="text">Text only</option>
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={composer.status} onChange={(e) => setComposer({ ...composer, status: e.target.value })}>
              <option value="Scheduled">Scheduled</option><option value="Draft">Draft</option>
            </select>
          </div>
        </div>
        <div className="field"><label>Schedule</label><input type="datetime-local" value={composer.schedule} onChange={(e) => setComposer({ ...composer, schedule: e.target.value })} /></div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={createPost}><CalendarRange size={15} /> Save to calendar</button>
      </Modal>

      <Modal open={!!metricsFor} onClose={() => setMetricsFor(null)} title="Update post metrics">
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 14 }}>Enter the real numbers from the published post — they feed your analytics.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field"><label>Likes</label><input type="number" min="0" value={metricsForm.likes} onChange={(e) => setMetricsForm({ ...metricsForm, likes: e.target.value })} /></div>
          <div className="field"><label>Comments</label><input type="number" min="0" value={metricsForm.comments} onChange={(e) => setMetricsForm({ ...metricsForm, comments: e.target.value })} /></div>
          <div className="field"><label>Shares</label><input type="number" min="0" value={metricsForm.shares} onChange={(e) => setMetricsForm({ ...metricsForm, shares: e.target.value })} /></div>
          <div className="field"><label>Impressions</label><input type="number" min="0" value={metricsForm.impressions} onChange={(e) => setMetricsForm({ ...metricsForm, impressions: e.target.value })} /></div>
          <div className="field"><label>Reach</label><input type="number" min="0" value={metricsForm.reach} onChange={(e) => setMetricsForm({ ...metricsForm, reach: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveMetrics}>Save metrics</button>
      </Modal>

      <Modal open={!!analyticsFor} onClose={() => setAnalyticsFor(null)} title={`Record daily stats — ${analyticsFor?.accountName || ''}`}>
        <div className="field"><label>Date</label><input type="date" value={analyticsForm.date} onChange={(e) => setAnalyticsForm({ ...analyticsForm, date: e.target.value })} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div className="field"><label>Impressions</label><input type="number" min="0" value={analyticsForm.impressions} onChange={(e) => setAnalyticsForm({ ...analyticsForm, impressions: e.target.value })} /></div>
          <div className="field"><label>Reach</label><input type="number" min="0" value={analyticsForm.reach} onChange={(e) => setAnalyticsForm({ ...analyticsForm, reach: e.target.value })} /></div>
          <div className="field"><label>Engagement</label><input type="number" min="0" value={analyticsForm.engagement} onChange={(e) => setAnalyticsForm({ ...analyticsForm, engagement: e.target.value })} /></div>
          <div className="field"><label>Followers gained</label><input type="number" min="0" value={analyticsForm.gained} onChange={(e) => setAnalyticsForm({ ...analyticsForm, gained: e.target.value })} /></div>
          <div className="field"><label>Followers lost</label><input type="number" min="0" value={analyticsForm.lost} onChange={(e) => setAnalyticsForm({ ...analyticsForm, lost: e.target.value })} /></div>
          <div className="field"><label>Posts</label><input type="number" min="0" value={analyticsForm.posts} onChange={(e) => setAnalyticsForm({ ...analyticsForm, posts: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveAnalytics}>Save stats</button>
      </Modal>

      <Modal open={entryModalOpen} onClose={() => setEntryModalOpen(false)} title={entryFor ? 'Edit calendar entry' : 'Add calendar entry'}>
        <div className="field"><label>Title *</label><input value={entryForm.title} onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })} placeholder="e.g. Behind the scenes reel" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field"><label>Date</label><input type="date" value={entryForm.scheduledDate} onChange={(e) => setEntryForm({ ...entryForm, scheduledDate: e.target.value })} /></div>
          <div className="field"><label>Time</label><input type="time" value={entryForm.timeSlot} onChange={(e) => setEntryForm({ ...entryForm, timeSlot: e.target.value })} /></div>
          <div className="field">
            <label>Content type</label>
            <select value={entryForm.contentType} onChange={(e) => setEntryForm({ ...entryForm, contentType: e.target.value })}>
              <option value="photo">Photo</option><option value="video">Video</option><option value="carousel">Carousel</option><option value="story">Story</option><option value="reel">Reel</option>
            </select>
          </div>
          <div className="field">
            <label>Platform</label>
            <select value={entryForm.platform} onChange={(e) => setEntryForm({ ...entryForm, platform: e.target.value })}>
              {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Status</label>
          <select value={entryForm.status} onChange={(e) => setEntryForm({ ...entryForm, status: e.target.value })}>
            <option value="Planned">Planned</option><option value="InProduction">In production</option><option value="Published">Published</option>
          </select>
        </div>
        <div className="field"><label>Notes</label><input value={entryForm.notes} onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {entryFor && <button className="btn btn-danger btn-sm" onClick={() => { removeEntry(entryFor.id); setEntryModalOpen(false) }}><Trash2 size={13} /> Delete</button>}
          <button className="btn btn-primary" onClick={saveEntry}>Save entry</button>
        </div>
      </Modal>
    </div>
  )
}
