import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { Loader2, Save, CalendarDays, Clock, LogOut } from 'lucide-react'

// Laman ini KHUSUS untuk mencatat presensi harian pegawai KANTOR
// (tabel pegawai_kantor + presensi_pegawai_kantor). Sengaja dibuat
// terpisah total dari src/pages/Presensi.jsx (presensi guru) supaya
// tidak ada risiko mengganggu alur presensi guru yang sudah berjalan.
// Perlu migrasi: migrasi-presensi-pegawai-kantor.sql
//
// Kolom jam_masuk/jam_pulang (tipe time) dipakai juga oleh
// DaftarHadirPegawai.jsx (mode Perorangan) untuk mencetak kolom
// Kedatangan/Kepulangan secara otomatis.

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

// "08:05:00" (dari DB) atau "08:05" -> "08:05" (buat value <input type="time">)
function keFormatJam(nilai) {
  if (!nilai) return ''
  return String(nilai).slice(0, 5)
}

function jamSekarang() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function PresensiKantor() {
  const { sekolahId } = useAuth()
  const [tanggal, setTanggal] = useState(hariIni())
  const [pegawai, setPegawai] = useState([])
  const [statusPerPegawai, setStatusPerPegawai] = useState({}) // { [pegawai_kantor_id]: status }
  const [jamPerPegawai, setJamPerPegawai] = useState({}) // { [pegawai_kantor_id]: { masuk, pulang } }
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
      .select('pegawai_kantor_id, status, jam_masuk, jam_pulang')
      .eq('sekolah_id', sekolahId)
      .eq('tanggal', tanggal)

    if (errPresensi) {
      alert('Gagal memuat presensi: ' + errPresensi.message)
    }

    const petaStatus = {}
    const petaJam = {}
    for (const p of daftarPegawai || []) {
      petaStatus[p.id] = 'hadir' // default kalau belum pernah diisi
      petaJam[p.id] = { masuk: '', pulang: '' }
    }
    for (const row of presensiHariIni || []) {
      petaStatus[row.pegawai_kantor_id] = row.status
      petaJam[row.pegawai_kantor_id] = {
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

    // Begitu ditandai Hadir, jam masuk otomatis terisi jam saat ini kalau
    // belum ada isinya — admin masih bisa mengoreksinya secara manual.
    if (status === 'hadir') {
      setJamPerPegawai((prev) => {
        const jamSaatIni = prev[pegawaiId] || { masuk: '', pulang: '' }
        if (jamSaatIni.masuk) return prev
        return { ...prev, [pegawaiId]: { ...jamSaatIni, masuk: jamSekarang() } }
      })
    }
  }

  function ubahJam(pegawaiId, field, value) {
    setJamPerPegawai((prev) => ({
      ...prev,
      [pegawaiId]: { ...(prev[pegawaiId] || { masuk: '', pulang: '' }), [field]: value },
    }))
  }

  // Tombol cepat: catat jam pulang = jam sekarang
  function catatPulangSekarang(pegawaiId) {
    ubahJam(pegawaiId, 'pulang', jamSekarang())
  }

  async function handleSimpan() {
    if (!sekolahId) return
    setSaving(true)
    const payload = pegawai.map((p) => {
      const jam = jamPerPegawai[p.id] || { masuk: '', pulang: '' }
      return {
        sekolah_id: sekolahId,
        pegawai_kantor_id: p.id,
        tanggal,
        status: statusPerPegawai[p.id] || 'hadir',
        jam_masuk: jam.masuk || null,
        jam_pulang: jam.pulang || null,
      }
    })
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
                <td colSpan={6} className="text-center py-8 text-ink-700/50">Belum ada pegawai kantor aktif.</td>
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
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-ink-700/70 border-ink-700/15 hover:border-blue-600/40'
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
                        title="Catat jam pulang = sekarang"
                        className="text-ink-700/40 hover:text-blue-600 shrink-0"
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
