import { lazy } from 'react'
import { Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, RouteMenunggu } from '../components/RouteGuards'

// ============================================================
// ROUTE BERSAMA — dipakai SEMUA aplikasi (sekolah, kantor, puskesmas, polres).
// Diekspor sebagai fragment konstan, lalu disisipkan ke <Routes> tiap tenant:
//    <Routes> ... {commonRoutes} ... </Routes>
// ============================================================
const Login = lazy(() => import('../pages/Login'))

// Halaman daftar dipilih saat BUILD lewat VITE_APP_TIPE. Perbandingan ditulis
// langsung dengan import.meta.env.VITE_APP_TIPE supaya Vite mengganti nilainya
// jadi string literal dan membuang cabang (dan chunk) yang tidak dipakai.
// Sebelumnya RegisterPuskesmas selalu ikut menjadi chunk di build sekolah.
const Register = lazy(() =>
  import.meta.env.VITE_APP_TIPE === 'puskesmas'
    ? import('../pages/RegisterPuskesmas')
    : import('../pages/Register')
)

const Verifikasi = lazy(() => import('../pages/Verifikasi'))
const MenungguPersetujuan = lazy(() => import('../pages/MenungguPersetujuan'))
const PersetujuanAkun = lazy(() => import('../pages/PersetujuanAkun'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const KebijakanPrivasi = lazy(() => import('../pages/KebijakanPrivasi'))
const SyaratLayanan = lazy(() => import('../pages/SyaratLayanan'))
const ProfilSaya = lazy(() => import('../pages/ProfilSaya'))
const UpgradeFitur = lazy(() => import('../pages/UpgradeFitur'))
const Pesan = lazy(() => import('../pages/Pesan'))
const Pengumuman = lazy(() => import('../pages/Pengumuman'))
const Galeri = lazy(() => import('../pages/Galeri'))
const Dokumen = lazy(() => import('../pages/Dokumen'))
const Agenda = lazy(() => import('../pages/Agenda'))
const LinkLayanan = lazy(() => import('../pages/LinkLayanan'))
const AdminLiveChat = lazy(() => import('../pages/AdminLiveChat'))
const ScanDokumen = lazy(() => import('../pages/ScanDokumen'))
const AlatPDF = lazy(() => import('../pages/AlatPDF'))
const Rapat = lazy(() => import('../pages/Rapat'))
const RapatVideo = lazy(() => import('../pages/RapatVideo'))
const CetakSampulHub = lazy(() => import('../pages/CetakSampulHub'))

export const commonRoutes = (
  <>
    {/* Publik */}
    <Route path="/kebijakan-privasi" element={<KebijakanPrivasi />} />
    <Route path="/syarat-layanan" element={<SyaratLayanan />} />
    <Route path="/login" element={<Login />} />
    <Route path="/login/:jenis" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/verifikasi-dokumen/:kode?" element={<Verifikasi />} />
    <Route path="/menunggu-persetujuan" element={<RouteMenunggu><MenungguPersetujuan /></RouteMenunggu>} />
    <Route path="/persetujuan-akun" element={<ProtectedRoute adminUtamaOnly><PersetujuanAkun /></ProtectedRoute>} />

    {/* Setelah login */}
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/profil-saya" element={<ProtectedRoute><ProfilSaya /></ProtectedRoute>} />
    <Route path="/upgrade-fitur" element={<ProtectedRoute><UpgradeFitur /></ProtectedRoute>} />
    <Route path="/pesan" element={<ProtectedRoute><Pesan /></ProtectedRoute>} />
    <Route path="/pengumuman" element={<ProtectedRoute><Pengumuman /></ProtectedRoute>} />
    <Route path="/galeri" element={<ProtectedRoute><Galeri /></ProtectedRoute>} />
    <Route path="/dokumen" element={<ProtectedRoute><Dokumen /></ProtectedRoute>} />
    <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
    <Route path="/link-layanan" element={<ProtectedRoute><LinkLayanan /></ProtectedRoute>} />
    <Route path="/scan-dokumen" element={<ProtectedRoute><ScanDokumen /></ProtectedRoute>} />
    <Route path="/alat-pdf" element={<ProtectedRoute><AlatPDF /></ProtectedRoute>} />
    <Route path="/live-chat" element={<ProtectedRoute superAdminOnly><AdminLiveChat /></ProtectedRoute>} />

    {/* Rapat: sengaja tanpa ProtectedRoute (tamu boleh gabung lewat link) */}
    <Route path="/rapat" element={<ProtectedRoute><Rapat /></ProtectedRoute>} />
    <Route path="/rapat/:roomId" element={<RapatVideo />} />

    {/* Cetak Sampul Laporan — hanya ADA SATU route /cetak-sampul */}
    <Route path="/cetak-sampul" element={<ProtectedRoute><CetakSampulHub /></ProtectedRoute>} />
    <Route path="/cetak-sampul-semester" element={<Navigate to="/cetak-sampul?jenis=semester" replace />} />
    <Route path="/cetak-sampul-8355" element={<Navigate to="/cetak-sampul?jenis=8355" replace />} />
  </>
)

// ------------------------------------------------------------
// ADMINISTRASI UMUM — dipakai sekolah, kantor, puskesmas (BUKAN polres).
// Sesuaikan isinya kalau ada halaman yang tidak relevan untuk suatu tenant.
// ------------------------------------------------------------
const Inventaris = lazy(() => import('../pages/Inventaris'))
const Bangunan = lazy(() => import('../pages/Bangunan'))
const Surat = lazy(() => import('../pages/Surat'))
const Keuangan = lazy(() => import('../pages/Keuangan'))
const Kuitansi = lazy(() => import('../pages/Kuitansi'))
const KuitansiJasa = lazy(() => import('../pages/KuitansiJasa'))
const BkuBank = lazy(() => import('../pages/BkuBank'))
const Backup = lazy(() => import('../pages/Backup'))

export const adminUmumRoutes = (
  <>
    <Route path="/inventaris" element={<ProtectedRoute adminOnly><Inventaris /></ProtectedRoute>} />
    <Route path="/bangunan" element={<ProtectedRoute adminOnly><Bangunan /></ProtectedRoute>} />
    <Route path="/surat" element={<ProtectedRoute adminOnly><Surat /></ProtectedRoute>} />
    <Route path="/keuangan" element={<ProtectedRoute adminOnly><Keuangan /></ProtectedRoute>} />
    <Route path="/kuitansi" element={<ProtectedRoute adminOnly><Kuitansi /></ProtectedRoute>} />
    <Route path="/kuitansi-jasa" element={<ProtectedRoute adminOnly><KuitansiJasa /></ProtectedRoute>} />
    <Route path="/bku-bank" element={<ProtectedRoute adminOnly><BkuBank /></ProtectedRoute>} />
    <Route path="/backup" element={<ProtectedRoute adminOnly><Backup /></ProtectedRoute>} />
  </>
)
