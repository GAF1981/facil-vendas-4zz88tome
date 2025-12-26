import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useUserStore } from '@/stores/useUserStore'

export const ProtectedRoute = () => {
  const { employee } = useUserStore()
  const location = useLocation()

  if (!employee) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
