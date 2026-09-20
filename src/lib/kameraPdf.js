// Scan dokumen lewat kamera: foto -> (potong otomatis mengikuti kertas) -> PDF.
// Semua diproses di perangkat, tanpa library tambahan.

const SISI_MAKS = 2200 // sisi terpanjang foto (piksel), supaya PDF tidak terlalu berat

// Buka gambar (Blob/File) dengan orientasi EXIF yang benar.
async function muatGambar(sumber) {
  try {
    const bmp = await createImageBitmap(sumber, { imageOrientation: 'from-image' })
    return { gambar: bmp, w: bmp.width, h: bmp.height, tutup: () => bmp.close?.() }
  } catch {
    const url = URL.createObjectURL(sumber)
    try {
      const img = await new Promise((ok, gagal) => {
        const el = new Image()
        el.onload = () => ok(el)
        el.onerror = () => gagal(new Error('Foto tidak bisa dibuka. Coba ambil ulang.'))
        el.src = url
      })
      return { gambar: img, w: img.naturalWidth, h: img.naturalHeight, tutup: () => URL.revokeObjectURL(url) }
    } catch (err) {
      URL.revokeObjectURL(url)
      throw err
    }
  }
}

function buatKanvas(w, h) {
  const k = document.createElement('canvas')
  k.width = w
  k.height = h
  return k
}

function kanvasKeBlob(kanvas, kualitas) {
  return new Promise((ok, gagal) => {
    kanvas.toBlob((b) => (b ? ok(b) : gagal(new Error('Gagal memproses gambar.'))), 'image/jpeg', kualitas)
  })
}

/* ================================================================
   Potong otomatis mengikuti kertas
   1) Cari daerah terang terbesar (kertas) dengan ambang Otsu.
   2) Ambil empat sudutnya.
   3) Luruskan (perspektif) menjadi persegi panjang.
   Kalau kertas tidak terdeteksi meyakinkan, mengembalikan null
   (foto dipakai apa adanya).
   ================================================================ */

// Ambang pemisah gelap/terang (metode Otsu).
function ambangOtsu(abu) {
  const hist = new Uint32Array(256)
  for (let i = 0; i < abu.length; i++) hist[abu[i]]++
  const total = abu.length
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * hist[t]
  let sumB = 0
  let wB = 0
  let maks = 0
  let ambang = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = total - wB
    if (!wF) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const antar = wB * wF * (mB - mF) * (mB - mF)
    if (antar > maks) {
      maks = antar
      ambang = t
    }
  }
  return ambang
}

// Mengembalikan [TL, TR, BR, BL] dalam koordinat kanvas asli, atau null.
function cariSudutKertas(kanvas) {
  const skala = Math.min(1, 400 / Math.max(kanvas.width, kanvas.height))
  const w = Math.max(8, Math.round(kanvas.width * skala))
  const h = Math.max(8, Math.round(kanvas.height * skala))

  const kecil = buatKanvas(w, h)
  const ctx = kecil.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(kanvas, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  kecil.width = 0

  const n = w * h
  const abu = new Uint8Array(n)
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    abu[i] = (d[p] * 299 + d[p + 1] * 587 + d[p + 2] * 114) / 1000
  }

  const ambang = ambangOtsu(abu)
  const mask = new Uint8Array(n) // 1 = terang (calon kertas), 2 = sudah dikunjungi
  for (let i = 0; i < n; i++) mask[i] = abu[i] > ambang ? 1 : 0

  // Cari komponen terang terbesar (flood fill), catat empat titik ekstremnya.
  const tumpukan = new Int32Array(n)
  let terbaik = null
  for (let awal = 0; awal < n; awal++) {
    if (mask[awal] !== 1) continue
    let atas = 0
    tumpukan[atas++] = awal
    mask[awal] = 2
    let luas = 0
    let tl = null
    let tr = null
    let br = null
    let bl = null
    let sMin = Infinity
    let sMax = -Infinity
    let dMin = Infinity
    let dMax = -Infinity
    while (atas > 0) {
      const p = tumpukan[--atas]
      const x = p % w
      const y = (p / w) | 0
      luas++
      const s = x + y
      const dd = x - y
      if (s < sMin) { sMin = s; tl = [x, y] }
      if (s > sMax) { sMax = s; br = [x, y] }
      if (dd > dMax) { dMax = dd; tr = [x, y] }
      if (dd < dMin) { dMin = dd; bl = [x, y] }
      if (x > 0 && mask[p - 1] === 1) { mask[p - 1] = 2; tumpukan[atas++] = p - 1 }
      if (x < w - 1 && mask[p + 1] === 1) { mask[p + 1] = 2; tumpukan[atas++] = p + 1 }
      if (y > 0 && mask[p - w] === 1) { mask[p - w] = 2; tumpukan[atas++] = p - w }
      if (y < h - 1 && mask[p + w] === 1) { mask[p + w] = 2; tumpukan[atas++] = p + w }
    }
    if (!terbaik || luas > terbaik.luas) terbaik = { luas, tl, tr, br, bl }
  }
  if (!terbaik) return null

  // Validasi: kertas harus cukup besar, tapi bukan seluruh bingkai.
  const bagian = terbaik.luas / n
  if (bagian < 0.15 || bagian > 0.97) return null

  const q = [terbaik.tl, terbaik.tr, terbaik.br, terbaik.bl]

  // Bentuknya harus mendekati segi empat (komponen mengisi sebagian besar segi empat sudutnya).
  let luasQuad = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    luasQuad += a[0] * b[1] - b[0] * a[1]
  }
  luasQuad = Math.abs(luasQuad) / 2
  if (luasQuad < 1) return null
  const isi = terbaik.luas / luasQuad
  if (isi < 0.72 || isi > 1.08) return null

  // Sisi-sisinya tidak boleh terlalu pendek.
  const minSisi = 0.15 * Math.max(w, h)
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < minSisi) return null
  }

  // Geser sedikit ke dalam (1,5%) supaya tepi meja tidak ikut terbawa.
  const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4
  const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4
  const sx = kanvas.width / w
  const sy = kanvas.height / h
  return q.map(([x, y]) => [
    (cx + (x - cx) * 0.985) * sx,
    (cy + (y - cy) * 0.985) * sy,
  ])
}

// Luruskan segi empat [TL, TR, BR, BL] menjadi persegi panjang (perspektif).
function luruskan(sumber, sudut) {
  const [p0, p1, p2, p3] = sudut
  const jarak = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
  let lebar = (jarak(p0, p1) + jarak(p3, p2)) / 2
  let tinggi = (jarak(p0, p3) + jarak(p1, p2)) / 2
  const skala = Math.min(1, SISI_MAKS / Math.max(lebar, tinggi))
  lebar = Math.round(lebar * skala)
  tinggi = Math.round(tinggi * skala)
  if (lebar < 200 || tinggi < 200) return null

  // Homografi persegi satuan -> segi empat (Heckbert).
  const [x0, y0] = p0
  const [x1, y1] = p1
  const [x2, y2] = p2
  const [x3, y3] = p3
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const dy3 = y0 - y1 + y2 - y3
  let g = 0
  let hh = 0
  const det = dx1 * dy2 - dx2 * dy1
  if (Math.abs(det) > 1e-9 && (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9)) {
    g = (dx3 * dy2 - dx2 * dy3) / det
    hh = (dx1 * dy3 - dx3 * dy1) / det
  }
  const a = x1 - x0 + g * x1
  const b = x3 - x0 + hh * x3
  const c = x0
  const d = y1 - y0 + g * y1
  const e = y3 - y0 + hh * y3
  const f = y0

  const sw = sumber.width
  const sh = sumber.height
  const sd = sumber.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sw, sh).data

  const hasil = buatKanvas(lebar, tinggi)
  const hctx = hasil.getContext('2d')
  const out = hctx.createImageData(lebar, tinggi)
  const od = out.data

  for (let j = 0; j < tinggi; j++) {
    const v = (j + 0.5) / tinggi
    for (let i = 0; i < lebar; i++) {
      const u = (i + 0.5) / lebar
      const den = g * u + hh * v + 1
      let px = (a * u + b * v + c) / den - 0.5
      let py = (d * u + e * v + f) / den - 0.5
      px = px < 0 ? 0 : px > sw - 1.001 ? sw - 1.001 : px
      py = py < 0 ? 0 : py > sh - 1.001 ? sh - 1.001 : py
      const ix = px | 0
      const iy = py | 0
      const fx = px - ix
      const fy = py - iy
      const p00 = (iy * sw + ix) * 4
      const p10 = p00 + 4
      const p01 = p00 + sw * 4
      const p11 = p01 + 4
      const w00 = (1 - fx) * (1 - fy)
      const w10 = fx * (1 - fy)
      const w01 = (1 - fx) * fy
      const w11 = fx * fy
      const o = (j * lebar + i) * 4
      od[o] = sd[p00] * w00 + sd[p10] * w10 + sd[p01] * w01 + sd[p11] * w11
      od[o + 1] = sd[p00 + 1] * w00 + sd[p10 + 1] * w10 + sd[p01 + 1] * w01 + sd[p11 + 1] * w11
      od[o + 2] = sd[p00 + 2] * w00 + sd[p10 + 2] * w10 + sd[p01 + 2] * w01 + sd[p11 + 2] * w11
      od[o + 3] = 255
    }
  }
  hctx.putImageData(out, 0, 0)
  return hasil
}

// Kanvas foto -> kanvas yang sudah dipotong mengikuti kertas, atau null.
function potongKertas(kanvas) {
  try {
    const sudut = cariSudutKertas(kanvas)
    if (!sudut) return null
    return luruskan(kanvas, sudut)
  } catch {
    return null
  }
}

/* ================================================================
   Foto -> JPEG siap pakai
   ================================================================ */

// Foto mentah dari kamera -> { asli, potong }.
// asli   = JPEG yang sudah diperkecil.
// potong = versi terpotong/lurus mengikuti kertas (null bila kertas tidak terdeteksi
//          atau potongOtomatis dimatikan).
export async function siapkanFoto(berkas, { potongOtomatis = true } = {}) {
  const g = await muatGambar(berkas)
  try {
    const skala = Math.min(1, SISI_MAKS / Math.max(g.w, g.h))
    const w = Math.max(1, Math.round(g.w * skala))
    const h = Math.max(1, Math.round(g.h * skala))
    const kanvas = buatKanvas(w, h)
    const ctx = kanvas.getContext('2d', { willReadFrequently: true })
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(g.gambar, 0, 0, w, h)

    const asli = { blob: await kanvasKeBlob(kanvas, 0.9), w, h }

    let potong = null
    if (potongOtomatis) {
      const hasil = potongKertas(kanvas)
      if (hasil) {
        potong = { blob: await kanvasKeBlob(hasil, 0.9), w: hasil.width, h: hasil.height }
        hasil.width = 0
      }
    }

    kanvas.width = 0
    return { asli, potong }
  } finally {
    g.tutup()
  }
}

// "Mode dokumen": abu-abu + regangkan kontras supaya kertas jadi putih bersih.
function perbaikiDokumen(kanvas) {
  const ctx = kanvas.getContext('2d', { willReadFrequently: true })
  const img = ctx.getImageData(0, 0, kanvas.width, kanvas.height)
  const d = img.data
  const total = d.length / 4
  const hist = new Uint32Array(256)

  for (let i = 0; i < d.length; i += 4) {
    const g = ((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000) | 0
    d[i] = d[i + 1] = d[i + 2] = g
    hist[g]++
  }

  // Titik hitam = persentil 1%, titik putih = persentil 90%.
  let acc = 0
  let lo = 0
  let hi = 255
  let loKetemu = false
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (!loKetemu && acc >= total * 0.01) {
      lo = v
      loKetemu = true
    }
    if (acc >= total * 0.9) {
      hi = v
      break
    }
  }

  if (hi - lo >= 30) {
    const lut = new Uint8Array(256)
    for (let v = 0; v < 256; v++) {
      lut[v] = Math.max(0, Math.min(255, Math.round(((v - lo) * 255) / (hi - lo))))
    }
    for (let i = 0; i < d.length; i += 4) {
      const g = lut[d[i]]
      d[i] = d[i + 1] = d[i + 2] = g
    }
  }
  ctx.putImageData(img, 0, 0)
}

// Susun PDF sederhana: satu foto JPEG per halaman (A4, otomatis tegak/mendatar).
function tulisPdf(halaman) {
  const enc = new TextEncoder()
  const potongan = []
  let panjang = 0
  const offsets = []

  const tulis = (data) => {
    const u = typeof data === 'string' ? enc.encode(data) : data
    potongan.push(u)
    panjang += u.length
  }
  const mulaiObj = (n) => {
    offsets[n] = panjang
    tulis(`${n} 0 obj\n`)
  }
  const akhirObj = () => tulis('endobj\n')

  tulis('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n')

  mulaiObj(1)
  tulis('<< /Type /Catalog /Pages 2 0 R >>\n')
  akhirObj()

  const kids = halaman.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  mulaiObj(2)
  tulis(`<< /Type /Pages /Kids [${kids}] /Count ${halaman.length} >>\n`)
  akhirObj()

  halaman.forEach((h, i) => {
    const objHalaman = 3 + i * 3
    const objIsi = objHalaman + 1
    const objGambar = objHalaman + 2

    const mendatar = h.w > h.h
    const pw = mendatar ? 842 : 595
    const ph = mendatar ? 595 : 842
    const skala = Math.min(pw / h.w, ph / h.h)
    const iw = h.w * skala
    const ih = h.h * skala
    const x = (pw - iw) / 2
    const y = (ph - ih) / 2
    const isi = `q ${iw.toFixed(2)} 0 0 ${ih.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`

    mulaiObj(objHalaman)
    tulis(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] ` +
        `/Resources << /XObject << /Im0 ${objGambar} 0 R >> >> /Contents ${objIsi} 0 R >>\n`
    )
    akhirObj()

    mulaiObj(objIsi)
    tulis(`<< /Length ${isi.length} >>\nstream\n${isi}\nendstream\n`)
    akhirObj()

    mulaiObj(objGambar)
    tulis(
      `<< /Type /XObject /Subtype /Image /Width ${h.w} /Height ${h.h} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${h.bytes.length} >>\nstream\n`
    )
    tulis(h.bytes)
    tulis('\nendstream\n')
    akhirObj()
  })

  const jumlahObj = 2 + halaman.length * 3
  const posisiXref = panjang
  tulis(`xref\n0 ${jumlahObj + 1}\n`)
  tulis('0000000000 65535 f \n')
  for (let n = 1; n <= jumlahObj; n++) {
    tulis(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`)
  }
  tulis(`trailer\n<< /Size ${jumlahObj + 1} /Root 1 0 R >>\nstartxref\n${posisiXref}\n%%EOF\n`)

  return new Blob(potongan, { type: 'application/pdf' })
}

// foto: [{ blob, w, h }] (versi yang dipakai per halaman) -> Blob PDF
export async function buatPdfDariFoto(foto, { modeDokumen = true } = {}) {
  const halaman = []
  for (const f of foto) {
    let blob = f.blob
    if (modeDokumen) {
      const g = await muatGambar(f.blob)
      try {
        const kanvas = buatKanvas(g.w, g.h)
        kanvas.getContext('2d', { willReadFrequently: true }).drawImage(g.gambar, 0, 0)
        perbaikiDokumen(kanvas)
        blob = await kanvasKeBlob(kanvas, 0.8)
        kanvas.width = 0
      } finally {
        g.tutup()
      }
    }
    halaman.push({ bytes: new Uint8Array(await blob.arrayBuffer()), w: f.w, h: f.h })
  }
  return tulisPdf(halaman)
}
