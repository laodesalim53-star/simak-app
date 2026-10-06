import { useEffect, useMemo, useState } from 'react'
import KopSurat from './KopSurat'
import { supabase } from '../lib/supabaseClient'
import {
  TAHUN_AJARAN,
  BULAN,
  SEMESTER,
  JML_HBE,
  KETERANGAN,
  toISODate,
  jumlahHariDalamBulan,
  getStatusTanggal,
} from '../lib/kalenderPendidikan'

// Tampilan kalender pendidikan setahun penuh (semua bulan sekaligus).
// Sumber data:
//  - hari libur / efektif / ujian dst. : lib/kalenderPendidikan + tabel kalender_overrides (sama dengan halaman Kalender Pendidikan)
//  - agenda Kepala Sekolah              : item "Kalender Pendidikan" di Administrasi Kepsek (prop `agenda`)

const NAMA_HARI = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb']
const BLN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const pecah = (iso) => String(iso).slice(0, 10).split('-').map(Number) // [tahun, bulan, tanggal]

function rentang(awal, akhir) {
  const [, m1, d1] = pecah(awal)
  const [, m2, d2] = pecah(akhir)
  if (awal === akhir) return `${d1} ${BLN_SINGKAT[m1 - 1]}`
  if (m1 === m2) return `${d1}-${d2} ${BLN_SINGKAT[m1 - 1]}`
  return `${d1} ${BLN_SINGKAT[m1 - 1]} - ${d2} ${BLN_SINGKAT[m2 - 1]}`
}

function BulanMini({ b, overrides, peta, perBulan, maksAgenda }) {
  const total = jumlahHariDalamBulan(b.tahun, b.bulan)
  const pertama = new Date(b.tahun, b.bulan - 1, 1).getDay()
  const sel = []
  for (let i = 0; i < pertama; i++) sel.push(null)
  for (let t = 1; t <= total; t++) {
    const iso = toISODate(b.tahun, b.bulan, t)
    sel.push({ t, iso, status: getStatusTanggal(iso, overrides) })
  }
  const kunci = `${b.tahun}-${String(b.bulan).padStart(2, '0')}`
  const agendaBulan = perBulan[kunci] || []

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <div className="flex items-baseline justify-between mb-1.5">
        <h4 className="font-display font-bold text-sm text-slate-800">{b.nama} {b.tahun}</h4>
        <span className="text-[10px] text-slate-500">HBE {JML_HBE[b.key] ?? '-'}</span>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {NAMA_HARI.map((h, i) => (
          <div key={h + i} className="text-center text-[9px] font-bold uppercase text-slate-400">{h}</div>
        ))}
        {sel.map((c, i) => c === null ? <div key={`k${i}`} /> : (
          <div
            key={c.iso}
            title={[c.status?.keterangan, ...(peta[c.iso] || [])].filter(Boolean).join(' | ') || undefined}
            className={`relative h-6 flex items-center justify-center rounded text-[11px] font-semibold ${
              c.status ? (KETERANGAN[c.status.kode]?.badge || 'bg-slate-200 text-slate-700') : 'text-slate-700'
            }`}
          >
            {c.t}
            {peta[c.iso] && <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 ring-1 ring-white" />}
          </div>
        ))}
      </div>
      {agendaBulan.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-[10px] leading-tight text-slate-600">
          {agendaBulan.slice(0, maksAgenda).map((a, i) => (
            <li key={i}><strong className="text-slate-800">{rentang(a.awal, a.akhir)}</strong> {a.kegiatan}</li>
          ))}
          {agendaBulan.length > maksAgenda && <li className="text-slate-400">+{agendaBulan.length - maksAgenda} agenda lain</li>}
        </ul>
      )}
    </div>
  )
}

function Legenda() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
      {Object.entries(KETERANGAN).map(([kode, v]) => (
        <span key={kode} className="inline-flex items-center gap-1.5">
          <span className={`w-3 h-3 rounded-sm ${v.dot}`} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          <strong className="text-slate-800">{kode}</strong> {v.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500" /> Agenda Kepala Sekolah
      </span>
    </div>
  )
}

export default function KalenderTahunan({ agenda = [], kepsek = '', nip = '', tempat = '' }) {
  const [overrides, setOverrides] = useState({})
  const [peringatan, setPeringatan] = useState('')

  useEffect(() => {
    let aktif = true
    supabase.from('kalender_overrides').select('*').then(({ data, error }) => {
      if (!aktif) return
      if (error) { setPeringatan('Perubahan tanggal dari halaman Kalender Pendidikan belum bisa dimuat.'); return }
      const map = {}
      ;(data || []).forEach((r) => { map[r.tanggal] = { kode: r.kode, keterangan: r.keterangan } })
      setOverrides(map)
    })
    return () => { aktif = false }
  }, [])

  // Agenda Kepsek -> penanda per tanggal + daftar per bulan
  const { peta, perBulan } = useMemo(() => {
    const peta = {}
    const perBulan = {}
    const taruh = (kunci, item) => { if (!perBulan[kunci]) perBulan[kunci] = []; perBulan[kunci].push(item) }
    agenda.forEach((r) => {
      if (!r.tanggal) return
      const awal = String(r.tanggal).slice(0, 10)
      const akhirMentah = String(r.data?.selesai || awal).slice(0, 10)
      const akhir = akhirMentah >= awal ? akhirMentah : awal
      const kegiatan = r.data?.kegiatan || 'Agenda'
      const [y, m, d] = pecah(awal)
      const [y2, m2, d2] = pecah(akhir)
      const dt = new Date(y, m - 1, d)
      const batas = new Date(y2, m2 - 1, d2)
      for (let n = 0; dt <= batas && n < 400; n++) {
        const iso = toISODate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
        if (!peta[iso]) peta[iso] = []
        peta[iso].push(kegiatan)
        dt.setDate(dt.getDate() + 1)
      }
      const item = { awal, akhir, kegiatan }
      taruh(awal.slice(0, 7), item)
      if (akhir.slice(0, 7) !== awal.slice(0, 7)) taruh(akhir.slice(0, 7), item)
    })
    Object.values(perBulan).forEach((arr) => arr.sort((a, b) => a.awal.localeCompare(b.awal)))
    return { peta, perBulan }
  }, [agenda])

  const semester = [SEMESTER.GANJIL, SEMESTER.GENAP]
  const bulanDi = (sem) => BULAN.filter((b) => sem.bulan.includes(b.key))
  const hariIni = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Tahun Pelajaran <span className="font-medium text-slate-700">{TAHUN_AJARAN}</span>. Titik kuning menandai tanggal yang
        punya agenda Kepala Sekolah; arahkan kursor ke tanggal untuk melihat keterangannya. Ubah status tanggal (libur, ujian, dsb.)
        lewat halaman Kalender Pendidikan, hasilnya otomatis tampil di sini.
      </p>

      {peringatan && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">{peringatan}</div>
      )}

      {semester.map((sem) => (
        <section key={sem.label}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h3 className="font-display font-semibold text-slate-900">{sem.label}</h3>
            <p className="text-xs text-slate-500">
              Total hari belajar efektif: <strong className="text-slate-700">{sem.totalHbe}</strong> hari
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {bulanDi(sem).map((b) => (
              <BulanMini key={b.key} b={b} overrides={overrides} peta={peta} perBulan={perBulan} maksAgenda={6} />
            ))}
          </div>
        </section>
      ))}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Keterangan</h3>
        <Legenda />
      </div>

      {/* Area cetak (hanya tampil saat print): 12 bulan dalam satu lembar A4 landscape */}
      <div id="cetak-kalender" className="hidden" style={{ color: '#000', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <KopSurat />
        <div style={{ textAlign: 'center', marginBottom: 8, fontWeight: 700, fontSize: '13pt' }}>
          KALENDER PENDIDIKAN<br />TAHUN PELAJARAN {TAHUN_AJARAN}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {BULAN.map((b) => (
            <BulanMini key={b.key} b={b} overrides={overrides} peta={peta} perBulan={perBulan} maksAgenda={2} />
          ))}
        </div>
        <div style={{ marginTop: 8 }}><Legenda /></div>
        <div style={{ marginTop: 14, marginLeft: '70%', textAlign: 'center', pageBreakInside: 'avoid', fontSize: '10pt' }}>
          <div>{tempat ? `${tempat}, ` : ''}{hariIni}</div>
          <div>Kepala Sekolah</div>
          <div style={{ height: 48 }} />
          <div style={{ fontWeight: 700, textDecoration: 'underline' }}>{kepsek || '........................'}</div>
          <div>NIP. {nip || '........................'}</div>
        </div>
      </div>
    </div>
  )
}
