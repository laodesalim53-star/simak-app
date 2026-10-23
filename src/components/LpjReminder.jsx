import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import {
  AlarmClock, AlertTriangle, CheckCircle2, Plus, Pencil, Trash2, X, Loader2, Settings2,
} from 'lucide-react'

// Hitung sisa hari ke tanggal batas (zona waktu lokal, format 'YYYY-MM-DD')
function sisaHari(tanggalBatas) {
  const [y, m, d] = tanggalBatas.split('-').map(Number)
  const batas = new Date(y, m - 1, d)
  const hariIni = new Date()
  hariIni.setHours(0, 0, 0, 0)
  return Math.round((batas - hariIni) / 86400000)
}

function formatTanggal(t) {
  const [y, m, d] = t.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// Tingkat urgensi: makin dekat deadline, makin mencolok
function levelInfo(sisa) {
  if (sisa < 0) return { key: 'terlambat', label: `Terlambat ${Math.abs(sisa)} hari`, cls: 'bg-red-50 border-red-300 text-red-800', urgent: true }
  if (sisa === 0) return { key: 'hari-h', label: 'Batas akhir HARI INI', cls: 'bg-red-50 border-red-300 text-red-800', urgent: true }
  if (sisa <= 3) return { key: 'kritis', label: `${sisa} hari lagi`, cls: 'bg-orange-50 border-orange-300 text-orange-800', urgent: true }
  if (sisa <= 7) return { key: 'segera', label: `${sisa} hari lagi`, cls: 'bg-yellow-50 border-yellow-300 text-yellow-800', urgent: false }
  if (sisa <= 14) return { key: 'info', label: `${sisa} hari lagi`, cls: 'bg-blue-50 border-blue-200 text-blue-800', urgent: false }
  return null // belum perlu diingatkan
}

const kosong = { judul: '', periode: '', tanggal_batas: '', status: 'belum', catatan: '' }

export default function LpjReminder({ tampilBanner = true, tampilKelola = true, className = 'mb-4' }) {
  const { profil } = useAuth()
  const sekolahId = profil?.sekolah_id

  const [jadwal, setJadwal] = useState([])
  const [loading, setLoading] = useState(true)
  const [showKelola, setShowKelola] = useState(false)
  const [form, setForm] = useState(kosong)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  // Pengingat non-urgent boleh disembunyikan sampai besok (disimpan per hari di browser)
  const kunciTutup = `lpj_tutup_${new Date().toLocaleDateString('sv-SE')}`
  const [ditutup, setDitutup] = useState(() => {
    try { return JSON.parse(localStorage.getItem(kunciTutup) || '[]') } catch { return [] }
  })

  const muat = useCallback(async () => {
    if (!sekolahId) return
    setLoading(true)
    const { data } = await supabase
      .from('lpj_jadwal')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('tanggal_batas', { ascending: true })
    setJadwal(data || [])
    setLoading(false)
    // beri tahu lonceng notifikasi di Layout agar ikut menyegarkan
    window.dispatchEvent(new Event('lpj-berubah'))
  }, [sekolahId])

  useEffect(() => { muat() }, [muat])

  function tutup(id) {
    const baru = [...ditutup, id]
    setDitutup(baru)
    try { localStorage.setItem(kunciTutup, JSON.stringify(baru)) } catch { /* abaikan */ }
  }

  async function tandaiTerkirim(id) {
    const { error } = await supabase
      .from('lpj_jadwal')
      .update({ status: 'terkirim', dikirim_pada: new Date().toISOString() })
      .eq('id', id)
    if (error) alert('Gagal memperbarui: ' + error.message)
    else muat()
  }

  function bukaTambah() {
    setForm(kosong)
    setEditingId(null)
  }

  function bukaEdit(row) {
    setForm({
      judul: row.judul || '',
      periode: row.periode || '',
      tanggal_batas: row.tanggal_batas,
      status: row.status,
      catatan: row.catatan || '',
    })
    setEditingId(row.id)
  }

  async function simpan(e) {
    e.preventDefault()
    if (!sekolahId) return
    setSaving(true)
    const payload = {
      ...form,
      sekolah_id: sekolahId,
      dikirim_pada: form.status === 'terkirim' ? new Date().toISOString() : null,
    }
    const { error } = editingId
      ? await supabase.from('lpj_jadwal').update(payload).eq('id', editingId)
      : await supabase.from('lpj_jadwal').insert(payload)
    setSaving(false)
    if (error) {
      alert('Gagal menyimpan: ' + error.message)
      return
    }
    setForm(kosong)
    setEditingId(null)
    muat()
  }

  async function hapus(id) {
    if (!confirm('Hapus jadwal LPJ ini?')) return
    const { error } = await supabase.from('lpj_jadwal').delete().eq('id', id)
    if (error) alert('Gagal menghapus: ' + error.message)
    else muat()
  }

  // Hanya LPJ yang belum terkirim dan sudah masuk jendela pengingat (<= 14 hari / terlambat)
  const pengingat = jadwal
    .filter((j) => j.status !== 'terkirim')
    .map((j) => ({ ...j, sisa: sisaHari(j.tanggal_batas) }))
    .map((j) => ({ ...j, level: levelInfo(j.sisa) }))
    .filter((j) => j.level && (j.level.urgent || !ditutup.includes(j.id)))

  if (!sekolahId) return null
  // Mode banner saja (dipakai di Layout): tidak render apa pun kalau tidak ada pengingat
  if (!tampilKelola && (!tampilBanner || pengingat.length === 0)) return null

  return (
    <div className={`no-print space-y-2 ${className}`}>
      {tampilBanner && pengingat.map((j) => (
        <div key={j.id} className={`flex items-start gap-3 border rounded-lg px-4 py-3 ${j.level.cls}`}>
          {j.level.urgent ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <AlarmClock size={18} className="mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {j.judul}{j.periode ? ` — ${j.periode}` : ''}
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-white/70">{j.level.label}</span>
            </p>
            <p className="text-xs opacity-80">
              Batas penyerahan: {formatTanggal(j.tanggal_batas)}
              {j.status === 'draft' ? ' · status: draft' : ' · belum dibuat'}
              {j.sisa < 0 && ' · segera selesaikan agar tidak semakin terlambat'}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button className="text-xs underline" onClick={() => tandaiTerkirim(j.id)}>Tandai terkirim</button>
            {!j.level.urgent && (
              <button className="icon-btn" title="Sembunyikan sampai besok" onClick={() => tutup(j.id)}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      ))}

      {tampilKelola && (
        <div className="flex justify-end">
          <button className="text-xs text-ink-700/60 hover:text-ink-950 flex items-center gap-1" onClick={() => setShowKelola(true)}>
            <Settings2 size={13} /> Kelola jadwal LPJ
          </button>
        </div>
      )}

      {showKelola && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Jadwal Pelaporan LPJ</h2>
              <button className="icon-btn" onClick={() => setShowKelola(false)}><X size={18} /></button>
            </div>

            <div className="space-y-2 mb-5">
              {loading && <p className="text-sm text-ink-700/50">Memuat...</p>}
              {!loading && jadwal.length === 0 && (
                <p className="text-sm text-ink-700/50">Belum ada jadwal. Tambahkan di bawah.</p>
              )}
              {jadwal.map((j) => {
                const s = sisaHari(j.tanggal_batas)
                return (
                  <div key={j.id} className="flex items-center gap-3 border border-ink-950/10 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{j.judul}{j.periode ? ` — ${j.periode}` : ''}</p>
                      <p className="text-xs text-ink-700/60">
                        {formatTanggal(j.tanggal_batas)} ·{' '}
                        {j.status === 'terkirim'
                          ? <span className="text-sage-500 inline-flex items-center gap-1"><CheckCircle2 size={12} /> terkirim</span>
                          : s < 0 ? `terlambat ${Math.abs(s)} hari` : `${s} hari lagi`}
                      </p>
                    </div>
                    <button className="icon-btn" onClick={() => bukaEdit(j)}><Pencil size={15} /></button>
                    <button className="icon-btn text-red-600" onClick={() => hapus(j.id)}><Trash2 size={15} /></button>
                  </div>
                )
              })}
            </div>

            <form onSubmit={simpan} className="space-y-3 border-t border-ink-950/10 pt-4">
              <p className="text-sm font-medium">{editingId ? 'Ubah jadwal' : 'Tambah jadwal'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Judul LPJ *</label>
                  <input required className="input-field" placeholder="LPJ BOS Triwulan IV"
                    value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Periode</label>
                  <input className="input-field" placeholder="Okt - Des 2026"
                    value={form.periode} onChange={(e) => setForm({ ...form, periode: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Batas penyerahan *</label>
                  <input required type="date" className="input-field"
                    value={form.tanggal_batas} onChange={(e) => setForm({ ...form, tanggal_batas: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Status</label>
                  <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="belum">Belum dibuat</option>
                    <option value="draft">Draft</option>
                    <option value="terkirim">Terkirim</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-field">Catatan</label>
                <input className="input-field" value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3">
                {editingId && <button type="button" className="btn-secondary" onClick={bukaTambah}>Batal ubah</button>}
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {editingId ? 'Simpan perubahan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
