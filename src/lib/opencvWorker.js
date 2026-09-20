// Web Worker: seluruh pemuatan OpenCV.js (~8 MB) DAN setiap operasinya
// (deteksi tepi, warpPerspective, adaptiveThreshold) berjalan DI SINI,
// terpisah dari thread utama — supaya UI (termasuk tombol kamera) tidak pernah
// terkunci, seberapa pun lambat/lama proses ini berlangsung di HP tertentu.
//
// Versi ini menambahkan penanganan pencahayaan kurang/tidak merata:
//  - Normalisasi cahaya (estimasi latar lewat blur besar, lalu diratakan)
//    sebelum deteksi tepi -> tidak lagi salah mengira garis bayangan di
//    tengah kertas sebagai tepi dokumen (penyebab utama "kepotong setengah").
//  - Ambang Canny otomatis mengikuti kecerahan foto (bukan angka tetap).
//  - RETR_EXTERNAL (bukan RETR_LIST) + morphological close -> hanya kontur
//    TERLUAR yang dipertimbangkan, kontur di dalam kertas (bayangan, tulisan)
//    diabaikan.
//  - Fallback convex-hull kalau tidak ada kontur 4-titik yang pas.
//  - Auto-brighten (CLAHE pada kanal kecerahan saja, warna tidak berubah)
//    pada hasil crop, dan normalisasi cahaya sebelum ambang adaptif mode
//    dokumen supaya latar tidak gelap saat foto aslinya kurang terang.
//
// Jangan pakai worker ini langsung — semua akses lewat opencvLoader.js.
//
// Protokol pesan (tidak berubah dari versi sebelumnya):
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

// ---------- Bantuan: pencahayaan ----------

// Ratakan pencahayaan yang tidak merata (mis. separuh kertas kena bayangan)
// dengan membagi foto dengan estimasi "peta latar"-nya (blur besar). Hasilnya
// tepi kertas-vs-background jadi lebih jelas, dan garis bayangan di dalam
// kertas tidak lagi terlihat seperti tepi yang kuat.
function normalisasiCahaya(cv, abu) {
  let sisi = Math.round(Math.min(abu.cols, abu.rows) / 6)
  if (sisi < 21) sisi = 21
  if (sisi % 2 === 0) sisi += 1

  const latar = new cv.Mat()
  const abuF = new cv.Mat()
  const latarF = new cv.Mat()
  const rasio = new cv.Mat()
  const hasil = new cv.Mat()
  try {
    cv.GaussianBlur(abu, latar, new cv.Size(sisi, sisi), 0)
    abu.convertTo(abuF, cv.CV_32F)
    latar.convertTo(latarF, cv.CV_32F, 1, 1) // +1 supaya tidak dibagi nol
    cv.divide(abuF, latarF, rasio)
    rasio.convertTo(hasil, cv.CV_8U, 255)
    return hasil
  } finally {
    latar.delete(); abuF.delete(); latarF.delete(); rasio.delete()
  }
}

// Terangkan foto berwarna tanpa mengubah warnanya: CLAHE hanya pada kanal
// kecerahan (L) di ruang warna Lab. Aman dipakai pada foto yang sudah cukup
// terang (efeknya minim) maupun yang kurang cahaya (efeknya terlihat jelas).
function terangkanOtomatis(cv, matRGBA) {
  const rgb = new cv.Mat()
  const lab = new cv.Mat()
  const kanal = new cv.MatVector()
  const Lbaru = new cv.Mat()
  const gabung = new cv.MatVector()
  const labBaru = new cv.Mat()
  const rgbBaru = new cv.Mat()
  const rgbaBaru = new cv.Mat()
  const clahe = new cv.CLAHE(2.5, new cv.Size(8, 8))
  try {
    cv.cvtColor(matRGBA, rgb, cv.COLOR_RGBA2RGB)
    cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab)
    cv.split(lab, kanal)
    const L = kanal.get(0)
    const A = kanal.get(1)
    const B = kanal.get(2)
    try {
      clahe.apply(L, Lbaru)
      gabung.push_back(Lbaru)
      gabung.push_back(A)
      gabung.push_back(B)
      cv.merge(gabung, labBaru)
      cv.cvtColor(labBaru, rgbBaru, cv.COLOR_Lab2RGB)
      cv.cvtColor(rgbBaru, rgbaBaru, cv.COLOR_RGB2RGBA)
    } finally {
      L.delete(); A.delete(); B.delete()
    }
    return rgbaBaru.clone()
  } finally {
    rgb.delete(); lab.delete(); kanal.delete(); Lbaru.delete()
    gabung.delete(); labBaru.delete(); rgbBaru.delete(); rgbaBaru.delete()
    clahe.delete()
  }
}

// ---------- Deteksi kontur 4-sisi dari gambar tepi (dipakai jalur utama & fallback) ----------
function cariKontur4Sisi(cv, dilasi, luasFrame) {
  const kontur = new cv.MatVector()
  const hierarki = new cv.Mat()
  let sudutTerbaik = null
  let idxTerbesar = -1
  let luasTerbesar = 0
  try {
    cv.findContours(dilasi, kontur, hierarki, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    for (let i = 0; i < kontur.size(); i++) {
      const c = kontur.get(i)
      const luas = cv.contourArea(c)
      if (luas < luasFrame * 0.15 || luas > luasFrame * 0.97) {
        c.delete()
        continue
      }
      if (luas > luasTerbesar) {
        luasTerbesar = luas
        idxTerbesar = i
      }
      const keliling = cv.arcLength(c, true)
      const aproks = new cv.Mat()
      cv.approxPolyDP(c, aproks, 0.02 * keliling, true)
      if (aproks.rows === 4 && cv.isContourConvex(aproks) && luas === luasTerbesar) {
        const titik = []
        for (let j = 0; j < 4; j++) titik.push([aproks.data32S[j * 2], aproks.data32S[j * 2 + 1]])
        sudutTerbaik = titik
      }
      aproks.delete()
      c.delete()
    }

    // Fallback: kontur terluar terbesar ditemukan tapi bentuknya bukan
    // quad bersih (mis. sudut membulat/terpotong sedikit) -> paksa jadi
    // 4 titik lewat convex hull, epsilon dilonggarkan bertahap.
    if (!sudutTerbaik && idxTerbesar !== -1) {
      const c = kontur.get(idxTerbesar)
      const hull = new cv.Mat()
      cv.convexHull(c, hull)
      const keliling = cv.arcLength(hull, true)
      for (let eps = 0.02; eps <= 0.12 && !sudutTerbaik; eps += 0.01) {
        const aproks = new cv.Mat()
        cv.approxPolyDP(hull, aproks, eps * keliling, true)
        if (aproks.rows === 4 && cv.isContourConvex(aproks)) {
          const titik = []
          for (let j = 0; j < 4; j++) titik.push([aproks.data32S[j * 2], aproks.data32S[j * 2 + 1]])
          sudutTerbaik = titik
        }
        aproks.delete()
      }
      hull.delete()
      c.delete()
    }
  } finally {
    kontur.delete()
    hierarki.delete()
  }
  return sudutTerbaik ? urutkanSudut(sudutTerbaik) : null
}

const TUGAS = {
  // payload: { bitmapKecil } -> { sudut: [[x,y]x4] | null } (koordinat = bitmapKecil)
  deteksiSudut({ bitmapKecil }) {
    const cv = self.cv
    const src = bitmapKeMat(bitmapKecil)
    const abu = new cv.Mat()
    const rata = new cv.Mat()
    const halus = new cv.Mat()
    const tepi = new cv.Mat()
    const dilasi = new cv.Mat()
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5))
    let sudut = null
    try {
      cv.cvtColor(src, abu, cv.COLOR_RGBA2GRAY)
      const diratakan = normalisasiCahaya(cv, abu)
      diratakan.copyTo(rata)
      diratakan.delete()

      cv.GaussianBlur(rata, halus, new cv.Size(5, 5), 0)

      // Ambang Canny mengikuti kecerahan foto (bukan angka tetap), supaya
      // tetap peka pada foto kurang cahaya maupun yang sudah terang.
      const rataRata = cv.mean(halus)[0]
      const sigma = 0.33
      const bawah = Math.max(10, (1 - sigma) * rataRata)
      const atas = Math.min(255, (1 + sigma) * rataRata)
      cv.Canny(halus, tepi, bawah, atas)
      cv.morphologyEx(tepi, dilasi, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 2)

      const luasFrame = src.cols * src.rows
      sudut = cariKontur4Sisi(cv, dilasi, luasFrame)
    } finally {
      src.delete(); abu.delete(); rata.delete(); halus.delete(); tepi.delete()
      dilasi.delete(); kernel.delete()
    }
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
    let terang = null
    let bitmapHasil
    try {
      cv.warpPerspective(
        src, dst, M, new cv.Size(lebar, tinggi),
        cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar()
      )
      // Terangkan hasil crop supaya foto yang diambil di ruangan kurang
      // cahaya tetap terlihat cerah (warna tidak berubah, hanya kecerahan).
      terang = terangkanOtomatis(cv, dst)
      bitmapHasil = matKeBitmap(terang)
    } finally {
      src.delete(); dst.delete(); srcTitik.delete(); dstTitik.delete(); M.delete()
      terang?.delete()
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
      // Ratakan pencahayaan dulu SEBELUM ambang adaptif, supaya latar kertas
      // yang tadinya redup di sebagian foto tetap jadi putih bersih, bukan
      // ikut ter-threshold jadi hitam.
      const diratakan = normalisasiCahaya(cv, abu)
      try {
        cv.GaussianBlur(diratakan, halus, new cv.Size(3, 3), 0)
      } finally {
        diratakan.delete()
      }

      let blok = Math.round(Math.min(src.cols, src.rows) / 20)
      if (blok < 15) blok = 15
      if (blok % 2 === 0) blok += 1
      cv.adaptiveThreshold(
        halus, hasilMat, 255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY,
        blok, 8
      )
      bitmapHasil = matKeBitmap(hasilMat)
    } finally {
      src.delete(); abu.delete(); halus.delete(); hasilMat.delete()
    }
    return { data: { bitmapHasil }, transfer: [bitmapHasil] }
  },
}
