import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import Loader from './Loader'

// Halaman "dashboard" (setelah login) — semua redirect kegagalan akses
// (adminOnly/adminUtamaOnly/superAdminOnly) mengarah ke sini.
export const HALAMAN_SETELAH_LOGIN = '/dashboard'

export function FallbackLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <Loader />
    </div>
  )
}

export function ProtectedRoute({ children, adminOnly, adminUtamaOnly, superAdminOnly }) {
  const { session, loading, isAdmin, isAdminUtama, isSuperAdmin, statusAkun } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 2200)
    return () => clearTimeout(timer)
  }, [])

  if (loading || !minTimeElapsed) return <FallbackLoader />

  // Simpan lokasi tujuan supaya Login.jsx bisa mengembalikan user ke sana.
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />

  // Akun yang belum disetujui / ditolak hanya boleh ke halaman menunggu.
  if (statusAkun === 'menunggu' || statusAkun === 'ditolak') {
    return <Navigate to="/menunggu-persetujuan" replace />
  }

  if (adminOnly && !isAdmin) return <Navigate to={HALAMAN_SETELAH_LOGIN} replace />
  if (adminUtamaOnly && !isAdminUtama) return <Navigate to={HALAMAN_SETELAH_LOGIN} replace />
  if (superAdminOnly && !isSuperAdmin) return <Navigate to={HALAMAN_SETELAH_LOGIN} replace />
  return children
}

// Guard khusus halaman menunggu persetujuan.
export function RouteMenunggu({ children }) {
  const { session, loading, statusAkun } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 900)
    return () => clearTimeout(timer)
  }, [])

  if (loading || !minTimeElapsed) return <FallbackLoader />
  if (!session) return <Navigate to="/login" replace />
  if (statusAkun !== 'menunggu' && statusAkun !== 'ditolak') {
    return <Navigate to={HALAMAN_SETELAH_LOGIN} replace />
  }
  return children
}
