import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/RouteGuards'
import { commonRoutes, adminUmumRoutes } from './RoutesCommon'

const BerandaPuskesmas = lazy(() => import('../pages/BerandaPuskesmas'))
const ProfilPuskesmas = lazy(() => import('../pages/ProfilPuskesmas'))
const StrSipPegawai = lazy(() => import('../pages/StrSipPegawai'))
const JadwalPiketPegawai = lazy(() => import('../pages/JadwalPiketPegawai'))
const CutiIzinPegawai = lazy(() => import('../pages/CutiIzinPegawai'))
const JadwalPiketSaya = lazy(() => import('../pages/JadwalPiketSaya'))
const CutiIzinSaya = lazy(() => import('../pages/CutiIzinSaya'))
const KeuanganBOK = lazy(() => import('../pages/KeuanganBOK'))
const BidanPuskesmas = lazy(() => import('../pages/BidanPuskesmas'))
const DataPegawaiPuskesmas = lazy(() => import('../pages/DataPegawaiPuskesmas'))
const PresensiPuskesmas = lazy(() => import('../pages/PresensiPuskesmas'))
const DaftarHadirPuskesmas = lazy(() => import('../pages/DaftarHadirPuskesmas'))

export default function RoutesPuskesmas() {
  return (
    <Routes>
      <Route path="/" element={<BerandaPuskesmas />} />
      {commonRoutes}
      {adminUmumRoutes}

      <Route path="/profil-puskesmas" element={<ProtectedRoute adminOnly><ProfilPuskesmas /></ProtectedRoute>} />

      {/* Versi ADMIN — kelola data semua pegawai */}
      <Route path="/str-sip-puskesmas" element={<ProtectedRoute adminOnly><StrSipPegawai /></ProtectedRoute>} />
      <Route path="/jadwal-piket-puskesmas" element={<ProtectedRoute adminOnly><JadwalPiketPegawai /></ProtectedRoute>} />
      <Route path="/cuti-izin-puskesmas" element={<ProtectedRoute adminOnly><CutiIzinPegawai /></ProtectedRoute>} />

      {/* Versi PEGAWAI BIASA — lihat/ajukan milik sendiri */}
      <Route path="/jadwal-piket-saya" element={<ProtectedRoute><JadwalPiketSaya /></ProtectedRoute>} />
      <Route path="/cuti-izin-saya" element={<ProtectedRoute><CutiIzinSaya /></ProtectedRoute>} />

      <Route path="/keuangan-bok" element={<ProtectedRoute adminOnly><KeuanganBOK /></ProtectedRoute>} />
      <Route path="/bidan-puskesmas" element={<ProtectedRoute><BidanPuskesmas /></ProtectedRoute>} />
      <Route path="/data-pegawai-puskesmas" element={<ProtectedRoute adminOnly><DataPegawaiPuskesmas /></ProtectedRoute>} />
      <Route path="/presensi-puskesmas" element={<ProtectedRoute adminOnly><PresensiPuskesmas /></ProtectedRoute>} />
      <Route path="/daftar-hadir-puskesmas" element={<ProtectedRoute adminOnly><DaftarHadirPuskesmas /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
