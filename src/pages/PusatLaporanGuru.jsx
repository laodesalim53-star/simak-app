import { Link } from 'react-router-dom'
import {
  FileText,
  Users,
  GraduationCap,
  Award,
  Heart,
  BookOpen,
  School,
  ClipboardList,
  CalendarCheck,
  ClipboardEdit,
  Printer,
  Lock,
  LayoutDashboard,
  FileCheck2,
  FileSignature,
} from 'lucide-react'
import Layout from '../components/Layout'

// Halaman "bagan" / hub untuk semua laporan kepegawaian guru yang berasal
// dari format Laporan Bulanan sekolah (LAPORAN_BULANAN_JULI_2023.xlsx).
// Ditambahkan SATU kartu di sini setiap kali satu halaman cetak baru selesai
// dibuat — supaya Sidebar cukup punya 1 link ke halaman ini saja, tidak perlu
// nambah menu baru tiap kali ada laporan baru.
//
// Cara mengaktifkan laporan baru: ubah `siap: false` menjadi `siap: true` dan
// isi `path` dengan route halaman cetaknya di array `daftarLaporan` di bawah.
const daftarLaporan = [
  {
    id: 'nominatif',
    judul: 'Daftar Nominatif Guru/Pegawai',
    deskripsi: 'Data kepegawaian lengkap: NIP, NUPTK, pangkat/golongan, status kepegawaian, SK, dan masa kerja.',
    icon: Users,
    path: '/laporan-nominatif-guru',
    siap: true,
  },
  {
    id: 'biodata',
    judul: 'Biodata Guru/Pegawai',
    deskripsi: 'Data diri ringkas: nama, tempat/tanggal lahir, agama, status pegawai, jabatan, dan alamat.',
    icon: FileText,
    path: '/laporan-biodata-guru',
    siap: true,
  },
  {
    id: 'pendidikan',
    judul: 'Data Pendidikan Guru/Pegawai',
    deskripsi: 'Riwayat pendidikan terakhir, lembaga, jurusan, tahun lulus, dan pelatihan yang pernah diikuti.',
    icon: GraduationCap,
    path: '/laporan-pendidikan-guru',
    siap: true,
  },
  {
    id: 'kepangkatan',
    judul: 'Data Kepangkatan Guru/Pegawai',
    deskripsi: 'Riwayat SK pengangkatan pertama, SK terakhir, SK penempatan, dan gaji pokok.',
    icon: Award,
    path: '/laporan-kepangkatan-guru',
    siap: true,
  },
  {
    id: 'tanggungan',
    judul: 'Data Tanggungan Keluarga',
    deskripsi: 'Status perkawinan, data pasangan, dan jumlah anak yang menjadi tanggungan.',
    icon: Heart,
    path: '/laporan-tanggungan-keluarga',
    siap: true,
  },
  {
    id: 'tenaga-pengajar',
    judul: 'Data Rincian Tenaga Pengajar',
    deskripsi: 'Beban mengajar per guru: kelas, mata pelajaran, jam mengajar, dan rekap kehadiran.',
    icon: BookOpen,
    path: '/laporan-tenaga-pengajar',
    siap: true,
  },
  {
    id: 'keadaan-murid',
    judul: 'Data Keadaan Murid',
    deskripsi: 'Rekap jumlah murid per kelas dan ruang belajar yang tersedia.',
    icon: School,
    path: '/laporan-keadaan-murid',
    siap: true,
  },
  {
    id: 'semester',
    judul: 'Laporan Semester',
    deskripsi: 'Jam pelajaran per mata pelajaran per kelas, keadaan gedung/ruang sekolah, dan keadaan buku KTSP & K-13.',
    icon: ClipboardList,
    path: '/laporan-semester',
    siap: true,
  },
  {
    id: 'daftar-hadir-guru',
    judul: 'Daftar Hadir Guru/Pegawai',
    deskripsi: 'Format kertas absensi bulanan (grid tanggal 1–31) lengkap dengan rekap Sakit/Izin/Tanpa Keterangan dan tanda tangan kepala sekolah.',
    icon: CalendarCheck,
    path: '/laporan-daftar-hadir-guru',
    siap: true,
  },
  // Formulir 8355 (Daftar Calon Peserta Ujian, Kelas 6) — dipindahkan ke sini
  // supaya satu pintu dengan laporan kepegawaian guru lainnya, tidak perlu
  // menu tersendiri di Sidebar. Dua kartu: input data mentahnya (Data Ujian
  // 8355) dan halaman cetak 3 lampirannya (Cetak 8355).
  {
    id: 'data-ujian-8355',
    judul: 'Data Ujian 8355',
    deskripsi: 'Input dan kelola data siswa Kelas 6 yang dipakai untuk formulir 8355 (data orang tua, kode peserta, dsb).',
    icon: ClipboardEdit,
    path: '/data-ujian-8355',
    siap: true,
  },
  {
    id: 'cetak-8355',
    judul: 'Cetak 8355',
    deskripsi: 'Cetak 3 lampiran Daftar Calon Peserta Ujian (8355) untuk siswa Kelas 6, siap unduh sebagai PDF.',
    icon: Printer,
    path: '/cetak-8355',
    siap: true,
  },
  // Surat Keterangan Lulus (SKL) — dipindahkan ke sini juga, dengan alasan
  // yang sama seperti 8355: satu pintu laporan, Sidebar tidak makin panjang.
  {
    id: 'surat-keterangan-lulus',
    judul: 'Surat Keterangan Lulus (SKL)',
    deskripsi: 'Nomor SKL otomatis per siswa Kelas 6, dicetak dari nilai ijazah yang sudah diisi.',
    icon: FileCheck2,
    path: '/skl',
    siap: true,
  },
]
  {
    id: 'surat-keterangan',
    judul: 'Surat Keterangan',
    deskripsi: 'Buat dan kelola surat keterangan untuk siswa maupun guru, lengkap dengan nomor surat.',
    icon: FileSignature,
    path: '/surat-keterangan',
    siap: true,
  },
]

// Sama seperti BatikOverlay di Dashboard.jsx — dipakai di banner atas
// supaya identitas visual (motif batik + gradasi biru tua) konsisten
// di seluruh halaman.
function BatikOverlay({ patternId, strokeColor = '#d4af37', opacity = 1, size = 72 }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(8)"
        >
          <g fill="none" stroke={strokeColor} strokeWidth="1.1" opacity={opacity}>
            <ellipse cx={size / 2} cy={size * 0.333} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size / 2} cy={size * 0.667} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size * 0.333} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <ellipse cx={size * 0.667} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <circle cx={size / 2} cy={size / 2} r={size * 0.042} opacity="0.7" />
          </g>
          <path
            d={`M0 ${size} L${size * 0.25} ${size * 0.75} L${size * 0.5} ${size} L${size * 0.75} ${size * 0.75} L${size} ${size}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.35}
          />
          <path
            d={`M0 0 L${size * 0.25} ${size * 0.25} L0 ${size * 0.5}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.3}
          />
          <circle cx={size * 0.11} cy={size * 0.11} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.89} cy={size * 0.22} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.22} cy={size * 0.89} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

export default function PusatLaporanGuru() {
  return (
    <Layout
      title="Laporan Kepegawaian Guru"
      subtitle="Pilih jenis laporan yang ingin dicetak. Setiap laporan diambil otomatis dari data Guru dan Profil Sekolah."
    >
      <style>{`
        @keyframes dashFadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-fade-in {
          animation: dashFadeInUp 0.5s ease-out forwards;
        }
      `}</style>

      <div className="relative">
        <div className="dash-fade-in opacity-0 relative overflow-hidden rounded-xl p-6 mb-6 flex items-center gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <BatikOverlay patternId="batikBannerLaporan" strokeColor="#d4af37" />
          <div className="relative w-12 h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <LayoutDashboard size={22} />
          </div>
          <div className="relative">
            <p className="font-display font-semibold text-lg text-white">Pusat Laporan Kepegawaian Guru</p>
            <p className="text-sm text-blue-200/70">Semua laporan siap cetak ada di bawah ini.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {daftarLaporan.map((laporan, i) => {
            const Icon = laporan.icon
            const Isi = () => (
              <>
                <div
                  className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
                    laporan.siap ? 'bg-sage-500/15 text-sage-500' : 'bg-ink-900/[0.05] text-ink-700/30'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <h3
                  className={`font-display text-sm font-semibold mb-1 ${
                    laporan.siap ? 'text-ink-950' : 'text-ink-700/30'
                  }`}
                >
                  {laporan.judul}
                </h3>
                <p
                  className={`text-xs leading-relaxed ${
                    laporan.siap ? 'text-ink-700/60' : 'text-ink-700/30'
                  }`}
                >
                  {laporan.deskripsi}
                </p>
                {!laporan.siap && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-700/40 bg-ink-900/[0.05] px-2 py-1 rounded-full mt-3">
                    <Lock size={10} /> Segera Hadir
                  </span>
                )}
              </>
            )

            return laporan.siap ? (
              <Link
                key={laporan.id}
                to={laporan.path}
                className="dash-fade-in opacity-0 card bg-white rounded-2xl border border-ink-900/[0.06] p-5 hover:border-sage-500/40 hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Isi />
              </Link>
            ) : (
              <div
                key={laporan.id}
                className="dash-fade-in opacity-0 card bg-white rounded-2xl border border-ink-900/[0.04] p-5 opacity-70 cursor-not-allowed"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Isi />
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
