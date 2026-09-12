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
  ScrollText,
  FileBarChart,
  FileStack,
} from 'lucide-react'
import Layout from '../components/Layout'

// Palet warna per kartu — tiap `warna` di bawah merujuk ke satu set kelas di
// sini. Supaya gampang dirawat: kalau mau ganti warna satu kartu, cukup ganti
// nilai `warna` di objek laporannya, tidak perlu utak-atik className manual.
const PALET_WARNA = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    border: 'border-blue-100',
    hoverBorder: 'hover:border-blue-400',
    hoverShadow: 'hover:shadow-blue-100',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    border: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-400',
    hoverShadow: 'hover:shadow-emerald-100',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    border: 'border-purple-100',
    hoverBorder: 'hover:border-purple-400',
    hoverShadow: 'hover:shadow-purple-100',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    border: 'border-amber-100',
    hoverBorder: 'hover:border-amber-400',
    hoverShadow: 'hover:shadow-amber-100',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'text-rose-600',
    border: 'border-rose-100',
    hoverBorder: 'hover:border-rose-400',
    hoverShadow: 'hover:shadow-rose-100',
  },
  cyan: {
    bg: 'bg-cyan-50',
    icon: 'text-cyan-600',
    border: 'border-cyan-100',
    hoverBorder: 'hover:border-cyan-400',
    hoverShadow: 'hover:shadow-cyan-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    border: 'border-indigo-100',
    hoverBorder: 'hover:border-indigo-400',
    hoverShadow: 'hover:shadow-indigo-100',
  },
  teal: {
    bg: 'bg-teal-50',
    icon: 'text-teal-600',
    border: 'border-teal-100',
    hoverBorder: 'hover:border-teal-400',
    hoverShadow: 'hover:shadow-teal-100',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    border: 'border-orange-100',
    hoverBorder: 'hover:border-orange-400',
    hoverShadow: 'hover:shadow-orange-100',
  },
  sky: {
    bg: 'bg-sky-50',
    icon: 'text-sky-600',
    border: 'border-sky-100',
    hoverBorder: 'hover:border-sky-400',
    hoverShadow: 'hover:shadow-sky-100',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    border: 'border-green-100',
    hoverBorder: 'hover:border-green-400',
    hoverShadow: 'hover:shadow-green-100',
  },
  violet: {
    bg: 'bg-violet-50',
    icon: 'text-violet-600',
    border: 'border-violet-100',
    hoverBorder: 'hover:border-violet-400',
    hoverShadow: 'hover:shadow-violet-100',
  },
  fuchsia: {
    bg: 'bg-fuchsia-50',
    icon: 'text-fuchsia-600',
    border: 'border-fuchsia-100',
    hoverBorder: 'hover:border-fuchsia-400',
    hoverShadow: 'hover:shadow-fuchsia-100',
  },
  slate: {
    bg: 'bg-slate-100',
    icon: 'text-slate-600',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-400',
    hoverShadow: 'hover:shadow-slate-100',
  },
}

// Halaman "bagan" / hub untuk semua laporan kepegawaian guru yang berasal
// dari format Laporan Bulanan sekolah (LAPORAN_BULANAN_JULI_2023.xlsx).
// Ditambahkan SATU kartu di sini setiap kali satu halaman cetak baru selesai
// dibuat — supaya Sidebar cukup punya 1 link ke halaman ini saja, tidak perlu
// nambah menu baru tiap kali ada laporan baru.
//
// Cara mengaktifkan laporan baru: ubah `siap: false` menjadi `siap: true` dan
// isi `path` dengan route halaman cetaknya. Set `warna` sesuai salah satu
// kunci di PALET_WARNA di atas.
const daftarLaporan = [
  {
    id: 'nominatif',
    judul: 'Daftar Nominatif Guru/Pegawai',
    deskripsi: 'Data kepegawaian lengkap: NIP, NUPTK, pangkat/golongan, status kepegawaian, SK, dan masa kerja.',
    icon: Users,
    path: '/laporan-nominatif-guru',
    warna: 'blue',
    siap: true,
  },
  {
    id: 'biodata',
    judul: 'Biodata Guru/Pegawai',
    deskripsi: 'Data diri ringkas: nama, tempat/tanggal lahir, agama, status pegawai, jabatan, dan alamat.',
    icon: FileText,
    path: '/laporan-biodata-guru',
    warna: 'slate',
    siap: true,
  },
  {
    id: 'pendidikan',
    judul: 'Data Pendidikan Guru/Pegawai',
    deskripsi: 'Riwayat pendidikan terakhir, lembaga, jurusan, tahun lulus, dan pelatihan yang pernah diikuti.',
    icon: GraduationCap,
    path: '/laporan-pendidikan-guru',
    warna: 'purple',
    siap: true,
  },
  {
    id: 'kepangkatan',
    judul: 'Data Kepangkatan Guru/Pegawai',
    deskripsi: 'Riwayat SK pengangkatan pertama, SK terakhir, SK penempatan, dan gaji pokok.',
    icon: Award,
    path: '/laporan-kepangkatan-guru',
    warna: 'amber',
    siap: true,
  },
  {
    id: 'tanggungan',
    judul: 'Data Tanggungan Keluarga',
    deskripsi: 'Status perkawinan, data pasangan, dan jumlah anak yang menjadi tanggungan.',
    icon: Heart,
    path: '/laporan-tanggungan-keluarga',
    warna: 'rose',
    siap: true,
  },
  {
    id: 'tenaga-pengajar',
    judul: 'Data Rincian Tenaga Pengajar',
    deskripsi: 'Beban mengajar per guru: kelas, mata pelajaran, jam mengajar, dan rekap kehadiran.',
    icon: BookOpen,
    path: '/laporan-tenaga-pengajar',
    warna: 'emerald',
    siap: true,
  },
  {
    id: 'keadaan-murid',
    judul: 'Data Keadaan Murid',
    deskripsi: 'Rekap jumlah murid per kelas dan ruang belajar yang tersedia.',
    icon: School,
    path: '/laporan-keadaan-murid',
    warna: 'cyan',
    siap: true,
  },
  {
    id: 'semester',
    judul: 'Laporan Semester',
    deskripsi: 'Jam pelajaran per mata pelajaran per kelas, keadaan gedung/ruang sekolah, dan keadaan buku KTSP & K-13.',
    icon: ClipboardList,
    path: '/laporan-semester',
    warna: 'indigo',
    siap: true,
  },
  {
    id: 'daftar-hadir-guru',
    judul: 'Daftar Hadir Guru/Pegawai',
    deskripsi: 'Format kertas absensi bulanan (grid tanggal 1–31) lengkap dengan rekap Sakit/Izin/Tanpa Keterangan dan tanda tangan kepala sekolah.',
    icon: CalendarCheck,
    path: '/laporan-daftar-hadir-guru',
    warna: 'teal',
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
    warna: 'orange',
    siap: true,
  },
  {
    id: 'cetak-8355',
    judul: 'Cetak 8355',
    deskripsi: 'Cetak 3 lampiran Daftar Calon Peserta Ujian (8355) untuk siswa Kelas 6, siap unduh sebagai PDF.',
    icon: Printer,
    path: '/cetak-8355',
    warna: 'amber',
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
    warna: 'green',
    siap: true,
  },
  {
    id: 'surat-keterangan',
    judul: 'Surat Keterangan',
    deskripsi: 'Buat dan kelola surat keterangan untuk siswa maupun guru, lengkap dengan nomor surat.',
    icon: FileSignature,
    path: '/surat-keterangan',
    warna: 'sky',
    siap: true,
  },
  {
    id: 'ijazah',
    judul: 'Ijazah',
    deskripsi: 'Pengisian nilai kelulusan 9 mapel per siswa dan cetak rekap data ijazah kelulusan.',
    icon: ScrollText,
    path: '/ijazah',
    warna: 'violet',
    siap: true,
  },
  // Laporan Bulanan — rekap presensi siswa/guru, surat masuk-keluar, dan
  // agenda kegiatan per bulan. Satu pintu, Sidebar tidak makin panjang.
  {
    id: 'laporan-bulanan',
    judul: 'Laporan Bulanan',
    deskripsi: 'Rekap bulanan: presensi siswa, presensi guru (termasuk format Daftar Hadir), surat masuk/keluar, dan agenda kegiatan.',
    icon: FileBarChart,
    path: '/laporan',
    warna: 'fuchsia',
    siap: true,
  },
  // Cetak Sampul Laporan — satu halaman dengan sidebar menu berisi semua
  // jenis sampul (Bulanan, Semester, 8355, LPJ BOS, BKU, Inventaris, dst).
  {
    id: 'cetak-sampul',
    judul: 'Cetak Sampul Laporan',
    deskripsi: 'Cetak halaman sampul untuk berbagai jenis laporan sekolah — kop otomatis dari Profil Sekolah, tinggal pilih jenisnya.',
    icon: FileStack,
    path: '/cetak-sampul',
    warna: 'indigo',
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
      title="Pusat Laporan Kepegawaian"
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
        {/* Banner atas — dibuat fleksibel: ikon & teks bisa turun ke bawah
            kalau layar sangat sempit, padding & ukuran teks menyesuaikan. */}
        <div className="dash-fade-in opacity-0 relative overflow-hidden rounded-xl p-4 sm:p-6 mb-5 sm:mb-6 flex flex-wrap items-center gap-3 sm:gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <BatikOverlay patternId="batikBannerLaporan" strokeColor="#d4af37" />
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <LayoutDashboard size={20} className="sm:hidden" />
            <LayoutDashboard size={22} className="hidden sm:block" />
          </div>
          <div className="relative min-w-0">
            <p className="font-display font-semibold text-lg text-white">Pusat Laporan Kepegawaian</p>
            <p className="text-xs sm:text-sm text-blue-200/80">Semua laporan siap cetak ada di bawah ini.</p>
          </div>
        </div>

        {/* Grid kartu — 1 kolom di HP, 2 kolom di tablet, 3 kolom di layar besar.
            Gap & padding diperkecil di layar sempit supaya lebih nyaman disentuh. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {daftarLaporan.map((laporan, i) => {
            const Icon = laporan.icon
            const warna = PALET_WARNA[laporan.warna] || PALET_WARNA.slate

            const Isi = () => (
              <>
                <div
                  className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-3 shrink-0 ${
                    laporan.siap ? `${warna.bg} ${warna.icon}` : 'bg-slate-100 text-slate-300'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <h3
                  className={`font-display text-sm sm:text-[15px] font-semibold mb-1 leading-snug ${
                    laporan.siap ? 'text-slate-900' : 'text-slate-300'
                  }`}
                >
                  {laporan.judul}
                </h3>
                <p
                  className={`text-xs sm:text-[13px] leading-relaxed ${
                    laporan.siap ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  {laporan.deskripsi}
                </p>
                {!laporan.siap && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full mt-3">
                    <Lock size={10} /> Segera Hadir
                  </span>
                )}
              </>
            )

            return laporan.siap ? (
              <Link
                key={laporan.id}
                to={laporan.path}
                className={`dash-fade-in opacity-0 card bg-white rounded-2xl border p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300 ease-out ${warna.border} ${warna.hoverBorder} ${warna.hoverShadow}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Isi />
              </Link>
            ) : (
              <div
                key={laporan.id}
                className="dash-fade-in opacity-0 card bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 opacity-70 cursor-not-allowed"
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
