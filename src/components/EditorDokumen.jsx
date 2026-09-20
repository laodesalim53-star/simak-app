import { useEffect, useRef, useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { jalankanTugasCv } from './opencvLoader' // sesuaikan path sesuai struktur folder Anda

// Halaman editor manual: kecerahan, kontras, ketajaman, dengan preview langsung
// (live) di atas hasil crop yang sudah diluruskan. Tidak ada penyesuaian
// otomatis -- semua murni kontrol pengguna, dipanggil setelah SudutEditor +
// tugas worker 'luruskan' selesai.
//
// Props:
//   bitmapAsli        - ImageBitmap hasil luruskan() (belum disesuaikan, milik pemanggil)
//   lebar, tinggi      - dimensi bitmapAsli dalam piksel
//   onSimpan(bitmapHasil) - dipanggil dengan ImageBitmap hasil akhir saat pengguna menekan "Simpan"
//   onBatal()          - dipanggil saat pengguna membatalkan, bitmapAsli TIDAK diubah/ditutup oleh komponen ini setelah itu
export default function EditorDokumen({ bitmapAsli, lebar, tinggi, onSimpan, onBatal }) {
  const kanvasAsliRef = useRef(null) // <canvas> tersembunyi, menyimpan gambar asli
  const kanvasTampilRef = useRef(null) // <canvas> yang terlihat, menampilkan hasil terkini
  const tokenRef = useRef(0) // untuk mengabaikan hasil tugas worker yang sudah usang
  const sedangProsesRef = useRef(false)
  const nilaiTertundaRef = useRef(null) // nilai slider terbaru yang belum sempat dikirim

  const [kecerahan, setKecerahan] = useState(0)
  const [kontras, setKontras] = useState(0)
  const [ketajaman, setKetajaman] = useState(0)
  const [siap, setSiap] = useState(false)
  const [memproses, setMemproses] = useState(false)

  // Gambar bitmapAsli ke canvas tersembunyi sekali di awal, lalu tutup
  // bitmap aslinya -- selanjutnya semua sumber diambil dari canvas ini.
  useEffect(() => {
    const kanvas = kanvasAsliRef.current
    kanvas.width = lebar
    kanvas.height = tinggi
    kanvas.getContext('2d').drawImage(bitmapAsli, 0, 0)
    bitmapAsli.close()

    const tampil = kanvasTampilRef.current
    tampil.width = lebar
    tampil.height = tinggi
    tampil.getContext('bitmaprenderer').transferFromImageBitmap(null) // bersihkan
    // Tampilkan gambar asli sebagai keadaan awal.
    createImageBitmap(kanvas).then((bmp) => {
      tampil.getContext('bitmaprenderer').transferFromImageBitmap(bmp)
      setSiap(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Jalankan tugas worker dengan nilai slider saat ini. Kalau proses sedang
  // berjalan saat slider berubah lagi, simpan nilai terbaru dan proses itu
  // begitu proses sekarang selesai (trailing) -- bukan mengantre tiap event.
  async function prosesUlang(k, c, t) {
    nilaiTertundaRef.current = { k, c, t }
    if (sedangProsesRef.current) return
    sedangProsesRef.current = true
    setMemproses(true)

    while (nilaiTertundaRef.current) {
      const { k: kk, c: cc, t: tt } = nilaiTertundaRef.current
      nilaiTertundaRef.current = null
      const token = ++tokenRef.current

      try {
        let bitmapHasil
        if (kk === 0 && cc === 0 && tt === 0) {
          // Tanpa penyesuaian -> tampilkan langsung dari canvas asli, tanpa lewat worker.
          bitmapHasil = await createImageBitmap(kanvasAsliRef.current)
        } else {
          const sumber = await createImageBitmap(kanvasAsliRef.current)
          const hasil = await jalankanTugasCv(
            'sesuaikanGambar',
            { bitmapSumber: sumber, kecerahan: kk, kontras: cc, ketajaman: tt },
            [sumber]
          )
          bitmapHasil = hasil.bitmapHasil
        }
        if (token !== tokenRef.current) {
          // Sudah ada permintaan lebih baru -> buang hasil ini.
          bitmapHasil.close?.()
        } else {
          kanvasTampilRef.current.getContext('bitmaprenderer').transferFromImageBitmap(bitmapHasil)
        }
      } catch {
        // Abaikan satu kegagalan slider, lanjut ke nilai berikutnya kalau ada.
      }
    }

    sedangProsesRef.current = false
    setMemproses(false)
  }

  function ubah(setter, kunci) {
    return (e) => {
      const v = Number(e.target.value)
      setter(v)
      const nilai = { k: kecerahan, c: kontras, t: ketajaman, [kunci]: v }
      prosesUlang(nilai.k, nilai.c, nilai.t)
    }
  }

  function reset() {
    setKecerahan(0)
    setKontras(0)
    setKetajaman(0)
    prosesUlang(0, 0, 0)
  }

  async function simpan() {
    const bitmapHasil = await createImageBitmap(kanvasTampilRef.current)
    onSimpan(bitmapHasil)
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/90 flex flex-col items-center justify-center p-4">
      <p className="text-white text-sm mb-3 text-center max-w-md">
        Atur kecerahan, kontras, dan ketajaman dokumen.
      </p>

      <canvas ref={kanvasAsliRef} className="hidden" />
      <div className="relative w-full max-w-2xl">
        <canvas
          ref={kanvasTampilRef}
          className="w-full h-auto rounded-lg bg-black/20"
          style={{ maxHeight: '55vh', objectFit: 'contain' }}
        />
        {!siap && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
            Memuat pratinjau…
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl mt-4 space-y-3 text-white">
        <label className="block text-sm">
          Kecerahan
          <input
            type="range" min={-100} max={100} value={kecerahan}
            onChange={ubah(setKecerahan, 'k')}
            className="w-full"
          />
        </label>
        <label className="block text-sm">
          Kontras
          <input
            type="range" min={-100} max={100} value={kontras}
            onChange={ubah(setKontras, 'c')}
            className="w-full"
          />
        </label>
        <label className="block text-sm">
          Ketajaman
          <input
            type="range" min={0} max={100} value={ketajaman}
            onChange={ubah(setKetajaman, 't')}
            className="w-full"
          />
        </label>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-4">
        <button
          type="button"
          onClick={onBatal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
        >
          <X size={16} />
          Batal
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
        >
          <RotateCcw size={16} />
          Reset
        </button>
        <button
          type="button"
          onClick={simpan}
          disabled={!siap || memproses}
          className="btn-primary disabled:opacity-50"
        >
          <Check size={16} />
          Simpan
        </button>
      </div>
    </div>
  )
}
