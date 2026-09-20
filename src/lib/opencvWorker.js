// Web Worker: seluruh pemuatan OpenCV.js (~8 MB) DAN setiap operasinya
// (Canny, findContours, warpPerspective, adaptiveThreshold) berjalan DI SINI,
// terpisah dari thread utama — supaya UI (termasuk tombol kamera) tidak pernah
// terkunci, seberapa pun lambat/lama proses ini berlangsung di HP tertentu.
//
// Jangan pakai worker ini langsung — semua akses lewat opencvLoader.js.
//
// Protokol pesan:
//   -> { type: 'muat' }
//   <- { type: 'siap' } | { type: 'gagal', pesan }
//   -> { type: 'tugas', id, nama, payload }   (payload boleh berisi ImageBitmap)
//   <- { type: 'hasil', id, hasil }           (hasil boleh berisi ImageBitmap)
//   <- { type: 'error', id, pesan }

const OPENCV_URL = 'https://docs.opencv.org/4.9.0/opencv.js'
let cvSiap = false

self.onmessage = (e) => {
  const msg = e.data
  if (msg.type === 'muat') return muatCv()
  if (msg.type === 'tugas') return prosesTugas(msg)
}

function muatCv() {
  try {
    self.importScripts(OPENCV_URL) // sinkron di sini, tapi ini worker -> tidak mengunci UI
  } catch {
    self.postMessage({ type: 'gagal', pesan: 'Gagal memuat mesin pemindai. Periksa koneksi internet Anda.' })
    return
  }
  if (!self.cv) {
    self.postMessage({ type: 'gagal', pesan: 'OpenCV.js gagal dimuat.' })
    return
  }
  self.cv['onRuntimeInitialized'] = () => {
    cvSiap = true
    self.postMessage({ type: 'siap' })
  }
}

function prosesTugas(msg) {
  if (!cvSiap) {
    self.postMessage({ type: 'error', id: msg.id, pesan: 'Mesin pemindai belum siap.' })
    return
  }
  try {
    const { data, transfer } = TUGAS[msg.nama](msg.payload)
    self.postMessage({ type: 'hasil', id: msg.id, hasil: data }, transfer)
  } catch (err) {
    self.postMessage({ type: 'error', id: msg.id, pesan: err?.message || 'Gagal memproses gambar.' })
  }
}

// ---------- Konversi ImageBitmap <-> cv.Mat ----------
// Sengaja TIDAK memakai cv.imshow (yang di sejumlah build OpenCV.js mengecek
// `instanceof HTMLCanvasElement`, yang tidak berlaku untuk OffscreenCanvas di
// dalam worker). Dilakukan manual lewat ImageData supaya portabel.

function bitmapKeMat(bitmap) {
  const kanvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = kanvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0)
  const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  bitmap.close()
  return self.cv.matFromImageData(data)
}

function matKeBitmap(mat) {
  const cv = self.cv
  let rgba = mat
  let sementara = false
  if (mat.channels() === 1) {
    rgba = new cv.Mat()
    cv.cvtColor(mat, rgba, cv.COLOR_GRAY2RGBA)
    sementara = true
  } else if (mat.channels() === 3) {
    rgba = new cv.Mat()
    cv.cvtColor(mat, rgba, cv.COLOR_RGB2RGBA)
    sementara = true
  }
  const data = new ImageData(new Uint8ClampedArray(rgba.data), rgba.cols, rgba.rows)
  const kanvas = new OffscreenCanvas(rgba.cols, rgba.rows)
  kanvas.getContext('2d').putImageData(data, 0, 0)
  if (sementara) rgba.delete()
  return kanvas.transferToImageBitmap()
}

function urutkanSudut(titik) {
  let tl = titik[0], br = titik[0], tr = titik[0], bl = titik[0]
  let sMin = Infinity, sMax = -Infinity, dMin = Infinity, dMax = -Infinity
  for (const p of titik) {
    const s = p[0] + p[1]
    const d = p[0] - p[1]
    if (s < sMin) { sMin = s; tl = p }
    if (s > sMax) { sMax = s; br = p }
    if (d > dMax) { dMax = d; tr = p }
    if (d < dMin) { dMin = d; bl = p }
  }
  return [tl, tr, br, bl]
}

const TUGAS = {
  // payload: { bitmapKecil } -> { sudut: [[x,y]x4] | null } (koordinat = bitmapKecil)
  deteksiSudut({ bitmapKecil }) {
    const cv = self.cv
    const src = bitmapKeMat(bitmapKecil)
    const abu = new cv.Mat()
    const halus = new cv.Mat()
    const tepi = new cv.Mat()
    const dilasi = new cv.Mat()
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U)
    const kontur = new cv.MatVector()
    const hierarki = new cv.Mat()
    let sudutTerbaik = null
    try {
      cv.cvtColor(src, abu, cv.COLOR_RGBA2GRAY)
      cv.GaussianBlur(abu, halus, new cv.Size(5, 5), 0)
      cv.Canny(halus, tepi, 50, 150)
      cv.dilate(tepi, dilasi, kernel)
      cv.findContours(dilasi, kontur, hierarki, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

      const luasFrame = src.cols * src.rows
      let luasTerbesar = 0
      for (let i = 0; i < kontur.size(); i++) {
        const c = kontur.get(i)
        const luas = cv.contourArea(c)
        if (luas < luasFrame * 0.15 || luas > luasFrame * 0.97) {
          c.delete()
          continue
        }
        const keliling = cv.arcLength(c, true)
        const aproks = new cv.Mat()
        cv.approxPolyDP(c, aproks, 0.02 * keliling, true)
        if (aproks.rows === 4 && cv.isContourConvex(aproks) && luas > luasTerbesar) {
          luasTerbesar = luas
          const titik = []
          for (let j = 0; j < 4; j++) titik.push([aproks.data32S[j * 2], aproks.data32S[j * 2 + 1]])
          sudutTerbaik = titik
        }
        aproks.delete()
        c.delete()
      }
    } finally {
      src.delete(); abu.delete(); halus.delete(); tepi.delete(); dilasi.delete()
      kernel.delete(); kontur.delete(); hierarki.delete()
    }
    const sudut = sudutTerbaik ? urutkanSudut(sudutTerbaik) : null
    return { data: { sudut }, transfer: [] }
  },

  // payload: { bitmapSumber, sudut: [TL,TR,BR,BL], lebar, tinggi } -> { bitmapHasil }
  luruskan({ bitmapSumber, sudut, lebar, tinggi }) {
    const cv = self.cv
    const [p0, p1, p2, p3] = sudut
    const src = bitmapKeMat(bitmapSumber)
    const dst = new cv.Mat()
    const srcTitik = cv.matFromArray(4, 1, cv.CV_32FC2, [
      p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], p3[0], p3[1],
    ])
    const dstTitik = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, lebar, 0, lebar, tinggi, 0, tinggi])
    const M = cv.getPerspectiveTransform(srcTitik, dstTitik)
    let bitmapHasil
    try {
      cv.warpPerspective(
        src, dst, M, new cv.Size(lebar, tinggi),
        cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar()
      )
      bitmapHasil = matKeBitmap(dst)
    } finally {
      src.delete(); dst.delete(); srcTitik.delete(); dstTitik.delete(); M.delete()
    }
    return { data: { bitmapHasil }, transfer: [bitmapHasil] }
  },

  // payload: { bitmapSumber } -> { bitmapHasil }
  dokumenAdaptif({ bitmapSumber }) {
    const cv = self.cv
    const src = bitmapKeMat(bitmapSumber)
    const abu = new cv.Mat()
    const halus = new cv.Mat()
    const hasilMat = new cv.Mat()
    let bitmapHasil
    try {
      cv.cvtColor(src, abu, cv.COLOR_RGBA2GRAY)
      cv.GaussianBlur(abu, halus, new cv.Size(3, 3), 0)
      let blok = Math.round(Math.min(src.cols, src.rows) / 20)
      if (blok < 15) blok = 15
      if (blok % 2 === 0) blok += 1
      cv.adaptiveThreshold(
        halus, hasilMat, 255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY,
        blok, 10
      )
      bitmapHasil = matKeBitmap(hasilMat)
    } finally {
      src.delete(); abu.delete(); halus.delete(); hasilMat.delete()
    }
    return { data: { bitmapHasil }, transfer: [bitmapHasil] }
  },
}
