import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import TeleponLink from '../components/TeleponLink'
import { Plus, Pencil, Trash2, Search, X, Loader2, Briefcase } from 'lucide-react'

// Halaman "Data Pegawai" KHUSUS tenant kantor — menulis ke tabel `pegawai_kantor`
// (dibuat lewat migrasi-pegawai-kantor-kepegawaian.sql +
// migrasi-tambah-kolom-kepegawaian-pegawai-kantor.sql), BUKAN ke tabel `guru`.
// Ini SENGAJA dipisah dari Guru.jsx/Data Guru supaya:
//  1) Data pegawai kantor tidak tercampur dengan data guru sekolah.
//  2) Field-field di sini relevan untuk kantor (tidak ada NUPTK, mata
//     pelajaran, karpeg, dsb — itu semua konsep khusus tenaga pendidik).
const emptyForm = {
  nama_lengkap: '',
  nip: '',
  nik: '',
  jenis_kelamin: 'L',
  tempat_lahir: '',
  tanggal_lahir: '',
  agama: '',
  pendidikan_terakhir: '',
  jabatan: '',
  status_kepegawaian: '',
  pangkat_golongan: '',
  sk_pengangkatan: '',
  tmt_pengangkatan: '',
  alamat: '',
  telepon_kantor: '', // (tidak dipakai, dibiarkan konsisten dgn no_hp saja di bawah)
  no_hp: '',
  email: '',
  npwp: '',
  bank: '',
  no_rekening: '',
  rekening_atas_nama: '',
  foto_profil_path: '',
  status: 'aktif',
}

function formatTanggal(tgl) {
  if (!tgl) return null
  try {
    return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return tgl
  }
}

export default function DataPegawaiKantor() {
  const { sekolahId } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [profilLihat, setProfilLihat] = useState(null)

  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: pegawai, error } = await supabase
      .from('pegawai_kantor')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('nama_lengkap')

    if (error) {
      console.error('Gagal memuat data pegawai:', error)
      alert('Gagal memuat data pegawai: ' + error.message)
    }

    setData(pegawai || [])
    setLoading(false)
    if (profilLihat) {
      const updated = (pegawai || []).find((p) => p.id === profilLihat.id)
      if (updated) setProfilLihat(updated)
    }
  }

  useEffect(() => {
    loadData()
  }, [sekolahId])

  function fotoUrl(path) {
    if (!path) return null
    return supabase.storage.from('foto-profil').getPublicUrl(path).data.publicUrl
  }

  function openAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      ...emptyForm,
      ...row,
      tanggal_lahir: row.tanggal_lahir ? String(row.tanggal_lahir).slice(0, 10) : '',
      tmt_pengangkatan: row.tmt_pengangkatan ? String(row.tmt_pengangkatan).slice(0, 10) : '',
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) {
      alert('Belum ada kantor aktif.')
      return
    }
    setSaving(true)
    const { telepon_kantor, ...rest } = form
    const payload = {
      ...rest,
      sekolah_id: sekolahId,
      tanggal_lahir: form.tanggal_lahir || null,
      tmt_pengangkatan: form.tmt_pengangkatan || null,
    }
    const { error } = editingId
      ? await supabase.from('pegawai_kantor').update(payload).eq('id', editingId).eq('sekolah_id', sekolahId)
      : await supabase.from('pegawai_kantor').insert(payload)
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
    if (!confirm('Hapus data pegawai ini?')) return
    const { error } = await supabase.from('pegawai_kantor').delete().eq('id', id).eq('sekolah_id', sekolahId)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  const filtered = data.filter((p) =>
    `${p.nama_lengkap} ${p.nip} ${p.jabatan}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout
      title="Data Pegawai"
      subtitle={`${data.length} pegawai terdaftar`}
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Tambah Pegawai
        </button>
      }
    >
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-red-900" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
            <Briefcase size={18} />
          </div>
          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
            <input
              className="input-field pl-9"
              placeholder="Cari nama, NIP, atau jabatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr className="border-b-2 border-blue-600/20">
              <th>Nama Lengkap</th>
              <th>NIP</th>
              <th>Jabatan</th>
              <th>Pangkat/Golongan</th>
              <th>No. HP</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-ink-700/50">Memuat data...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-ink-700/50">Belum ada data pegawai.</td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-blue-600/[0.03] transition-colors">
                <td className="font-medium">
                  <button type="button" onClick={() => setProfilLihat(p)} className="hover:underline hover:text-blue-700 text-left">
                    {p.nama_lengkap}
                  </button>
                </td>
                <td className="font-mono text-xs">{p.nip}</td>
                <td>{p.jabatan}</td>
                <td>{p.pangkat_golongan}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5">
                    {p.no_hp}
                    <TeleponLink nomor={p.no_hp} />
                  </span>
                </td>
                <td>
                  <span className={`badge ${p.status === 'aktif' ? 'bg-blue-600/15 text-blue-700' : 'bg-red-900/10 text-red-900'}`}>
                    {p.status}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(p)} className="p-2 hover:bg-blue-600/10 rounded-lg text-blue-700/70">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-900/10 rounded-lg text-red-900/70">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-red-900" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
                <Briefcase size={19} />
              </div>
              <h2 className="font-display text-xl font-semibold">{editingId ? 'Ubah Data Pegawai' : 'Tambah Pegawai'}</h2>
            </div>

            <SeksiForm judul="Data Pribadi">
              <Field label="Nama Lengkap" full>
                <input required className="input-field" value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} />
              </Field>
              <Field label="NIK"><input className="input-field" value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} /></Field>
              <Field label="Jenis Kelamin">
                <select className="input-field" value={form.jenis_kelamin} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })}>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </Field>
              <Field label="Agama"><input className="input-field" value={form.agama} onChange={(e) => setForm({ ...form, agama: e.target.value })} /></Field>
              <Field label="Tempat Lahir"><input className="input-field" value={form.tempat_lahir} onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })} /></Field>
              <Field label="Tanggal Lahir"><input type="date" className="input-field" value={form.tanggal_lahir} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} /></Field>
              <Field label="Pendidikan Terakhir"><input className="input-field" value={form.pendidikan_terakhir} onChange={(e) => setForm({ ...form, pendidikan_terakhir: e.target.value })} /></Field>
            </SeksiForm>

            <SeksiForm judul="Kepegawaian">
              <Field label="NIP"><input className="input-field" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} /></Field>
              <Field label="Jabatan"><input className="input-field" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} /></Field>
              <Field label="Status Kepegawaian">
                <input className="input-field" placeholder="PNS / PPPK / Honorer..." value={form.status_kepegawaian} onChange={(e) => setForm({ ...form, status_kepegawaian: e.target.value })} />
              </Field>
              <Field label="Pangkat / Golongan"><input className="input-field" value={form.pangkat_golongan} onChange={(e) => setForm({ ...form, pangkat_golongan: e.target.value })} /></Field>
              <Field label="SK Pengangkatan"><input className="input-field" value={form.sk_pengangkatan} onChange={(e) => setForm({ ...form, sk_pengangkatan: e.target.value })} /></Field>
              <Field label="TMT Pengangkatan"><input type="date" className="input-field" value={form.tmt_pengangkatan} onChange={(e) => setForm({ ...form, tmt_pengangkatan: e.target.value })} /></Field>
            </SeksiForm>

            <SeksiForm judul="Kontak & Alamat">
              <Field label="Alamat" full><textarea className="input-field" rows={2} value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></Field>
              <Field label="No. HP"><input className="input-field" value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} /></Field>
              <Field label="Email"><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </SeksiForm>

            <SeksiForm judul="Lainnya">
              <Field label="NPWP"><input className="input-field" value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} /></Field>
              <Field label="Bank"><input className="input-field" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></Field>
              <Field label="Nomor Rekening"><input className="input-field" value={form.no_rekening} onChange={(e) => setForm({ ...form, no_rekening: e.target.value })} /></Field>
              <Field label="Rekening Atas Nama"><input className="input-field" value={form.rekening_atas_nama} onChange={(e) => setForm({ ...form, rekening_atas_nama: e.target.value })} /></Field>
              <Field label="Status di Aplikasi" full>
                <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </Field>
            </SeksiForm>

            <div className="mt-5 flex justify-end gap-3 sticky bottom-0 bg-white pt-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {profilLihat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-0 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setProfilLihat(null)}
              className="absolute top-4 right-4 z-10 text-white/80 hover:text-white bg-ink-950/20 rounded-full p-1"
            >
              <X size={18} />
            </button>

            <div className="relative bg-gradient-to-br from-blue-900 to-blue-950 pt-8 pb-16 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/20 bg-white/10 flex items-center justify-center shrink-0">
                {fotoUrl(profilLihat.foto_profil_path) ? (
                  <img src={fotoUrl(profilLihat.foto_profil_path)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-semibold text-white/60">{profilLihat.nama_lengkap?.[0]}</span>
                )}
              </div>
              <p className="font-display font-semibold text-lg text-white mt-3 text-center px-6">{profilLihat.nama_lengkap}</p>
              <span className={`badge mt-1.5 ${profilLihat.status === 'aktif' ? 'bg-sage-500/20 text-sage-100' : 'bg-white/10 text-white/70'}`}>
                {profilLihat.status}
              </span>
            </div>

            <div className="px-6 -mt-12 pb-6">
              <div className="card p-4 space-y-4 bg-white shadow-md">
                <SeksiProfil judul="Data Pribadi">
                  <ProfilRow label="NIK" value={profilLihat.nik} />
                  <ProfilRow label="Jenis Kelamin" value={profilLihat.jenis_kelamin === 'L' ? 'Laki-laki' : profilLihat.jenis_kelamin === 'P' ? 'Perempuan' : null} />
                  <ProfilRow label="Agama" value={profilLihat.agama} />
                  <ProfilRow
                    label="Tempat, Tgl Lahir"
                    value={profilLihat.tempat_lahir || profilLihat.tanggal_lahir ? `${profilLihat.tempat_lahir || '-'}, ${formatTanggal(profilLihat.tanggal_lahir) || '-'}` : null}
                  />
                  <ProfilRow label="Pendidikan Terakhir" value={profilLihat.pendidikan_terakhir} />
                </SeksiProfil>

                <SeksiProfil judul="Kepegawaian">
                  <ProfilRow label="NIP" value={profilLihat.nip} />
                  <ProfilRow label="Jabatan" value={profilLihat.jabatan} />
                  <ProfilRow label="Status Kepegawaian" value={profilLihat.status_kepegawaian} />
                  <ProfilRow label="Pangkat / Golongan" value={profilLihat.pangkat_golongan} />
                  <ProfilRow label="SK Pengangkatan" value={profilLihat.sk_pengangkatan} />
                  <ProfilRow label="TMT Pengangkatan" value={formatTanggal(profilLihat.tmt_pengangkatan)} />
                </SeksiProfil>

                <SeksiProfil judul="Kontak">
                  <ProfilRow label="Alamat" value={profilLihat.alamat} />
                  <ProfilRow label="No. HP" value={profilLihat.no_hp} telepon />
                  <ProfilRow label="Email" value={profilLihat.email} />
                </SeksiProfil>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { setProfilLihat(null); openEdit(profilLihat) }}
                  className="btn-secondary flex-1 justify-center"
                >
                  <Pencil size={15} /> Ubah Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function SeksiForm({ judul, children }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="eyebrow text-blue-700 mb-2">{judul}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function SeksiProfil({ judul, children }) {
  return (
    <div>
      <p className="eyebrow text-blue-700/70 mb-2">{judul}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({ label, children, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="eyebrow mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function ProfilRow({ label, value, telepon }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-ink-700/50 shrink-0">{label}</span>
      <span className="text-ink-950 font-medium text-right inline-flex items-center gap-1.5">
        {value}
        {telepon && <TeleponLink nomor={value} />}
      </span>
    </div>
  )
}
