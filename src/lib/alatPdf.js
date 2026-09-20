// ============================================================
// alatPdf.js — logika inti untuk halaman "Alat PDF" (AlatPDF.jsx)
//
// Semua pemrosesan berjalan DI BROWSER (berkas tidak diunggah ke server),
// kecuali metode "AI Scan" yang memakai endpoint /api/ai-scan milik
// ScanDokumen.jsx.
//
// Paket yang dibutuhkan (lihat catatan instalasi):
//   pdfjs-dist@4.10.38 , pdf-lib , xlsx , tesseract.js (v5/v6) , docx , file-saver
// Paket-paket berat di-import dinamis supaya baru diunduh saat dipakai.
// ============================================================

// ---------- pdf.js ----------
let _pdfjs = null

// Dipakai pengujian (Node) untuk menyuntikkan pdf.js tanpa bundler.
export function _gunakanPdfjs(pdfjs) {
  _pdfjs = pdfjs
}

export async function muatPdfjs() {
  if (_pdfjs) return _pdfjs
  // Build "legacy" supaya jalan juga di HP/WebView Android yang lebih lama.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  _pdfjs = pdfjs
  return pdfjs
}

// `buffer` = ArrayBuffer isi PDF. pdf.js "mengambil alih" buffer yang
// diberikan, jadi selalu kirim salinan supaya buffer asli bisa dipakai lagi.
export async function bukaPdf(buffer) {
  const pdfjs = await muatPdfjs()
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer.slice(0)),
    isEvalSupported: false, // jangan eksekusi kode dari PDF (keamanan)
  })
  try {
    return await task.promise
  } catch (e) {
    if (e?.name === 'PasswordException') {
      throw new Error('PDF ini dikunci dengan kata sandi. Buka kuncinya dulu, lalu coba lagi.')
    }
    if (e?.name === 'InvalidPDFException') {
      throw new Error('Berkas ini bukan PDF yang valid, atau rusak.')
    }
    throw e
  }
}

// ---------- Canvas ----------
function buatCanvasBrowser(lebar, tinggi) {
  const c = document.createElement('canvas')
  c.width = lebar
  c.height = tinggi
  return c
}

function bebasCanvas(canvas) {
  try {
    canvas.width = 0
    canvas.height = 0
  } catch {
    /* abaikan */
  }
}

// Render satu halaman PDF ke canvas.
//  dpi       : resolusi (72 dpi = ukuran asli PDF)
//  maksPiksel: batas total piksel — HP (terutama iOS) gagal kalau canvas terlalu besar
export async function renderHalaman(
  page,
  { dpi = 150, maksPiksel = 8_000_000, abuAbu = false, buatCanvas = buatCanvasBrowser } = {}
) {
  const vp1 = page.getViewport({ scale: 1 })
  let scale = dpi / 72
  const piksel = vp1.width * vp1.height * scale * scale
  if (piksel > maksPiksel) scale *= Math.sqrt(maksPiksel / piksel)

  const viewport = page.getViewport({ scale })
  const canvas = buatCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const ctx = canvas.getContext('2d', { willReadFrequently: abuAbu })
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport, canvas }).promise

  if (abuAbu) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0
      d[i] = d[i + 1] = d[i + 2] = g
    }
    ctx.putImageData(img, 0, 0)
  }
  return { canvas, lebar: vp1.width, tinggi: vp1.height }
}

function canvasKeJpeg(canvas, kualitas) {
  const url = canvas.toDataURL('image/jpeg', kualitas)
  const b64 = url.slice(url.indexOf(',') + 1)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function periksaBatal(batal) {
  if (batal?.()) {
    const err = new Error('Proses dibatalkan.')
    err.name = 'Dibatalkan'
    throw err
  }
}

// ============================================================
// 1. KOMPRES PDF
// Tiap halaman dirender jadi gambar JPEG (dpi & kualitas dipilih pengguna),
// lalu disusun ulang jadi PDF baru dengan ukuran halaman yang sama.
// ============================================================
export async function kompresPdf(
  buffer,
  { dpi = 120, kualitas = 0.65, abuAbu = false } = {},
  { onProgress, batal, buatCanvas } = {}
) {
  const { PDFDocument } = await import('pdf-lib')
  const pdf = await bukaPdf(buffer)
  const hasil = await PDFDocument.create()

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      periksaBatal(batal)
      onProgress?.(i, pdf.numPages)
      const page = await pdf.getPage(i)
      const { canvas, lebar, tinggi } = await renderHalaman(page, { dpi, abuAbu, buatCanvas })
      const jpg = canvasKeJpeg(canvas, kualitas)
      bebasCanvas(canvas)
      const gambar = await hasil.embedJpg(jpg)
      const hal = hasil.addPage([lebar, tinggi])
      hal.drawImage(gambar, { x: 0, y: 0, width: lebar, height: tinggi })
      page.cleanup()
    }
  } finally {
    await pdf.destroy()
  }
  return hasil.save({ useObjectStreams: true })
}

// ============================================================
// 2. MEMBACA TEKS: teks bawaan PDF (kalau ada) atau OCR
// ============================================================

// Kata/potongan teks dari lapisan teks PDF (PDF hasil ketik/ekspor, atau
// PDF scan yang sudah punya OCR tersembunyi). Koordinat = piksel viewport
// skala 1, titik (0,0) di kiri-atas.
export async function ambilTekslayer(page) {
  const vp = page.getViewport({ scale: 1 })
  const tc = await page.getTextContent()
  const kata = []
  for (const it of tc.items) {
    if (typeof it.str !== 'string' || !it.str.trim()) continue
    const x = it.transform[4]
    const y = it.transform[5]
    const tinggi = it.height || Math.abs(it.transform[3]) || 10
    const [ax, ay] = vp.convertToViewportPoint(x, y)
    const [bx, by] = vp.convertToViewportPoint(x + it.width, y + tinggi)
    kata.push({
      teks: it.str.trim(),
      x0: Math.min(ax, bx),
      x1: Math.max(ax, bx),
      y0: Math.min(ay, by),
      y1: Math.max(ay, by),
    })
  }
  return kata
}

export function jumlahHuruf(kata) {
  return kata.reduce((n, k) => n + k.teks.replace(/\s/g, '').length, 0)
}

function median(arr) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// Kelompokkan kata jadi baris (kiri ke kanan, atas ke bawah).
export function kelompokkanBaris(kata) {
  const valid = kata.filter((k) => k.teks && k.teks.trim())
  if (!valid.length) return { baris: [], tinggiMed: 0 }
  const tinggiMed = median(valid.map((k) => k.y1 - k.y0)) || 10
  const urut = [...valid].sort((a, b) => a.y0 + a.y1 - (b.y0 + b.y1))
  const baris = []
  for (const k of urut) {
    const cy = (k.y0 + k.y1) / 2
    const b = baris[baris.length - 1]
    if (b && Math.abs(cy - b.cy) <= tinggiMed * 0.6) {
      b.kata.push(k)
      b.cy = (b.cy * (b.kata.length - 1) + cy) / b.kata.length
    } else {
      baris.push({ cy, kata: [k] })
    }
  }
  baris.forEach((b) => b.kata.sort((a, c) => a.x0 - c.x0))
  return { baris, tinggiMed }
}

// Susun teks biasa dari baris-baris (untuk Word). Jarak antar baris yang
// jauh lebih besar dari biasanya dianggap batas paragraf (baris kosong).
export function teksDariKata(kata) {
  const { baris, tinggiMed } = kelompokkanBaris(kata)
  const keluar = []
  let cyPrev = null
  for (const b of baris) {
    if (cyPrev !== null && b.cy - cyPrev > tinggiMed * 2.2) keluar.push('')
    keluar.push(b.kata.map((k) => k.teks).join(' '))
    cyPrev = b.cy
  }
  return keluar.join('\n')
}

// ---------- OCR (Tesseract.js v5/v6) ----------
export async function buatWorkerOcr(bahasa, onProgress) {
  const mod = await import('tesseract.js')
  const Tesseract = mod.default || mod
  return Tesseract.createWorker(bahasa, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100))
    },
  })
}

function ratakanKataOcr(data) {
  if (Array.isArray(data.words) && data.words.length) return data.words
  const out = []
  for (const blok of data.blocks || [])
    for (const par of blok.paragraphs || [])
      for (const baris of par.lines || []) for (const w of baris.words || []) out.push(w)
  return out
}

// Kembalikan { teks, kata } — `kata` hanya diisi kalau denganPosisi = true
// (dipakai untuk konversi ke Excel).
export async function ocrCanvas(worker, canvas, { denganPosisi = false } = {}) {
  const output = denganPosisi ? { text: true, blocks: true } : { text: true }
  const { data } = await worker.recognize(canvas, {}, output)
  if (!denganPosisi) return { teks: (data.text || '').trim(), kata: [] }
  const kata = ratakanKataOcr(data)
    .filter((w) => w.text && w.text.trim() && (w.confidence ?? 100) >= 25)
    .map((w) => ({
      teks: w.text.trim(),
      x0: w.bbox.x0,
      x1: w.bbox.x1,
      y0: w.bbox.y0,
      y1: w.bbox.y1,
    }))
  return { teks: (data.text || '').trim(), kata }
}

// ---------- AI Scan (endpoint yang sama dengan ScanDokumen.jsx) ----------
export async function scanDenganAI(canvas, bahasa) {
  const url = canvas.toDataURL('image/jpeg', 0.85)
  const res = await fetch('/api/ai-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: url.slice(url.indexOf(',') + 1),
      mimeType: 'image/jpeg',
      bahasa,
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    const pesan = data?.error || `Server AI Scan (Gemini) gagal (${res.status}).`
    throw new Error(
      res.status === 503
        ? `${pesan} Coba pakai OCR Cepat sementara, atau ulangi beberapa saat lagi.`
        : pesan
    )
  }
  const data = await res.json()
  if (!data.text) throw new Error('Respons AI Scan tidak berisi teks.')
  return data.text.trim()
}

// ============================================================
// 3. TABEL (untuk Excel)
// Kata -> baris -> sel (kata yang berdekatan digabung) -> kolom
// (rentang horizontal yang terisi di baris-baris bertabel).
// Semua nilai disimpan sebagai TEKS agar NIK / nomor HP tidak rusak
// (angka 16 digit bisa dibulatkan Excel, angka 0 di depan hilang).
// ============================================================
export const FAKTOR_KOLOM = {
  peka: 1.0, // banyak kolom — jarak kecil sudah dianggap pemisah
  sedang: 1.6,
  longgar: 2.4, // sedikit kolom — hanya jarak lebar yang jadi pemisah
}

function pecahSel(baris, tinggiMed, faktor) {
  const sel = []
  let cur = null
  for (const k of baris.kata) {
    if (cur && k.x0 - cur.x1 <= tinggiMed * faktor) {
      cur.teks += ' ' + k.teks
      cur.x1 = Math.max(cur.x1, k.x1)
    } else {
      cur = { teks: k.teks, x0: k.x0, x1: k.x1 }
      sel.push(cur)
    }
  }
  return sel
}

export function klusterTabel(kata, faktor = FAKTOR_KOLOM.sedang) {
  const { baris, tinggiMed } = kelompokkanBaris(kata)
  if (!baris.length) return []

  const semuaSel = baris.map((b) => pecahSel(b, tinggiMed, faktor))

  // Rentang kolom: gabungkan interval x dari baris yang punya >= 2 sel.
  const interval = semuaSel
    .filter((r) => r.length >= 2)
    .flat()
    .map((c) => [c.x0, c.x1])
    .sort((a, b) => a[0] - b[0])

  const jedaMin = tinggiMed * 0.5
  const kolom = []
  for (const [a, b] of interval) {
    const akhir = kolom[kolom.length - 1]
    if (akhir && a <= akhir.x1 + jedaMin) akhir.x1 = Math.max(akhir.x1, b)
    else kolom.push({ x0: a, x1: b })
  }

  if (kolom.length === 0) {
    // Tidak ada pola tabel: satu kolom, satu baris per baris teks.
    return semuaSel.map((r) => [r.map((c) => c.teks).join(' ')])
  }

  const cariKolom = (sel) => {
    let idx = kolom.findIndex((k) => sel.x0 >= k.x0 - jedaMin && sel.x0 <= k.x1 + jedaMin)
    if (idx === -1) {
      let terdekat = Infinity
      kolom.forEach((k, i) => {
        const jarak = Math.min(Math.abs(sel.x0 - k.x0), Math.abs(sel.x0 - k.x1))
        if (jarak < terdekat) {
          terdekat = jarak
          idx = i
        }
      })
    }
    return idx
  }

  return semuaSel.map((r) => {
    const barisSel = new Array(kolom.length).fill('')
    for (const sel of r) {
      const i = cariKolom(sel)
      barisSel[i] = barisSel[i] ? barisSel[i] + ' ' + sel.teks : sel.teks
    }
    return barisSel
  })
}

// ============================================================
// 4. KELUARAN: Word & Excel
// ============================================================
export const penandaHalaman = (n) => `----- Halaman ${n} -----`
const POLA_PENANDA = /^-{5} Halaman \d+ -{5}[ \t]*$/m

// Pisahkan teks hasil (yang memuat penanda halaman) jadi daftar halaman.
export function pisahHalaman(teks) {
  const potong = teks
    .split(POLA_PENANDA)
    .map((h) => h.replace(/^\s*\n/, '').replace(/\s+$/, ''))
  // Teks yang diawali penanda menghasilkan potongan pertama kosong.
  if (potong.length > 1 && potong[0].trim() === '') potong.shift()
  return potong
}

export async function buatDocx(teks) {
  const { Document, Packer, Paragraph, TextRun } = await import('docx')
  const halaman = pisahHalaman(teks)
  const anak = []
  halaman.forEach((h, idx) => {
    h.split('\n').forEach((baris, j) => {
      anak.push(
        new Paragraph({
          pageBreakBefore: idx > 0 && j === 0,
          children: [new TextRun(baris)],
        })
      )
    })
  })
  const doc = new Document({
    sections: [{ properties: {}, children: anak.length ? anak : [new Paragraph('')] }],
  })
  return Packer.toBlob(doc)
}

export function teksBersih(teks) {
  return pisahHalaman(teks).join('\n\n')
}

export async function buatXlsx(lembar) {
  const mod = await import('xlsx')
  const XLSX = mod.utils ? mod : mod.default
  const wb = XLSX.utils.book_new()
  let ada = false
  for (const l of lembar) {
    if (!l.baris.length) continue
    ada = true
    const ws = XLSX.utils.aoa_to_sheet(l.baris)
    const lebarKolom = []
    l.baris.forEach((r) =>
      r.forEach((sel, i) => {
        lebarKolom[i] = Math.min(60, Math.max(lebarKolom[i] || 8, String(sel).length + 2))
      })
    )
    ws['!cols'] = lebarKolom.map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(wb, ws, l.nama.slice(0, 31))
  }
  if (!ada) throw new Error('Tidak ada tabel atau teks yang terbaca dari halaman yang dipilih.')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ---------- Utilitas tampilan ----------
export function formatUkuran(byte) {
  if (byte < 1024) return `${byte} B`
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(0)} KB`
  return `${(byte / 1024 / 1024).toFixed(2)} MB`
}
