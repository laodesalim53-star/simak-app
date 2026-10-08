import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { CalendarOff, Plus, Trash2, Loader2 } from 'lucide-react'
import { KETERANGAN, KODE_LIBUR, getDaftarLibur } from '../lib/kalenderPendidikan'

export default function HariLibur() {
  const [overrides, setOverrides] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tanggal, setTanggal] = useState('')
  const [kode, setKode] = useState('LU')
  const [keterangan, setKeterangan] = useState('')

  async function muatData() {
    setLoading(true)
    const { data } = await supabase.from('kalender_overrides').select('*')
    const map = {}
    ;(data || []).forEach((r) => {
      map[r.tanggal] = { kode: r.kode, keterangan: r.keterangan }
    })
    setOverrides(map)
    setLoading(false)
  }

  useEffect(() => {
    muatData()
  }, [])

  const daftar = useMemo(() => getDaftarLibur(overrides), [overrides])

  async function tambahLibur(e) {
    e.preventDefault()
    if (!tanggal) return
    setSaving(true)
    const { error } = await supabase
      .from('kalender_overrides')
      .upsert(
        { tanggal, kode, keterangan: keterangan || KETERANGAN[kode]?.label || 'Libur' },
        { onConflict: 'tanggal' }
      )
    setSaving(false)
    if (error) {
      alert('Gagal menyimpan: ' + error.message)
      return
    }
    setTanggal('')
    setKeterangan('')
    muatData()
  }

  async function hapusLibur(tgl) {
    if (!confirm('Hapus tanggal libur tambahan ini?')) return
    const { error } = await supabase.from('kalender_overrides').delete().eq('tanggal', tgl)
    if (error) {
      alert('Gagal menghapus: ' + error.message)
      return
    }
    muatData()
  }

  return (
    <Layout
      title="Hari Libur"
      subtitle="Tersinkron dengan Kalender Pendidikan — otomatis ditandai merah di Daftar Hadir Guru"
    >
      <form onSubmit={tambahLibur} className="card p-5 mb-5">
        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <label className="label-field">Tanggal</label>
            <input
              type="date"
              className="input-field"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label-field">Jenis</label>
            <select className="input-field" value={kode} onChange={(e) => setKode(e.target.value)}>
              {KODE_LIBUR.map((k) => (
                <option key={k} value={k}>
                  {k} — {KETERANGAN[k].label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label-field">Keterangan</label>
            <input
              type="text"
              className="input-field"
              placeholder="contoh: Libur Pilkades"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </div>
        </div>
        <button className="btn-primary mt-4" disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Tambah Hari Libur
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Keterangan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="text-center py-8 text-ink-700/50">Memuat...</td></tr>
            )}
            {!loading && daftar.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-ink-700/50">
                  <CalendarOff size={20} className="mx-auto mb-2 text-ink-700/30" />
                  Belum ada hari libur.
                </td>
              </tr>
            )}
            {daftar.map((d) => (
              <tr key={d.tanggal}>
                <td className="font-medium">
                  {new Date(d.tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${KETERANGAN[d.kode]?.badge || ''}`}>
                    {d.kode}
                  </span>
                </td>
                <td>
                  {d.keterangan}
                  {!d.manual && <span className="ml-2 text-xs text-ink-700/40">(bawaan kalender)</span>}
                </td>
                <td className="text-right">
                  {d.manual && (
                    <button onClick={() => hapusLibur(d.tanggal)} className="text-red-600 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-ink-700/50 p-4">
          Hari Minggu otomatis libur. Libur bawaan (tanpa tombol hapus) diubah lewat mode edit admin di
          halaman Kalender Pendidikan.
        </p>
      </div>
    </Layout>
  )
}
