import { useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { Upload, X, Loader2, CheckCircle2, AlertCircle, AlertTriangle, Download } from 'lucide-react'

/**
 * Tombol + Modal "Input Data Massal BKU"
 *
 * Menerima 3 jenis file:
 *   1) PDF  — "Buku Kas Umum" hasil unduhan ARKAS (PDF berbasis teks). Dibaca langsung
 *             di browser oleh src/lib/bkuPdf.js. Tidak perlu konversi lagi.
 *   2) CSV  — hasil konversi pdf_ke_csv_bku.py, atau diisi manual lewat template.
 *   3) Excel (.xlsx/.xls) — sama seperti CSV (sheet pertama yang dibaca).
 *
 * Kolom yang dibaca (CSV/Excel):
 *   tanggal, no_bukti, uraian, penerimaan, pengeluaran,
 *   kode_kegiatan, kode_rekening, jumlah_barang, saldo_dokumen
 * (saldo_dokumen dipakai HANYA untuk validasi silang, tidak disimpan ke database —
 * saldo berjalan selalu dihitung ulang dari penerimaan dan pengeluaran.)
 *
 * Upload akan MENGHAPUS dulu data bku_kas pada tahun+bulan yang sama dengan baris-baris
 * di file, baru insert ulang — supaya upload berkali-kali tidak menumpuk jadi dobel.
 * Satu file boleh berisi lebih dari satu bulan; tiap baris dikelompokkan ke bulan sesuai
 * tanggalnya sendiri, bukan filter Bulan yang aktif di halaman.
 *
 * Penggunaan di Keuangan.jsx (sudah ada di file itu):
 *   <BkuImportModal bulan={bulan} tahun={tahun} onSelesai={loadBkuData} />
 */

const TEMPLATE_HEADERS = [
  'tanggal', 'no_bukti', 'uraian', 'penerimaan', 'pengeluaran',
  'kode_kegiatan', 'kode_rekening', 'jumlah_barang', 'saldo_dokumen',
]

// Baris contoh. Uraiannya diawali "[CONTOH]" sehingga OTOMATIS DIABAIKAN saat impor,
// jadi tidak ikut tersimpan kalau lupa dihapus. Hapus tanda itu / timpa dengan data asli.
// Saldo pada contoh ini konsisten (saldo = saldo sebelumnya + penerimaan - pengeluaran).
const TEMPLATE_CONTOH = [
  ['2026-05-01', '', '[CONTOH] Saldo Bank Bulan April 2026', 37800000, 0, '', '', '', 37800000],
  ['2026-05-04', 'BPU01', '[CONTOH] Matematika kelas 4', 0, 231000, '05.02.04.', '5.2.05.01.01.0001', 1, 37569000],
  ['2026-05-04', '', '[CONTOH] Terima PPN Pengadaan Buku Teks', 416771, 0, '05.02.04.', '5.2.05.01.01.0001', '', 37985771],
  ['2026-05-04', '', '[CONTOH] Setor PPN Pengadaan Buku Teks', 0, 416771, '05.02.04.', '5.2.05.01.01.0001', '', 37569000],
  ['2026-05-31', '', '[CONTOH] Bunga Bank', 15000, 0, '', '', '', 37584000],
]

// Isi sheet "Petunjuk" di template Excel
const TEMPLATE_PETUNJUK = [
  ['PETUNJUK PENGISIAN TEMPLATE BKU'],
  [''],
  ['Cara paling mudah: unggah langsung PDF "Buku Kas Umum" dari ARKAS — tidak perlu template ini. Template ini untuk input manual / koreksi.'],
  [''],
  ['Kolom', 'Wajib?', 'Format', 'Contoh', 'Keterangan'],
  ['tanggal', 'Ya', 'YYYY-MM-DD (DD-MM-YYYY juga diterima)', '2026-05-04', 'Tanggal transaksi. Bulan & tahun data diambil dari kolom ini, BUKAN dari filter Bulan/Tahun di halaman Keuangan.'],
  ['no_bukti', 'Tidak', 'Teks', 'BPU01', 'Nomor bukti seperti di kolom "No. Bukti" BKU. Kosongkan untuk baris yang memang tidak punya nomor bukti (saldo awal, Terima/Setor PPN & PPh, bunga bank, tarik tunai).'],
  ['uraian', 'Ya', 'Teks', 'Matematika kelas 4', 'Uraian transaksi. Baris dengan uraian kosong dilewati.'],
  ['penerimaan', 'Ya', 'Angka tanpa titik/koma/Rp', '416771', 'Uang masuk. Isi 0 (bukan dikosongkan) bila baris ini bukan penerimaan.'],
  ['pengeluaran', 'Ya', 'Angka tanpa titik/koma/Rp', '231000', 'Uang keluar. Isi 0 bila baris ini bukan pengeluaran.'],
  ['kode_kegiatan', 'Tidak', 'xx.xx.xx. (ada titik di akhir)', '05.02.04.', 'Kode kegiatan dari ARKAS. Kosongkan untuk baris saldo awal, bunga bank, tarik tunai, dan pergeseran uang.'],
  ['kode_rekening', 'Tidak', 'x.x.xx.xx.xx.xxxx (4 digit terakhir)', '5.2.05.01.01.0001', 'Kode rekening belanja, harus lengkap 4 digit terakhir. Di PDF ARKAS kode ini sering terpotong dua baris ("5.2.05.01.01.00" lalu "01") — gabungkan jadi satu.'],
  ['jumlah_barang', 'Tidak', 'Angka', '4', 'Jumlah barang. Tidak ada di PDF Buku Kas Umum, jadi boleh dikosongkan.'],
  ['saldo_dokumen', 'Tidak', 'Angka tanpa titik/koma/Rp', '37569000', 'Saldo SETELAH baris ini menurut dokumen. Hanya untuk pengecekan silang (tidak disimpan). Kosongkan kalau tidak ada.'],
  [''],
  ['CATATAN PENTING'],
  ['1. Yang dibaca hanya sheet pertama ("Data BKU"). Baris yang uraiannya diawali [CONTOH] otomatis diabaikan — hapus atau timpa dengan data asli.'],
  ['2. Satu file boleh berisi lebih dari satu bulan. Tiap baris masuk ke bulan sesuai tanggalnya.'],
  ['3. Upload MENGGANTIKAN seluruh data BKU pada bulan-bulan yang ada di file (bukan menambah). Aman diunggah ulang untuk koreksi.'],
  ['4. Masukkan semua baris persis seperti di BKU, termasuk saldo awal ("Saldo Bank Bulan April"), Tarik Tunai, Pergeseran Uang, serta Terima/Setor PPN dan PPh. Dengan begitu total penerimaan/pengeluaran sama dengan baris "Jumlah" di BKU.'],
  ['5. Tulis angka polos: 1500000, bukan 1.500.000 atau Rp 1,5 juta. Pisahan desimal tidak diperlukan.'],
  ['6. Kalau saldo_dokumen diisi dan tidak cocok dengan hitungan saldo berjalan, modal akan memberi peringatan sebelum data disimpan.'],
]

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function unduhBlob(isi, nama, tipe) {
  const blob = new Blob([isi], { type: tipe })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function unduhTemplateBkuCsv() {
  const baris = [TEMPLATE_HEADERS, ...TEMPLATE_CONTOH]
  const csv = baris.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  unduhBlob('\uFEFF' + csv, 'template-bku.csv', 'text/csv;charset=utf-8;')
}

// Template Excel: sheet 1 = data (dibaca importer), sheet 2 = petunjuk lengkap
function unduhTemplateBkuExcel() {
  const wb = XLSX.utils.book_new()

  const wsData = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_CONTOH])
  wsData['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 42 }, { wch: 13 }, { wch: 13 },
    { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsData, 'Data BKU')

  const wsInfo = XLSX.utils.aoa_to_sheet(TEMPLATE_PETUNJUK)
  wsInfo['!cols'] = [{ wch: 16 }, { wch: 9 }, { wch: 36 }, { wch: 20 }, { wch: 100 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Petunjuk')

  XLSX.writeFile(wb, 'template-bku.xlsx')
}

function toNumber(val) {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

// Terima: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, objek Date, atau nomor seri tanggal Excel.
// Hasil selalu YYYY-MM-DD (atau '' kalau tidak dikenali).
function normalTanggal(val) {
  if (val === null || val === undefined || val === '') return ''
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`
  }
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : ''
  }
  const s = String(val).trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return ''
}

function normalizeRow(row) {
  return {
    tanggal: normalTanggal(row.tanggal),
    no_bukti: (row.no_bukti || '').toString().trim() || null,
    uraian: (row.uraian || '').toString().trim(),
    penerimaan: toNumber(row.penerimaan),
    pengeluaran: toNumber(row.pengeluaran),
    kode_kegiatan: (row.kode_kegiatan || '').toString().trim() || null,
    kode_rekening: (row.kode_rekening || '').toString().trim() || null,
    jumlah_barang: (() => {
      const v = row.jumlah_barang ?? row.JumlahBarang ?? row['Jumlah Barang'] ?? row['Jumlah_Barang']
      return v !== undefined && v !== '' ? toNumber(v) : null
    })(),
    saldo_dokumen: row.saldo_dokumen !== undefined && row.saldo_dokumen !== null && row.saldo_dokumen !== ''
      ? toNumber(row.saldo_dokumen)
      : null,
  }
}

function tahunBulanDari(tanggal) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggal)
  if (!m) return null
  return { tahun: parseInt(m[1], 10), bulan: parseInt(m[2], 10) }
}

const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

export default function BkuImportModal({ tahun, bulan, npsn, onSelesai }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState([])
  const [invalidCount, setInvalidCount] = useState(0)
  const [mismatchCount, setMismatchCount] = useState(0)
  const [ringkasan, setRingkasan] = useState(null) // hanya terisi untuk file PDF
  const [peringatanPdf, setPeringatanPdf] = useState([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  function resetState() {
    setRows([])
    setInvalidCount(0)
    setMismatchCount(0)
    setRingkasan(null)
    setPeringatanPdf([])
    setFileName('')
    setError('')
    setDone(null)
  }

  function processRows(rawRows) {
    const normalized = rawRows.map(normalizeRow)
    // Baris contoh dari template (uraian diawali "[CONTOH]") diabaikan diam-diam
    const bukanContoh = normalized.filter((r) => !/^\[CONTOH\]/i.test(r.uraian))
    const valid = bukanContoh.filter((r) => tahunBulanDari(r.tanggal) && r.uraian)
    setInvalidCount(bukanContoh.length - valid.length)

    // Validasi silang: hitung ulang saldo berjalan per bulan lalu bandingkan dengan
    // saldo_dokumen, supaya salah baca ketahuan sebelum data disimpan.
    const saldoBerjalan = new Map()
    let mismatches = 0
    valid.forEach((r) => {
      const { tahun: ty, bulan: bm } = tahunBulanDari(r.tanggal)
      const key = `${ty}-${bm}`
      const prev = saldoBerjalan.get(key) || 0
      const next = prev + r.penerimaan - r.pengeluaran
      saldoBerjalan.set(key, next)
      if (r.saldo_dokumen !== null && Math.round(next) !== Math.round(r.saldo_dokumen)) {
        mismatches += 1
      }
    })
    setMismatchCount(mismatches)
    setRows(valid)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    resetState()
    setFileName(file.name)

    const lower = file.name.toLowerCase()

    if (lower.endsWith('.pdf')) {
      setLoading(true)
      try {
        // Dimuat saat dibutuhkan saja, supaya pdf.js tidak ikut membebani halaman Keuangan
        const { parseBkuPdf } = await import('../lib/bkuPdf')
        const hasil = await parseBkuPdf(file)
        if (hasil.rows.length === 0) {
          setError('Tidak ada baris transaksi yang terbaca. Pastikan ini PDF "Buku Kas Umum" dari ARKAS yang berbasis teks (bukan hasil scan/foto).')
          return
        }
        const peringatan = [...hasil.peringatan]
        if (npsn && hasil.ringkasan.npsn && String(npsn) !== String(hasil.ringkasan.npsn)) {
          peringatan.unshift(`NPSN di PDF (${hasil.ringkasan.npsn}) berbeda dengan NPSN akun ini (${npsn}).`)
        }
        setRingkasan(hasil.ringkasan)
        setPeringatanPdf(peringatan)
        processRows(hasil.rows)
      } catch (err) {
        setError('Gagal membaca PDF: ' + err.message)
      } finally {
        setLoading(false)
      }
      return
    }

    if (lower.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => processRows(result.data),
        error: (err) => setError('Gagal membaca CSV: ' + err.message),
      })
      return
    }

    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
          processRows(json)
        } catch (err) {
          setError('Gagal membaca Excel: ' + err.message)
        }
      }
      reader.readAsBinaryString(file)
      return
    }

    setError('Format file tidak dikenali. Gunakan PDF BKU dari ARKAS, atau file .csv / .xlsx.')
  }

  const kelompok = [...new Set(rows.map((r) => {
    const { tahun: ty, bulan: bm } = tahunBulanDari(r.tanggal)
    return `${ty}-${String(bm).padStart(2, '0')}`
  }))].sort()

  async function handleImport() {
    if (rows.length === 0) return

    const konfirmasi = confirm(
      `Data BKU pada ${kelompok.length} bulan (${kelompok.join(', ')}) yang sudah ada akan DIHAPUS dan diganti dengan ${rows.length} baris dari file ini. Lanjutkan?`
    )
    if (!konfirmasi) return

    setLoading(true)
    setError('')

    try {
      // 1) Hapus dulu data pada bulan-bulan yang tersentuh file ini,
      //    supaya upload ulang tidak menumpuk jadi dobel.
      for (const key of kelompok) {
        const [ty, bm] = key.split('-').map(Number)
        let hapusQuery = supabase.from('bku_kas').delete().eq('tahun', ty).eq('bulan', bm)
        if (npsn) hapusQuery = hapusQuery.eq('npsn', npsn)
        const { error: hapusError } = await hapusQuery
        if (hapusError) throw hapusError
      }

      // 2) Insert data baru per batch
      const payload = rows.map((r) => {
        const { tahun: ty, bulan: bm } = tahunBulanDari(r.tanggal)
        return {
          npsn: npsn || null,
          tahun: ty,
          bulan: bm,
          tanggal: r.tanggal,
          no_bukti: r.no_bukti,
          uraian: r.uraian,
          kode_kegiatan: r.kode_kegiatan,
          kode_rekening: r.kode_rekening,
          jumlah_barang: r.jumlah_barang,
          penerimaan: r.penerimaan,
          pengeluaran: r.pengeluaran,
        }
      })

      const BATCH_SIZE = 200
      let insertedTotal = 0
      for (let i = 0; i < payload.length; i += BATCH_SIZE) {
        const batch = payload.slice(i, i + BATCH_SIZE)
        const { error: insertError, data } = await supabase
          .from('bku_kas')
          .insert(batch)
          .select('id')
        if (insertError) throw insertError
        insertedTotal += data?.length || 0
      }
      setDone({ inserted: insertedTotal, total: payload.length })
      onSelesai?.()
    } catch (err) {
      setError('Gagal menyimpan ke database: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        <Upload size={16} /> Input Data Massal BKU
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Input Data Massal BKU</h2>
              <button className="icon-btn" onClick={() => { setOpen(false); resetState() }}>
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-ink-700/60 mb-3">
              Unggah langsung <strong>PDF "Buku Kas Umum" dari ARKAS</strong> (PDF berbasis teks, bukan
              hasil scan) — atau file CSV/Excel. Bulan dan tahun diambil dari tanggal tiap baris.{' '}
              <strong>Upload baru akan menggantikan data BKU pada bulan-bulan yang ada di file</strong>,
              bukan menambah.
            </p>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                className="btn-secondary flex-1 justify-center"
                onClick={unduhTemplateBkuExcel}
                title="Template Excel berisi sheet data + sheet Petunjuk pengisian"
              >
                <Download size={16} /> Template Excel (+ petunjuk)
              </button>
              <button
                type="button"
                className="btn-secondary flex-1 justify-center"
                onClick={unduhTemplateBkuCsv}
                title="CSV tidak bisa memuat petunjuk — pakai template Excel untuk panduan lengkap"
              >
                <Download size={16} /> Template CSV
              </button>
            </div>

            <input
              type="file"
              accept=".pdf,.csv,.xlsx,.xls"
              onChange={handleFile}
              className="input-field mb-3"
            />

            {loading && !done && fileName && rows.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-ink-700/70 mb-3">
                <Loader2 size={16} className="animate-spin" /> Membaca file...
              </div>
            )}

            {fileName && rows.length > 0 && (
              <div className="text-sm text-ink-700/70 mb-3">
                File: <strong>{fileName}</strong> — {rows.length} baris siap diimpor
                {kelompok.length > 0 && <> ({kelompok.length} bulan: {kelompok.join(', ')})</>}
              </div>
            )}

            {/* Ringkasan hasil baca PDF */}
            {ringkasan && (
              <div className="text-sm bg-sage-50 rounded-lg p-3 mb-3 space-y-1">
                <div>
                  <strong>{ringkasan.namaSekolah || 'Sekolah tidak terbaca'}</strong>
                  {ringkasan.npsn && <> · NPSN {ringkasan.npsn}</>}
                  {ringkasan.bulan && ringkasan.tahun && <> · BKU {NAMA_BULAN[ringkasan.bulan - 1]} {ringkasan.tahun}</>}
                </div>
                {ringkasan.sumberDana && <div className="text-ink-700/60">Sumber dana: {ringkasan.sumberDana}</div>}
                <div>
                  Penerimaan {rupiah(ringkasan.sumTerima)} · Pengeluaran {rupiah(ringkasan.sumKeluar)}
                  {ringkasan.saldoAkhir !== null && <> · Saldo akhir {rupiah(ringkasan.saldoAkhir)}</>}
                </div>
                {peringatanPdf.length === 0 && ringkasan.totalPenerimaan !== null && (
                  <div className="flex items-center gap-1.5 text-sage-600">
                    <CheckCircle2 size={15} /> Total dan saldo setiap baris cocok dengan baris "Jumlah" di PDF.
                  </div>
                )}
              </div>
            )}

            {peringatanPdf.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-2 mb-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Perlu dicek sebelum disimpan:</div>
                  <ul className="list-disc ml-4">
                    {peringatanPdf.slice(0, 5).map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                  {peringatanPdf.length > 5 && <div>...dan {peringatanPdf.length - 5} peringatan lain.</div>}
                </div>
              </div>
            )}

            {invalidCount > 0 && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-2 mb-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{invalidCount} baris dilewati karena tanggal atau uraian kosong/tidak valid.</span>
              </div>
            )}

            {!ringkasan && mismatchCount > 0 && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-2 mb-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  {mismatchCount} baris punya saldo berjalan hasil hitung yang beda dari saldo_dokumen di file.
                  Kemungkinan ada baris yang salah terbaca — sebaiknya dicek dulu sebelum disimpan.
                </span>
              </div>
            )}

            {rows.length > 0 && (
              <div className="max-h-52 overflow-auto border rounded-lg text-xs mb-3">
                <table className="w-full">
                  <thead className="bg-sage-50 sticky top-0">
                    <tr>
                      <th className="text-left p-1">Tanggal</th>
                      <th className="text-left p-1">Bukti</th>
                      <th className="text-left p-1">Kode Rek.</th>
                      <th className="text-left p-1">Uraian</th>
                      <th className="text-right p-1">Penerimaan</th>
                      <th className="text-right p-1">Pengeluaran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1 whitespace-nowrap">{r.tanggal}</td>
                        <td className="p-1">{r.no_bukti || '-'}</td>
                        <td className="p-1 whitespace-nowrap">{r.kode_rekening || '-'}</td>
                        <td className="p-1">{r.uraian}</td>
                        <td className="p-1 text-right">{r.penerimaan ? r.penerimaan.toLocaleString('id-ID') : '-'}</td>
                        <td className="p-1 text-right">{r.pengeluaran ? r.pengeluaran.toLocaleString('id-ID') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && (
                  <div className="p-1 text-center text-ink-700/40">...dan {rows.length - 20} baris lainnya</div>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 mb-3">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 text-sm text-sage-600 mb-3">
                <CheckCircle2 size={16} /> Berhasil! {done.inserted} dari {done.total} baris tersimpan.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => { setOpen(false); resetState() }}>
                Tutup
              </button>
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={rows.length === 0 || loading}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Simpan {rows.length > 0 ? rows.length : ''} Baris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
