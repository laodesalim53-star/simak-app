// src/lib/bkuPdf.js
//
// Membaca PDF "BUKU KAS UMUM" hasil unduhan ARKAS (PDF berbasis teks) dan
// mengubahnya jadi baris yang bentuknya sama dengan baris CSV BkuImportModal:
//   { tanggal (YYYY-MM-DD), no_bukti, uraian, penerimaan, pengeluaran,
//     kode_kegiatan, kode_rekening, jumlah_barang, saldo_dokumen }
//
// Instal:  npm i pdfjs-dist
// Worker:  pdfjs-dist v4+ memakai "pdf.worker.min.mjs" (di bawah). Untuk v3 ke
//          bawah, ganti jadi 'pdfjs-dist/build/pdf.worker.min.js?url'.
//
// KENAPA BERBASIS POSISI KOLOM (bukan per baris teks):
//   Di PDF ini sel yang isinya 2 baris (kode rekening "5.2.05.01.01.00" + "01",
//   atau uraian panjang) ditengahkan secara vertikal terhadap tanggal, jadi
//   potongannya ada di ATAS dan di BAWAH baris tanggal. Karena itu tiap potongan
//   teks dikelompokkan ke baris tanggal TERDEKAT, lalu dibaca menurut kolomnya.

import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// Batas kolom (satuan poin PDF, A4 landscape 842 x 612) sesuai tata letak BKU ARKAS.
// Kolom: 1 Tanggal | 2 Kode Kegiatan | 3 Kode Rekening | 4 No. Bukti | 5 Uraian |
//        6 Penerimaan | 7 Pengeluaran | 8 Saldo
const X = {
  kegiatan: 80,    // kolom 2 mulai
  rekening: 130,   // kolom 3 mulai
  bukti: 198,      // kolom 4 mulai
  uraian: 238,     // kolom 5 mulai
  angka: 607,      // kolom 6-8 (penerimaan, pengeluaran, saldo) mulai
  batasPenerimaan: 695, // pusat angka < ini  -> penerimaan   (dipakai bila angka tidak 3 buah)
  batasPengeluaran: 768, // pusat angka < ini -> pengeluaran, selebihnya saldo
}
const MAKS_JARAK_Y = 13 // potongan teks lebih jauh dari ini dari baris tanggal diabaikan
const MARGIN_BAWAH = 40 // area footer "BKU Mei 2026 - NPSN ... Halaman x dari y"

const POLA_TANGGAL = /^(\d{2})-(\d{2})-(\d{4})$/
const POLA_ANGKA = /^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/
const POLA_REKENING_PENUH = /^\d\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4}$/
const POLA_REKENING_POTONG = /^\d\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{2}$/ // "5.2.05.01.01.00" + sambungan "01"

const NAMA_BULAN = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
]

function parseAngka(s) {
  const n = Number(String(s).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function urutkan(items) {
  return [...items].sort((a, b) => (Math.abs(a.y - b.y) < 3 ? a.x0 - b.x0 : a.y - b.y))
}

function kelompokBaris(items, toleransi = 3) {
  const grup = []
  for (const it of [...items].sort((a, b) => a.y - b.y)) {
    const g = grup.find((x) => Math.abs(x.y - it.y) < toleransi)
    if (g) g.items.push(it)
    else grup.push({ y: it.y, items: [it] })
  }
  return grup.map((g) => g.items.sort((a, b) => a.x0 - b.x0).map((i) => i.str).join(' '))
}

/**
 * Inti parser (fungsi murni, tidak butuh pdf.js) — menerima potongan teks per halaman:
 * pages = [{ tinggi, items: [{ str, x0, x1, y }] }]  (y dihitung dari atas halaman)
 */
export function parseBkuItems(pages) {
  const rows = []
  const ringkasan = {
    npsn: '', namaSekolah: '', sumberDana: '', bulan: null, tahun: null,
    totalPenerimaan: null, totalPengeluaran: null, saldoAkhir: null,
  }

  pages.forEach((hal, idxHal) => {
    const semua = hal.items
    let batasAtas = -Infinity
    let batasBawah = hal.tinggi - MARGIN_BAWAH

    // Baris nomor kolom "1 2 3 4 5 6 7 8" (hanya ada di halaman pertama) = akhir header tabel
    const angkaKolom = semua.filter((i) => /^[1-8]$/.test(i.str))
    for (const c of angkaKolom) {
      const sebaris = angkaKolom.filter((o) => Math.abs(o.y - c.y) < 2)
      if (sebaris.length >= 6) batasAtas = Math.max(batasAtas, c.y + 2)
    }

    // Baris "Jumlah" (total) di halaman terakhir: ambil angkanya, lalu abaikan semua di bawahnya
    const jumlah = semua.find((i) => i.str === 'Jumlah' && i.x0 > X.uraian && i.x0 < X.angka)
    if (jumlah) {
      batasBawah = Math.min(batasBawah, jumlah.y - 3)
      const total = semua
        .filter((i) => Math.abs(i.y - jumlah.y) < 3 && i.x0 >= X.angka && POLA_ANGKA.test(i.str))
        .sort((a, b) => a.x0 - b.x0)
        .map((i) => parseAngka(i.str))
      if (total.length === 3) {
        ringkasan.totalPenerimaan = total[0]
        ringkasan.totalPengeluaran = total[1]
        ringkasan.saldoAkhir = total[2]
      }
    }

    // Identitas (halaman pertama saja): NPSN, nama sekolah, bulan, tahun, sumber dana
    if (idxHal === 0) {
      const teksHeader = kelompokBaris(semua.filter((i) => i.y < (isFinite(batasAtas) ? batasAtas : 190)))
      for (const t of teksHeader) {
        let m
        if ((m = t.match(/NPSN\s*:\s*(\d+)/i)) && !ringkasan.npsn) ringkasan.npsn = m[1]
        if ((m = t.match(/Nama Sekolah\s*:\s*(.+)$/i))) ringkasan.namaSekolah = m[1].trim()
        if ((m = t.match(/Sumber Dana\s*:\s*(.+)$/i))) ringkasan.sumberDana = m[1].trim()
        if ((m = t.match(/BULAN\s*:\s*([A-Za-z]+)\s+TAHUN\s*:\s*(\d{4})/i))) {
          const idx = NAMA_BULAN.indexOf(m[1].toLowerCase())
          ringkasan.bulan = idx >= 0 ? idx + 1 : null
          ringkasan.tahun = Number(m[2])
        }
      }
    }

    // Baris tanggal = jangkar tiap transaksi
    const jangkar = semua
      .filter((i) => i.x0 < X.kegiatan && POLA_TANGGAL.test(i.str) && i.y > batasAtas && i.y < batasBawah)
      .sort((a, b) => a.y - b.y)
    if (jangkar.length === 0) return

    const rekam = jangkar.map((j) => ({ jangkar: j, items: [] }))
    for (const it of semua) {
      if (it.y <= batasAtas || it.y >= batasBawah) continue
      let terdekat = null
      let jarak = Infinity
      for (const r of rekam) {
        const d = Math.abs(it.y - r.jangkar.y)
        if (d < jarak) { jarak = d; terdekat = r }
      }
      if (terdekat && jarak <= MAKS_JARAK_Y) terdekat.items.push(it)
    }

    for (const r of rekam) {
      const [, dd, mm, yyyy] = r.jangkar.str.match(POLA_TANGGAL)
      const urut = urutkan(r.items)

      const kol = { kegiatan: [], rekening: [], bukti: [], uraian: [], angka: [] }
      for (const it of urut) {
        if (it === r.jangkar || it.x0 < X.kegiatan) continue
        if (it.x0 < X.rekening) kol.kegiatan.push(it)
        else if (it.x0 < X.bukti) kol.rekening.push(it)
        else if (it.x0 < X.uraian) kol.bukti.push(it)
        else if (it.x0 < X.angka) kol.uraian.push(it)
        else kol.angka.push(it)
      }

      // Angka: biasanya tepat 3 (penerimaan, pengeluaran, saldo; nol tetap ditulis "0")
      const angka = kol.angka.filter((i) => POLA_ANGKA.test(i.str)).sort((a, b) => a.x0 - b.x0)
      let penerimaan = 0
      let pengeluaran = 0
      let saldo = null
      if (angka.length === 3) {
        penerimaan = parseAngka(angka[0].str)
        pengeluaran = parseAngka(angka[1].str)
        saldo = parseAngka(angka[2].str)
      } else {
        for (const a of angka) {
          const pusat = (a.x0 + a.x1) / 2
          const nilai = parseAngka(a.str)
          if (pusat < X.batasPenerimaan) penerimaan = nilai
          else if (pusat < X.batasPengeluaran) pengeluaran = nilai
          else saldo = nilai
        }
      }

      // Kode rekening bisa terpotong 2 baris: "5.1.02.01.01.00" + "24" -> 5.1.02.01.01.0024
      const bagianRek = kol.rekening.map((i) => i.str)
      let kodeRekening = bagianRek.join('')
      if (bagianRek.length >= 2 && POLA_REKENING_POTONG.test(bagianRek[0]) && /^\d{2}$/.test(bagianRek[1])) {
        kodeRekening = bagianRek[0] + bagianRek[1]
      }
      if (kodeRekening && !POLA_REKENING_PENUH.test(kodeRekening) && !POLA_REKENING_POTONG.test(kodeRekening)) {
        // format tak dikenali: simpan apa adanya supaya tetap bisa dicek di pratinjau
        kodeRekening = bagianRek.join(' ')
      }

      rows.push({
        tanggal: `${yyyy}-${mm}-${dd}`,
        no_bukti: kol.bukti.map((i) => i.str).join(' '),
        uraian: kol.uraian.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim(),
        penerimaan,
        pengeluaran,
        kode_kegiatan: kol.kegiatan.map((i) => i.str).join(' '),
        kode_rekening: kodeRekening,
        jumlah_barang: '', // tidak ada di PDF BKU (kosong = null di database)
        // '' (bukan null) bila tak ada: normalizeRow di modal mengubah null jadi 0
        saldo_dokumen: saldo === null ? '' : saldo,
      })
    }
  })

  // ---- Pemeriksaan silang ----
  const peringatan = []
  let prev = null
  rows.forEach((r, i) => {
    if (r.saldo_dokumen !== '' && prev !== null) {
      const hitung = prev + r.penerimaan - r.pengeluaran
      if (Math.abs(hitung - r.saldo_dokumen) > 1) {
        peringatan.push(`Baris ${i + 1} (${r.tanggal}, ${r.uraian.slice(0, 40)}): saldo hitung ${hitung} ≠ saldo PDF ${r.saldo_dokumen}`)
      }
    }
    if (r.saldo_dokumen !== '') prev = r.saldo_dokumen
  })
  const sumTerima = rows.reduce((a, r) => a + r.penerimaan, 0)
  const sumKeluar = rows.reduce((a, r) => a + r.pengeluaran, 0)
  if (ringkasan.totalPenerimaan !== null && Math.abs(sumTerima - ringkasan.totalPenerimaan) > 1) {
    peringatan.push(`Total penerimaan hasil baca ${sumTerima} ≠ total di PDF ${ringkasan.totalPenerimaan}`)
  }
  if (ringkasan.totalPengeluaran !== null && Math.abs(sumKeluar - ringkasan.totalPengeluaran) > 1) {
    peringatan.push(`Total pengeluaran hasil baca ${sumKeluar} ≠ total di PDF ${ringkasan.totalPengeluaran}`)
  }
  if (ringkasan.totalPenerimaan === null) {
    peringatan.push('Baris "Jumlah" (total) tidak ditemukan di PDF — total tidak bisa dicek silang.')
  }

  return { rows, ringkasan: { ...ringkasan, jumlahBaris: rows.length, sumTerima, sumKeluar }, peringatan }
}

/** Baca file PDF di browser -> { rows, ringkasan, peringatan } */
export async function parseBkuPdf(file) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  const pages = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const vp = page.getViewport({ scale: 1 })
    const { items } = await page.getTextContent()
    pages.push({
      tinggi: vp.height,
      items: items
        .filter((i) => i.str && i.str.trim())
        .map((i) => ({
          str: i.str.trim(),
          x0: i.transform[4],
          x1: i.transform[4] + i.width,
          y: vp.height - i.transform[5], // dari atas halaman
        })),
    })
  }
  return parseBkuItems(pages)
}
