// Menyiapkan data silabus (dikirim dari halaman Silabus lewat router state)
// supaya cocok dengan pilihan dropdown di halaman RPP.

const ROMAWI = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }

// "Kelas 4A" -> "4", "IV" -> "4". Mengembalikan null kalau tidak terbaca.
export function tingkatDariNama(nama) {
  if (!nama) return null
  const s = String(nama)
  const angka = s.match(/\d+/)
  if (angka) return String(Number(angka[0]))
  const r = s.toUpperCase().match(/\b(VI|IV|V|III|II|I)\b/)
  return r ? String(ROMAWI[r[1]]) : null
}

const samaTeks = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase()

export function siapkanDariSilabus(d, mapelOptions = [], kelasOptions = []) {
  const mapelCocok = mapelOptions.find((o) => samaTeks(o, d.mata_pelajaran || ''))
  const tingkat = tingkatDariNama(d.nama_kelas)
  const kelasCocok =
    kelasOptions.find((o) => samaTeks(o, d.nama_kelas || '')) ||
    (tingkat ? kelasOptions.find((o) => samaTeks(o, tingkat)) : undefined)

  // Data RPP umumnya menyimpan kelas sebagai angka tingkat ("3", "4"), bukan "Kelas 4A".
  const mata_pelajaran = mapelCocok || d.mata_pelajaran || ''
  const kelas = kelasCocok || tingkat || d.nama_kelas || ''

  return {
    mata_pelajaran,
    kelas,
    mapelBaru: !mapelCocok, // true -> form pakai input manual, bukan dropdown
    kelasBaru: !kelasCocok,
    semester: d.semester || 'Ganjil',
    tahun_ajaran: d.tahun_ajaran || '',
    judul: `RPP ${mata_pelajaran} Kelas ${kelas} Semester ${d.semester || ''} ${d.tahun_ajaran || ''}`
      .replace(/\s+/g, ' ')
      .trim(),
    judulModul: `Modul Ajar ${mata_pelajaran} Kelas ${kelas} Semester ${d.semester || ''} ${d.tahun_ajaran || ''}`
      .replace(/\s+/g, ' ')
      .trim(),
  }
}
