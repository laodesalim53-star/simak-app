import { useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { Upload, X, Loader2, CheckCircle2, AlertCircle, AlertTriangle, Download, Trash2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { KOLOM_ALOKASI, adalahFormatTemplate, templateKeObjek, parseRkasMentah } from '../lib/rkasParser'
import { pdfKeMatriks } from '../lib/pdfKeMatriks'

/**
 * Tombol + Modal "Input Data Massal ARKAS"
 * Menerima PDF RKAS langsung dari ARKAS, atau CSV/Excel hasil konversi PDF
 * ARKAS (rencana anggaran sekolah).
 *
 * Kolom yang dibaca dari file berformat template:
 *   tahun_anggaran, no_urut, level, kode_rekening, kode_kegiatan, uraian,
 *   jumlah, status, is_item
 * Kolom alokasi per sumber dana (opsional, kosong dianggap 0) untuk cetak RKAS:
 *   alok_{reguler|daerah|afirmasi|kinerja|silpa|lainnya}_{operasi|modal}
 * (level wajib diisi di database — kalau kosong di file, diturunkan
 * otomatis dari is_item: item/rincian = 3, kelompok/header = 1.)
 *
 * Tahun anggaran diambil dari isi file, bukan dari filter Tahun di halaman Keuangan.
 *
 * PENYIMPANAN ATOMIK:
 *   Simpan memanggil fungsi database import_arkas (lihat import_arkas.sql). Hapus data
 *   lama + insert data baru + upsert penerimaan terjadi dalam SATU transaksi, jadi kalau
 *   gagal di tengah, data lama tetap utuh. sekolah_id diambil server dari akun yang login.
 *
 * HAPUS SEMUA:
 *   Tombol "Hapus Semua Data {tahun}" menghapus seluruh baris arkas_anggaran sekolah ini
 *   pada tahun yang sedang dipilih di halaman Keuangan (untuk mengulang dari awal bila
 *   ada kesalahan impor).
 *
 * Penggunaan di Keuangan.jsx:
 *   <ArkasImportModal tahunAnggaran={String(tahun)} onSelesai={...} />
 *
 * Berkas pendukung:
 *   src/lib/rkasParser.js    — pembaca format RKAS mentah & template
 *   src/lib/pdfKeMatriks.js  — pembaca PDF ARKAS (butuh: npm install pdfjs-dist)
 */

const TEMPLATE_HEADERS = [
  'tahun_anggaran', 'no_urut', 'level', 'kode_rekening', 'kode_kegiatan', 'uraian',
  'jumlah', 'status', 'is_item', ...KOLOM_ALOKASI,
]

// Baris contoh — sengaja pakai dua tahun anggaran berbeda untuk
// menunjukkan bahwa satu file boleh berisi lebih dari satu tahun.
// Kolom "level": 1 = kelompok/kode rekening, 3 = rincian/item barang.
const TEMPLATE_CONTOH = [
  ['2024', '1', '1', '5.1.02.01.01.00', '06.05.08.', 'Belanja ATK', '', 'header', 'FALSE'],
  ['2024', '2', '3', '5.1.02.01.01.00', '06.05.08.', 'Kertas HVS Folio', '420000', 'disetujui', 'TRUE'],
  ['2025', '1', '1', '5.1.02.03.05.00', '05.02.03.', 'Belanja Buku Siswa', '', 'header', 'FALSE'],
  ['2025', '2', '3', '5.1.02.03.05.00', '05.02.03.', 'KELAS II (BUKU SISWA) Tema 5 Pengalamanku', '170000', 'disetujui', 'TRUE'],
]

function unduhTemplateArkas() {
  // Contoh: rincian (is_item TRUE) dialokasikan ke BOSP Reguler - Belanja Operasi
  const contohLengkap = TEMPLATE_CONTOH.map((r) => [
    ...r,
    ...KOLOM_ALOKASI.map((k) => (r[8] === 'TRUE' && k === 'alok_reguler_operasi' ? r[6] : '0')),
  ])
  const baris = [TEMPLATE_HEADERS, ...contohLengkap]
  const csv = baris.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template-arkas.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function toNumber(val) {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function toBool(val) {
  if (typeof val === 'boolean') return val
  const s = String(val ?? '').trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'ya' || s === 'item'
}

function normalizeRow(row, idx) {
  const is_item = toBool(row.is_item)
  // "level" wajib diisi (NOT NULL) di tabel arkas_anggaran. Kalau kolom
  // level tidak ada di file, turunkan dari is_item: item/rincian = 3,
  // kelompok/header = 1.
  const level = row.level !== undefined && row.level !== ''
    ? toNumber(row.level)
    : (is_item ? 3 : 1)

  return {
    tahun_anggaran: (row.tahun_anggaran ?? '').toString().trim(),
    no_urut: row.no_urut !== undefined && row.no_urut !== '' ? toNumber(row.no_urut) : idx + 1,
    level,
    kode_rekening: (row.kode_rekening || '').toString().trim() || null,
    kode_kegiatan: (row.kode_kegiatan || '').toString().trim() || null,
    uraian: (row.uraian || '').toString().trim(),
    jumlah: toNumber(row.jumlah),
    status: (row.status || '').toString().trim() || null,
    is_item,
    ...Object.fromEntries(KOLOM_ALOKASI.map((k) => [k, toNumber(row[k])])),
  }
}

function tahunValid(tahun_anggaran) {
  return /^\d{4}$/.test(tahun_anggaran)
}

export default function ArkasImportModal({ tahunAnggaran, onSelesai }) {
  const auth = useAuth()
  // Sama seperti RkasCetak/Keuangan: sekolah_id dibaca dari profil akun
  const sekolahId = auth?.profil?.sekolah_id ?? auth?.sekolahId

  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState([])
  const [invalidCount, setInvalidCount] = useState(0)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [membaca, setMembaca] = useState(false) // sedang membaca file PDF
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  // Format RKAS asli dari ARKAS: baris penerimaan + peringatan hasil pembacaan
  const [mode, setMode] = useState('template') // 'template' | 'rkas'
  const [penerimaan, setPenerimaan] = useState([])
  const [peringatan, setPeringatan] = useState([])
  const [tahunTerdeteksi, setTahunTerdeteksi] = useState(true)
  // Hapus semua
  const [hapusLoading, setHapusLoading] = useState(false)
  const [hapusInfo, setHapusInfo] = useState('')

  function resetState() {
    setRows([])
    setInvalidCount(0)
    setFileName('')
    setError('')
    setDone(null)
    setMode('template')
    setPenerimaan([])
    setPeringatan([])
    setTahunTerdeteksi(true)
    setMembaca(false)
    setHapusInfo('')
  }

  function processRows(rawRows) {
    const normalized = rawRows.map(normalizeRow)
    const valid = normalized.filter((r) => tahunValid(r.tahun_anggaran) && r.uraian)
    setInvalidCount(normalized.length - valid.length)
    setRows(valid)
  }

  // matriksSheets = satu matriks (array of array) per sheet / per file CSV / per file PDF.
  // Dua format diterima: (1) template lama berheader tahun_anggaran, uraian, ...
  // (2) file RKAS asli dari ARKAS (PDF, atau hasil konversi PDF ke CSV/Excel),
  //     dibaca lewat isi barisnya.
  function prosesMatriks(matriksSheets) {
    const pertama = matriksSheets[0] || []
    if (adalahFormatTemplate(pertama)) {
      setMode('template')
      setPenerimaan([])
      setPeringatan([])
      setTahunTerdeteksi(true)
      processRows(templateKeObjek(pertama))
      return
    }

    const hasil = parseRkasMentah(matriksSheets.flat(), tahunAnggaran || '')
    setMode('rkas')
    setPenerimaan(hasil.penerimaan)
    setTahunTerdeteksi(hasil.tahunTerdeteksi)
    setInvalidCount(0)

    // Pengaman: total rincian belanja harus sama dengan total penerimaan.
    // Hanya peringatan (tidak memblokir) karena RKAS memang bisa belum seimbang.
    const catatan = [...hasil.peringatan]
    const totalBelanja = hasil.belanja.filter((b) => b.is_item).reduce((a, b) => a + b.jumlah, 0)
    const totalPenerimaan = hasil.penerimaan.reduce((a, p) => a + p.jumlah, 0)
    if (totalPenerimaan > 0 && hasil.belanja.length > 0 && Math.abs(totalBelanja - totalPenerimaan) > 1) {
      catatan.push(
        `Total belanja Rp ${totalBelanja.toLocaleString('id-ID')} tidak sama dengan total penerimaan Rp ${totalPenerimaan.toLocaleString('id-ID')}. Periksa pratinjau sebelum menyimpan.`
      )
    }
    setPeringatan(catatan)

    const tahunOk = /^\d{4}$/.test(hasil.tahun)
    setRows(tahunOk ? hasil.belanja : [])
    if (!tahunOk) {
      setError('Tahun anggaran tidak terbaca di file dan halaman Keuangan belum punya tahun yang valid.')
    } else if (hasil.belanja.length === 0) {
      setError('Tidak ada baris belanja yang dikenali. Pastikan file berisi tabel RKAS (kolom Kode Rekening, Kode Kegiatan, Uraian, Jumlah, dan sumber dana).')
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    resetState()
    setFileName(file.name)

    const lower = file.name.toLowerCase()

    if (lower.endsWith('.pdf')) {
      setMembaca(true)
      try {
        const matriks = await pdfKeMatriks(file)
        prosesMatriks([matriks])
      } catch (err) {
        setError('Gagal membaca PDF: ' + err.message)
      } finally {
        setMembaca(false)
      }
      return
    }

    if (lower.endsWith('.csv')) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (result) => prosesMatriks([result.data]),
        error: (err) => setError('Gagal membaca CSV: ' + err.message),
      })
      return
    }

    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' })
          // Semua sheet dibaca: hasil konversi PDF sering memecah halaman jadi beberapa sheet
          const semua = wb.SheetNames.map((nama) =>
            XLSX.utils.sheet_to_json(wb.Sheets[nama], { header: 1, defval: '', raw: true })
          )
          prosesMatriks(semua)
        } catch (err) {
          setError('Gagal membaca Excel: ' + err.message)
        }
      }
      reader.readAsBinaryString(file)
      return
    }

    setError('Format file tidak dikenali. Gunakan file .pdf dari ARKAS, atau .csv / .xlsx hasil konversinya.')
  }

  const kelompok = [...new Set(rows.map((r) => r.tahun_anggaran))].sort()

  async function handleImport() {
    if (rows.length === 0) return

    const konfirmasi = confirm(
      `Data ARKAS sekolah ini pada ${kelompok.length} tahun anggaran (${kelompok.join(', ')}) akan DIGANTI dengan ${rows.length} baris dari file ini.` +
      (mode === 'rkas' && penerimaan.length > 0 ? ` Data penerimaan (${penerimaan.length} baris) juga ikut diperbarui.` : '') +
      '\n\nPenggantian dilakukan dalam satu transaksi: kalau gagal, data lama tetap aman.' +
      '\n\nLanjutkan?'
    )
    if (!konfirmasi) return

    setLoading(true)
    setError('')
    setHapusInfo('')

    try {
      const payload = rows.map((r) => ({
        tahun_anggaran: r.tahun_anggaran,
        no_urut: r.no_urut,
        level: r.level,
        kode_rekening: r.kode_rekening,
        kode_kegiatan: r.kode_kegiatan,
        uraian: r.uraian,
        jumlah: r.jumlah,
        status: r.status,
        is_item: r.is_item,
        ...Object.fromEntries(KOLOM_ALOKASI.map((k) => [k, r[k]])),
      }))

      // Penerimaan (bagian A RKAS) — hanya untuk file RKAS asli dari ARKAS
      const payloadPen =
        mode === 'rkas' && penerimaan.length > 0
          ? penerimaan.map((p, i) => ({
              tahun_anggaran: rows[0].tahun_anggaran,
              kode: p.kode,
              uraian: p.uraian,
              tanda: p.tanda || null,
              jumlah: p.jumlah,
              no_urut: i + 1,
            }))
          : []

      // Satu panggilan = satu transaksi di database (hapus lama + insert baru + penerimaan)
      const { data, error: rpcError } = await supabase.rpc('import_arkas', {
        p_baris: payload,
        p_penerimaan: payloadPen,
      })
      if (rpcError) throw rpcError

      setDone({
        inserted: data?.baris ?? payload.length,
        total: payload.length,
        penerimaan: data?.penerimaan || 0,
      })
      onSelesai?.(kelompok[0])
    } catch (err) {
      const fungsiBelumAda = err?.code === 'PGRST202' || /import_arkas/i.test(err?.message || '')
      setError(
        fungsiBelumAda
          ? 'Fungsi import_arkas belum ada di database. Jalankan import_arkas.sql di Supabase SQL Editor. (' + err.message + ')'
          : 'Gagal menyimpan ke database, data lama tidak diubah: ' + err.message
      )
    } finally {
      setLoading(false)
    }
  }

  // Hapus semua data ARKAS sekolah ini pada tahun yang sedang dipilih di halaman Keuangan
  async function handleHapusSemua() {
    if (!sekolahId || !tahunAnggaran) return
    const ok = confirm(
      `Semua data ARKAS tahun ${tahunAnggaran} milik sekolah ini akan DIHAPUS PERMANEN. Tindakan ini tidak bisa dibatalkan.\n\nLanjutkan?`
    )
    if (!ok) return

    setHapusLoading(true)
    setError('')
    setHapusInfo('')
    setDone(null)
    const { data, error: err } = await supabase
      .from('arkas_anggaran')
      .delete()
      .eq('sekolah_id', sekolahId)
      .eq('tahun_anggaran', String(tahunAnggaran))
      .select('id')
    setHapusLoading(false)

    if (err) {
      setError('Gagal menghapus: ' + err.message)
      return
    }
    const n = data?.length || 0
    setHapusInfo(
      n === 0
        ? `Tidak ada data ARKAS tahun ${tahunAnggaran} yang terhapus.`
        : `Berhasil menghapus ${n} baris ARKAS tahun ${tahunAnggaran}.`
    )
    onSelesai?.(String(tahunAnggaran))
  }

  const sibuk = loading || membaca || hapusLoading

  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        <Upload size={16} /> Input Data Massal ARKAS
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Input Data Massal ARKAS</h2>
              <button className="icon-btn" onClick={() => { setOpen(false); resetState() }}>
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-ink-700/60 mb-3">
              Upload file PDF RKAS langsung dari ARKAS (bagian Penerimaan dan Belanja terbaca
              otomatis), atau file CSV/Excel hasil konversinya, atau file berformat template di
              bawah. Tahun anggaran diambil dari isi file (atau kolom <code>tahun_anggaran</code> pada
              format template) — bukan dari filter Tahun yang aktif di halaman ini — sehingga satu
              file boleh berisi laporan untuk tahun anggaran yang berbeda dari tahun berjalan.{' '}
              <strong>Upload baru akan menggantikan data ARKAS pada tahun anggaran yang ada di file ini</strong>,
              bukan menambah.
            </p>

            <button
              type="button"
              className="btn-secondary w-full mb-3 justify-center"
              onClick={unduhTemplateArkas}
            >
              <Download size={16} /> Unduh Template CSV
            </button>

            <input
              type="file"
              accept=".pdf,.csv,.xlsx,.xls"
              onChange={handleFile}
              className="input-field mb-3"
            />

            {membaca && (
              <div className="flex items-center gap-2 text-sm text-ink-700/70 mb-3">
                <Loader2 size={16} className="animate-spin" /> Membaca PDF...
              </div>
            )}

            {fileName && !membaca && (
              <div className="text-sm text-ink-700/70 mb-3">
                File: <strong>{fileName}</strong> — {rows.length} baris siap diimpor
                {kelompok.length > 0 && <> ({kelompok.length} tahun anggaran: {kelompok.join(', ')})</>}
              </div>
            )}

            {rows.length > 0 && mode === 'rkas' && (
              <div className="text-sm text-sage-600 bg-sage-50 rounded-lg p-2 mb-3">
                Format RKAS asli dari ARKAS terdeteksi.
                {penerimaan.length > 0 && (
                  <> Penerimaan terbaca: {penerimaan.length} baris (total Rp{' '}
                  {penerimaan.reduce((a, p) => a + p.jumlah, 0).toLocaleString('id-ID')}).</>
                )}
                {!tahunTerdeteksi && ' Tahun anggaran memakai filter Tahun di halaman ini.'}
              </div>
            )}

            {peringatan.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-2 mb-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <div>{peringatan.length} catatan saat membaca file (periksa pratinjau sebelum menyimpan):</div>
                  <ul className="list-disc ml-4">
                    {peringatan.slice(0, 5).map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                  {peringatan.length > 5 && <div>...dan {peringatan.length - 5} catatan lainnya</div>}
                </div>
              </div>
            )}

            {invalidCount > 0 && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-2 mb-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{invalidCount} baris dilewati karena tahun_anggaran atau uraian kosong/tidak valid.</span>
              </div>
            )}

            {rows.length > 0 && (
              <div className="max-h-40 overflow-auto border rounded-lg text-xs mb-3">
                <table className="w-full">
                  <thead className="bg-sage-50 sticky top-0">
                    <tr>
                      <th className="text-left p-1">Tahun</th>
                      <th className="text-left p-1">Kode Keg.</th>
                      <th className="text-left p-1">Kode Rekening</th>
                      <th className="text-left p-1">Uraian</th>
                      <th className="text-right p-1">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1">{r.tahun_anggaran}</td>
                        <td className="p-1">{r.kode_kegiatan || '-'}</td>
                        <td className="p-1">{r.kode_rekening || '-'}</td>
                        <td className="p-1">{r.uraian}</td>
                        <td className="p-1 text-right">{r.jumlah ? r.jumlah.toLocaleString('id-ID') : '-'}</td>
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
              <div className="flex items-start gap-2 text-sm text-red-600 mb-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 text-sm text-sage-600 mb-3">
                <CheckCircle2 size={16} /> Berhasil! {done.inserted} dari {done.total} baris tersimpan.
                {done.penerimaan ? ` Penerimaan: ${done.penerimaan} baris.` : ''}
              </div>
            )}

            {hapusInfo && (
              <div className="flex items-center gap-2 text-sm text-sage-600 mb-3">
                <CheckCircle2 size={16} /> {hapusInfo}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                className="btn-secondary text-red-600"
                onClick={handleHapusSemua}
                disabled={sibuk || !sekolahId || !tahunAnggaran}
                title="Hapus seluruh data ARKAS sekolah ini pada tahun yang sedang dipilih"
              >
                {hapusLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Hapus Semua Data {tahunAnggaran || ''}
              </button>

              <div className="flex gap-3">
                <button className="btn-secondary" onClick={() => { setOpen(false); resetState() }}>
                  Tutup
                </button>
                <button
                  className="btn-primary"
                  onClick={handleImport}
                  disabled={rows.length === 0 || sibuk}
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Simpan {rows.length > 0 ? rows.length : ''} Baris
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
