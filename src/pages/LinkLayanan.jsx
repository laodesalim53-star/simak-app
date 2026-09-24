import { useState } from 'react'
import Layout from '../components/Layout'
import {
  ArrowLeft,
  ExternalLink,
  Landmark,
  Database,
  Instagram,
  RefreshCw,
} from 'lucide-react'

// Halaman ini level ATAS (route: /link-layanan) — bisa diakses semua peran
// (admin, guru, orang tua) lewat menu sidebar, BUKAN bagian dari Gudang SK
// yang admin-only.
//
// Kumpulan link layanan eksternal terkait kepegawaian & Dapodik.
// Untuk menambah/mengubah link, cukup edit array KELOMPOK_LINK di bawah ini —
// tidak perlu menyentuh bagian tampilan.
const KELOMPOK_LINK = [
  {
    id: 'kepegawaian',
    judul: 'Kepegawaian',
    tautan: [
      {
        id: 'kgb-pangkat-mutasi',
        nama: 'Kenaikan Gaji Berkala, Kenaikan Pangkat & Mutasi Pegawai',
        url: 'https://script.google.com/macros/s/AKfycbxEEYo4ubCNGILbqK3Ml9zSq2428-w7qaKCJ0ekDUXst9sNF5WxgMwEP5KPkjiKETZI/exec',
      },
      {
        id: 'info-gtk',
        nama: 'Info GTK',
        url: 'https://info.gtk.kemendikdasmen.go.id/',
      },
    ],
  },
  {
    id: 'dapodik',
    judul: 'Dapodik',
    tautan: [
      { id: 'portal-dapodik', nama: 'Portal Dapodik', url: 'https://dapo.kemendikdasmen.go.id' },
      { id: 'manajemen-sekolah', nama: 'Manajemen Sekolah', url: 'https://sp.datadik.kemendikdasmen.go.id' },
      { id: 'individual-gtk', nama: 'Individual GTK', url: 'https://ptk.datadik.kemendikdasmen.go.id' },
      { id: 'bos-online', nama: 'BOS Online', url: 'http://bos.kemendikdasmen.go.id' },
      { id: 'verval-sp', nama: 'Verval SP', url: 'http://vervalsp.data.kemendikdasmen.go.id' },
      { id: 'verval-ptk', nama: 'Verval PTK', url: 'http://vervalptk.data.kemendikdasmen.go.id' },
      { id: 'verval-pd', nama: 'Verval PD', url: 'http://vervalpd.data.kemendikdasmen.go.id' },
      { id: 'keaktifan-nuptk', nama: 'Keaktifan NUPTK', url: 'http://gtk.data.kemendikdasmen.go.id' },
      { id: 'sekolah-kita', nama: 'Sekolah Kita', url: 'http://sekolah.data.kemendikdasmen.go.id' },
    ],
  },
  {
    id: 'sosmed',
    judul: 'Media Sosial',
    tautan: [
      { id: 'ig-ditjen', nama: 'IG Ditjen Pauddikdasmen', url: 'https://instagram.com/ditjen.paud.dikdasmen' },
      { id: 'ig-dapodik', nama: 'IG Dapodik', url: 'https://instagram.com/dapodik_official' },
    ],
  },
]

const IKON_KELOMPOK = {
  kepegawaian: Landmark,
  dapodik: Database,
  sosmed: Instagram,
}

export default function LinkLayanan() {
  const [aktif, setAktif] = useState(null) // { id, nama, url } atau null saat di daftar
  const [kunciIframe, setKunciIframe] = useState(0) // ganti key untuk memuat ulang iframe

  const bukaTautan = (tautan) => {
    setAktif(tautan)
    setKunciIframe((k) => k + 1)
  }

  return (
    <Layout
      title="Link Layanan & Kepegawaian"
      subtitle="Akses cepat ke portal KGB, kenaikan pangkat, mutasi pegawai, info GTK, dan Dapodik — dibuka langsung di dalam aplikasi."
    >
      {aktif ? (
        <div className="flex flex-col h-[calc(100vh-220px)] min-h-[420px] rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {/* Bar atas: kembali, judul, muat ulang, buka di tab baru */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={() => setAktif(null)}
              className="flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 shrink-0"
            >
              <ArrowLeft size={15} /> Kembali
            </button>
            <p className="flex-1 min-w-0 truncate text-xs sm:text-sm font-medium text-slate-700 text-center">
              {aktif.nama}
            </p>
            <button
              type="button"
              onClick={() => setKunciIframe((k) => k + 1)}
              title="Muat ulang"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0"
            >
              <RefreshCw size={15} />
            </button>
            <a
              href={aktif.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka di tab baru"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0"
            >
              <ExternalLink size={15} />
            </a>
          </div>

          {/* Sebagian portal pemerintah menolak ditampilkan dalam iframe
              (X-Frame-Options), sehingga area ini bisa tampak kosong/putih.
              Tombol "Buka di tab baru" di atas selalu tersedia sebagai cadangan. */}
          <iframe
            key={kunciIframe}
            src={aktif.url}
            title={aktif.nama}
            className="flex-1 w-full bg-white"
          />

          <div className="px-3 sm:px-4 py-2 border-t border-slate-100 bg-amber-50 text-[11px] sm:text-xs text-amber-700">
            Jika halaman di atas tidak muncul, situs tersebut kemungkinan memblokir tampilan dalam
            aplikasi. Gunakan tombol buka di tab baru di pojok kanan atas.
          </div>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {KELOMPOK_LINK.map((kelompok) => {
            const Ikon = IKON_KELOMPOK[kelompok.id] || ExternalLink
            return (
              <section key={kelompok.id}>
                <div className="flex items-center gap-2 mb-3">
                  <Ikon size={16} className="text-slate-400" />
                  <h2 className="font-display text-sm sm:text-base font-semibold text-slate-900">
                    {kelompok.judul}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {kelompok.tautan.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => bukaTautan(t)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition-colors"
                    >
                      <span className="min-w-0 truncate">{t.nama}</span>
                      <ExternalLink size={14} className="shrink-0 text-slate-300" />
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
