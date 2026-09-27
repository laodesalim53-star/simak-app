import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { ChevronLeft, ChevronRight, CalendarRange, Info } from 'lucide-react'

// Halaman "Jadwal Piket Saya" — untuk PEGAWAI biasa (bukan admin) tenant
// puskesmas. Read-only: menampilkan jadwal MILIK SENDIRI dari tabel
// `piket_harian` yang sama dipakai admin di JadwalPiketPegawai.jsx dan di
// checklist TugasHarian.jsx. Identitas pegawai diambil dari
// `profil.pegawai_id` (lihat AuthContext.jsx: profil.pegawai_id mengarah
// ke pegawai_puskesmas.id untuk tenant puskesmas & kantor).

const SHIFT_LABEL = { pagi: 'Pagi', siang: 'Siang', malam: 'Malam' }
const SHIFT_KELAS = {
  pagi: 'bg-amber-100 text-amber-800',
  siang: 'bg-blue-100 text-blue-800',
  malam: 'bg-indigo-100 text-indigo-800',
}
const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

function keYMD(d) { return d.toISOString().slice(0, 10) }

function awalMingguDari(acuan) {
  const d = new Date(acuan)
  const hari = d.getDay()
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

function formatTanggalPanjang(d) {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
}

function isHariIni(d) {
  return keYMD(d) === keYMD(new Date())
}

export default function JadwalPiketSaya() {
  const { sekolahId, profil } = useAuth()
  const pegawaiId = profil?.pegawai_id

  const [awalMinggu, setAwalMinggu] = useState(() => awalMingguDari(new Date()))
  const [jadwal, setJadwal] = useState({}) // tanggal -> shift
  const [loading, setLoading] = useState(true)

  const hariMinggu = useMemo(() => tanggalDalamMinggu(awalMinggu), [awalMinggu])
  const tglMulai = keYMD(hariMinggu[0])
  const tglAkhir = keYMD(hariMinggu[6])

  useEffect(() => {
    async function muat() {
      if (!sekolahId || !pegawaiId) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error } = await supabase
        .from('piket_harian')
        .select('tanggal, shift')
        .eq('sekolah_id', sekolahId)
        .eq('pegawai_id', pegawaiId)
        .gte('tanggal', tglMulai)
        .lte('tanggal', tglAkhir)

      if (error) console.error('Gagal memuat jadwal piket:', error)

      const peta = {}
      for (const row of data || []) peta[row.tanggal] = row.shift
      setJadwal(peta)
      setLoading(false)
    }
    muat()
  }, [sekolahId, pegawaiId, tglMulai, tglAkhir])

  if (!pegawaiId) {
    return (
      <Layout title="Jadwal Piket Saya" subtitle="Jadwal piket/jaga mingguan Anda">
        <div className="card p-5 flex items-start gap-3">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-ink-700/70">
            Akun Anda belum terhubung ke data pegawai puskesmas, jadi jadwal piket belum bisa ditampilkan.
            Hubungi admin puskesmas untuk menghubungkan akun Anda ke data pegawai.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Jadwal Piket Saya" subtitle="Diisi oleh admin, otomatis tersinkron dari Jadwal Piket/Jaga">
      <div className="card p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-secondary !px-2.5" onClick={() => setAwalMinggu((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}>
            <ChevronLeft size={16} />
          </button>
          <span className="inline-flex items-center gap-1.5 font-medium text-sm px-2">
            <CalendarRange size={15} className="text-emerald-700" />
            {formatTanggalPanjang(hariMinggu[0])} – {formatTanggalPanjang(hariMinggu[6])}
          </span>
          <button className="btn-secondary !px-2.5" onClick={() => setAwalMinggu((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}>
            <ChevronRight size={16} />
          </button>
        </div>
        <button className="btn-secondary text-xs" onClick={() => setAwalMinggu(awalMingguDari(new Date()))}>Minggu Ini</button>
      </div>

      <div className="card divide-y divide-ink-950/5">
        {loading && <p className="text-center py-8 text-ink-700/50 text-sm">Memuat jadwal...</p>}
        {!loading && hariMinggu.map((d) => {
          const tanggal = keYMD(d)
          const shift = jadwal[tanggal]
          return (
            <div key={tanggal} className={`flex items-center justify-between px-4 py-3 ${isHariIni(d) ? 'bg-emerald-600/[0.04]' : ''}`}>
              <div>
                <p className={`text-sm font-medium ${isHariIni(d) ? 'text-emerald-700' : 'text-ink-950'}`}>
                  {NAMA_HARI[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                  {isHariIni(d) && <span className="ml-1.5 text-xs font-normal text-emerald-600">(hari ini)</span>}
                </p>
                <p className="text-xs text-ink-700/50">{formatTanggalPanjang(d)}</p>
              </div>
              {shift ? (
                <span className={`badge ${SHIFT_KELAS[shift]}`}>{SHIFT_LABEL[shift]}</span>
              ) : (
                <span className="badge bg-ink-950/5 text-ink-700/40">Tidak Piket</span>
              )}
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
