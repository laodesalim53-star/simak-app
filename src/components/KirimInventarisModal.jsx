import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Package, X, Loader2 } from 'lucide-react'

// Kode rekening belanja modal peralatan/mesin/mebel (mis. 5.2.02.05.02.0001 = kursi sekolah)
const AWALAN_KODE_INVENTARIS = '5.2.02'
const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

const RE_ELEKTRONIK = /komputer|laptop|printer|proyektor|projector|lcd|\btv\b|televisi|speaker|kamera|scanner|kipas|genset|\bac\b|mesin|chromebook|tablet/i
const RE_FURNITUR = /kursi|meja|lemari|\brak\b|papan|bangku|loker|sofa|podium/i

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0)
}

function tebakJenis(uraian) {
  return RE_ELEKTRONIK.test(uraian || '') ? 'peralatan' : 'barang_inventaris'
}

function tebakKategori(uraian) {
  if (RE_ELEKTRONIK.test(uraian || '')) return 'Elektronik'
  if (RE_FURNITUR.test(uraian || '')) return 'Furnitur'
  return ''
}

export default function KirimInventarisModal({ bulan, tahun, sekolahId, onSelesai }) {
  const [open, setOpen] = useState(false)
  const [memuat, setMemuat] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])

  async function bukaModal() {
    setOpen(true)
    setError('')
    setMemuat(true)
    if (!sekolahId) {
      setError('Profil akun belum memuat sekolah_id. Muat ulang halaman lalu coba lagi.')
      setMemuat(false)
      return
    }
    const { data, error: err } = await supabase
      .from('bku_kas')
      .select('*')
      .eq('tahun', tahun)
      .eq('bulan', bulan)
      .gt('pengeluaran', 0)
      .order('tanggal', { ascending: true })
    if (err) {
      setError('Gagal memuat data: ' + err.message)
      setMemuat(false)
      return
    }
    setRows(
      (data || []).map((r) => {
        const sudah = !!r.inventaris_id
        const keBuku = !!r.buku_id
        const adaJumlah = r.jumlah_barang !== null && r.jumlah_barang !== undefined && Number(r.jumlah_barang) > 0
        return {
          ...r,
          nama: (r.uraian || '').trim(),
          jenis: tebakJenis(r.uraian),
          kategori: tebakKategori(r.uraian),
          lokasi: '',
          sudah,
          keBuku,
          adaJumlah,
          pilih: !sudah && !keBuku && adaJumlah && String(r.kode_rekening || '').startsWith(AWALAN_KODE_INVENTARIS),
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

  const bisaDikirim = (r) => !r.sudah && !r.keBuku && r.adaJumlah
  const terpilih = rows.filter((r) => r.pilih && bisaDikirim(r))

  async function handleKirim() {
    if (terpilih.length === 0) return
    setMenyimpan(true)
    setError('')
    let berhasil = 0
    try {
      for (const r of terpilih) {
        const { data: ins, error: err } = await supabase
          .from('inventaris')
          .insert({
            nama_barang: r.nama,
            jenis: r.jenis,
            kategori: r.kategori || null,
            jumlah: Number(r.jumlah_barang),
            kondisi: 'baik',
            lokasi: r.lokasi || null,
            tanggal_masuk: String(r.tanggal).slice(0, 10),
            catatan: `Dari BKU ${NAMA_BULAN[bulan - 1]} ${tahun}${r.no_bukti ? ', bukti ' + r.no_bukti : ''}`,
            sekolah_id: sekolahId,
          })
          .select('id')
          .single()
        if (err) throw err
        const { error: errTandai } = await supabase.from('bku_kas').update({ inventaris_id: ins.id }).eq('id', r.id)
        if (errTandai) throw errTandai
        berhasil++
      }
    } catch (err) {
      setError(`Berhenti setelah ${berhasil} baris: ${err.message || err}. Buka ulang modal ini untuk melihat baris yang sudah terkirim.`)
      setMenyimpan(false)
      onSelesai?.()
      return
    }
    setMenyimpan(false)
    onSelesai?.()
    alert(`Selesai. ${berhasil} barang ditambahkan ke Inventaris.`)
    tutup()
  }

  return (
    <>
      <button className="btn-secondary" onClick={bukaModal}>
        <Package size={16} /> Kirim ke Inventaris
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Kirim Barang ke Inventaris</h2>
                <p className="text-xs text-ink-700/60">
                  Dari BKU {NAMA_BULAN[bulan - 1]} {tahun}. Jumlah Barang menjadi jumlah di Inventaris, kondisi otomatis "Baik".
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
                        <th>Nama Barang</th>
                        <th>Jenis</th>
                        <th>Kategori</th>
                        <th>Lokasi</th>
                        <th>Jml</th>
                        <th>Pengeluaran</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const bisa = bisaDikirim(r)
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
                              <input className="input-field" value={r.nama} disabled={!bisa}
                                onChange={(e) => ubah(r.id, { nama: e.target.value })} />
                            </td>
                            <td>
                              <select className="input-field" value={r.jenis} disabled={!bisa}
                                onChange={(e) => ubah(r.id, { jenis: e.target.value })}>
                                <option value="barang_inventaris">Barang Inventaris</option>
                                <option value="peralatan">Peralatan</option>
                              </select>
                            </td>
                            <td>
                              <input className="input-field" value={r.kategori} disabled={!bisa}
                                onChange={(e) => ubah(r.id, { kategori: e.target.value })} />
                            </td>
                            <td>
                              <input className="input-field" placeholder="Ruang kelas, dll" value={r.lokasi} disabled={!bisa}
                                onChange={(e) => ubah(r.id, { lokasi: e.target.value })} />
                            </td>
                            <td className="font-medium">{r.jumlah_barang ?? '-'}</td>
                            <td>{formatRupiah(r.pengeluaran)}</td>
                            <td className="text-xs whitespace-nowrap">
                              {r.sudah
                                ? 'Sudah ke Inventaris'
                                : r.keBuku
                                ? 'Sudah ke Perpustakaan'
                                : !r.adaJumlah
                                ? 'Isi Jumlah Barang dulu'
                                : 'Siap dikirim'}
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
                      Kirim ke Inventaris
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
