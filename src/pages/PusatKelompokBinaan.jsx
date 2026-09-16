import { Link } from 'react-router-dom'
import { Users, Building2, HeartPulse, UsersRound, LayoutDashboard } from 'lucide-react'
import Layout from '../components/Layout'

// Palet warna kartu — pola sama seperti PusatMateriMajelis.jsx.
const PALET_WARNA = {
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    border: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-400',
    hoverShadow: 'hover:shadow-emerald-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    border: 'border-indigo-100',
    hoverBorder: 'hover:border-indigo-400',
    hoverShadow: 'hover:shadow-indigo-100',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'text-rose-600',
    border: 'border-rose-100',
    hoverBorder: 'hover:border-rose-400',
    hoverShadow: 'hover:shadow-rose-100',
  },
  sky: {
    bg: 'bg-sky-50',
    icon: 'text-sky-600',
    border: 'border-sky-100',
    hoverBorder: 'hover:border-sky-400',
    hoverShadow: 'hover:shadow-sky-100',
  },
}

// Daftar kelompok binaan. `slug` HARUS sama persis dengan nilai kolom
// `kelompok` di tabel kelompok_binaan_anggota, dan dengan opsi dropdown
// di DaftarHadirCetak.jsx, supaya data bisa "ditarik" otomatis.
export const daftarKelompokBinaan = [
  {
    slug: 'majelis-taklim',
    judul: 'Majelis Taklim',
    deskripsi: 'Data anggota majelis taklim binaan, siap ditarik otomatis ke daftar hadir cetak.',
    icon: Users,
    warna: 'emerald',
  },
  {
    slug: 'lapas',
    judul: 'Lapas',
    deskripsi: 'Data warga binaan Lembaga Pemasyarakatan untuk kegiatan bimbingan keagamaan.',
    icon: Building2,
    warna: 'indigo',
  },
  {
    slug: 'rsu',
    judul: 'RSU',
    deskripsi: 'Data peserta bimbingan rohani di Rumah Sakit Umum.',
    icon: HeartPulse,
    warna: 'rose',
  },
  {
    slug: 'masyarakat',
    judul: 'Masyarakat',
    deskripsi: 'Data peserta umum dari kegiatan penyuluhan di tengah masyarakat.',
    icon: UsersRound,
    warna: 'sky',
  },
]

export default function PusatKelompokBinaan() {
  return (
    <Layout
      title="Pusat Kelompok Binaan"
      subtitle="Kelola daftar anggota tiap kelompok. Nama akan tersedia otomatis saat mencetak daftar hadir."
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
        <div className="dash-fade-in opacity-0 relative overflow-hidden rounded-xl p-4 sm:p-6 mb-5 sm:mb-6 flex flex-wrap items-center gap-3 sm:gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <LayoutDashboard size={20} className="sm:hidden" />
            <LayoutDashboard size={22} className="hidden sm:block" />
          </div>
          <div className="relative min-w-0">
            <p className="font-display font-semibold text-lg text-white">Pusat Kelompok Binaan</p>
            <p className="text-xs sm:text-sm text-blue-200/80">
              Tambah dan kelola nama anggota di sini, lalu pilih kelompoknya saat mencetak daftar hadir.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {daftarKelompokBinaan.map((kelompok, i) => {
            const Icon = kelompok.icon
            const warna = PALET_WARNA[kelompok.warna] || PALET_WARNA.emerald

            return (
              <Link
                key={kelompok.slug}
                to={`/kelompok-binaan/${kelompok.slug}`}
                className={`dash-fade-in opacity-0 card bg-white rounded-2xl border p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300 ease-out ${warna.border} ${warna.hoverBorder} ${warna.hoverShadow}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-3 shrink-0 ${warna.bg} ${warna.icon}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-display text-sm sm:text-[15px] font-semibold mb-1 leading-snug text-slate-900">
                  {kelompok.judul}
                </h3>
                <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600">
                  {kelompok.deskripsi}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
