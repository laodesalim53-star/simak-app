import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Nama & deskripsi PWA per tipe aplikasi.
// 'sekolah' SENGAJA sama persis dengan manifest lama (dipakai juga oleh build
// tanpa --mode / produksi sekarang), supaya pengguna yang sudah memasang
// aplikasinya tidak terpengaruh.
const MANIFEST_TIPE = {
  sekolah: {
    name: 'SIMAK Sekolah & KUA',
    short_name: 'SIMAK',
    description: 'Aplikasi terpadu untuk Sekolah & KUA - presensi, surat, agenda, laporan, dan keuangan'
  },
  kantor: {
    name: 'SIMAK Kantor',
    short_name: 'SIMAK Kantor',
    description: 'Aplikasi kantor/KUA - presensi, surat, agenda, laporan, dan administrasi'
  },
  puskesmas: {
    name: 'SIMPUS',
    short_name: 'SIMPUS',
    description: 'Aplikasi puskesmas - presensi, jadwal piket, cuti dan izin, laporan, dan keuangan'
  },
  polres: {
    name: 'Keamanan',
    short_name: 'Keamanan',
    description: 'Aplikasi kepolisian - data personel, presensi, surat, dan laporan'
  }
}

export default defineConfig(({ mode }) => {
  // Baca .env.<mode> (mis. .env.puskesmas). Build tanpa --mode tidak punya
  // VITE_APP_TIPE, jadi otomatis jatuh ke 'sekolah' (perilaku lama).
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const tipe = MANIFEST_TIPE[env.VITE_APP_TIPE] ? env.VITE_APP_TIPE : 'sekolah'
  const info = MANIFEST_TIPE[tipe]

  return {
    plugins: [
      react(),
      VitePWA({
        // PERBAIKAN: 'autoUpdate' mengganti service worker diam-diam di
        // tengah sesi (bisa pas kamu lagi klik-klik menu), membuat kode lama
        // yang masih berjalan di browser tiba-tiba nyangkut ke file yang
        // sudah tidak ada di server -> terasa macet lalu "keluar sendiri".
        // 'prompt' menunda pergantian sampai kita yang memicu lewat
        // updateSW() di bawah, di titik yang aman (baru refresh, bukan
        // di tengah interaksi).
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
        manifest: {
          // Nama per tipe aplikasi (lihat MANIFEST_TIPE di atas).
          // JANGAN ubah start_url di bawah — itu bagian dari
          // identitas aplikasi; kalau berubah, pengguna harus instal ulang.
          name: info.name,
          short_name: info.short_name,
          description: info.description,
          lang: 'id',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',

          // 'id' adalah identitas unik PWA ini di mata Android/browser,
          // terpisah dari start_url. Sengaja diisi '/' (sama seperti
          // start_url sekarang) — JANGAN ubah nilainya setelah
          // dipublikasikan ke Play Store, karena itu akan dianggap app baru.
          // Tiap tipe aplikasi nanti dipasang di domain sendiri, jadi
          // id '/' tidak bentrok antar aplikasi.
          id: '/',

          // Mengunci orientasi ke portrait karena SIMAK dipakai untuk
          // presensi/surat/laporan yang layoutnya didesain portrait.
          orientation: 'portrait',

          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
            // CATATAN (belum ditambahkan, perlu file ikon baru dulu):
            // varian "maskable" (purpose: 'any maskable') untuk launcher
            // Android. Kalau nanti ikon per tipe dibuat, tambahkan di sini.
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // Jangan cache respons Supabase sama sekali (data berubah terus).
          // Berkas unduhan (APK dll.) dikecualikan dari fallback navigasi
          // supaya service worker tidak menyajikan index.html sebagai
          // pengganti file yang diminta.
          navigateFallbackDenylist: [/^\/api\//, /\.(?:apk|msix|pdf|zip)$/],
          runtimeCaching: []
        }
      })
    ],
    server: {
      port: 5173
    }
  }
})
