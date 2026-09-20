// Scan dokumen lewat kamera: foto -> (deteksi & luruskan mengikuti kertas, via OpenCV.js) -> PDF.
//
// PERUBAHAN PENTING dari versi sebelumnya: seluruh pemrosesan OpenCV (deteksi
// tepi, pelurusan perspektif, mode dokumen adaptif) sekarang berjalan di dalam
// Web Worker (lihat opencvLoader.js + opencvWorker.js), bukan di thread utama.
// Fungsi di file ini hanya menyiapkan ImageBitmap dan mengirimkannya ke worker,
// lalu menerima hasilnya kembali sebagai ImageBitmap. Ini memastikan pemuatan
// OpenCV.js (~8 MB) dan tiap operasinya tidak pernah mengunci UI/tombol kamera,
// seberapa pun lambat/lama prosesnya di HP tertentu.
//
// API publik (siapkanFoto, buatPdfDariFoto, suntingSudutFoto) tidak berubah.

import { jalankanTugasCv } from './opencvLoader'

const SISI_MAKS = 2200 // sisi terpanjang foto (piksel), supaya PDF tidak terlalu berat
const SISI_DETEKSI = 500 // foto diperkecil ke ini dulu untuk deteksi tepi (cukup & lebih cepat)

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
   Deteksi sudut kertas (didelegasikan ke worker OpenCV)
   1) Perkecil foto ke kanvas kecil (murah, dilakukan di sini).
   2) Kirim sebagai ImageBitmap ke worker: di sana dilakukan Canny +
      findContours + approxPolyDP untuk mencari kontur 4-sisi kertas.
   3) Worker mengembalikan 4 titik [TL,TR,BR,BL] dalam koordinat kanvas kecil;
      di sini diskalakan balik ke ukuran foto asli.
   Mengembalikan null bila tidak ada kontur yang cukup meyakinkan sebagai kertas.
   ================================================================ */

async function deteksiSudutOtomatis(kanvasAsli) {
  const skala = Math.min(1, SISI_DETEKSI / Math.max(kanvasAsli.width, kanvasAsli.height))
  const w = Math.max(8, Math.round(kanvasAsli.width * skala))
  const h = Math.max(8, Math.round(kanvasAsli.height * skala))
  const kecil = buatKanvas(w, h)
  kecil.getContext('2d').drawImage(kanvasAsli, 0, 0, w, h)
  const bitmapKecil = await createImageBitmap(kecil)
  kecil.width = 0

  const { sudut } = await jalankanTugasCv('deteksiSudut', { bitmapKecil }, [bitmapKecil])
  if (!sudut) return null

  const sx = kanvasAsli.width / w
  const sy = kanvasAsli.height / h
  return sudut.map(([x, y]) => [x * sx, y * sy])
}

/* ================================================================
   Pelurusan perspektif (didelegasikan ke worker OpenCV, cv.warpPerspective)
   sudut: [TL, TR, BR, BL] dalam koordinat kanvasSumber.
   ================================================================ */

async function luruskanDenganSudut(kanvasSumber, sudut) {
  const [p0, p1, p2, p3] = sudut
  const jarak = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
  let lebar = (jarak(p0, p1) + jarak(p3, p2)) / 2
  let tinggi = (jarak(p0, p3) + jarak(p1, p2)) / 2
  const skala = Math.min(1, SISI_MAKS / Math.max(lebar, tinggi))
  lebar = Math.max(200, Math.round(lebar * skala))
  tinggi = Math.max(200, Math.round(tinggi * skala))

  const bitmapSumber = await createImageBitmap(kanvasSumber)
  const { bitmapHasil } = await jalankanTugasCv(
    'luruskan',
    { bitmapSumber, sudut, lebar, tinggi },
    [bitmapSumber]
  )

  const hasil = buatKanvas(lebar, tinggi)
  hasil.getContext('2d').drawImage(bitmapHasil, 0, 0)
  bitmapHasil.close()
  return hasil
}

/* ================================================================
   Foto -> JPEG siap pakai
   ================================================================ */

// Foto mentah dari kamera -> { asli, potong, sudut }.
// asli   = JPEG yang sudah diperkecil (dipakai juga sebagai sumber saat sudut disunting manual).
// potong = versi terpotong/lurus mengikuti kertas (null bila kertas tidak terdeteksi
//          atau potongOtomatis dimatikan).
// sudut  = 4 titik [TL,TR,BR,BL] dalam koordinat "asli" yang dipakai untuk potong,
//          atau null bila tidak terdeteksi (dipakai sebagai titik awal editor sudut manual).
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
    let sudut = null
    if (potongOtomatis) {
      try {
        sudut = await deteksiSudutOtomatis(kanvas)
        if (sudut) {
          const hasil = await luruskanDenganSudut(kanvas, sudut)
          potong = { blob: await kanvasKeBlob(hasil, 0.9), w: hasil.width, h: hasil.height }
          hasil.width = 0
        }
      } catch {
        // OpenCV gagal dimuat/berjalan (mis. offline) -> pakai foto apa adanya,
        // pengguna masih bisa memotong manual lewat editor sudut.
        sudut = null
        potong = null
      }
    }

    kanvas.width = 0
    return { asli, potong, sudut }
  } finally {
    g.tutup()
  }
}

// Menerapkan sudut hasil sunting manual (dari komponen SudutEditor) pada foto asli.
// Dipanggil ulang dari blob "asli" (bukan dari hasil potong sebelumnya) supaya
// kualitas gambar tetap maksimal walau disunting berkali-kali.
export async function suntingSudutFoto(blobAsli, sudutBaru) {
  const g = await muatGambar(blobAsli)
  try {
    const kanvas = buatKanvas(g.w, g.h)
    kanvas.getContext('2d', { willReadFrequently: true }).drawImage(g.gambar, 0, 0)
    const hasil = await luruskanDenganSudut(kanvas, sudutBaru)
    const potong = { blob: await kanvasKeBlob(hasil, 0.9), w: hasil.width, h: hasil.height }
    hasil.width = 0
    kanvas.width = 0
    return potong
  } finally {
    g.tutup()
  }
}

// "Mode dokumen": ambang adaptif per-blok (didelegasikan ke worker, OpenCV
// adaptiveThreshold) supaya kertas jadi putih bersih dan tulisan hitam pekat,
// tahan terhadap bayangan/cahaya tidak merata dalam satu foto.
async function perbaikiDokumenAdaptif(kanvas) {
  const bitmapSumber = await createImageBitmap(kanvas)
  const { bitmapHasil } = await jalankanTugasCv('dokumenAdaptif', { bitmapSumber }, [bitmapSumber])
  const ctx = kanvas.getContext('2d', { willReadFrequently: true })
  ctx.clearRect(0, 0, kanvas.width, kanvas.height)
  ctx.drawImage(bitmapHasil, 0, 0)
  bitmapHasil.close()
}

/* ================================================================
   Susun PDF sederhana: satu foto JPEG per halaman (A4, otomatis tegak/mendatar).
   (Tidak berubah — bagian ini murni penulisan byte PDF, tidak melibatkan
   pemrosesan gambar, jadi tetap aman berjalan di thread utama.)
   ================================================================ */

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
        await perbaikiDokumenAdaptif(kanvas)
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
