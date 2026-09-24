// src/pages/PortalUjian.jsx
//
// Hub kecil khusus kelengkapan ujian. Sama polanya dengan GudangSK.jsx,
// tapi tanpa kategori/pencarian karena isinya sedikit. Tambah item baru
// cukup dengan menambah objek di `daftarDokumen`.

import { Link } from 'react-router-dom'
import { IdCard, FileText, ClipboardList, ShieldCheck, GraduationCap, ArrowLeftRight, CalendarDays } from 'lucide-react'
import Layout from '../components/Layout'
import { PALET_WARNA, BatikOverlay, IsiKartuHub } from '../components/hub'

const daftarDokumen = [
  {
    id: 'kartu-peserta',
    judul: 'Kartu Peserta Ujian',
    deskripsi: 'Cetak kartu peserta untuk setiap siswa: identitas, ruang ujian, dan QR verifikasi.',
    icon: IdCard,
    path: '/gudang-sk/portal-ujian/kartu-peserta',
    warna: 'teal',
    siap: true,
  },
  {
    id: 'berita-acara',
    judul: 'Berita Acara Ujian',
    deskripsi: 'Berita acara pelaksanaan ujian per ruang, lengkap dengan catatan kejadian dan tanda tangan pengawas.',
    icon: FileText,
    path: '/gudang-sk/portal-ujian/berita-acara',
    warna: 'blue',
    siap: true,
  },
  {
    id: 'daftar-hadir-siswa',
    judul: 'Daftar Hadir Siswa',
    deskripsi: 'Daftar hadir peserta ujian per ruang, dengan kolom tanda tangan dan rekap kehadiran.',
    icon: ClipboardList,
    path: '/gudang-sk/portal-ujian/daftar-hadir-siswa',
    warna: 'amber',
    siap: true,
  },
  {
    id: 'daftar-hadir-pengawas',
    judul: 'Daftar Hadir Pengawas',
    deskripsi: 'Daftar hadir pengawas ruang ujian, lengkap dengan jadwal jaga dan tanda tangan.',
    icon: ShieldCheck,
    path: '/gudang-sk/portal-ujian/daftar-hadir-pengawas',
    warna: 'purple',
    siap: true,
  },
  {
    id: 'jadwal-pengawas-ruang',
    judul: 'Jadwal Pengawas Ruang',
    deskripsi: 'Jadwal pengawas ruang per hari dan sesi, dengan kode pengawas dan tanda tangan Kepala Sekolah.',
    icon: CalendarDays,
    path: '/gudang-sk/portal-ujian/jadwal-pengawas-ruang',
    warna: 'blue',
    siap: true,
  },
  {
    id: 'serah-terima-as',
    judul: 'Berita Acara Serah Terima AS',
    deskripsi: 'Berita acara serah terima hasil pekerjaan asesmen antar-guru, lengkap dengan saksi dan tanda tangan.',
    icon: ArrowLeftRight,
    path: '/gudang-sk/portal-ujian/berita-acara-serah-terima-as',
    warna: 'teal',
    siap: true,
  },
]

export default function PortalUjian() {
  return (
    <Layout
      title="Portal Ujian"
      subtitle="Semua kelengkapan ujian dalam satu tempat: kartu peserta, berita acara, daftar hadir, dan jadwal pengawas."
    >
      <style>{`
        @keyframes dashFadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-fade-in { animation: dashFadeInUp 0.5s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .dash-fade-in { animation: none; opacity: 1 !important; }
        }
      `}</style>

      <div className="relative">
        <div className="dash-fade-in opacity-0 relative overflow-hidden rounded-xl p-4 sm:p-6 mb-5 sm:mb-6 flex flex-wrap items-center gap-3 sm:gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <BatikOverlay patternId="batikBannerPortalUjian" strokeColor="#d4af37" />
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <GraduationCap size={20} className="sm:hidden" />
            <GraduationCap size={22} className="hidden sm:block" />
          </div>
          <div className="relative min-w-0">
            <p className="font-display font-semibold text-lg text-white">Portal Ujian</p>
            <p className="text-xs sm:text-sm text-blue-200/80">
              {daftarDokumen.filter((d) => d.siap).length} dari {daftarDokumen.length} dokumen siap dipakai.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {daftarDokumen.map((item, i) => {
            const warna = PALET_WARNA[item.warna] || PALET_WARNA.slate
            const gayaAnimasi = { animationDelay: `${i * 60}ms` }

            return item.siap ? (
              <Link
                key={item.id}
                to={item.path}
                className={`dash-fade-in opacity-0 card bg-white rounded-2xl border p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300 ease-out ${warna.border} ${warna.hoverBorder} ${warna.hoverShadow}`}
                style={gayaAnimasi}
              >
                <IsiKartuHub item={item} warna={warna} />
              </Link>
            ) : (
              <div
                key={item.id}
                aria-disabled="true"
                className="dash-fade-in opacity-0 card bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 cursor-not-allowed"
                style={gayaAnimasi}
              >
                <IsiKartuHub item={item} warna={warna} />
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
