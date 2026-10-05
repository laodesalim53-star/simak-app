import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Landmark, Search, Lock, Target, Wallet, CalendarCheck, BookOpen, ScrollText,
  ClipboardList, ArrowLeftRight, UserCheck, Mail, FileSignature, Award, Eye,
  Users, Package, ClipboardEdit, FileBarChart, School, FileText,
} from 'lucide-react'
import Layout from '../components/Layout'

// Palet warna per kartu — sama polanya dengan PusatLaporanGuru.jsx.
const PALET_WARNA = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100', hoverBorder: 'hover:border-blue-400', hoverShadow: 'hover:shadow-blue-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100', hoverBorder: 'hover:border-emerald-400', hoverShadow: 'hover:shadow-emerald-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100', hoverBorder: 'hover:border-purple-400', hoverShadow: 'hover:shadow-purple-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100', hoverBorder: 'hover:border-amber-400', hoverShadow: 'hover:shadow-amber-100' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-100', hoverBorder: 'hover:border-rose-400', hoverShadow: 'hover:shadow-rose-100' },
  cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-100', hoverBorder: 'hover:border-cyan-400', hoverShadow: 'hover:shadow-cyan-100' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100', hoverBorder: 'hover:border-indigo-400', hoverShadow: 'hover:shadow-indigo-100' },
  teal: { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-100', hoverBorder: 'hover:border-teal-400', hoverShadow: 'hover:shadow-teal-100' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100', hoverBorder: 'hover:border-orange-400', hoverShadow: 'hover:shadow-orange-100' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', border: 'border-slate-200', hoverBorder: 'hover:border-slate-400', hoverShadow: 'hover:shadow-slate-100' },
}

// Hub Administrasi Kepala Sekolah. Rute halaman: /administrasi-kepsek
// Tiap kartu membuka /administrasi-kepsek/<slug> (atau `path` jika diisi).
// Laman yang belum dibuat: biarkan `siap: true` -> tampil "Segera Hadir".
// Setelah halamannya jadi, ubah menjadi `siap: true`.
const KELOMPOK = [
  {
    nama: 'Perencanaan',
    deskripsi: 'Dokumen arah dan rencana sekolah',
    item: [
      { id: 'kosp', judul: 'KOSP', deskripsi: 'Kurikulum Operasional Satuan Pendidikan sekolah.', icon: BookOpen, warna: 'blue', siap: true },
      { id: 'rkt', judul: 'RKT', deskripsi: 'Rencana Kerja Tahunan: program, kegiatan, dan target sekolah.', icon: Target, warna: 'indigo', siap: true },
      { id: 'rkas', judul: 'RKAS', deskripsi: 'Rencana Kegiatan dan Anggaran Sekolah per tahun.', icon: Wallet, warna: 'emerald', siap: true },
      { id: 'kalender-pendidikan', judul: 'Kalender Pendidikan', deskripsi: 'Hari efektif belajar dan agenda kegiatan tahunan.', icon: CalendarCheck, warna: 'teal', siap: true },
    ],
  },
  {
    nama: 'Buku Induk dan Tata Usaha',
    deskripsi: 'Catatan resmi siswa, tamu, dan surat',
    item: [
      { id: 'buku-induk-siswa', judul: 'Buku Induk Siswa', deskripsi: 'Data lengkap siswa sejak masuk sampai lulus, diambil dari data Siswa.', icon: ScrollText, warna: 'purple', siap: true },
      { id: 'mutasi-siswa', judul: 'Mutasi Siswa', deskripsi: 'Catatan siswa masuk, pindah, dan keluar.', icon: ArrowLeftRight, warna: 'cyan', siap: true },
      { id: 'buku-tamu', judul: 'Buku Tamu', deskripsi: 'Catatan kunjungan tamu: nama, instansi, keperluan, dan tanggal.', icon: UserCheck, warna: 'orange', siap: true },
      { id: 'agenda-surat', judul: 'Agenda Surat', deskripsi: 'Buku surat masuk dan surat keluar.', icon: Mail, warna: 'slate', siap: true },
    ],
  },
  {
    nama: 'Supervisi dan Kinerja',
    deskripsi: 'Pembinaan guru dan tenaga kependidikan',
    item: [
      { id: 'buku-kerja', judul: 'Buku Kerja Kepala Sekolah', deskripsi: 'Catatan kerja harian dan pelaksanaan tugas pokok.', icon: FileSignature, warna: 'blue', siap: true },
      { id: 'evaluasi-kinerja-guru', judul: 'Evaluasi Kinerja Guru', deskripsi: 'Penilaian kinerja guru (PKG) dan tindak lanjutnya.', icon: Award, warna: 'amber', siap: true },
      { id: 'supervisi-akademik', judul: 'Supervisi Akademik', deskripsi: 'Jadwal dan hasil kunjungan kelas.', icon: Eye, warna: 'rose', siap: true },
      { id: 'kinerja-tendik', judul: 'Kinerja Tenaga Kependidikan', deskripsi: 'Penilaian kinerja tenaga kependidikan.', icon: Users, warna: 'teal', siap: true },
    ],
  },
  {
    nama: 'Sarana dan Pelaporan',
    deskripsi: 'Aset, rapat, dan laporan berkala',
    item: [
      { id: 'inventaris', judul: 'Buku Inventaris', deskripsi: 'Barang milik sekolah beserta jumlah dan kondisinya.', icon: Package, warna: 'orange', siap: true },
      { id: 'notulen-rapat', judul: 'Notulen Rapat', deskripsi: 'Catatan dan keputusan rapat dewan guru.', icon: ClipboardEdit, warna: 'indigo', siap: true },
      { id: 'evaluasi-diri', judul: 'Evaluasi Diri Sekolah', deskripsi: 'Rapor mutu dan rencana perbaikan.', icon: ClipboardList, warna: 'purple', siap: true },
      { id: 'laporan-bulanan', judul: 'Laporan Bulanan', deskripsi: 'Rekap kegiatan dan capaian sekolah tiap bulan.', icon: FileBarChart, warna: 'emerald', siap: true, path: '/laporan' },
    ],
  },
]

function BatikOverlay({ patternId, strokeColor = '#d4af37', opacity = 1, size = 72 }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id={patternId} x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
          <g fill="none" stroke={strokeColor} strokeWidth="1.1" opacity={opacity}>
            <ellipse cx={size / 2} cy={size * 0.333} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size / 2} cy={size * 0.667} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size * 0.333} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <ellipse cx={size * 0.667} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <circle cx={size / 2} cy={size / 2} r={size * 0.042} opacity="0.7" />
          </g>
          <circle cx={size * 0.11} cy={size * 0.11} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.89} cy={size * 0.22} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

function Kartu({ item, delay }) {
  const Icon = item.icon
  const warna = PALET_WARNA[item.warna] || PALET_WARNA.slate
  const to = item.path || `/administrasi-kepsek/${item.id}`

  const Isi = (
    <div className="flex items-start gap-3 sm:block">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 sm:mb-3 ${
          item.siap ? `${warna.bg} ${warna.icon}` : 'bg-slate-100 text-slate-300'
        }`}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <h3 className={`font-display text-sm sm:text-[15px] font-semibold mb-1 leading-snug break-words ${item.siap ? 'text-slate-900' : 'text-slate-300'}`}>
          {item.judul}
        </h3>
        <p className={`text-xs sm:text-[13px] leading-relaxed ${item.siap ? 'text-slate-600' : 'text-slate-300'}`}>
          {item.deskripsi}
        </p>
        {!item.siap && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full mt-2 sm:mt-3">
            <Lock size={10} /> Segera Hadir
          </span>
        )}
      </div>
    </div>
  )

  return item.siap ? (
    <Link
      to={to}
      className={`dash-fade-in opacity-0 block bg-white rounded-2xl border p-3.5 sm:p-5 active:scale-[0.99] hover:shadow-md sm:hover:-translate-y-1 transition-all duration-300 ease-out ${warna.border} ${warna.hoverBorder} ${warna.hoverShadow}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {Isi}
    </Link>
  ) : (
    <div
      className="dash-fade-in opacity-0 bg-white rounded-2xl border border-slate-100 p-3.5 sm:p-5 cursor-not-allowed"
      style={{ animationDelay: `${delay}ms` }}
    >
      {Isi}
    </div>
  )
}

export default function AdministrasiKepalaSekolah() {
  const [q, setQ] = useState('')

  const hasil = useMemo(() => {
    const kata = q.trim().toLowerCase()
    return KELOMPOK.map((g) => ({
      ...g,
      item: g.item.filter((i) => !kata || `${i.judul} ${i.deskripsi}`.toLowerCase().includes(kata)),
    })).filter((g) => g.item.length > 0)
  }, [q])

  let urutan = 0

  return (
    <Layout
      title="Administrasi Kepala Sekolah"
      subtitle="Buku induk, perencanaan, supervisi, dan pelaporan dalam satu tempat."
    >
      <style>{`
        @keyframes dashFadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .dash-fade-in { animation: dashFadeInUp 0.5s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) { .dash-fade-in { animation: none; opacity: 1; } }
      `}</style>

      <div className="relative">
        <div className="dash-fade-in opacity-0 relative overflow-hidden rounded-xl p-4 sm:p-6 mb-4 sm:mb-5 flex flex-wrap items-center gap-3 sm:gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <BatikOverlay patternId="batikBannerAdmKepsek" />
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <Landmark size={22} />
          </div>
          <div className="relative min-w-0">
            <p className="font-display font-semibold text-lg text-white">Administrasi Kepala Sekolah</p>
            <p className="text-xs sm:text-sm text-blue-200/80">Pilih dokumen yang ingin dibuka atau dikelola.</p>
          </div>
        </div>

        {/* Pencarian — penuh selebar layar di HP; font 16px agar iOS tidak zoom saat fokus */}
        <div className="relative mb-2 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari dokumen, mis. buku tamu"
            aria-label="Cari dokumen administrasi"
            className="w-full pl-9 pr-3 py-2.5 text-base sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
          />
        </div>

        {hasil.map((g) => (
          <section key={g.nama} className="mt-5 sm:mt-6">
            <h2 className="font-display text-sm sm:text-base font-semibold text-slate-800">{g.nama}</h2>
            <p className="text-xs sm:text-[13px] text-slate-500 mb-3">{g.deskripsi}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {g.item.map((item) => (
                <Kartu key={item.id} item={item} delay={urutan++ * 50} />
              ))}
            </div>
          </section>
        ))}

        {hasil.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            <FileText size={22} className="mx-auto mb-2 text-slate-300" />
            Tidak ada dokumen yang cocok dengan "{q}".
          </div>
        )}
      </div>
    </Layout>
  )
}
