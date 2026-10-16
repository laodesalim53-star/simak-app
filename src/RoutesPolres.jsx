import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/RouteGuards'
import { commonRoutes, adminUmumRoutes } from './RoutesCommon'

const BerandaGenerik = lazy(() => import('../pages/BerandaGenerik'))
const SuratPengantar = lazy(() => import('../pages/SuratPengantar'))
const ProfilPolres = lazy(() => import('../pages/ProfilPolres'))
const ReskrimPenyidik = lazy(() => import('../pages/ReskrimPenyidik'))
const ReskrimSurat = lazy(() => import('../pages/ReskrimSurat'))
const DataPersonelPolres = lazy(() => import('../pages/DataPersonelPolres'))
const PresensiPolres = lazy(() => import('../pages/PresensiPolres'))
const DaftarHadirPolres = lazy(() => import('../pages/DaftarHadirPolres'))

export default function RoutesPolres() {
  return (
    <Routes>
      <Route path="/" element={<BerandaGenerik />} />
      {commonRoutes}
      {adminUmumRoutes}
      <Route path="/surat-pengantar" element={<ProtectedRoute adminOnly><SuratPengantar /></ProtectedRoute>} />

      <Route path="/profil-polres" element={<ProtectedRoute adminOnly><ProfilPolres /></ProtectedRoute>} />
      <Route path="/reskrim-penyidik" element={<ProtectedRoute><ReskrimPenyidik /></ProtectedRoute>} />
      <Route path="/reskrim/surat" element={<ProtectedRoute><ReskrimSurat /></ProtectedRoute>} />
      <Route path="/data-personel-polres" element={<ProtectedRoute adminOnly><DataPersonelPolres /></ProtectedRoute>} />
      <Route path="/presensi-polres" element={<ProtectedRoute adminOnly><PresensiPolres /></ProtectedRoute>} />
      <Route path="/daftar-hadir-polres" element={<ProtectedRoute adminOnly><DaftarHadirPolres /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
