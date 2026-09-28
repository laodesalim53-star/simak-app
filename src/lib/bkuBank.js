// Utilitas BKU Bank (Buku Pembantu Bank, Formulir BOS-K5):
// mengurai teks rekening koran / cetakan buku tabungan menjadi baris
// Penerimaan/Pengeluaran/Saldo.

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

// Angka uang; tanda "-" yang menempel di belakang (15,000.00-) menandai debit
// seperti pada cetakan buku tabungan.
const RE_ANGKA = /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{1,2}(?!\d))(-)?/g
const RE_KODE = /^(TRX\d*|\d{3,5})(?=\s|$)/i
const RE_TANPA_TANGGAL = /^\s*(?:\d{1,3}\s+)?(TRX\d*|\d{4})\s+(.+)$/i
// Kode teller/referensi seperti SyBRT221P atau BM00730257 (campuran huruf+angka, min. 6 karakter)
const RE_REF = /^(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9]{6,}$/
const TAJUK = /halaman|page|saldo akhir|total|jumlah|periode|rekening|mutasi|nama|alamat|cabang|tanggal|keterangan|mata uang/i

// Arti kode transaksi pada cetakan bank (sesuai contoh formulir BOS-K5).
// Ubah di sini bila bank/sekolah Anda memakai kode atau sebutan lain.
export const KODE_URAIAN = {
  1051: 'Bunga Bank',
  5057: 'Pajak Bank',
  5058: 'Pajak Bank',
  5000: 'Tarik Tunai Dana BOS',
}

export function uraianDariKode(kode, arah) {
  const k = String(kode || '').toUpperCase()
  if (KODE_URAIAN[k]) return KODE_URAIAN[k]
  if (k === '5051') return arah === 'masuk' ? 'Bunga Bank' : 'Pajak Bank'
  if (/^TRX/.test(k)) return arah === 'masuk' ? 'Transfer Masuk Dana BOS' : 'Transfer Keluar'
  return ''
}

function arahDariKode(kode) {
  const k = String(kode || '').toUpperCase()
  if (k === '1051' || /^TRX/.test(k)) return 'masuk'
  if (k === '5057' || k === '5058' || k === '5000') return 'keluar'
  return null
}

function arahDariKata(u) {
  if (/masuk|bunga|setor|kredit|interest|terima/i.test(u)) return 'masuk'
  return 'keluar'
}

const bersihToken = (s) =>
  s.split(' ').filter((t) => t && t !== '-' && !RE_REF.test(t)).join(' ')

function cariTanggal(baris) {
  // Nomor urut di depan tanggal (mis. "02 26/08/2025") boleh ada.
  let m = baris.match(/^\s*(?:\d{1,3}\s+)?(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})(?!\d)/)
  let d, b, t
  if (m) {
    d = Number(m[1]); b = Number(m[2]); t = Number(m[3])
  } else {
    m = baris.match(/^\s*(?:\d{1,3}\s+)?(\d{1,2})[\s-]([A-Za-z]{3,9})[\s,-]*(\d{4})(?!\d)/)
    if (!m) return null
    d = Number(m[1]); b = BULAN_SINGKAT[m[2].slice(0, 3).toLowerCase()]; t = Number(m[3])
  }
  if (t < 100) t += 2000
  if (!b || b > 12 || d < 1 || d > 31) return null
  return { iso: `${t}-${pad(b)}-${pad(d)}`, sisa: baris.slice(m[0].length) }
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

// Kembalian: { baris, awal, dibuang, disisipkan, awalDihitung }
export function uraiTeks(teks, { semester = '2', tahun = new Date().getFullYear(), rapikan = true, filterPeriode = true } = {}) {
  const semua = []
  let sebelumnya = null
  let awalEksplisit = null
  let terakhir = null
  let disisipkan = 0

  for (const mentah of String(teks).split(/\r?\n/)) {
    const baris = mentah.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim()
    if (!baris) continue

    let tg = cariTanggal(baris)
    let tanpaTgl = false
    // Tanggal tertutup noda/lipatan tetapi kode + nominal masih terbaca:
    // pakai tanggal baris sebelumnya dan beri tanda periksa.
    if (!tg && terakhir) {
      const m = baris.match(RE_TANPA_TANGGAL)
      if (m && [...m[2].matchAll(RE_ANGKA)].length >= 2) {
        tg = { iso: terakhir.tgl, sisa: `${m[1]} ${m[2]}` }
        tanpaTgl = true
      }
    }
    if (!tg) {
      // Lanjutan uraian yang terpotong ke baris berikutnya
      if (terakhir && !TAJUK.test(baris) && !/\d{1,3}(?:[.,]\d{3})+/.test(baris)) {
        const bersih = bersihToken(baris)
        if (bersih.length >= 3 && bersih.length <= 60 && /[A-Za-z]{3}/.test(bersih)) {
          terakhir.uraian = `${terakhir.uraian} ${bersih}`.trim()
        }
      }
      continue
    }

    let rest = tg.sisa.replace(/\s+/g, ' ').trim()
    let kode = ''
    const km = rest.match(RE_KODE)
    if (km) {
      kode = km[1].toUpperCase()
      rest = rest.slice(km[0].length).trim()
    }

    const angka = [...rest.matchAll(RE_ANGKA)]
    if (!angka.length) continue
    const nilai = angka.map((a) => parseAngka(a[1]))
    const tandaKeluar = angka.some((a, i) => a[2] && (angka.length === 1 || i < angka.length - 1))

    let uraian = rest
    for (const a of angka) uraian = uraian.replace(a[0], ' ')
    uraian = bersihToken(
      uraian.replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, ' ').replace(/\s+/g, ' ').trim()
    )

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

    // Arah yang pasti: tanda minus di belakang angka, atau kode transaksi yang dikenal.
    let arah = tandaKeluar ? 'keluar' : arahDariKode(kode)
    const pasti = arah != null
    if (!arah) arah = arahDariKata(uraian)

    let periksa = tanpaTgl
    let dariSelisih = false

    if (saldoBank != null && sebelumnya != null) {
      const selisih = bulatkan(saldoBank - sebelumnya)
      const cocok = kandidat.find((k) => Math.abs(Math.abs(selisih) - k) < 0.5)
      if (cocok != null) {
        mut = cocok
        arah = selisih >= 0 ? 'masuk' : 'keluar'
        dariSelisih = true
      } else if (mut > 0) {
        // Selisih saldo tidak cocok dengan nominal baris ini: kemungkinan ada baris
        // sebelumnya yang tidak terbaca. Sisipkan baris pengganti agar saldo tetap nyambung.
        const bertanda = arah === 'masuk' ? mut : -mut
        const gap = bulatkan(selisih - bertanda)
        if (Math.abs(gap) > 0.5) {
          semua.push({
            id: idBaru(),
            tgl: terakhir ? terakhir.tgl : tg.iso,
            kode: '',
            bukti: '',
            uraian: '(baris tidak terbaca, dihitung dari selisih saldo)',
            masuk: gap > 0 ? gap : 0,
            keluar: gap < 0 ? -gap : 0,
            saldoBank: null,
            periksa: true,
            hilang: true,
          })
          disisipkan++
          sebelumnya = bulatkan(sebelumnya + gap)
          periksa = true
        }
      }
    }
    if (!pasti && !dariSelisih) periksa = true

    const row = {
      id: idBaru(),
      tgl: tg.iso,
      kode,
      bukti: '',
      uraian,
      masuk: arah === 'masuk' ? mut : 0,
      keluar: arah === 'keluar' ? mut : 0,
      saldoBank,
      periksa,
    }
    sebelumnya =
      saldoBank != null ? saldoBank : sebelumnya != null ? bulatkan(sebelumnya + row.masuk - row.keluar) : null
    semua.push(row)
    terakhir = row
  }

  // Uraian: rapikan bila ada teks, bila kosong isi dari arti kode transaksi.
  let baris = semua.map((r) => {
    if (r.hilang) return r
    let u = r.uraian
    if (u) {
      if (rapikan) u = rapikanUraian(u)
    } else {
      u = uraianDariKode(r.kode, r.masuk > 0 ? 'masuk' : 'keluar')
    }
    return { ...r, uraian: u }
  })

  let dibuang = 0
  if (filterPeriode) {
    const p = periodeSemester(semester, tahun)
    const sisa = baris.filter((r) => r.tgl >= p.awal && r.tgl <= p.akhir)
    dibuang = baris.length - sisa.length
    baris = sisa
  }

  let awal = awalEksplisit ?? 0
  const pertama = baris[0]
  let awalDihitung = false
  if (pertama && pertama.saldoBank != null) {
    awal = bulatkan(pertama.saldoBank - pertama.masuk + pertama.keluar)
    awalDihitung = awalEksplisit == null
  }

  return { baris, awal, dibuang, disisipkan, awalDihitung }
}
