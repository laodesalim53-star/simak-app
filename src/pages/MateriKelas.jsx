import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap,
  ArrowLeft,
  BookOpen,
  Calculator,
  Languages,
  Heart,
  Landmark,
  Sprout,
  FlaskConical,
  Globe,
  Dumbbell,
  Palette,
  MapPin,
  Monitor,
  Scissors,
  ChevronDown,
  FileText,
  ExternalLink,
  Search,
  X,
} from 'lucide-react'
import Layout from '../components/Layout'

// =====================================================================
// 1) DATA MATERI — bagian yang paling sering Anda ubah
// =====================================================================
// Kunci: `${jenjang}-${kelas}-${idMapel}`, contoh: 'SD-1-matematika'.
// Isi tiap kunci berupa daftar materi. `link` boleh dikosongkan; kalau diisi
// (Google Drive, YouTube, dll.), materi tampil sebagai tautan yang bisa dibuka.
//
// Contoh:
//   'SD-1-matematika': [
//     { judul: 'Bilangan 1 sampai 10', link: 'https://drive.google.com/...' },
//     { judul: 'Penjumlahan dan pengurangan sederhana' },
//   ],
const MATERI = {
  // Tambahkan materi di sini.
}

// =====================================================================
// 2) JENJANG & KELAS
// =====================================================================
const JENJANG = {
  SD: { label: 'SD', nama: 'Sekolah Dasar', kelas: [1, 2, 3, 4, 5, 6] },
  SMP: { label: 'SMP', nama: 'Sekolah Menengah Pertama', kelas: [1, 2, 3] },
}

// =====================================================================
// 3) MATA PELAJARAN
// =====================================================================
const MAPEL = {
  agama: { judul: 'Pendidikan Agama dan Budi Pekerti', icon: Heart, warna: 'emerald' },
  pancasila: { judul: 'Pendidikan Pancasila', icon: Landmark, warna: 'rose' },
  indonesia: { judul: 'Bahasa Indonesia', icon: BookOpen, warna: 'blue' },
  matematika: { judul: 'Matematika', icon: Calculator, warna: 'indigo' },
  ipas: { judul: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', icon: Sprout, warna: 'green' },
  ipa: { judul: 'IPA', icon: FlaskConical, warna: 'teal' },
  ips: { judul: 'IPS', icon: Globe, warna: 'amber' },
  inggris: { judul: 'Bahasa Inggris', icon: Languages, warna: 'sky' },
  pjok: { judul: 'PJOK', icon: Dumbbell, warna: 'orange' },
  seni: { judul: 'Seni dan Budaya', icon: Palette, warna: 'purple' },
  mulok: { judul: 'Muatan Lokal', icon: MapPin, warna: 'violet' },
  informatika: { judul: 'Informatika', icon: Monitor, warna: 'cyan' },
  prakarya: { judul: 'Prakarya', icon: Scissors, warna: 'slate' },
}

// Daftar mapel per jenjang dan kelas. Untuk menambah/mengurangi mapel,
// cukup ubah larik di bawah ini.
const MAPEL_SD_BAWAH = ['agama', 'pancasila', 'indonesia', 'matematika', 'pjok', 'seni', 'mulok']
const MAPEL_SD_ATAS = ['agama', 'pancasila', 'indonesia', 'matematika', 'ipas', 'inggris', 'pjok', 'seni', 'mulok']
const MAPEL_SMP = ['agama', 'pancasila', 'indonesia', 'matematika', 'ipa', 'ips', 'inggris', 'informatika', 'pjok', 'seni', 'prakarya']

const MAPEL_KELAS = {
  SD: { 1: MAPEL_SD_BAWAH, 2: MAPEL_SD_BAWAH, 3: MAPEL_SD_ATAS, 4: MAPEL_SD_ATAS, 5: MAPEL_SD_ATAS, 6: MAPEL_SD_ATAS },
  SMP: { 1: MAPEL_SMP, 2: MAPEL_SMP, 3: MAPEL_SMP },
}

// Palet warna kartu — pola sama dengan GudangSK.jsx.
const PALET_WARNA = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100', hoverBorder: 'hover:border-blue-400' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100', hoverBorder: 'hover:border-emerald-400' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100', hoverBorder: 'hover:border-purple-400' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100', hoverBorder: 'hover:border-amber-400' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-100', hoverBorder: 'hover:border-rose-400' },
  cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-100', hoverBorder: 'hover:border-cyan-400' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100', hoverBorder: 'hover:border-indigo-400' },
  teal: { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-100', hoverBorder: 'hover:border-teal-400' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100', hoverBorder: 'hover:border-orange-400' },
  sky: { bg: 'bg-sky-50', icon: 'text-sky-600', border: 'border-sky-100', hoverBorder: 'hover:border-sky-400' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-100', hoverBorder: 'hover:border-green-400' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100', hoverBorder: 'hover:border-violet-400' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', border: 'border-slate-200', hoverBorder: 'hover:border-slate-400' },
}

const kunciMateri = (jenjang, kelas, idMapel) => `${jenjang}-${kelas}-${idMapel}`

export default function MateriKelas() {
  const [jenjang, setJenjang] = useState('SD')
  const [kelas, setKelas] = useState(1)
  const [cari, setCari] = useState('')
  const [terbuka, setTerbuka] = useState(null)

  const pilihJenjang = (j) => {
    setJenjang(j)
    setKelas(1)
    setTerbuka(null)
  }

  const pilihKelas = (k) => {
    setKelas(k)
    setTerbuka(null)
  }

  // Semua mapel untuk jenjang + kelas terpilih, lengkap dengan materinya.
  const semuaMapel = useMemo(() => {
    const ids = MAPEL_KELAS[jenjang]?.[kelas] || []
    return ids.map((id) => ({
      id,
      ...MAPEL[id],
      materi: MATERI[kunciMateri(jenjang, kelas, id)] || [],
    }))
  }, [jenjang, kelas])

  // Pencarian cocok ke nama mapel maupun judul materi.
  const daftarMapel = useMemo(() => {
    const kata = cari.trim().toLowerCase()
    if (!kata) return semuaMapel
    return semuaMapel.filter(
      (m) =>
        m.judul.toLowerCase().includes(kata) ||
        m.materi.some((x) => x.judul.toLowerCase().includes(kata))
    )
  }, [semuaMapel, cari])

  const totalMateri = semuaMapel.reduce((jumlah, m) => jumlah + m.materi.length, 0)

  return (
    <Layout
      title="Materi Pembelajaran"
      subtitle="Pilih jenjang dan kelas, lalu buka mata pelajaran untuk melihat materinya."
    >
      <div className="relative">
        <Link
          to="/gudang-sk"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft size={14} /> Kembali ke Gudang SK
        </Link>

        {/* Banner */}
        <div className="relative overflow-hidden rounded-xl p-4 sm:p-6 mb-5 sm:mb-6 flex flex-wrap items-center gap-3 sm:gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <GraduationCap size={22} />
          </div>
          <div className="relative min-w-0">
            <p className="font-display font-semibold text-lg text-white">
              {JENJANG[jenjang].nama} · Kelas {kelas}
            </p>
            <p className="text-xs sm:text-sm text-blue-200/80">
              {semuaMapel.length} mata pelajaran, {totalMateri} materi tersedia.
            </p>
          </div>
        </div>

        {/* Pilihan jenjang */}
        <div
          role="group"
          aria-label="Pilih jenjang"
          className="inline-flex rounded-xl bg-slate-100 p-1 mb-3"
        >
          {Object.entries(JENJANG).map(([kode, j]) => (
            <button
              key={kode}
              type="button"
              onClick={() => pilihJenjang(kode)}
              aria-pressed={jenjang === kode}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                jenjang === kode ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {j.label}
            </button>
          ))}
        </div>

        {/* Pilihan kelas */}
        <div role="group" aria-label="Pilih kelas" className="flex flex-wrap gap-2 mb-5">
          {JENJANG[jenjang].kelas.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => pilihKelas(k)}
              aria-pressed={kelas === k}
              className={`min-w-[5.5rem] px-4 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                kelas === k
                  ? 'bg-blue-900 border-blue-900 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              Kelas {k}
            </button>
          ))}
        </div>

        {/* Pencarian */}
        <div className="relative mb-5 sm:mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari mata pelajaran atau materi"
            aria-label="Cari mata pelajaran atau materi"
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

        {daftarMapel.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-700">Tidak ada yang cocok dengan "{cari}".</p>
            <p className="text-xs text-slate-500 mt-1">
              Coba kata kunci lain, atau hapus pencarian untuk melihat semua mata pelajaran kelas {kelas}.
            </p>
          </div>
        )}

        {/* Daftar mata pelajaran */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
          {daftarMapel.map((m) => {
            const warna = PALET_WARNA[m.warna] || PALET_WARNA.slate
            const Icon = m.icon
            const buka = terbuka === m.id || (cari.trim() !== '' && daftarMapel.length <= 3)
            const idPanel = `panel-${jenjang}-${kelas}-${m.id}`

            return (
              <div
                key={m.id}
                className={`bg-white rounded-2xl border transition-colors ${warna.border} ${warna.hoverBorder}`}
              >
                <button
                  type="button"
                  onClick={() => setTerbuka(terbuka === m.id ? null : m.id)}
                  aria-expanded={buka}
                  aria-controls={idPanel}
                  className="w-full flex items-center gap-3 p-4 text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <span
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${warna.bg} ${warna.icon}`}
                  >
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm sm:text-[15px] font-semibold text-slate-900 leading-snug">
                      {m.judul}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {m.materi.length > 0 ? `${m.materi.length} materi` : 'Belum ada materi'}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${buka ? 'rotate-180' : ''}`}
                  />
                </button>

                {buka && (
                  <div id={idPanel} className="px-4 pb-4">
                    {m.materi.length === 0 ? (
                      <p className="text-xs sm:text-[13px] text-slate-500 border-t border-slate-100 pt-3">
                        Materi {m.judul} kelas {kelas} belum ditambahkan. Tambahkan di{' '}
                        <code className="bg-slate-100 px-1 rounded">MATERI['{kunciMateri(jenjang, kelas, m.id)}']</code>.
                      </p>
                    ) : (
                      <ul className="border-t border-slate-100 pt-2 divide-y divide-slate-100">
                        {m.materi.map((x, i) => (
                          <li key={`${x.judul}-${i}`}>
                            {x.link ? (
                              <a
                                href={x.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 py-2.5 text-sm text-slate-700 hover:text-blue-700 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                              >
                                <FileText size={15} className="shrink-0 text-slate-400" />
                                <span className="flex-1">{x.judul}</span>
                                <ExternalLink size={13} className="shrink-0 text-slate-400" />
                              </a>
                            ) : (
                              <div className="flex items-center gap-2.5 py-2.5 text-sm text-slate-700">
                                <FileText size={15} className="shrink-0 text-slate-400" />
                                <span className="flex-1">{x.judul}</span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
