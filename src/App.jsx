import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth, setBanToast } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
import { CallProvider } from './context/CallContext'
import { ToastProvider, useToast } from './components/Toast'
import NotificationPopup from './components/NotificationPopup'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { PageLoader } from './components/ui'
import { usePageTracking } from './hooks/usePageTracking'

import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Explore from './pages/Explore'
import UserProfile from './pages/UserProfile'
import Castings from './pages/Castings'
import CastingDetail from './pages/CastingDetail'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Marketplace from './pages/Marketplace'
import Dashboard from './pages/Dashboard'
import MyProfile from './pages/MyProfile'
import EditProfile from './pages/EditProfile'
import Wallet from './pages/Wallet'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import MyBookings from './pages/MyBookings'
import MyPortfolio from './pages/MyPortfolio'
import MyCastings from './pages/MyCastings'
import MyCampaigns from './pages/MyCampaigns'

import Analytics from './pages/Analytics'
import Support from './pages/Support'
import Feed from './pages/Feed'
import PostPage from './pages/PostPage'
import Calendar from './pages/Calendar'
import Plans from './pages/Plans'
import SocialStudio from './pages/SocialStudio'
import TaxReports from './pages/TaxReports'
import Training from './pages/Training'
import MyRoster from './pages/MyRoster'
import PortfolioPage from './pages/PortfolioPage'
import NotFound from './pages/NotFound'
import ResetPassword from './pages/ResetPassword'
import Admin from './pages/Admin'
import Assets from './pages/Assets'
import Collections from './pages/Collections'
import Contracts from './pages/Contracts'
import Enterprise from './pages/Enterprise'
import PythonModels from './pages/PythonModels'
import MyEvents from './pages/MyEvents'
import Meeting from './pages/Meeting'

function PublicLayout() {
  usePageTracking()
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  )
}

function ProtectedRoute() {
  const { isAuthed, loading } = useAuth()
  usePageTracking()
  if (loading) return <PageLoader />
  if (!isAuthed) return <Navigate to="/login" replace />
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  )
}

function AdminRoute() {
  const { isAuthed, loading, hasRole } = useAuth()
  if (loading) return <PageLoader />
  if (!isAuthed) return <Navigate to="/login" replace />
  if (!hasRole('Admin', 'SuperAdmin')) return <Navigate to="/dashboard" replace />
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  )
}

function RoleRoute({ roles }) {
  const { isAuthed, loading, hasRole } = useAuth()
  if (loading) return <PageLoader />
  if (!isAuthed) return <Navigate to="/login" replace />
  if (roles && !roles.some((r) => hasRole(r))) return <Navigate to="/dashboard" replace />
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  )
}

function BanListener() {
  const toast = useToast()
  useEffect(() => { setBanToast(toast) }, [toast])
  useEffect(() => {
    const handler = (e) => { toast.error(e.detail?.message || 'Your account has been banned.') }
    window.addEventListener('bm:banned', handler)
    return () => window.removeEventListener('bm:banned', handler)
  }, [toast])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ToastProvider>
        <BanListener />
        <NotificationProvider>
        <CallProvider>
        <NotificationPopup />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/model/:userId" element={<UserProfile />} />
            <Route path="/brand/:userId" element={<UserProfile />} />
            <Route path="/u/:userId" element={<UserProfile />} />
            <Route path="/castings" element={<Castings />} />
            <Route path="/casting/:id" element={<CastingDetail />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaign/:id" element={<CampaignDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/portfolio/:userId" element={<PortfolioPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/feed" element={<Feed />} />
            <Route path="/post/:id" element={<PostPage />} />
            <Route path="/profile" element={<MyProfile />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/my-castings" element={<MyCastings />} />
            <Route path="/my-campaigns" element={<MyCampaigns />} />
            <Route path="/calendar" element={<Calendar />} />

            <Route path="/analytics" element={<Analytics />} />
            <Route path="/support" element={<Support />} />
            <Route path="/tax" element={<TaxReports />} />
            <Route path="/training" element={<Training />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/meeting/:room" element={<Meeting />} />
            <Route path="/enterprise" element={<Enterprise />} />
            <Route path="/ai-predictions" element={<PythonModels />} />
            <Route path="/my-events" element={<MyEvents />} />
          </Route>

          <Route element={<RoleRoute roles={['Model']} />}>
            <Route path="/my-portfolio" element={<MyPortfolio />} />
          </Route>

          <Route element={<RoleRoute roles={['Brand', 'Agency']} />}>
            <Route path="/social" element={<SocialStudio />} />
          </Route>

          <Route element={<RoleRoute roles={['Agency']} />}>
            <Route path="/my-roster" element={<MyRoster />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
        </CallProvider>
        </NotificationProvider>
        </ToastProvider>
      </SubscriptionProvider>
    </AuthProvider>
  )
}
