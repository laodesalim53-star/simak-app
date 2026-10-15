import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { eksporExcel } from '../lib/exportUtils'
import { Plus, Search, Pencil, Trash2, X, Loader2, FileSpreadsheet, RefreshCw } from 'lucide-react'

const emptyForm = {
  jenis: 'masuk',
  nomor_surat: '',
  perihal: '',
  pengirim_tujuan: '',
  tanggal: new Date().toISOString().slice(0, 10),
  file_url: '',
  catatan: '',
}

// Daftar sumber data surat dari bagian lain aplikasi.
// SESUAIKAN nama tabel dan kolom dengan yang ada di databasemu.
const SUMBER_OTOMATIS = [
  {
    sumber: 'surat_pengantar', // label unik sumber (jangan diubah setelah dipakai)
    tabel: 'surat_pengantar', // nama tabel asal
    jenis: 'keluar',
    map: (r) => ({
      nomor_surat: r.nomor_surat,
      perihal: r.perihal || 'Surat Pengantar',
      pengirim_tujuan: r.tujuan,
      tanggal: r.tanggal,
    }),
  },
  // Contoh surat masuk, aktifkan dan sesuaikan jika ada tabelnya:
  // {
  //   sumber: 'disposisi',
  //   tabel: 'disposisi',
  //   jenis: 'masuk',
  //   map: (r) => ({
  //     nomor_surat: r.nomor_surat,
  //     perihal: r.perihal,
  //     pengirim_tujuan: r.asal_surat,
  //     tanggal: r.tanggal_terima,
  //   }),
  // },
]

export default function Surat() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('semua')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function syncOtomatis() {
    setSyncing(true)
    try {
      for (const s of SUMBER_OTOMATIS) {
        const { data: rows, error } = await supabase.from(s.tabel).select('*')
        if (error) {
          console.warn(`Sinkron ${s.sumber} gagal:`, error.message)
          continue
        }
        if (!rows?.length) continue

        const payload = rows.map((r) => ({
          ...s.map(r),
          jenis: s.jenis,
          sumber: s.sumber,
          sumber_id: String(r.id),
        }))

        // ignoreDuplicates: baris yang sudah ada tidak ditimpa,
        // jadi koreksi manual di arsip tetap aman
        const { error: errUpsert } = await supabase
          .from('surat')
          .upsert(payload, { onConflict: 'sumber,sumber_id', ignoreDuplicates: true })
        if (errUpsert) console.warn(`Simpan ${s.sumber} gagal:`, errUpsert.message)
      }
    } finally {
      setSyncing(false)
    }
  }

  async function loadData() {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('surat')
      .select('*')
      .order('tanggal', { ascending: false })
    if (error) console.warn('Gagal memuat surat:', error.message)
    setData(rows || [])
    setLoading(false)
  }

  async function tarikData() {
    await syncOtomatis()
    await loadData()
  }

  useEffect(() => {
    tarikData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openAdd(jenis) {
    setForm({ ...emptyForm, jenis })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      jenis: row.jenis,
      nomor_surat: row.nomor_surat || '',
      perihal: row.perihal || '',
      pengirim_tujuan: row.pengirim_tujuan || '',
      tanggal: row.tanggal,
      file_url: row.file_url || '',
      catatan: row.catatan || '',
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = editingId
      ? await supabase.from('surat').update(form).eq('id', editingId)
      : await supabase.from('surat').insert(form)
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus surat ini?')) return
    const { error } = await supabase.from('surat').delete().eq('id', id)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  const filtered = data.filter((d) => {
    const cocokJenis = filterJenis === 'semua' || d.jenis === filterJenis
    const cocokCari = `${d.perihal || ''} ${d.nomor_surat || ''} ${d.pengirim_tujuan || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
    return cocokJenis && cocokCari
  })

  function handleExport() {
    eksporExcel(
      filtered.map((d) => ({
        Jenis: d.jenis === 'masuk' ? 'Surat Masuk' : 'Surat Keluar',
        'Nomor Surat': d.nomor_surat,
        Perihal: d.perihal,
        'Pengirim/Tujuan': d.pengirim_tujuan,
        Tanggal: d.tanggal,
        Catatan: d.catatan,
      })),
      'arsip-surat',
      'Surat'
    )
  }

  return (
    <Layout
      title="Surat Masuk & Keluar"
      subtitle={`${data.length} surat terarsip`}
      actions={
        <>
          <button className="btn-secondary" disabled={syncing} onClick={tarikData}>
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Tarik Data
          </button>
          <button className="btn-secondary" onClick={handleExport}>
            <FileSpreadsheet size={16} /> Ekspor Excel
          </button>
          <button className="btn-secondary" onClick={() => openAdd('masuk')}>
            <Plus size={16} /> Surat Masuk
          </button>
          <button className="btn-primary" onClick={() => openAdd('keluar')}>
            <Plus size={16} /> Surat Keluar
          </button>
        </>
      }
    >
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
          <input
            className="input-field pl-9"
            placeholder="Cari perihal, nomor, atau pengirim/tujuan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field w-auto" value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)}>
          <option value="semua">Semua Jenis</option>
          <option value="masuk">Surat Masuk</option>
          <option value="keluar">Surat Keluar</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Nomor Surat</th>
              <th>Perihal</th>
              <th>Pengirim / Tujuan</th>
              <th>Tanggal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center py-8 text-ink-700/50">Memuat data...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-ink-700/50">Belum ada data.</td></tr>
            )}
            {filtered.map((d) => (
              <tr key={d.id}>
                <td>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    d.jenis === 'masuk' ? 'bg-sage-500/10 text-sage-500' : 'bg-brass-400/20 text-brass-600'
                  }`}>
                    {d.jenis === 'masuk' ? 'Masuk' : 'Keluar'}
                  </span>
                </td>
                <td>{d.nomor_surat || '-'}</td>
                <td className="font-medium">
                  {d.perihal}
                  {d.sumber && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-ink-700/10 text-ink-700/60">
                      Otomatis
                    </span>
                  )}
                </td>
                <td>{d.pengirim_tujuan || '-'}</td>
                <td>{d.tanggal}</td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button className="icon-btn" onClick={() => openEdit(d)}><Pencil size={15} /></button>
                    <button className="icon-btn text-red-600" onClick={() => handleDelete(d.id)}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">
                {editingId ? 'Ubah Surat' : form.jenis === 'masuk' ? 'Tambah Surat Masuk' : 'Tambah Surat Keluar'}
              </h2>
              <button className="icon-btn" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label-field">Jenis</label>
                <select
                  className="input-field"
                  value={form.jenis}
                  onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                >
                  <option value="masuk">Surat Masuk</option>
                  <option value="keluar">Surat Keluar</option>
                </select>
              </div>
              <div>
                <label className="label-field">Perihal *</label>
                <input
                  required
                  className="input-field"
                  value={form.perihal}
                  onChange={(e) => setForm({ ...form, perihal: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Nomor Surat</label>
                  <input
                    className="input-field"
                    value={form.nomor_surat}
                    onChange={(e) => setForm({ ...form, nomor_surat: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-field">Tanggal *</label>
                  <input
                    required
                    type="date"
                    className="input-field"
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label-field">
                  {form.jenis === 'masuk' ? 'Pengirim' : 'Tujuan'}
                </label>
                <input
                  className="input-field"
                  value={form.pengirim_tujuan}
                  onChange={(e) => setForm({ ...form, pengirim_tujuan: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Catatan</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
