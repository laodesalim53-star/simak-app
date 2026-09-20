import { useMemo, useRef, useState } from 'react'
import { saveAs } from 'file-saver'
import {
  Loader2, Download, FileType2, FileSpreadsheet, Minimize2, FileUp, Trash2, Sparkles, FileText,
  Camera, ImagePlus, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import {
  bukaPdf, kompresPdf, renderHalaman, ambilTekslayer, jumlahHuruf, teksDariKata,
  buatWorkerOcr, ocrCanvas, scanDenganAI, klusterTabel, FAKTOR_KOLOM,
  penandaHalaman, buatDocx, teksBersih, buatXlsx, formatUkuran,
} from '../lib/alatPdf'
import { siapkanFoto, buatPdfDariFoto } from '../lib/kameraPdf'

const BATAS_UKURAN_MB = 100
const PERINGATAN_UKURAN_MB = 30
const BATAS_FOTO = 40

const TAB = [
  { id: 'kompres', label: 'Kompres PDF', icon: Minimize2 },
  { id: 'word', label: 'PDF ke Word', icon: FileType2 },
  { id: 'excel', label: 'PDF ke Excel', icon: FileSpreadsheet },
]

const PRESET_KOMPRES = [
  { id: 'ringan', label: 'Ringan', desc: 'Kualitas tinggi, ukuran turun sedikit', dpi: 150, kualitas: 0.8 },
  { id: 'sedang', label: 'Sedang', desc: 'Seimbang, cocok dikirim lewat email', dpi: 120, kualitas: 0.65 },
  { id: 'kecil', label: 'Kecil', desc: 'Paling ringan, untuk WhatsApp atau batas unggah kecil', dpi: 96, kualitas: 0.5 },
]

const BAHASA_OPTIONS = [
  { value: 'ind', label: 'Indonesia' },
  { value: 'eng', label: 'Inggris' },
  { value: 'ind+eng', label: 'Indonesia + Inggris' },
]

const METODE_OPTIONS = [
  { value: 'tesseract', label: 'OCR Cepat', desc: 'Berjalan di perangkat Anda, gratis, cocok untuk teks cetak yang jelas' },
  { value: 'ai', label: 'AI Scan (Gemini)', desc: 'Lebih akurat untuk tulisan tangan dan dokumen rumit' },
]

const KETELITIAN_OPTIONS = [
  { value: 200, label: 'Cepat (200 dpi)' },
  { value: 250, label: 'Standar (250 dpi)' },
  { value: 300, label: 'Teliti (300 dpi)' },
]

const KOLOM_OPTIONS = [
  { value: 'peka', label: 'Banyak kolom' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'longgar', label: 'Sedikit kolom' },
]

function namaDasar(nama) {
  return nama.replace(/\.pdf$/i, '') || 'dokumen'
}

export default function AlatPDF() {
  const [tab, setTab] = useState('kompres')
  const [file, setFile] = useState(null)
  const [info, setInfo] = useState(null) // { halaman, ukuran }
  const bufferRef = useRef(null)
  const batalRef = useRef(false)

  const [sibuk, setSibuk] = useState(false)
  const [progres, setProgres] = useState({ i: 0, n: 0 })
  const [ocrPersen, setOcrPersen] = useState(0)
  const [error, setError] = useState('')

  // Kamera
  const [foto, setFoto] = useState([]) // [{ id, blob, url, w, h }]
  const [modeDokumen, setModeDokumen] = useState(true)
  const [bacaFoto, setBacaFoto] = useState(false)
  const [bangunPdf, setBangunPdf] = useState(false)
  const [dariKamera, setDariKamera] = useState(false)

  // Kompres
  const [preset, setPreset] = useState('sedang')
  const [abuAbu, setAbuAbu] = useState(false)
  const [hasilKompres, setHasilKompres] = useState(null) // { blob, ukuran }

  // Word & Excel (dipakai bersama)
  const [bahasa, setBahasa] = useState('ind')
  const [pakaiTekslayer, setPakaiTekslayer] = useState(true)
  const [dpiOcr, setDpiOcr] = useState(250)
  const [dari, setDari] = useState(1)
  const [sampai, setSampai] = useState(1)

  // Word
  const [metode, setMetode] = useState('tesseract')
  const [teksHasil, setTeksHasil] = useState('')
  const [namaFile, setNamaFile] = useState('')

  // Excel
  const [kolom, setKolom] = useState('sedang')
  const [kataPerHalaman, setKataPerHalaman] = useState([]) // [{ no, kata, sumber }]

  const lembar = useMemo(
    () =>
      kataPerHalaman.map((h) => ({
        nama: `Halaman ${h.no}`,
        sumber: h.sumber,
        baris: klusterTabel(h.kata, FAKTOR_KOLOM[kolom]),
      })),
    [kataPerHalaman, kolom]
  )

  function resetHasil() {
    setHasilKompres(null)
    setTeksHasil('')
    setKataPerHalaman([])
    setError('')
  }

  // Memuat sebuah berkas PDF (dari pilihan pengguna maupun hasil scan kamera).
  // Mengembalikan true bila berhasil.
  async function muatBerkas(f, { kamera = false } = {}) {
    setError('')
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') {
      setError('Berkas harus berformat PDF.')
      return false
    }
    if (f.size > BATAS_UKURAN_MB * 1024 * 1024) {
      setError(`Berkas terlalu besar (maksimal ${BATAS_UKURAN_MB} MB agar tidak membuat perangkat hang).`)
      return false
    }
    setSibuk(true)
    try {
      const buffer = await f.arrayBuffer()
      const pdf = await bukaPdf(buffer)
      const halaman = pdf.numPages
      await pdf.destroy()
      bufferRef.current = buffer
      setFile(f)
      setInfo({ halaman, ukuran: f.size })
      setDari(1)
      setSampai(halaman)
      setNamaFile(namaDasar(f.name))
      setDariKamera(kamera)
      resetHasil()
      return true
    } catch (err) {
      setError(err.message || 'Gagal membuka PDF.')
      return false
    } finally {
      setSibuk(false)
    }
  }

  async function handlePilihFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    await muatBerkas(f)
  }

  function hapusFile() {
    bufferRef.current = null
    setFile(null)
    setInfo(null)
    setDariKamera(false)
    resetHasil()
  }

  function batalkan() {
    batalRef.current = true
  }

  // ---------- Kamera ----------
  async function handleAmbilFoto(e) {
    const daftar = Array.from(e.target.files || [])
    e.target.value = ''
    if (!daftar.length) return
    if (foto.length + daftar.length > BATAS_FOTO) {
      setError(`Maksimal ${BATAS_FOTO} halaman per scan. Jadikan PDF dulu, lalu lanjutkan scan berikutnya.`)
      return
    }
    setError('')
    setBacaFoto(true)
    try {
      const baru = []
      for (const f of daftar) {
        const { blob, w, h } = await siapkanFoto(f)
        baru.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          blob,
          w,
          h,
          url: URL.createObjectURL(blob),
        })
      }
      setFoto((lama) => [...lama, ...baru])
    } catch (err) {
      setError(err?.message || 'Gagal membaca foto.')
    } finally {
      setBacaFoto(false)
    }
  }

  function hapusFoto(id) {
    setFoto((lama) => {
      const target = lama.find((f) => f.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return lama.filter((f) => f.id !== id)
    })
  }

  function geserFoto(id, arah) {
    setFoto((lama) => {
      const i = lama.findIndex((f) => f.id === id)
      const j = i + arah
      if (i < 0 || j < 0 || j >= lama.length) return lama
      const salin = [...lama]
      ;[salin[i], salin[j]] = [salin[j], salin[i]]
      return salin
    })
  }

  function kosongkanFoto() {
    setFoto((lama) => {
      lama.forEach((f) => URL.revokeObjectURL(f.url))
      return []
    })
  }

  async function jadikanPdf() {
    if (!foto.length) return
    setError('')
    setBangunPdf(true)
    try {
      const blob = await buatPdfDariFoto(foto, { modeDokumen })
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
      const berkas = new File([blob], `scan-${stamp}.pdf`, { type: 'application/pdf' })
      const ok = await muatBerkas(berkas, { kamera: true })
      if (ok) kosongkanFoto()
    } catch (err) {
      setError(err?.message || 'Gagal membuat PDF dari foto.')
    } finally {
      setBangunPdf(false)
    }
  }

  async function jalankan(kerja) {
    batalRef.current = false
    setError('')
    setSibuk(true)
    setProgres({ i: 0, n: 0 })
    setOcrPersen(0)
    try {
      await kerja()
    } catch (err) {
      if (err?.name !== 'Dibatalkan') setError(err?.message || 'Terjadi kesalahan saat memproses PDF.')
    } finally {
      setSibuk(false)
      setOcrPersen(0)
    }
  }

  function rentang() {
    const a = Math.max(1, Math.min(Number(dari) || 1, info.halaman))
    const b = Math.max(a, Math.min(Number(sampai) || info.halaman, info.halaman))
    return [a, b]
  }

  // ---------- Kompres ----------
  function mulaiKompres() {
    const p = PRESET_KOMPRES.find((x) => x.id === preset)
    return jalankan(async () => {
      setHasilKompres(null)
      const bytes = await kompresPdf(
        bufferRef.current,
        { dpi: p.dpi, kualitas: p.kualitas, abuAbu },
        {
          onProgress: (i, n) => setProgres({ i, n }),
          batal: () => batalRef.current,
        }
      )
      const blob = new Blob([bytes], { type: 'application/pdf' })
      setHasilKompres({ blob, ukuran: blob.size })
    })
  }

  // ---------- Word & Excel: baca halaman ----------
  // Urutan: teks bawaan PDF (kalau ada) -> OCR / AI Scan.
  async function bacaHalaman(pdf, worker, no, { denganPosisi, pakaiAI }) {
    const page = await pdf.getPage(no)
    try {
      if (pakaiTekslayer) {
        const kata = await ambilTekslayer(page)
        if (jumlahHuruf(kata) >= 20) {
          return { sumber: 'teks bawaan', teks: teksDariKata(kata), kata }
        }
      }
      if (pakaiAI) {
        const { canvas } = await renderHalaman(page, { dpi: 150 })
        const teks = await scanDenganAI(canvas, bahasa)
        return { sumber: 'AI Scan', teks, kata: [] }
      }
      const { canvas } = await renderHalaman(page, { dpi: dpiOcr })
      const hasil = await ocrCanvas(worker, canvas, { denganPosisi })
      return { sumber: 'OCR', teks: hasil.teks, kata: hasil.kata }
    } finally {
      page.cleanup()
    }
  }

  function mulaiWord() {
    const [a, b] = rentang()
    return jalankan(async () => {
      setTeksHasil('')
      const pakaiAI = metode === 'ai'
      const pdf = await bukaPdf(bufferRef.current)
      let worker = null
      try {
        let gabung = ''
        for (let no = a; no <= b; no++) {
          if (batalRef.current) {
            const err = new Error('dibatalkan')
            err.name = 'Dibatalkan'
            throw err
          }
          setProgres({ i: no - a + 1, n: b - a + 1 })
          setOcrPersen(0)
          // Worker OCR dibuat sekali, baru saat ada halaman yang memang perlu OCR
          // (halaman berteks bawaan tidak butuh OCR sama sekali).
          if (!pakaiAI && !worker && !(await halamanBerteks(pdf, no))) {
            worker = await buatWorkerOcr(bahasa, setOcrPersen)
          }
          const h = await bacaHalaman(pdf, worker, no, { denganPosisi: false, pakaiAI })
          gabung += `${gabung ? '\n\n' : ''}${penandaHalaman(no)}\n${h.teks}`
          setTeksHasil(gabung)
        }
      } finally {
        if (worker) await worker.terminate()
        await pdf.destroy()
      }
    })
  }

  // Cek cepat: apakah halaman punya teks bawaan (supaya OCR tidak dimuat sia-sia).
  async function halamanBerteks(pdf, no) {
    if (!pakaiTekslayer) return false
    const page = await pdf.getPage(no)
    try {
      return jumlahHuruf(await ambilTekslayer(page)) >= 20
    } finally {
      page.cleanup()
    }
  }

  function mulaiExcel() {
    const [a, b] = rentang()
    return jalankan(async () => {
      setKataPerHalaman([])
      const pdf = await bukaPdf(bufferRef.current)
      let worker = null
      try {
        const kumpul = []
        for (let no = a; no <= b; no++) {
          if (batalRef.current) {
            const err = new Error('dibatalkan')
            err.name = 'Dibatalkan'
            throw err
          }
          setProgres({ i: no - a + 1, n: b - a + 1 })
          setOcrPersen(0)
          if (!worker && !(await halamanBerteks(pdf, no))) {
            worker = await buatWorkerOcr(bahasa, setOcrPersen)
          }
          const h = await bacaHalaman(pdf, worker, no, { denganPosisi: true, pakaiAI: false })
          kumpul.push({ no, kata: h.kata, sumber: h.sumber })
          setKataPerHalaman([...kumpul])
        }
      } finally {
        if (worker) await worker.terminate()
        await pdf.destroy()
      }
    })
  }

  async function unduhDocx() {
    const blob = await buatDocx(teksHasil)
    saveAs(blob, `${namaFile || 'dokumen'}.docx`)
  }

  function unduhTxt() {
    const blob = new Blob([teksBersih(teksHasil)], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, `${namaFile || 'dokumen'}.txt`)
  }

  async function unduhXlsx() {
    try {
      const blob = await buatXlsx(lembar)
      saveAs(blob, `${namaFile || 'dokumen'}.xlsx`)
    } catch (err) {
      setError(err.message)
    }
  }

  const persenBar = progres.n ? Math.round(((progres.i - 1 + ocrPersen / 100) / progres.n) * 100) : 0
  const banyakBaris = lembar.reduce((n, l) => n + l.baris.length, 0)
  const lembarPratinjau = lembar.find((l) => l.baris.length > 0)
  const kameraTerkunci = sibuk || bacaFoto || bangunPdf

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="flex-1 overflow-y-auto py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-ink-950 flex items-center justify-center mx-auto mb-3">
              <FileText size={26} className="text-brass-400" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">Alat PDF</h1>
            <p className="text-ink-700/70 mt-2 max-w-md mx-auto text-sm">
              Perkecil ukuran PDF, atau ubah PDF (termasuk hasil scan) menjadi Word dan Excel. Pemrosesan
              berjalan di perangkat Anda, berkas tidak diunggah ke server.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
            {/* Pilih berkas */}
            <div className="rounded-xl border border-dashed border-ink-950/15 bg-paper/60 p-4 space-y-3">
              <p className="text-sm font-semibold text-ink-950">1. Pilih berkas PDF atau scan dengan kamera</p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-primary cursor-pointer">
                  <FileUp size={16} />
                  {file ? 'Ganti PDF' : 'Pilih PDF'}
                  <input type="file" accept="application/pdf,.pdf" onChange={handlePilihFile} className="hidden" disabled={sibuk} />
                </label>
                {file && dariKamera && (
                  <button
                    type="button"
                    onClick={() => saveAs(file, file.name)}
                    disabled={sibuk}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-ink-950/15 text-ink-950 hover:bg-ink-950/5 disabled:opacity-40"
                  >
                    <Download size={16} />
                    Unduh PDF hasil scan
                  </button>
                )}
                {file && (
                  <button
                    type="button"
                    onClick={hapusFile}
                    disabled={sibuk}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                    Hapus
                  </button>
                )}
              </div>
              {file && info && (
                <p className="text-sm text-ink-700/80">
                  <span className="font-medium text-ink-950">{file.name}</span> · {info.halaman} halaman · {formatUkuran(info.ukuran)}
                </p>
              )}
              {file && info && info.ukuran > PERINGATAN_UKURAN_MB * 1024 * 1024 && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Berkas cukup besar, prosesnya bisa lama di HP. Sebaiknya jalankan di laptop atau komputer.
                </p>
              )}
              {!file && !sibuk && <p className="text-xs text-ink-700/60">Maksimal {BATAS_UKURAN_MB} MB.</p>}
              {sibuk && !file && (
                <div className="flex items-center gap-2 text-sm text-ink-700/70">
                  <Loader2 size={16} className="animate-spin" /> Membuka PDF...
                </div>
              )}

              {/* Scan kamera */}
              <div className="border-t border-ink-950/10 pt-3 space-y-3">
                <p className="text-xs font-semibold text-ink-950">Atau scan dokumen dengan kamera</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className={`btn-primary cursor-pointer ${kameraTerkunci ? 'opacity-40 pointer-events-none' : ''}`}>
                    <Camera size={16} />
                    {foto.length ? 'Tambah Halaman' : 'Buka Kamera'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleAmbilFoto}
                      className="hidden"
                      disabled={kameraTerkunci}
                    />
                  </label>
                  <label
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-ink-950/15 text-ink-950 hover:bg-ink-950/5 cursor-pointer ${
                      kameraTerkunci ? 'opacity-40 pointer-events-none' : ''
                    }`}
                  >
                    <ImagePlus size={16} />
                    Dari Galeri
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleAmbilFoto}
                      className="hidden"
                      disabled={kameraTerkunci}
                    />
                  </label>
                  {bacaFoto && (
                    <span className="flex items-center gap-2 text-sm text-ink-700/70">
                      <Loader2 size={16} className="animate-spin" /> Memproses foto...
                    </span>
                  )}
                </div>
                {foto.length === 0 && !bacaFoto && (
                  <p className="text-xs text-ink-700/60">
                    Letakkan dokumen di permukaan rata, pastikan cahaya cukup, dan foto dari atas tanpa miring. Tiap foto
                    menjadi satu halaman PDF. Di komputer, tombol kamera akan membuka pemilih berkas.
                  </p>
                )}

                {foto.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {foto.map((f, i) => (
                        <div key={f.id} className="relative rounded-lg overflow-hidden border border-ink-950/10 bg-paper">
                          <img src={f.url} alt={`Halaman ${i + 1}`} className="w-full h-28 object-contain" />
                          <span className="absolute top-1 left-1 bg-ink-950 text-white text-[10px] font-semibold rounded px-1.5 py-0.5">
                            {i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => hapusFoto(f.id)}
                            disabled={kameraTerkunci}
                            aria-label={`Hapus halaman ${i + 1}`}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center disabled:opacity-40"
                          >
                            <X size={12} />
                          </button>
                          <div className="flex items-center justify-between bg-white/90 px-1 py-0.5">
                            <button
                              type="button"
                              onClick={() => geserFoto(f.id, -1)}
                              disabled={i === 0 || kameraTerkunci}
                              aria-label="Geser ke kiri"
                              className="p-0.5 text-ink-950 disabled:opacity-25"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => geserFoto(f.id, 1)}
                              disabled={i === foto.length - 1 || kameraTerkunci}
                              aria-label="Geser ke kanan"
                              className="p-0.5 text-ink-950 disabled:opacity-25"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <label className="flex items-start gap-2 text-sm text-ink-950">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={modeDokumen}
                        onChange={(e) => setModeDokumen(e.target.checked)}
                        disabled={kameraTerkunci}
                      />
                      <span>
                        Mode dokumen (hitam-putih, kertas dibuat putih bersih, ukuran lebih kecil). Matikan bila dokumen
                        berwarna atau berisi foto.
                      </span>
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={jadikanPdf}
                        disabled={kameraTerkunci}
                        className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {bangunPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        {bangunPdf ? 'Membuat PDF...' : `Jadikan PDF (${foto.length} halaman)`}
                      </button>
                      <button
                        type="button"
                        onClick={kosongkanFoto}
                        disabled={kameraTerkunci}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40"
                      >
                        <Trash2 size={16} />
                        Kosongkan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tab */}
            <div>
              <p className="text-sm font-semibold text-ink-950 mb-2">2. Pilih alat</p>
              <div className="grid grid-cols-3 gap-2">
                {TAB.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => !sibuk && setTab(id)}
                    aria-pressed={tab === id}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs sm:text-sm font-semibold transition ${
                      tab === id ? 'border-ink-950 bg-ink-950/5 text-ink-950' : 'border-ink-950/10 text-ink-700 hover:border-ink-950/25'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ===== Kompres ===== */}
            {tab === 'kompres' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  {PRESET_KOMPRES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreset(p.id)}
                      className={`text-left rounded-xl border p-3 transition ${
                        preset === p.id ? 'border-ink-950 bg-ink-950/5' : 'border-ink-950/10 hover:border-ink-950/25'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-ink-950">{p.label}</span>
                      <span className="block text-xs text-ink-700/60 mt-0.5">{p.desc}</span>
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm text-ink-950">
                  <input type="checkbox" checked={abuAbu} onChange={(e) => setAbuAbu(e.target.checked)} />
                  Ubah ke hitam-putih/abu-abu (ukuran lebih kecil lagi, cocok untuk surat)
                </label>
                <p className="text-xs text-ink-700/60">
                  Kompres mengubah tiap halaman menjadi gambar. Untuk PDF hasil scan tidak ada yang hilang, tetapi
                  pada PDF hasil ketik, teksnya tidak bisa diblok atau dicari lagi.
                </p>

                <button type="button" onClick={mulaiKompres} disabled={!file || sibuk} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                  <Minimize2 size={16} />
                  Kompres PDF
                </button>

                {hasilKompres && info && (
                  <div className="rounded-xl bg-paper/70 border border-ink-950/10 p-4 space-y-3">
                    <p className="text-sm text-ink-950">
                      {formatUkuran(info.ukuran)} → <span className="font-semibold">{formatUkuran(hasilKompres.ukuran)}</span>
                      {hasilKompres.ukuran < info.ukuran && (
                        <span className="text-emerald-700"> (turun {Math.round((1 - hasilKompres.ukuran / info.ukuran) * 100)}%)</span>
                      )}
                    </p>
                    {hasilKompres.ukuran >= info.ukuran && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        Hasilnya tidak lebih kecil dari berkas asli. Berkas asli sudah cukup ringan, atau coba pilihan "Kecil".
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => saveAs(hasilKompres.blob, `${namaDasar(file.name)}-kompres.pdf`)}
                      className="btn-primary"
                    >
                      <Download size={16} />
                      Unduh PDF hasil kompres
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ===== Word & Excel: pengaturan bersama ===== */}
            {(tab === 'word' || tab === 'excel') && (
              <div className="space-y-4">
                {tab === 'word' && (
                  <div>
                    <label className="label-field">Metode Pembacaan Teks (untuk halaman hasil scan)</label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {METODE_OPTIONS.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMetode(m.value)}
                          className={`text-left rounded-xl border p-3 transition ${
                            metode === m.value ? 'border-ink-950 bg-ink-950/5' : 'border-ink-950/10 hover:border-ink-950/25'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-950">
                            {m.value === 'ai' && <Sparkles size={14} className="text-brass-500" />}
                            {m.label}
                          </span>
                          <span className="block text-xs text-ink-700/60 mt-0.5">{m.desc}</span>
                        </button>
                      ))}
                    </div>
                    {metode === 'ai' && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                        Dengan AI Scan, gambar tiap halaman dikirim ke server AI. Hindari untuk dokumen yang memuat data pribadi sensitif.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Bahasa Dokumen</label>
                    <select className="input-field" value={bahasa} onChange={(e) => setBahasa(e.target.value)}>
                      {BAHASA_OPTIONS.map((b) => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                  {(tab === 'excel' || metode === 'tesseract') && (
                    <div>
                      <label className="label-field">Ketelitian Baca (OCR)</label>
                      <select className="input-field" value={dpiOcr} onChange={(e) => setDpiOcr(Number(e.target.value))}>
                        {KETELITIAN_OPTIONS.map((k) => (
                          <option key={k.value} value={k.value}>{k.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="label-field">Halaman yang diproses</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={1} max={info?.halaman || 1} className="input-field"
                        value={dari} onChange={(e) => setDari(e.target.value)} disabled={!file}
                      />
                      <span className="text-sm text-ink-700/70">s/d</span>
                      <input
                        type="number" min={1} max={info?.halaman || 1} className="input-field"
                        value={sampai} onChange={(e) => setSampai(e.target.value)} disabled={!file}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">Nama File Hasil</label>
                    <input className="input-field" value={namaFile} onChange={(e) => setNamaFile(e.target.value)} placeholder="Contoh: Surat Keterangan" />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-ink-950">
                  <input type="checkbox" checked={pakaiTekslayer} onChange={(e) => setPakaiTekslayer(e.target.checked)} />
                  Pakai teks bawaan PDF bila ada (lebih cepat dan lebih akurat daripada OCR)
                </label>
              </div>
            )}

            {/* ===== Word ===== */}
            {tab === 'word' && (
              <div className="space-y-4">
                <button type="button" onClick={mulaiWord} disabled={!file || sibuk} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                  <FileType2 size={16} />
                  Baca dan ubah ke teks
                </button>
                <div>
                  <label className="label-field">Hasil Teks (bisa diedit sebelum diunduh)</label>
                  <textarea
                    className="input-field font-mono text-sm"
                    rows={14}
                    value={teksHasil}
                    onChange={(e) => setTeksHasil(e.target.value)}
                    placeholder="Teks hasil pembacaan akan muncul di sini..."
                  />
                  <p className="text-xs text-ink-700/60 mt-1">
                    Baris "----- Halaman N -----" menandai pergantian halaman di file Word. Periksa terutama nama, angka, dan NIK.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={unduhDocx} disabled={!teksHasil.trim() || sibuk} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                    <FileType2 size={16} />
                    Unduh sebagai Word (.docx)
                  </button>
                  <button
                    type="button" onClick={unduhTxt} disabled={!teksHasil.trim() || sibuk}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-ink-950/15 text-ink-950 hover:bg-ink-950/5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download size={16} />
                    Unduh sebagai Teks (.txt)
                  </button>
                </div>
              </div>
            )}

            {/* ===== Excel ===== */}
            {tab === 'excel' && (
              <div className="space-y-4">
                <p className="text-xs text-ink-700/60">
                  Hasil scan dibaca dengan OCR Cepat, lalu kata-kata dikelompokkan menjadi baris dan kolom. Paling baik untuk
                  tabel sederhana dari scan yang lurus dan terang. Tabel bertingkat atau berkolom gabungan biasanya perlu dirapikan
                  di Excel. Semua isi sel disimpan sebagai teks supaya NIK dan nomor HP tidak berubah.
                </p>
                <button type="button" onClick={mulaiExcel} disabled={!file || sibuk} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                  <FileSpreadsheet size={16} />
                  Baca tabel
                </button>

                {lembar.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label-field">Pemisahan Kolom</label>
                        <select className="input-field" value={kolom} onChange={(e) => setKolom(e.target.value)}>
                          {KOLOM_OPTIONS.map((k) => (
                            <option key={k.value} value={k.value}>{k.label}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-ink-700/60 self-end">
                        Kolom terlalu banyak atau terlalu sedikit? Ubah pilihan ini, pratinjau langsung menyesuaikan tanpa membaca ulang.
                      </p>
                    </div>

                    {lembarPratinjau ? (
                      <div>
                        <p className="text-sm font-medium text-ink-950 mb-1">
                          Pratinjau {lembarPratinjau.nama} ({lembarPratinjau.baris.length} baris, sumber: {lembarPratinjau.sumber})
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-ink-950/10">
                          <table className="text-xs min-w-full">
                            <tbody>
                              {lembarPratinjau.baris.slice(0, 40).map((r, i) => (
                                <tr key={i} className="border-b border-ink-950/5 last:border-0">
                                  {r.map((sel, j) => (
                                    <td key={j} className="px-2 py-1.5 align-top border-r border-ink-950/5 last:border-0 whitespace-pre-wrap min-w-[4rem]">
                                      {sel}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {lembarPratinjau.baris.length > 40 && (
                          <p className="text-xs text-ink-700/60 mt-1">...dan {lembarPratinjau.baris.length - 40} baris lagi di file Excel.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        Tidak ada teks yang terbaca. Coba naikkan ketelitian baca, atau pastikan scan-nya lurus dan cukup terang.
                      </p>
                    )}

                    <button type="button" onClick={unduhXlsx} disabled={banyakBaris === 0 || sibuk} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                      <Download size={16} />
                      Unduh sebagai Excel (.xlsx)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Progres & galat (semua tab) */}
            {sibuk && file && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm text-ink-700/80">
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    {progres.n ? `Memproses halaman ${progres.i} dari ${progres.n}...` : 'Menyiapkan...'}
                    {ocrPersen > 0 && ` (membaca ${ocrPersen}%)`}
                  </span>
                  <button type="button" onClick={batalkan} className="text-xs font-medium text-red-600 hover:underline">
                    Batalkan
                  </button>
                </div>
                <div className="h-1.5 rounded-full bg-ink-950/10 overflow-hidden">
                  <div className="h-full bg-ink-950 transition-all" style={{ width: `${persenBar}%` }} />
                </div>
              </div>
            )}
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          </div>
        </div>
      </main>
    </div>
  )
}
