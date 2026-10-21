// Data rekomendasi untuk tab "Susun RPP".
// Letakkan di: src/data/rppRekomendasi.js

export const DIMENSI = [
  'Beriman, bertakwa kepada Tuhan Yang Maha Esa, dan berakhlak mulia',
  'Berkebinekaan global',
  'Bergotong royong',
  'Mandiri',
  'Bernalar kritis',
  'Kreatif',
]

const [IMAN, BINEKA, GOTONG, MANDIRI, NALAR, KREATIF] = DIMENSI

// ---------- Fase dari kelas ----------
const ROMAWI = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 }

export function faseDariKelas(kelas) {
  const s = String(kelas || '').toUpperCase()
  let n = parseInt((s.match(/\d+/) || [])[0], 10)
  if (!n) {
    const r = (s.match(/\b(XII|XI|IX|X|VIII|VII|VI|IV|V|III|II|I)\b/) || [])[1]
    n = r ? ROMAWI[r] : 0
  }
  if (!n) return ''
  if (n <= 2) return 'A'
  if (n <= 4) return 'B'
  if (n <= 6) return 'C'
  if (n <= 9) return 'D'
  if (n === 10) return 'E'
  return 'F'
}

// ---------- Capaian Pembelajaran (rumusan awal dari materi) ----------
export function capaianDari(materi, fase) {
  const m = (materi || '').trim() || 'materi yang dipelajari'
  return `Pada akhir fase ${fase || '...'}, peserta didik mampu memahami, menerapkan, dan mengomunikasikan ${m} dengan percaya diri dan bertanggung jawab.`
}

// ---------- Kegiatan bersama (pendahuluan & penutup) ----------
const pembuka = (m) =>
  [
    '1. Guru membuka pembelajaran dengan salam, mengajak peserta didik berdoa, dan memeriksa kehadiran.',
    '2. Guru menyiapkan kondisi kelas dan peserta didik agar siap belajar.',
    `3. Guru melakukan apersepsi dengan mengaitkan ${m} dengan pengalaman sehari-hari peserta didik.`,
    '4. Guru menyampaikan tujuan pembelajaran dan alur kegiatan yang akan dilakukan.',
  ].join('\n')

const penutup = (m) =>
  [
    `1. Peserta didik bersama guru menyimpulkan hasil pembelajaran tentang ${m}.`,
    '2. Guru dan peserta didik melakukan refleksi: apa yang sudah dipahami dan apa yang masih sulit.',
    '3. Guru memberikan umpan balik dan penguatan terhadap hasil belajar peserta didik.',
    '4. Guru menyampaikan rencana pembelajaran pertemuan berikutnya.',
    '5. Pembelajaran ditutup dengan doa dan salam.',
  ].join('\n')

const nomor = (arr) => arr.map((t, i) => `${i + 1}. ${t}`).join('\n')

// ---------- Model pembelajaran + kegiatan inti ----------
export const MODEL = [
  {
    label: 'Problem Based Learning (Berbasis Masalah)',
    profil: [NALAR, MANDIRI, GOTONG],
    inti: (m) =>
      nomor([
        `Orientasi masalah: guru menyajikan masalah kontekstual yang berkaitan dengan ${m}.`,
        'Mengorganisasi peserta didik: peserta didik dibagi menjadi kelompok dan merumuskan pertanyaan atau dugaan awal.',
        'Penyelidikan: kelompok mengumpulkan informasi dari berbagai sumber untuk memecahkan masalah.',
        'Pengembangan dan penyajian hasil: kelompok menyusun solusi dan mempresentasikannya.',
        'Analisis dan evaluasi: guru dan peserta didik menanggapi hasil serta mengevaluasi proses pemecahan masalah.',
      ]),
  },
  {
    label: 'Project Based Learning (Berbasis Proyek)',
    profil: [KREATIF, GOTONG, MANDIRI],
    inti: (m) =>
      nomor([
        `Pertanyaan mendasar: guru mengajukan pertanyaan pemantik terkait ${m}.`,
        'Perencanaan proyek: kelompok merancang langkah, jadwal, dan pembagian tugas.',
        'Pelaksanaan proyek: peserta didik mengerjakan proyek dengan pendampingan guru.',
        'Monitoring: guru memantau kemajuan proyek dan memberikan masukan.',
        'Presentasi produk: kelompok menampilkan hasil proyek dan menerima tanggapan.',
        'Evaluasi dan refleksi atas proses serta hasil proyek.',
      ]),
  },
  {
    label: 'Discovery Learning (Penemuan)',
    profil: [NALAR, MANDIRI, KREATIF],
    inti: (m) =>
      nomor([
        `Stimulasi: guru menampilkan gambar, cerita, atau fenomena tentang ${m}.`,
        'Identifikasi masalah: peserta didik merumuskan pertanyaan dari stimulus.',
        'Pengumpulan data: peserta didik mengamati, membaca, atau bereksperimen untuk mencari informasi.',
        'Pengolahan data: peserta didik menganalisis dan mengelompokkan data yang diperoleh.',
        'Pembuktian: peserta didik memeriksa dugaan dengan data dan sumber belajar.',
        'Generalisasi: peserta didik menarik kesimpulan dan mempresentasikannya.',
      ]),
  },
  {
    label: 'Inquiry Learning (Inkuiri)',
    profil: [NALAR, MANDIRI, BINEKA],
    inti: (m) =>
      nomor([
        `Orientasi: guru mengarahkan perhatian peserta didik pada topik ${m}.`,
        'Merumuskan masalah: peserta didik menyusun pertanyaan penelitian sederhana.',
        'Mengajukan hipotesis: peserta didik membuat dugaan jawaban.',
        'Mengumpulkan data: peserta didik mengamati atau mencari informasi untuk menguji dugaan.',
        'Menguji hipotesis: peserta didik menganalisis data untuk membenarkan atau menolak dugaan.',
        'Merumuskan kesimpulan dan mengomunikasikannya.',
      ]),
  },
  {
    label: 'Cooperative Learning (Think-Pair-Share)',
    profil: [GOTONG, NALAR, BINEKA],
    inti: (m) =>
      nomor([
        `Guru memaparkan inti ${m} secara singkat menggunakan media.`,
        'Think: peserta didik memikirkan jawaban atas pertanyaan guru secara mandiri.',
        'Pair: peserta didik berdiskusi berpasangan untuk menyamakan jawaban.',
        'Share: setiap pasangan membagikan hasil diskusi kepada seluruh kelas.',
        'Guru meluruskan konsep, lalu peserta didik mengerjakan LKPD secara berkelompok.',
      ]),
  },
  {
    label: 'Ceramah Interaktif dan Diskusi',
    profil: [MANDIRI, NALAR, IMAN],
    inti: (m) =>
      nomor([
        `Guru menjelaskan konsep ${m} dengan bantuan media dan contoh nyata.`,
        'Guru memberikan demonstrasi atau contoh penyelesaian.',
        'Latihan terbimbing: peserta didik mencoba dengan arahan guru.',
        'Diskusi kelas: peserta didik bertanya, menanggapi, dan berbagi pendapat.',
        'Latihan mandiri: peserta didik mengerjakan soal atau tugas secara individu.',
      ]),
  },
]

export function kegiatanDariModel(label, materi) {
  const mdl = MODEL.find((x) => x.label === label)
  if (!mdl) return null
  const m = (materi || '').trim() || 'materi pembelajaran'
  return { pendahuluan: pembuka(m), inti: mdl.inti(m), penutup: penutup(m), profil: mdl.profil }
}

// ---------- Pilihan lain ----------
export const ALOKASI = [
  '2 x 35 menit',
  '3 x 35 menit',
  '4 x 35 menit',
  '2 x 40 menit',
  '3 x 40 menit',
  '2 x 45 menit',
  '3 x 45 menit',
]

export const MEDIA = [
  'Papan tulis',
  'Slide presentasi (PowerPoint)',
  'Gambar / poster / bagan',
  'Video pembelajaran',
  'Alat peraga / benda konkret',
  'Lembar Kerja Peserta Didik (LKPD)',
  'Kartu soal / kartu kata',
  'Proyektor (LCD)',
]

export const SUMBER = [
  'Buku Siswa Kurikulum Merdeka (Kemendikbudristek)',
  'Buku Guru Kurikulum Merdeka',
  'Modul Ajar',
  'Lingkungan sekitar sekolah',
  'Platform Merdeka Mengajar',
  'Rumah Belajar (belajar.id)',
  'Buku bacaan pendukung dari perpustakaan',
]

export const ASESMEN = [
  {
    label: 'Paket lengkap (diagnostik, formatif, sumatif)',
    isi: [
      '1. Asesmen diagnostik: tanya jawab lisan di awal pembelajaran untuk mengetahui kesiapan peserta didik.',
      '2. Asesmen formatif: observasi keaktifan dan sikap selama pembelajaran, serta penilaian LKPD.',
      '3. Asesmen sumatif: tes tertulis (pilihan ganda dan uraian) pada akhir pembelajaran.',
      '4. Penilaian sikap: observasi dan jurnal guru terhadap dimensi profil pelajar.',
    ].join('\n'),
  },
  { label: 'Diagnostik: tanya jawab lisan di awal', isi: 'Asesmen diagnostik: tanya jawab lisan di awal pembelajaran untuk mengetahui kesiapan peserta didik.' },
  { label: 'Formatif: observasi keaktifan dan sikap', isi: 'Asesmen formatif: observasi keaktifan dan sikap peserta didik selama pembelajaran.' },
  { label: 'Formatif: penilaian LKPD', isi: 'Asesmen formatif: penilaian hasil pengerjaan LKPD secara individu atau kelompok.' },
  { label: 'Kinerja: presentasi dengan rubrik', isi: 'Asesmen kinerja: penilaian presentasi dan unjuk kerja menggunakan rubrik.' },
  { label: 'Proyek: produk dengan rubrik', isi: 'Asesmen proyek: penilaian produk dan proses pengerjaan proyek menggunakan rubrik.' },
  { label: 'Sumatif: tes tertulis', isi: 'Asesmen sumatif: tes tertulis (pilihan ganda dan uraian) pada akhir pembelajaran.' },
  { label: 'Sikap: jurnal dan observasi', isi: 'Penilaian sikap: observasi dan jurnal guru terhadap dimensi profil pelajar.' },
]
