import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Download, X, Loader2, Search } from 'lucide-react'

// Ubah ke true HANYA kalau tabel bku_kas punya kolom sekolah_id yang wajib diisi
// dan belum diisi otomatis oleh trigger/default di database.
const BKU_PUNYA_SEKOLAH_ID = false

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0)
}

/**
 * Tombol + modal "Tarik dari ARKAS" untuk tab BKU.
 * Memilih rincian belanja ARKAS (is_item) lalu menyimpannya sebagai baris
 * pengeluaran di bku_kas pada bulan & tahun yang sedang dipilih.
 *
 * Props:
 *  - tahun, bulan   : filter aktif di halaman Keuangan
 *  - sekolahId      : sekolah akun yang login
 *  - onSelesai()    : dipanggil setelah berhasil menyimpan (muat ulang BKU)
 */
export default function TarikArkasModal({ tahun, bulan, sekolahId, onSelesai }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [realisasi, setRealisasi] = useState({}) // { [arkas_id]: total pengeluaran BKU setahun }
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState({}) // { [arkas_id]: { jumlah, no_bukti } }
  const [tanggal, setTanggal] = useState('')

  const bln = String(bulan).padStart(2, '0')
  const tglMin = `${tahun}-${bln}-01`
  const tglMax = `${tahun}-${bln}-${String(new Date(tahun, bulan, 0).getDate()).padStart(2, '0')}`

  async function bukaModal() {
    setOpen(true)
    setError('')
    setSearch('')
    setPicked({})
    const hariIni = new Date().toISOString().slice(0, 10)
    setTanggal(hariIni >= tglMin && hariIni <= tglMax ? hariIni : tglMin)
    setLoading(true)

    const [arkas, bku] = await Promise.all([
      supabase
        .from('arkas_anggaran')
        .select('id, kode_rekening, kode_kegiatan, uraian, jumlah, no_urut')
        .eq('sekolah_id', sekolahId)
        .eq('tahun_anggaran', String(tahun))
        .eq('is_item', true)
        .order('no_urut', { ascending: true }),
      supabase
        .from('bku_kas')
        .select('arkas_id, pengeluaran')
        .eq('tahun', tahun)
        .not('arkas_id', 'is', null),
    ])

    if (arkas.error) {
      setError('Gagal memuat data ARKAS: ' + arkas.error.message)
      setItems([])
      setLoading(false)
      return
    }
    if (bku.error) {
      setError(
        'Kolom penghubung BKU–ARKAS belum ada di database. Jalankan bku_arkas_link.sql di Supabase SQL Editor dulu. (' +
        bku.error.message + ')'
      )
      setItems([])
      setLoading(false)
      return
    }

    const total = {}
    ;(bku.data || []).forEach((r) => {
      const k = String(r.arkas_id)
      total[k] = (total[k] || 0) + Number(r.pengeluaran || 0)
    })
    setRealisasi(total)
    setItems(arkas.data || [])
    setLoading(false)
  }

  function tutup() {
    if (saving) return
    setOpen(false)
  }

  const sisaDari = (it) => Number(it.jumlah || 0) - (realisasi[String(it.id)] || 0)

  const tampil = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) =>
      `${it.kode_rekening || ''} ${it.kode_kegiatan || ''} ${it.uraian || ''}`.toLowerCase().includes(q)
    )
  }, [items, search])

  function toggle(it) {
    const k = String(it.id)
    setPicked((p) => {
      const n = { ...p }
      if (n[k]) delete n[k]
      else n[k] = { jumlah: String(Math.max(sisaDari(it), 0)), no_bukti: '' }
      return n
    })
  }

  function ubah(it, field, value) {
    const k = String(it.id)
    setPicked((p) => ({ ...p, [k]: { ...p[k], [field]: value } }))
  }

  const semuaTampilTerpilih = tampil.length > 0 && tampil.every((it) => picked[String(it.id)])

  function togglePilihSemua() {
    setPicked((p) => {
      const n = { ...p }
      if (semuaTampilTerpilih) {
        tampil.forEach((it) => delete n[String(it.id)])
      } else {
        tampil.forEach((it) => {
          const k = String(it.id)
          if (!n[k]) n[k] = { jumlah: String(Math.max(sisaDari(it), 0)), no_bukti: '' }
        })
      }
      return n
    })
  }

  const terpilih = items.filter((it) => picked[String(it.id)])
  const totalTarik = terpilih.reduce((a, it) => a + (Number(picked[String(it.id)].jumlah) || 0), 0)

  async function handleSimpan() {
    setError('')
    if (terpilih.length === 0) {
      setError('Pilih minimal satu rincian ARKAS.')
      return
    }
    if (!tanggal || tanggal < tglMin || tanggal > tglMax) {
      setError('Tanggal harus berada di bulan yang sedang dipilih.')
      return
    }

    const rows = []
    const melebihi = []
    for (const it of terpilih) {
      const p = picked[String(it.id)]
      const jumlah = Number(p.jumlah) || 0
      if (jumlah <= 0) {
        setError(`Jumlah untuk "${it.uraian}" harus lebih dari 0.`)
        return
      }
      if (jumlah > sisaDari(it)) melebihi.push(it.uraian)
      rows.push({
        tanggal,
        no_bukti: p.no_bukti.trim() || null,
        uraian: it.uraian,
        penerimaan: 0,
        pengeluaran: jumlah,
        tahun,
        bulan,
        arkas_id: String(it.id),
        kode_rekening: it.kode_rekening || null,
        kode_kegiatan: it.kode_kegiatan || null,
        ...(BKU_PUNYA_SEKOLAH_ID ? { sekolah_id: sekolahId } : {}),
      })
    }

    if (melebihi.length > 0) {
      const ok = confirm(
        `${melebihi.length} rincian melebihi sisa anggaran ARKAS:\n- ` +
        melebihi.slice(0, 5).join('\n- ') +
        (melebihi.length > 5 ? '\n- ...' : '') +
        '\n\nTetap simpan?'
      )
      if (!ok) return
    }

    setSaving(true)
    const { error: err } = await supabase.from('bku_kas').insert(rows)
    setSaving(false)
    if (err) {
      setError('Gagal menyimpan ke BKU: ' + err.message)
      return
    }
    setOpen(false)
    onSelesai?.()
  }

  return (
    <>
      <button className="btn-secondary" onClick={bukaModal} disabled={!sekolahId}>
        <Download size={16} /> Tarik dari ARKAS
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-ink-950/10">
              <div>
                <h2 className="font-display text-lg font-semibold">Tarik dari ARKAS ke BKU</h2>
                <p className="text-xs text-ink-700/60 mt-0.5">
                  Rincian ARKAS tahun {tahun} akan disimpan sebagai pengeluaran BKU bulan {bln}/{tahun}.
                </p>
              </div>
              <button className="icon-btn" onClick={tutup}><X size={18} /></button>
            </div>

            <div className="p-5 pb-3 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="label-field">Cari rincian</label>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
                  <input
                    className="input-field pl-9"
                    placeholder="Kode rekening, kegiatan, atau uraian..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="label-field">Tanggal BKU</label>
                <input
                  type="date"
                  className="input-field"
                  min={tglMin}
                  max={tglMax}
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="mx-5 mb-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}

            <div className="px-5 overflow-auto flex-1">
              <table className="table-shell">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={semuaTampilTerpilih}
                        onChange={togglePilihSemua}
                        disabled={loading || tampil.length === 0}
                        aria-label="Pilih semua yang tampil"
                      />
                    </th>
                    <th>Rekening / Kegiatan</th>
                    <th>Uraian</th>
                    <th>Anggaran</th>
                    <th>Realisasi</th>
                    <th>Sisa</th>
                    <th>Jumlah ditarik</th>
                    <th>No. Bukti</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Memuat data ARKAS...</td></tr>
                  )}
                  {!loading && !error && items.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">
                      Belum ada rincian ARKAS tahun {tahun}. Impor data di tab ARKAS terlebih dulu.
                    </td></tr>
                  )}
                  {!loading && items.length > 0 && tampil.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Tidak ada rincian yang cocok.</td></tr>
                  )}
                  {tampil.map((it) => {
                    const k = String(it.id)
                    const p = picked[k]
                    const sisa = sisaDari(it)
                    const real = realisasi[k] || 0
                    return (
                      <tr key={k} className={p ? 'bg-brass-400/10' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!p}
                            onChange={() => toggle(it)}
                            aria-label={`Pilih ${it.uraian}`}
                          />
                        </td>
                        <td className="text-xs whitespace-nowrap">
                          <div>{it.kode_rekening || '-'}</div>
                          <div className="text-ink-700/50">{it.kode_kegiatan || '-'}</div>
                        </td>
                        <td>{it.uraian}</td>
                        <td className="whitespace-nowrap">{formatRupiah(it.jumlah)}</td>
                        <td className="whitespace-nowrap">{real ? formatRupiah(real) : '-'}</td>
                        <td className={`whitespace-nowrap font-medium ${sisa < 0 ? 'text-red-600' : ''}`}>
                          {formatRupiah(sisa)}
                        </td>
                        <td>
                          {p ? (
                            <input
                              type="number"
                              min="0"
                              className="input-field w-36"
                              value={p.jumlah}
                              onChange={(e) => ubah(it, 'jumlah', e.target.value)}
                            />
                          ) : (
                            <span className="text-ink-700/30">-</span>
                          )}
                        </td>
                        <td>
                          {p ? (
                            <input
                              className="input-field w-32"
                              placeholder="Opsional"
                              value={p.no_bukti}
                              onChange={(e) => ubah(it, 'no_bukti', e.target.value)}
                            />
                          ) : (
                            <span className="text-ink-700/30">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-t border-ink-950/10">
              <p className="text-sm text-ink-700/70">
                {terpilih.length} rincian dipilih · Total <span className="font-semibold text-ink-950">{formatRupiah(totalTarik)}</span>
              </p>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary" onClick={tutup} disabled={saving}>Batal</button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSimpan}
                  disabled={saving || loading || terpilih.length === 0}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Tarik ke BKU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
