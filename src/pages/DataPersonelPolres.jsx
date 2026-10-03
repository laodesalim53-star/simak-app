import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { Loader2, Plus, Search, X, Pencil, Trash2, Shield } from 'lucide-react'

// Laman Data Personel Polres (tenant jenis_organisasi === 'polres').
// Tabel: personel_polres (lihat personel_polres.sql), dipisah per tenant lewat sekolah_id.

const STATUS = [
  { k: 'aktif', l: 'Aktif', warna: 'bg-emerald-100 text-emerald-800' },
  { k: 'mutasi', l: 'Mutasi', warna: 'bg-amber-100 text-amber-800' },
  { k: 'pensiun', l: 'Pensiun', warna: 'bg-gray-200 text-gray-700' },
]
const infoStatus = (k) => STATUS.find((s) => s.k === k) || STATUS[0]

// Daftar saran saja; boleh diisi bebas (mis. golongan untuk PNS Polri).
const PANGKAT = [
  'Bharada', 'Bharatu', 'Bharaka', 'Abripda', 'Abriptu', 'Abrip', 'Bripda', 'Briptu',
  'Brigadir', 'Bripka', 'Aipda', 'Aiptu', 'Ipda', 'Iptu', 'AKP', 'Kompol', 'AKBP',
  'Kombes', 'Brigjen', 'Irjen', 'Komjen', 'Jenderal',
]

const FORM_KOSONG = {
  nama: '', nrp: '', pangkat: '', jabatan: '', satuan_unit: '', no_hp: '', status: 'aktif',
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label-field">{label}</label>
      {children}
    </div>
  )
}

export default function DataPersonelPolres() {
  const { sekolahId } = useAuth()
  const [daftar, setDaftar] = useState([])
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [form, setForm] = useState(null) // null = form tertutup
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  async function muat() {
    if (!sekolahId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('personel_polres')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('nama')
    if (error) alert('Gagal memuat data personel: ' + error.message)
    setDaftar(data || [])
    setLoading(false)
  }
  useEffect(() => { muat() }, [sekolahId]) // eslint-disable-line react-hooks/exhaustive-deps

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return daftar.filter((p) => {
      if (fStatus && p.status !== fStatus) return false
      if (!q) return true
      return [p.nama, p.nrp, p.pangkat, p.jabatan, p.satuan_unit]
        .some((v) => v?.toLowerCase().includes(q))
    })
  }, [daftar, cari, fStatus])

  function tambah() {
    setEditId(null)
    setForm({ ...FORM_KOSONG })
  }

  function ubah(p) {
    const baru = { ...FORM_KOSONG }
    for (const k of Object.keys(FORM_KOSONG)) baru[k] = p[k] ?? FORM_KOSONG[k]
    setEditId(p.id)
    setForm(baru)
  }

  function tutup() {
    setForm(null)
    setEditId(null)
  }

  async function simpan(e) {
    e.preventDefault()
    if (saving) return
    if (!form.nama.trim()) return alert('Nama wajib diisi.')
    setSaving(true)

    const payload = { diperbarui_pada: new Date().toISOString() }
    for (const k of Object.keys(FORM_KOSONG)) payload[k] = form[k]?.toString().trim() || null
    payload.status = form.status || 'aktif'

    const { error } = editId
      ? await supabase.from('personel_polres').update(payload).eq('id', editId)
      : await supabase.from('personel_polres').insert({ sekolah_id: sekolahId, ...payload })

    setSaving(false)
    if (error) {
      return alert('Gagal menyimpan: ' + (error.code === '23505' ? 'NRP sudah terdaftar.' : error.message))
    }
    tutup()
    muat()
  }

  async function hapus(p) {
    if (!confirm(`Hapus data personel ${p.nama}?`)) return
    const { error } = await supabase.from('personel_polres').delete().eq('id', p.id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    muat()
  }

  return (
    <Layout title="Data Personel" subtitle={`${daftar.length} personel terdaftar`}>
      <div className="space-y-5">
        <div className="card p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="label-field">Cari</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
                <input
                  className="input-field !pl-9"
                  placeholder="Nama, NRP, pangkat, jabatan, unit"
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label-field">Status</label>
              <select className="input-field" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="">Semua</option>
                {STATUS.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={tambah}>
              <Plus size={16} /> Tambah Personel
            </button>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-ink-700/50">
              <Loader2 size={20} className="animate-spin inline-block mr-2" /> Memuat data...
            </div>
          ) : tersaring.length === 0 ? (
            <div className="p-10 text-center text-ink-700/60">
              <Shield size={28} className="inline-block mb-2 text-ink-700/30" />
              <p>
                {daftar.length === 0
                  ? 'Belum ada personel. Klik "Tambah Personel" untuk mencatat personel pertama.'
                  : 'Tidak ada personel yang cocok dengan filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-700/60 bg-black/[0.03]">
                    <th className="py-2.5 px-4 font-medium">Nama</th>
                    <th className="py-2.5 px-4 font-medium">NRP</th>
                    <th className="py-2.5 px-4 font-medium">Pangkat</th>
                    <th className="py-2.5 px-4 font-medium">Jabatan / Unit</th>
                    <th className="py-2.5 px-4 font-medium">No. HP</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {tersaring.map((p) => {
                    const s = infoStatus(p.status)
                    return (
                      <tr key={p.id} className="border-t border-ink-700/10 align-top">
                        <td className="py-3 px-4 font-medium">{p.nama}</td>
                        <td className="py-3 px-4">{p.nrp || '-'}</td>
                        <td className="py-3 px-4">{p.pangkat || '-'}</td>
                        <td className="py-3 px-4">
                          <div>{p.jabatan || '-'}</div>
                          <div className="text-xs text-ink-700/60">{p.satuan_unit || ''}</div>
                        </td>
                        <td className="py-3 px-4">{p.no_hp || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.warna}`}>{s.l}</span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button className="p-1 rounded hover:bg-black/5" onClick={() => ubah(p)} aria-label="Ubah">
                            <Pencil size={15} />
                          </button>
                          <button className="p-1 rounded hover:bg-black/5" onClick={() => hapus(p)} aria-label="Hapus">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto p-4" onClick={tutup}>
          <div
            className="card w-full max-w-2xl mx-auto my-6 p-5 bg-white"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="font-semibold text-lg">{editId ? 'Ubah Personel' : 'Tambah Personel'}</h2>
              <button type="button" className="p-1 rounded hover:bg-black/5" onClick={tutup} aria-label="Tutup">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={simpan} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama Lengkap" className="sm:col-span-2">
                  <input className="input-field" value={form.nama} onChange={(e) => set('nama', e.target.value)} />
                </Field>
                <Field label="NRP">
                  <input className="input-field" value={form.nrp} onChange={(e) => set('nrp', e.target.value)} />
                </Field>
                <Field label="Pangkat">
                  <input className="input-field" list="daftar-pangkat" value={form.pangkat}
                    onChange={(e) => set('pangkat', e.target.value)} />
                  <datalist id="daftar-pangkat">{PANGKAT.map((x) => <option key={x} value={x} />)}</datalist>
                </Field>
                <Field label="Jabatan">
                  <input className="input-field" value={form.jabatan} onChange={(e) => set('jabatan', e.target.value)}
                    placeholder="Contoh: Kanit Idik" />
                </Field>
                <Field label="Satuan / Unit">
                  <input className="input-field" value={form.satuan_unit} onChange={(e) => set('satuan_unit', e.target.value)}
                    placeholder="Contoh: Satreskrim" />
                </Field>
                <Field label="No. HP">
                  <input className="input-field" inputMode="tel" value={form.no_hp} onChange={(e) => set('no_hp', e.target.value)} />
                </Field>
                <Field label="Status">
                  <select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>
                    {STATUS.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
                  </select>
                </Field>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn-secondary" onClick={tutup}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving && <Loader2 size={16} className="animate-spin" />} Simpan Personel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
