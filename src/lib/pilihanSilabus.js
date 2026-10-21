import { faseDariNamaKelas } from './cpDefault'

// Pilihan cepat untuk kolom Alokasi Waktu, Penilaian, dan Sumber Belajar.
// Ubah atau tambah sesuai kebutuhan sekolah.
export const ALOKASI_WAKTU = [
  '2 x 35 menit / minggu',
  '3 x 35 menit / minggu',
  '4 x 35 menit / minggu',
  '5 x 35 menit / minggu',
  '6 x 35 menit / minggu',
]

export const PENILAIAN = [
  'Tes tulis',
  'Tes lisan',
  'Praktik / unjuk kerja',
  'Observasi',
  'Penugasan',
  'Portofolio',
  'Proyek',
  'Penilaian diri',
  'Penilaian teman sebaya',
]

export const SUMBER_BELAJAR = [
  'Buku siswa',
  'Buku guru',
  'LKPD',
  'Alat peraga',
  'Lingkungan sekitar',
  'Perpustakaan',
  'Media digital / video pembelajaran',
  'Internet',
  'Narasumber',
]

const MULOK = ['Bahasa daerah', 'Budaya dan adat setempat', 'Kerajinan lokal', 'Potensi alam daerah']

// Saran Materi Pokok per mata pelajaran dan fase (draf ringkas, silakan disesuaikan).
export const MATERI_DEFAULT = {
  'Pendidikan Agama dan Budi Pekerti': {
    A: ['Mengenal Tuhan dan ciptaan-Nya', 'Doa harian sederhana', 'Ibadah dasar', 'Kisah teladan', 'Perilaku jujur dan sopan'],
    B: ['Pokok keyakinan agama', 'Tata cara ibadah', 'Membaca atau melafalkan kitab suci', 'Kisah tokoh teladan', 'Akhlak mulia dan toleransi'],
    C: ['Ibadah dan ketentuannya', 'Meneladani tokoh agama', 'Kitab suci dan pesannya', 'Akhlak terhadap sesama dan lingkungan', 'Toleransi antarumat beragama'],
  },
  'Pendidikan Pancasila': {
    A: ['Lambang negara', 'Sila-sila Pancasila', 'Aturan di rumah dan sekolah', 'Hidup rukun dengan teman'],
    B: ['Makna sila Pancasila', 'Norma dan aturan', 'Hak dan kewajiban', 'Keberagaman suku dan budaya', 'Gotong royong'],
    C: ['Penerapan Pancasila', 'Pengenalan UUD 1945', 'Hak dan kewajiban warga negara', 'Bhinneka Tunggal Ika', 'Peran menjaga persatuan'],
  },
  'Bahasa Indonesia': {
    A: ['Menyimak dan bercerita', 'Mengenal huruf dan suku kata', 'Membaca kata dan kalimat', 'Menulis kata dan kalimat', 'Puisi dan lagu anak'],
    B: ['Ide pokok bacaan', 'Teks narasi', 'Teks deskripsi', 'Menyampaikan pendapat', 'Kosakata dan ejaan'],
    C: ['Teks informasi', 'Teks persuasi', 'Cerita fiksi', 'Presentasi lisan', 'Surat dan kalimat efektif'],
  },
  Matematika: {
    A: ['Bilangan cacah dan nilai tempat', 'Penjumlahan dan pengurangan', 'Bangun datar dan bangun ruang sederhana', 'Pengukuran panjang', 'Data sederhana'],
    B: ['Operasi hitung bilangan cacah', 'Perkalian dan pembagian', 'Pecahan sederhana', 'Keliling dan luas', 'Pengukuran waktu, panjang, dan berat', 'Diagram data'],
    C: ['Pecahan, desimal, dan persen', 'Rasio', 'Luas dan volume', 'Sifat bangun datar dan bangun ruang', 'Penyajian data dan rata-rata'],
  },
  IPAS: {
    B: ['Makhluk hidup dan lingkungannya', 'Gaya dan gerak', 'Bunyi dan cahaya', 'Wujud zat', 'Keberagaman budaya daerah', 'Kegiatan ekonomi sekitar'],
    C: ['Sistem organ tubuh', 'Perubahan zat', 'Energi dan listrik', 'Tata surya', 'Interaksi sosial', 'Sejarah daerah'],
  },
  PJOK: {
    A: ['Gerak dasar', 'Permainan sederhana', 'Kebugaran jasmani', 'Kebersihan diri'],
    B: ['Permainan bola kecil', 'Senam dan aktivitas ritmik', 'Kebugaran jasmani', 'Pola hidup sehat'],
    C: ['Permainan bola besar', 'Atletik dasar', 'Kebugaran dan pencegahan penyakit', 'Sportivitas dan kerja sama'],
  },
  'Seni dan Budaya': {
    A: ['Eksplorasi warna dan bentuk', 'Bunyi dan lagu anak', 'Gerak tari sederhana', 'Bermain peran'],
    B: ['Karya seni rupa dua dimensi', 'Lagu dan irama', 'Tari daerah', 'Drama sederhana'],
    C: ['Karya seni rupa tiga dimensi', 'Musik daerah dan nusantara', 'Tari kreasi', 'Pementasan teater', 'Apresiasi karya seni'],
  },
  'Bahasa Inggris': {
    A: ['Greetings', 'Introducing myself', 'Numbers and colors', 'Classroom objects'],
    B: ['My family', 'My house and school', 'Daily activities', 'Animals and fruits'],
    C: ['Describing people and places', 'Daily routines', 'Time and dates', 'Simple recount'],
  },
  'Muatan Lokal': { A: MULOK, B: MULOK, C: MULOK },
}

export function cariMateriDefault(mapel, namaKelas) {
  const fase = faseDariNamaKelas(namaKelas)
  if (!fase || !mapel) return []
  const kunci = Object.keys(MATERI_DEFAULT).find(
    (k) => k.toLowerCase() === String(mapel).trim().toLowerCase()
  )
  return (kunci && MATERI_DEFAULT[kunci][fase]) || []
}
