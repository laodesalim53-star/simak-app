import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, FileDown } from 'lucide-react'
import { buatPdfDariHalaman } from './pdfBuilder'

// Mengelola daftar halaman hasil scan (multi-halaman) sebelum digabung
// jadi satu file PDF. Setiap item halaman = { id, bitmap, lebarMm, tinggiMm,
// dataUrlThumbnail }. lebarMm/tinggiMm berasal dari ukuran kertas yang
// dipilih pengguna (lihat ukuranKertas.js) dan dipakai langsung oleh
// pdfBuilder sebagai ukuran halaman PDF -- bukan ditebak dari resolusi piksel.
//
// Alur pemakaian dari komponen pemanggil (mis. AlatPDF.jsx):
//   const [halaman, setHalaman] = useState([])
//   // setelah EditorDokumen.onSimpan(bitmapFinal):
//   const item = await buatItemHalaman(bitmapFinal, lebarMm, tinggiMm)
//   setHalaman((lama) => [...lama, item])
//   setTahap('daftarHalaman')
//
// Props:
//   halaman              - array item halaman
//   onUbahHalaman(baru)  - dipanggil saat urutan/isi daftar berubah (hapus/urutkan)
//   onScanLagi()         - dipanggil saat pengguna menekan "+" untuk halaman baru
//   onSelesai(blobPdf)   - dipanggil dengan Blob PDF final saat "Buat PDF" ditekan
export default function DaftarHalaman({ halaman, onUbahHalaman, onScanLagi, onSelesai }) {
  const [memproses, setMemproses] = useState(false)
  const [error, setError] = useState('')

  function hapus(id) {
    onUbahHalaman(halaman.filter((h) => h.id !== id))
  }

  function pindah(id, arah) {
    const idx = halaman.findIndex((h) => h.id === id)
    const idxBaru = idx + arah
    if (idxBaru < 0 || idxBaru >= halaman.length) return
    const baru = halaman.slice()
    ;[baru[idx], baru[idxBaru]] = [baru[idxBaru], baru[idx]]
    onUbahHalaman(baru)
  }

  async function buatPdf() {
    if (!halaman.length) return
    setMemproses(true)
    setError('')
    try {
      const blob = await buatPdfDariHalaman(
        halaman.map((h) => ({ bitmap: h.bitmap, lebarMm: h.lebarMm, tinggiMm: h.tinggiMm }))
      )
      onSelesai(blob)
    } catch (err) {
      setError(err?.message || 'Gagal membuat PDF.')
    } finally {
      setMemproses(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/95 flex flex-col p-4">
      <p className="text-white text-sm mb-3 text-center">
        {halaman.length} halaman siap digabung. Urutkan atau hapus bila perlu.
      </p>

      <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
        {halaman.map((h, i) => (
          <div key={h.id} className="relative bg-white/5 rounded-lg p-2 flex flex-col items-center">
            <img
              src={h.dataUrlThumbnail}
              alt={`Halaman ${i + 1}`}
              className="w-full h-32 object-contain rounded bg-black/20"
            />
            <span className="text-white text-xs mt-1">Halaman {i + 1}</span>
            <div className="flex gap-1 mt-2">
              <button
                type="button"
                onClick={() => pindah(h.id, -1)}
                disabled={i === 0}
                className="p-1.5 rounded bg-white/10 text-white disabled:opacity-30"
                aria-label="Pindah ke atas"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => pindah(h.id, 1)}
                disabled={i === halaman.length - 1}
                className="p-1.5 rounded bg-white/10 text-white disabled:opacity-30"
                aria-label="Pindah ke bawah"
              >
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => hapus(h.id)}
                className="p-1.5 rounded bg-red-500/20 text-red-300"
                aria-label="Hapus halaman"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onScanLagi}
          className="h-32 rounded-lg border-2 border-dashed border-white/30 text-white/70 flex flex-col items-center justify-center gap-1 hover:border-white/60 hover:text-white transition-colors"
        >
          <Plus size={24} />
          <span className="text-xs">Tambah halaman</span>
        </button>
      </div>

      {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}

      <div className="flex justify-center gap-3 mt-4">
        <button
          type="button"
          onClick={buatPdf}
          disabled={!halaman.length || memproses}
          className="btn-primary disabled:opacity-50"
        >
          <FileDown size={16} />
          {memproses ? 'Membuat PDF…' : `Buat PDF (${halaman.length} halaman)`}
        </button>
      </div>
    </div>
  )
}

// Helper: bungkus ImageBitmap hasil EditorDokumen jadi item halaman siap
// dipakai DaftarHalaman. lebarMm/tinggiMm ikut disimpan supaya pdfBuilder
// tahu ukuran kertas asli halaman ini tanpa menebak dari piksel.
export async function buatItemHalaman(bitmap, lebarMm, tinggiMm) {
  const kanvas = document.createElement('canvas')
  const skala = Math.min(1, 300 / Math.max(bitmap.width, bitmap.height))
  kanvas.width = bitmap.width * skala
  kanvas.height = bitmap.height * skala
  kanvas.getContext('2d').drawImage(bitmap, 0, 0, kanvas.width, kanvas.height)
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bitmap,
    lebarMm,
    tinggiMm,
    dataUrlThumbnail: kanvas.toDataURL('image/jpeg', 0.6),
  }
}
