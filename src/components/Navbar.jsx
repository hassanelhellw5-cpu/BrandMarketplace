import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Sparkles, Compass, Camera, CalendarRange, Store, LogOut, Menu, X, User, ClipboardList, Megaphone, Wallet, MessageCircle, Bell, LifeBuoy, ShieldCheck, LayoutDashboard, Crown, Share2, Briefcase, Users, CircleDollarSign, BarChart3, FileText, GraduationCap, Bookmark, FileSignature, Image, Trophy, BrainCircuit, Rss } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuth, displayName } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { assetUrl } from '../api/client'
import NavSearch from './NavSearch'
import { PlanBadge } from './plans'
import './Navbar.css'

const navLinks = [
  { to: '/feed', label: 'Feed', icon: Rss },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/castings', label: 'Castings', icon: Camera },
  { to: '/campaigns', label: 'Campaigns', icon: Sparkles },
  { to: '/events', label: 'Events', icon: CalendarRange },
  { to: '/marketplace', label: 'Marketplace', icon: Store },
  { to: '/plans', label: 'Pricing', icon: Crown },
]

export default function Navbar() {
  const { user, isAuthed, logout, loading, hasRole } = useAuth()
  const { plan, status, isActive, sub } = useSubscription()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const menuRef = useRef(null)

  const isModel = hasRole('Model')
  const business = hasRole('Brand', 'Agency')
  const isAgency = hasRole('Agency')
  const isAdmin = hasRole('Admin', 'SuperAdmin')

  const roleLabel = isModel ? 'Model' : isAgency ? 'Agency' : business ? 'Brand' : isAdmin ? 'Admin' : 'Member'

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    setOpen(false)
    await logout()
    navigate('/')
  }

  const planStatus = isActive
    ? { tone: 'active', label: 'Active', sub: sub?.endDate ? `until ${new Date(sub.endDate).toLocaleDateString()}` : `${plan?.name} plan` }
    : status === 'pending' ? { tone: 'pending', label: 'Under review', sub: `${plan?.name || 'Plan'} request waiting for admin approval` }
    : status === 'expired' ? { tone: 'expired', label: 'Expired', sub: 'Renew your plan to keep features' }
    : status === 'cancelled' ? { tone: 'cancelled', label: 'Cancelled', sub: 'Choose a plan to reactivate' }
    : { tone: 'free', label: `Free ${plan?.name || ''}`.trim(), sub: 'Upgrade to unlock paid features' }

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="nav-logo">
          <span className="nav-logo-badge"><Sparkles size={16} /></span>
          Brand<span className="grad-text">Marketplace</span>
        </Link>

        <nav className="nav-links">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <l.icon size={15} />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-right">
          {isAuthed && <NavSearch />}
          {isAuthed && <div className="nav-plan-badge"><PlanBadge /></div>}
          {!loading && (
            isAuthed ? (
              <div className="nav-user" ref={menuRef} onClick={() => setMenuOpen((m) => !m)}>
                {user.profilePictureUrl
                  ? <img src={assetUrl(user.profilePictureUrl)} alt={displayName(user)} className="nav-avatar" />
                  : <span className="nav-avatar-fallback">{displayName(user).charAt(0).toUpperCase()}</span>}
                <span className="nav-user-name">{displayName(user)}</span>
                {menuOpen && (
                  <div className="nav-menu" onClick={(e) => e.stopPropagation()}>
                    <div className="nav-menu-head">
                      <div className="nav-menu-avatar">
                        {user.profilePictureUrl
                          ? <img src={assetUrl(user.profilePictureUrl)} alt={displayName(user)} />
                          : <span>{displayName(user).charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="nav-menu-id">
                        <div className="nav-menu-name">{displayName(user)}</div>
                        <div className="nav-menu-role">{roleLabel}{isAdmin ? ' Â· Admin' : ''}</div>
                      </div>
                      <PlanBadge />
                    </div>

                    <Link to="/plans" className={`nav-plan-status ${planStatus.tone}`} onClick={() => setMenuOpen(false)}>
                      <span className="nps-dot" />
                      <span className="nps-meta">
                        <strong>{planStatus.label}</strong>
                        <small>{planStatus.sub}</small>
                      </span>
                      <Crown size={14} className="nps-crown" />
                    </Link>

                    <span className="nav-menu-label">Workspace</span>
                    <Link to="/dashboard" onClick={() => setMenuOpen(false)}><LayoutDashboard size={15} /> Dashboard</Link>
                    <Link to="/feed" onClick={() => setMenuOpen(false)}><Rss size={15} /> Feed</Link>
                    <Link to="/analytics" onClick={() => setMenuOpen(false)}><BarChart3 size={15} /> Analytics</Link>
                    <Link to="/calendar" onClick={() => setMenuOpen(false)}><CalendarRange size={15} /> Calendar</Link>

                    <span className="nav-menu-label">My work</span>
                    <Link to="/my-bookings" onClick={() => setMenuOpen(false)}><Briefcase size={15} /> My Bookings</Link>
                    {isModel && <Link to="/my-portfolio" onClick={() => setMenuOpen(false)}><Camera size={15} /> My Portfolio</Link>}
                    {isModel && <Link to="/my-castings" onClick={() => setMenuOpen(false)}><ClipboardList size={15} /> My Casting Apps</Link>}
                    {isModel && <Link to="/my-campaigns" onClick={() => setMenuOpen(false)}><Megaphone size={15} /> My Campaign Apps</Link>}
                    {business && <Link to="/my-castings" onClick={() => setMenuOpen(false)}><ClipboardList size={15} /> My Castings</Link>}
                    {business && <Link to="/my-campaigns" onClick={() => setMenuOpen(false)}><Megaphone size={15} /> My Campaigns</Link>}
                    {business && <Link to="/my-events" onClick={() => setMenuOpen(false)}><CalendarRange size={15} /> My Events</Link>}
                    {isModel && <Link to="/my-events" onClick={() => setMenuOpen(false)}><CalendarRange size={15} /> My Events</Link>}
                    {isAgency && <Link to="/my-roster" onClick={() => setMenuOpen(false)}><Users size={15} /> Model Roster</Link>}
                    {business && <Link to="/social" onClick={() => setMenuOpen(false)}><Share2 size={15} /> Social Studio</Link>}

                    <span className="nav-menu-label">Growth</span>
                    <Link to="/assets" onClick={() => setMenuOpen(false)}><Image size={15} /> Media Library</Link>
                    <Link to="/collections" onClick={() => setMenuOpen(false)}><Bookmark size={15} /> Collections</Link>
                    <Link to="/contracts" onClick={() => setMenuOpen(false)}><FileSignature size={15} /> Contracts</Link>
                    <Link to="/ai-predictions" onClick={() => setMenuOpen(false)}><BrainCircuit size={15} /> Prediction Lab</Link>
                    <Link to="/enterprise" onClick={() => setMenuOpen(false)}><Trophy size={15} /> Enterprise</Link>

                    <span className="nav-menu-label">Account</span>
                    <Link to="/profile" onClick={() => setMenuOpen(false)}><User size={15} /> My Profile</Link>
                    <Link to="/wallet" onClick={() => setMenuOpen(false)}><Wallet size={15} /> Wallet</Link>
<Link to="/tax" onClick={() => setMenuOpen(false)}><FileText size={15} /> Tax Reports</Link>
<Link to="/training" onClick={() => setMenuOpen(false)}><GraduationCap size={15} /> Training</Link>
                    <Link to="/messages" onClick={() => setMenuOpen(false)}><MessageCircle size={15} /> Messages</Link>
                    <Link to="/notifications" onClick={() => setMenuOpen(false)}><Bell size={15} /> Notifications</Link>
                    <Link to="/support" onClick={() => setMenuOpen(false)}><LifeBuoy size={15} /> Support</Link>
                    <Link to="/plans" onClick={() => setMenuOpen(false)}><CircleDollarSign size={15} /> Plans & Upgrade</Link>
                    {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)}><ShieldCheck size={15} /> Admin Panel</Link>}

                    <div className="nav-menu-foot">
                      <button onClick={handleLogout}><LogOut size={15} /> Log out</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="nav-cta">
                <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
                <Link to="/signup" className="btn btn-primary btn-sm">Join free</Link>
              </div>
            )
          )}
        </div>

        <button className="nav-burger" onClick={() => setOpen((o) => !o)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="nav-mobile">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}>
              <l.icon size={16} /> {l.label}
            </NavLink>
          ))}
          {isAuthed ? (
            <>
              <div className="nav-mobile-head">
                <div className="nav-menu-avatar">
                  {user.profilePictureUrl
                    ? <img src={assetUrl(user.profilePictureUrl)} alt={displayName(user)} />
                    : <span>{displayName(user).charAt(0).toUpperCase()}</span>}
                </div>
                <div className="nav-menu-id">
                  <div className="nav-menu-name">{displayName(user)}</div>
                  <div className="nav-menu-role">{roleLabel}{isAdmin ? ' Â· Admin' : ''}</div>
                </div>
                <PlanBadge />
              </div>
              <Link to="/plans" className={`nav-plan-status ${planStatus.tone}`} onClick={() => setOpen(false)}>
                <span className="nps-dot" />
                <span className="nps-meta">
                  <strong>{planStatus.label}</strong>
                  <small>{planStatus.sub}</small>
                </span>
                <Crown size={14} className="nps-crown" />
              </Link>
              <span className="nav-menu-label">Workspace</span>
              <Link to="/dashboard" onClick={() => setOpen(false)}><LayoutDashboard size={16} /> Dashboard</Link>
              <Link to="/feed" onClick={() => setOpen(false)}><Rss size={16} /> Feed</Link>
              <Link to="/analytics" onClick={() => setOpen(false)}><BarChart3 size={16} /> Analytics</Link>
              <Link to="/calendar" onClick={() => setOpen(false)}><CalendarRange size={16} /> Calendar</Link>
              <span className="nav-menu-label">My work</span>
              <Link to="/my-bookings" onClick={() => setOpen(false)}><Briefcase size={16} /> My Bookings</Link>
              {isModel && <Link to="/my-portfolio" onClick={() => setOpen(false)}><Camera size={16} /> My Portfolio</Link>}
              {isModel && <Link to="/my-castings" onClick={() => setOpen(false)}><ClipboardList size={16} /> My Casting Apps</Link>}
              {isModel && <Link to="/my-campaigns" onClick={() => setOpen(false)}><Megaphone size={16} /> My Campaign Apps</Link>}
              {business && <Link to="/my-castings" onClick={() => setOpen(false)}><ClipboardList size={16} /> My Castings</Link>}
              {business && <Link to="/my-campaigns" onClick={() => setOpen(false)}><Megaphone size={16} /> My Campaigns</Link>}
              {business && <Link to="/my-events" onClick={() => setOpen(false)}><CalendarRange size={16} /> My Events</Link>}
              {isModel && <Link to="/my-events" onClick={() => setOpen(false)}><CalendarRange size={16} /> My Events</Link>}
              {isAgency && <Link to="/my-roster" onClick={() => setOpen(false)}><Users size={16} /> Model Roster</Link>}
              {business && <Link to="/social" onClick={() => setOpen(false)}><Share2 size={16} /> Social Studio</Link>}
              <span className="nav-menu-label">Account</span>
              <Link to="/profile" onClick={() => setOpen(false)}><User size={16} /> My Profile</Link>
              <Link to="/wallet" onClick={() => setOpen(false)}><Wallet size={16} /> Wallet</Link>
<Link to="/tax" onClick={() => setOpen(false)}><FileText size={16} /> Tax Reports</Link>
<Link to="/training" onClick={() => setOpen(false)}><GraduationCap size={16} /> Training</Link>
              <Link to="/messages" onClick={() => setOpen(false)}><MessageCircle size={16} /> Messages</Link>
              <Link to="/notifications" onClick={() => setOpen(false)}><Bell size={16} /> Notifications</Link>
              <Link to="/support" onClick={() => setOpen(false)}><LifeBuoy size={16} /> Support</Link>
              <Link to="/plans" onClick={() => setOpen(false)}><CircleDollarSign size={16} /> Plans & Upgrade</Link>
              {isAdmin && <Link to="/admin" onClick={() => setOpen(false)}><ShieldCheck size={16} /> Admin Panel</Link>}
              <div className="nav-menu-foot">
                <button onClick={handleLogout}><LogOut size={16} /> Log out</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
              <Link to="/signup" className="btn btn-primary" onClick={() => setOpen(false)}>Join free</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
