import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  BookOpen,
  Wallet,
  Sparkles,
  Database,
  BadgeCheck,
  ClipboardCheck,
  UserCheck,
  Trophy,
  Users,
  ClipboardList,
  Banknote,
  Library,
  Lock,
  Search,
  X,
} from 'lucide-react'
import Layout from '../components/Layout'

// Palet warna per kartu — sama polanya dengan PusatLaporanGuru.jsx. Kalau mau
// ganti warna satu kartu, cukup ganti nilai `warna` di objek SK-nya.
// (Saran: kalau nanti mau dipakai di banyak halaman hub, pindahkan PALET_WARNA
// dan BatikOverlay ke satu berkas bersama, misalnya src/components/hub.jsx.)
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
  slate: {
    bg: 'bg-slate-100',
    icon: 'text-slate-600',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-400',
    hoverShadow: 'hover:shadow-slate-100',
  },
}

// Halaman "gudang" / hub untuk semua Surat Keputusan (SK) dan surat keterangan
// yang diterbitkan sekolah. Sidebar cukup punya 1 link ke halaman ini; setiap
// jenis SK baru cukup ditambahkan sebagai satu objek di `daftarSK`.
//
// Cara mengaktifkan SK baru: ubah `siap: false` menjadi `siap: true`, lalu
// pastikan `path` menunjuk ke route halaman SK-nya di App.jsx.
// Kartu dikelompokkan lewat `kategori` (lihat KATEGORI di bawah).
const KATEGORI = [
  { id: 'tugas', judul: 'Tugas Guru & Pegawai', keterangan: 'SK pembagian tugas dan surat keterangan pelaksanaan tugas.' },
  { id: 'honor', judul: 'Honorarium & Tenaga Pendukung', keterangan: 'SK honor dan penugasan tenaga non-guru.' },
  { id: 'kegiatan', judul: 'Asesmen & Kegiatan Sekolah', keterangan: 'SK pengawas, panitia, dan tim kegiatan.' },
]

const daftarSK = [
  // ---- Tugas Guru & Pegawai ----
  {
    id: 'beban-mengajar',
    kategori: 'tugas',
    judul: 'SK Beban Mengajar',
    deskripsi: 'Pembagian jam mengajar per guru: kelas, mata pelajaran, dan total jam tatap muka per minggu.',
    icon: BookOpen,
    path: '/gudang-sk/beban-mengajar',
    warna: 'blue',
    siap: true,
  },
  {
    id: 'keterangan-tugas',
    kategori: 'tugas',
    judul: 'Keterangan Melaksanakan Tugas',
    deskripsi: 'Surat keterangan bahwa guru/pegawai benar melaksanakan tugas, untuk kebutuhan tunjangan atau administrasi.',
    icon: BadgeCheck,
    path: '/gudang-sk/keterangan-melaksanakan-tugas',
    warna: 'sky',
    siap: true,
  },
  {
    id: 'wali-kelas',
    kategori: 'tugas',
    judul: 'SK Wali Kelas',
    deskripsi: 'Penetapan wali kelas untuk setiap rombongan belajar pada tahun ajaran berjalan.',
    icon: UserCheck,
    path: '/gudang-sk/wali-kelas',
    warna: 'amber',
    siap: true,
  },
  {
    id: 'pembina-ekstrakurikuler',
    kategori: 'tugas',
    judul: 'SK Pembina Ekstrakurikuler',
    deskripsi: 'Penunjukan guru pembina untuk tiap kegiatan ekstrakurikuler sekolah.',
    icon: Trophy,
    path: '/gudang-sk/pembina-ekstrakurikuler',
    warna: 'orange',
    siap: true,
  },
  {
    id: 'petugas-perpustakaan',
    kategori: 'tugas',
    judul: 'SK Petugas Perpustakaan',
    deskripsi: 'Penugasan pengelola perpustakaan sekolah beserta uraian tugasnya.',
    icon: Library,
    path: '/gudang-sk/petugas-perpustakaan',
    warna: 'violet',
    siap: true,
  },

  // ---- Honorarium & Tenaga Pendukung ----
  {
    id: 'honor-guru',
    kategori: 'honor',
    judul: 'SK Honor Guru',
    deskripsi: 'Penetapan honorarium guru honorer: besaran, sumber dana, dan masa berlaku.',
    icon: Wallet,
    path: '/gudang-sk/honor-guru',
    warna: 'emerald',
    siap: true,
  },
  {
    id: 'tenaga-kebersihan',
    kategori: 'honor',
    judul: 'SK Tenaga Kebersihan',
    deskripsi: 'Pengangkatan dan penetapan honor petugas kebersihan sekolah.',
    icon: Sparkles,
    path: '/gudang-sk/tenaga-kebersihan',
    warna: 'teal',
    siap: true,
  },
  {
    id: 'operator-dapodik',
    kategori: 'honor',
    judul: 'SK Operator Dapodik',
    deskripsi: 'Penunjukan operator sekolah untuk pengelolaan data pokok pendidikan (Dapodik).',
    icon: Database,
    path: '/gudang-sk/operator-dapodik',
    warna: 'indigo',
    siap: true,
  },

  // ---- Asesmen & Kegiatan Sekolah ----
  {
    id: 'mengawas-asesmen',
    kategori: 'kegiatan',
    judul: 'SK Pengawas Asesmen Sekolah',
    deskripsi: 'Daftar pengawas ruang asesmen sekolah lengkap dengan jadwal dan ruang pengawasan.',
    icon: ClipboardCheck,
    path: '/gudang-sk/pengawas-asesmen',
    warna: 'purple',
    siap: true,
  },
  {
    id: 'panitia-ujian',
    kategori: 'kegiatan',
    judul: 'SK Panitia Ujian',
    deskripsi: 'Susunan panitia ujian sekolah: ketua, sekretaris, dan seksi-seksi.',
    icon: ClipboardList,
    path: '/gudang-sk/panitia-ujian',
    warna: 'cyan',
    siap: true,
  },
  {
    id: 'panitia-ppdb',
    kategori: 'kegiatan',
    judul: 'SK Panitia PPDB',
    deskripsi: 'Susunan panitia penerimaan peserta didik baru beserta pembagian tugasnya.',
    icon: Users,
    path: '/gudang-sk/panitia-ppdb',
    warna: 'rose',
    siap: true,
  },
  {
    id: 'tim-bos',
    kategori: 'kegiatan',
    judul: 'SK Tim Manajemen BOS',
    deskripsi: 'Penetapan tim pengelola dana BOS: kepala sekolah, bendahara, dan anggota tim.',
    icon: Banknote,
    path: '/gudang-sk/tim-bos',
    warna: 'green',
    siap: true,
  },
]

// Motif batik banner — sama seperti di PusatLaporanGuru.jsx dan Dashboard.jsx
// supaya identitas visual konsisten di seluruh halaman.
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

// Isi satu kartu. Dibuat sebagai komponen di luar render supaya tidak dibuat
// ulang setiap kali state pencarian berubah.
function IsiKartu({ item, warna }) {
  const Icon = item.icon
  return (
    <>
      <div
        className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-3 shrink-0 ${
          item.siap ? `${warna.bg} ${warna.icon}` : 'bg-slate-100 text-slate-300'
        }`}
      >
        <Icon size={20} />
      </div>
      <h3
        className={`font-display text-sm sm:text-[15px] font-semibold mb-1 leading-snug ${
          item.siap ? 'text-slate-900' : 'text-slate-300'
        }`}
      >
        {item.judul}
      </h3>
      <p
        className={`text-xs sm:text-[13px] leading-relaxed ${
          item.siap ? 'text-slate-600' : 'text-slate-300'
        }`}
      >
        {item.deskripsi}
      </p>
      {!item.siap && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full mt-3">
          <Lock size={10} /> Segera Hadir
        </span>
      )}
    </>
  )
}

export default function GudangSK() {
  const [cari, setCari] = useState('')

  // Kelompokkan hasil pencarian per kategori; kategori yang kosong tidak
  // ditampilkan. `urutan` dipakai supaya jeda animasi berlanjut antar kelompok.
  const kelompok = useMemo(() => {
    const kata = cari.trim().toLowerCase()
    const cocok = daftarSK.filter(
      (sk) => !kata || `${sk.judul} ${sk.deskripsi}`.toLowerCase().includes(kata)
    )
    let urutan = 0
    return KATEGORI.map((k) => ({
      ...k,
      items: cocok
        .filter((sk) => sk.kategori === k.id)
        .map((sk) => ({ sk, urutan: urutan++ })),
    })).filter((k) => k.items.length > 0)
  }, [cari])

  const jumlahSiap = daftarSK.filter((sk) => sk.siap).length

  return (
    <Layout
      title="Gudang SK"
      subtitle="Kumpulan Surat Keputusan dan surat keterangan sekolah. Pilih jenis SK yang ingin dibuat atau dicetak."
    >
      <style>{`
        @keyframes dashFadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-fade-in {
          animation: dashFadeInUp 0.5s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .dash-fade-in { animation: none; opacity: 1 !important; }
        }
      `}</style>

      <div className="relative">
        {/* Banner atas — ikon & teks bisa turun ke bawah kalau layar sempit. */}
        <div className="dash-fade-in opacity-0 relative overflow-hidden rounded-xl p-4 sm:p-6 mb-5 sm:mb-6 flex flex-wrap items-center gap-3 sm:gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <BatikOverlay patternId="batikBannerGudangSK" strokeColor="#d4af37" />
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <Archive size={20} className="sm:hidden" />
            <Archive size={22} className="hidden sm:block" />
          </div>
          <div className="relative min-w-0">
            <p className="font-display font-semibold text-lg text-white">Gudang SK</p>
            <p className="text-xs sm:text-sm text-blue-200/80">
              {jumlahSiap} dari {daftarSK.length} jenis SK sudah siap dipakai.
            </p>
          </div>
        </div>

        {/* Kolom pencarian — berguna begitu jumlah SK makin banyak. */}
        <div className="relative mb-5 sm:mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari SK, misalnya: honor, dapodik, asesmen"
            aria-label="Cari jenis SK"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
          />
          {cari && (
            <button
              type="button"
              onClick={() => setCari('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {kelompok.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-700">Tidak ada SK yang cocok dengan "{cari}".</p>
            <p className="text-xs text-slate-500 mt-1">Coba kata kunci lain, atau hapus pencarian untuk melihat semua SK.</p>
          </div>
        )}

        {kelompok.map((k) => (
          <section key={k.id} className="mb-6 sm:mb-8">
            <div className="mb-3">
              <h2 className="font-display text-base font-semibold text-slate-900">{k.judul}</h2>
              <p className="text-xs sm:text-[13px] text-slate-500">{k.keterangan}</p>
            </div>

            {/* Grid kartu — 1 kolom di HP, 2 di tablet, 3 di layar besar. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {k.items.map(({ sk, urutan }) => {
                const warna = PALET_WARNA[sk.warna] || PALET_WARNA.slate
                const gayaAnimasi = { animationDelay: `${urutan * 60}ms` }

                return sk.siap ? (
                  <Link
                    key={sk.id}
                    to={sk.path}
                    className={`dash-fade-in opacity-0 card bg-white rounded-2xl border p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300 ease-out ${warna.border} ${warna.hoverBorder} ${warna.hoverShadow}`}
                    style={gayaAnimasi}
                  >
                    <IsiKartu item={sk} warna={warna} />
                  </Link>
                ) : (
                  <div
                    key={sk.id}
                    aria-disabled="true"
                    className="dash-fade-in opacity-0 card bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 cursor-not-allowed"
                    style={gayaAnimasi}
                  >
                    <IsiKartu item={sk} warna={warna} />
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </Layout>
  )
}
