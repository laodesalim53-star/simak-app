import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { Plus, Pencil, Trash2, Search, X, Loader2, ShieldCheck, Upload } from 'lucide-react'

// Halaman "STR & SIP Pegawai" — tenant puskesmas.
// Menulis ke tabel `str_sip_pegawai` (migrasi-str-sip-pegawai.sql), dengan
// pegawai_id merujuk ke `pegawai_puskesmas` (sumber data pegawai yang sama
// dengan DataPegawaiPuskesmas.jsx). Status Aktif/H-90/Kadaluarsa dihitung
// di client dari tanggal_berlaku_str & tanggal_berlaku_sip yang paling dekat.

const H_PERINGATAN = 90 // ambang notifikasi H-90

const emptyForm = {
  pegawai_id: '',
  nomor_str: '',
  tanggal_berlaku_str: '',
  nomor_sip: '',
  tanggal_berlaku_sip: '',
  dokumen_path: '',
  catatan: '',
}

function formatTanggal(tgl) {
  if (!tgl) return null
  try {
    return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return tgl
  }
}

function hitungStatus(row) {
  const tanggals = [row.tanggal_berlaku_str, row.tanggal_berlaku_sip].filter(Boolean)
  if (tanggals.length === 0) return { label: 'Belum diisi', kelas: 'bg-ink-950/5 text-ink-700/50', hariTersisa: null }

  const terdekat = tanggals
    .map((t) => new Date(t))
    .sort((a, b) => a - b)[0]

  const hariTersisa = Math.ceil((terdekat - new Date()) / (1000 * 60 * 60 * 24))

  if (hariTersisa < 0) return { label: 'Kadaluarsa', kelas: 'bg-red-900/10 text-red-900', hariTersisa }
  if (hariTersisa <= H_PERINGATAN) return { label: `H-${hariTersisa}`, kelas: 'bg-amber-500/15 text-amber-700', hariTersisa }
  return { label: 'Aktif', kelas: 'bg-emerald-600/15 text-emerald-700', hariTersisa }
}

export default function StrSipPegawai() {
  const { sekolahId } = useAuth()
  const [data, setData] = useState([])
  const [pegawaiList, setPegawaiList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [{ data: pegawai, error: errPegawai }, { data: strSip, error: errStrSip }] = await Promise.all([
      supabase
        .from('pegawai_puskesmas')
        .select('id, nama_lengkap, jabatan, status')
        .eq('sekolah_id', sekolahId)
        .eq('status', 'aktif')
        .order('nama_lengkap'),
      supabase
        .from('str_sip_pegawai')
        .select('*')
        .eq('sekolah_id', sekolahId),
    ])

    if (errPegawai) console.error('Gagal memuat pegawai:', errPegawai)
    if (errStrSip) {
      console.error('Gagal memuat STR/SIP:', errStrSip)
      alert('Gagal memuat data STR/SIP: ' + errStrSip.message)
    }

    setPegawaiList(pegawai || [])
    setData(strSip || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  const pegawaiMap = useMemo(() => {
    const map = {}
    pegawaiList.forEach((p) => { map[p.id] = p })
    return map
  }, [pegawaiList])

  function openAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      ...emptyForm,
      ...row,
      tanggal_berlaku_str: row.tanggal_berlaku_str ? String(row.tanggal_berlaku_str).slice(0, 10) : '',
      tanggal_berlaku_sip: row.tanggal_berlaku_sip ? String(row.tanggal_berlaku_sip).slice(0, 10) : '',
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  async function handleUploadDokumen(file) {
    if (!file || !sekolahId) return
    setUploading(true)
    const path = `${sekolahId}/str-sip/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('dokumen-str-sip').upload(path, file)
    setUploading(false)
    if (error) {
      alert('Gagal upload dokumen: ' + error.message)
      return
    }
    setForm((f) => ({ ...f, dokumen_path: path }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) {
      alert('Belum ada puskesmas aktif.')
      return
    }
    if (!form.pegawai_id) {
      alert('Pilih pegawai terlebih dahulu.')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      sekolah_id: sekolahId,
      tanggal_berlaku_str: form.tanggal_berlaku_str || null,
      tanggal_berlaku_sip: form.tanggal_berlaku_sip || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = editingId
      ? await supabase.from('str_sip_pegawai').update(payload).eq('id', editingId).eq('sekolah_id', sekolahId)
      : await supabase.from('str_sip_pegawai').insert(payload)
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!sekolahId) return
    if (!confirm('Hapus data STR/SIP ini?')) return
    const { error } = await supabase.from('str_sip_pegawai').delete().eq('id', id).eq('sekolah_id', sekolahId)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  const filtered = data.filter((row) => {
    const pegawai = pegawaiMap[row.pegawai_id]
    const teks = `${pegawai?.nama_lengkap || ''} ${pegawai?.jabatan || ''} ${row.nomor_str || ''} ${row.nomor_sip || ''}`
    return teks.toLowerCase().includes(search.toLowerCase())
  })

  const jumlahPeringatan = data.filter((row) => {
    const s = hitungStatus(row)
    return s.hariTersisa !== null && s.hariTersisa <= H_PERINGATAN
  }).length

  return (
    <Layout
      title="STR & SIP Pegawai"
      subtitle={`${data.length} data tercatat${jumlahPeringatan > 0 ? ` • ${jumlahPeringatan} perlu perhatian` : ''}`}
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Tambah Data
        </button>
      }
    >
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
            <input
              className="input-field pl-9"
              placeholder="Cari nama, jabatan, nomor STR/SIP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr className="border-b-2 border-emerald-600/20">
              <th>Nama</th>
              <th>Jabatan</th>
              <th>No. STR</th>
              <th>Berlaku STR s.d.</th>
              <th>No. SIP</th>
              <th>Berlaku SIP s.d.</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Memuat data...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Belum ada data STR/SIP.</td></tr>
            )}
            {filtered.map((row) => {
              const pegawai = pegawaiMap[row.pegawai_id]
              const status = hitungStatus(row)
              return (
                <tr key={row.id} className="hover:bg-emerald-600/[0.03] transition-colors">
                  <td className="font-medium">{pegawai?.nama_lengkap || '(pegawai dihapus)'}</td>
                  <td>{pegawai?.jabatan}</td>
                  <td className="font-mono text-xs">{row.nomor_str}</td>
                  <td>{formatTanggal(row.tanggal_berlaku_str)}</td>
                  <td className="font-mono text-xs">{row.nomor_sip}</td>
                  <td>{formatTanggal(row.tanggal_berlaku_sip)}</td>
                  <td><span className={`badge ${status.kelas}`}>{status.label}</span></td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(row)} className="p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(row.id)} className="p-2 hover:bg-red-900/10 rounded-lg text-red-900/70">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={19} />
              </div>
              <h2 className="font-display text-xl font-semibold">{editingId ? 'Ubah Data STR/SIP' : 'Tambah Data STR/SIP'}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Pegawai</label>
                <select
                  required
                  className="input-field"
                  value={form.pegawai_id}
                  onChange={(e) => setForm({ ...form, pegawai_id: e.target.value })}
                >
                  <option value="">Pilih pegawai...</option>
                  {pegawaiList.map((p) => (
                    <option key={p.id} value={p.id}>{p.nama_lengkap} — {p.jabatan}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="eyebrow mb-1.5 block">Nomor STR</label>
                <input className="input-field" value={form.nomor_str} onChange={(e) => setForm({ ...form, nomor_str: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Masa Berlaku STR</label>
                <input type="date" className="input-field" value={form.tanggal_berlaku_str} onChange={(e) => setForm({ ...form, tanggal_berlaku_str: e.target.value })} />
              </div>

              <div>
                <label className="eyebrow mb-1.5 block">Nomor SIP</label>
                <input className="input-field" value={form.nomor_sip} onChange={(e) => setForm({ ...form, nomor_sip: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Masa Berlaku SIP</label>
                <input type="date" className="input-field" value={form.tanggal_berlaku_sip} onChange={(e) => setForm({ ...form, tanggal_berlaku_sip: e.target.value })} />
              </div>

              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Dokumen (STR/SIP)</label>
                <label className="input-field flex items-center gap-2 cursor-pointer text-ink-700/60">
                  <Upload size={15} />
                  {uploading ? 'Mengunggah...' : form.dokumen_path ? 'Dokumen terunggah — ganti file' : 'Pilih file'}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleUploadDokumen(e.target.files?.[0])}
                  />
                </label>
              </div>

              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Catatan</label>
                <textarea className="input-field" rows={2} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3 sticky bottom-0 bg-white pt-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving || uploading} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  )
}
