import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { ChevronLeft, ChevronRight, Loader2, CalendarRange } from 'lucide-react'

// Halaman "Jadwal Piket / Jaga" — tenant puskesmas.
// Menulis ke tabel `piket_harian` yang SUDAH ADA (dipakai TugasHarian.jsx
// untuk checklist "Petugas Piket Hari Ini"), bukan tabel baru — lihat
// migrasi-piket-harian-shift.sql yang menambah kolom `shift`. Satu baris
// per (pegawai_id, tanggal); pilih shift lewat dropdown per sel, atau
// "Tidak Piket" untuk menghapus baris (sama seperti uncheck di
// checklist lama).

const SHIFT_OPSI = [
  { value: '', label: 'Tidak Piket' },
  { value: 'pagi', label: 'Pagi' },
  { value: 'siang', label: 'Siang' },
  { value: 'malam', label: 'Malam' },
]

const SHIFT_KELAS = {
  pagi: 'bg-amber-100 text-amber-800',
  siang: 'bg-blue-100 text-blue-800',
  malam: 'bg-indigo-100 text-indigo-800',
}

const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function keYMD(d) {
  return d.toISOString().slice(0, 10)
}

// Senin minggu yang memuat tanggal `acuan`
function awalMingguDari(acuan) {
  const d = new Date(acuan)
  const hari = d.getDay() // 0 = Minggu
  const offset = hari === 0 ? -6 : 1 - hari
  d.setDate(d.getDate() + offset)
  d.setHours(0, 0, 0, 0)
  return d
}

function tanggalDalamMinggu(awalMinggu) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(awalMinggu)
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatTanggalPendek(d) {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default function JadwalPiketPegawai() {
  const { sekolahId } = useAuth()
  const [awalMinggu, setAwalMinggu] = useState(() => awalMingguDari(new Date()))
  const [pegawaiList, setPegawaiList] = useState([])
  const [jadwal, setJadwal] = useState({}) // key: `${pegawai_id}_${tanggal}` -> shift
  const [loading, setLoading] = useState(true)
  const [selSedangDiubah, setSelSedangDiubah] = useState(null) // key sel yang sedang disimpan

  const hariMinggu = useMemo(() => tanggalDalamMinggu(awalMinggu), [awalMinggu])
  const tglMulai = keYMD(hariMinggu[0])
  const tglAkhir = keYMD(hariMinggu[6])

  async function loadData() {
    if (!sekolahId) {
      setPegawaiList([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [{ data: pegawai, error: errPegawai }, { data: piket, error: errPiket }] = await Promise.all([
      supabase
        .from('pegawai_puskesmas')
        .select('id, nama_lengkap, jabatan')
        .eq('sekolah_id', sekolahId)
        .eq('status', 'aktif')
        .order('nama_lengkap'),
      supabase
        .from('piket_harian')
        .select('pegawai_id, tanggal, shift')
        .eq('sekolah_id', sekolahId)
        .gte('tanggal', tglMulai)
        .lte('tanggal', tglAkhir),
    ])

    if (errPegawai) console.error('Gagal memuat pegawai:', errPegawai)
    if (errPiket) {
      console.error('Gagal memuat piket:', errPiket)
      alert('Gagal memuat jadwal piket: ' + errPiket.message)
    }

    const peta = {}
    for (const row of piket || []) {
      peta[`${row.pegawai_id}_${row.tanggal}`] = row.shift
    }

    setPegawaiList(pegawai || [])
    setJadwal(peta)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, tglMulai, tglAkhir])

  async function ubahShift(pegawaiId, tanggal, shiftBaru) {
    if (!sekolahId) return
    const key = `${pegawaiId}_${tanggal}`
    setSelSedangDiubah(key)

    try {
      if (!shiftBaru) {
        // "Tidak Piket" — hapus baris, sama seperti uncheck di checklist lama
        const { error } = await supabase
          .from('piket_harian')
          .delete()
          .eq('sekolah_id', sekolahId)
          .eq('pegawai_id', pegawaiId)
          .eq('tanggal', tanggal)
        if (error) throw error
        setJadwal((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      } else {
        const { error } = await supabase
          .from('piket_harian')
          .upsert(
            { sekolah_id: sekolahId, pegawai_id: pegawaiId, tanggal, shift: shiftBaru },
            { onConflict: 'pegawai_id,tanggal' }
          )
        if (error) throw error
        setJadwal((prev) => ({ ...prev, [key]: shiftBaru }))
      }
    } catch (err) {
      alert('Gagal memperbarui jadwal: ' + (err.message || 'terjadi kesalahan'))
    } finally {
      setSelSedangDiubah(null)
    }
  }

  return (
    <Layout
      title="Jadwal Piket / Jaga"
      subtitle="Tersinkron dengan checklist Petugas Piket di Tugas Harian"
    >
      <div className="card p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary !px-2.5"
            onClick={() => setAwalMinggu((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="inline-flex items-center gap-1.5 font-medium text-sm px-2">
            <CalendarRange size={15} className="text-emerald-700" />
            {formatTanggalPendek(hariMinggu[0])} – {formatTanggalPendek(hariMinggu[6])}
          </span>
          <button
            className="btn-secondary !px-2.5"
            onClick={() => setAwalMinggu((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          className="btn-secondary text-xs"
          onClick={() => setAwalMinggu(awalMingguDari(new Date()))}
        >
          Minggu Ini
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr className="border-b-2 border-emerald-600/20">
              <th className="sticky left-0 bg-white">Nama</th>
              {hariMinggu.map((d, i) => (
                <th key={i} className="text-center whitespace-nowrap">
                  {NAMA_HARI[i]}<br /><span className="font-normal text-ink-700/40">{formatTanggalPendek(d)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Memuat jadwal...</td></tr>
            )}
            {!loading && pegawaiList.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Belum ada pegawai puskesmas aktif.</td></tr>
            )}
            {pegawaiList.map((p) => (
              <tr key={p.id} className="hover:bg-emerald-600/[0.03] transition-colors">
                <td className="font-medium sticky left-0 bg-white whitespace-nowrap">
                  {p.nama_lengkap}
                  {p.jabatan && <span className="block text-xs text-ink-700/40 font-normal">{p.jabatan}</span>}
                </td>
                {hariMinggu.map((d) => {
                  const tanggal = keYMD(d)
                  const key = `${p.id}_${tanggal}`
                  const shift = jadwal[key] || ''
                  const sedangDiubah = selSedangDiubah === key
                  return (
                    <td key={key} className="text-center">
                      <select
                        value={shift}
                        disabled={sedangDiubah}
                        onChange={(e) => ubahShift(p.id, tanggal, e.target.value)}
                        className={`text-xs rounded-lg border-0 py-1.5 px-2 font-medium cursor-pointer ${
                          shift ? SHIFT_KELAS[shift] : 'bg-ink-950/5 text-ink-700/40'
                        }`}
                      >
                        {SHIFT_OPSI.map((opsi) => (
                          <option key={opsi.value} value={opsi.value}>{opsi.label}</option>
                        ))}
                      </select>
                      {sedangDiubah && <Loader2 size={12} className="inline-block animate-spin ml-1 text-ink-700/40" />}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
