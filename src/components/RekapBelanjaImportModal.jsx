import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { FileText, X, Loader2 } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
// Vite: worker diambil sebagai URL. Untuk pdfjs-dist v3 ganti jadi 'pdfjs-dist/build/pdf.worker.min.js?url'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0)
}

const angka = (s) => Number(String(s).replace(/\./g, '')) || 0
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Baca PDF -> daftar baris teks (item sejajar secara vertikal digabung jadi satu baris)
async function ekstrakBaris(file) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const hasil = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const items = content.items
      .filter((i) => i.str && i.str.trim() !== '')
      .map((i) => ({ x: i.transform[4], y: i.transform[5], s: i.str }))
    items.sort((a, b) => b.y - a.y || a.x - b.x)
    const lines = []
    for (const it of items) {
      const last = lines[lines.length - 1]
      if (last && Math.abs(last.y - it.y) <= 3) last.items.push(it)
      else lines.push({ y: it.y, items: [it] })
    }
    for (const l of lines) {
      l.items.sort((a, b) => a.x - b.x)
      hasil.push(l.items.map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim())
    }
  }
  return hasil
}

// Contoh baris:
// 04-05-2026 05.02.04. 5.2.05.01.01.0001 BPU01 5.2.6 Buku Pendidikan Pancasila BPIP kelas 6 5 43.200 216.000
const RE_BARIS = /^(\d{2})-(\d{2})-(\d{4})\s+.*?(\d\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4})\s+([A-Z]{2,}\d+)\s+(.+?)\s+(\d+)\s+(\d{1,3}(?:\.\d{3})+)\s+(\d{1,3}(?:\.\d{3})+)(?:\s|$)/

function parseBaris(lines) {
  const rows = []
  for (const line of lines) {
    const m = line.match(RE_BARIS)
    if (!m) continue
    const [, dd, mm, yyyy, kodeRek, noBukti, tengah, jml, harga, realisasi] = m
    // buang "ID Barang" (mis. 5.2.6 / 5.2. 5) di depan uraian
    const uraian = tengah.replace(/^\d\.\d\.\s*\d*\s+/, '').trim()
    rows.push({
      tanggal: `${yyyy}-${mm}-${dd}`,
      kode_rekening: kodeRek,
      no_bukti: noBukti,
      uraian,
      jumlah_barang: Number(jml),
      harga_satuan: angka(harga),
      realisasi: angka(realisasi),
    })
  }
  return rows
}

// Cocokkan tiap baris rekap ke baris BKU: tanggal + pengeluaran sama, lalu uraian
function cocokkan(parsed, bkuRows) {
  const dipakai = new Set()
  return parsed.map((p) => {
    const kandidat = bkuRows.filter(
      (r) =>
        !dipakai.has(r.id) &&
        String(r.tanggal).slice(0, 10) === p.tanggal &&
        Number(r.pengeluaran || 0) === p.realisasi
    )
    let pilih = null
    if (kandidat.length === 1) pilih = kandidat[0]
    else if (kandidat.length > 1) {
      pilih =
        kandidat.find((r) => norm(r.uraian) === norm(p.uraian)) ||
        kandidat.find((r) => norm(r.uraian).includes(norm(p.uraian)) || norm(p.uraian).includes(norm(r.uraian))) ||
        null
    }
    if (pilih) dipakai.add(pilih.id)
    return { ...p, bku: pilih }
  })
}

export default function RekapBelanjaImportModal({ bulan, tahun, onSelesai }) {
  const [open, setOpen] = useState(false)
  const [membaca, setMembaca] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [namaFile, setNamaFile] = useState('')
  const [hasil, setHasil] = useState(null) // null = belum ada file
  const [tambahBaru, setTambahBaru] = useState(false)
  const [error, setError] = useState('')

  function tutup() {
    setOpen(false)
    setHasil(null)
    setNamaFile('')
    setError('')
    setTambahBaru(false)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setHasil(null)
    setNamaFile(file.name)
    setMembaca(true)
    try {
      const lines = await ekstrakBaris(file)
      const parsed = parseBaris(lines)
      if (parsed.length === 0) {
        setError(
          'Tidak ada baris belanja yang terbaca. Pastikan file adalah PDF "Rekapitulasi Realisasi Belanja" ' +
          'hasil unduhan ARKAS (bukan hasil scan/foto).'
        )
        setMembaca(false)
        return
      }
      const { data: bkuRows, error: err } = await supabase
        .from('bku_kas')
        .select('*')
        .eq('tahun', tahun)
        .eq('bulan', bulan)
      if (err) throw err
      setHasil(cocokkan(parsed, bkuRows || []))
    } catch (err) {
      setError('Gagal membaca file: ' + (err.message || err))
    }
    setMembaca(false)
  }

  const cocok = hasil ? hasil.filter((h) => h.bku) : []
  const tidakCocok = hasil ? hasil.filter((h) => !h.bku) : []
  const bulanBeda = hasil ? hasil.some((h) => Number(h.tanggal.slice(5, 7)) !== bulan || Number(h.tanggal.slice(0, 4)) !== tahun) : false

  async function handleTerapkan() {
    if (!hasil) return
    setMenyimpan(true)
    setError('')
    let gagal = 0
    // 1) isi Jumlah Barang pada baris BKU yang cocok
    const hasilUpdate = await Promise.all(
      cocok.map((h) =>
        supabase.from('bku_kas').update({ jumlah_barang: h.jumlah_barang }).eq('id', h.bku.id)
      )
    )
    gagal += hasilUpdate.filter((r) => r.error).length

    // 2) (opsional) tambahkan baris yang belum ada di BKU
    let ditambah = 0
    if (tambahBaru && tidakCocok.length > 0) {
      const payload = tidakCocok.map((h) => ({
        tahun,
        bulan,
        tanggal: h.tanggal,
        no_bukti: h.no_bukti,
        kode_rekening: h.kode_rekening,
        uraian: h.uraian,
        jumlah_barang: h.jumlah_barang,
        penerimaan: 0,
        pengeluaran: h.realisasi,
      }))
      const { error: errIns } = await supabase.from('bku_kas').insert(payload)
      if (errIns) {
        setError('Jumlah Barang sudah diisi, tetapi gagal menambah baris baru: ' + errIns.message)
        setMenyimpan(false)
        onSelesai?.()
        return
      }
      ditambah = payload.length
    }

    setMenyimpan(false)
    onSelesai?.()
    if (gagal > 0) {
      setError(`${gagal} baris gagal diperbarui (kemungkinan izin UPDATE/RLS di tabel bku_kas).`)
      return
    }
    alert(
      `Selesai. ${cocok.length} baris BKU terisi Jumlah Barang` +
      (ditambah ? `, ${ditambah} baris baru ditambahkan.` : '.')
    )
    tutup()
  }

  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        <FileText size={16} /> Rekap Realisasi Belanja
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Rekapitulasi Realisasi Belanja</h2>
                <p className="text-xs text-ink-700/60">
                  Mengisi kolom Jumlah Barang pada BKU {NAMA_BULAN[bulan - 1]} {tahun} dari PDF rekap ARKAS.
                </p>
              </div>
              <button className="icon-btn" onClick={tutup}><X size={18} /></button>
            </div>

            <div className="mb-4">
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFile}
                disabled={membaca || menyimpan}
                className="block text-sm"
              />
              {namaFile && <p className="text-xs text-ink-700/60 mt-1">{namaFile}</p>}
            </div>

            {membaca && (
              <p className="flex items-center gap-2 text-sm text-ink-700/70">
                <Loader2 size={16} className="animate-spin" /> Membaca PDF...
              </p>
            )}

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            {hasil && (
              <>
                <p className="text-sm mb-2">
                  <span className="font-medium text-sage-500">{cocok.length} cocok</span>
                  {' · '}
                  <span className={tidakCocok.length ? 'font-medium text-red-600' : ''}>
                    {tidakCocok.length} tidak ditemukan di BKU
                  </span>
                </p>
                {bulanBeda && (
                  <p className="text-xs text-red-600 mb-2">
                    Ada tanggal di PDF yang bukan {NAMA_BULAN[bulan - 1]} {tahun}. Pastikan filter Bulan/Tahun sudah sesuai dengan file.
                  </p>
                )}

                <div className="overflow-auto border border-ink-950/10 rounded-lg mb-3">
                  <table className="table-shell">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Uraian</th>
                        <th>Jml Barang</th>
                        <th>Harga Satuan</th>
                        <th>Realisasi</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasil.map((h, i) => (
                        <tr key={i}>
                          <td className="whitespace-nowrap">{h.tanggal}</td>
                          <td>{h.uraian}</td>
                          <td className="font-medium">{h.jumlah_barang}</td>
                          <td>{formatRupiah(h.harga_satuan)}</td>
                          <td>{formatRupiah(h.realisasi)}</td>
                          <td>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              h.bku ? 'bg-sage-500/10 text-sage-500' : 'bg-red-50 text-red-700'
                            }`}>
                              {h.bku ? 'Cocok' : 'Tidak ada di BKU'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {tidakCocok.length > 0 && (
                  <label className="flex items-center gap-2 text-sm mb-3">
                    <input
                      type="checkbox"
                      checked={tambahBaru}
                      onChange={(e) => setTambahBaru(e.target.checked)}
                    />
                    Tambahkan {tidakCocok.length} baris yang belum ada sebagai baris BKU baru
                  </label>
                )}

                <div className="flex justify-end gap-3">
                  <button className="btn-secondary" onClick={tutup} disabled={menyimpan}>Batal</button>
                  <button
                    className="btn-primary"
                    onClick={handleTerapkan}
                    disabled={menyimpan || (cocok.length === 0 && !(tambahBaru && tidakCocok.length > 0))}
                  >
                    {menyimpan && <Loader2 size={16} className="animate-spin" />}
                    Terapkan ke BKU
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
