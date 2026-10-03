import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { Loader2, Save, CalendarDays, Clock, LogOut } from 'lucide-react'

// Laman KHUSUS mencatat presensi harian personel POLRES
// (tabel personel_polres + presensi_personel_polres). Pola disalin
// dari PresensiPuskesmas.jsx / PresensiKantor.jsx.

const STATUS_OPSI = [
  { value: 'hadir', label: 'Hadir' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'alpa', label: 'Alpa' },
  { value: 'cuti', label: 'Cuti' },
  { value: 'dinas', label: 'Dinas' },
]

// Rentang jam acak (menit sejak 00:00). Ubah sesuai jam dinas Polres.
const RENTANG_MASUK = { mulai: 7 * 60 + 0, akhir: 7 * 60 + 30 }
const RENTANG_PULANG = { mulai: 16 * 60 + 0, akhir: 16 * 60 + 30 }

function hariIni() {
  const d = new Date()
  const bulan = String(d.getMonth() + 1).padStart(2, '0')
  const tgl = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${bulan}-${tgl}`
}

// "07:15:00" -> "07:15"
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

export default function PresensiPolres() {
  const { sekolahId } = useAuth()
  const [tanggal, setTanggal] = useState(hariIni())
  const [personel, setPersonel] = useState([])
  const [statusPerPersonel, setStatusPerPersonel] = useState({})
  const [jamPerPersonel, setJamPerPersonel] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function muatData() {
    if (!sekolahId) {
      setPersonel([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: daftarPersonel, error: errPersonel } = await supabase
      .from('personel_polres')
      .select('id, nama, nrp, pangkat, jabatan')
      .eq('sekolah_id', sekolahId)
      .eq('status', 'aktif')
      .order('nama')

    if (errPersonel) {
      alert('Gagal memuat data personel: ' + errPersonel.message)
      setLoading(false)
      return
    }

    const { data: presensiHariIni, error: errPresensi } = await supabase
      .from('presensi_personel_polres')
      .select('personel_polres_id, status, jam_masuk, jam_pulang')
      .eq('sekolah_id', sekolahId)
      .eq('tanggal', tanggal)

    if (errPresensi) {
      alert('Gagal memuat presensi: ' + errPresensi.message)
    }

    const petaStatus = {}
    const petaJam = {}
    for (const p of daftarPersonel || []) {
      petaStatus[p.id] = 'hadir'
      petaJam[p.id] = { masuk: '', pulang: '' }
    }
    for (const row of presensiHariIni || []) {
      petaStatus[row.personel_polres_id] = row.status
      petaJam[row.personel_polres_id] = {
        masuk: keFormatJam(row.jam_masuk),
        pulang: keFormatJam(row.jam_pulang),
      }
    }

    setPersonel(daftarPersonel || [])
    setStatusPerPersonel(petaStatus)
    setJamPerPersonel(petaJam)
    setLoading(false)
  }

  useEffect(() => {
    muatData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, tanggal])

  function ubahStatus(personelId, status) {
    setStatusPerPersonel((prev) => ({ ...prev, [personelId]: status }))
    if (status === 'hadir') {
      setJamPerPersonel((prev) => {
        const jamSaatIni = prev[personelId] || { masuk: '', pulang: '' }
        if (jamSaatIni.masuk) return prev
        return { ...prev, [personelId]: { ...jamSaatIni, masuk: jamAcak(RENTANG_MASUK) } }
      })
    }
  }

  function ubahJam(personelId, field, value) {
    setJamPerPersonel((prev) => ({
      ...prev,
      [personelId]: { ...(prev[personelId] || { masuk: '', pulang: '' }), [field]: value },
    }))
  }

  function catatPulangSekarang(personelId) {
    ubahJam(personelId, 'pulang', jamAcak(RENTANG_PULANG))
  }

  async function handleSimpan() {
    if (!sekolahId) return
    setSaving(true)

    // Yang berstatus hadir tapi jam masuknya kosong diisi otomatis
    const jamFinal = {}
    for (const p of personel) {
      const jam = jamPerPersonel[p.id] || { masuk: '', pulang: '' }
      const status = statusPerPersonel[p.id] || 'hadir'
      jamFinal[p.id] = {
        masuk: jam.masuk || (status === 'hadir' ? jamAcak(RENTANG_MASUK) : ''),
        pulang: jam.pulang,
      }
    }
    setJamPerPersonel((prev) => ({ ...prev, ...jamFinal }))

    const payload = personel.map((p) => {
      const jam = jamFinal[p.id]
      return {
        sekolah_id: sekolahId,
        personel_polres_id: p.id,
        tanggal,
        status: statusPerPersonel[p.id] || 'hadir',
        jam_masuk: jam.masuk || null,
        jam_pulang: jam.pulang || null,
      }
    })
    const { error } = await supabase
      .from('presensi_personel_polres')
      .upsert(payload, { onConflict: 'personel_polres_id,tanggal' })
    setSaving(false)
    if (error) {
      alert('Gagal menyimpan presensi: ' + error.message)
    } else {
      alert('Presensi berhasil disimpan.')
    }
  }

  return (
    <Layout title="Presensi Polres" subtitle="Catat kehadiran harian personel Polres">
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
          <button className="btn-primary" onClick={handleSimpan} disabled={saving || loading || personel.length === 0}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Presensi
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Nama Personel</th>
              <th>NRP</th>
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
            {!loading && personel.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-ink-700/50">Belum ada personel Polres aktif.</td>
              </tr>
            )}
            {personel.map((p) => {
              const jam = jamPerPersonel[p.id] || { masuk: '', pulang: '' }
              return (
                <tr key={p.id}>
                  <td className="font-medium">{p.pangkat ? `${p.pangkat} ${p.nama}` : p.nama}</td>
                  <td className="font-mono text-xs">{p.nrp || '-'}</td>
                  <td>{p.jabatan || '-'}</td>
                  <td>
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUS_OPSI.map((opsi) => (
                        <button
                          key={opsi.value}
                          type="button"
                          onClick={() => ubahStatus(p.id, opsi.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            statusPerPersonel[p.id] === opsi.value
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
