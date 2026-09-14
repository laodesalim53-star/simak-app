import { Link } from 'react-router-dom'
import { Heart, Coins, Landmark, LayoutDashboard } from 'lucide-react'
import Layout from '../components/Layout'

// Palet warna per kartu — pola sama seperti PusatLaporanGuru.jsx, supaya
// mudah dirawat: mau ganti warna satu kartu, cukup ganti `warna` di objek
// daftarMateri, tidak perlu utak-atik className manual.
const PALET_WARNA = {
  rose: {
    bg: 'bg-rose-50',
    icon: 'text-rose-600',
    border: 'border-rose-100',
    hoverBorder: 'hover:border-rose-400',
    hoverShadow: 'hover:shadow-rose-100',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    border: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-400',
    hoverShadow: 'hover:shadow-emerald-100',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    border: 'border-amber-100',
    hoverBorder: 'hover:border-amber-400',
    hoverShadow: 'hover:shadow-amber-100',
  },
}
 sky: {
    bg: 'bg-sky-50',
    icon: 'text-sky-600',
    border: 'border-sky-100',
    hoverBorder: 'hover:border-sky-400',
    hoverShadow: 'hover:shadow-sky-100',
  },
}

// Halaman "bagan" / hub untuk semua materi majelis yang siap dicetak
// lengkap dengan daftar hadir. Tambahkan SATU kartu di sini setiap kali
// materi baru selesai dibuat, supaya Sidebar cukup punya 1 link ke
// halaman ini saja.
const daftarMateri = [
  {
    id: 'keluarga-sakinah',
    judul: 'Keluarga Sakinah',
    deskripsi: 'Materi tentang konsep sakinah, mawaddah, rahmah, dan pilar-pilar keluarga sakinah.',
    icon: Heart,
    path: '/materi-keluarga-sakinah',
    warna: 'rose',
  },
  {
    id: 'pengelolaan-zakat',
    judul: 'Pengelolaan Zakat',
    deskripsi: 'Jenis zakat, syarat wajib, nisab, mustahik, dan mekanisme pengelolaan zakat melalui amil.',
    icon: Coins,
    path: '/materi-pengelolaan-zakat',
    warna: 'emerald',
  },
  {
    id: 'wakaf',
    judul: 'Wakaf',
    deskripsi: 'Rukun dan syarat wakaf, jenis-jenis wakaf, prosedur, dan pengelolaan wakaf produktif.',
    icon: Landmark,
    path: '/materi-wakaf',
    warna: 'amber',
  },
]

// Sama seperti BatikOverlay di PusatLaporanGuru.jsx — dipakai di banner
// atas supaya identitas visual (motif batik + gradasi) konsisten dengan
// hub lain di aplikasi.
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

export default function PusatMateriMajelis() {
  return (
    <Layout
      title="Pusat Materi Majelis"
      subtitle="Pilih materi yang ingin dicetak. Setiap halaman sudah dilengkapi daftar hadir peserta."
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
          <BatikOverlay patternId="batikBannerMateri" strokeColor="#d4af37" />
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <LayoutDashboard size={20} className="sm:hidden" />
            <LayoutDashboard size={22} className="hidden sm:block" />
          </div>
          <div className="relative min-w-0">
            <p className="font-display font-semibold text-lg text-white">Pusat Materi Majelis</p>
            <p className="text-xs sm:text-sm text-blue-200/80">
              Semua materi siap cetak lengkap dengan daftar hadir ada di bawah ini.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {daftarMateri.map((materi, i) => {
            const Icon = materi.icon
            const warna = PALET_WARNA[materi.warna] || PALET_WARNA.rose

            return (
              <Link
                key={materi.id}
                to={materi.path}
                className={`dash-fade-in opacity-0 card bg-white rounded-2xl border p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300 ease-out ${warna.border} ${warna.hoverBorder} ${warna.hoverShadow}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-3 shrink-0 ${warna.bg} ${warna.icon}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-display text-sm sm:text-[15px] font-semibold mb-1 leading-snug text-slate-900">
                  {materi.judul}
                </h3>
                <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600">
                  {materi.deskripsi}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
