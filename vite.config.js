import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
        // Nama dibuat umum (bukan "Kepsek") karena aplikasi ini melayani
        // Sekolah dan KUA. JANGAN ubah start_url di bawah — itu bagian dari
        // identitas aplikasi; kalau berubah, pengguna harus instal ulang.
        name: 'SIMAK Sekolah & KUA',
        short_name: 'SIMAK',
        description: 'Aplikasi terpadu untuk Sekolah & KUA - presensi, surat, agenda, laporan, dan keuangan',
        lang: 'id',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',

        // TAMBAHAN: 'id' adalah identitas unik PWA ini di mata
        // Android/browser, terpisah dari start_url. Gunanya: kalau suatu
        // saat domain atau start_url berubah, OS masih mengenali ini
        // sebagai app yang SAMA (bukan app baru), jadi data & shortcut
        // yang sudah ter-install pengguna tidak hilang. Sengaja diisi '/'
        // (sama seperti start_url sekarang) — JANGAN ubah nilainya setelah
        // dipublikasikan ke Play Store, karena itu akan dianggap app baru.
        id: '/',

        // TAMBAHAN: mengunci orientasi ke portrait karena SIMAK dipakai
        // untuk presensi/surat/laporan yang layoutnya memang didesain
        // portrait. Kalau ada halaman yang butuh landscape (misal tabel
        // laporan lebar), ini bisa dihapus nanti dan ditangani lewat CSS
        // responsive saja, bukan lewat manifest.
        orientation: 'portrait',

        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
          // CATATAN (belum ditambahkan, perlu file ikon baru dulu):
          // PWABuilder/Android adaptive icon idealnya juga punya varian
          // "maskable" — ikon dengan padding aman ~20% di sekeliling
          // logo, ditandai purpose: 'any maskable'. Tanpa ini, ikon di
          // beberapa launcher Android bisa terlihat terpotong. Kalau
          // sudah punya file ikon maskable-nya, tambahkan entry baru di
          // array ini, jangan ganti dua yang sudah ada.
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // PERBAIKAN: jangan cache respons Supabase sama sekali. Data
        // sekolah/toko berubah terus (stok, status, dll), jadi cache di
        // sini cuma menambah risiko data basi dan membuat navigasi
        // menunggu network tanpa manfaat nyata. Biarkan Supabase client
        // sendiri yang menangani request-nya langsung ke network.
        //
        // Berkas unduhan (APK dll.) juga dikecualikan dari fallback
        // navigasi. Klik link unduhan dianggap "navigasi" oleh browser,
        // sehingga service worker bisa salah menyajikan index.html
        // (halaman aplikasi) sebagai pengganti file yang diminta.
        navigateFallbackDenylist: [/^\/api\//, /\.(?:apk|msix|pdf|zip)$/],
        runtimeCaching: []
      }
    })
  ],
  server: {
    port: 5173,
  },
})
