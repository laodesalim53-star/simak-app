import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { X, Search, Loader2 } from 'lucide-react'

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0)
}

function formatTanggal(tgl) {
  if (!tgl) return '-'
  return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// No. bukti '-' atau kosong dianggap tidak punya grup (dipilih satu per satu).
function kunciGrup(no) {
  const v = String(no || '').trim()
  return v && v !== '-' ? v : null
}

/**
 * Props:
 *  - onTarik(rows) : dipanggil dengan ARRAY baris bku_kas yang dicentang
 *                    (dipakai formDariBku di Nota.jsx; tiap baris = 1 barang)
 *  - onClose()
 *
 * Aturan centang (sama dengan PilihBkuModal untuk Kuitansi):
 *  1. Mencentang baris ber-no. bukti X otomatis mencentang SEMUA baris ber-no. bukti X.
 *  2. Setelah itu tiap baris masih bisa di-uncheck / dicentang lagi satu per satu
 *     (selama masih satu no. bukti).
 *  3. Mencentang baris dari no. bukti lain mengganti pilihan (1 nota = 1 no. bukti).
 *  4. Baris tanpa no. bukti ('-') dipilih tunggal.
 */
export default function PilihBkuUntukNotaModal({ onTarik, onClose }) {
  const { profil } = useAuth()
  const sekolahId = profil?.sekolah_id
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('')
  const [terpilih, setTerpilih] = useState(() => new Set()) // kumpulan row.id

  useEffect(() => {
    if (!sekolahId) {
      setLoading(false)
      return
    }
    supabase
      .from('bku_kas')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .gt('pengeluaran', 0)
      .order('tanggal', { ascending: false })
      .order('no_bukti', { ascending: true })
      .then(({ data }) => {
        setRows(data || [])
        setLoading(false)
      })
  }, [sekolahId])

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.uraian, r.no_bukti, r.kode_rekening].some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [rows, cari])

  // Urutan mengikuti urutan tabel, jadi urutan barang di nota = urutan di BKU.
  const rowTerpilih = useMemo(() => rows.filter((r) => terpilih.has(r.id)), [rows, terpilih])
  const grupAktif = rowTerpilih.length ? kunciGrup(rowTerpilih[0].no_bukti) : null
  const total = rowTerpilih.reduce((s, r) => s + (Number(r.pengeluaran) || 0), 0)

  function toggle(row) {
    // Sudah tercentang -> lepas baris ini saja
    if (terpilih.has(row.id)) {
      const next = new Set(terpilih)
      next.delete(row.id)
      setTerpilih(next)
      return
    }

    const kunci = kunciGrup(row.no_bukti)

    // Tanpa no. bukti -> pilih tunggal
    if (!kunci) {
      setTerpilih(new Set([row.id]))
      return
    }

    // Grup sama dengan pilihan sekarang -> tambahkan baris ini
    if (kunci === grupAktif) {
      const next = new Set(terpilih)
      next.add(row.id)
      setTerpilih(next)
      return
    }

    // Grup baru -> pilih SEMUA baris dengan no. bukti sama
    const semua = rows.filter((r) => kunciGrup(r.no_bukti) === kunci).map((r) => r.id)
    setTerpilih(new Set(semua))
  }

  function konfirmasi() {
    if (rowTerpilih.length === 0) return
    onTarik(rowTerpilih)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-5 pb-2">
          <h2 className="text-lg font-semibold">Tarik Data dari BKU ke Nota</h2>
          <button type="button" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <p className="px-5 text-sm text-gray-500">
          Centang baris pengeluaran. Baris dengan no. bukti yang sama otomatis ikut tercentang.
          Setiap baris yang dipilih menjadi satu baris barang di nota.
        </p>

        <div className="px-5 py-3 relative">
          <Search size={15} className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="border rounded w-full p-2 pl-9 text-sm"
            placeholder="Cari uraian, no. bukti, atau kode rekening..."
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-auto px-5">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2 w-8"></th>
                <th className="p-2 text-left">Tanggal</th>
                <th className="p-2 text-left">No. Bukti</th>
                <th className="p-2 text-left">Uraian</th>
                <th className="p-2 text-left">Kode Rekening</th>
                <th className="p-2 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500">
                    <Loader2 size={16} className="animate-spin inline mr-2" />
                    Memuat data...
                  </td>
                </tr>
              )}
              {!loading && tersaring.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500">
                    Tidak ada data pengeluaran yang cocok.
                  </td>
                </tr>
              )}
              {tersaring.map((r) => {
                const dicentang = terpilih.has(r.id)
                return (
                  <tr
                    key={r.id}
                    onClick={() => toggle(r)}
                    className={`border-t cursor-pointer ${dicentang ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={dicentang}
                        onChange={() => toggle(r)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-2 whitespace-nowrap">{formatTanggal(r.tanggal)}</td>
                    <td className="p-2">{r.no_bukti || '-'}</td>
                    <td className="p-2 max-w-[240px] truncate" title={r.uraian}>{r.uraian}</td>
                    <td className="p-2 whitespace-nowrap">{r.kode_rekening}</td>
                    <td className="p-2 text-right whitespace-nowrap">{formatRupiah(r.pengeluaran)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 p-5 border-t">
          <div className="text-sm">
            {rowTerpilih.length > 0 ? (
              <>
                <b>{rowTerpilih.length}</b> barang dipilih · Total <b>{formatRupiah(total)}</b>
              </>
            ) : (
              <span className="text-gray-400">Belum ada baris dipilih</span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="px-4 py-2 rounded bg-gray-200 text-sm" onClick={onClose}>
              Batal
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded bg-teal-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={rowTerpilih.length === 0}
              onClick={konfirmasi}
            >
              Tarik ke Nota
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
