// Daftar angka Romawi untuk tingkat 1–12 (SD s.d. SMA/SMK), indeks 0 = tingkat 1.
const ANGKA_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/**
 * Cek apakah sebuah nama kelas termasuk tingkat tertentu, menerima kedua gaya
 * penamaan yang umum dipakai sekolah:
 *   - Angka  : "6A", "6", "6-B", "Kelas 6"
 *   - Romawi : "VIA", "Kelas VI", "IXB", "Kelas IX"
 *
 * Dipakai untuk menggantikan filter database sederhana (mis. .ilike('nama_kelas','6%'))
 * yang cuma menangkap satu gaya penamaan dan melewatkan sekolah yang pakai gaya lain.
 *
 * @param {string} namaKelas - nama kelas apa adanya dari data (boleh kosong/null)
 * @param {number} tingkat - tingkat yang dicari, 1–12 (mis. 6 untuk Kelas 6, 9 untuk Kelas 9)
 * @returns {boolean}
 */
export function isKelasTingkat(namaKelas, tingkat) {
  const nama = (namaKelas || '').trim().toUpperCase()
  if (!nama) return false

  const romawi = ANGKA_ROMAWI[tingkat - 1]
  if (!romawi) return false

  // --- Angka ---
  // Diawali angka tingkat lalu batas kata (bukan digit lanjutan), supaya
  // tingkat 7 tidak ikut cocok ke kelas "70", "17", dst.
  if (new RegExp(`^${tingkat}\\b`).test(nama)) return true
  if (new RegExp(`KELAS\\s*${tingkat}\\b`).test(nama)) return true

  // --- Romawi ---
  // Harus diawali persis kode romawi tingkat ini, dan karakter sesudahnya
  // BUKAN huruf romawi lanjutan (I/V/X) — supaya "VII" tidak ikut ke-match
  // sebagai awalan "VI", atau "XI" sebagai awalan "X".
  const lolosRomawi = (teks) => {
    if (!teks.startsWith(romawi)) return false
    const sisa = teks.slice(romawi.length)
    return !/^[IVX]/.test(sisa)
  }
  if (lolosRomawi(nama)) return true

  const m = /KELAS\s*(.+)/.exec(nama)
  if (m && lolosRomawi(m[1].trim())) return true

  return false
}

// Shortcut untuk tingkat yang sudah dipakai di aplikasi — tinggal tambah
// baris baru kalau nanti butuh tingkat lain (mis. isKelas12 untuk SMA/SMK).
export const isKelas6 = (namaKelas) => isKelasTingkat(namaKelas, 6)
export const isKelas9 = (namaKelas) => isKelasTingkat(namaKelas, 9)
