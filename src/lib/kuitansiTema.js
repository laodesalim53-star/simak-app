// Preferensi tampilan cetak Kuitansi / Kwitansi barang (warna & tata letak).
// Disimpan di localStorage browser (bukan di database) dan dipakai bersama
// oleh tab Kuitansi dan Kwitansi (Tanpa Watermark), termasuk saat Cetak Ulang.
// Terpisah dari preferensi Kuitansi Jasa (lib/kuitansiJasaTema.js).
//
// Lokasi: src/lib/kuitansiTema.js

import {
  WARNA_PRESET as PRESET_JASA,
  OPSI_POSISI_V,
  OPSI_POSISI_H,
  OPSI_UKURAN,
} from './kuitansiJasaTema'

export const KUNCI_STORAGE_KUITANSI = 'simak_kuitansi_tampilan_cetak'

// Bawaan = tampilan sebelum ada pilihan: hitam, menempel di atas kertas,
// selebar kertas A4.
export const DEFAULT_TEMA_KUITANSI = {
  warna: 'hitam', // key dari PRESET_WARNA_KUITANSI, atau 'kustom'
  warnaKustom: '#2c5a66', // dipakai bila warna === 'kustom'
  posisiV: 'atas', // 'atas' | 'tengah' | 'bawah' (posisi vertikal di kertas A4)
  posisiH: 'tengah', // 'kiri' | 'tengah' | 'kanan' (terasa bila ukuran 'ringkas')
  ukuran: 'penuh', // 'penuh' | 'ringkas'
}

export const PRESET_WARNA_KUITANSI = [
  { key: 'hitam', nama: 'Hitam', hex: '#000000' }, // tampilan bawaan sebelumnya
  ...PRESET_JASA.filter((w) => w.key !== 'abu'),
]

export const LEBAR_KUITANSI_MM = { penuh: 210, ringkas: 180 }

const HEX_VALID = /^#[0-9a-f]{6}$/i

function ada(opsi, key) {
  return opsi.some((o) => o.key === key)
}

// Memastikan objek tema selalu valid (data dari localStorage bisa rusak/usang).
export function normalisasiTemaKuitansi(t) {
  const x = { ...DEFAULT_TEMA_KUITANSI, ...(t && typeof t === 'object' ? t : {}) }
  if (x.warna !== 'kustom' && !ada(PRESET_WARNA_KUITANSI, x.warna)) x.warna = DEFAULT_TEMA_KUITANSI.warna
  if (!HEX_VALID.test(x.warnaKustom || '')) x.warnaKustom = DEFAULT_TEMA_KUITANSI.warnaKustom
  if (!ada(OPSI_POSISI_V, x.posisiV)) x.posisiV = DEFAULT_TEMA_KUITANSI.posisiV
  if (!ada(OPSI_POSISI_H, x.posisiH)) x.posisiH = DEFAULT_TEMA_KUITANSI.posisiH
  if (!ada(OPSI_UKURAN, x.ukuran)) x.ukuran = DEFAULT_TEMA_KUITANSI.ukuran
  return x
}

export function muatTemaKuitansi() {
  try {
    const raw = localStorage.getItem(KUNCI_STORAGE_KUITANSI)
    return normalisasiTemaKuitansi(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...DEFAULT_TEMA_KUITANSI }
  }
}

export function simpanTemaKuitansi(tema) {
  try {
    localStorage.setItem(KUNCI_STORAGE_KUITANSI, JSON.stringify(normalisasiTemaKuitansi(tema)))
  } catch {
    // localStorage bisa tidak tersedia (mode privat) — abaikan, tema tetap
    // berlaku selama halaman terbuka.
  }
}

// ---- Palet warna ----------------------------------------------------------

function hexKeRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbKeHex(rgb) {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')
}

// Palet untuk template Kuitansi:
//   ink    = warna teks
//   line   = garis tanda tangan & garis bawah TERBILANG
//   dotted = garis titik-titik kolom isian
//   star   = warna bintang watermark (opasitas diatur di template)
// 'hitam' menghasilkan nilai yang sama persis dengan tampilan sebelumnya.
export function bangunPaletKuitansi(tema) {
  const t = normalisasiTemaKuitansi(tema)
  const hexDasar =
    t.warna === 'kustom'
      ? t.warnaKustom
      : PRESET_WARNA_KUITANSI.find((p) => p.key === t.warna).hex

  if (hexDasar === '#000000') {
    return { ink: '#000000', line: '#000000', dotted: 'rgba(0,0,0,0.7)', star: '#000000' }
  }

  const rgb = hexKeRgb(hexDasar)
  const [r, g, b] = rgb
  return {
    ink: rgbKeHex(rgb.map((c) => Math.round(c * 0.55))), // teks dibuat lebih gelap agar tetap terbaca
    line: hexDasar,
    dotted: `rgba(${r},${g},${b},0.7)`,
    star: hexDasar,
  }
}
