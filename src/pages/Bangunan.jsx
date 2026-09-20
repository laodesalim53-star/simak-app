import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { eksporExcel } from '../lib/exportUtils'
import { Plus, Search, Pencil, Trash2, X, Loader2, FileSpreadsheet } from 'lucide-react'

const emptyForm = {
  nama: '',
  jenis: '',
  jumlah: 1,
  luas_m2: '',
  tahun_dibangun: '',
  status_kepemilikan: '',
  kondisi: 'baik',
  catatan: '',
}

const kondisiLabel = {
  baik: 'Baik',
  rusak_ringan: 'Rusak Ringan',
  rusak_berat: 'Rusak Berat',
}

const statusKepemilikan = ['Milik sendiri', 'Pinjam pakai', 'Sewa', 'Hibah']

// Saran jenis bangunan (kolom Jenis boleh juga diketik sendiri).
const saranSekolah = [
  'Ruang Kelas',
  'Ruang Guru',
  'Ruang Kepala Sekolah',
  'Ruang Tata Usaha',
  'Perpustakaan',
  'Laboratorium',
  'Mushalla',
  'Toilet/WC',
  'Kantin',
  'Rumah Dinas',
  'Gudang',
]
const saranKantor = [
  'Gedung Kantor',
  'Ruang Pelayanan',
  'Balai Nikah',
  'Ruang Kepala',
  'Mushalla',
  'Toilet/WC',
  'Rumah Dinas',
  'Gudang',
]

export default function Bangunan() {
  const { isKantor } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    setLoading(true)
    const { data: rows, error } = await supabase.from('bangunan').select('*').order('nama')
    if (error) alert('Gagal memuat data bangunan: ' + error.message)
    setData(rows || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function openAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      ...emptyForm,
      nama: row.nama || '',
      jenis: row.jenis || '',
      jumlah: row.jumlah ?? 1,
      luas_m2: row.luas_m2 ?? '',
      tahun_dibangun: row.tahun_dibangun ?? '',
      status_kepemilikan: row.status_kepemilikan || '',
      kondisi: row.kondisi || 'baik',
      catatan: row.catatan || '',
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    // Kolom angka yang dikosongkan dikirim sebagai null (0 untuk jumlah), supaya
    // tidak memicu error "invalid input syntax for type integer/numeric".
    // sekolah_id tidak dikirim: diisi otomatis oleh trigger di database.
    const payload = {
      nama: form.nama.trim(),
      jenis: form.jenis.trim() || null,
      jumlah: Number(form.jumlah) || 0,
      luas_m2: form.luas_m2 === '' ? null : Number(form.luas_m2),
      tahun_dibangun: form.tahun_dibangun === '' ? null : Number(form.tahun_dibangun),
      status_kepemilikan: form.status_kepemilikan || null,
      kondisi: form.kondisi,
      catatan: form.catatan.trim() || null,
    }
    const { error } = editingId
      ? await supabase.from('bangunan').update(payload).eq('id', editingId)
      : await supabase.from('bangunan').insert(payload)
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus data bangunan ini?')) return
    const { error } = await supabase.from('bangunan').delete().eq('id', id)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  const filtered = data.filter((d) =>
    `${d.nama} ${d.jenis || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  function handleExport() {
    eksporExcel(
      filtered.map((d) => ({
        'Nama Bangunan': d.nama,
        Jenis: d.jenis,
        Jumlah: d.jumlah,
        'Luas (m2)': d.luas_m2,
        'Tahun Dibangun': d.tahun_dibangun,
        'Status Kepemilikan': d.status_kepemilikan,
        Kondisi: kondisiLabel[d.kondisi] || d.kondisi,
        Catatan: d.catatan,
      })),
      'kondisi-bangunan',
      'Bangunan'
    )
  }

  const hitung = (k) =>
    data.filter((d) => d.kondisi === k).reduce((t, d) => t + (Number(d.jumlah) || 0), 0)
  const total = data.reduce((t, d) => t + (Number(d.jumlah) || 0), 0)
  const saran = isKantor ? saranKantor : saranSekolah

  return (
    <Layout
      title="Kondisi Bangunan"
      subtitle="Data gedung dan ruang — ringkasannya terisi otomatis di laporan Kepala"
      actions={
        <>
          <button className="btn-secondary" onClick={handleExport}>
            <FileSpreadsheet size={16} /> Ekspor Excel
          </button>
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Tambah Bangunan
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          ['Total unit', total, ''],
          ['Baik', hitung('baik'), 'text-sage-500'],
          ['Rusak Ringan', hitung('rusak_ringan'), 'text-amber-600'],
          ['Rusak Berat', hitung('rusak_berat'), 'text-red-700'],
        ].map(([label, nilai, warna]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-ink-700/60">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${warna}`}>{nilai}</p>
          </div>
        ))}
      </div>

      <div className="card p-4 mb-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
          <input
            className="input-field pl-9"
            placeholder="Cari nama atau jenis bangunan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Nama Bangunan</th>
              <th>Jenis</th>
              <th>Jumlah</th>
              <th>Luas (m²)</th>
              <th>Tahun</th>
              <th>Kondisi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="text-center py-8 text-ink-700/50">Memuat data...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-ink-700/50">Belum ada data.</td></tr>
            )}
            {filtered.map((d) => (
              <tr key={d.id}>
                <td className="font-medium">{d.nama}</td>
                <td>{d.jenis || '-'}</td>
                <td>{d.jumlah}</td>
                <td>{d.luas_m2 ?? '-'}</td>
                <td>{d.tahun_dibangun ?? '-'}</td>
                <td>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      d.kondisi === 'baik'
                        ? 'bg-sage-500/10 text-sage-500'
                        : d.kondisi === 'rusak_ringan'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {kondisiLabel[d.kondisi] || d.kondisi}
                  </span>
                </td>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">
                {editingId ? 'Ubah Bangunan' : 'Tambah Bangunan'}
              </h2>
              <button className="icon-btn" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label-field">Nama Bangunan / Ruang *</label>
                <input
                  required
                  className="input-field"
                  placeholder={isKantor ? 'Gedung Kantor, Balai Nikah, dll' : 'Ruang Kelas I, Perpustakaan, dll'}
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Jenis</label>
                  <input
                    className="input-field"
                    list="saran-jenis-bangunan"
                    placeholder="Pilih atau ketik"
                    value={form.jenis}
                    onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                  />
                  <datalist id="saran-jenis-bangunan">
                    {saran.map((j) => (
                      <option key={j} value={j} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="label-field">Jumlah unit</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={form.jumlah}
                    onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Kondisi</label>
                  <select
                    className="input-field"
                    value={form.kondisi}
                    onChange={(e) => setForm({ ...form, kondisi: e.target.value })}
                  >
                    <option value="baik">Baik</option>
                    <option value="rusak_ringan">Rusak Ringan</option>
                    <option value="rusak_berat">Rusak Berat</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Status Kepemilikan</label>
                  <select
                    className="input-field"
                    value={form.status_kepemilikan}
                    onChange={(e) => setForm({ ...form, status_kepemilikan: e.target.value })}
                  >
                    <option value="">— Pilih —</option>
                    {statusKepemilikan.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Luas (m²)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field"
                    value={form.luas_m2}
                    onChange={(e) => setForm({ ...form, luas_m2: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-field">Tahun Dibangun</label>
                  <input
                    type="number"
                    min="1800"
                    max="2100"
                    className="input-field"
                    value={form.tahun_dibangun}
                    onChange={(e) => setForm({ ...form, tahun_dibangun: e.target.value })}
                  />
                </div>
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
