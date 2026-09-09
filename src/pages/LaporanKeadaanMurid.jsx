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

export default function LaporanKeadaanMurid() {
  const { sekolahId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rekapData, setRekapData] = useState([])
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
      // 1. Ambil daftar kelas
      const { data: kelasList, error: kelasError } = await supabase
        .from('kelas')
        .select('id, nama_kelas, tingkat')
        .eq('sekolah_id', sekolahId)
        .order('nama_kelas')

      if (kelasError) throw kelasError

      // 2. Ambil data siswa aktif
      const { data: siswaList, error: siswaError } = await supabase
        .from('siswa')
        .select('id, kelas_id, jenis_kelamin, status')
        .eq('sekolah_id', sekolahId)
        .eq('status', 'aktif')

      if (siswaError) throw siswaError

      // 3. Olah data rekapitulasi per kelas
      const rekap = (kelasList || []).map((k) => {
        const siswaKelas = (siswaList || []).filter((s) => s.kelas_id === k.id)

        const l = siswaKelas.filter((s) => s.jenis_kelamin === 'L').length
        const p = siswaKelas.filter((s) => s.jenis_kelamin === 'P').length
        const total = l + p

        // Catatan: Jika ada tabel mutasi/kehadiran khusus, angka masuk/keluar bisa dihitung secara terpisah.
        // Untuk rekap standar saat ini diset presisi berdasarkan status aktif berjalan.
        return {
          id: k.id,
          nama_kelas: k.nama_kelas,
          tingkat: k.tingkat,
          awal_l: l,
          awal_p: p,
          awal_total: total,
          masuk_l: 0,
          masuk_p: 0,
          keluar_l: 0,
          keluar_p: 0,
          akhir_l: l,
          akhir_p: p,
          akhir_total: total,
        }
      })

      setRekapData(rekap)
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

  // Total Keseluruhan
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
    {
      awal_l: 0,
      awal_p: 0,
      awal_total: 0,
      masuk_l: 0,
      masuk_p: 0,
      keluar_l: 0,
      keluar_p: 0,
      akhir_l: 0,
      akhir_p: 0,
      akhir_total: 0,
    }
  )

  function handleExportExcel() {
    setShowExportMenu(false)
    const namaBulan = BULAN_OPTIONS.find((b) => b.value === Number(bulan))?.label || ''

    const rows = rekapData.map((r, i) => ({
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

    rows.push({
      No: '',
      Kelas: 'JUMLAH TOTAL',
      'Awal (L)': totalSummary.awal_l,
      'Awal (P)': totalSummary.awal_p,
      'Awal (Jml)': totalSummary.awal_total,
      'Masuk (L)': totalSummary.masuk_l,
      'Masuk (P)': totalSummary.masuk_p,
      'Keluar (L)': totalSummary.keluar_l,
      'Keluar (P)': totalSummary.keluar_p,
      'Akhir (L)': totalSummary.akhir_l,
      'Akhir (P)': totalSummary.akhir_p,
      'Akhir (Jml)': totalSummary.akhir_total,
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Keadaan Murid')
    XLSX.writeFile(wb, `Laporan-Keadaan-Murid-${namaBulan}-${tahun}.xlsx`)
  }

  function handlePrintPDF() {
    setShowExportMenu(false)
    const namaBulan = BULAN_OPTIONS.find((b) => b.value === Number(bulan))?.label || ''

    const rowsHtml = rekapData
      .map(
        (r, i) => `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td>${r.nama_kelas}</td>
          <td style="text-align: center;">${r.awal_l}</td>
          <td style="text-align: center;">${r.awal_p}</td>
          <td style="text-align: center; font-weight: bold;">${r.awal_total}</td>
          <td style="text-align: center;">${r.masuk_l}</td>
          <td style="text-align: center;">${r.masuk_p}</td>
          <td style="text-align: center;">${r.keluar_l}</td>
          <td style="text-align: center;">${r.keluar_p}</td>
          <td style="text-align: center;">${r.akhir_l}</td>
          <td style="text-align: center;">${r.akhir_p}</td>
          <td style="text-align: center; font-weight: bold;">${r.akhir_total}</td>
        </tr>`
      )
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Laporan Keadaan Murid - ${namaBulan} ${tahun}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
          h2 { text-align: center; margin-bottom: 4px; font-size: 18px; text-transform: uppercase; }
          p.subtitle { text-align: center; margin-top: 0; font-size: 13px; color: #555; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #333; padding: 6px 8px; }
          th { background: #f2f2f2; text-align: center; }
          tfoot tr td { font-weight: bold; background: #fafafa; }
          @media print {
            @page { size: landscape; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <h2>Laporan Keadaan Murid</h2>
        <p class="subtitle">Bulan: ${namaBulan} ${tahun}</p>
        <table>
          <thead>
            <tr>
              <th rowspan="2">No</th>
              <th rowspan="2">Kelas</th>
              <th colspan="3">Awal Bulan</th>
              <th colspan="2">Mutasi Masuk</th>
              <th colspan="2">Mutasi Keluar</th>
              <th colspan="3">Akhir Bulan</th>
            </tr>
            <tr>
              <th>L</th><th>P</th><th>Jml</th>
              <th>L</th><th>P</th>
              <th>L</th><th>P</th>
              <th>L</th><th>P</th><th>Jml</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align: center;">JUMLAH TOTAL</td>
              <td style="text-align: center;">${totalSummary.awal_l}</td>
              <td style="text-align: center;">${totalSummary.awal_p}</td>
              <td style="text-align: center;">${totalSummary.awal_total}</td>
              <td style="text-align: center;">${totalSummary.masuk_l}</td>
              <td style="text-align: center;">${totalSummary.masuk_p}</td>
              <td style="text-align: center;">${totalSummary.keluar_l}</td>
              <td style="text-align: center;">${totalSummary.keluar_p}</td>
              <td style="text-align: center;">${totalSummary.akhir_l}</td>
              <td style="text-align: center;">${totalSummary.akhir_p}</td>
              <td style="text-align: center;">${totalSummary.akhir_total}</td>
            </tr>
          </tfoot>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `

    const printWin = window.open('', '_blank')
    printWin.document.write(html)
    printWin.document.close()
  }

  if (!sekolahId) {
    return (
      <Layout title="Laporan Keadaan Murid" subtitle="Belum ada sekolah aktif">
        <div className="card p-8 text-center">
          <p className="font-display text-lg font-semibold text-ink-950">Belum ada sekolah aktif.</p>
          <p className="text-sm text-ink-700/60 mt-1">Pilih sekolah aktif terlebih dahulu untuk melihat rekapitulasi data murid.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      title="Laporan Keadaan Murid"
      subtitle="Rekapitulasi jumlah siswa awal bulan, mutasi, dan akhir bulan"
      actions={
        <div className="relative" ref={exportMenuRef}>
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
      <div className="relative overflow-hidden rounded-xl p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-blue-900 to-blue-950 text-white">
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

      {/* Tabel Rekapitulasi */}
      <div className="card relative overflow-hidden overflow-x-auto">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 to-brass-400" />
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
            {loading && (
              <tr>
                <td colSpan={12} className="py-12 text-center text-ink-700/60">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin text-blue-900" />
                    <span>Memuat data rekapitulasi...</span>
                  </div>
                </td>
              </tr>
            )}

            {!loading && rekapData.length === 0 && (
              <tr>
                <td colSpan={12} className="py-12 text-center text-ink-700/50">
                  Belum ada data kelas atau siswa terdaftar.
                </td>
              </tr>
            )}

            {!loading &&
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
              ))}
          </tbody>
          {!loading && rekapData.length > 0 && (
            <tfoot>
              <tr className="bg-ink-900/[0.03] font-bold text-ink-950 border-t-2 border-ink-900/20">
                <td colSpan={2} className="text-center py-3">
                  JUMLAH TOTAL
                </td>
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
    </Layout>
  )
}
