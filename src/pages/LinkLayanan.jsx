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
  GraduationCap,
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
    id: 'akun-guru',
    judul: 'Akun & Layanan Guru',
    tautan: [
      { id: 'ruang-gtk', nama: 'Ruang GTK', url: 'https://guru.kemendikdasmen.go.id/', bukaTabBaru: true },
      {
        id: 'sim-pkb',
        nama: 'SIM PKB',
        url: 'https://paspor-gtk.simpkb.id/casgpo/login?service=https%3A%2F%2Fapp.simpkb.id%2Fauth%2Flogin',
        bukaTabBaru: true,
      },
      { id: 'belajar-id', nama: 'belajar.id', url: 'https://www.belajar.id/', bukaTabBaru: true },
      { id: 'asn-digital', nama: 'ASN Digital', url: 'https://asndigital.bkn.go.id/', bukaTabBaru: true },
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

// Tema per grup: dipetakan ke kelas Tailwind statis (bukan digabung secara
// dinamis) supaya tetap terdeteksi oleh Tailwind saat build.
const TEMA_KELOMPOK = {
  kepegawaian: {
    ikon: Landmark,
    chip: 'bg-indigo-50 text-indigo-600',
    aksen: 'border-l-indigo-400',
    tekanAktif: 'active:bg-indigo-50 active:border-indigo-300',
    hover: 'hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700',
  },
  'akun-guru': {
    ikon: GraduationCap,
    chip: 'bg-amber-50 text-amber-600',
    aksen: 'border-l-amber-400',
    tekanAktif: 'active:bg-amber-50 active:border-amber-300',
    hover: 'hover:border-amber-300 hover:bg-amber-50/40 hover:text-amber-700',
  },
  dapodik: {
    ikon: Database,
    chip: 'bg-teal-50 text-teal-600',
    aksen: 'border-l-teal-400',
    tekanAktif: 'active:bg-teal-50 active:border-teal-300',
    hover: 'hover:border-teal-300 hover:bg-teal-50/40 hover:text-teal-700',
  },
  sosmed: {
    ikon: Instagram,
    chip: 'bg-rose-50 text-rose-600',
    aksen: 'border-l-rose-400',
    tekanAktif: 'active:bg-rose-50 active:border-rose-300',
    hover: 'hover:border-rose-300 hover:bg-rose-50/40 hover:text-rose-700',
  },
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
          {/* Bar atas: kembali, judul, muat ulang, buka di tab baru.
              Semua kontrol minimal 44x44px (standar target sentuh Android)
              dan memakai active: (bukan hover:) supaya terasa responsif saat
              disentuh, dengan tap-highlight bawaan Chrome/Android dimatikan. */}
          <div className="flex items-center gap-1 px-2 sm:px-4 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <button
              type="button"
              onClick={tutupPanel}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="flex items-center gap-1 min-h-[44px] px-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-600 active:bg-slate-100 active:text-slate-900 touch-manipulation shrink-0"
            >
              <ArrowLeft size={16} /> Kembali
            </button>
            <p className="flex-1 min-w-0 truncate text-xs sm:text-sm font-medium text-slate-700 text-center">
              {aktif.nama}
            </p>
            <button
              type="button"
              onClick={muatUlang}
              title="Muat ulang"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-slate-500 active:bg-slate-100 active:text-slate-900 touch-manipulation shrink-0"
            >
              <RefreshCw size={16} className={sedangMemuat ? 'animate-spin' : ''} />
            </button>
            <a
              href={aktif.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka di tab baru"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-slate-500 active:bg-slate-100 active:text-slate-900 touch-manipulation shrink-0"
            >
              <ExternalLink size={16} />
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
            const tema = TEMA_KELOMPOK[kelompok.id] || TEMA_KELOMPOK.kepegawaian
            const Ikon = tema.ikon
            return (
              <section key={kelompok.id}>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${tema.chip}`}>
                    <Ikon size={16} />
                  </span>
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
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        className={`flex items-center justify-between gap-3 min-h-[52px] rounded-xl border border-l-4 border-slate-200 ${tema.aksen} bg-white px-4 py-3 text-left text-sm text-slate-700 transition-transform duration-100 touch-manipulation active:scale-[0.98] ${tema.tekanAktif} ${tema.hover}`}
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
