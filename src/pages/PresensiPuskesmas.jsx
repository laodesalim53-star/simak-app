import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { Loader2, Save, CalendarDays, Clock, LogOut } from 'lucide-react'

// Laman KHUSUS mencatat presensi harian pegawai PUSKESMAS
// (tabel pegawai_puskesmas + presensi_pegawai_puskesmas). Pola disalin
// persis dari PresensiKantor.jsx.

const STATUS_OPSI = [
  { value: 'hadir', label: 'Hadir' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'alpa', label: 'Alpa' },
]

const RENTANG_MASUK = { mulai: 7 * 60 + 0, akhir: 7 * 60 + 30 }
const RENTANG_PULANG = { mulai: 16 * 60 + 0, akhir: 16 * 60 + 30 }

function hariIni() {
  const d = new Date()
  const bulan = String(d.getMonth() + 1).padStart(2, '0')
  const tgl = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${bulan}-${tgl}`
}

function keFormatJam(nilai) {
  if (!nilai) return ''
  return String(nilai).slice(0, 5)
}

function jamAcak({ mulai, akhir }) {
  const totalMenit = mulai + Math.floor(Math.random() * (akhir - mulai + 1))
  const jam = Math.floor(totalMenit / 60)
  const menit = totalMenit % 60
  return `${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}`
}

export default function PresensiPuskesmas() {
  const { sekolahId } = useAuth()
  const [tanggal, setTanggal] = useState(hariIni())
  const [pegawai, setPegawai] = useState([])
  const [statusPerPegawai, setStatusPerPegawai] = useState({})
  const [jamPerPegawai, setJamPerPegawai] = useState({})
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
      .from('pegawai_puskesmas')
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
      .from('presensi_pegawai_puskesmas')
      .select('pegawai_puskesmas_id, status, jam_masuk, jam_pulang')
      .eq('sekolah_id', sekolahId)
      .eq('tanggal', tanggal)

    if (errPresensi) {
      alert('Gagal memuat presensi: ' + errPresensi.message)
    }

    const petaStatus = {}
    const petaJam = {}
    for (const p of daftarPegawai || []) {
      petaStatus[p.id] = 'hadir'
      petaJam[p.id] = { masuk: '', pulang: '' }
    }
    for (const row of presensiHariIni || []) {
      petaStatus[row.pegawai_puskesmas_id] = row.status
      petaJam[row.pegawai_puskesmas_id] = {
        masuk: keFormatJam(row.jam_masuk),
        pulang: keFormatJam(row.jam_pulang),
      }
    }

    setPegawai(daftarPegawai || [])
    setStatusPerPegawai(petaStatus)
    setJamPerPegawai(petaJam)
    setLoading(false)
  }

  useEffect(() => {
    muatData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, tanggal])

  function ubahStatus(pegawaiId, status) {
    setStatusPerPegawai((prev) => ({ ...prev, [pegawaiId]: status }))
    if (status === 'hadir') {
      setJamPerPegawai((prev) => {
        const jamSaatIni = prev[pegawaiId] || { masuk: '', pulang: '' }
        if (jamSaatIni.masuk) return prev
        return { ...prev, [pegawaiId]: { ...jamSaatIni, masuk: jamAcak(RENTANG_MASUK) } }
      })
    }
  }

  function ubahJam(pegawaiId, field, value) {
    setJamPerPegawai((prev) => ({
      ...prev,
      [pegawaiId]: { ...(prev[pegawaiId] || { masuk: '', pulang: '' }), [field]: value },
    }))
  }

  function catatPulangSekarang(pegawaiId) {
    ubahJam(pegawaiId, 'pulang', jamAcak(RENTANG_PULANG))
  }

  async function handleSimpan() {
    if (!sekolahId) return
    setSaving(true)

    const jamFinal = {}
    for (const p of pegawai) {
      const jam = jamPerPegawai[p.id] || { masuk: '', pulang: '' }
      const status = statusPerPegawai[p.id] || 'hadir'
      jamFinal[p.id] = {
        masuk: jam.masuk || (status === 'hadir' ? jamAcak(RENTANG_MASUK) : ''),
        pulang: jam.pulang,
      }
    }
    setJamPerPegawai((prev) => ({ ...prev, ...jamFinal }))

    const payload = pegawai.map((p) => {
      const jam = jamFinal[p.id]
      return {
        sekolah_id: sekolahId,
        pegawai_puskesmas_id: p.id,
        tanggal,
        status: statusPerPegawai[p.id] || 'hadir',
        jam_masuk: jam.masuk || null,
        jam_pulang: jam.pulang || null,
      }
    })
    const { error } = await supabase
      .from('presensi_pegawai_puskesmas')
      .upsert(payload, { onConflict: 'pegawai_puskesmas_id,tanggal' })
    setSaving(false)
    if (error) {
      alert('Gagal menyimpan presensi: ' + error.message)
    } else {
      alert('Presensi berhasil disimpan.')
    }
  }

  return (
    <Layout title="Presensi Puskesmas" subtitle="Catat kehadiran harian pegawai puskesmas">
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
              <th>Jam Masuk</th>
              <th>Jam Pulang</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-ink-700/50">Memuat data...</td>
              </tr>
            )}
            {!loading && pegawai.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-ink-700/50">Belum ada pegawai puskesmas aktif.</td>
              </tr>
            )}
            {pegawai.map((p) => {
              const jam = jamPerPegawai[p.id] || { masuk: '', pulang: '' }
              return (
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
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-ink-700/70 border-ink-700/15 hover:border-emerald-600/40'
                          }`}
                        >
                          {opsi.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-ink-700/40 shrink-0" />
                      <input
                        type="time"
                        value={jam.masuk}
                        onChange={(e) => ubahJam(p.id, 'masuk', e.target.value)}
                        className="input-field !py-1 !px-2 text-xs w-[6.5rem]"
                      />
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={jam.pulang}
                        onChange={(e) => ubahJam(p.id, 'pulang', e.target.value)}
                        className="input-field !py-1 !px-2 text-xs w-[6.5rem]"
                      />
                      <button
                        type="button"
                        onClick={() => catatPulangSekarang(p.id)}
                        title="Catat jam pulang = waktu acak 16:00-16:30"
                        className="text-ink-700/40 hover:text-emerald-600 shrink-0"
                      >
                        <LogOut size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
