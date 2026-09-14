import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { Loader2, Save, CalendarDays } from 'lucide-react'

// Laman ini KHUSUS untuk mencatat presensi harian pegawai KANTOR
// (tabel pegawai_kantor + presensi_pegawai_kantor). Sengaja dibuat
// terpisah total dari src/pages/Presensi.jsx (presensi guru) supaya
// tidak ada risiko mengganggu alur presensi guru yang sudah berjalan.
// Perlu migrasi: migrasi-presensi-pegawai-kantor.sql

const STATUS_OPSI = [
  { value: 'hadir', label: 'Hadir' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'alpa', label: 'Alpa' },
]

function hariIni() {
  const d = new Date()
  const bulan = String(d.getMonth() + 1).padStart(2, '0')
  const tgl = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${bulan}-${tgl}`
}

export default function PresensiKantor() {
  const { sekolahId } = useAuth()
  const [tanggal, setTanggal] = useState(hariIni())
  const [pegawai, setPegawai] = useState([])
  const [statusPerPegawai, setStatusPerPegawai] = useState({}) // { [pegawai_kantor_id]: status }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function muatData() {
    if (!sekolahId) {
      setPegawai([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: daftarPegawai, error: errPegawai } = await supabase
      .from('pegawai_kantor')
      .select('id, nama_lengkap, nip, jabatan')
      .eq('sekolah_id', sekolahId)
      .eq('status', 'aktif')
      .order('nama_lengkap')

    if (errPegawai) {
      alert('Gagal memuat data pegawai: ' + errPegawai.message)
      setLoading(false)
      return
    }

    const { data: presensiHariIni, error: errPresensi } = await supabase
      .from('presensi_pegawai_kantor')
      .select('pegawai_kantor_id, status')
      .eq('sekolah_id', sekolahId)
      .eq('tanggal', tanggal)

    if (errPresensi) {
      alert('Gagal memuat presensi: ' + errPresensi.message)
    }

    const peta = {}
    for (const p of daftarPegawai || []) peta[p.id] = 'hadir' // default kalau belum pernah diisi
    for (const row of presensiHariIni || []) peta[row.pegawai_kantor_id] = row.status

    setPegawai(daftarPegawai || [])
    setStatusPerPegawai(peta)
    setLoading(false)
  }

  useEffect(() => {
    muatData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, tanggal])

  function ubahStatus(pegawaiId, status) {
    setStatusPerPegawai((prev) => ({ ...prev, [pegawaiId]: status }))
  }

  async function handleSimpan() {
    if (!sekolahId) return
    setSaving(true)
    const payload = pegawai.map((p) => ({
      sekolah_id: sekolahId,
      pegawai_kantor_id: p.id,
      tanggal,
      status: statusPerPegawai[p.id] || 'hadir',
    }))
    const { error } = await supabase
      .from('presensi_pegawai_kantor')
      .upsert(payload, { onConflict: 'pegawai_kantor_id,tanggal' })
    setSaving(false)
    if (error) {
      alert('Gagal menyimpan presensi: ' + error.message)
    } else {
      alert('Presensi berhasil disimpan.')
    }
  }

  return (
    <Layout title="Presensi Kantor" subtitle="Catat kehadiran harian pegawai kantor">
      <div className="card p-5 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label-field flex items-center gap-1.5">
              <CalendarDays size={14} /> Tanggal
            </label>
            <input
              type="date"
              className="input-field"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={handleSimpan} disabled={saving || loading || pegawai.length === 0}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Presensi
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Nama Pegawai</th>
              <th>NIP</th>
              <th>Jabatan</th>
              <th>Status Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-ink-700/50">Memuat data...</td>
              </tr>
            )}
            {!loading && pegawai.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-ink-700/50">Belum ada pegawai kantor aktif.</td>
              </tr>
            )}
            {pegawai.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.nama_lengkap}</td>
                <td className="font-mono text-xs">{p.nip || '-'}</td>
                <td>{p.jabatan || '-'}</td>
                <td>
                  <div className="flex gap-1.5 flex-wrap">
                    {STATUS_OPSI.map((opsi) => (
                      <button
                        key={opsi.value}
                        type="button"
                        onClick={() => ubahStatus(p.id, opsi.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          statusPerPegawai[p.id] === opsi.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-ink-700/70 border-ink-700/15 hover:border-blue-600/40'
                        }`}
                      >
                        {opsi.label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
