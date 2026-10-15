import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { ambilAnggaran, anggaranKeBarisRkas } from '../lib/keuanganArkas'

// Tombol "Tarik dari ARKAS": mengambil item anggaran sekolah untuk satu tahun dari tabel
// arkas_anggaran, lalu menyerahkannya ke halaman lewat `onTarik(baris)`.
// Halaman yang menentukan apakah baris itu mengganti atau menambah isian yang ada.
//
// Props:
//   sekolahId  id sekolah (uuid) yang datanya ditarik
//   tahun      tahun anggaran, mis. 2026
//   onTarik    fungsi yang menerima array baris RKAS
//   label      teks tombol (opsional)
export default function TombolTarikArkas({ sekolahId, tahun, onTarik, label = 'Tarik dari ARKAS', disabled = false }) {
  const [memuat, setMemuat] = useState(false)
  const [pesan, setPesan] = useState(null) // { ok: boolean, teks: string }

  async function tarik() {
    if (!sekolahId || !tahun) {
      setPesan({ ok: false, teks: 'Pilih tahun anggaran terlebih dahulu.' })
      return
    }
    setMemuat(true)
    setPesan(null)
    try {
      const data = await ambilAnggaran({ sekolahId, tahun })
      const baris = anggaranKeBarisRkas(data)
      if (baris.length === 0) {
        setPesan({ ok: false, teks: `Belum ada data ARKAS untuk tahun ${tahun}.` })
        return
      }
      onTarik(baris)
      setPesan({ ok: true, teks: `${baris.length} baris ditarik dari ARKAS.` })
    } catch (err) {
      setPesan({ ok: false, teks: err?.message || 'Gagal menarik data ARKAS.' })
    } finally {
      setMemuat(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={tarik}
        disabled={disabled || memuat}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {memuat ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {memuat ? 'Menarik data...' : label}
      </button>
      {pesan && (
        <span className={`text-xs ${pesan.ok ? 'text-emerald-600' : 'text-red-600'}`} role="status">
          {pesan.teks}
        </span>
      )}
    </div>
  )
}
