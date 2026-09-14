import { useState } from 'react'

// Komponen daftar hadir yang dipakai di semua halaman materi majelis
// (Keluarga Sakinah, Pengelolaan Zakat, Wakaf, dst). Bagian form isian
// (nama majelis/tanggal/tempat/pemateri) disembunyikan saat print lewat
// class `print:hidden` — yang tercetak hanya ringkasan teks + tabel.
//
// Cara pakai:
//   <DaftarHadirCetak jumlahBaris={15} />
export default function DaftarHadirCetak({ jumlahBaris = 15 }) {
  const [namaMajelis, setNamaMajelis] = useState('')
  const [tanggal, setTanggal] = useState('')
  const [tempat, setTempat] = useState('')
  const [pemateri, setPemateri] = useState('')

  const baris = Array.from({ length: jumlahBaris })

  const tanggalTampil = tanggal
    ? new Date(tanggal).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '.....................................'

  return (
    <div className="mt-8">
      {/* Form isian — hanya tampil di layar, hilang otomatis saat dicetak */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Nama Majelis / Kelompok
          </label>
          <input
            value={namaMajelis}
            onChange={(e) => setNamaMajelis(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Contoh: Majelis Taklim Al-Ikhlas"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Tanggal Kegiatan</label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Tempat</label>
          <input
            value={tempat}
            onChange={(e) => setTempat(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Contoh: Masjid Al-Ikhlas"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Pemateri / Narasumber</label>
          <input
            value={pemateri}
            onChange={(e) => setPemateri(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Nama pemateri"
          />
        </div>
      </div>

      <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-2">
        Daftar Hadir Peserta
      </h2>

      <div className="text-sm text-slate-700 mb-3 space-y-0.5">
        <p>
          <span className="inline-block w-28">Nama Majelis</span>: {namaMajelis || '.....................................'}
        </p>
        <p>
          <span className="inline-block w-28">Tanggal</span>: {tanggalTampil}
        </p>
        <p>
          <span className="inline-block w-28">Tempat</span>: {tempat || '.....................................'}
        </p>
        <p>
          <span className="inline-block w-28">Pemateri</span>: {pemateri || '.....................................'}
        </p>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-2 py-2 w-10">No</th>
            <th className="border border-slate-300 px-2 py-2 text-left">Nama</th>
            <th className="border border-slate-300 px-2 py-2 text-left">Alamat</th>
            <th className="border border-slate-300 px-2 py-2 w-32">Tanda Tangan</th>
          </tr>
        </thead>
        <tbody>
          {baris.map((_, i) => (
            <tr key={i}>
              <td className="border border-slate-300 px-2 py-3 text-center">{i + 1}</td>
              <td className="border border-slate-300 px-2 py-3">&nbsp;</td>
              <td className="border border-slate-300 px-2 py-3">&nbsp;</td>
              <td className="border border-slate-300 px-2 py-3">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
