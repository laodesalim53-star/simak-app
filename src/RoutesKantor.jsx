import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/RouteGuards'
import { commonRoutes, adminUmumRoutes } from './RoutesCommon'

const BerandaGenerik = lazy(() => import('../pages/BerandaGenerik'))
const ProfilKantor = lazy(() => import('../pages/ProfilKantor'))
const DaftarHadirPegawai = lazy(() => import('../pages/DaftarHadirPegawai'))
const Presensi = lazy(() => import('../pages/Presensi'))
const PresensiKantor = lazy(() => import('../pages/PresensiKantor'))
const DaftarHadirKantor = lazy(() => import('../pages/DaftarHadirKantor'))
const DataPegawaiKantor = lazy(() => import('../pages/DataPegawaiKantor'))
const PendaftaranNikah = lazy(() => import('../pages/PendaftaranNikah'))
const VerifikasiNikah = lazy(() => import('../pages/VerifikasiNikah'))
const PusatMateriMajelis = lazy(() => import('../pages/PusatMateriMajelis'))
const MateriKeluargaSakinah = lazy(() => import('../pages/MateriKeluargaSakinah'))
const MateriPengelolaanZakat = lazy(() => import('../pages/MateriPengelolaanZakat'))
const MateriWakaf = lazy(() => import('../pages/MateriWakaf'))
const MateriAkhlak = lazy(() => import('../pages/MateriAkhlak'))
const MateriModerasiBeragama = lazy(() => import('../pages/MateriModerasiBeragama'))
const MateriMajelisTaklim = lazy(() => import('../pages/MateriMajelisTaklim'))
const MateriPembinaanGenerasiMuda = lazy(() => import('../pages/MateriPembinaanGenerasiMuda'))
const LaporanPenyuluhanMasyarakatBermoral = lazy(() => import('../pages/LaporanPenyuluhanMasyarakatBermoral'))
const RKTPPenyuluh2 = lazy(() => import('../pages/RKTPPenyuluh2'))
const LaporanKepenghuluan = lazy(() => import('../pages/LaporanKepenghuluan'))
const LaporanKepalaKUA = lazy(() => import('../pages/LaporanKepalaKUA'))
const LaporanBulananKUA = lazy(() => import('../pages/LaporanBulananKUA'))
const SuratPengantar = lazy(() => import('../pages/SuratPengantar'))
const RencanaKerjaTahunan = lazy(() => import('../pages/RencanaKerjaTahunan'))
const PusatKelompokBinaan = lazy(() => import('../pages/PusatKelompokBinaan'))
const KelolaKelompokBinaan = lazy(() => import('../pages/KelolaKelompokBinaan'))
const LaporanPembinaanKonsultasiPendampingan = lazy(() => import('../pages/LaporanPembinaanKonsultasiPendampingan'))
const LaporanPembinaanKeluargaGenerasiMuda = lazy(() => import('../pages/LaporanPembinaanKeluargaGenerasiMuda'))

export default function RoutesKantor() {
  return (
    <Routes>
      <Route path="/" element={<BerandaGenerik />} />
      {commonRoutes}
      {adminUmumRoutes}

      <Route path="/profil-kantor" element={<ProtectedRoute adminOnly><ProfilKantor /></ProtectedRoute>} />
      <Route path="/data-pegawai-kantor" element={<ProtectedRoute adminOnly><DataPegawaiKantor /></ProtectedRoute>} />
      <Route path="/presensi-kantor" element={<ProtectedRoute adminOnly><PresensiKantor /></ProtectedRoute>} />
      <Route path="/daftar-hadir-pegawai" element={<ProtectedRoute><DaftarHadirPegawai /></ProtectedRoute>} />
      {/* Menu pegawai kantor di Sidebar masih menunjuk ke /presensi */}
      <Route path="/presensi" element={<ProtectedRoute><Presensi /></ProtectedRoute>} />
      <Route path="/daftar-hadir-kantor" element={<ProtectedRoute adminOnly><DaftarHadirKantor /></ProtectedRoute>} />

      {/* Nikah: pendaftaran terbuka untuk semua pengguna kantor yang login,
          verifikasi khusus admin_utama */}
      <Route path="/pendaftaran-nikah" element={<ProtectedRoute><PendaftaranNikah /></ProtectedRoute>} />
      <Route path="/verifikasi-nikah" element={<ProtectedRoute adminUtamaOnly><VerifikasiNikah /></ProtectedRoute>} />

      {/* Materi & pembinaan */}
      <Route path="/pusat-materi-majelis" element={<ProtectedRoute><PusatMateriMajelis /></ProtectedRoute>} />
      <Route path="/materi-keluarga-sakinah" element={<ProtectedRoute><MateriKeluargaSakinah /></ProtectedRoute>} />
      <Route path="/materi-pengelolaan-zakat" element={<ProtectedRoute><MateriPengelolaanZakat /></ProtectedRoute>} />
      <Route path="/materi-wakaf" element={<ProtectedRoute><MateriWakaf /></ProtectedRoute>} />
      <Route path="/materi-akhlak" element={<ProtectedRoute><MateriAkhlak /></ProtectedRoute>} />
      <Route path="/materi-moderasi-beragama" element={<ProtectedRoute><MateriModerasiBeragama /></ProtectedRoute>} />
      <Route path="/materi-majelis-taklim" element={<ProtectedRoute adminOnly><MateriMajelisTaklim /></ProtectedRoute>} />
      <Route path="/pembinaan-generasi-muda" element={<ProtectedRoute><MateriPembinaanGenerasiMuda /></ProtectedRoute>} />
      <Route path="/pusat-kelompok-binaan" element={<ProtectedRoute><PusatKelompokBinaan /></ProtectedRoute>} />
      <Route path="/kelompok-binaan/:slug" element={<ProtectedRoute><KelolaKelompokBinaan /></ProtectedRoute>} />

      {/* Laporan */}
      <Route path="/rencana-kerja-tahunan" element={<ProtectedRoute adminOnly><RencanaKerjaTahunan /></ProtectedRoute>} />
      <Route path="/laporan-masyarakat-bermoral-harmonis" element={<ProtectedRoute><LaporanPenyuluhanMasyarakatBermoral /></ProtectedRoute>} />
      <Route path="/rktp-penyuluh-2" element={<ProtectedRoute><RKTPPenyuluh2 /></ProtectedRoute>} />
      <Route path="/laporan-kepenghuluan" element={<ProtectedRoute><LaporanKepenghuluan /></ProtectedRoute>} />
      <Route path="/laporan-kepala-kua" element={<ProtectedRoute adminUtamaOnly><LaporanKepalaKUA /></ProtectedRoute>} />
      <Route path="/laporan-bulanan-kua" element={<ProtectedRoute adminUtamaOnly><LaporanBulananKUA /></ProtectedRoute>} />
      <Route path="/surat-pengantar" element={<ProtectedRoute adminOnly><SuratPengantar /></ProtectedRoute>} />
      <Route path="/laporan-pembinaan-konsultasi-pendampingan" element={<ProtectedRoute><LaporanPembinaanKonsultasiPendampingan /></ProtectedRoute>} />
      <Route path="/laporan-pembinaan-keluarga-generasi-muda" element={<ProtectedRoute><LaporanPembinaanKeluargaGenerasiMuda /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
