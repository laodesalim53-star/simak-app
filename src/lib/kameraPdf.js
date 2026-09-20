// Scan dokumen lewat kamera: foto -> PDF.
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

// Foto mentah dari kamera -> JPEG yang sudah diperkecil.
export async function siapkanFoto(berkas) {
  const g = await muatGambar(berkas)
  try {
    const skala = Math.min(1, SISI_MAKS / Math.max(g.w, g.h))
    const w = Math.max(1, Math.round(g.w * skala))
    const h = Math.max(1, Math.round(g.h * skala))
    const kanvas = buatKanvas(w, h)
    const ctx = kanvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(g.gambar, 0, 0, w, h)
    const blob = await kanvasKeBlob(kanvas, 0.9)
    kanvas.width = 0
    return { blob, w, h }
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

// foto: [{ blob, w, h }] -> Blob PDF
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
