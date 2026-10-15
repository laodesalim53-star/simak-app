import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Library, X, Loader2 } from 'lucide-react'

const KODE_BUKU = '5.2.05.01.01.0001'
const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0)
}

// "Matematika Kelas 4" -> "Buku Pelajaran Kelas 4"
function tebakKategori(uraian) {
  const m = String(uraian || '').match(/kelas\s*(\d{1,2})/i)
  return m ? `Buku Pelajaran Kelas ${m[1]}` : 'Buku Pelajaran'
}

export default function KirimBukuPerpustakaanModal({ bulan, tahun, sekolahId, onSelesai }) {
  const [open, setOpen] = useState(false)
  const [memuat, setMemuat] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([]) // baris BKU + state pilihan
  const [bukuAda, setBukuAda] = useState([])

  async function bukaModal() {
    setOpen(true)
    setError('')
    setMemuat(true)
    if (!sekolahId) {
      setError('Profil akun belum memuat sekolah_id. Muat ulang halaman lalu coba lagi.')
      setMemuat(false)
      return
    }
    const [bku, buku] = await Promise.all([
      supabase.from('bku_kas').select('*').eq('tahun', tahun).eq('bulan', bulan).gt('pengeluaran', 0).order('tanggal', { ascending: true }),
      supabase.from('buku').select('id, judul, jumlah_total, jumlah_tersedia').eq('sekolah_id', sekolahId),
    ])
    if (bku.error || buku.error) {
      setError('Gagal memuat data: ' + (bku.error || buku.error).message)
      setMemuat(false)
      return
    }
    setBukuAda(buku.data || [])
    setRows(
      (bku.data || []).map((r) => {
        const sudah = !!r.buku_id
        const adaJumlah = r.jumlah_barang !== null && r.jumlah_barang !== undefined && Number(r.jumlah_barang) > 0
        return {
          ...r,
          judul: (r.uraian || '').trim(),
          kategori: tebakKategori(r.uraian),
          sudah,
          adaJumlah,
          pilih: !sudah && adaJumlah && r.kode_rekening === KODE_BUKU,
        }
      })
    )
    setMemuat(false)
  }

  function tutup() {
    setOpen(false)
    setRows([])
    setError('')
  }

  function ubah(id, patch) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const terpilih = rows.filter((r) => r.pilih && !r.sudah && r.adaJumlah)

  async function handleKirim() {
    if (terpilih.length === 0) return
    setMenyimpan(true)
    setError('')

    // Kelompokkan per judul (judul sama dalam satu pengiriman dijumlahkan)
    const grup = new Map()
    for (const r of terpilih) {
      const kunci = norm(r.judul)
      if (!grup.has(kunci)) grup.set(kunci, { judul: r.judul, kategori: r.kategori, qty: 0, bkuIds: [] })
      const g = grup.get(kunci)
      g.qty += Number(r.jumlah_barang)
      g.bkuIds.push(r.id)
    }

    let baru = 0
    let ditambah = 0
    try {
      for (const g of grup.values()) {
        const ada = bukuAda.find((b) => norm(b.judul) === norm(g.judul))
        let bukuId
        if (ada) {
          const { error: err } = await supabase
            .from('buku')
            .update({
              jumlah_total: Number(ada.jumlah_total) + g.qty,
              jumlah_tersedia: Number(ada.jumlah_tersedia) + g.qty,
            })
            .eq('id', ada.id)
          if (err) throw err
          bukuId = ada.id
          ditambah++
        } else {
          const { data: ins, error: err } = await supabase
            .from('buku')
            .insert({
              judul: g.judul,
              kategori: g.kategori,
              tahun_terbit: String(tahun),
              jumlah_total: g.qty,
              jumlah_tersedia: g.qty,
              sekolah_id: sekolahId,
            })
            .select('id')
            .single()
          if (err) throw err
          bukuId = ins.id
          baru++
        }
        // tandai baris BKU sudah dikirim (supaya tidak terkirim dua kali)
        const { error: errTandai } = await supabase.from('bku_kas').update({ buku_id: bukuId }).in('id', g.bkuIds)
        if (errTandai) throw errTandai
      }
    } catch (err) {
      setError('Berhenti di tengah proses: ' + (err.message || err) + '. Buka ulang modal ini untuk melihat baris yang sudah terkirim.')
      setMenyimpan(false)
      onSelesai?.()
      return
    }

    setMenyimpan(false)
    onSelesai?.()
    alert(`Selesai. ${baru} judul baru ditambahkan ke perpustakaan, ${ditambah} judul lama bertambah stoknya.`)
    tutup()
  }

  return (
    <>
      <button className="btn-secondary" onClick={bukaModal}>
        <Library size={16} /> Kirim Buku ke Perpustakaan
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Kirim Buku ke Perpustakaan</h2>
                <p className="text-xs text-ink-700/60">
                  Dari BKU {NAMA_BULAN[bulan - 1]} {tahun}. Jumlah Barang menjadi stok buku. Judul yang sudah ada hanya ditambah stoknya.
                </p>
              </div>
              <button className="icon-btn" onClick={tutup}><X size={18} /></button>
            </div>

            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            {memuat && (
              <p className="flex items-center gap-2 text-sm text-ink-700/70">
                <Loader2 size={16} className="animate-spin" /> Memuat data...
              </p>
            )}

            {!memuat && rows.length === 0 && !error && (
              <p className="text-sm text-ink-700/60 py-6 text-center">Tidak ada baris pengeluaran di BKU bulan ini.</p>
            )}

            {!memuat && rows.length > 0 && (
              <>
                <div className="overflow-auto border border-ink-950/10 rounded-lg mb-3">
                  <table className="table-shell">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Tanggal</th>
                        <th>Judul Buku</th>
                        <th>Kategori</th>
                        <th>Jml</th>
                        <th>Pengeluaran</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const bisa = !r.sudah && r.adaJumlah
                        const sudahAda = bukuAda.some((b) => norm(b.judul) === norm(r.judul))
                        return (
                          <tr key={r.id} className={bisa ? '' : 'opacity-60'}>
                            <td>
                              <input
                                type="checkbox"
                                checked={r.pilih && bisa}
                                disabled={!bisa}
                                onChange={(e) => ubah(r.id, { pilih: e.target.checked })}
                              />
                            </td>
                            <td className="whitespace-nowrap">{String(r.tanggal).slice(0, 10)}</td>
                            <td>
                              <input
                                className="input-field"
                                value={r.judul}
                                disabled={!bisa}
                                onChange={(e) => ubah(r.id, { judul: e.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                className="input-field"
                                value={r.kategori}
                                disabled={!bisa}
                                onChange={(e) => ubah(r.id, { kategori: e.target.value })}
                              />
                            </td>
                            <td className="font-medium">{r.jumlah_barang ?? '-'}</td>
                            <td>{formatRupiah(r.pengeluaran)}</td>
                            <td className="text-xs whitespace-nowrap">
                              {r.sudah
                                ? 'Sudah dikirim'
                                : !r.adaJumlah
                                ? 'Isi Jumlah Barang dulu'
                                : sudahAda
                                ? 'Tambah stok'
                                : 'Buku baru'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-700/70">{terpilih.length} baris dipilih</p>
                  <div className="flex gap-3">
                    <button className="btn-secondary" onClick={tutup} disabled={menyimpan}>Batal</button>
                    <button className="btn-primary" onClick={handleKirim} disabled={menyimpan || terpilih.length === 0}>
                      {menyimpan && <Loader2 size={16} className="animate-spin" />}
                      Kirim ke Perpustakaan
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
