import { Link } from 'react-router-dom'
import { APP } from '../lib/appConfig'

// Beranda publik sederhana untuk kantor / puskesmas / polres.
// Nama, tagline, warna, dan daftar fitur diambil dari lib/appConfig.js.
// Ganti dengan desain poster promosi sendiri kapan saja
// (cukup buat BerandaPuskesmas.jsx dll. lalu pasang di RoutesPuskesmas.jsx).
export default function BerandaGenerik() {
  return (
    <div className="min-h-screen bg-paper text-gray-900">
      <header className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: APP.warna }}>
        <span className="text-white text-xl font-bold">{APP.nama}</span>
        <nav className="flex gap-3">
          <Link to="/login" className="text-white/90 hover:text-white text-sm">Masuk</Link>
          <Link to="/register" className="bg-white text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ color: APP.warna }}>
            Daftar
          </Link>
        </nav>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl sm:text-5xl font-extrabold mb-4" style={{ color: APP.warna }}>
          {APP.nama}
        </h1>
        <p className="text-lg text-gray-600 mb-8">{APP.tagline}</p>
        <Link
          to="/login"
          className="inline-block text-white font-semibold px-6 py-3 rounded-xl shadow"
          style={{ backgroundColor: APP.warna }}
        >
          Mulai Sekarang
        </Link>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16 grid gap-4 sm:grid-cols-3">
        {APP.fitur.map((f) => (
          <div key={f.judul} className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-bold mb-1" style={{ color: APP.warna }}>{f.judul}</h3>
            <p className="text-sm text-gray-600">{f.isi}</p>
          </div>
        ))}
      </section>

      <footer className="text-center text-xs text-gray-500 pb-8">
        <Link to="/kebijakan-privasi" className="underline mr-3">Kebijakan Privasi</Link>
        <Link to="/syarat-layanan" className="underline">Syarat Layanan</Link>
      </footer>
    </div>
  )
}
