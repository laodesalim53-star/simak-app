// Preferensi tampilan cetak Kuitansi Jasa (warna & tata letak).
// Disimpan di localStorage browser (bukan di database), jadi berlaku sebagai
// "preferensi cetak" perangkat ini dan dipakai juga saat Cetak Ulang.
//
// Lokasi: src/lib/kuitansiJasaTema.js

export const KUNCI_STORAGE = 'simak_kuitansi_jasa_tampilan_cetak'

export const DEFAULT_TEMA = {
  warna: 'biru', // key dari WARNA_PRESET, atau 'kustom'
  warnaKustom: '#2c5a66', // dipakai bila warna === 'kustom'
  posisiV: 'bawah', // 'atas' | 'tengah' | 'bawah'  (posisi vertikal di kertas A4)
  posisiH: 'tengah', // 'kiri' | 'tengah' | 'kanan' (terasa bila ukuran 'ringkas')
  ukuran: 'penuh', // 'penuh' | 'ringkas'
}

export const WARNA_PRESET = [
  { key: 'biru', nama: 'Biru', hex: '#2c5a66' }, // tampilan bawaan sebelumnya
  { key: 'hijau', nama: 'Hijau', hex: '#2f6b3f' },
  { key: 'marun', nama: 'Marun', hex: '#7a2e3a' },
  { key: 'ungu', nama: 'Ungu', hex: '#5b3f7a' },
  { key: 'cokelat', nama: 'Cokelat', hex: '#7a5a2e' },
  { key: 'abu', nama: 'Abu-abu', hex: '#4a4a4a' },
]

export const OPSI_POSISI_V = [
  { key: 'atas', nama: 'Atas' },
  { key: 'tengah', nama: 'Tengah' },
  { key: 'bawah', nama: 'Bawah' }, // bawaan sebelumnya
]

export const OPSI_POSISI_H = [
  { key: 'kiri', nama: 'Kiri' },
  { key: 'tengah', nama: 'Tengah' }, // bawaan sebelumnya
  { key: 'kanan', nama: 'Kanan' },
]

export const OPSI_UKURAN = [
  { key: 'penuh', nama: 'Penuh (202 mm)' }, // bawaan sebelumnya
  { key: 'ringkas', nama: 'Ringkas (170 mm)' },
]

export const LEBAR_SLIP_MM = { penuh: 202, ringkas: 170 }

// Jarak slip dari tepi atas kertas. 'bawah' = 123mm, sama seperti sebelumnya
// (meniru sampel_kwitansi.docx). 'tengah' ditangani lewat flex align-items.
export const JARAK_ATAS_MM = { atas: 12, tengah: 0, bawah: 123 }

const HEX_VALID = /^#[0-9a-f]{6}$/i

function ada(opsi, key) {
  return opsi.some((o) => o.key === key)
}

// Memastikan objek tema selalu valid (data dari localStorage bisa rusak/usang).
export function normalisasiTema(t) {
  const x = { ...DEFAULT_TEMA, ...(t && typeof t === 'object' ? t : {}) }
  if (x.warna !== 'kustom' && !ada(WARNA_PRESET, x.warna)) x.warna = DEFAULT_TEMA.warna
  if (!HEX_VALID.test(x.warnaKustom || '')) x.warnaKustom = DEFAULT_TEMA.warnaKustom
  if (!ada(OPSI_POSISI_V, x.posisiV)) x.posisiV = DEFAULT_TEMA.posisiV
  if (!ada(OPSI_POSISI_H, x.posisiH)) x.posisiH = DEFAULT_TEMA.posisiH
  if (!ada(OPSI_UKURAN, x.ukuran)) x.ukuran = DEFAULT_TEMA.ukuran
  return x
}

export function muatTema() {
  try {
    const raw = localStorage.getItem(KUNCI_STORAGE)
    return normalisasiTema(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...DEFAULT_TEMA }
  }
}

export function simpanTema(tema) {
  try {
    localStorage.setItem(KUNCI_STORAGE, JSON.stringify(normalisasiTema(tema)))
  } catch {
    // localStorage bisa tidak tersedia (mode privat) — abaikan, tema tetap
    // berlaku selama halaman terbuka.
  }
}

// ---- Palet warna ----------------------------------------------------------

// Palet biru persis seperti sebelum ada pilihan warna.
const PALET_BIRU = {
  ink: '#173438',
  line: '#2c5a66',
  lineSoft: 'rgba(44,90,102,0.45)',
  paper: '#eaf7f8',
  paperDeep: '#d7edf1',
  guilloche: 'rgba(41,95,109,0.34)',
  guillocheSoft: 'rgba(41,95,109,0.14)',
}

function hexKeRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbKeHex(rgb) {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')
}

// Geser warna `rgb` sejauh fraksi `t` menuju warna `ke`.
function campur(rgb, ke, t) {
  return rgb.map((c, i) => Math.round(c + (ke[i] - c) * t))
}

function paletDari(hexDasar) {
  const rgb = hexKeRgb(hexDasar)
  const [r, g, b] = rgb
  return {
    ink: rgbKeHex(campur(rgb, [0, 0, 0], 0.55)),
    line: hexDasar,
    lineSoft: `rgba(${r},${g},${b},0.45)`,
    paper: rgbKeHex(campur(rgb, [255, 255, 255], 0.92)),
    paperDeep: rgbKeHex(campur(rgb, [255, 255, 255], 0.84)),
    guilloche: `rgba(${r},${g},${b},0.34)`,
    guillocheSoft: `rgba(${r},${g},${b},0.14)`,
  }
}

export function bangunPalet(tema) {
  const t = normalisasiTema(tema)
  if (t.warna === 'biru') return PALET_BIRU
  if (t.warna === 'kustom') return paletDari(t.warnaKustom)
  const preset = WARNA_PRESET.find((p) => p.key === t.warna)
  return paletDari(preset.hex)
}
