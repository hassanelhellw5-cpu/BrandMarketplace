import { useState, useEffect } from 'react'
import { GraduationCap, Plus, PlayCircle, Award, BookOpen, Clock, Users, CheckCircle, Star, Filter, Search, Lock } from 'lucide-react'
import { get, post, put, del, errMsg, assetUrl, parseList } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'

const CATEGORIES = ['Modeling', 'Fashion', 'Photography', 'Business', 'Marketing', 'Career', 'Other']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
const CONTENT_TYPES = ['Video', 'Article', 'Quiz', 'PDF']
const pct = (n) => `${Math.round(Number(n || 0))}%`

export default function Training() {
  const { hasRole } = useAuth()
  const toast = useToast()
  const canCreate = hasRole('Brand', 'Agency')
  const [tab, setTab] = useState('browse')
  const [courses, setCourses] = useState({ data: [] })
  const [enrollments, setEnrollments] = useState({ data: [] })
  const [certs, setCerts] = useState({ data: [] })
  const [myCourses, setMyCourses] = useState({ data: [] })
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('')
  const [search, setSearch] = useState('')
  const [openCourse, setOpenCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [creating, setCreating] = useState(false)
  const [courseForm, setCourseForm] = useState({ title: '', category: 'Modeling', skillLevel: 'Beginner', isFree: true, price: '', description: '', shortDescription: '' })
  const [savingCourse, setSavingCourse] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [lessonsModal, setLessonsModal] = useState(false)
  const [lessonForm, setLessonForm] = useState({ title: '', contentType: 'Article', contentText: '', contentUrl: '', durationMinutes: 10 })
  const [savingLesson, setSavingLesson] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [c, e, ct, mc] = await Promise.allSettled([
        get('/training/courses', { pageSize: 50, category: cat || undefined, search: search || undefined }),
        get('/training/enrollments', { pageSize: 50 }),
        get('/training/certificates', { pageSize: 50 }),
        canCreate ? get('/training/courses/my', { pageSize: 50 }) : Promise.resolve({ status: 'fulfilled', value: { data: [] } }),
      ])
      if (c.status === 'fulfilled') setCourses(c.value)
      if (e.status === 'fulfilled') setEnrollments(e.value)
      if (ct.status === 'fulfilled') setCerts(ct.value)
      if (mc.status === 'fulfilled') setMyCourses(mc.value)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [cat, search])

  const enrolledCourseIds = enrollments.data.map((e) => e.courseId)

  const enroll = async (course) => {
    try { await post(`/training/courses/${course.id}/enroll`); toast.success('Enrolled!'); load() }
    catch (err) { toast.error(errMsg(err)) }
  }

  const openCourseDetail = async (course) => {
    setOpenCourse(course)
    try { const res = await get(`/training/courses/${course.id}/lessons`); setLessons(res.data || []) }
    catch { setLessons([]) }
  }

  const completeLesson = async (enr, lesson) => {
    const done = parseList(enr.completedLessonIds).map(Number)
    const ids = done.includes(lesson.id) ? done : [...done, lesson.id]
    const progress = Math.min(100, Math.round((ids.length / (lessons.length || 1)) * 100))
    try {
      const res = await put(`/training/enrollments/${enr.id}/progress`, { progress, completedLessons: ids.length, completedLessonIds: JSON.stringify(ids) })
      toast.success(progress >= 100 ? 'Course completed!' : `Progress ${pct(progress)}`)
      load()
      setOpenCourse((oc) => oc && { ...oc, enrolled: res.progressPercent })
    } catch (err) { toast.error(errMsg(err)) }
  }

  const getCertificate = async (enr) => {
    try {
      const cert = await post(`/training/enrollments/${enr.id}/certificate`)
      toast.success('Certificate issued')
      if (cert?.htmlContent) { const w = window.open('', '_blank'); if (w) { w.document.write(cert.htmlContent); w.document.close() } }
      load()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const saveCourse = async (e) => {
    e.preventDefault()
    setSavingCourse(true)
    try {
      const body = { title: courseForm.title, category: courseForm.category, skillLevel: courseForm.skillLevel, isFree: courseForm.isFree, price: courseForm.isFree ? 0 : Number(courseForm.price) || 0, description: courseForm.description || undefined, shortDescription: courseForm.shortDescription || undefined }
      if (editingCourse) await put(`/training/courses/${editingCourse.id}`, body)
      else await post('/training/courses', body)
      toast.success(editingCourse ? 'Course updated' : 'Course created')
      setCreating(false); setEditingCourse(null)
      setCourseForm({ title: '', category: 'Modeling', skillLevel: 'Beginner', isFree: true, price: '', description: '', shortDescription: '' })
      load()
    } catch (err) { toast.error(errMsg(err)) } finally { setSavingCourse(false) }
  }

  const publishCourse = async (c) => {
    try { await put(`/training/courses/${c.id}/publish`); toast.success('Course published'); load() }
    catch (err) { toast.error(errMsg(err)) }
  }

  const deleteCourse = async (c) => {
    if (!window.confirm('Delete this course?')) return
    try { await del(`/training/courses/${c.id}`); toast.success('Course deleted'); load() }
    catch (err) { toast.error(errMsg(err)) }
  }

  const saveLesson = async (e) => {
    e.preventDefault()
    if (!editingCourse) return
    setSavingLesson(true)
    try {
      await post(`/training/courses/${editingCourse.id}/lessons`, {
        title: lessonForm.title, contentType: lessonForm.contentType,
        contentText: lessonForm.contentText || undefined, contentUrl: lessonForm.contentUrl || undefined,
        durationMinutes: Number(lessonForm.durationMinutes) || 10, isFree: true, isPreview: false,
      })
      toast.success('Lesson added')
      setLessonsModal(false)
      setLessonForm({ title: '', contentType: 'Article', contentText: '', contentUrl: '', durationMinutes: 10 })
      load()
    } catch (err) { toast.error(errMsg(err)) } finally { setSavingLesson(false) }
  }

  const enrFor = (courseId) => enrollments.data.find((e) => e.courseId === courseId)

  const tabs = [
    ['browse', 'Browse courses', BookOpen],
    ['learning', 'My learning', PlayCircle],
    ['certificates', 'Certificates', Award],
    ...(canCreate ? [['create', 'Create course', Plus]] : []),
  ]

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg, #F59E0B, #F43F5E)', display: 'grid', placeItems: 'center' }}>
            <GraduationCap size={22} color="#fff" />
          </div>
          <div>
            <h1 className="section-title">Training academy</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Courses, lessons and certificates for your career growth.</p>
          </div>
        </div>
        {!canCreate && (
          <div className="card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)' }}>
            <Lock size={14} /> Only Brands & Agencies can create courses
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="admin-tabs" style={{ marginBottom: 24 }}>
        {tabs.map(([k, l, Icon]) => (
          <button key={k} className={`admin-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}><Icon size={16} /> {l}</button>
        ))}
      </div>

      {tab === 'browse' && (
        <>
          {/* Search + Category filters */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ position: 'relative', width: 300, maxWidth: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: '10px 14px 10px 38px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className={`badge ${!cat ? 'badge-gold' : ''}`} style={{ cursor: 'pointer', padding: '8px 14px' }} onClick={() => setCat('')}>All</button>
              {CATEGORIES.map((c) => <button key={c} className={`badge ${cat === c ? 'badge-gold' : ''}`} style={{ cursor: 'pointer', padding: '8px 14px' }} onClick={() => setCat(c)}>{c}</button>)}
            </div>
          </div>

          {courses.data.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(244,63,94,0.1))', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
                <BookOpen size={24} color="var(--gold)" />
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>No courses found</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{search || cat ? 'Try a different search or category.' : 'No published courses in this category yet.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
              {courses.data.map((c) => (
                <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.2s', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  onClick={() => openCourseDetail(c)}>
                  {c.coverImageUrl ? <img src={assetUrl(c.coverImageUrl)} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 'var(--radius) var(--radius) 0 0' }} /> : (
                    <div style={{ height: 150, borderRadius: 'var(--radius) var(--radius) 0 0', background: 'linear-gradient(135deg, #F59E0B, #F43F5E)', display: 'grid', placeItems: 'center', fontSize: 40, color: '#fff' }}>🎓</div>
                  )}
                  <div style={{ padding: '0 14px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span className="badge badge-gold">{c.category}</span>
                      <span className="badge">{c.skillLevel}</span>
                      {c.isFree && <span className="badge badge-green">Free</span>}
                    </div>
                    <h3 style={{ fontSize: 16, marginBottom: 4 }}>{c.title}</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.5 }}>{c.shortDescription || (c.description || '').slice(0, 100)}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--text-dim)', fontSize: 12.5, marginTop: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> {c.durationHours}h</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Users size={13} /> {c.totalEnrollments}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={13} /> {c.averageRating || 0}</span>
                      {!c.isFree && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto', color: 'var(--text)', fontWeight: 700 }}>${c.price}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'learning' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {enrollments.data.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
                <PlayCircle size={24} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>No enrollments yet</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>Browse the catalog and enroll in a course to start learning.</p>
              <button className="btn btn-primary" onClick={() => setTab('browse')}><BookOpen size={15} /> Browse courses</button>
            </div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Course</th><th>Progress</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {enrollments.data.map((e) => {
                  const c = courses.data.find((x) => x.id === e.courseId)
                  return (
                    <tr key={e.id}>
                      <td><strong>{c?.title || `Course #${e.courseId}`}</strong></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 120, height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            <div style={{ width: pct(e.progressPercent), height: '100%', background: 'var(--gold)', borderRadius: 6 }} />
                          </div>
                          <small>{pct(e.progressPercent)}</small>
                        </div>
                      </td>
                      <td><span className={`badge ${e.status === 'Completed' ? 'badge-green' : 'badge-gold'}`}>{e.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }} onClick={() => openCourseDetail(c || { id: e.courseId, title: `Course #${e.courseId}` })}><PlayCircle size={13} /> Learn</button>
                          {e.status === 'Completed' && <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }} onClick={() => getCertificate(e)}><Award size={13} /> Certificate</button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'certificates' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {certs.data.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(16,185,129,0.1))', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
                <Award size={24} color="var(--gold)" />
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>No certificates yet</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Complete a course that offers a certificate to earn one.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Number</th><th>Title</th><th>Issued</th><th>Action</th></tr></thead>
              <tbody>
                {certs.data.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-dim)' }}>{c.certificateNumber}</td>
                    <td><strong>{c.title}</strong></td>
                    <td>{c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : '—'}</td>
                    <td><button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }} onClick={() => { if (c?.htmlContent) { const w = window.open('', '_blank'); if (w) { w.document.write(c.htmlContent); w.document.close() } } }}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'create' && canCreate && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: 20 }}>Your courses</h2>
            <button className="btn btn-primary" onClick={() => { setEditingCourse(null); setCourseForm({ title: '', category: 'Modeling', skillLevel: 'Beginner', isFree: true, price: '', description: '', shortDescription: '' }); setCreating(true) }}><Plus size={15} /> New course</button>
          </div>
          {myCourses.data.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(244,63,94,0.1))', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
                <GraduationCap size={24} color="var(--gold)" />
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>No courses yet</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>Create your first course to teach the community.</p>
              <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={15} /> Create course</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {myCourses.data.map((c) => (
                <div key={c.id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 15.5 }}>{c.title}</h3>
                    <span className={`badge ${c.isPublished ? 'badge-green' : 'badge-gold'}`}>{c.isPublished ? 'Published' : c.status}</span>
                  </div>
                  <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 12 }}>{c.lessonCount ?? c.totalLessons} lessons · {c.totalEnrollments} enrolled</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }} onClick={() => { setEditingCourse(c); setLessonsModal(true) }}><Plus size={13} /> Lessons</button>
                    <button className="btn btn-sm" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }} onClick={() => { setEditingCourse(c); setCourseForm({ title: c.title, category: c.category || 'Modeling', skillLevel: c.skillLevel || 'Beginner', isFree: c.isFree, price: c.price || '', description: c.description || '', shortDescription: c.shortDescription || '' }); setCreating(true) }}>Edit</button>
                    {!c.isPublished && <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }} onClick={() => publishCourse(c)}>Publish</button>}
                    <button className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.15)', color: '#FDA4AF' }} onClick={() => deleteCourse(c)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Course detail modal */}
      <Modal open={!!openCourse} onClose={() => setOpenCourse(null)} title={openCourse?.title} width={620}>
        {openCourse && (
          <div>
            <p style={{ color: 'var(--text-dim)', marginBottom: 12 }}>{openCourse.description}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className="badge badge-gold">{openCourse.category}</span>
              <span className="badge">{openCourse.skillLevel}</span>
              <span className="badge">{openCourse.isFree ? 'Free' : `$${openCourse.price || 0}`}</span>
              <span className="badge"><Star size={11} /> {openCourse.averageRating || 0}</span>
            </div>
            {!enrolledCourseIds.includes(openCourse.id) && (
              <button className="btn btn-primary" style={{ width: '100%', marginBottom: 16 }} onClick={() => { enroll(openCourse); setOpenCourse(null) }}>Enroll now</button>
            )}
            {enrFor(openCourse.id) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{ width: pct(enrFor(openCourse.id).progressPercent), height: '100%', background: 'var(--gold)', borderRadius: 6 }} />
                </div>
                <small>{pct(enrFor(openCourse.id).progressPercent)}</small>
              </div>
            )}
            {lessons.length === 0 ? <EmptyState title="No lessons yet" message="Lessons will appear here once the creator adds them." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lessons.map((l, i) => {
                  const enr = enrFor(openCourse.id)
                  const done = enr && parseList(enr.completedLessonIds).map(Number).includes(l.id)
                  return (
                    <div key={l.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: done ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: done ? '#10B981' : 'var(--gold)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>{done ? '✓' : i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 14 }}>{l.title}</strong>
                        <small style={{ color: 'var(--text-dim)', display: 'block' }}>{l.contentType} · {l.durationMinutes} min</small>
                      </div>
                      {done
                        ? <CheckCircle size={18} color="#10B981" />
                        : l.contentType === 'Video' && l.contentUrl
                          ? <button className="btn btn-sm" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }} onClick={() => window.open(l.contentUrl.startsWith('http') ? l.contentUrl : assetUrl(l.contentUrl), '_blank')}><PlayCircle size={13} /> Watch</button>
                          : <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }} onClick={() => enr && completeLesson(enr, l)}><CheckCircle size={13} /> Complete</button>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create/edit course modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title={editingCourse ? 'Edit course' : 'New course'}>
        <form onSubmit={saveCourse}>
          <div className="field"><label>Title *</label><input required value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="e.g. Modeling Masterclass" /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}><label>Category</label><select value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="field" style={{ flex: 1 }}><label>Level</label><select value={courseForm.skillLevel} onChange={(e) => setCourseForm({ ...courseForm, skillLevel: e.target.value })}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="field" style={{ flex: 1 }}><label>Price (USD)</label><input type="number" min={0} disabled={courseForm.isFree} value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22, cursor: 'pointer', color: 'var(--text-dim)' }}><input type="checkbox" checked={courseForm.isFree} onChange={(e) => setCourseForm({ ...courseForm, isFree: e.target.checked })} /> Free</label>
          </div>
          <div className="field"><label>Short description</label><input maxLength={120} value={courseForm.shortDescription} onChange={(e) => setCourseForm({ ...courseForm, shortDescription: e.target.value })} placeholder="Brief summary of the course" /></div>
          <div className="field"><label>Full description</label><textarea rows={3} value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} /></div>
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={savingCourse}>{savingCourse ? 'Saving…' : editingCourse ? 'Save changes' : 'Create course'}</button>
        </form>
      </Modal>

      {/* Add lesson modal */}
      <Modal open={lessonsModal} onClose={() => setLessonsModal(false)} title={`Add lesson · ${editingCourse?.title || ''}`}>
        <form onSubmit={saveLesson}>
          <div className="field"><label>Lesson title *</label><input required value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="e.g. Introduction to Posing" /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}><label>Type</label><select value={lessonForm.contentType} onChange={(e) => setLessonForm({ ...lessonForm, contentType: e.target.value })}>{CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field" style={{ flex: 1 }}><label>Minutes</label><input type="number" min={1} value={lessonForm.durationMinutes} onChange={(e) => setLessonForm({ ...lessonForm, durationMinutes: e.target.value })} /></div>
          </div>
          {lessonForm.contentType === 'Video' || lessonForm.contentType === 'PDF'
            ? <div className="field"><label>Content URL</label><input value={lessonForm.contentUrl} onChange={(e) => setLessonForm({ ...lessonForm, contentUrl: e.target.value })} placeholder="https://… or /uploads/…" /></div>
            : <div className="field"><label>Content</label><textarea rows={6} value={lessonForm.contentText} onChange={(e) => setLessonForm({ ...lessonForm, contentText: e.target.value })} placeholder="Article content or quiz questions..." /></div>}
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={savingLesson}>{savingLesson ? 'Saving…' : 'Add lesson'}</button>
        </form>
      </Modal>
    </div>
  )
}
