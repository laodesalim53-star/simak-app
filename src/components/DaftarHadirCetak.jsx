import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

// Komponen daftar hadir yang dipakai di semua halaman materi majelis
// (Keluarga Sakinah, Pengelolaan Zakat, Wakaf, dst). Bagian form isian
// (nama majelis/tanggal/tempat/pemateri) disembunyikan saat print lewat
// class `print:hidden` — yang tercetak hanya ringkasan teks + tabel.
//
// Nama majelis/tanggal/tempat/pemateri bisa diisi otomatis dari halaman
// induk lewat prop *Awal (namaMajelisAwal, tanggalAwal, tempatAwal,
// pemateriAwal). Kalau halaman induk tidak mengirim prop ini, field tetap
// kosong seperti sebelumnya dan bisa diisi manual di layar. Field tetap
// bisa dikoreksi manual meski sudah terisi otomatis — perubahan pada prop
// *Awal (misal user mengedit form di halaman induk) akan menimpa isian
// manual di komponen ini, karena field ini memang ditujukan sebagai
// cerminan data induk.
//
// BARU: ada dropdown "Kelompok Binaan". Begitu dipilih, nama & alamat
// anggota ditarik otomatis dari tabel kelompok_binaan_anggota (dikelola
// di /pusat-kelompok-binaan) — tidak perlu diketik manual tiap cetak.
// Slug di daftar ini HARUS sama dengan kolom `kelompok` di Supabase.
//
// Cara pakai:
//   <DaftarHadirCetak jumlahBaris={15} />
//   <DaftarHadirCetak jumlahBaris={15} kelompokAwal="majelis-taklim" />
//   <DaftarHadirCetak
//     jumlahBaris={15}
//     namaMajelisAwal={lokasiPenyuluhan}
//     tanggalAwal={waktuKegiatan}
//     tempatAwal={tempatKegiatan}
//     pemateriAwal={namaPenyuluh}
//   />
const OPSI_KELOMPOK = [
  { slug: '', label: 'Isi manual (tanpa kelompok binaan)' },
  { slug: 'majelis-taklim', label: 'Majelis Taklim' },
  { slug: 'lapas', label: 'Lapas' },
  { slug: 'rsu', label: 'RSU' },
  { slug: 'masyarakat', label: 'Masyarakat' },
]

export default function DaftarHadirCetak({
  jumlahBaris = 15,
  kelompokAwal = '',
  namaMajelisAwal = '',
  tanggalAwal = '',
  tempatAwal = '',
  pemateriAwal = '',
}) {
  const [namaMajelis, setNamaMajelis] = useState(namaMajelisAwal)
  const [tanggal, setTanggal] = useState(tanggalAwal)
  const [tempat, setTempat] = useState(tempatAwal)
  const [pemateri, setPemateri] = useState(pemateriAwal)

  // Sinkron otomatis kalau data di halaman induk berubah (misalnya admin
  // mengedit Lokasi/Waktu/Tempat/Nama Penyuluh di form kegiatan).
  useEffect(() => {
    setNamaMajelis(namaMajelisAwal)
  }, [namaMajelisAwal])

  useEffect(() => {
    setTanggal(tanggalAwal)
  }, [tanggalAwal])

  useEffect(() => {
    setTempat(tempatAwal)
  }, [tempatAwal])

  useEffect(() => {
    setPemateri(pemateriAwal)
  }, [pemateriAwal])

  const [kelompokSlug, setKelompokSlug] = useState(kelompokAwal)
  const [daftarAnggota, setDaftarAnggota] = useState([])
  const [memuatAnggota, setMemuatAnggota] = useState(false)

  useEffect(() => {
    if (!kelompokSlug) {
      setDaftarAnggota([])
      return
    }
    let dibatalkan = false
    setMemuatAnggota(true)
    supabase
      .from('kelompok_binaan_anggota')
      .select('nama, alamat')
      .eq('kelompok', kelompokSlug)
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!dibatalkan) {
          setDaftarAnggota(data || [])
          setMemuatAnggota(false)
        }
      })
    return () => {
      dibatalkan = true
    }
  }, [kelompokSlug])

  // Kalau anggota kelompok lebih banyak dari jumlahBaris, tabel diperpanjang
  // otomatis supaya semua nama tetap tercetak.
  const totalBaris = Math.max(jumlahBaris, daftarAnggota.length)
  const baris = Array.from({ length: totalBaris })

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
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Kelompok Binaan (nama peserta terisi otomatis)
          </label>
          <select
            value={kelompokSlug}
            onChange={(e) => setKelompokSlug(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
          >
            {OPSI_KELOMPOK.map((opsi) => (
              <option key={opsi.slug} value={opsi.slug}>
                {opsi.label}
              </option>
            ))}
          </select>
          {kelompokSlug && (
            <p className="text-xs text-slate-500 mt-1">
              {memuatAnggota
                ? 'Memuat daftar nama...'
                : daftarAnggota.length > 0
                ? `${daftarAnggota.length} nama dimuat otomatis dari data kelompok ini. Kelola di Pusat Kelompok Binaan.`
                : 'Belum ada nama tersimpan untuk kelompok ini. Tambahkan lewat Pusat Kelompok Binaan.'}
            </p>
          )}
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

      {memuatAnggota ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6 print:hidden">
          <Loader2 size={16} className="animate-spin" /> Memuat daftar nama...
        </div>
      ) : (
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
            {baris.map((_, i) => {
              const anggota = daftarAnggota[i]
              return (
                <tr key={i}>
                  <td className="border border-slate-300 px-2 py-3 text-center">{i + 1}</td>
                  <td className="border border-slate-300 px-2 py-3">{anggota?.nama || '\u00A0'}</td>
                  <td className="border border-slate-300 px-2 py-3">{anggota?.alamat || '\u00A0'}</td>
                  <td className="border border-slate-300 px-2 py-3">&nbsp;</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
