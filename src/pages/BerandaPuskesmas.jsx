import { Link } from 'react-router-dom'
import { APP } from '../lib/appConfig'
import InstallButton from '../components/InstallButton'

// Beranda publik SIMPUS. Hanya memuat fitur yang rutenya sudah ada di
   const BerandaPuskesmas = lazy(() => import('../pages/BerandaPuskesmas'))

const FITUR = [
  { judul: 'STR & SIP pegawai', isi: 'Simpan masa berlaku izin tiap tenaga kesehatan dan pantau yang segera habis.', ikon: 'M9 12l2 2 4-4M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z' },
  { judul: 'Jadwal piket', isi: 'Admin menyusun piket; pegawai melihat jadwalnya sendiri dari ponsel.', ikon: 'M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z' },
  { judul: 'Cuti & izin', isi: 'Pegawai mengajukan, admin mencatat dan merekap dalam satu tempat.', ikon: 'M9 5h6M9 3h6a1 1 0 011 1v2H8V4a1 1 0 011-1zM6 6h12v15H6V6zm3 6h6m-6 4h4' },
  { judul: 'Presensi & daftar hadir', isi: 'Presensi harian dan daftar hadir pegawai yang siap dicetak.', ikon: 'M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { judul: 'Keuangan BOK', isi: 'Catat penggunaan dana BOK dan susun laporannya.', ikon: 'M12 6v12m-3-2.5c.6.9 1.7 1.5 3 1.5 1.7 0 3-.9 3-2.2 0-3-6-1.8-6-4.6C9 9.9 10.3 9 12 9c1.2 0 2.3.5 3 1.4M4 5h16v14H4z' },
  { judul: 'Data bidan', isi: 'Halaman khusus bidan puskesmas untuk pencatatan kerja harian.', ikon: 'M12 21s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.6-7 10-7 10z' },
]

const LANGKAH = [
  { judul: 'Daftar dan pilih puskesmas Anda', isi: 'Akun dibuat sekali, data puskesmas terpisah dari puskesmas lain.' },
  { judul: 'Admin mengisi data pegawai', isi: 'STR/SIP, jadwal piket, dan profil puskesmas diatur oleh admin.' },
  { judul: 'Pegawai memakai dari ponsel', isi: 'Lihat piket, ajukan cuti, dan presensi tanpa menunggu rekap manual.' },
]
   <Route path="/" element={<BerandaPuskesmas />} />
// Contoh tampilan pantauan STR/SIP (data contoh, bukan data asli).
const CONTOH = [
  { nama: 'dr. Andi Pratama', sisa: '14 hari', warna: '#b45309', latar: '#fef3c7' },
  { nama: 'Ns. Siti Rahma', sisa: '3 bulan', warna: '#047857', latar: '#d1fae5' },
  { nama: 'Bdn. Maria Lestari', sisa: '8 bulan', warna: '#047857', latar: '#d1fae5' },
  { nama: 'apt. Yusuf Kaimudin', sisa: 'Sudah habis', warna: '#b91c1c', latar: '#fee2e2' },
]

function Ikon({ d, className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export default function BerandaPuskesmas() {
  const warna = APP.warna

  return (
    <div className="min-h-screen bg-paper text-gray-900">
      <header className="px-5 sm:px-8 py-3.5 flex items-center justify-between" style={{ backgroundColor: warna }}>
        <span className="flex items-center gap-2.5 text-white text-xl font-bold">
          <span className="w-8 h-8 rounded-lg bg-white/15 grid place-items-center text-base">P</span>
          {APP.nama}
        </span>
        <nav className="flex items-center gap-4">
          <Link to="/login" className="text-white/90 hover:text-white text-sm">Masuk</Link>
          <Link to="/register" className="bg-white text-sm font-semibold px-3.5 py-1.5 rounded-lg" style={{ color: warna }}>
            Daftar
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-14 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight" style={{ color: warna }}>
            Administrasi pegawai puskesmas, tanpa rekap manual
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-xl">
            Pantau STR/SIP, atur jadwal piket, kelola cuti dan izin, presensi, sampai
            keuangan BOK dalam satu aplikasi.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="text-white font-semibold px-6 py-3 rounded-xl shadow" style={{ backgroundColor: warna }}>
              Daftar sekarang
            </Link>
            <Link to="/login" className="font-semibold px-6 py-3 rounded-xl border-2 bg-white" style={{ color: warna, borderColor: warna }}>
              Sudah punya akun? Masuk
            </Link>
            <InstallButton
              label="Instal Aplikasi"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl bg-white border"
            />
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Di iPhone: buka lewat Safari, ketuk Bagikan, lalu Tambah ke Layar Utama.
          </p>
        </div>

        {/* Contoh tampilan pantauan STR/SIP */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" aria-label="Contoh tampilan pantauan STR dan SIP">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <span className="font-bold" style={{ color: warna }}>Pantauan STR/SIP</span>
            <span className="text-xs text-gray-500">Contoh tampilan</span>
          </div>
          <ul className="divide-y">
            {CONTOH.map((c) => (
              <li key={c.nama} className="px-5 py-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{c.nama}</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ color: c.warna, backgroundColor: c.latar }}>
                  {c.sisa}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Fitur */}
      <section className="bg-white border-y">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: warna }}>
            Yang bisa Anda kerjakan
          </h2>
          <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {FITUR.map((f) => (
              <div key={f.judul} className="flex gap-4">
                <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center" style={{ color: warna, backgroundColor: `${warna}1a` }}>
                  <Ikon d={f.ikon} />
                </span>
                <div>
                  <h3 className="font-bold">{f.judul}</h3>
                  <p className="text-sm text-gray-600 mt-1">{f.isi}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cara mulai */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: warna }}>
          Mulai dalam tiga langkah
        </h2>
        <ol className="space-y-6">
          {LANGKAH.map((l, i) => (
            <li key={l.judul} className="flex gap-4">
              <span className="shrink-0 w-9 h-9 rounded-full text-white font-bold grid place-items-center" style={{ backgroundColor: warna }}>
                {i + 1}
              </span>
              <div>
                <h3 className="font-bold">{l.judul}</h3>
                <p className="text-gray-600 mt-0.5">{l.isi}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <Link to="/register" className="inline-block text-white font-semibold px-6 py-3 rounded-xl shadow" style={{ backgroundColor: warna }}>
            Daftar sekarang
          </Link>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <span>{APP.nama} · {APP.tagline}</span>
          <span className="flex gap-5">
            <Link to="/kebijakan-privasi" className="underline underline-offset-2">Kebijakan Privasi</Link>
            <Link to="/syarat-layanan" className="underline underline-offset-2">Syarat Layanan</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}