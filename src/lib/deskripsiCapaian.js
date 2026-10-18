// src/utils/deskripsiCapaian.js
//
// Pilihan deskripsi capaian siap pakai untuk dropdown di RaporKumer.
// Jenjang: Kelas 1–6 (SD, Fase A–C) dan Kelas 7–9 (SMP, Fase D).
// Setiap jenjang x predikat (A/B/C/D) punya 3 variasi kalimat.
// {m} = nama mata pelajaran, otomatis diganti saat dipilih.

export const JENJANG_OPTS = [
  { value: '1', label: 'Kelas 1 (SD)' },
  { value: '2', label: 'Kelas 2 (SD)' },
  { value: '3', label: 'Kelas 3 (SD)' },
  { value: '4', label: 'Kelas 4 (SD)' },
  { value: '5', label: 'Kelas 5 (SD)' },
  { value: '6', label: 'Kelas 6 (SD)' },
  { value: '7', label: 'Kelas 7 (SMP)' },
  { value: '8', label: 'Kelas 8 (SMP)' },
  { value: '9', label: 'Kelas 9 (SMP)' },
]

// Ciri kemampuan khas tiap jenjang (dipakai di kalimat template).
const FOKUS = {
  1: { materi: 'materi dasar', cara: 'dengan bimbingan guru', tugas: 'tugas sederhana' },
  2: { materi: 'materi dasar', cara: 'dengan arahan guru', tugas: 'tugas sederhana' },
  3: { materi: 'materi pokok', cara: 'dengan sedikit bimbingan', tugas: 'tugas harian' },
  4: { materi: 'materi pokok', cara: 'secara mandiri dan berkelompok', tugas: 'tugas harian dan tugas kelompok' },
  5: { materi: 'konsep-konsep penting', cara: 'secara mandiri', tugas: 'tugas dan latihan soal' },
  6: { materi: 'konsep-konsep penting', cara: 'secara mandiri dan bernalar', tugas: 'tugas, latihan soal, dan persiapan ujian akhir' },
  7: { materi: 'konsep dan keterampilan dasar jenjang SMP', cara: 'secara mandiri', tugas: 'tugas dan diskusi kelas' },
  8: { materi: 'konsep dan keterampilan lanjutan', cara: 'secara mandiri dan kritis', tugas: 'tugas, diskusi, dan proyek' },
  9: { materi: 'konsep dan keterampilan tingkat lanjut', cara: 'secara mandiri, kritis, dan analitis', tugas: 'tugas, proyek, dan persiapan ujian akhir' },
}

const TEMPLATE = {
  A: [
    (f) => `Ananda menunjukkan penguasaan yang sangat baik pada mata pelajaran {m}, mampu memahami ${f.materi} dan menerapkannya dengan tepat ${f.cara}.`,
    (f) => `Ananda sangat baik dalam mata pelajaran {m}: aktif dalam pembelajaran, menyelesaikan ${f.tugas} dengan tepat dan rapi, serta memiliki rasa ingin tahu yang tinggi.`,
    (f) => `Capaian ananda pada mata pelajaran {m} sangat memuaskan; ananda menguasai ${f.materi} dan dapat membantu teman yang membutuhkan. Pertahankan dan tingkatkan prestasi ini.`,
  ],
  B: [
    (f) => `Ananda menunjukkan pemahaman yang baik pada mata pelajaran {m}, mampu mengikuti ${f.materi} dan mengerjakan ${f.tugas} dengan baik.`,
    (f) => `Ananda cukup baik dan konsisten dalam mata pelajaran {m}, menyelesaikan sebagian besar ${f.tugas} tepat waktu. Perlu lebih banyak latihan agar semakin mahir.`,
    (f) => `Capaian ananda pada mata pelajaran {m} baik; ananda memahami ${f.materi}, namun masih perlu ditingkatkan pada soal yang menuntut penalaran lebih dalam.`,
  ],
  C: [
    (f) => `Ananda menunjukkan pemahaman yang cukup pada mata pelajaran {m}. Dengan latihan dan bimbingan lebih lanjut pada ${f.materi}, ananda diharapkan dapat meningkat.`,
    (f) => `Ananda sudah memahami sebagian ${f.materi} pada mata pelajaran {m}, tetapi masih perlu pendampingan dan pengulangan agar ${f.tugas} dapat diselesaikan dengan lebih tepat.`,
    (f) => `Capaian ananda pada mata pelajaran {m} cukup; ananda perlu meningkatkan keaktifan, ketelitian, dan latihan di rumah agar hasil belajarnya lebih optimal.`,
  ],
  D: [
    (f) => `Ananda masih memerlukan bimbingan intensif pada mata pelajaran {m} untuk memahami ${f.materi}. Diperlukan pendampingan guru dan orang tua secara rutin.`,
    (f) => `Ananda belum menguasai ${f.materi} pada mata pelajaran {m} dan sering kesulitan menyelesaikan ${f.tugas}. Disarankan pengulangan materi dan latihan bertahap.`,
    (f) => `Capaian ananda pada mata pelajaran {m} masih perlu ditingkatkan; kerja sama sekolah dan orang tua dibutuhkan agar ananda lebih percaya diri dan terbiasa berlatih.`,
  ],
}

// Tebak jenjang dari nama kelas, mis. "Kelas 4A", "IV B", "VII-A", "7B".
export function tebakJenjang(namaKelas) {
  if (!namaKelas) return ''
  const s = String(namaKelas).toUpperCase()
  const romawi = { IX: '9', VIII: '8', VII: '7', VI: '6', IV: '4', V: '5', III: '3', II: '2', I: '1' }
  const angka = s.match(/\b([1-9])(?!\d)/)
  if (angka) return angka[1]
  const rom = s.match(/\b(IX|VIII|VII|VI|IV|V|III|II|I)\b/)
  return rom ? romawi[rom[1]] : ''
}

// Daftar pilihan deskripsi untuk jenjang + predikat + mapel tertentu.
export function opsiDeskripsi(jenjang, predikat, namaMapel) {
  const f = FOKUS[jenjang]
  const list = TEMPLATE[predikat]
  if (!f || !list) return []
  return list.map((fn, i) => ({
    label: `Pilihan ${i + 1}: ${fn(f).replace(/\{m\}/g, namaMapel).slice(0, 60)}…`,
    teks: fn(f).replace(/\{m\}/g, namaMapel),
  }))
}
