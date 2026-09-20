// Menggabungkan beberapa halaman hasil scan menjadi satu file PDF, satu
// halaman PDF per gambar. Ukuran halaman PDF mengikuti ukuran kertas ASLI
// yang dipilih pengguna saat scan (A4/Letter/Legal) -- bukan ditebak dari
// resolusi piksel gambar -- supaya hasil PDF benar-benar 1:1 dengan ukuran
// kertas fisik dokumen.
//
// Pemakaian:
//   import { buatPdfDariHalaman } from './pdfBuilder'
//   const blobPdf = await buatPdfDariHalaman(daftarHalaman, { kualitas: 0.85 })
//   // daftarHalaman: [{ bitmap, lebarMm, tinggiMm }, ...]

import { jsPDF } from 'jspdf'

async function bitmapKeDataUrl(bitmap, kualitas) {
  const kanvas = document.createElement('canvas')
  kanvas.width = bitmap.width
  kanvas.height = bitmap.height
  kanvas.getContext('2d').drawImage(bitmap, 0, 0)
  return kanvas.toDataURL('image/jpeg', kualitas)
}

// daftarHalaman: array { bitmap: ImageBitmap, lebarMm: number, tinggiMm: number }
// opsi.kualitas: 0..1, default 0.85 (kompresi JPEG)
export async function buatPdfDariHalaman(daftarHalaman, opsi = {}) {
  const kualitas = opsi.kualitas ?? 0.85
  if (!daftarHalaman.length) throw new Error('Tidak ada halaman untuk digabung.')

  let dokumen = null

  for (let i = 0; i < daftarHalaman.length; i++) {
    const { bitmap, lebarMm, tinggiMm } = daftarHalaman[i]
    const dataUrl = await bitmapKeDataUrl(bitmap, kualitas)
    const orientasi = lebarMm > tinggiMm ? 'landscape' : 'portrait'
    const format = [lebarMm, tinggiMm]

    if (i === 0) {
      dokumen = new jsPDF({ orientation: orientasi, unit: 'mm', format })
    } else {
      dokumen.addPage(format, orientasi)
    }

    dokumen.addImage(dataUrl, 'JPEG', 0, 0, lebarMm, tinggiMm)
  }

  return dokumen.output('blob')
}
