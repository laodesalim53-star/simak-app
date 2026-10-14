/**
 * rkasParser.js — pembaca file RKAS (hasil konversi PDF ARKAS) untuk ArkasImportModal.
 *
 * Letakkan di: src/lib/rkasParser.js
 *
 * Export:
 *   KOLOM_ALOKASI                 daftar 12 kolom alok_{sumber}_{operasi|modal}
 *   adalahFormatTemplate(matriks) true kalau file berformat template (header tahun_anggaran, uraian, ...)
 *   templateKeObjek(matriks)      ubah matriks template menjadi array objek per baris
 *   parseRkasMentah(baris, tahunCadangan)
 *       -> { tahun, tahunTerdeteksi, belanja, penerimaan, peringatan }
 *
 * Parser membaca file mentah secara "longgar": letak kolom dicari lewat teks header
 * (Uraian, Jumlah, Reguler, Daerah, Afirmasi, Kinerja, SiLPA, Lainnya, Operasi, Modal),
 * sedangkan kode rekening/kegiatan dikenali dari polanya, bukan dari posisi kolom.
 */

const SUMBER = ['reguler', 'daerah', 'afirmasi', 'kinerja', 'silpa', 'lainnya']
const JENIS = ['operasi', 'modal']

export const KOLOM_ALOKASI = SUMBER.flatMap((s) => JENIS.map((j) => `alok_${s}_${j}`))

// 03.  03.01.  03.01.01.  06.05.08.  -> kode standar/program/kegiatan (1 sampai 3 kelompok dua digit)
const RE_KEGIATAN = /^\d{2}(\.\d{2}){0,2}\.$|^\d{2}\.\d{2}(\.\d{2})?$/
// 5.1.02.01.01.0024 -> kode rekening belanja
const RE_REKENING = /^\d\.\d\.\d{2}(\.\d{2,4})*\.?$/
const RE_TOTAL = /^(sub\s*)?(jumlah|total|grand\s*total)\b/i
const RE_PENUTUP = /^(mengetahui|menyetujui|disetujui oleh|pengesahan)\b/i
const RE_FOOTER = /^(halaman|page|hal\.)\s*\d+|dicetak|^\d+\s*(dari|of|\/)\s*\d+$/i

/* ------------------------------------------------------------------ */
/* Pembantu umum                                                       */
/* ------------------------------------------------------------------ */

function teks(v) {
  if (v === null || v === undefined) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}

/** Mengembalikan angka, atau null kalau sel bukan angka. Mengerti format 1.234.567,50 */
function angka(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = teks(v)
  if (!s) return null
  s = s.replace(/^rp\.?\s*/i, '').replace(/\s/g, '')
  let negatif = false
  if (/^\(.*\)$/.test(s)) {
    negatif = true
    s = s.slice(1, -1)
  }
  if (s.startsWith('-')) {
    negatif = true
    s = s.slice(1)
  }
  if (!/^\d[\d.,]*$/.test(s)) return null

  const titik = (s.match(/\./g) || []).length
  const koma = (s.match(/,/g) || []).length
  let bersih
  if (titik && koma) {
    // pemisah yang paling akhir dianggap desimal
    const desimalKoma = s.lastIndexOf(',') > s.lastIndexOf('.')
    bersih = desimalKoma ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (titik) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) bersih = s.replace(/\./g, '') // ribuan
    else if (titik === 1) bersih = s // desimal
    else return null // mis. kode 5.1.02 — bukan angka
  } else if (koma) {
    if (/^\d{1,3}(,\d{3})+$/.test(s) && !/,\d{1,2}$/.test(s)) bersih = s.replace(/,/g, '')
    else if (koma === 1) bersih = s.replace(',', '.')
    else return null
  } else {
    bersih = s
  }
  const n = parseFloat(bersih)
  if (!Number.isFinite(n)) return null
  return negatif ? -n : n
}

function cariSumber(t) {
  const s = t.toLowerCase()
  if (/reguler/.test(s)) return 'reguler'
  if (/daerah/.test(s)) return 'daerah'
  if (/afirmasi/.test(s)) return 'afirmasi'
  if (/kinerja/.test(s)) return 'kinerja'
  if (/silpa|sisa lebih/.test(s)) return 'silpa'
  if (/lainnya|lain-lain|\blain\b/.test(s)) return 'lainnya'
  return ''
}

function cariJenis(t) {
  const s = t.toLowerCase()
  if (/operasi/.test(s)) return 'operasi'
  if (/modal/.test(s)) return 'modal'
  return ''
}

function adalahKode(t) {
  return RE_KEGIATAN.test(t) || RE_REKENING.test(t)
}

/* ------------------------------------------------------------------ */
/* Format template                                                     */
/* ------------------------------------------------------------------ */

function barisHeaderTemplate(matriks) {
  const batas = Math.min(matriks.length, 10)
  for (let i = 0; i < batas; i++) {
    const sel = (matriks[i] || []).map((c) => teks(c).replace(/^\uFEFF/, '').toLowerCase())
    if (sel.includes('tahun_anggaran') && sel.includes('uraian')) return i
  }
  return -1
}

export function adalahFormatTemplate(matriks) {
  if (!Array.isArray(matriks)) return false
  return barisHeaderTemplate(matriks) >= 0
}

export function templateKeObjek(matriks) {
  const h = barisHeaderTemplate(matriks)
  if (h < 0) return []
  const header = matriks[h].map((c) => teks(c).replace(/^\uFEFF/, '').toLowerCase())
  const hasil = []
  for (let i = h + 1; i < matriks.length; i++) {
    const r = matriks[i] || []
    if (!r.some((c) => teks(c) !== '')) continue
    const obj = {}
    header.forEach((nama, idx) => {
      if (nama) obj[nama] = r[idx] ?? ''
    })
    hasil.push(obj)
  }
  return hasil
}

/* ------------------------------------------------------------------ */
/* Format RKAS mentah                                                  */
/* ------------------------------------------------------------------ */

function deteksiTahun(rows) {
  const atas = rows
    .slice(0, 60)
    .map((r) => r.map(teks).filter(Boolean).join(' '))
    .join('\n')
  const pola = [
    /tahun\s*anggaran\s*[:\-]?\s*(20\d{2})/i,
    /(?:rkas|arkas|rencana kegiatan dan anggaran)[^0-9\n]{0,60}(20\d{2})/i,
    /tahun\s*[:\-]\s*(20\d{2})/i,
  ]
  for (const p of pola) {
    const m = atas.match(p)
    if (m) return m[1]
  }
  return ''
}

function barisKeyword(sel) {
  return sel.some((t) => t && (cariSumber(t) || cariJenis(t)))
}

/** 'sub' = baris lanjutan header, 'nomor' = baris nomor kolom (1 2 3 ...), 'data' = bukan header */
function jenisBarisHeader(sel) {
  const isi = sel.filter(Boolean)
  if (!isi.length) return 'kosong'
  if (isi.some(adalahKode)) return 'data'
  if (isi.every((t) => /^\(?\d{1,2}\)?$/.test(t))) return 'nomor'
  if (barisKeyword(sel) && !isi.some((t) => angka(t) !== null)) return 'sub'
  return 'data'
}

function adalahHeaderBelanja(sel) {
  const g = sel.filter(Boolean).join(' ').toLowerCase()
  return g.includes('uraian') && (g.includes('rekening') || g.includes('kegiatan'))
}

function adalahHeaderPenerimaan(sel) {
  const g = sel.filter(Boolean).join(' ').toLowerCase()
  return g.includes('uraian') && g.includes('jumlah') && !g.includes('rekening') && !g.includes('kegiatan')
}

function bangunPeta(rows, i, peringatan) {
  const blok = []
  let akhir = i

  // baris label sumber dana kadang berada tepat di atas baris header
  if (i > 0) {
    const sebelum = rows[i - 1].map(teks)
    if (jenisBarisHeader(sebelum) === 'sub') blok.push(sebelum)
  }
  blok.push(rows[i].map(teks))
  for (let k = i + 1; k <= i + 3 && k < rows.length; k++) {
    const sel = rows[k].map(teks)
    const j = jenisBarisHeader(sel)
    if (j === 'sub' || j === 'nomor') {
      if (j === 'sub') blok.push(sel)
      akhir = k
    } else if (j === 'kosong') {
      akhir = k
    } else break
  }

  const lebar = Math.max(...blok.map((r) => r.length))

  // teks tiap kolom + sumber dana (label gabungan sel dipropagasi ke kanan)
  const sendiri = Array.from({ length: lebar }, (_, c) =>
    blok.map((r) => r[c] || '').join(' ').toLowerCase().trim()
  )
  const sumberKolom = new Array(lebar).fill('')
  for (const r of blok) {
    let cur = ''
    for (let c = 0; c < lebar; c++) {
      const t = r[c] || ''
      let s = ''
      if (t) {
        s = cariSumber(t)
        cur = s
      } else {
        s = cur
      }
      if (s && !sumberKolom[c]) sumberKolom[c] = s
    }
  }

  const uraian = sendiri.findIndex((t) => t.includes('uraian'))
  let jumlah = sendiri.findIndex((t, c) => /jumlah|total/.test(t) && !sumberKolom[c] && c !== uraian)
  if (jumlah < 0) jumlah = sendiri.findIndex((t, c) => /jumlah|total/.test(t) && c !== uraian)

  const kandidat = []
  for (let c = 0; c < lebar; c++) {
    if (c === uraian || c === jumlah) continue
    const sumber = sumberKolom[c]
    if (!sumber) continue
    const jenis = cariJenis(sendiri[c])
    const subtotal = /jumlah|total/.test(sendiri[c]) && !jenis
    if (subtotal) continue
    kandidat.push({ c, sumber, jenis })
  }

  const adaPemisahan = kandidat.some((k) => k.jenis)
  const alokasi = []
  if (adaPemisahan) {
    kandidat.filter((k) => k.jenis).forEach((k) => alokasi.push({ c: k.c, key: `alok_${k.sumber}_${k.jenis}` }))
  } else if (kandidat.length) {
    kandidat.forEach((k) => alokasi.push({ c: k.c, key: `alok_${k.sumber}_operasi` }))
    peringatan.add('Kolom Belanja Operasi/Modal tidak terbaca terpisah; seluruh alokasi dianggap Belanja Operasi.')
  }
  if (!alokasi.length) {
    peringatan.add('Kolom sumber dana (Reguler/Daerah/Afirmasi/Kinerja/SiLPA/Lainnya) tidak ditemukan di header; alokasi per sumber dana akan bernilai 0.')
  }

  return { peta: { uraian, jumlah, alokasi }, akhir }
}

function ambilUraian(sel, peta) {
  if (peta.uraian >= 0 && sel[peta.uraian] && !adalahKode(sel[peta.uraian]) && angka(sel[peta.uraian]) === null) {
    return sel[peta.uraian]
  }
  // cadangan: sel teks terpanjang yang bukan kode dan bukan angka
  let terbaik = ''
  for (const t of sel) {
    if (!t || adalahKode(t) || angka(t) !== null) continue
    if (/[A-Za-z]/.test(t) && t.length > terbaik.length) terbaik = t
  }
  return terbaik
}

function parsePenerimaan(sel, indeks) {
  // uraian = sel pertama yang berisi huruf dan bukan kode
  const idxUraian = sel.findIndex((t) => t && /[A-Za-z]/.test(t) && !adalahKode(t))
  if (idxUraian < 0) return null
  const uraian = sel[idxUraian]
  if (RE_TOTAL.test(uraian)) return null

  // jumlah = sel angka terakhir setelah uraian
  let jumlah = null
  let tanda = null
  for (let c = sel.length - 1; c > idxUraian; c--) {
    if (sel[c] === '+' || sel[c] === '-') tanda = sel[c]
    const a = angka(sel[c])
    if (a !== null && jumlah === null) jumlah = a
  }
  if (jumlah === null) return null

  // kode = sel sebelum uraian yang berpola angka bertitik (mis. 4.3.1.01)
  let kode = ''
  for (let c = 0; c < idxUraian; c++) {
    if (/^\d+(\.\d+)*\.?$/.test(sel[c]) && sel[c].includes('.')) {
      kode = sel[c]
      break
    }
  }
  if (!kode) {
    for (let c = 0; c < idxUraian; c++) {
      if (/^\d+\.?$/.test(sel[c])) {
        kode = sel[c].replace(/\.$/, '')
        break
      }
    }
  }
  return { kode: kode || `P${indeks}`, uraian, tanda, jumlah, adaKode: !!kode }
}

export function parseRkasMentah(baris, tahunCadangan = '') {
  const rows = (baris || []).filter(Array.isArray)
  const peringatan = new Set()

  const tahunFile = deteksiTahun(rows)
  const tahunTerdeteksi = !!tahunFile
  const cad = String(tahunCadangan || '').trim()
  const tahun = tahunFile || (/^\d{4}$/.test(cad) ? cad : '')

  const penerimaan = []
  const mentah = [] // baris belanja sebelum ditentukan header/item
  let peta = null
  let state = 'awal'
  let ctx = { keg: '', rek: '' }
  let gabungLanjutan = 0
  let tanpaAlokasi = 0
  let tidakCocok = 0
  let tanpaKode = 0
  const contohTanpaAlokasi = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const sel = r.map(teks)
    const isi = sel.filter(Boolean)
    if (!isi.length) continue
    const gabung = isi.join(' ').toLowerCase()

    if (state === 'belanja' && RE_PENUTUP.test(isi[0])) break

    // ----- header tabel belanja (juga muncul lagi di tiap halaman) -----
    if (adalahHeaderBelanja(sel)) {
      const { peta: petaBaru, akhir } = bangunPeta(rows, i, peringatan)
      if (!peta || petaBaru.alokasi.length >= peta.alokasi.length) peta = petaBaru
      state = 'belanja'
      i = akhir
      continue
    }

    // ----- penanda bagian Penerimaan -----
    if (
      state !== 'belanja' &&
      isi.length <= 3 &&
      /penerimaan/.test(gabung) &&
      !/jumlah|total/.test(gabung) &&
      !isi.some((t) => angka(t) !== null)
    ) {
      state = 'penerimaan'
      continue
    }

    // ----- header tabel penerimaan -----
    if (state !== 'belanja' && adalahHeaderPenerimaan(sel)) {
      state = 'penerimaan'
      continue
    }

    if (RE_FOOTER.test(isi[0])) continue

    // ----- isi bagian Penerimaan -----
    if (state === 'penerimaan') {
      const p = parsePenerimaan(sel, penerimaan.length + 1)
      if (p) penerimaan.push(p)
      continue
    }

    // ----- isi bagian Belanja -----
    if (state !== 'belanja' || !peta) continue

    const uraian = ambilUraian(sel, peta)
    let kodeKeg = ''
    let kodeRek = ''
    for (const t of sel) {
      if (RE_KEGIATAN.test(t)) kodeKeg = t
      else if (RE_REKENING.test(t)) kodeRek = t
    }

    const alok = Object.fromEntries(KOLOM_ALOKASI.map((k) => [k, 0]))
    let adaAlokasi = false
    for (const { c, key } of peta.alokasi) {
      const v = angka(r[c])
      if (v) {
        alok[key] += v
        adaAlokasi = true
      }
    }
    const jml = peta.jumlah >= 0 ? angka(r[peta.jumlah]) : null

    if (!uraian && !kodeKeg && !kodeRek) continue
    if (uraian && RE_TOTAL.test(uraian) && !kodeKeg && !kodeRek) continue

    // baris lanjutan: teks uraian yang terpotong ke baris berikutnya oleh konversi PDF
    if (!kodeKeg && !kodeRek && jml === null && !adaAlokasi && uraian && mentah.length) {
      mentah[mentah.length - 1].uraian += ' ' + uraian
      gabungLanjutan++
      continue
    }

    let tipe = 'anak'
    if (kodeRek) {
      tipe = 'rekening'
      ctx = { keg: kodeKeg || ctx.keg, rek: kodeRek }
    } else if (kodeKeg) {
      tipe = 'kegiatan'
      ctx = { keg: kodeKeg, rek: '' }
    }

    mentah.push({
      tipe,
      uraian,
      kode_kegiatan: kodeKeg || ctx.keg || null,
      kode_rekening: tipe === 'kegiatan' ? null : kodeRek || ctx.rek || null,
      jml,
      alok,
      adaAlokasi,
    })
  }

  if (!peta) {
    peringatan.add('Header tabel belanja (Kode Rekening / Kode Kegiatan / Uraian) tidak ditemukan di file.')
  }

  // ----- tentukan header vs item, lalu bentuk baris akhir -----
  const belanja = []
  mentah.forEach((m, idx) => {
    const berikut = mentah[idx + 1]
    const sebelum = mentah[idx - 1]
    // Di format ARKAS, baris induk rekening (mis. "Belanja Makanan dan Minuman Jamuan Tamu")
    // dan rincian di bawahnya (001., 002., ...) SAMA-SAMA membawa kode rekening + kode kegiatan.
    // Induk = baris pertama dari rangkaian >= 2 baris berurutan yang kodenya persis sama.
    const samaKode = (a, b) =>
      !!a && !!b && a.tipe === 'rekening' && b.tipe === 'rekening' &&
      a.kode_rekening === b.kode_rekening && a.kode_kegiatan === b.kode_kegiatan
    const header =
      m.tipe === 'kegiatan' ||
      (m.tipe === 'rekening' &&
        !samaKode(sebelum, m) &&
        (samaKode(m, berikut) || (berikut && berikut.tipe === 'anak')))
    const sumAlok = KOLOM_ALOKASI.reduce((a, k) => a + m.alok[k], 0)

    let jumlah = 0
    if (!header) {
      jumlah = m.jml !== null && m.jml !== 0 ? m.jml : sumAlok
      if (m.tipe !== 'kegiatan' && jumlah > 0 && sumAlok === 0 && peta && peta.alokasi.length) {
        tanpaAlokasi++
        if (contohTanpaAlokasi.length < 3) contohTanpaAlokasi.push(`no ${belanja.length + 1}: ${m.uraian.slice(0, 40)}`)
      }
      if (sumAlok > 0 && Math.abs(sumAlok - jumlah) > 1) tidakCocok++
      if (!m.kode_rekening) tanpaKode++
    }

    belanja.push({
      tahun_anggaran: tahun,
      no_urut: belanja.length + 1,
      level: header ? 1 : 3,
      kode_rekening: m.kode_rekening,
      kode_kegiatan: m.kode_kegiatan,
      uraian: m.uraian,
      jumlah,
      status: header ? 'header' : 'disetujui',
      is_item: !header,
      ...Object.fromEntries(KOLOM_ALOKASI.map((k) => [k, header ? 0 : m.alok[k]])),
    })
  })

  if (gabungLanjutan) peringatan.add(`${gabungLanjutan} baris uraian yang terpotong digabung ke baris di atasnya.`)
  if (tanpaAlokasi) peringatan.add(`${tanpaAlokasi} rincian punya jumlah tetapi alokasi sumber dananya kosong (mis. ${contohTanpaAlokasi.join('; ')}).`)
  if (tidakCocok) peringatan.add(`${tidakCocok} rincian punya jumlah yang tidak sama dengan total alokasi sumber dananya.`)
  if (tanpaKode) peringatan.add(`${tanpaKode} rincian tidak punya kode rekening.`)

  // ----- finalisasi penerimaan: kode wajib unik (dipakai upsert) -----
  const dipakai = new Map()
  const penerimaanAkhir = penerimaan.map((p) => {
    let kode = p.kode
    const n = (dipakai.get(kode) || 0) + 1
    dipakai.set(kode, n)
    if (n > 1) kode = `${kode}-${n}`
    return { kode, uraian: p.uraian, tanda: p.tanda, jumlah: p.jumlah }
  })
  if (penerimaan.some((p) => !p.adaKode)) {
    peringatan.add('Sebagian baris penerimaan tidak punya kode; diberi kode otomatis (P1, P2, ...).')
  }
  if (!tahunTerdeteksi && tahun) {
    peringatan.add(`Tahun anggaran tidak terbaca di file; memakai tahun ${tahun} dari filter halaman.`)
  }

  return {
    tahun,
    tahunTerdeteksi,
    belanja,
    penerimaan: penerimaanAkhir,
    peringatan: [...peringatan],
  }
}
