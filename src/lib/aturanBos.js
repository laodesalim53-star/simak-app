// src/lib/aturanBos.js
// Aturan batas belanja BOS Reguler untuk RKAS.
// Dasar: Permendikdasmen 8/2026 Pasal 42: ayat (2) buku, ayat (3) pemeliharaan, ayat (4) honor.
// Persentase dihitung dari keseluruhan alokasi (pagu) tahunan.
//
// Catatan penting:
// - Buku: batasnya MINIMAL 10%. Melebihi 10% tidak melanggar juknis.
//   Jika sekolah ingin membatasi sendiri, pakai `batasInternal.buku` (persen).
// - Pemeliharaan (maks 20%) dan honor (maks 20% negeri / 40% swasta) adalah batas atas.
// - Item dikelompokkan lewat kode kegiatan (XX.YY.ZZ). Komponen = 5 karakter pertama
//   (05.08 pemeliharaan, 07.12 pembayaran honor). Buku dikenali dari rekening 5.2.05.01.01.*
//   (Belanja Modal Buku). Item lama tanpa kode dicocokkan lewat nama komponen.

const angka = (v) => Number(v) || 0
const bersih = (v) => String(v ?? '').trim()

export const nilaiItem = (d = {}) => angka(d.jumlah) || angka(d.volume) * angka(d.harga)
export const rp = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID')
export const pc = (n) => `${String(Math.round(n * 100) / 100).replace(".", ",")}%`

export const kodeKomponen = (d = {}) => {
  const k = bersih(d.kode_kegiatan)
  if (/^\d{2}\.\d{2}/.test(k)) return k.slice(0, 5)
  const kk = bersih(d.kode_komponen)
  return /^\d{2}\.\d{2}$/.test(kk) ? kk : ''
}

const namaKomponen = (d = {}) => bersih(d.komponen).toLowerCase()

export const itemBuku = (d = {}) =>
  bersih(d.kode_rekening).startsWith('5.2.05.01.01') || d.buku === 'Ya'

export const ATURAN_BOS_REGULER = [
  {
    id: 'buku', nama: 'Pengadaan buku', tipe: 'min', persen: 10, pasal: 'Pasal 42 ayat (2)',
    cocok: (d) => itemBuku(d),
  },
  {
    id: 'pemeliharaan', nama: 'Pemeliharaan sarana dan prasarana', tipe: 'maks', persen: 20, pasal: 'Pasal 42 ayat (3)',
    cocok: (d) => kodeKomponen(d) === '05.08' || namaKomponen(d).startsWith('pemeliharaan sarana'),
  },
  {
    id: 'honor', nama: 'Pembayaran honor', tipe: 'maks', persen: ({ negeri }) => (negeri ? 20 : 40), pasal: 'Pasal 42 ayat (4)',
    cocok: (d) => kodeKomponen(d) === '07.12' || namaKomponen(d) === 'pembayaran honor',
  },
]

/**
 * items: [{ id, tanggal, created_at, data }]  (hanya item satu pagu: tahun + sumber dana sama)
 * pagu: pagu tahunan (angka)
 * Hasil: { ringkas: [...], catatan: Map(id -> [{ level: 'ok'|'warn'|'error', teks }]) }
 */
export function hitungAturan({ items, pagu, negeri = true, batasInternal = {} }) {
  const catatan = new Map()
  const ringkas = []
  if (!(pagu > 0)) return { ringkas, catatan }

  const tambah = (id, level, teks) => {
    if (!catatan.has(id)) catatan.set(id, [])
    catatan.get(id).push({ level, teks })
  }
  // Urutan input: tanggal lalu waktu dibuat. Item yang pertama kali melewati batas ditandai sebagai pemicu.
  const urut = [...items].sort((a, b) =>
    bersih(a.tanggal).localeCompare(bersih(b.tanggal)) || bersih(a.created_at).localeCompare(bersih(b.created_at)))

  for (const a of ATURAN_BOS_REGULER) {
    const persenBatas = typeof a.persen === 'function' ? a.persen({ negeri }) : a.persen
    const batas = (pagu * persenBatas) / 100
    const anggota = urut.filter((r) => a.cocok(r.data))
    const total = anggota.reduce((n, r) => n + nilaiItem(r.data), 0)
    const persen = (total / pagu) * 100
    const internalPersen = angka(batasInternal[a.id])
    const internalRp = internalPersen > 0 ? (pagu * internalPersen) / 100 : 0

    let status = 'ok'
    if (a.tipe === 'maks' && total > batas) status = 'lebih'
    if (a.tipe === 'min' && total < batas) status = 'kurang'
    const internalLewat = internalRp > 0 && total > internalRp

    ringkas.push({
      id: a.id, nama: a.nama, tipe: a.tipe, pasal: a.pasal, persenBatas, batas,
      total, persen, status, internalPersen, internalRp, internalLewat,
    })

    let kum = 0
    let pemicuBatas = false
    let pemicuInternal = false
    for (const r of anggota) {
      kum += nilaiItem(r.data)
      const kumPersen = (kum / pagu) * 100

      if (a.tipe === 'maks' && kum > batas) {
        if (!pemicuBatas) {
          pemicuBatas = true
          tambah(r.id, 'error',
            `Item ini membuat ${a.nama.toLowerCase()} melewati batas ${persenBatas}% (${rp(batas)}). ` +
            `Kumulatif ${rp(kum)} (${pc(kumPersen)}), lebih ${rp(kum - batas)}.`)
        } else {
          tambah(r.id, 'error',
            `Di atas batas ${a.nama.toLowerCase()} ${persenBatas}%. Kumulatif ${rp(kum)} (${pc(kumPersen)}).`)
        }
        continue
      }

      if (internalRp > 0 && kum > internalRp) {
        const awal = !pemicuInternal
        pemicuInternal = true
        tambah(r.id, 'warn',
          `${awal ? 'Item ini melewati' : 'Di atas'} batas internal sekolah untuk ${a.nama.toLowerCase()} ${pc(internalPersen)} (${rp(internalRp)}). ` +
          `Kumulatif ${rp(kum)} (${pc(kumPersen)}). Juknis sendiri hanya mensyaratkan minimal ${persenBatas}%.`)
        continue
      }

      if (a.tipe === 'maks') {
        tambah(r.id, 'ok', `${a.nama}: kumulatif ${pc(kumPersen)} dari maks ${persenBatas}%, masih dalam batas.`)
      } else if (total >= batas) {
        tambah(r.id, 'ok', `${a.nama}: total ${pc(persen)}, memenuhi minimal ${persenBatas}%.`)
      } else {
        tambah(r.id, 'warn', `${a.nama}: total baru ${pc(persen)}, kurang ${rp(batas - total)} dari minimal ${persenBatas}%.`)
      }
    }
  }
  return { ringkas, catatan }
}
