import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import {
  DoorOpen,
  CalendarClock,
  ClipboardCheck,
  BookOpenCheck,
  NotebookPen,
  Archive,
  CalendarDays,
  PiggyBank,
  PackagePlus,
  FileBadge,
  GraduationCap,
  ChevronRight,
} from 'lucide-react'

// Halaman "hub" — kumpulan pintasan (kartu) ke halaman-halaman administrasi
// kelas yang SUDAH ADA. Halaman ini tidak menduplikasi logika apa pun, hanya
// menaut ke rute masing-masing (lihat App.jsx untuk detail komponen aslinya).
//
// Kartu "Kelas" khusus ditampilkan untuk admin-tier/superadmin karena rute
// /kelas memang dijaga `adminOnly` di App.jsx — guru tidak akan pernah
// melihat kartu ini (konsisten dengan Sidebar.jsx sebelumnya yang juga
// tidak menampilkan menu "Kelas" untuk guru).
const SEMUA_KARTU = [
  {
    to: '/kelas',
    label: 'Kelas',
    icon: DoorOpen,
    desc: 'Kelola daftar kelas dan wali kelas.',
    adminOnly: true,
  },
  {
    to: '/jadwal',
    label: 'Jadwal Pelajaran',
    icon: CalendarClock,
    desc: 'Atur jadwal pelajaran tiap kelas.',
  },
  {
    to: '/presensi',
    label: 'Presensi',
    icon: ClipboardCheck,
    desc: 'Catat dan pantau kehadiran siswa harian.',
  },
  {
    to: '/nilai',
    label: 'Nilai Siswa',
    icon: BookOpenCheck,
    desc: 'Input dan lihat nilai siswa per kelas.',
  },
  // PERBAIKAN: kartu "Rapor" ditambahkan supaya guru bisa masuk ke halaman
  // Rapor Siswa (kelola nilai akhir, deskripsi capaian, P5, ekstrakurikuler
  // & catatan wali kelas — lihat Rapor.jsx) langsung dari hub Administrasi
  // Kelas, bukan cuma lewat menu Sidebar terpisah.
  {
    to: '/rapor',
    label: 'Rapor',
    icon: FileBadge,
    desc: 'Kelola nilai akhir, deskripsi capaian, P5 & catatan wali kelas.',
  },
  {
    to: '/rpp',
    label: 'RPP',
    icon: NotebookPen,
    desc: 'Susun rencana pelaksanaan pembelajaran.',
  },
  {
    to: '/arsip-rpp',
    label: 'Arsip RPP',
    icon: Archive,
    desc: 'Lihat kembali RPP yang sudah tersimpan.',
  },
  {
    to: '/agenda',
    label: 'Agenda Sekolah',
    icon: CalendarDays,
    desc: 'Jadwal kegiatan dan agenda sekolah.',
  },
  {
    to: '/keuangan-kelas',
    label: 'Keuangan Kelas',
    icon: PiggyBank,
    desc: 'Kelola kas dan iuran kelas.',
  },
  {
  to: '/portofolio-siswa',
  label: 'Portofolio Siswa',
  icon: GraduationCap,
  desc: 'Lihat ringkasan biodata, kehadiran, nilai & prestasi tiap siswa.',
},
  {
    to: '/pengajuan-kebutuhan-kelas',
    label: 'Kebutuhan Kelas',
    icon: PackagePlus,
    desc: 'Ajukan kebutuhan sarana/prasarana kelas.',
  },
]

export default function AdministrasiKelas() {
  const { isAdmin } = useAuth()
  const kartu = SEMUA_KARTU.filter((k) => !k.adminOnly || isAdmin)

  return (
    <Layout
      title="Administrasi Kelas"
      subtitle="Pusat pintasan untuk seluruh administrasi terkait kelas"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kartu.map((k) => {
          const Icon = k.icon
          return (
            <Link
              key={k.to}
              to={k.to}
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                <Icon size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-800">{k.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{k.desc}</p>
              </div>

              <ChevronRight
                size={18}
                className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-400"
              />
            </Link>
          )
        })}
      </div>
    </Layout>
  )
}
