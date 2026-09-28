// Utilitas BKU Bank (Buku Pembantu Bank, Formulir BOS-K5):
// mengurai teks rekening koran menjadi baris Penerimaan/Pengeluaran/Saldo.

export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const BULAN_SINGKAT = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7,
  agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
}

const pad = (n) => String(n).padStart(2, '0')
const bulatkan = (n) => Math.round(n * 100) / 100

export function periodeSemester(semester, tahun) {
  const t = Number(tahun)
  return semester === '1'
    ? { teks: `Januari s.d Juni ${t}`, awal: `${t}-01-01`, akhir: `${t}-06-30`, tglSaldoAwal: `${t - 1}-12-31` }
    : { teks: `Juli s.d Desember ${t}`, awal: `${t}-07-01`, akhir: `${t}-12-31`, tglSaldoAwal: `${t}-06-30` }
}

export function fmtTgl(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

export function tanggalPanjang(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${Number(m[3])} ${NAMA_BULAN[Number(m[2]) - 1]} ${m[1]}` : ''
}

// gaya 'en' = 1,234.56 (seperti contoh formulir), 'id' = 1.234,56
export function formatAngka(n, gaya = 'en') {
  return Number(n || 0).toLocaleString(gaya === 'id' ? 'id-ID' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Angka berformat Indonesia (1.234.567,89) maupun Inggris (1,234,567.89).
export function parseAngka(s) {
  const t = String(s).replace(/\s/g, '')
  const iTitik = t.lastIndexOf('.')
  const iKoma = t.lastIndexOf(',')
  let desimal = null
  if (iTitik >= 0 && iKoma >= 0) desimal = iTitik > iKoma ? '.' : ','
  else {
    const sep = iTitik >= 0 ? '.' : iKoma >= 0 ? ',' : null
    if (sep) {
      const banyak = t.split(sep).length - 1
      const belakang = t.length - t.lastIndexOf(sep) - 1
      if (banyak === 1 && belakang !== 3) desimal = sep
    }
  }
  let bersih
  if (desimal) {
    const pisah = desimal === '.' ? ',' : '.'
    bersih = t.split(pisah).join('').replace(desimal, '.')
  } else bersih = t.replace(/[.,]/g, '')
  const n = Number(bersih)
  return Number.isFinite(n) ? n : 0
}

const RE_ANGKA = /\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{1,2}(?!\d)/g
const TAJUK = /halaman|page|saldo akhir|total|jumlah|periode|rekening|mutasi|nama|alamat|cabang|tanggal|keterangan|mata uang/i

function cariTanggal(baris) {
  let m = baris.match(/^\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})(?!\d)/)
  let d, b, t
  if (m) {
    d = Number(m[1]); b = Number(m[2]); t = Number(m[3])
  } else {
    m = baris.match(/^\s*(\d{1,2})[\s-]([A-Za-z]{3,9})[\s,-]*(\d{4})(?!\d)/)
    if (!m) return null
    d = Number(m[1]); b = BULAN_SINGKAT[m[2].slice(0, 3).toLowerCase()]; t = Number(m[3])
  }
  if (t < 100) t += 2000
  if (!b || b > 12 || d < 1 || d > 31) return null
  return { iso: `${t}-${pad(b)}-${pad(d)}`, sisa: baris.slice(m[0].length) }
}

function arahDariKata(u) {
  if (/masuk|bunga|setor|kredit|interest|terima/i.test(u)) return 'masuk'
  return 'keluar'
}

export function rapikanUraian(u) {
  const t = u.trim()
  if (/pajak|tax/i.test(t)) return 'Pajak Bank'
  if (/bunga|interest/i.test(t)) return 'Bunga Bank'
  if (/biaya admin|administrasi|\badm\b/i.test(t)) return 'Biaya Administrasi Bank'
  return t
}

let hitungId = 0
export const idBaru = () => `r${Date.now().toString(36)}${(hitungId++).toString(36)}`

// Kembalian: { baris, awal, dibuang, perluCek }
export function uraiTeks(teks, { semester = '2', tahun = new Date().getFullYear(), rapikan = true, filterPeriode = true } = {}) {
  const semua = []
  let sebelumnya = null
  let awalEksplisit = null
  let terakhir = null

  for (const mentah of String(teks).split(/\r?\n/)) {
    const baris = mentah.replace(/\s+/g, ' ').trim()
    if (!baris) continue
    const tg = cariTanggal(baris)
    if (!tg) {
      // Lanjutan uraian yang terpotong ke baris berikutnya
      if (terakhir && baris.length <= 60 && !TAJUK.test(baris) && !/\d{1,3}(?:[.,]\d{3})+/.test(baris)) {
        terakhir.uraian += ` ${baris}`
      }
      continue
    }
    const angka = [...tg.sisa.matchAll(RE_ANGKA)]
    if (!angka.length) continue
    const nilai = angka.map((a) => parseAngka(a[0]))
    let uraian = tg.sisa
    for (const a of angka) uraian = uraian.replace(a[0], ' ')
    uraian = uraian
      .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, ' ')
      .replace(/(^|\s)-(?=\s|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (/saldo awal|saldo sebelumnya|opening balance/i.test(uraian)) {
      awalEksplisit = nilai[nilai.length - 1]
      sebelumnya = awalEksplisit
      terakhir = null
      continue
    }

    let saldoBank = null
    let kandidat = nilai
    if (nilai.length >= 2) {
      saldoBank = nilai[nilai.length - 1]
      kandidat = nilai.slice(0, -1).filter((x) => x > 0)
    }
    let mut = kandidat[0] ?? 0
    let arah = null
    let periksa = false

    if (saldoBank != null && sebelumnya != null) {
      const selisih = bulatkan(saldoBank - sebelumnya)
      const cocok = kandidat.find((k) => Math.abs(Math.abs(selisih) - k) < 0.5)
      if (cocok != null) {
        mut = cocok
        arah = selisih >= 0 ? 'masuk' : 'keluar'
      }
    }
    if (!arah) {
      arah = arahDariKata(uraian)
      periksa = true
    }

    const row = {
      id: idBaru(),
      tgl: tg.iso,
      kode: '',
      bukti: '',
      uraian,
      masuk: arah === 'masuk' ? mut : 0,
      keluar: arah === 'keluar' ? mut : 0,
      saldoBank,
      periksa,
    }
    sebelumnya = saldoBank != null ? saldoBank : sebelumnya != null ? bulatkan(sebelumnya + row.masuk - row.keluar) : null
    semua.push(row)
    terakhir = row
  }

  let baris = semua.map((r) => ({ ...r, uraian: rapikan ? rapikanUraian(r.uraian) : r.uraian }))
  let dibuang = 0
  if (filterPeriode) {
    const p = periodeSemester(semester, tahun)
    const sisa = baris.filter((r) => r.tgl >= p.awal && r.tgl <= p.akhir)
    dibuang = baris.length - sisa.length
    baris = sisa
  }

  let awal = awalEksplisit ?? 0
  const pertama = baris[0]
  if (pertama && pertama.saldoBank != null) awal = bulatkan(pertama.saldoBank - pertama.masuk + pertama.keluar)

  return { baris, awal, dibuang }
}
