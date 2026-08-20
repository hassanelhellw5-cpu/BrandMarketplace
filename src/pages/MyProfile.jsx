import { useAuth } from '../context/AuthContext'
import { PageLoader } from '../components/ui'
import UserProfile from './UserProfile'

export default function MyProfile() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <PageLoader text="Redirecting…" />
  return <UserProfile userId={user.id} />
}
