import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { Plus, Pencil, Trash2, X, Loader2, BookOpen } from 'lucide-react'
import { formatRupiah, formatTanggal, NAMA_BULAN } from './utils'

// ============================================================
// TAB 2: BKU (BUKU KAS UMUM)
// Memilih kegiatan RKA otomatis mengisi Uraian, Jumlah & Kode Rekening.
// ============================================================

const emptyFormBku = {
  rka_id: '',
  tanggal: new Date().toISOString().slice(0, 10),
  nomor_bukti: '',
  uraian: '',
  kode_rekening: '',
  jenis: 'pengeluaran', // 'penerimaan' | 'pengeluaran'
  jumlah: '',
}

export default function TabBKU() {
  const { sekolahId } = useAuth()
  const [data, setData] = useState([])
  const [rkaList, setRkaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [bulanFilter, setBulanFilter] = useState(new Date().getMonth() + 1)
  const [tahunFilter, setTahunFilter] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyFormBku)
  const [saving, setSaving] = useState(false)

  // BKU dihitung ulang saldo berjalannya (running balance) tiap kali data
  // dimuat/berubah — supaya konsisten walau ada edit/hapus baris lama.
  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)

    // Kolom tambahan (satuan, harga_satuan, sub_komponen, kode_rekening)
    // dipakai untuk auto-isi saat kegiatan RKA dipilih (lihat pilihRka).
    const { data: daftarRka } = await supabase
      .from('rka_bok')
      .select('id, komponen, sub_komponen, rincian_kegiatan, satuan, harga_satuan, kode_rekening')
      .eq('sekolah_id', sekolahId)
      .order('komponen')
      .order('rincian_kegiatan')
    setRkaList(daftarRka || [])

    const tanggalAwal = `${tahunFilter}-${String(bulanFilter).padStart(2, '0')}-01`
    const akhirBulan = new Date(tahunFilter, bulanFilter, 0).getDate()
    const tanggalAkhir = `${tahunFilter}-${String(bulanFilter).padStart(2, '0')}-${String(akhirBulan).padStart(2, '0')}`

    // Ambil SEMUA baris sejak awal tahun s.d. akhir bulan filter, supaya
    // saldo berjalan tetap meneruskan saldo bulan-bulan sebelumnya.
    const { data: rows, error } = await supabase
      .from('bku_bok')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .gte('tanggal', `${tahunFilter}-01-01`)
      .lte('tanggal', tanggalAkhir)
      .order('tanggal')
      .order('dibuat_pada')

    if (error) {
      alert('Gagal memuat BKU: ' + error.message)
      setLoading(false)
      return
    }

    // Saldo berjalan dihitung di sisi client (hanya untuk tampilan/cetak).
    let saldoBerjalan = 0
    const denganSaldo = (rows || []).map((r) => {
      saldoBerjalan += Number(r.penerimaan || 0) - Number(r.pengeluaran || 0)
      return { ...r, saldo_tampilan: saldoBerjalan }
    })

    // Tampilkan hanya baris pada bulan filter.
    const hanyaBulanIni = denganSaldo.filter((r) => r.tanggal >= tanggalAwal && r.tanggal <= tanggalAkhir)

    setData(hanyaBulanIni)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, bulanFilter, tahunFilter])

  // Kelompokkan daftar RKA per Komponen untuk dropdown (optgroup).
  const rkaGrouped = useMemo(() => {
    const map = {}
    for (const r of rkaList) {
      const key = r.komponen || '(Tanpa Komponen)'
      if (!map[key]) map[key] = []
      map[key].push(r)
    }
    return map
  }, [rkaList])

  function openAdd() {
    setForm({ ...emptyFormBku, tanggal: `${tahunFilter}-${String(bulanFilter).padStart(2, '0')}-01` })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      rka_id: row.rka_id || '',
      tanggal: row.tanggal,
      nomor_bukti: row.nomor_bukti || '',
      uraian: row.uraian,
      kode_rekening: row.kode_rekening || '',
      jenis: Number(row.penerimaan) > 0 ? 'penerimaan' : 'pengeluaran',
      jumlah: String(Number(row.penerimaan) > 0 ? row.penerimaan : row.pengeluaran),
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  // Isi otomatis Uraian (rincian_kegiatan), Jumlah (harga_satuan) & Kode
  // Rekening (rka_bok.kode_rekening) — tetap bisa diubah manual.
  function pilihRka(rkaId) {
    const rka = rkaList.find((r) => r.id === rkaId)
    setForm((prev) => ({
      ...prev,
      rka_id: rkaId,
      uraian: rka ? rka.rincian_kegiatan : prev.uraian,
      jumlah: rka ? String(rka.harga_satuan) : prev.jumlah,
      kode_rekening: rka && rka.kode_rekening ? rka.kode_rekening : prev.kode_rekening,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) return
    setSaving(true)
    const jumlah = Number(form.jumlah) || 0
    const payload = {
      sekolah_id: sekolahId,
      rka_id: form.rka_id || null,
      tanggal: form.tanggal,
      nomor_bukti: form.nomor_bukti || null,
      uraian: form.uraian,
      kode_rekening: form.kode_rekening || null,
      penerimaan: form.jenis === 'penerimaan' ? jumlah : 0,
      pengeluaran: form.jenis === 'pengeluaran' ? jumlah : 0,
    }
    const { error } = editingId
      ? await supabase.from('bku_bok').update(payload).eq('id', editingId).eq('sekolah_id', sekolahId)
      : await supabase.from('bku_bok').insert(payload)
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus baris BKU ini?')) return
    const { error } = await supabase.from('bku_bok').delete().eq('id', id).eq('sekolah_id', sekolahId)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  const totalPenerimaan = useMemo(() => data.reduce((s, r) => s + Number(r.penerimaan || 0), 0), [data])
  const totalPengeluaran = useMemo(() => data.reduce((s, r) => s + Number(r.pengeluaran || 0), 0), [data])
  const saldoAkhir = data.length > 0 ? data[data.length - 1].saldo_tampilan : 0

  return (
    <>
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:flex-wrap w-full sm:w-auto">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 hidden sm:flex">
              <BookOpen size={18} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select className="input-field w-full sm:w-36" value={bulanFilter} onChange={(e) => setBulanFilter(Number(e.target.value))}>
                {NAMA_BULAN.map((nama, i) => (
                  <option key={nama} value={i + 1}>{nama}</option>
                ))}
              </select>
              <select className="input-field w-full sm:w-24" value={tahunFilter} onChange={(e) => setTahunFilter(Number(e.target.value))}>
                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map((th) => (
                  <option key={th} value={th}>{th}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn-primary w-full sm:w-auto justify-center" onClick={openAdd}>
            <Plus size={16} /> Tambah Transaksi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="card p-4">
          <p className="text-xs text-ink-700/50 mb-1">Total Penerimaan</p>
          <p className="font-display text-lg font-semibold text-emerald-700">{formatRupiah(totalPenerimaan)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-700/50 mb-1">Total Pengeluaran</p>
          <p className="font-display text-lg font-semibold text-red-800">{formatRupiah(totalPengeluaran)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-700/50 mb-1">Saldo Akhir Bulan</p>
          <p className="font-display text-lg font-semibold text-blue-700">{formatRupiah(saldoAkhir)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>No. Bukti</th>
              <th>Uraian</th>
              <th>Kode Rekening</th>
              <th>Penerimaan</th>
              <th>Pengeluaran</th>
              <th>Saldo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Memuat data...</td></tr>
            )}
            {!loading && data.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Belum ada transaksi bulan ini.</td></tr>
            )}
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-emerald-600/[0.03] transition-colors">
                <td className="whitespace-nowrap text-xs">{formatTanggal(r.tanggal)}</td>
                <td className="font-mono text-xs">{r.nomor_bukti || '-'}</td>
                <td className="font-medium">{r.uraian}</td>
                <td className="text-xs">{r.kode_rekening || '-'}</td>
                <td className="text-emerald-700">{Number(r.penerimaan) > 0 ? formatRupiah(r.penerimaan) : '-'}</td>
                <td className="text-red-800">{Number(r.pengeluaran) > 0 ? formatRupiah(r.pengeluaran) : '-'}</td>
                <td className="font-semibold">{formatRupiah(r.saldo_tampilan)}</td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(r)} className="p-2.5 sm:p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70 touch-manipulation">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="p-2.5 sm:p-2 hover:bg-red-900/10 rounded-lg text-red-900/70 touch-manipulation">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-2 sm:p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900 p-1 touch-manipulation">
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-4">{editingId ? 'Ubah Transaksi BKU' : 'Tambah Transaksi BKU'}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="eyebrow mb-1.5 block">Tanggal</label>
                <input type="date" required className="input-field" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">No. Bukti</label>
                <input className="input-field" value={form.nomor_bukti} onChange={(e) => setForm({ ...form, nomor_bukti: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Kegiatan RKA Terkait (opsional)</label>
                <select className="input-field" value={form.rka_id} onChange={(e) => pilihRka(e.target.value)}>
                  <option value="">— Tidak tertaut —</option>
                  {Object.entries(rkaGrouped).map(([komponen, items]) => (
                    <optgroup key={komponen} label={komponen}>
                      {items.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.rincian_kegiatan} ({formatRupiah(r.harga_satuan)}/{r.satuan || 'satuan'})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-xs text-ink-700/40 mt-1">
                  Memilih kegiatan akan mengisi Uraian, Jumlah & Kode Rekening secara otomatis (sesuai acuan RKA) — tetap bisa diubah manual.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Uraian</label>
                <input required className="input-field" value={form.uraian} onChange={(e) => setForm({ ...form, uraian: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Kode Rekening</label>
                <input className="input-field" value={form.kode_rekening} onChange={(e) => setForm({ ...form, kode_rekening: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Jenis</label>
                <select className="input-field" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}>
                  <option value="pengeluaran">Pengeluaran</option>
                  <option value="penerimaan">Penerimaan</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Jumlah (Rp)</label>
                <input type="number" min="0" required className="input-field" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} />
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button type="button" className="btn-secondary w-full sm:w-auto justify-center" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto justify-center">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
