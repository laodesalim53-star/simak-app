// Import & template Excel untuk Rincian Kegiatan (RKA / POA) Puskesmas.
//
// Format utama = format POA/RPD Puskesmas (contoh: "RPD 2026 Mei-Agustus.xlsx"):
//   - Judul & "BULAN MEI TAHUN ANGGARAN 2026" di baris atas, judul kolom di baris ~9
//   - Kolom: UPAYA KESEHATAN | KEGIATAN | TUJUAN | SASARAN | TARGET | PJ | URAIAN
//     (Jenis Belanja, Uraian, label satuan, 4 faktor pengali) | HARGA SATUAN | SUB TOTAL | JUMLAH
//   - Baris induk: Upaya Kesehatan (Komponen) -> Sub Komponen -> baris kegiatan
//     (kolom A berisi kode, mis. 2.3.1); baris di bawahnya yang kolom A/B-nya
//     kosong adalah belanja tambahan untuk kegiatan yang sama.
//   - Satu sheet = satu bulan.
//
// File ini TIDAK meng-import 'xlsx' sendiri; objek XLSX dikirim dari pemanggil.

export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// ------------------------------------------------------------
// Rumus volume (faktor pengali ala POA: Org x Hr x Desa x Keg)
// ------------------------------------------------------------
export const JUMLAH_KOEF = 4

export const koefKosong = () => Array.from({ length: JUMLAH_KOEF }, () => ({ jumlah: '', satuan: '' }))

// "3 Org x 1 Hr x 1 Desa x 1 Keg" -> [{jumlah:'3',satuan:'Org'}, ...]
export function parseRumus(teks) {
  const hasil = koefKosong()
  if (!teks) return hasil
  String(teks)
    .split(/\s*[xX×]\s*/)
    .slice(0, JUMLAH_KOEF)
    .forEach((bagian, i) => {
      const m = bagian.trim().match(/^([\d.,]+)\s*(.*)$/)
      if (m) hasil[i] = { jumlah: m[1].replace(',', '.'), satuan: m[2].trim() }
    })
  return hasil
}

// Hitung volume, satuan & teks rumus dari faktor pengali yang terisi.
export function hitungDariKoef(koef) {
  const terisi = koef.filter((k) => k.jumlah !== '' && Number(k.jumlah) > 0)
  if (terisi.length === 0) return null
  return {
    volume: terisi.reduce((acc, k) => acc * Number(k.jumlah), 1),
    satuan: terisi.map((k) => k.satuan).filter(Boolean).join('/'),
    rumus: terisi.map((k) => `${k.jumlah} ${k.satuan}`.trim()).join(' x '),
  }
}

// ------------------------------------------------------------
// Util kecil
// ------------------------------------------------------------
function teks(v) {
  return String(v ?? '')
    .replace(/^'+/, '') // apostrof pembuka (mis. "'-Biaya Langganan")
    .replace(/\s+/g, ' ')
    .trim()
}

function angka(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v ?? '').replace(/rp|\s/gi, '')
  if (!s) return 0
  const n = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)
    ? Number(s.replace(/\./g, '').replace(',', '.'))
    : Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function bulanDariTeks(t) {
  const q = String(t || '').trim().toLowerCase()
  if (!q) return ''
  const hit = NAMA_BULAN.find((b) => b.toLowerCase() === q)
    || (q.length >= 3 ? NAMA_BULAN.find((b) => b.toLowerCase().startsWith(q)) : undefined)
  return hit || ''
}

// ------------------------------------------------------------
// PARSER FORMAT POA (fungsi murni: menerima grid array-of-array)
// ------------------------------------------------------------
function cariHeaderPoa(grid) {
  for (let r = 0; r < Math.min(grid.length, 40); r++) {
    const cells = (grid[r] || []).map((c) => teks(c).toUpperCase())
    if (cells.includes('KEGIATAN') && (cells.includes('URAIAN') || cells.includes('SASARAN'))) {
      return { r, cells }
    }
  }
  return null
}

function cariPeriode(grid, namaSheet, tahunDefault) {
  for (let r = 0; r < Math.min(grid.length, 15); r++) {
    for (const c of grid[r] || []) {
      const m = String(c ?? '').match(/BULAN\s+([A-Za-z]+)\s+TAHUN\s+ANGGARAN\s+(\d{4})/i)
      if (m) return { bulan: bulanDariTeks(m[1]) || bulanDariTeks(namaSheet), tahun: Number(m[2]) }
    }
  }
  return { bulan: bulanDariTeks(namaSheet), tahun: tahunDefault }
}

// Baris komponen (Upaya Kesehatan) dibaca dari rumus baris "TOTAL",
// mis. =W43+W41+W24+W12 -> baris 43, 41, 24, 12 adalah komponen.
function cariBarisKomponen(grid, colUpaya, colJumlah, getFormula) {
  for (let r = 0; r < grid.length; r++) {
    if (teks((grid[r] || [])[colUpaya]).toUpperCase() !== 'TOTAL') continue
    const f = getFormula(r, colJumlah)
    if (!f || f.includes(':')) return null
    const refs = [...String(f).matchAll(/\$?[A-Z]{1,3}\$?(\d+)/g)].map((m) => Number(m[1]) - 1)
    return refs.length ? new Set(refs) : null
  }
  return null
}

// Cadangan bila rumus TOTAL tidak ada: induk yang langsung diikuti induk lain = komponen.
function tebakJenisHeader(grid, r, colUpaya, colKeg, sudahAdaKomponen) {
  for (let i = r + 1; i < grid.length; i++) {
    const a = teks((grid[i] || [])[colUpaya])
    const b = teks((grid[i] || [])[colKeg])
    if (!a && !b) continue
    const header = a && !/^\d/.test(a) && !b
    if (header) return 'komponen'
    return sudahAdaKomponen ? 'sub' : 'komponen'
  }
  return 'sub'
}

/**
 * @param grid        array of array (indeks baris 0 = baris 1 Excel)
 * @param getFormula  (r, c) => string rumus sel (tanpa '=') atau undefined
 * @returns baris hasil parsing, atau [] bila bukan format POA
 */
export function parsePoaGrid(grid, getFormula, { namaSheet = '', tahunDefault = new Date().getFullYear() } = {}) {
  const head = cariHeaderPoa(grid)
  if (!head) return []
  const { cells } = head
  const idx = (...names) => {
    for (const n of names) {
      const i = cells.indexOf(n)
      if (i >= 0) return i
    }
    return -1
  }

  const colUpaya = idx('UPAYA KESEHATAN', 'KOMPONEN')
  const colKeg = idx('KEGIATAN')
  const colTujuan = idx('TUJUAN')
  const colSasaran = idx('SASARAN')
  const colTarget = idx('TARGET')
  const colPj = idx('PJ', 'PENANGGUNG JAWAB')
  const colUraian = idx('URAIAN')
  const colHarga = idx('HARGA SATUAN', 'HARGA')
  const colJumlah = idx('JUMLAH')
  if (colUpaya < 0 || colKeg < 0 || colUraian < 0 || colHarga < 0) return []

  // Posisi kolom relatif terhadap "URAIAN": jenis, uraian, label, lalu 4 pasang (jumlah, satuan)
  const pasangan = [3, 6, 9, 12].map((o) => [colUraian + o, colUraian + o + 1])
  const colLabel = colUraian + 2

  const periode = cariPeriode(grid, namaSheet, tahunDefault)
  const komponenSet = cariBarisKomponen(grid, colUpaya, colJumlah >= 0 ? colJumlah : colHarga + 2, getFormula)

  let komponen = ''
  let sub = ''
  let keg = null
  const hasil = []

  for (let r = head.r + 1; r < grid.length; r++) {
    const row = grid[r] || []
    const a = teks(row[colUpaya]).replace(/\.{2,}/g, '.') // "3..8.2" -> "3.8.2"
    const b = teks(row[colKeg])
    const upper = a.toUpperCase()

    if (upper === 'TOTAL') break
    if (upper.startsWith('TOTAL ')) continue

    // Baris induk: ada teks di kolom Upaya Kesehatan, bukan kode, tanpa nama kegiatan
    if (a && !/^\d/.test(a) && !b) {
      const jenis = komponenSet
        ? (komponenSet.has(r) ? 'komponen' : 'sub')
        : tebakJenisHeader(grid, r, colUpaya, colKeg, komponen !== '')
      if (jenis === 'komponen') {
        komponen = a
        sub = ''
      } else {
        sub = a
      }
      keg = null
      continue
    }

    // Baris kegiatan baru (ada kode / nama kegiatan)
    if (a || b) {
      keg = {
        kode: a,
        nama: b,
        tujuan: teks(row[colTujuan]),
        sasaran: teks(row[colSasaran]),
        target: teks(row[colTarget]),
        pj: teks(row[colPj]),
      }
    } else if (keg) {
      // Baris lanjutan: lengkapi bila ada nilai yang hanya muncul di baris ini
      if (!keg.tujuan) keg.tujuan = teks(row[colTujuan])
      if (!keg.sasaran) keg.sasaran = teks(row[colSasaran])
      if (!keg.target) keg.target = teks(row[colTarget])
      if (!keg.pj) keg.pj = teks(row[colPj])
    }

    // Data belanja pada baris ini
    const jenisBelanja = teks(row[colUraian])
    const uraianBelanja = teks(row[colUraian + 1])
    const label = teks(row[colLabel])
    const koef = pasangan.map(([cj, cs]) => {
      const raw = row[cj]
      return {
        jumlah: raw === '' || raw == null ? '' : String(angka(raw)),
        satuan: teks(row[cs]),
      }
    })
    const dariKoef = hitungDariKoef(koef)
    const volume = dariKoef ? dariKoef.volume : 0
    const harga = angka(row[colHarga])

    if (!jenisBelanja && !uraianBelanja && !dariKoef && !harga) continue // baris kosong / pemisah
    if (!keg) continue // belanja tanpa kegiatan induk

    hasil.push({
      _sheet: namaSheet,
      _baris: r + 1,
      _keg: keg,
      tahun_anggaran: periode.tahun,
      komponen,
      sub_komponen: sub,
      jenis_belanja: jenisBelanja,
      uraian_belanja: uraianBelanja,
      rumus_volume: dariKoef ? dariKoef.rumus : '',
      volume,
      satuan: (dariKoef && dariKoef.satuan) || label,
      harga_satuan: harga,
      jumlah_anggaran: volume * harga,
      kode_rekening: '',
      bulan_pelaksanaan: periode.bulan,
      keterangan: '',
    })
  }

  // Sebarkan data kegiatan (yang bisa saja baru lengkap di baris lanjutan) ke semua baris belanjanya
  return hasil.map(({ _keg, ...r }) => ({
    ...r,
    kode_kegiatan: _keg.kode,
    rincian_kegiatan: _keg.nama,
    tujuan: _keg.tujuan,
    sasaran: _keg.sasaran,
    target: _keg.target,
    penanggung_jawab: _keg.pj,
    _valid: r.komponen !== '' && _keg.nama !== '' && r.volume > 0,
  }))
}

// Pembungkus untuk sheet SheetJS
export function parsePoaSheet(XLSX, sheet, namaSheet, tahunDefault) {
  if (!sheet || !sheet['!ref']) return []
  const ref = XLSX.utils.decode_range(sheet['!ref'])
  // Sheet POA sering punya "!ref" sampai kolom XER; batasi ke kolom A..Z
  const range = { s: { r: 0, c: 0 }, e: { r: ref.e.r, c: Math.min(ref.e.c, 25) } }
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, range })
  const getFormula = (r, c) => sheet[XLSX.utils.encode_cell({ r, c })]?.f
  return parsePoaGrid(grid, getFormula, { namaSheet, tahunDefault })
}

// ------------------------------------------------------------
// PARSER FORMAT DATAR LAMA (satu baris judul di baris 1) — cadangan
// ------------------------------------------------------------
function ambilKolom(row, ...kemungkinanNama) {
  for (const key of Object.keys(row)) {
    const bersih = key.toString().trim().toLowerCase()
    if (kemungkinanNama.some((n) => bersih === n.toLowerCase())) return row[key]
  }
  return ''
}

export function parseFlatSheet(XLSX, sheet, tahunDefault) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  return rows
    .map((row, i) => {
      const rumus = String(ambilKolom(row, 'Rumus Volume', 'Rumus', 'Koefisien') || '').trim()
      const dariRumus = hitungDariKoef(parseRumus(rumus))
      const volume = Number(ambilKolom(row, 'Volume', 'Vol')) || (dariRumus ? dariRumus.volume : 0)
      const hargaSatuan = Number(ambilKolom(row, 'Harga Satuan', 'Harga')) || 0
      const komponen = String(ambilKolom(row, 'Komponen', 'Upaya Kesehatan') || '').trim()
      const rincianKegiatan = String(ambilKolom(row, 'Rincian Kegiatan', 'Kegiatan') || '').trim()
      return {
        _sheet: '',
        _baris: i + 2,
        tahun_anggaran: Number(ambilKolom(row, 'Tahun Anggaran', 'Tahun')) || tahunDefault,
        kode_kegiatan: String(ambilKolom(row, 'Kode Kegiatan', 'Kode', 'No') || '').trim(),
        komponen,
        sub_komponen: String(ambilKolom(row, 'Sub Komponen') || '').trim(),
        rincian_kegiatan: rincianKegiatan,
        tujuan: String(ambilKolom(row, 'Tujuan') || '').trim(),
        sasaran: String(ambilKolom(row, 'Sasaran') || '').trim(),
        target: String(ambilKolom(row, 'Target') || '').trim(),
        penanggung_jawab: String(ambilKolom(row, 'PJ', 'Penanggung Jawab') || '').trim(),
        jenis_belanja: String(ambilKolom(row, 'Jenis Belanja') || '').trim(),
        uraian_belanja: String(ambilKolom(row, 'Uraian Belanja', 'Uraian') || '').trim(),
        rumus_volume: dariRumus ? dariRumus.rumus : '',
        volume,
        satuan: String(ambilKolom(row, 'Satuan') || '').trim() || (dariRumus ? dariRumus.satuan : ''),
        harga_satuan: hargaSatuan,
        jumlah_anggaran: volume * hargaSatuan,
        kode_rekening: String(ambilKolom(row, 'Kode Rekening', 'Kode Akun') || '').trim(),
        bulan_pelaksanaan: String(ambilKolom(row, 'Bulan Pelaksanaan', 'Bulan') || '').trim(),
        keterangan: String(ambilKolom(row, 'Keterangan') || '').trim(),
        _valid: komponen !== '' && rincianKegiatan !== '' && volume > 0,
      }
    })
    .filter((r) => r.komponen !== '' || r.rincian_kegiatan !== '' || r.volume > 0 || r.harga_satuan > 0)
}

// ------------------------------------------------------------
// TEMPLATE EXCEL FORMAT POA
// ------------------------------------------------------------
const CONTOH_POA = [
  {
    komponen: 'Peningkatan Layanan Kesehatan Sesuai Siklus Hidup',
    subs: [
      {
        nama: 'Pelaksanaan Kelas ibu Hamil dan Kelas Ibu Balita',
        kegiatan: [
          {
            kode: '2.3.1',
            nama: 'Pelaksanaan Kelas ibu Hamil',
            tujuan: 'Meningkatkan persiapan ibu hamil agar melahirkan dengan aman dan selamat',
            sasaran: 'Masyarakat',
            target: 'Ibu Hamil',
            pj: 'Bidan',
            belanja: [
              { jenis: 'Belanja Perjalanan Dinas Dalam Daerah', uraian: '- Transport Lokal', label: 'Org/Hr/Desa/Keg', koef: [[3, 'Org'], [1, 'Hr'], [1, 'Desa'], [1, 'Keg']], harga: 70000 },
              { jenis: 'Belanja Makan', uraian: 'Snack', label: 'Dos/Hr/Desa/Keg', koef: [[8, 'Dos'], [1, 'Hr'], [1, 'Desa'], [1, 'Keg']], harga: 24000 },
            ],
          },
          {
            kode: '2.3.2',
            nama: 'Pelaksanaan Kelas Ibu Balita',
            tujuan: 'Meningkatkan pengetahuan, sikap, dan perilaku ibu balita',
            sasaran: 'Masyarakat',
            target: 'Ibu Balita',
            pj: 'Gizi',
            belanja: [
              { jenis: 'Belanja Perjalanan Dinas Dalam Daerah', uraian: '- Transport Lokal', label: 'Org/Hr/Desa/Keg', koef: [[3, 'Org'], [1, 'Hr'], [1, 'Desa'], [1, 'Keg']], harga: 70000 },
              { jenis: 'Belanja Makan', uraian: 'Snack', label: 'Dos/Hr/Desa/Keg', koef: [[8, 'Dos'], [1, 'Hr'], [1, 'Desa'], [1, 'Keg']], harga: 24000 },
            ],
          },
        ],
      },
    ],
  },
  {
    komponen: 'MANAJEMEN PUSKESMAS',
    subs: [
      {
        nama: 'Langganan SIMPUS dan Dukungan Internet',
        kegiatan: [
          {
            kode: '5.2.1',
            nama: 'Langganan SIMPUS',
            tujuan: '',
            sasaran: 'Staf Puskesmas',
            target: 'Staf Puskesmas',
            pj: 'Kapus',
            belanja: [
              { jenis: '', uraian: '- Biaya Langganan', label: 'Paket', koef: [null, null, [1, 'Paket'], [1, 'Bln']], harga: 500000 },
            ],
          },
        ],
      },
    ],
  },
]

export function buatSheetPoa(XLSX, namaBulan, tahun) {
  const L = 23 // kolom A..W
  const g = []
  const merges = []
  const rumus = []
  const baris = () => Array(L).fill(null)
  const nomor = (r) => r + 1
  const merge = (r1, c1, r2, c2) => merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })

  g.push(baris()) // baris 1 kosong
  const judul = [
    'PEMERINTAH KABUPATEN ....................',
    'DINAS KESEHATAN',
    'PUSKESMAS ....................',
    'Alamat puskesmas ....................',
    'PLANING OF ACTION (POA) PUSKESMAS ....................',
    `BULAN ${namaBulan.toUpperCase()} TAHUN ANGGARAN ${tahun}`,
  ]
  judul.forEach((t) => {
    const a = baris()
    a[0] = t
    g.push(a)
  })
  g.push(baris()) // baris 8 kosong

  // Judul kolom (baris 9-10)
  const h = baris()
  ;['UPAYA KESEHATAN', 'KEGIATAN', 'TUJUAN', 'SASARAN', 'TARGET', 'PJ'].forEach((t, i) => { h[i] = t })
  h[6] = 'URAIAN'
  h[20] = 'HARGA SATUAN'
  h[21] = 'SUB TOTAL'
  h[22] = 'JUMLAH'
  g.push(h)
  g.push(baris())
  for (let c = 0; c <= 5; c++) merge(8, c, 9, c)
  merge(8, 6, 9, 19)
  merge(8, 20, 9, 20)
  merge(8, 21, 9, 21)
  merge(8, 22, 9, 22)

  // TOTAL PAGU (baris 11)
  const rPagu = g.length
  const aPagu = baris()
  aPagu[0] = 'TOTAL PAGU'
  g.push(aPagu)
  merge(rPagu, 0, rPagu, 21)

  const kolomPasangan = [[9, 10], [12, 13], [15, 16], [18, 19]]
  const barisKomponen = []
  let totalSemua = 0

  for (const kom of CONTOH_POA) {
    const rKom = g.length
    const ak = baris()
    ak[0] = kom.komponen
    g.push(ak)
    merge(rKom, 0, rKom, 7)
    barisKomponen.push(rKom)

    const subRows = []
    for (const sub of kom.subs) {
      const rSub = g.length
      const as = baris()
      as[0] = sub.nama
      g.push(as)
      merge(rSub, 0, rSub, 20)
      const awal = g.length
      let totalSub = 0

      for (const keg of sub.kegiatan) {
        const rAwalKeg = g.length
        keg.belanja.forEach((b, i) => {
          const r = g.length
          const a = baris()
          if (i === 0) {
            a[0] = keg.kode
            a[1] = keg.nama
            a[2] = keg.tujuan || null
            a[3] = keg.sasaran || null
            a[4] = keg.target || null
            a[5] = keg.pj || null
          }
          a[6] = b.jenis || null
          a[7] = b.uraian
          a[8] = b.label

          const dipakai = []
          let vol = 1
          b.koef.forEach((k, j) => {
            if (!k) return
            if (dipakai.length > 0) a[kolomPasangan[j][0] - 1] = 'X'
            a[kolomPasangan[j][0]] = k[0]
            a[kolomPasangan[j][1]] = k[1]
            dipakai.push(XLSX.utils.encode_col(kolomPasangan[j][0]) + nomor(r))
            vol *= k[0]
          })
          a[20] = b.harga
          const total = vol * b.harga
          g.push(a)
          rumus.push({ r, c: 21, f: [...dipakai, `U${nomor(r)}`].join('*'), v: total })
          rumus.push({ r, c: 22, f: `V${nomor(r)}`, v: total })
          totalSub += total
        })
        const n = keg.belanja.length
        if (n > 1) for (let c = 0; c <= 5; c++) merge(rAwalKeg, c, rAwalKeg + n - 1, c)
      }

      rumus.push({ r: rSub, c: 22, f: `SUM(W${nomor(awal)}:W${nomor(g.length - 1)})`, v: totalSub })
      subRows.push({ r: rSub, v: totalSub })
    }

    const totalKom = subRows.reduce((s, x) => s + x.v, 0)
    rumus.push({ r: rKom, c: 22, f: subRows.map((s) => `W${nomor(s.r)}`).join('+'), v: totalKom })
    totalSemua += totalKom
  }

  // Baris TOTAL: rumusnya menjadi petunjuk bagi importer untuk mengenali baris Upaya Kesehatan
  const rTotal = g.length
  const aTotal = baris()
  aTotal[0] = 'TOTAL'
  g.push(aTotal)
  merge(rTotal, 0, rTotal, 21)
  rumus.push({ r: rTotal, c: 22, f: barisKomponen.map((r) => `W${nomor(r)}`).join('+'), v: totalSemua })
  rumus.push({ r: rPagu, c: 22, f: `W${nomor(rTotal)}`, v: totalSemua })

  // Blok tanda tangan
  g.push(baris())
  g.push(baris())
  ;['Mengetahui', 'Plt. KEPALA PUSKESMAS ....................', null, null, null, null, 'Nama Kepala Puskesmas, gelar', 'NIP. ....................'].forEach((t) => {
    const a = baris()
    a[20] = t
    g.push(a)
  })

  const ws = XLSX.utils.aoa_to_sheet(g)
  rumus.forEach(({ r, c, f, v }) => {
    ws[XLSX.utils.encode_cell({ r, c })] = { t: 'n', v, f }
  })
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: g.length - 1, c: L - 1 } })
  ws['!merges'] = merges
  ws['!cols'] = [
    22, 34, 36, 14, 14, 10, 32, 22, 16, 5, 6, 3, 5, 6, 3, 5, 7, 3, 5, 6, 14, 14, 14,
  ].map((wch) => ({ wch }))
  return ws
}

export function buatWorkbookTemplatePoa(XLSX, tahun) {
  const namaBulan = NAMA_BULAN[new Date().getMonth()]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buatSheetPoa(XLSX, namaBulan, tahun), namaBulan)
  const petunjuk = XLSX.utils.aoa_to_sheet([
    ['PETUNJUK PENGISIAN'],
    ['1. Satu sheet = satu bulan. Beri nama sheet sesuai bulan (Mei, Juni, dst.) dan tulis "BULAN ... TAHUN ANGGARAN ..." di bagian atas.'],
    ['2. Baris Upaya Kesehatan (komponen) dan Sub Komponen diisi di kolom A, tanpa kode.'],
    ['3. Baris kegiatan diawali kode di kolom A (mis. 2.3.1) dan nama kegiatan di kolom B.'],
    ['4. Belanja tambahan untuk kegiatan yang sama ditulis di baris bawahnya dengan kolom A dan B dikosongkan.'],
    ['5. Kolom URAIAN terdiri dari Jenis Belanja, Uraian, label satuan, lalu hingga 4 faktor pengali (jumlah + satuan).'],
    ['6. Jangan hapus baris TOTAL: rumusnya dipakai untuk mengenali baris Upaya Kesehatan.'],
    ['7. Kode Rekening tidak ada di format POA; isi lewat tombol ubah setelah import.'],
  ])
  petunjuk['!cols'] = [{ wch: 120 }]
  XLSX.utils.book_append_sheet(wb, petunjuk, 'Petunjuk')
  return wb
}
