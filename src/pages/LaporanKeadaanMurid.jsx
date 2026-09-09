import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { Download, Printer, ChevronDown, FileSpreadsheet, Loader2, Calendar } from 'lucide-react'

function BatikOverlay({ patternId, strokeColor = '#d4af37', opacity = 1, size = 72 }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(8)"
        >
          <g fill="none" stroke={strokeColor} strokeWidth="1.1" opacity={opacity}>
            <ellipse cx={size / 2} cy={size * 0.333} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size / 2} cy={size * 0.667} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size * 0.333} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <ellipse cx={size * 0.667} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <circle cx={size / 2} cy={size / 2} r={size * 0.042} opacity="0.7" />
          </g>
          <path
            d={`M0 ${size} L${size * 0.25} ${size * 0.75} L${size * 0.5} ${size} L${size * 0.75} ${size * 0.75} L${size} ${size}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.35}
          />
          <path
            d={`M0 0 L${size * 0.25} ${size * 0.25} L0 ${size * 0.5}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.35}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

function hitungUsia(tanggalLahir, tahunRef) {
  if (!tanggalLahir) return null
  const birthYear = new Date(tanggalLahir).getFullYear()
  if (isNaN(birthYear)) return null
  return tahunRef - birthYear
}

export default function LaporanKeadaanMurid() {
  const { sekolahId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rekapData, setRekapData] = useState([])
  const [rekapUsia, setRekapUsia] = useState([])
  const [rekapAgama, setRekapAgama] = useState([])
  const [rekapKewarganegaraan, setRekapKewarganegaraan] = useState({ wniL: 0, wniP: 0, wnaL: 0, wnaP: 0 })
  
  const [bulan, setBulan] = useState(new Date().getMonth() + 1)
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef(null)

  const BULAN_OPTIONS = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ]

  const LIST_AGAMA = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu', 'Lainnya']

  useEffect(() => {
    function handleClickOutside(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadLaporan() {
    if (!sekolahId) {
      setRekapData([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const [{ data: kelasList, error: kelasError }, { data: siswaList, error: siswaError }] = await Promise.all([
        supabase
          .from('kelas')
          .select('id, nama_kelas, tingkat')
          .eq('sekolah_id', sekolahId)
          .order('nama_kelas'),
        supabase
          .from('siswa')
          .select('id, kelas_id, jenis_kelamin, status, tanggal_lahir, agama, kewarganegaraan')
          .eq('sekolah_id', sekolahId)
          .eq('status', 'aktif')
      ])

      if (kelasError) throw kelasError
      if (siswaError) throw siswaError

      const siswaAktif = siswaList || []

      // 1. Rekapitulasi Utama per Kelas
      const rekap = (kelasList || []).map((k) => {
        const siswaKelas = siswaAktif.filter((s) => s.kelas_id === k.id)
        const l = siswaKelas.filter((s) => s.jenis_kelamin === 'L').length
        const p = siswaKelas.filter((s) => s.jenis_kelamin === 'P').length
        const total = l + p

        return {
          id: k.id,
          nama_kelas: k.nama_kelas,
          awal_l: l, awal_p: p, awal_total: total,
          masuk_l: 0, masuk_p: 0,
          keluar_l: 0, keluar_p: 0,
          akhir_l: l, akhir_p: p, akhir_total: total,
        }
      })
      setRekapData(rekap)

      // 2. Rekapitulasi Menurut Usia (<6, 6, 7, 8, 9, 10, 11, 12, >12)
      const kategoriUsia = [
        { key: '<6', label: '< 6 Tahun', check: (u) => u !== null && u < 6 },
        { key: '6', label: '6 Tahun', check: (u) => u === 6 },
        { key: '7', label: '7 Tahun', check: (u) => u === 7 },
        { key: '8', label: '8 Tahun', check: (u) => u === 8 },
        { key: '9', label: '9 Tahun', check: (u) => u === 9 },
        { key: '10', label: '10 Tahun', check: (u) => u === 10 },
        { key: '11', label: '11 Tahun', check: (u) => u === 11 },
        { key: '12', label: '12 Tahun', check: (u) => u === 12 },
        { key: '>12', label: '> 12 Tahun', check: (u) => u !== null && u > 12 },
      ]

      const dataUsia = kategoriUsia.map((kat) => {
        const filtered = siswaAktif.filter((s) => kat.check(hitungUsia(s.tanggal_lahir, tahun)))
        const l = filtered.filter((s) => s.jenis_kelamin === 'L').length
        const p = filtered.filter((s) => s.jenis_kelamin === 'P').length
        return { label: kat.label, l, p, total: l + p }
      })
      setRekapUsia(dataUsia)

      // 3. Rekapitulasi Menurut Agama
      const dataAgama = LIST_AGAMA.map((agm) => {
        const filtered = siswaAktif.filter((s) => (s.agama || '').toLowerCase() === agm.toLowerCase())
        const l = filtered.filter((s) => s.jenis_kelamin === 'L').length
        const p = filtered.filter((s) => s.jenis_kelamin === 'P').length
        return { agama: agm, l, p, total: l + p }
      })
      setRekapAgama(dataAgama)

      // 4. Rekapitulasi Kewarganegaraan
      const wni = siswaAktif.filter((s) => !s.kewarganegaraan || s.kewarganegaraan.toUpperCase() === 'WNI')
      const wna = siswaAktif.filter((s) => s.kewarganegaraan && s.kewarganegaraan.toUpperCase() === 'WNA')
      setRekapKewarganegaraan({
        wniL: wni.filter((s) => s.jenis_kelamin === 'L').length,
        wniP: wni.filter((s) => s.jenis_kelamin === 'P').length,
        wnaL: wna.filter((s) => s.jenis_kelamin === 'L').length,
        wnaP: wna.filter((s) => s.jenis_kelamin === 'P').length,
      })

    } catch (err) {
      console.error('Gagal memuat laporan keadaan murid:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLaporan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, bulan, tahun])

  const totalSummary = rekapData.reduce(
    (acc, row) => ({
      awal_l: acc.awal_l + row.awal_l,
      awal_p: acc.awal_p + row.awal_p,
      awal_total: acc.awal_total + row.awal_total,
      masuk_l: acc.masuk_l + row.masuk_l,
      masuk_p: acc.masuk_p + row.masuk_p,
      keluar_l: acc.keluar_l + row.keluar_l,
      keluar_p: acc.keluar_p + row.keluar_p,
      akhir_l: acc.akhir_l + row.akhir_l,
      akhir_p: acc.akhir_p + row.akhir_p,
      akhir_total: acc.akhir_total + row.akhir_total,
    }),
    { awal_l: 0, awal_p: 0, awal_total: 0, masuk_l: 0, masuk_p: 0, keluar_l: 0, keluar_p: 0, akhir_l: 0, akhir_p: 0, akhir_total: 0 }
  )

  function handleExportExcel() {
    setShowExportMenu(false)
    const namaBulan = BULAN_OPTIONS.find((b) => b.value === Number(bulan))?.label || ''

    const rowsUtama = rekapData.map((r, i) => ({
      No: i + 1,
      Kelas: r.nama_kelas,
      'Awal (L)': r.awal_l,
      'Awal (P)': r.awal_p,
      'Awal (Jml)': r.awal_total,
      'Masuk (L)': r.masuk_l,
      'Masuk (P)': r.masuk_p,
      'Keluar (L)': r.keluar_l,
      'Keluar (P)': r.keluar_p,
      'Akhir (L)': r.akhir_l,
      'Akhir (P)': r.akhir_p,
      'Akhir (Jml)': r.akhir_total,
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsUtama), 'Keadaan Murid')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rekapUsia), 'Menurut Usia')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rekapAgama), 'Menurut Agama')
    XLSX.writeFile(wb, `Laporan-Keadaan-Murid-${namaBulan}-${tahun}.xlsx`)
  }

  function handlePrintPDF() {
    setShowExportMenu(false)
    window.print()
  }

  if (!sekolahId) {
    return (
      <Layout title="Laporan Keadaan Murid" subtitle="Belum ada sekolah aktif">
        <div className="card p-8 text-center">
          <p className="font-display text-lg font-semibold text-ink-950">Belum ada sekolah aktif.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      title="Laporan Keadaan Murid"
      subtitle="Rekapitulasi jumlah siswa awal bulan, mutasi, akhir bulan, rincian usia, agama, dan kewarganegaraan"
      actions={
        <div className="relative print:hidden" ref={exportMenuRef}>
          <button className="btn-secondary" onClick={() => setShowExportMenu((v) => !v)}>
            <Download size={16} /> Unduh / Cetak <ChevronDown size={14} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-1.5 w-56 card p-1.5 z-20 shadow-lg">
              <button
                onClick={handleExportExcel}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-700 hover:bg-ink-900/[0.05] text-left"
              >
                <FileSpreadsheet size={16} /> Export Excel (.xlsx)
              </button>
              <button
                onClick={handlePrintPDF}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-700 hover:bg-ink-900/[0.05] text-left"
              >
                <Printer size={16} /> Cetak / Unduh PDF
              </button>
            </div>
          )}
        </div>
      }
    >
      {/* Banner / Filter Periode */}
      <div className="relative overflow-hidden rounded-xl p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-blue-900 to-blue-950 text-white print:hidden">
        <BatikOverlay patternId="batikLaporanMurid" strokeColor="#d4af37" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center shrink-0">
            <Calendar size={20} className="text-brass-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-white">Periode Laporan</h3>
            <p className="text-xs text-white/70">Pilih bulan dan tahun untuk melihat rekapitulasi</p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <select
            className="input-field bg-white/10 border-white/20 text-white [&>option]:text-ink-950"
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
          >
            {BULAN_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="input-field w-28 bg-white/10 border-white/20 text-white font-mono"
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. TABEL REKAPITULASI UTAMA */}
        <div className="card relative overflow-hidden overflow-x-auto">
          <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 to-brass-400 print:hidden" />
          <div className="p-4 border-b border-ink-900/10">
            <h4 className="font-display font-bold text-ink-950 text-base">Rekapitulasi Keadaan Murid</h4>
          </div>
          <table className="table-shell text-center">
            <thead>
              <tr>
                <th rowSpan={2} className="w-12 text-center">No</th>
                <th rowSpan={2} className="text-left">Kelas</th>
                <th colSpan={3} className="border-b border-ink-900/10">Awal Bulan</th>
                <th colSpan={2} className="border-b border-ink-900/10">Masuk</th>
                <th colSpan={2} className="border-b border-ink-900/10">Keluar</th>
                <th colSpan={3} className="border-b border-ink-900/10">Akhir Bulan</th>
              </tr>
              <tr>
                <th className="w-12">L</th>
                <th className="w-12">P</th>
                <th className="w-16 bg-ink-900/[0.02]">Jml</th>
                <th className="w-12">L</th>
                <th className="w-12">P</th>
                <th className="w-12">L</th>
                <th className="w-12">P</th>
                <th className="w-12">L</th>
                <th className="w-12">P</th>
                <th className="w-16 bg-blue-50/50">Jml</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-ink-700/60">
                    <Loader2 size={18} className="animate-spin inline mr-2 text-blue-900" /> Memuat data...
                  </td>
                </tr>
              ) : rekapData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-ink-700/50">
                    Belum ada data murid terdaftar.
                  </td>
                </tr>
              ) : (
                rekapData.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="text-center font-mono text-xs">{idx + 1}</td>
                    <td className="text-left font-medium text-ink-950">{row.nama_kelas}</td>
                    <td>{row.awal_l}</td>
                    <td>{row.awal_p}</td>
                    <td className="font-semibold bg-ink-900/[0.02]">{row.awal_total}</td>
                    <td className="text-emerald-600">{row.masuk_l}</td>
                    <td className="text-emerald-600">{row.masuk_p}</td>
                    <td className="text-red-600">{row.keluar_l}</td>
                    <td className="text-red-600">{row.keluar_p}</td>
                    <td>{row.akhir_l}</td>
                    <td>{row.akhir_p}</td>
                    <td className="font-bold text-blue-950 bg-blue-50/40">{row.akhir_total}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && rekapData.length > 0 && (
              <tfoot>
                <tr className="bg-ink-900/[0.03] font-bold text-ink-950 border-t-2 border-ink-900/20">
                  <td colSpan={2} className="text-center py-3">JUMLAH TOTAL</td>
                  <td>{totalSummary.awal_l}</td>
                  <td>{totalSummary.awal_p}</td>
                  <td className="bg-ink-900/[0.05]">{totalSummary.awal_total}</td>
                  <td className="text-emerald-600">{totalSummary.masuk_l}</td>
                  <td className="text-emerald-600">{totalSummary.masuk_p}</td>
                  <td className="text-red-600">{totalSummary.keluar_l}</td>
                  <td className="text-red-600">{totalSummary.keluar_p}</td>
                  <td>{totalSummary.akhir_l}</td>
                  <td>{totalSummary.akhir_p}</td>
                  <td className="text-blue-950 bg-blue-100/50">{totalSummary.akhir_total}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* GRID RINCIAN 3 BAGIAN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 2. RINCIAN MENURUT USIA */}
          <div className="card overflow-hidden">
            <div className="p-3.5 border-b border-ink-900/10 bg-ink-900/[0.02]">
              <h4 className="font-display font-bold text-ink-950 text-sm">Data Rinci Menurut Usia</h4>
            </div>
            <table className="table-shell text-center text-xs">
              <thead>
                <tr>
                  <th className="text-left">Usia</th>
                  <th className="w-12">L</th>
                  <th className="w-12">P</th>
                  <th className="w-16 bg-blue-50/50">Jml</th>
                </tr>
              </thead>
              <tbody>
                {rekapUsia.map((u, i) => (
                  <tr key={i}>
                    <td className="text-left font-medium">{u.label}</td>
                    <td>{u.l}</td>
                    <td>{u.p}</td>
                    <td className="font-bold text-blue-950 bg-blue-50/20">{u.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-ink-900/[0.03] font-bold text-ink-950">
                  <td className="text-left">Total</td>
                  <td>{rekapUsia.reduce((a, b) => a + b.l, 0)}</td>
                  <td>{rekapUsia.reduce((a, b) => a + b.p, 0)}</td>
                  <td className="bg-blue-100/40">{rekapUsia.reduce((a, b) => a + b.total, 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 3. RINCIAN MENURUT AGAMA */}
          <div className="card overflow-hidden">
            <div className="p-3.5 border-b border-ink-900/10 bg-ink-900/[0.02]">
              <h4 className="font-display font-bold text-ink-950 text-sm">Data Rinci Menurut Agama</h4>
            </div>
            <table className="table-shell text-center text-xs">
              <thead>
                <tr>
                  <th className="text-left">Agama</th>
                  <th className="w-12">L</th>
                  <th className="w-12">P</th>
                  <th className="w-16 bg-blue-50/50">Jml</th>
                </tr>
              </thead>
              <tbody>
                {rekapAgama.map((a, i) => (
                  <tr key={i}>
                    <td className="text-left font-medium">{a.agama}</td>
                    <td>{a.l}</td>
                    <td>{a.p}</td>
                    <td className="font-bold text-blue-950 bg-blue-50/20">{a.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-ink-900/[0.03] font-bold text-ink-950">
                  <td className="text-left">Total</td>
                  <td>{rekapAgama.reduce((acc, b) => acc + b.l, 0)}</td>
                  <td>{rekapAgama.reduce((acc, b) => acc + b.p, 0)}</td>
                  <td className="bg-blue-100/40">{rekapAgama.reduce((acc, b) => acc + b.total, 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 4. RINCIAN MENURUT KEWARGANEGARAAN */}
          <div className="card overflow-hidden">
            <div className="p-3.5 border-b border-ink-900/10 bg-ink-900/[0.02]">
              <h4 className="font-display font-bold text-ink-950 text-sm">Data Rinci Kewarganegaraan</h4>
            </div>
            <table className="table-shell text-center text-xs">
              <thead>
                <tr>
                  <th className="text-left">Status</th>
                  <th className="w-12">L</th>
                  <th className="w-12">P</th>
                  <th className="w-16 bg-blue-50/50">Jml</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-left font-medium">WNI</td>
                  <td>{rekapKewarganegaraan.wniL}</td>
                  <td>{rekapKewarganegaraan.wniP}</td>
                  <td className="font-bold text-blue-950 bg-blue-50/20">
                    {rekapKewarganegaraan.wniL + rekapKewarganegaraan.wniP}
                  </td>
                </tr>
                <tr>
                  <td className="text-left font-medium">WNA</td>
                  <td>{rekapKewarganegaraan.wnaL}</td>
                  <td>{rekapKewarganegaraan.wnaP}</td>
                  <td className="font-bold text-blue-950 bg-blue-50/20">
                    {rekapKewarganegaraan.wnaL + rekapKewarganegaraan.wnaP}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-ink-900/[0.03] font-bold text-ink-950">
                  <td className="text-left">Total</td>
                  <td>{rekapKewarganegaraan.wniL + rekapKewarganegaraan.wnaL}</td>
                  <td>{rekapKewarganegaraan.wniP + rekapKewarganegaraan.wnaP}</td>
                  <td className="bg-blue-100/40">
                    {rekapKewarganegaraan.wniL +
                      rekapKewarganegaraan.wniP +
                      rekapKewarganegaraan.wnaL +
                      rekapKewarganegaraan.wnaP}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
