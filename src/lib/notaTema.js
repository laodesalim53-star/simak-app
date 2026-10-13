// Preferensi tampilan cetak Nota Belanja (warna kertas, ukuran, posisi).
// Pola sama dengan kuitansiJasaTema.js: disimpan di localStorage perangkat,
// dan palet warnanya DIPINJAM dari kuitansiJasaTema supaya Nota & Kuitansi
// bisa tampil serasi.
//
// Lokasi: src/lib/notaTema.js

import { useCallback, useState } from 'react'
import { WARNA_PRESET, bangunPalet as bangunPaletKuitansi } from './kuitansiJasaTema'

export const KUNCI_STORAGE = 'simak_nota_tampilan_cetak'

export const DEFAULT_TEMA = {
  warna: 'putih', // 'putih' | key WARNA_PRESET | 'kustom'
  warnaKustom: '#2c5a66', // dipakai bila warna === 'kustom'
  posisiV: 'bawah', // 'atas' | 'tengah' | 'bawah' (bawah = di bawah Kuitansi, perilaku lama)
  posisiH: 'kiri', // 'kiri' | 'tengah' | 'kanan'
  ukuran: 'ringkas', // 'standar' | 'ringkas' | 'mini'
}

// 'putih' = kertas nota toko biasa; sisanya ikut preset Kuitansi.
export const OPSI_WARNA = [{ key: 'putih', nama: 'Putih', hex: '#ffffff' }, ...WARNA_PRESET]

export const OPSI_POSISI_V = [
  { key: 'atas', nama: 'Atas' },
  { key: 'tengah', nama: 'Tengah' },
  { key: 'bawah', nama: 'Bawah' },
]

export const OPSI_POSISI_H = [
  { key: 'kiri', nama: 'Kiri' },
  { key: 'tengah', nama: 'Tengah' },
  { key: 'kanan', nama: 'Kanan' },
]

// mm = lebar nota di kertas, font = ukuran huruf dasar (px)
export const OPSI_UKURAN = [
  { key: 'standar', nama: 'Standar (148 mm)', mm: 148, font: 12 },
  { key: 'ringkas', nama: 'Ringkas (120 mm)', mm: 120, font: 11 },
  { key: 'mini', nama: 'Mini (100 mm)', mm: 100, font: 10 },
]

const HEX_VALID = /^#[0-9a-f]{6}$/i

function ada(opsi, key) {
  return opsi.some((o) => o.key === key)
}

// Pastikan objek tema selalu valid (data localStorage bisa rusak/usang).
export function normalisasiTema(t) {
  const x = { ...DEFAULT_TEMA, ...(t && typeof t === 'object' ? t : {}) }
  if (x.warna !== 'kustom' && !ada(OPSI_WARNA, x.warna)) x.warna = DEFAULT_TEMA.warna
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
    // localStorage tidak tersedia (mode privat) — tema tetap berlaku selama halaman terbuka.
  }
}

const PALET_PUTIH = {
  ink: '#111111',
  line: '#222222',
  lineSoft: 'rgba(0,0,0,0.45)',
  paper: '#ffffff',
  paperDeep: '#f3f3f3',
}

// Palet untuk template: { ink, line, lineSoft, paper, paperDeep, ... }
export function bangunPalet(tema) {
  const t = normalisasiTema(tema)
  if (t.warna === 'putih') return PALET_PUTIH
  return bangunPaletKuitansi({ warna: t.warna, warnaKustom: t.warnaKustom })
}

export function infoUkuran(tema) {
  const t = normalisasiTema(tema)
  return OPSI_UKURAN.find((o) => o.key === t.ukuran)
}

// Hook untuk halaman Nota.jsx: [tema, ubahTema]. ubahTema menerima patch
// parsial, mis. ubahTema({ warna: 'hijau' }); otomatis tersimpan.
export function useNotaTema() {
  const [tema, setTema] = useState(muatTema)
  const ubahTema = useCallback((patch) => {
    setTema((prev) => {
      const next = normalisasiTema({ ...prev, ...patch })
      simpanTema(next)
      return next
    })
  }, [])
  return [tema, ubahTema]
}
