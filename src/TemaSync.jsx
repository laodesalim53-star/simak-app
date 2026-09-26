import { useEffect } from 'react'
import { useAuth } from './lib/AuthContext'

// Peta jenis_organisasi (dari tabel `sekolah`) ke nama tema.
// 'kantor' di database berarti KUA (sesuai penamaan tenant di aplikasi ini).
const PETA_TEMA = {
  sekolah: 'sekolah',
  kantor: 'kua',
  puskesmas: 'puskesmas',
}

const TEMA_DEFAULT = 'sekolah'

/**
 * Komponen tanpa tampilan (render null) yang bertugas menempelkan
 * atribut data-tema="sekolah" | "kua" | "puskesmas" ke elemen <html>
 * setiap kali profil user (jenis_organisasi) berubah.
 *
 * CSS variables warna per tema didefinisikan di tema.css lewat
 * selector :root[data-tema="..."], jadi begitu atribut ini berubah,
 * seluruh warna di aplikasi ikut berubah otomatis tanpa perlu
 * if/else di tiap komponen.
 *
 * Taruh file ini di src/TemaSync.jsx (sejajar dengan App.jsx).
 * AuthProvider sudah membungkus <App /> dari main.jsx, jadi
 * komponen ini cukup dipanggil di dalam return App() — TIDAK
 * perlu dibungkus <AuthProvider> lagi secara manual di sini.
 *
 * Pasang di dalam App.jsx, di dalam <CartProvider>, sejajar
 * dengan <DemoSessionWatcher /> dan <LisensiCetak />:
 *
 *   <CartProvider>
 *     <Suspense fallback={<FallbackLoader />}>
 *       <Routes>...</Routes>
 *     </Suspense>
 *     <TemaSync />
 *     <DemoSessionWatcher />
 *     <LisensiCetak app="sekolah" />
 *   </CartProvider>
 */
export default function TemaSync() {
  const { profil } = useAuth()

  useEffect(() => {
    const jenis = profil?.jenis_organisasi ?? TEMA_DEFAULT
    const namaTema = PETA_TEMA[jenis] || TEMA_DEFAULT
    document.documentElement.setAttribute('data-tema', namaTema)
  }, [profil?.jenis_organisasi])

  return null
}
