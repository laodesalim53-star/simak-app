import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { Plus, X, Loader2, CalendarCheck, Check, Ban, Search } from 'lucide-react'

// Halaman "Cuti & Izin Pegawai" — tenant puskesmas.
// Menulis ke tabel `pengajuan_cuti_izin_pegawai` (migrasi-pengajuan-cuti-izin.sql).
// Saat pengajuan disetujui, baris presensi harian untuk seluruh rentang
// tanggal otomatis di-upsert ke `presensi_pegawai_puskesmas` (tabel yang
// sama dipakai PresensiPuskesmas.jsx), jadi rekap kehadiran tidak perlu
// diinput dobel oleh admin.

const JATAH_CUTI_TAHUNAN = 12 // hari/tahun — sesuaikan atau pindahkan ke pengaturan puskesmas

const JENIS_OPSI = [
  { value: 'cuti_tahunan', label: 'Cuti Tahunan' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'izin_dinas_luar', label: 'Izin Dinas Luar' },
  { value: 'izin_lainnya', label: 'Izin Lainnya' },
]

const emptyForm = {
  pegawai_id: '',
  jenis: 'cuti_tahunan',
  tanggal_mulai: '',
  tanggal_selesai: '',
  alasan: '',
}

function formatTanggal(tgl) {
  if (!tgl) return null
  try {
    return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return tgl
  }
}

// Menghasilkan daftar tanggal (YYYY-MM-DD) inklusif dari mulai s.d. selesai
function daftarTanggal(mulai, selesai) {
  const hasil = []
  const cur = new Date(mulai)
  const akhir = new Date(selesai)
  while (cur <= akhir) {
    hasil.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return hasil
}

function jumlahHari(mulai, selesai) {
  return daftarTanggal(mulai, selesai).length
}

// Jenis pengajuan -> status yang ditulis ke presensi_pegawai_puskesmas
function keStatusPresensi(jenis) {
  if (jenis === 'sakit') return 'sakit'
  return 'izin' // cuti_tahunan, izin_dinas_luar, izin_lainnya
}

const STATUS_BADGE = {
  menunggu: 'bg-amber-500/15 text-amber-700',
  disetujui: 'bg-emerald-600/15 text-emerald-700',
  ditolak: 'bg-red-900/10 text-red-900',
}

export default function CutiIzinPegawai() {
  const { sekolahId, user } = useAuth()
  const [data, setData] = useState([])
  const [pegawaiList, setPegawaiList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [prosesId, setProsesId] = useState(null)

  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [{ data: pegawai, error: errPegawai }, { data: pengajuan, error: errPengajuan }] = await Promise.all([
      supabase
        .from('pegawai_puskesmas')
        .select('id, nama_lengkap, jabatan, status')
        .eq('sekolah_id', sekolahId)
        .eq('status', 'aktif')
        .order('nama_lengkap'),
      supabase
        .from('pengajuan_cuti_izin_pegawai')
        .select('*')
        .eq('sekolah_id', sekolahId)
        .order('created_at', { ascending: false }),
    ])

    if (errPegawai) console.error('Gagal memuat pegawai:', errPegawai)
    if (errPengajuan) {
      console.error('Gagal memuat pengajuan:', errPengajuan)
      alert('Gagal memuat data cuti/izin: ' + errPengajuan.message)
    }

    setPegawaiList(pegawai || [])
    setData(pengajuan || [])
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

  const tahunIni = new Date().getFullYear()

  // Sisa cuti tahunan per pegawai = jatah - jumlah hari cuti_tahunan yang
  // sudah disetujui pada tahun berjalan.
  const sisaCutiPerPegawai = useMemo(() => {
    const terpakai = {}
    data.forEach((row) => {
      if (row.jenis !== 'cuti_tahunan') return
      if (row.status_persetujuan !== 'disetujui') return
      if (new Date(row.tanggal_mulai).getFullYear() !== tahunIni) return
      terpakai[row.pegawai_id] = (terpakai[row.pegawai_id] || 0) + jumlahHari(row.tanggal_mulai, row.tanggal_selesai)
    })
    const sisa = {}
    pegawaiList.forEach((p) => {
      sisa[p.id] = JATAH_CUTI_TAHUNAN - (terpakai[p.id] || 0)
    })
    return sisa
  }, [data, pegawaiList, tahunIni])

  const ringkasan = useMemo(() => ({
    menunggu: data.filter((r) => r.status_persetujuan === 'menunggu').length,
    izinBulanIni: data.filter((r) => {
      const d = new Date(r.tanggal_mulai)
      const now = new Date()
      return r.jenis !== 'cuti_tahunan' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length,
  }), [data])

  function openAdd() {
    setForm(emptyForm)
    setShowForm(true)
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
    if (form.tanggal_selesai < form.tanggal_mulai) {
      alert('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('pengajuan_cuti_izin_pegawai').insert({
      ...form,
      sekolah_id: sekolahId,
      status_persetujuan: 'menunggu',
    })
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal mengajukan: ' + error.message)
    }
  }

  // Menyetujui pengajuan: update status + tulis/replace baris presensi
  // harian untuk seluruh rentang tanggal, agar rekap kehadiran otomatis
  // konsisten tanpa input ulang oleh admin.
  async function handleSetujui(row) {
    if (!sekolahId) return
    setProsesId(row.id)

    const { error: errUpdate } = await supabase
      .from('pengajuan_cuti_izin_pegawai')
      .update({
        status_persetujuan: 'disetujui',
        disetujui_oleh: user?.id || null,
        disetujui_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('sekolah_id', sekolahId)

    if (errUpdate) {
      setProsesId(null)
      alert('Gagal menyetujui: ' + errUpdate.message)
      return
    }

    const statusPresensi = keStatusPresensi(row.jenis)
    const payloadPresensi = daftarTanggal(row.tanggal_mulai, row.tanggal_selesai).map((tanggal) => ({
      sekolah_id: sekolahId,
      pegawai_puskesmas_id: row.pegawai_id,
      tanggal,
      status: statusPresensi,
      jam_masuk: null,
      jam_pulang: null,
    }))

    const { error: errPresensi } = await supabase
      .from('presensi_pegawai_puskesmas')
      .upsert(payloadPresensi, { onConflict: 'pegawai_puskesmas_id,tanggal' })

    setProsesId(null)
    if (errPresensi) {
      alert('Pengajuan disetujui, tetapi gagal menyinkronkan ke presensi: ' + errPresensi.message)
    }
    loadData()
  }

  async function handleTolak(row) {
    if (!sekolahId) return
    if (!confirm('Tolak pengajuan ini?')) return
    setProsesId(row.id)
    const { error } = await supabase
      .from('pengajuan_cuti_izin_pegawai')
      .update({ status_persetujuan: 'ditolak', disetujui_oleh: user?.id || null, disetujui_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('sekolah_id', sekolahId)
    setProsesId(null)
    if (error) alert('Gagal menolak: ' + error.message)
    loadData()
  }

  const filtered = data.filter((row) => {
    const pegawai = pegawaiMap[row.pegawai_id]
    const teks = `${pegawai?.nama_lengkap || ''} ${row.jenis} ${row.alasan || ''}`
    return teks.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <Layout
      title="Cuti & Izin Pegawai"
      subtitle={`${ringkasan.menunggu} pengajuan menunggu persetujuan`}
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Ajukan Cuti/Izin
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="card p-4">
          <p className="eyebrow text-ink-700/50 mb-1">Pengajuan Menunggu</p>
          <p className="text-2xl font-semibold text-amber-700">{ringkasan.menunggu}</p>
        </div>
        <div className="card p-4">
          <p className="eyebrow text-ink-700/50 mb-1">Izin/Sakit Bulan Ini</p>
          <p className="text-2xl font-semibold">{ringkasan.izinBulanIni}</p>
        </div>
        <div className="card p-4">
          <p className="eyebrow text-ink-700/50 mb-1">Jatah Cuti Tahunan</p>
          <p className="text-2xl font-semibold">{JATAH_CUTI_TAHUNAN} <span className="text-sm font-normal text-ink-700/50">hari/pegawai</span></p>
        </div>
      </div>

      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
            <CalendarCheck size={18} />
          </div>
          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
            <input
              className="input-field pl-9"
              placeholder="Cari nama, jenis, alasan..."
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
              <th>Jenis</th>
              <th>Tanggal</th>
              <th>Hari</th>
              <th>Alasan</th>
              <th>Sisa Cuti Thn Ini</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Memuat data...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Belum ada pengajuan.</td></tr>
            )}
            {filtered.map((row) => {
              const pegawai = pegawaiMap[row.pegawai_id]
              const jenisLabel = JENIS_OPSI.find((j) => j.value === row.jenis)?.label || row.jenis
              const sedangDiproses = prosesId === row.id
              return (
                <tr key={row.id} className="hover:bg-emerald-600/[0.03] transition-colors">
                  <td className="font-medium">{pegawai?.nama_lengkap || '(pegawai dihapus)'}</td>
                  <td>{jenisLabel}</td>
                  <td className="whitespace-nowrap">{formatTanggal(row.tanggal_mulai)} – {formatTanggal(row.tanggal_selesai)}</td>
                  <td>{jumlahHari(row.tanggal_mulai, row.tanggal_selesai)}</td>
                  <td className="max-w-[16rem] truncate" title={row.alasan}>{row.alasan || '-'}</td>
                  <td>{sisaCutiPerPegawai[row.pegawai_id] ?? '-'} hari</td>
                  <td><span className={`badge ${STATUS_BADGE[row.status_persetujuan]}`}>{row.status_persetujuan}</span></td>
                  <td>
                    {row.status_persetujuan === 'menunggu' && (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          disabled={sedangDiproses}
                          onClick={() => handleSetujui(row)}
                          className="p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70"
                          title="Setujui"
                        >
                          {sedangDiproses ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                        </button>
                        <button
                          disabled={sedangDiproses}
                          onClick={() => handleTolak(row)}
                          className="p-2 hover:bg-red-900/10 rounded-lg text-red-900/70"
                          title="Tolak"
                        >
                          <Ban size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
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

              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Jenis</label>
                <select
                  className="input-field"
                  value={form.jenis}
                  onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                >
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
