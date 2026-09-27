import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { Plus, X, Loader2, CalendarCheck, Info } from 'lucide-react'

// Halaman "Cuti & Izin Saya" — untuk PEGAWAI biasa (bukan admin) tenant
// puskesmas. Berbeda dari CutiIzinPegawai.jsx (versi admin): di sini
// pegawai hanya bisa MENGAJUKAN dan melihat riwayat pengajuannya SENDIRI,
// tidak ada tombol Setujui/Tolak dan tidak melihat pengajuan pegawai lain.
// Menulis ke tabel yang sama: `pengajuan_cuti_izin_pegawai`.
// Identitas pegawai dari `profil.pegawai_id` (lihat AuthContext.jsx).

const JATAH_CUTI_TAHUNAN = 12 // samakan dengan CutiIzinPegawai.jsx (versi admin)

const JENIS_OPSI = [
  { value: 'cuti_tahunan', label: 'Cuti Tahunan' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'izin_dinas_luar', label: 'Izin Dinas Luar' },
  { value: 'izin_lainnya', label: 'Izin Lainnya' },
]

const STATUS_BADGE = {
  menunggu: 'bg-amber-500/15 text-amber-700',
  disetujui: 'bg-emerald-600/15 text-emerald-700',
  ditolak: 'bg-red-900/10 text-red-900',
}

const emptyForm = { jenis: 'cuti_tahunan', tanggal_mulai: '', tanggal_selesai: '', alasan: '' }

function formatTanggal(tgl) {
  if (!tgl) return null
  try { return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return tgl }
}

function jumlahHari(mulai, selesai) {
  const a = new Date(mulai), b = new Date(selesai)
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1
}

export default function CutiIzinSaya() {
  const { sekolahId, profil } = useAuth()
  const pegawaiId = profil?.pegawai_id

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    if (!sekolahId || !pegawaiId) { setLoading(false); return }
    setLoading(true)
    const { data: pengajuan, error } = await supabase
      .from('pengajuan_cuti_izin_pegawai')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .eq('pegawai_id', pegawaiId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Gagal memuat pengajuan:', error)
      alert('Gagal memuat riwayat pengajuan: ' + error.message)
    }
    setData(pengajuan || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, pegawaiId])

  const tahunIni = new Date().getFullYear()
  const sisaCuti = useMemo(() => {
    const terpakai = data
      .filter((r) => r.jenis === 'cuti_tahunan' && r.status_persetujuan === 'disetujui' && new Date(r.tanggal_mulai).getFullYear() === tahunIni)
      .reduce((total, r) => total + jumlahHari(r.tanggal_mulai, r.tanggal_selesai), 0)
    return JATAH_CUTI_TAHUNAN - terpakai
  }, [data, tahunIni])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId || !pegawaiId) return
    if (form.tanggal_selesai < form.tanggal_mulai) {
      alert('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('pengajuan_cuti_izin_pegawai').insert({
      ...form,
      sekolah_id: sekolahId,
      pegawai_id: pegawaiId,
      status_persetujuan: 'menunggu',
    })
    setSaving(false)
    if (!error) {
      setShowForm(false)
      setForm(emptyForm)
      loadData()
    } else {
      alert('Gagal mengajukan: ' + error.message)
    }
  }

  if (!pegawaiId) {
    return (
      <Layout title="Cuti & Izin Saya" subtitle="Ajukan cuti atau izin Anda sendiri">
        <div className="card p-5 flex items-start gap-3">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-ink-700/70">
            Akun Anda belum terhubung ke data pegawai puskesmas, jadi pengajuan cuti/izin belum bisa dilakukan lewat sini.
            Hubungi admin puskesmas untuk menghubungkan akun Anda ke data pegawai.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      title="Cuti & Izin Saya"
      subtitle={`Sisa cuti tahunan: ${sisaCuti} hari`}
      actions={
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Ajukan Cuti/Izin
        </button>
      }
    >
      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr className="border-b-2 border-emerald-600/20">
              <th>Jenis</th><th>Tanggal</th><th>Hari</th><th>Alasan</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center py-8 text-ink-700/50">Memuat...</td></tr>}
            {!loading && data.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-ink-700/50">Belum ada pengajuan.</td></tr>}
            {data.map((row) => (
              <tr key={row.id}>
                <td>{JENIS_OPSI.find((j) => j.value === row.jenis)?.label || row.jenis}</td>
                <td className="whitespace-nowrap">{formatTanggal(row.tanggal_mulai)} – {formatTanggal(row.tanggal_selesai)}</td>
                <td>{jumlahHari(row.tanggal_mulai, row.tanggal_selesai)}</td>
                <td className="max-w-[16rem] truncate" title={row.alasan}>{row.alasan || '-'}</td>
                <td><span className={`badge ${STATUS_BADGE[row.status_persetujuan]}`}>{row.status_persetujuan}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-lg p-6">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
                <CalendarCheck size={19} />
              </div>
              <h2 className="font-display text-xl font-semibold">Ajukan Cuti / Izin</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Jenis</label>
                <select className="input-field" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}>
                  {JENIS_OPSI.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
                </select>
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Tanggal Mulai</label>
                <input required type="date" className="input-field" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Tanggal Selesai</label>
                <input required type="date" className="input-field" value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Alasan / Keterangan</label>
                <textarea className="input-field" rows={2} value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} Ajukan
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  )
}
