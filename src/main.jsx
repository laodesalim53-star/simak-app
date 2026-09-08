import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'
import './index.css'

// PERBAIKAN: registerType di vite.config.js sengaja 'prompt' (bukan
// 'autoUpdate') supaya service worker tidak ganti diam-diam di tengah
// sesi. Tapi itu artinya KITA yang wajib memanggil updateSW() begitu versi
// baru siap — kalau tidak dipanggil sama sekali, service worker baru akan
// selamanya menunggu ("waiting") dan pengguna lama tidak akan pernah
// melihat update apa pun, meski sudah di-deploy ke server.
//
// Di sini update dipicu otomatis begitu tab ini di-refresh berikutnya
// (bukan mid-session): begitu terdeteksi ada versi baru, kita minta
// konfirmasi singkat, lalu updateSW(true) yang akan skipWaiting +
// reload halaman dengan kode terbaru.
const updateSW = registerSW({
  onNeedRefresh() {
    const mauUpdate = window.confirm(
      'Ada pembaruan aplikasi. Muat ulang sekarang untuk memakai versi terbaru?'
    )
    if (mauUpdate) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    // Aplikasi siap dipakai offline — tidak perlu aksi apa pun di sini.
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
