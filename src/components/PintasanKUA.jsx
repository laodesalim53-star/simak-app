import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import {
  Users, FileText, ClipboardList, ClipboardCheck, Library, BookOpen,
  Landmark, Briefcase, Building2,
} from 'lucide-react'

// ============================================================
// Pintasan modul KUA untuk Dasbor Kantor.
//
// Daftar & hak akses di bawah disamakan dengan rute di App.jsx:
//   akses: 'semua' -> semua pengguna yang sudah login  (ProtectedRoute)
//          'admin' -> adminOnly                        (isAdmin)
//          'utama' -> adminUtamaOnly                   (isAdminUtama, Kepala KUA)
// Menu yang tidak boleh diakses pengguna tidak ditampilkan sama sekali.
//
// Kalau ada halaman KUA baru, cukup tambah satu baris di GRUP.
// ============================================================
const GRUP = [
  {
    judul: 'Penyuluhan & bimbingan',
    tone: 'bg-sage-500/15 text-sage-500',
    item: [
      { label: 'Laporan Penyuluhan', to: '/laporan-masyarakat-bermoral-harmonis', icon: FileText, akses: 'semua' },
      { label: 'RKTP Penyuluh Agama', to: '/rktp-penyuluh-2', icon: ClipboardList, akses: 'semua' },
      { label: 'Kelompok Binaan', to: '/pusat-kelompok-binaan', icon: Users, akses: 'semua' },
    ],
  },
  {
    judul: 'Kepenghuluan & nikah',
    tone: 'bg-brass-400/15 text-brass-600',
    item: [
      { label: 'Pendaftaran Nikah', to: '/pendaftaran-nikah', icon: ClipboardList, akses: 'semua' },
      { label: 'Verifikasi Nikah', to: '/verifikasi-nikah', icon: ClipboardCheck, akses: 'utama' },
      { label: 'Laporan Kepenghuluan', to: '/laporan-kepenghuluan', icon: FileText, akses: 'semua' },
    ],
  },
  {
    judul: 'Materi majelis',
    tone: 'bg-ink-700/10 text-ink-700',
    item: [
      { label: 'Pusat Materi Majelis', to: '/pusat-materi-majelis', icon: Library, akses: 'semua' },
      { label: 'Materi Majelis Taklim', to: '/materi-majelis-taklim', icon: BookOpen, akses: 'admin' },
    ],
  },
  {
    judul: 'Laporan & perencanaan',
    tone: 'bg-sage-500/15 text-sage-500',
    item: [
      { label: 'Laporan Kepala KUA', to: '/laporan-kepala-kua', icon: Landmark, akses: 'utama' },
      { label: 'Laporan Bulanan KUA', to: '/laporan-bulanan-kua', icon: FileText, akses: 'utama' },
      { label: 'Rencana Kerja Tahunan', to: '/rencana-kerja-tahunan', icon: ClipboardList, akses: 'admin' },
    ],
  },
  {
    judul: 'Kepegawaian & kantor',
    tone: 'bg-brass-400/15 text-brass-600',
    item: [
      { label: 'Data Pegawai', to: '/data-pegawai-kantor', icon: Briefcase, akses: 'admin' },
      { label: 'Presensi Kantor', to: '/presensi-kantor', icon: ClipboardCheck, akses: 'admin' },
      { label: 'Daftar Hadir Pegawai', to: '/daftar-hadir-pegawai', icon: ClipboardList, akses: 'admin' },
      { label: 'Profil Kantor', to: '/profil-kantor', icon: Building2, akses: 'admin' },
      { label: 'Kondisi Bangunan', to: '/bangunan', icon: Building2, akses: 'admin' },
      { label: 'Inventaris', to: '/inventaris', icon: Briefcase, akses: 'admin' },
    ],
  },
]

export default function PintasanKUA() {
  const { isAdmin, isAdminUtama } = useAuth()

  const boleh = (akses) =>
    akses === 'semua' || (akses === 'admin' && isAdmin) || (akses === 'utama' && isAdminUtama)

  const grup = GRUP
    .map((g) => ({ ...g, item: g.item.filter((i) => boleh(i.akses)) }))
    .filter((g) => g.item.length > 0)

  if (grup.length === 0) return null

  return (
    <div className="card p-6 mb-8">
      <h3 className="font-display text-lg font-semibold">Layanan KUA</h3>
      <p className="text-sm text-ink-700/60 mb-5">Pintasan ke modul yang bisa Anda akses.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        {grup.map((g) => (
          <section key={g.judul}>
            <h4 className="text-sm font-semibold text-ink-950 mb-2">{g.judul}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {g.item.map(({ label, to, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 rounded-xl border border-ink-900/[0.06] bg-white px-3 py-2.5 text-sm text-ink-900 transition hover:shadow-md hover:border-ink-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${g.tone}`}>
                    <Icon size={16} />
                  </span>
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
