/**
 * pdfKeMatriks.js — membaca PDF RKAS dari ARKAS langsung di browser dan mengubahnya
 * menjadi matriks (array of array) yang bisa dibaca parseRkasMentah() di rkasParser.js.
 *
 * Letakkan di: src/lib/pdfKeMatriks.js
 * Butuh paket:  npm install pdfjs-dist
 *
 * Export:
 *   pdfKeMatriks(file)        -> Promise<matriks>   (dipakai di ArkasImportModal)
 *   itemsKeMatriks(halaman)   -> matriks            (murni, tanpa pdf.js; untuk pengujian)
 *
 * Cara kerja:
 *   1. Teks tiap halaman dikelompokkan menjadi baris (berdasarkan posisi Y) lalu sel (berdasarkan jarak X).
 *   2. Kolom angka ditemukan dari tepi kanan angka yang sejajar (angka rata kanan).
 *   3. Header tabel belanja disusun ulang jadi baris header baku (Kode Kegiatan, Kode Rekening,
 *      Uraian, Jumlah + label sumber dana / operasi / modal) supaya cocok dengan rkasParser.
 *   4. Baris sebelum tabel belanja (judul, tahun anggaran, penerimaan) diteruskan apa adanya.
 */

// 03.  03.01.  03.01.01.  -> kode standar / program / kegiatan (1 sampai 3 kelompok dua digit)
const RE_KEGIATAN = /^\d{2}(\.\d{2}){0,2}\.$|^\d{2}\.\d{2}(\.\d{2})?$/
const RE_REKENING = /^\d\.\d\.\d{2}(\.\d{2,4})*\.?$/
const RE_ANGKA = /^-?\d{1,3}(\.\d{3})+(,\d+)?$|^0$/
const RE_SUMBER = /reguler|daerah|afirmasi|kinerja|silpa|sisa lebih|lainnya|lain-lain|\blain\b/i
const RE_JENIS = /operasi|modal/i
const RE_FOOTER = /^(halaman|page|hal\.)\s*\d+|dicetak|^\d+\s*(dari|of|\/)\s*\d+$|^kertas kerja\b/i

/* ------------------------------------------------------------------ */
/* Tahap 1: item pdf.js -> baris -> sel                                */
/* ------------------------------------------------------------------ */

function susunBaris(items) {
  const bersih = items
    .filter((it) => typeof it.str === 'string' && it.str.trim() !== '')
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width || 0,
      h: it.height || Math.abs(it.transform[3]) || 8,
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x)

  const baris = []
  for (const it of bersih) {
    const tol = Math.max(2, it.h * 0.5)
    const terakhir = baris[baris.length - 1]
    if (terakhir && Math.abs(terakhir.y - it.y) <= tol) {
      terakhir.items.push(it)
    } else {
      baris.push({ y: it.y, items: [it] })
    }
  }

  return baris.map((b) => {
    const urut = b.items.sort((p, q) => p.x - q.x)
    const sel = []
    for (const it of urut) {
      const prev = sel[sel.length - 1]
      const batas = Math.max(5, it.h * 0.9)
      // kolom No, kode kegiatan, dan kode rekening sering berdempetan dengan uraian:
      // sel-sel itu tidak boleh digabung dengan teks di sebelahnya.
      const kodeIni = /^(\d{2}(\.\d{2}){0,2}\.|\d{2}\.\d{2}(\.\d{2})?|\d\.\d\.\d{2}(\.\d{2,4})*\.?)$/.test(it.str.trim())
      const prevKode = prev && /^(\d{2}(\.\d{2}){0,2}\.|\d{2}\.\d{2}(\.\d{2})?|\d\.\d\.\d{2}(\.\d{2,4})*\.?)$/.test(prev.teks.trim())
      const prevNo = prev && sel.length === 1 && /^\d{1,3}$/.test(prev.teks.trim())
      // angka (kolom Jumlah / alokasi) juga tidak boleh digabung: dua angka yang berdekatan,
      // mis. "0" dan "11.162.600", jangan sampai menjadi satu sel "0 11.162.600".
      const angkaIni = RE_ANGKA.test(it.str.trim())
      const prevAngka = prev && RE_ANGKA.test(prev.teks.trim())
      if (prev && !kodeIni && !prevKode && !prevNo && !angkaIni && !prevAngka && it.x - prev.x1 <= batas) {
        const perluSpasi = it.x - prev.x1 > 1 && !prev.teks.endsWith(' ') && !it.str.startsWith(' ')
        prev.teks += (perluSpasi ? ' ' : '') + it.str
        prev.x1 = it.x + it.w
      } else {
        sel.push({ teks: it.str, x0: it.x, x1: it.x + it.w })
      }
    }
    sel.forEach((s) => {
      s.teks = s.teks.replace(/\s+/g, ' ').trim()
      s.cx = (s.x0 + s.x1) / 2
    })
    return pecahKodeDepan(sel.filter((s) => s.teks))
  })
}

const adalahKodeTeks = (t) => RE_KEGIATAN.test(t) || RE_REKENING.test(t)

/**
 * Kadang pdf.js menyatukan "No", kode rekening, kode kegiatan, dan uraian menjadi satu
 * potongan teks, mis. "4 5.1.02.01.01.0053 03.01.01. Belanja Makanan". Bagian depan
 * yang berupa nomor/kode dipisah lagi menjadi sel sendiri.
 */
function pecahKodeDepan(sel) {
  const hasil = []
  sel.forEach((s, idx) => {
    const token = s.teks.split(' ')
    let i = 0
    const depan = []
    if (idx === 0 && /^\d{1,3}$/.test(token[0]) && token.length > 1 && adalahKodeTeks(token[1])) {
      depan.push(token[0])
      i = 1
    }
    while (i < token.length - 1 && adalahKodeTeks(token[i])) {
      depan.push(token[i])
      i++
    }
    if (!depan.length) {
      hasil.push(s)
      return
    }
    depan.forEach((t) => hasil.push({ teks: t, x0: s.x0, x1: s.x0, cx: s.x0 }))
    hasil.push({ ...s, teks: token.slice(i).join(' ') })
  })
  return hasil
}

/* ------------------------------------------------------------------ */
/* Tahap 2: deteksi header & kolom                                     */
/* ------------------------------------------------------------------ */

const teksBaris = (b) => b.map((s) => s.teks).join(' ').toLowerCase()
const adaKode = (b) => b.some((s) => RE_KEGIATAN.test(s.teks) || RE_REKENING.test(s.teks))
const adaAngka = (b) => b.some((s) => RE_ANGKA.test(s.teks))
const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

function cariBlokHeader(baris) {
  const blok = []
  for (let i = 0; i < baris.length; i++) {
    const t = teksBaris(baris[i])
    if (!t.includes('uraian')) continue
    const sekitar = [i, i + 1, i + 2]
      .filter((k) => k < baris.length)
      .map((k) => teksBaris(baris[k]))
      .join(' ')
    if (!/rekening|kegiatan/.test(sekitar)) continue

    let s = i
    // baris label sumber dana di atas baris "Uraian"
    while (s > 0 && i - s < 2) {
      const p = baris[s - 1]
      const tp = teksBaris(p)
      if (!adaKode(p) && !adaAngka(p) && (RE_SUMBER.test(tp) || /sumber dana/.test(tp))) s--
      else break
    }
    let e = i
    while (e + 1 < baris.length && e - i < 6) {
      const n = baris[e + 1]
      if (adaKode(n) || adaAngka(n)) break
      e++
    }
    // abaikan jika bertabrakan dengan blok sebelumnya
    if (blok.length && s <= blok[blok.length - 1].e) continue
    blok.push({ s, e })
    i = e
  }
  return blok
}

function hitungAnchor(barisData) {
  const x1 = []
  for (const b of barisData) for (const s of b) if (RE_ANGKA.test(s.teks)) x1.push(s.x1)
  x1.sort((a, b) => a - b)
  const klaster = []
  for (const x of x1) {
    const k = klaster[klaster.length - 1]
    if (k && x - k.akhir <= 3) {
      k.nilai.push(x)
      k.akhir = x
    } else klaster.push({ nilai: [x], akhir: x })
  }
  const minimal = x1.length >= 6 ? 2 : 1
  return klaster
    .filter((k) => k.nilai.length >= minimal)
    .map((k) => k.nilai.reduce((a, b) => a + b, 0) / k.nilai.length)
}

/* ------------------------------------------------------------------ */
/* Tahap 3: susun matriks akhir                                        */
/* ------------------------------------------------------------------ */

export function itemsKeMatriks(halaman) {
  // halaman: array of array item pdf.js (satu array per halaman)
  const semua = [] // { sel, hal }
  halaman.forEach((items, h) => {
    susunBaris(items).forEach((sel) => semua.push({ sel, hal: h }))
  })
  const baris = semua.map((x) => x.sel)
  const mentah = () => baris.map((b) => b.map((s) => s.teks))

  const blok = cariBlokHeader(baris)
  if (!blok.length) return mentah()

  const blokPertama = blok[0]
  const idxData = []
  for (let i = blokPertama.e + 1; i < baris.length; i++) {
    if (!blok.some((b) => i >= b.s && i <= b.e)) idxData.push(i)
  }
  const anchor = hitungAnchor(idxData.map((i) => baris[i]))
  if (!anchor.length) return mentah()

  const jarak = anchor.length > 1 ? median(anchor.slice(1).map((a, i) => a - anchor[i])) : 80
  const lebar = 3 + anchor.length
  const batasKiri = anchor[0] - jarak

  const kolomHeader = (s) => {
    if (s.cx <= batasKiri) return -1
    if (s.x1 - s.x0 > jarak * 1.3) {
      for (let k = 0; k < anchor.length; k++) {
        const lo = k === 0 ? batasKiri : anchor[k - 1]
        if (s.x0 < anchor[k] && s.x1 > lo) return k
      }
    }
    for (let k = 0; k < anchor.length; k++) if (s.cx <= anchor[k]) return k
    return s.cx <= anchor[anchor.length - 1] + jarak / 2 ? anchor.length - 1 : -1
  }

  const kolomAngka = (s) => {
    let terbaik = 0
    for (let k = 1; k < anchor.length; k++) {
      if (Math.abs(anchor[k] - s.x1) < Math.abs(anchor[terbaik] - s.x1)) terbaik = k
    }
    return terbaik
  }

  // ----- bangun baris header baku dari blok pertama -----
  const barisHeader = []
  const label = Array.from({ length: anchor.length }, () => [])
  let kolomJumlah = -1
  const subRows = []
  for (let i = blokPertama.s; i <= blokPertama.e; i++) {
    const row = new Array(lebar).fill('')
    let ada = false
    for (const s of baris[i]) {
      const k = kolomHeader(s)
      if (k < 0) continue
      if (/^(jumlah|total)$/i.test(s.teks) && kolomJumlah < 0) {
        kolomJumlah = k
        continue
      }
      if (RE_SUMBER.test(s.teks) || RE_JENIS.test(s.teks)) {
        row[3 + k] = row[3 + k] ? row[3 + k] + ' ' + s.teks : s.teks
        label[k].push(s.teks)
        ada = true
      }
    }
    if (ada) subRows.push(row)
  }
  if (kolomJumlah < 0 && label[0].length === 0) kolomJumlah = 0

  const row0 = new Array(lebar).fill('')
  row0[0] = 'Kode Kegiatan'
  row0[1] = 'Kode Rekening'
  row0[2] = 'Uraian'
  if (kolomJumlah >= 0) row0[3 + kolomJumlah] = 'Jumlah'
  barisHeader.push(row0, ...subRows.slice(0, 3))

  // ----- halaman yang punya blok header: buang baris di atas header (judul berulang) -----
  const halamanBlok = new Map() // halaman -> indeks awal blok
  for (const b of blok) {
    const h = semua[b.s].hal
    if (!halamanBlok.has(h)) halamanBlok.set(h, b.s)
  }
  const halamanPertama = semua[blokPertama.s].hal

  // ----- emit -----
  const hasil = []
  for (let i = 0; i < baris.length; i++) {
    const b = baris[i]
    const hal = semua[i].hal
    const blokIni = blok.find((x) => i >= x.s && i <= x.e)

    if (blokIni) {
      if (i === blokIni.s) barisHeader.forEach((r) => hasil.push([...r]))
      continue
    }
    if (i < blokPertama.s) {
      hasil.push(b.map((s) => s.teks))
      continue
    }
    if (hal !== halamanPertama && halamanBlok.has(hal) && i < halamanBlok.get(hal)) continue
    if (RE_FOOTER.test(b[0].teks)) continue

    const row = new Array(lebar).fill('')
    const uraian = []
    // kolom "No" di paling kiri (angka 1-3 digit berdiri sendiri) dibuang
    const bTanpaNo = b.length > 1 && /^\d{1,3}$/.test(b[0].teks) ? b.slice(1) : b
    for (const s of bTanpaNo) {
      if (RE_KEGIATAN.test(s.teks)) row[0] = s.teks
      else if (RE_REKENING.test(s.teks)) row[1] = s.teks
      else if (RE_ANGKA.test(s.teks)) row[3 + kolomAngka(s)] = s.teks
      else if (/^\d{1,3}$/.test(s.teks) && anchor.some((a) => Math.abs(a - s.x1) <= 3)) {
        row[3 + kolomAngka(s)] = s.teks
      } else if (s.teks === '-' && anchor.some((a) => Math.abs(a - s.x1) <= 6)) {
        // tanda strip pada kolom angka dianggap kosong
      } else uraian.push(s.teks)
    }
    row[2] = uraian.join(' ')
    hasil.push(row)
  }
  return hasil
}

/* ------------------------------------------------------------------ */
/* Pembaca PDF (browser)                                               */
/* ------------------------------------------------------------------ */

export async function pdfKeMatriks(file) {
  const pdfjs = await import('pdfjs-dist')
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  }
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const halaman = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n)
    const isi = await page.getTextContent()
    halaman.push(isi.items)
  }
  const matriks = itemsKeMatriks(halaman)
  if (!matriks.length) {
    throw new Error('PDF tidak berisi teks yang bisa dibaca (kemungkinan hasil scan/gambar).')
  }
  return matriks
}
