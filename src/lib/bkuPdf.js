// src/lib/bkuPdf.js
//
// Parser PDF BKU (berbasis teks) -> array baris yang bentuknya sama dengan
// baris CSV untuk BkuImportModal:
//   { tanggal (YYYY-MM-DD), no_bukti, uraian, penerimaan, pengeluaran, saldo_dokumen }
//
// Instal dulu:  npm i pdfjs-dist
// Catatan worker: untuk pdfjs-dist v4/v5 file worker-nya "pdf.worker.min.mjs".
// Kalau memakai v3 ke bawah, ganti jadi 'pdfjs-dist/build/pdf.worker.min.js?url'.
// Kalau ArkasImportModal/komponen lain sudah mengatur worker, samakan caranya.

import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const BULAN = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6, jul: 7,
  agu: 8, agt: 8, ags: 8, sep: 9, okt: 10, nov: 11, des: 12,
}

// Baris dianggap transaksi jika diawali tanggal:
// 03/05/2026, 03-05-2026, 2026-05-03, atau "3 Mei 2026"
const POLA_TANGGAL_AWAL =
  /^(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/

// Token angka: "1.250.000", "1.250.000,00", "250000", "0", "(1.000)"
const POLA_ANGKA = /^\(?-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?\)?$/

// Baris header/footer yang tidak boleh ikut jadi sambungan uraian
const POLA_HEADER_FOOTER =
  /^(halaman|page|no\.?\s*bukti|tanggal|uraian|saldo|jumlah|penerimaan|pengeluaran|buku kas)\b/i

// No. bukti: ada huruf dan angka, mis. BBU01, BNU02, 12/BKU/2025
const POLA_NO_BUKTI = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9/.\-]{3,20}$/

function parseAngka(s) {
  const negatif = /^\(.*\)$/.test(s) || s.startsWith('-')
  const bersih = s.replace(/[()-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(bersih)
  if (!Number.isFinite(n)) return null
  return negatif ? -n : n
}

function parseTanggal(teks) {
  let m = teks.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`

  m = teks.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  m = teks.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})/)
  if (m && BULAN[m[2].toLowerCase()]) {
    const bln = String(BULAN[m[2].toLowerCase()]).padStart(2, '0')
    return `${m[3]}-${bln}-${m[1].padStart(2, '0')}`
  }
  return null
}

// Gabungkan potongan teks PDF menjadi baris-baris berdasarkan koordinat Y
async function ambilBaris(file) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  const semua = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const { items } = await page.getTextContent()
    const grup = []

    for (const it of items) {
      if (!it.str || !it.str.trim()) continue
      const x = it.transform[4]
      const y = it.transform[5]
      let baris = grup.find((g) => Math.abs(g.y - y) < 3)
      if (!baris) {
        baris = { y, potongan: [] }
        grup.push(baris)
      }
      baris.potongan.push({ x, str: it.str.trim() })
    }

    grup.sort((a, b) => b.y - a.y) // atas -> bawah
    for (const g of grup) {
      g.potongan.sort((a, b) => a.x - b.x)
      semua.push(g.potongan.map((q) => q.str).join(' '))
    }
  }
  return semua
}

/**
 * @param {File} file        File PDF BKU (berbasis teks, bukan hasil scan)
 * @param {number|null} saldoAwal  Saldo sebelum baris pertama (opsional).
 *        Dipakai untuk menentukan arah penerimaan/pengeluaran pada baris pertama.
 * @returns {Promise<Array>}
 */
export async function parseBkuPdf(file, saldoAwal = null) {
  const baris = await ambilBaris(file)
  const hasil = []
  let saldoSebelumnya = saldoAwal
  let terakhir = null

  for (const teks of baris) {
    // --- Baris lanjutan uraian (terpotong ke baris berikutnya) ---
    if (!POLA_TANGGAL_AWAL.test(teks)) {
      if (terakhir && !POLA_HEADER_FOOTER.test(teks) && !/^\d+$/.test(teks)) {
        terakhir.uraian = `${terakhir.uraian} ${teks}`.trim()
      }
      continue
    }

    const tanggal = parseTanggal(teks)
    if (!tanggal) continue

    const token = teks.replace(POLA_TANGGAL_AWAL, '').trim().split(/\s+/).filter(Boolean)

    // --- Ambil maksimal 3 angka dari belakang: penerimaan, pengeluaran, saldo ---
    // (dibatasi 3 supaya angka di dalam uraian, mis. "Tahap 1 2025", tidak ikut terambil)
    let angka = []
    while (token.length && angka.length < 3 && POLA_ANGKA.test(token[token.length - 1])) {
      const raw = token.pop()
      angka.unshift({ raw, val: parseAngka(raw) })
    }

    // Cek konsistensi saldo bila 3 angka: kalau tidak cocok, angka pertama
    // kemungkinan bagian dari uraian (bukan kolom penerimaan).
    if (angka.length === 3 && saldoSebelumnya !== null) {
      const [a, b, c] = angka.map((x) => x.val)
      const cocok3 = Math.abs(saldoSebelumnya + a - b - c) <= 1
      const cocok2 =
        Math.abs(saldoSebelumnya + b - c) <= 1 || Math.abs(saldoSebelumnya - b - c) <= 1
      if (!cocok3 && cocok2) {
        token.push(angka.shift().raw)
      }
    }

    // --- No. bukti: token pertama yang berbentuk kode (huruf+angka) ---
    let no_bukti = ''
    if (token.length > 1 && POLA_NO_BUKTI.test(token[0])) {
      no_bukti = token.shift()
    }
    const uraian = token.join(' ')

    // --- Tentukan penerimaan / pengeluaran / saldo ---
    const nilai = angka.map((x) => x.val || 0)
    let penerimaan = 0
    let pengeluaran = 0
    let saldoDok = null

    if (nilai.length === 3) {
      penerimaan = nilai[0]
      pengeluaran = nilai[1]
      saldoDok = nilai[2]
    } else if (nilai.length === 2) {
      const [jumlah, saldo] = nilai
      if (saldoSebelumnya !== null) {
        if (saldo - saldoSebelumnya >= 0) penerimaan = jumlah
        else pengeluaran = jumlah
      } else if (/terima|setoran|bosp?|saldo awal|bunga/i.test(uraian)) {
        penerimaan = jumlah
      } else {
        pengeluaran = jumlah
      }
      saldoDok = saldo
    } else if (nilai.length === 1) {
      if (/terima|setoran|bosp?|saldo awal|bunga/i.test(uraian)) penerimaan = nilai[0]
      else pengeluaran = nilai[0]
    }

    if (saldoDok !== null) saldoSebelumnya = saldoDok
    else if (saldoSebelumnya !== null) saldoSebelumnya += penerimaan - pengeluaran

    terakhir = {
      tanggal,
      no_bukti,
      uraian,
      penerimaan,
      pengeluaran,
      // PENTING: pakai '' (bukan null) bila saldo tidak ada. normalizeRow di
      // BkuImportModal mengubah null menjadi 0 dan akan memicu peringatan palsu.
      saldo_dokumen: saldoDok === null ? '' : saldoDok,
    }
    hasil.push(terakhir)
  }

  return hasil
}
