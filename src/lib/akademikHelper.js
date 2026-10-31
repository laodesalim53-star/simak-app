// src/lib/akademikHelper.js
// Pembantu kecil untuk halaman Tahun Ajaran, Mutasi Siswa, dan Ekstrakurikuler.

// Nama & NISN dibaca dengan cadangan supaya tidak bergantung pada satu nama kolom.
export const namaSiswa = (s) => s?.nama_lengkap ?? s?.nama ?? '(tanpa nama)'
export const nisnSiswa = (s) => s?.nisn ?? s?.nis ?? '-'

const ROMAWI = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6,
  VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
}

// "6" -> 6, "Kelas 6" -> 6, "VI" -> 6, "Kelas VI" -> 6; tidak dikenali -> null
export function angkaTingkat(t) {
  if (t == null) return null
  const s = String(t).trim().toUpperCase()
  const m = s.match(/\d+/)
  if (m) return parseInt(m[0], 10)
  const kata = s.split(/\s+/)
  return ROMAWI[kata[kata.length - 1]] ?? ROMAWI[s] ?? null
}

// Huruf/angka terakhir nama kelas ("Kelas 3A" -> "A") untuk mencocokkan paralel kelas.
export function akhiranKelas(nama) {
  const s = String(nama || '').trim()
  return s ? s[s.length - 1].toUpperCase() : ''
}

export function urutKelas(a, b) {
  const ta = angkaTingkat(a.tingkat) ?? 0
  const tb = angkaTingkat(b.tingkat) ?? 0
  if (ta !== tb) return ta - tb
  return String(a.nama_kelas || '').localeCompare(String(b.nama_kelas || ''))
}

// Unduh CSV (pakai BOM supaya Excel membaca UTF-8 dengan benar)
export function unduhCsv(namaFile, baris) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const isi = baris.map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + isi], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const formatTanggal = (d) => {
  if (!d) return '-'
  const t = new Date(d)
  return Number.isNaN(t.getTime())
    ? d
    : t.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
export const btnPrimer =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
export const btnSekunder =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'
