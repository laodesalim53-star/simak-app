import { useState, useRef, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import {
  ArrowLeft,
  ExternalLink,
  Landmark,
  Database,
  Instagram,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'

// Halaman ini level ATAS (route: /link-layanan) — bisa diakses semua peran
// (admin, guru, orang tua) lewat menu sidebar, BUKAN bagian dari Gudang SK
// yang admin-only.
//
// Kumpulan link layanan eksternal terkait kepegawaian & Dapodik.
// Untuk menambah/mengubah link, cukup edit array KELOMPOK_LINK di bawah ini —
// tidak perlu menyentuh bagian tampilan.
//
// CATATAN TEKNIS soal deteksi "diblokir iframe":
// Browser TIDAK mengizinkan JavaScript membaca isi iframe lintas-domain
// (cross-origin), jadi tidak ada cara memastikan 100% sebuah situs benar-benar
// gagal tampil hanya lewat kode. Yang bisa dilakukan secara otomatis:
//   1. Tandai situs yang SUDAH DIKETAHUI menolak iframe (header X-Frame-Options /
//      frame-ancestors) lewat `bukaTabBaru: true` pada datanya → langsung buka
//      tab baru tanpa mencoba iframe sama sekali.
//   2. Untuk situs yang belum diketahui, coba iframe dengan BATAS WAKTU
//      (timeout). Jika iframe tidak selesai memuat dalam waktu tsb, dianggap
//      gagal → otomatis dibuka di tab baru.
//   3. Kegagalan itu diingat (localStorage) supaya klik berikutnya pada link
//      yang sama langsung ke tab baru, tanpa menunggu timeout lagi.
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
        bukaTabBaru: true, // portal Kemendikdasmen umumnya menolak iframe
      },
    ],
  },
  {
    id: 'dapodik',
    judul: 'Dapodik',
    tautan: [
      { id: 'portal-dapodik', nama: 'Portal Dapodik', url: 'https://dapo.kemendikdasmen.go.id', bukaTabBaru: true },
      { id: 'manajemen-sekolah', nama: 'Manajemen Sekolah', url: 'https://sp.datadik.kemendikdasmen.go.id', bukaTabBaru: true },
      { id: 'individual-gtk', nama: 'Individual GTK', url: 'https://ptk.datadik.kemendikdasmen.go.id', bukaTabBaru: true },
      { id: 'bos-online', nama: 'BOS Online', url: 'http://bos.kemendikdasmen.go.id', bukaTabBaru: true },
      { id: 'verval-sp', nama: 'Verval SP', url: 'http://vervalsp.data.kemendikdasmen.go.id', bukaTabBaru: true },
      { id: 'verval-ptk', nama: 'Verval PTK', url: 'http://vervalptk.data.kemendikdasmen.go.id', bukaTabBaru: true },
      { id: 'verval-pd', nama: 'Verval PD', url: 'http://vervalpd.data.kemendikdasmen.go.id', bukaTabBaru: true },
      { id: 'keaktifan-nuptk', nama: 'Keaktifan NUPTK', url: 'http://gtk.data.kemendikdasmen.go.id', bukaTabBaru: true },
      { id: 'sekolah-kita', nama: 'Sekolah Kita', url: 'http://sekolah.data.kemendikdasmen.go.id', bukaTabBaru: true },
    ],
  },
  {
    id: 'sosmed',
    judul: 'Media Sosial',
    tautan: [
      { id: 'ig-ditjen', nama: 'IG Ditjen Pauddikdasmen', url: 'https://instagram.com/ditjen.paud.dikdasmen', bukaTabBaru: true },
      { id: 'ig-dapodik', nama: 'IG Dapodik', url: 'https://instagram.com/dapodik_official', bukaTabBaru: true },
    ],
  },
]

const IKON_KELOMPOK = {
  kepegawaian: Landmark,
  dapodik: Database,
  sosmed: Instagram,
}

// Berapa lama menunggu iframe memuat sebelum dianggap gagal & auto-fallback
// ke tab baru (ms). Sengaja tidak terlalu pendek supaya koneksi lambat tidak
// salah dianggap gagal, tapi juga tidak terlalu lama menahan pengguna.
const BATAS_WAKTU_MUAT_MS = 5000

const KUNCI_PENYIMPANAN = 'linkLayanan.gagalIframe'

function ambilDaftarGagalTersimpan() {
  try {
    const mentah = window.localStorage.getItem(KUNCI_PENYIMPANAN)
    const arr = mentah ? JSON.parse(mentah) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function simpanDaftarGagal(set) {
  try {
    window.localStorage.setItem(KUNCI_PENYIMPANAN, JSON.stringify([...set]))
  } catch {
    // localStorage tidak tersedia (mis. mode privat) — abaikan, tidak fatal
  }
}

export default function LinkLayanan() {
  const [aktif, setAktif] = useState(null) // { id, nama, url } atau null saat di daftar
  const [kunciIframe, setKunciIframe] = useState(0) // ganti key untuk memuat ulang iframe
  const [sedangMemuat, setSedangMemuat] = useState(false)
  const [gagalTerdeteksi, setGagalTerdeteksi] = useState(false)
  const timerRef = useRef(null)
  const gagalTersimpanRef = useRef(ambilDaftarGagalTersimpan())

  const bersihkanTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const bukaTabBaruLangsung = useCallback((tautan) => {
    window.open(tautan.url, '_blank', 'noopener,noreferrer')
  }, [])

  const tandaiGagalDanBukaTabBaru = useCallback((tautan) => {
    bersihkanTimer()
    gagalTersimpanRef.current.add(tautan.id)
    simpanDaftarGagal(gagalTersimpanRef.current)
    bukaTabBaruLangsung(tautan)
    setAktif(null)
    setSedangMemuat(false)
  }, [bukaTabBaruLangsung])

  const bukaTautan = (tautan) => {
    // 1) Sudah ditandai eksplisit di data, atau sebelumnya pernah gagal → langsung tab baru
    if (tautan.bukaTabBaru || gagalTersimpanRef.current.has(tautan.id)) {
      bukaTabBaruLangsung(tautan)
      return
    }

    // 2) Belum diketahui → coba tampilkan lewat iframe, dengan batas waktu
    setAktif(tautan)
    setKunciIframe((k) => k + 1)
    setSedangMemuat(true)
    setGagalTerdeteksi(false)

    bersihkanTimer()
    timerRef.current = setTimeout(() => {
      tandaiGagalDanBukaTabBaru(tautan)
    }, BATAS_WAKTU_MUAT_MS)
  }

  const tanganiIframeMuat = () => {
    bersihkanTimer()
    setSedangMemuat(false)
  }

  const tanganiIframeError = () => {
    // onError jarang terpicu untuk X-Frame-Options (browser menganggap itu
    // "berhasil" secara navigasi), tapi tetap ditangkap untuk kasus jaringan.
    if (aktif) tandaiGagalDanBukaTabBaru(aktif)
  }

  const tutupPanel = () => {
    bersihkanTimer()
    setAktif(null)
    setSedangMemuat(false)
  }

  const muatUlang = () => {
    if (!aktif) return
    setSedangMemuat(true)
    setKunciIframe((k) => k + 1)
    bersihkanTimer()
    timerRef.current = setTimeout(() => {
      tandaiGagalDanBukaTabBaru(aktif)
    }, BATAS_WAKTU_MUAT_MS)
  }

  useEffect(() => () => bersihkanTimer(), [])

  return (
    <Layout
      title="Link Layanan & Kepegawaian"
      subtitle="Akses cepat ke portal KGB, kenaikan pangkat, mutasi pegawai, info GTK, dan Dapodik — dibuka langsung di dalam aplikasi bila memungkinkan, atau otomatis di tab baru bila situs menolak."
    >
      {aktif ? (
        <div className="flex flex-col h-[calc(100vh-220px)] min-h-[420px] rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {/* Bar atas: kembali, judul, muat ulang, buka di tab baru */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={tutupPanel}
              className="flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 shrink-0"
            >
              <ArrowLeft size={15} /> Kembali
            </button>
            <p className="flex-1 min-w-0 truncate text-xs sm:text-sm font-medium text-slate-700 text-center">
              {aktif.nama}
            </p>
            <button
              type="button"
              onClick={muatUlang}
              title="Muat ulang"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0"
            >
              <RefreshCw size={15} className={sedangMemuat ? 'animate-spin' : ''} />
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
              (X-Frame-Options). Sistem mencoba mendeteksinya lewat batas
              waktu pemuatan; jika terdeteksi gagal, otomatis dibuka di tab
              baru dan ditandai supaya lain kali langsung ke tab baru. */}
          <iframe
            key={kunciIframe}
            src={aktif.url}
            title={aktif.nama}
            onLoad={tanganiIframeMuat}
            onError={tanganiIframeError}
            className="flex-1 w-full bg-white"
          />

          {sedangMemuat && (
            <div className="px-3 sm:px-4 py-2 border-t border-slate-100 bg-blue-50 text-[11px] sm:text-xs text-blue-700 flex items-center gap-2">
              <RefreshCw size={12} className="animate-spin shrink-0" />
              Memuat halaman… jika situs ini menolak ditampilkan di dalam aplikasi, sistem akan
              otomatis membuka tab baru dalam beberapa detik.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {gagalTerdeteksi && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs sm:text-sm text-amber-700">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>
                Halaman sebelumnya tidak dapat ditampilkan di dalam aplikasi dan sudah dibuka di
                tab baru.
              </span>
            </div>
          )}
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
                  {kelompok.tautan.map((t) => {
                    const akanBukaTabBaru = t.bukaTabBaru || gagalTersimpanRef.current.has(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => bukaTautan(t)}
                        title={akanBukaTabBaru ? 'Akan dibuka di tab baru' : undefined}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition-colors"
                      >
                        <span className="min-w-0 truncate">{t.nama}</span>
                        <ExternalLink size={14} className="shrink-0 text-slate-300" />
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
