import { MATERI_SD1 } from './materiSD1'
import { MATERI_SD2 } from './materiSD2'
import { MATERI_SD3 } from './materiSD3'
import { MATERI_SD4 } from './materiSD4'
import { MATERI_SD5 } from './materiSD5'
import { MATERI_SD6 } from './materiSD6'
import { MATERI_SMP1 } from './materiSMP1'
import { MATERI_SMP2 } from './materiSMP2'
import { MATERI_SMP3 } from './materiSMP3'

// =====================================================================
// DATA MATERI — bagian yang paling sering Anda ubah
// =====================================================================
// Kunci: `${jenjang}-${kelas}-${idMapel}`, contoh: 'SD-1-matematika'.
// Isi tiap kunci berupa daftar materi. `link` boleh dikosongkan; kalau diisi
// (Google Drive, YouTube, dll.), materi tampil sebagai tautan yang bisa dibuka.
// `ringkasan` (opsional) tampil sebagai teks singkat di bawah judul.
//
// Setiap jenjang/kelas kini disimpan di file terpisah (materiSD1.js,
// materiSD2.js, dst.) supaya lebih mudah dikelola satu per satu.
//
// Contoh:
//   'SD-1-matematika': [
//     { judul: 'Bilangan 1 sampai 10', ringkasan: '...', link: 'https://drive.google.com/...' },
//     { judul: 'Penjumlahan dan pengurangan sederhana' },
//   ],

export const MATERI = {
  ...MATERI_SD1,
  ...MATERI_SD2,
  ...MATERI_SD3,
  ...MATERI_SD4,
  ...MATERI_SD5,
  ...MATERI_SD6,
  ...MATERI_SMP1,
  ...MATERI_SMP2,
  ...MATERI_SMP3,
}
