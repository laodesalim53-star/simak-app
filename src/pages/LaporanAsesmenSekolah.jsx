// src/pages/LaporanAsesmenSekolah.jsx
//
// Laporan Asesmen Sekolah (Kelas 6) dalam SATU halaman dengan 5 tab, satu tab
// per bagian sesuai file LAPORAN_ASESMEN_KELAS_6_2025 dan KATA_PENGANTAR_Asesmen:
//   Laporan  - Kata Pengantar, Daftar Isi, Bab I-VI, Lampiran (teks bawaan, bisa diedit di form)
//   Lembar 1 - Statistik nilai (tertinggi / terendah / rata-rata, tulis & praktik)
//   Lembar 2 - Klasifikasi nilai (jumlah peserta per rentang nilai)
//   Lembar 3 - Peserta terdaftar, hadir, lulus & tidak lulus (L / P / Jml)
//   Lembar 4 - Laporan sekolah penyelenggara (kehadiran + masalah & saran)
//
// Pola mengikuti DaftarHadirSiswaUjian.jsx:
// - Kop surat, logo kabupaten/sekolah dari profil_sekolah, useAuth,
//   ambilProfilSekolah, CSS cetak satu-halaman (#area-cetak-laporan).
// - Jumlah peserta (dan L/P) bisa diisi otomatis dari tabel `siswa` Kelas 6
//   yang sudah punya no_peserta_ujian (tombol "Isi dari data siswa").
// - Tanggal & mata pelajaran Lembar 4 bisa diambil dari Jadwal Pengawas Ruang.
// - NILAI TERHUBUNG ke halaman Nilai Asesmen: tabel `nilai_ijazah` (tahun
//   pelajaran sama dengan isian di form) dibaca otomatis begitu halaman dibuka,
//   lalu Lembar 1 (tertinggi/terendah/rata-rata), Lembar 2 (klasifikasi) dan
//   Lembar 3 (terdaftar/hadir/lulus/tidak lulus) terisi sendiri. Mapel
//   PJOK, Seni Budaya & Prakarya masuk kolom Nilai Praktik (seperti di docx),
//   mapel lainnya ke Nilai Tertulis. Lulus = nilai >= KKM (isian di form).
//   Setiap kali nilai di Nilai Asesmen diubah, tekan "Tarik ulang nilai"
//   (atau buka ulang halaman ini). Kolom Ket dan mapel yang tidak ada di
//   nilai_ijazah tetap bisa diketik manual di tabel.
// - SUSUNAN PANITIA (tab Laporan): nilai awal hanya jabatan, TANPA nama
//   (supaya nama guru satu sekolah tidak terbawa ke sekolah lain). Nama bisa
//   diketik manual, dipilih dari data guru sekolah yang sedang login
//   (tabel `guru`, difilter sekolah_id), atau diisi otomatis lewat tombol.
//
// CATATAN:
// - Kolom `jenis_kelamin` di tabel siswa dicoba dibaca terpisah. Kalau nama
//   kolomnya berbeda / tidak ada, jumlah L/P tidak terisi otomatis (isi manual),
//   tapi halaman tetap jalan.
// - Nama & NIP Kepala Sekolah dicoba diisi dari data sekolah (beberapa nama
//   properti dicoba); tetap bisa diubah manual di form.
// - Cetak: tombol Cetak mencetak tab yang sedang aktif; centang "Cetak semua
//   lembar" untuk mencetak keempatnya (satu lembar per halaman).

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Printer, RefreshCw, Wand2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { muatJadwalPengawas, ratakanSesiJadwal } from '../lib/jadwalPengawasStore'
import Layout from '../components/Layout'
import { MAPEL_IJAZAH } from '../components/IjazahPrintTemplate'
import {
  BagianSK as Bagian,
  FieldSK as Field,
  SEKOLAH_KOSONG,
  ambilProfilSekolah,
  inputSK as inputCls,
  isi,
  isoHariIni,
  tahunPelajaranSekarang,
} from '../components/CetakSK'

// --- Dipinjam dari KartuPesertaUjian.jsx / DaftarHadirSiswaUjian.jsx ---

function isKelas6(namaKelas) {
  const nama = (namaKelas || '').trim().toUpperCase()
  if (!nama) return false
  if (/^6\b/.test(nama)) return true
  if (/KELAS\s*6\b/.test(nama)) return true
  if (/^VI([^I]|$)/.test(nama)) return true
  if (/KELAS\s*VI([^I]|$)/.test(nama)) return true
  return false
}

function sudahTerdaftarPeserta(siswa) {
  const nilai = siswa?.no_peserta_ujian
  return nilai !== null && nilai !== undefined && String(nilai).trim() !== ''
}

function urlLogo(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('profil-sekolah').getPublicUrl(path)
  return data?.publicUrl || ''
}

function labelTanggal(iso) {
  if (!iso) return '…'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function tanggalPanjang(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function hariTanggalPanjang(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  const hari = d.toLocaleDateString('id-ID', { weekday: 'long' })
  return `${hari}, ${tanggalPanjang(iso)}`
}

// Angka dari isian teks ("12", "75,5") -> number; kosong/bukan angka -> 0.
function num(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isNaN(n) ? 0 : n
}

// Jumlah dari beberapa isian; kalau semuanya kosong, kembalikan ''.
function jumlah(...vals) {
  if (vals.every((v) => String(v ?? '').trim() === '')) return ''
  return String(vals.reduce((a, v) => a + num(v), 0))
}

// Ambil nilai pertama yang terisi dari objek profil, berdasarkan pola nama kolom.
// Dipakai supaya tidak bergantung pada nama kolom persis di profil_sekolah.
function cariKolom(obj, pola) {
  const hit = Object.entries(obj || {}).find(([k, v]) => pola.test(k) && v !== null && String(v).trim() !== '')
  return hit ? String(hit[1]).trim() : ''
}

// Format angka hasil hitung: maksimal 2 desimal, koma sebagai pemisah.
function fmt(x) {
  return String(Math.round(x * 100) / 100).replace('.', ',')
}

// Indeks klasifikasi (sesuai KLASIFIKASI di bawah) untuk satu nilai.
function indeksKlasifikasi(v) {
  if (v < 50) return 0
  if (v < 60) return 1
  if (v < 70) return 2
  if (v < 80) return 3
  if (v < 90) return 4
  return 5
}

// Pengenal mapel di laporan -> kolom di nilai_ijazah (dicocokkan dari key/label/singkatan
// MAPEL_IJAZAH, jadi tidak bergantung pada nama kolom persisnya).
const POLA_MAPEL = [
  /agama|budi pekerti/,
  /pancasila|pkn|ppkn|kewarganegaraan/,
  /indonesia|indo/,
  /matematika|mtk/,
  /\bipa\b|pengetahuan alam/,
  /\bips\b|pengetahuan sosial/,
  /inggris|english/,
  /jasmani|pjok|olahraga/,
  /seni|sbk|sbdp/,
  /prakarya/,
]
// Indeks mapel (di MAPEL) yang nilainya masuk kolom Nilai Praktik.
const MAPEL_PRAKTIK = [7, 8, 9]

function kunciPerMapel() {
  const daftar = (MAPEL_IJAZAH || []).map((m) => ({
    key: m.key,
    teks: `${m.key} ${m.label || ''} ${m.singkatan || ''}`.toLowerCase().replace(/[_-]/g, ' '),
  }))
  return POLA_MAPEL.map((re) => daftar.find((d) => re.test(d.teks))?.key || null)
}

// --- Data bawaan ---

const MAPEL = [
  'Pend. Agama & BK',
  'Pend. Pancasila & Kewarganegaraan',
  'Bahasa Indonesia',
  'Matematika',
  'IPA',
  'IPS',
  'Bahasa Inggris*)',
  'Pend. Jasmani Olahraga & Kesehatan',
  'Seni Budaya*)',
  'Prakarya*)',
]

const KLASIFIKASI = ['0 – 49,99', '50,00 – 59,99', '60,00 – 69,99', '70,00 – 79,99', '80,00 – 89,99', '90,00 – 100']

const TAB = [
  { id: 'laporan', label: 'Laporan', sub: 'Kata Pengantar – Bab VI' },
  { id: 'nilai', label: 'Lembar 1', sub: 'Statistik Nilai' },
  { id: 'klasifikasi', label: 'Lembar 2', sub: 'Klasifikasi Nilai' },
  { id: 'kelulusan', label: 'Lembar 3', sub: 'Kelulusan' },
  { id: 'penyelenggara', label: 'Lembar 4', sub: 'Penyelenggara' },
]

const barisNilai = () =>
  MAPEL.map(() => ({ jml: '', tTinggi: '', tRendah: '', tRata: '', pTinggi: '', pRendah: '', pRata: '', ket: '' }))
const barisKlasifikasi = () => MAPEL.map(() => ({ k: KLASIFIKASI.map(() => ''), ket: '' }))
const barisKelulusan = () =>
  MAPEL.map(() => ({ tdL: '', tdP: '', hdL: '', hdP: '', lL: '', lP: '', tlL: '', tlP: '', ket: '' }))
const barisPenyelenggara = () => ({
  penyelenggara: { terdaftar: '', mengikuti: '', hadir: '', tidakHadir: '-', nomor: '-' },
  bergabung: { terdaftar: '-', mengikuti: '-', hadir: '-', tidakHadir: '-', nomor: '-' },
  masalah: [
    { m: '-', l: '-', u: '-' },
    { m: '-', l: '-', u: '-' },
    { m: '-', l: '-', u: '-' },
  ],
})

// --- Tab "Laporan": teks bawaan (bisa diedit di form) & pembantu ---

// Kata kunci otomatis dalam teks: {sekolah} {desa} {kecamatan} {kabupaten} {provinsi}
// {tapel} {tahun} {kepsek} {us} {praktik} {sk} {rakor}. Diisi saat tampil, jadi
// ikut berubah kalau datanya diubah. Kalau datanya kosong tampil "…………".
function isiTemplate(str, v) {
  return String(str || '').replace(/\{(\w+)\}/g, (_, k) =>
    v[k] !== undefined && String(v[k]).trim() !== '' ? v[k] : '…………'
  )
}

function judulKata(s) {
  return String(s || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function judulSekolah(s) {
  return String(s || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) =>
      /^(sd|smp|sma|smk|mi|mts|ma|tk|paud|sdn|sdi|slb)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(' ')
}

// "2026-05-05","2026-05-09" -> "05 – 09 Mei 2026"
function rentangTanggal(a, b) {
  if (!a && !b) return ''
  if (!b || a === b) return tanggalPanjang(a || b)
  if (!a) return tanggalPanjang(b)
  const da = new Date(`${a}T00:00:00`)
  const db = new Date(`${b}T00:00:00`)
  const dd = (d) => String(d.getDate()).padStart(2, '0')
  const bulan = (d) => d.toLocaleDateString('id-ID', { month: 'long' })
  if (da.getFullYear() === db.getFullYear()) {
    if (da.getMonth() === db.getMonth()) return `${dd(da)} – ${tanggalPanjang(b)}`
    return `${dd(da)} ${bulan(da)} – ${tanggalPanjang(b)}`
  }
  return `${tanggalPanjang(a)} – ${tanggalPanjang(b)}`
}

// PERBAIKAN: nilai awal hanya jabatan, TANPA nama orang. Sebelumnya nama guru
// dari satu sekolah ditulis langsung di sini sehingga ikut muncul di semua
// sekolah lain. Penanggung Jawab terisi otomatis dari Kepala Sekolah ({kepsek}).
const PANITIA_AWAL = `Penanggung Jawab | {kepsek}
Ketua |
Sekretaris |
Bendahara |
Anggota |
Anggota |`

const TEKS_AWAL = {
  pengantar: `Puji dan syukur dipersembahkan ke hadirat Tuhan Yang Maha Kuasa, atas rahmat dan karunia-Nya kami dapat menyelesaikan Laporan Pelaksanaan Kegiatan Ujian Sekolah Tahun Pelajaran {tapel}.

Pelaksanaan Ujian Sekolah (US) di {sekolah}, Kecamatan {kecamatan}, Kabupaten {kabupaten}, berdasarkan peraturan Badan Standar Nasional Pendidikan tentang Prosedur Operasional Standar Penyelenggaraan Ujian Sekolah Berstandar Nasional Tahun {tapel}. Seluruh rangkaian kegiatan mengacu kepada peraturan tersebut agar dalam pelaksanaannya optimal dan hasilnya maksimal.

Harapan kami semoga laporan kegiatan Ujian Sekolah bermanfaat bagi peningkatan kualitas pembelajaran di {sekolah}, Kecamatan {kecamatan}, Kabupaten {kabupaten}, khususnya dan dunia pendidikan pada umumnya.

Terima kasih kepada semua pihak yang telah membantu dalam pelaksanaan kegiatan ini sehingga seluruh program dapat terlaksana dengan baik.`,

  pendahuluan: `Hasil PISA membuktikan kemampuan belajar siswa pada pendidikan dasar dan menengah kurang memadai. Pada tahun 2018, sekitar 70% siswa memiliki kompetensi literasi membaca di bawah minimum. Sama halnya dengan keterampilan matematika dan sains, 71% siswa berada di bawah kompetensi minimum untuk matematika dan 60% siswa di bawah kompetensi minimum untuk keterampilan sains. Skor PISA Indonesia stagnan dalam 10-15 tahun terakhir. Kondisi ini menyebabkan Indonesia menjadi salah satu negara yang konsisten dengan peringkat hasil PISA yang terendah.

Menanggapi kondisi tersebut, reformasi asesmen diperlukan guna mendorong peningkatan kualitas pembelajaran. Pemetaan mutu pendidikan secara menyeluruh dibutuhkan. Untuk itu, Asesmen Nasional (AN) diterapkan oleh Kementerian Pendidikan dan Kebudayaan dan Ujian Nasional (UN) tidak lagi diberlakukan. Kebijakan ini ditetapkan berdasarkan hasil koordinasi Kementerian Pendidikan dan Kebudayaan dengan sejumlah dinas dan lembaga terkait.

Dalam hal ini, Asesmen Sekolah diterapkan untuk mengevaluasi kinerja dan mutu sistem pendidikan. Hasil Asesmen Nasional tidak memiliki konsekuensi apa pun pada pencapaian proses belajar siswa, namun memberikan umpan balik untuk tindak lanjut pembelajaran dan kompetensi siswa.

Sekolah merupakan bagian dari lembaga pendidikan yang secara teknis diatur oleh Departemen Pendidikan dan Kebudayaan; dalam hal ini sekolah berperan penting sebagai pelaksana kegiatan pembelajaran yang secara keseluruhan melibatkan para guru dan siswanya. Pada setiap kegiatan akhir belajar mengajar harus diadakan evaluasi untuk mengukur keberhasilan siswa, melalui ulangan harian, ulangan umum, juga melalui ujian akhir masa belajar sekolah, sedangkan evaluasi yang bahan naskah soalnya ditentukan oleh Departemen Pendidikan disebut Ujian Sekolah. Begitu pula di {sekolah}, pada akhir tahun pelajaran {tapel} bagi siswa dan siswi kelas VI dilakukan Ujian Akhir yang disebut Ujian Sekolah sebagai persyaratan untuk memasuki jenjang pendidikan berikutnya.

Dalam rangka melaksanakan Peraturan Kepala Badan Standar, Kurikulum, dan Asesmen Pendidikan Nomor: 013/H/PG.00/2022 tentang Prosedur Operasional Standar Penyelenggaraan Asesmen Nasional pada tahun 2022 dan Surat Keputusan Kepala Dinas Pendidikan Kabupaten {kabupaten} di satuan pendidikan, maka demi kelancaran pelaksanaan ujian, {sekolah} melaksanakan persiapan-persiapan menjelang pelaksanaan Asesmen Sekolah tersebut.

Pelaksanaan kegiatan telah diatur sedemikian rupa agar pelaksanaan Asesmen yang diputuskan di {sekolah}, di mana sistem pelaksanaan Asesmen melibatkan Guru/Wali Kelas, Panitia dan Orang Tua demi menjaga netralitas selama kegiatan Asesmen berlangsung, sesuai dengan kesepakatan Kepala Sekolah, Panitia, dan orang tua wali murid kelas VI.`,

  dasar: `Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional
Peraturan Pemerintah Nomor 19 Tahun 2005 sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 32 Tahun 2013 tentang Perubahan Atas Peraturan Pemerintah Nomor 19 Tahun 2005 tentang Standar Nasional Pendidikan
Permendikbud Nomor 21 Tahun 2016 tentang Standar Isi Pendidikan Dasar dan Menengah
Permendikbud Nomor 22 Tahun 2016 tentang Standar Proses Pendidikan Dasar dan Menengah
Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 17 Tahun 2021 tentang Asesmen Nasional (Berita Negara Republik Indonesia Tahun 2021 Nomor 832)
Peraturan Kepala Badan Standar, Kurikulum, dan Asesmen Pendidikan Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 030/H/PG.00/2021 tentang Prosedur Operasional Standar Penyelenggaraan Asesmen Nasional Tahun 2021
Surat Keputusan Kepala Dinas Pendidikan dan Kebudayaan Kabupaten {kabupaten} {sk}
Rapat Koordinasi Staf bersama Kepala Sekolah pada hari {rakor}`,

  maksud: `Agar pelaksanaan ujian sekolah berstandar nasional dapat dilaksanakan secara terarah dan efektif sesuai dengan ketentuan yang ditetapkan
Untuk dijadikan sebagai pedoman bagi para pelaksana di dalam melaksanakan tugas masing-masing
Untuk dijadikan sebagai tolok ukur keberhasilan panitia di dalam pelaksanaan tugasnya
Memudahkan monitoring bagi yang berkepentingan
Sebagai bahan pertimbangan untuk kegiatan Ujian Sekolah di tahun-tahun yang akan datang`,

  sasaranUmum: `Terlaksananya penyelenggaraan Ujian Sekolah Berstandar Nasional tahun pelajaran {tapel} di {sekolah} dengan aman, tertib, lancar dan tepat waktu penyelesaiannya.`,

  sasaranKhusus: `Panitia Ujian Sekolah dapat melaksanakan tugas sesuai program dari mulai tahap persiapan sampai tahap pelaporan
Peserta Ujian Sekolah dapat mengerjakan tugas praktik dan soal-soal ujian dengan baik, dan dapat meningkatkan sikap disiplin yang tinggi
Para penguji praktik, pengawas silang dan pemeriksa lembar jawaban ujian dapat melaksanakan tugasnya dengan baik sesuai ketentuan yang diharapkan
Dalam pelaporan dan pengolahan nilai, hasil kerja panitia dapat diselesaikan dengan cermat dan tepat waktu sesuai ketentuan yang berlaku`,

  tugas: `## Kepala Sekolah
Bertanggung jawab atas penyelenggaraan kegiatan Ujian Sekolah
Merencanakan, melaksanakan, memeriksa, dan melaporkan pelaksanaan Ujian Sekolah
Menetapkan dan mengangkat petugas-petugas yang membantu penyelenggaraan Ujian Sekolah
Mengoordinasi dan mengatur segala kegiatan yang dilakukan oleh panitia sesuai dengan ketentuan yang telah diprogramkan
Mengawasi dan mengendalikan pelaksanaannya
Melaporkan segala kegiatan pelaksanaan Ujian Sekolah dari perencanaan sampai kepada pelaporan
## Sekretaris
### a. Tahap Persiapan
Penyusunan program kerja
Pendataan peserta ujian
Penyusunan peserta setiap ruangan
Penyiapan kartu peserta
Pembuatan blangko instrumen ujian
Mempersiapkan penataan ruang ujian dan ruang panitia
Pengetikan perangkat instrumen yang dibutuhkan dalam kegiatan ujian, sampai kepada instrumen peserta
### b. Tahap Ujian Praktik
Melaksanakan ujian praktik mata pelajaran Pendidikan Agama, Bahasa Indonesia, IPA, Seni Budaya dan Keterampilan, PJOK, Pendidikan Budi Pekerti, dan Bahasa Inggris
Menyusun dan merekap nilai hasil ujian praktik untuk dijadikan bahan pertimbangan nilai akhir hasil ujian
### c. Tahap Pelaksanaan
Pelaksanaan Ujian Sekolah
Menyimpan lembar jawaban Ujian Sekolah sementara untuk diperiksa oleh para pemeriksa
Mengambil naskah soal ujian ke panitia ujian tingkat kecamatan
Menyerahkan naskah soal bekas pakai dan lembar jawaban hasil ujian dari pengawas ruangan
Menyerahkan lembar jawaban ujian kepada Sub Rayon
### d. Tahap Pemeriksaan
Mengawasi kegiatan pemeriksaan hasil Ujian Sekolah
Memeriksa hasil pelaksanaan tugas para pemeriksa ujian
Memandu penulisan nilai hasil ujian tulis dan ujian praktik ke dalam format daftar pengolahan nilai untuk diproses kelulusannya
Memandu penganalisaan hasil ujian
Memandu perhitungan daya serap hasil Ujian Sekolah
### e. Tahap Pelaporan
Mempersiapkan bahan-bahan untuk pelaporan
Menyusun pelaporan kegiatan Ujian Sekolah
## Bendahara
Mempelajari anggaran kegiatan ujian
Mengkalkulasikan segala pembiayaan yang telah dianggarkan`,

  pengawas: `Tiga puluh menit sebelum ujian dimulai, Pengawas Ruang telah hadir di lokasi sekolah/madrasah penyelenggara
Pengawas Ruang menerima penjelasan dan pengarahan dari Ketua Penyelenggara
Pengawas Ruang menerima bahan Ujian Sekolah (US) yang berupa amplop naskah soal, amplop lembar jawaban, dan daftar hadir
Pengawas Ruang masuk ke dalam ruang dua puluh (20) menit sebelum waktu pelaksanaan dan memeriksa kesiapan ruang ujian
Pengawas Ruang mempersilakan peserta untuk memasuki ruang dan menempati tempat duduk sesuai nomor yang telah ditentukan
Pengawas Ruang memeriksa setiap peserta agar tidak membawa tas, buku atau catatan lain, alat komunikasi elektronik, kalkulator dan sebagainya ke dalam ruang ujian kecuali alat tulis yang akan dipergunakan
Pengawas Ruang membacakan Tata Tertib Ujian Sekolah (US)
Pengawas Ruang meminta peserta ujian menandatangani daftar hadir Ujian Sekolah (US)
Pengawas Ruang membagikan lembar jawaban kepada peserta, serta memandu dan memeriksa pengisian identitas peserta (nomor ujian, nama, tanggal lahir, dan tanda tangan) sebelum waktu Ujian Sekolah (US) dimulai
Setelah seluruh peserta selesai mengisi identitas, Pengawas Ruang membuka amplop soal, memeriksa kelengkapan bahan ujian, dan meyakinkan bahwa amplop tersebut dalam keadaan baik dan tertutup rapat, disaksikan oleh peserta ujian
Pengawas Ruang membagikan naskah soal dengan cara meletakkan di atas meja peserta dalam posisi tertutup (terbalik). Peserta tidak diperkenankan menyentuhnya sampai tanda waktu ujian dimulai
Pengawas Ruang mengecek kelengkapan soal Ujian Sekolah (US)
Setelah tanda waktu mengerjakan dimulai, Pengawas Ruang mempersilakan peserta untuk mulai mengerjakan soal dan mengingatkan peserta agar terlebih dahulu membaca petunjuk cara menjawab soal
Kelebihan naskah soal US selama ujian berlangsung tetap disimpan di ruang ujian
Selama Ujian Sekolah (US) berlangsung, Pengawas Ruang wajib menjaga ketertiban dan ketenangan suasana sekitar ruang ujian, memberi peringatan dan sanksi kepada peserta yang melakukan kecurangan, serta melarang orang lain yang tidak berkepentingan memasuki ruang ujian
Pengawas Ruang dilarang memberi isyarat, petunjuk dan bantuan apa pun kepada peserta berkaitan dengan jawaban dari soal Ujian Sekolah (US) yang diujikan
Lima menit sebelum waktu Ujian Sekolah (US) selesai, Pengawas Ruang memberi peringatan kepada peserta bahwa waktu tinggal lima menit
Setelah waktu Ujian Sekolah (US) selesai, Pengawas Ruang mempersilakan peserta untuk berhenti mengerjakan soal, mengumpulkan lembar jawaban dan naskah soal. Peserta dipersilakan meninggalkan ruang ujian setelah pengawas menghitung jumlah lembar jawaban sama dengan jumlah peserta ujian
Pengawas Ruang menyusun secara urut lembar jawaban dari nomor peserta terkecil dan memasukkannya ke dalam amplop semula
Pengawas Ruang menyerahkan amplop lembar jawaban dan naskah soal Ujian Sekolah (US) beserta kelengkapan lainnya kepada Penyelenggara`,

  us: `Ujian sekolah dilaksanakan pada tanggal {us} dengan pengawasan masing-masing oleh 2 orang pengawas (bukan guru kelas VI), dengan naskah soal yang telah disiapkan penyusunannya mulai dari kisi-kisi, kartu soal, dan penggandaan oleh sekolah.`,

  praktik: `Ujian sekolah praktik dilaksanakan pada tanggal {praktik} mulai pukul 07.30 sampai selesai, dengan teknik pengujian masing-masing mata pelajaran diuji oleh 2 orang penguji tiap ruang ujian. Penilaian dilakukan dengan angka dua digit di belakang koma. Setiap hari masing-masing penguji melaporkan hasil penilaiannya kepada panitia. Selanjutnya panitia menggabungkan nilai dari masing-masing penguji dengan dua pembagian yang langsung dimasukkan ke dalam format daftar nilai. Setiap hari penguji praktik harus membuat berita acara penyelenggaraan ujian praktik dengan melampirkan daftar hadir peserta dan naskah materi ujian.`,

  hasil: `Pelaksanaan Ujian Sekolah berlangsung dengan tertib, aman dan lancar serta tidak ditemukan hal-hal yang dapat mengganggu terselenggaranya ujian dimaksud.`,

  kelulusan: ``,

  pembiayaan: `Pembiayaan penyelenggaraan Ujian Sekolah di {sekolah}, Desa {desa}, Kecamatan {kecamatan}, Kabupaten {kabupaten}, Provinsi {provinsi}, bersumber dari Bantuan Operasional Satuan Pendidikan (BOSP) Semester 2 Tahun {tahun} dan dibantu oleh orang tua murid secara sukarela.`,

  hambatan: `Dalam pelaksanaan kegiatan Asesmen Sekolah pada siswa kelas VI Tahun Pelajaran {tapel} di {sekolah}, Desa {desa}, Kecamatan {kecamatan}, Kabupaten {kabupaten}, tidak terdapat kendala dalam proses Asesmen berlangsung, sehingga pelaksanaan Asesmen Sekolah pada tanggal {us} berjalan dengan baik dan lancar tanpa ada hambatan apa pun.`,

  kesimpulan: `Program kerja ini dibuat untuk dipergunakan sebagai pedoman kerja bagi panitia dan pelaksana kegiatan ujian sekolah sesuai aturan yang berlaku. Berhasil tidaknya pencapaian sasaran dan tujuan sebagaimana yang telah diprogramkan tergantung pada peran seluruh pelaksana yang terlibat dengan sikap, tekad, kemauan, kemampuan, dan tanggung jawab untuk melaksanakan tugas dengan sebaik-baiknya. Keberhasilan pelaksanaan ujian dengan aman, nyaman, lancar, tertib dan terkendali bergantung pada sejauh mana pelaksanaan program yang telah direncanakan dan dilaksanakan. Menyadari hal itu semua, program kerja ini dapat berdaya guna dan berhasil secara efektif dan efisien bergantung pada koordinasi dan sinkronisasi berbagai pihak yang bertanggung jawab tentang pelaksanaan ujian sekolah.`,

  saran: `Kami sangat mengharapkan adanya kerja sama yang sinergis dari berbagai pihak yang berkepentingan demi suksesnya pelaksanaan ujian sekolah di tingkat sekolah dasar. Oleh karena itu, kritik dan saran yang membangun akan kami terima dengan lapang dada demi program kegiatan ujian selanjutnya yang lebih baik.`,

  lampiran: `SK Ujian Sekolah
Jadwal US
Tata Tertib Peserta US
Tata Tertib Pengawas Ruang US
Daftar Hadir Siswa
Daftar Hadir Pengawas
Denah Tempat Duduk Siswa
Berita Acara Kegiatan US
Pakta Integritas Pengawas US
Foto Kegiatan US
Undangan Rapat Kelulusan Satuan Pendidikan
Daftar Hadir Rapat Kelulusan Satuan Pendidikan
Notulen Rapat Kelulusan Satuan Pendidikan
Berita Acara Rapat Kelulusan Satuan Pendidikan
SK Kelulusan dari Satuan Pendidikan
Undangan Pengumuman Kelulusan Peserta Didik
Daftar Hadir Pengumuman Kelulusan
Surat Keterangan Lulus Satuan Pendidikan
Laporan Kelulusan Kilat
Daftar Nilai Akhir Kelas 6
SKHUS`,
}

// Bentuk & jumlah butir soal per mapel (indeks sama dengan MAPEL).
const BUTIR_AWAL = () =>
  MAPEL.map((_, i) => {
    const awal = [[40, 5], [40, 5], [35, 5], [30, 5], [40, 5], [40, 5]][i]
    return awal
      ? { pg: String(awal[0]), uraian: String(awal[1]), waktu: '120 Menit' }
      : { pg: '', uraian: '', waktu: '' }
  })

const DAFTAR_ISI = [
  ['KATA PENGANTAR', 0],
  ['DAFTAR ISI', 0],
  ['BAB I PENDAHULUAN', 0],
  ['- Dasar', 1],
  ['- Maksud dan Tujuan', 1],
  ['- Sasaran', 1],
  ['BAB II PERSIAPAN PENYELENGGARAAN UJIAN SEKOLAH', 0],
  ['- Organisasi Penyelenggaraan', 1],
  ['- Tugas Panitia', 1],
  ['- Pengawas Ruang', 1],
  ['BAB III PENYELENGGARAAN UJIAN SEKOLAH', 0],
  ['- Penyelenggaraan', 1],
  ['- Hasil Pelaksanaan dan Evaluasi', 1],
  ['- Kelulusan Hasil', 1],
  ['BAB IV PEMBIAYAAN', 0],
  ['BAB V HAMBATAN DAN USAHA PENANGGULANGAN', 0],
  ['BAB VI PENUTUP', 0],
  ['- Kesimpulan', 1],
  ['- Saran', 1],
  ['LAMPIRAN-LAMPIRAN', 0],
]

const BLOK_EDIT = [
  ['pengantar', 'Kata Pengantar', 10],
  ['pendahuluan', 'Bab I — Pendahuluan (baris kosong = paragraf baru)', 14],
  ['dasar', 'Bab I — Dasar (satu baris = satu butir)', 10],
  ['maksud', 'Bab I — Maksud dan Tujuan', 6],
  ['sasaranUmum', 'Bab I — Sasaran Umum', 3],
  ['sasaranKhusus', 'Bab I — Sasaran Khusus', 6],
  ['tugas', 'Bab II — Tugas Panitia (## = judul, ### = sub-judul)', 16],
  ['pengawas', 'Bab II — Tugas Pengawas Ruang', 16],
  ['us', 'Bab III — Pelaksanaan Ujian Sekolah', 4],
  ['praktik', 'Bab III — Pelaksanaan Ujian Praktik', 6],
  ['hasil', 'Bab III — Hasil Pelaksanaan dan Evaluasi', 3],
  ['kelulusan', 'Bab III — Kelulusan Hasil (catatan tambahan; ringkasan angka otomatis dari Lembar 3)', 3],
  ['pembiayaan', 'Bab IV — Pembiayaan', 3],
  ['hambatan', 'Bab V — Hambatan dan Usaha Penanggulangan', 4],
  ['kesimpulan', 'Bab VI — Kesimpulan', 6],
  ['saran', 'Bab VI — Saran', 3],
  ['lampiran', 'Lampiran-lampiran', 12],
]

export default function LaporanAsesmenSekolah() {
  const { sekolahId: sekolahIdCtx, profil } = useAuth()
  const sekolahId = sekolahIdCtx || profil?.sekolah_id

  const [tabAktif, setTabAktif] = useState('laporan')
  const [cetakSemua, setCetakSemua] = useState(false)

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [logoSekolahUrl, setLogoSekolahUrl] = useState('')
  const [logoKabupatenUrl, setLogoKabupatenUrl] = useState('')

  // Peserta Kelas 6 yang sudah punya No. Peserta (untuk isi otomatis jumlah).
  const [peserta, setPeserta] = useState([])
  const [memuatSiswa, setMemuatSiswa] = useState(true)
  const [galatSiswa, setGalatSiswa] = useState('')
  const [infoIsi, setInfoIsi] = useState('')

  // Siswa Kelas 6 aktif (dasar penghitungan nilai) & status penarikan nilai.
  const [siswaK6, setSiswaK6] = useState([])
  const [memuatNilai, setMemuatNilai] = useState(false)
  const [infoNilai, setInfoNilai] = useState('')

  // Daftar guru sekolah yang sedang login (untuk mengisi Susunan Panitia).
  const [guruList, setGuruList] = useState([])
  const [infoGuru, setInfoGuru] = useState('')

  // Jadwal pengawas (hanya untuk mengambil tanggal & mapel Lembar 4).
  const [sesiJadwal, setSesiJadwal] = useState([])
  const [sesiTerpilih, setSesiTerpilih] = useState('')
  const sudahOtomatis = useRef(false)

  const [form, setForm] = useState({
    kabupaten: '',
    dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    kecamatan: '',
    alamat: '',
    rayon: '',
    subRayon: '',
    tapel: tahunPelajaranSekarang(),
    kkm: '70',
    tempat: '',
    tanggalLaporan: isoHariIni(),
    kepalaNama: '',
    kepalaNip: '',
    telepon: '',
    tanggalUjian: isoHariIni(),
    mapelUjian: '',
  })

  const [nilai, setNilai] = useState(barisNilai)
  const [klas, setKlas] = useState(barisKlasifikasi)
  const [lulus, setLulus] = useState(barisKelulusan)
  const [pen, setPen] = useState(barisPenyelenggara)

  // Tab Laporan: isian & teks laporan lengkap (Kata Pengantar s.d. Lampiran).
  const [lap, setLap] = useState(() => ({
    desa: '',
    provinsi: '',
    skNomor: '',
    skTanggal: '',
    rakorTanggal: '',
    usMulai: '',
    usSelesai: '',
    prMulai: '',
    prSelesai: '',
    panitia: PANITIA_AWAL,
    teks: { ...TEKS_AWAL },
    butir: BUTIR_AWAL(),
  }))

  async function muat() {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, profRes] = await Promise.all([
        ambilProfilSekolah(sekolahId),
        supabase
          .from('profil_sekolah')
          .select('*')
          .eq('sekolah_id', sekolahId)
          .maybeSingle(),
      ])
      const prof = profRes?.data || {}
      const s = ps.sekolah || {}
      setLogoSekolahUrl(urlLogo(prof.logo_path))
      setLogoKabupatenUrl(urlLogo(prof.logo_kabupaten_path))
      setSekolah(s)
      setLap((l) => ({
        ...l,
        provinsi: l.provinsi || prof.provinsi || '',
        desa: l.desa || ((prof.alamat || '').match(/desa\s+([^,.\n]+)/i)?.[1] || '').trim(),
      }))
      setForm((f) => ({
        ...f,
        kabupaten: f.kabupaten || prof.kabupaten || '',
        dinas: prof.dinas_pendidikan || f.dinas,
        kecamatan: f.kecamatan || prof.kecamatan || '',
        alamat: f.alamat || prof.alamat || '',
        // Kepala sekolah, NIP, telepon & tempat TTD diambil dari profil_sekolah
        // (kolom kepala_sekolah, nip_kepala_sekolah, tempat_ttd; telepon dicari dari
        // kolom yang namanya memuat telp/telepon/hp/phone).
        kepalaNama:
          f.kepalaNama || prof.kepala_sekolah || s.kepala_sekolah || s.nama_kepala_sekolah || s.kepala || '',
        kepalaNip:
          f.kepalaNip ||
          prof.nip_kepala_sekolah ||
          cariKolom(prof, /nip.*(kepala|kepsek)|(kepala|kepsek).*nip/i) ||
          s.nip_kepala_sekolah || s.nip_kepala || s.nip_kepsek || '',
        telepon: f.telepon || cariKolom(prof, /telp|telepon|(^|_)hp($|_)|phone/i) || cariKolom(s, /telp|telepon|(^|_)hp($|_)|phone/i),
        tempat: f.tempat || prof.tempat_ttd || '',
      }))
    } catch (e) {
      console.error('Gagal memuat data Laporan Asesmen:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  async function muatSiswa() {
    if (!sekolahId) {
      setMemuatSiswa(false)
      return
    }
    setMemuatSiswa(true)
    setGalatSiswa('')
    try {
      const { data, error } = await supabase
        .from('siswa')
        .select('id, no_peserta_ujian, status, kelas(nama_kelas)')
        .eq('sekolah_id', sekolahId)

      if (error) throw error

      // Jenis kelamin dibaca terpisah: kalau kolomnya tidak ada, tidak merusak daftar.
      let jkPerId = {}
      try {
        const { data: jk, error: errJk } = await supabase
          .from('siswa')
          .select('id, jenis_kelamin')
          .eq('sekolah_id', sekolahId)
        if (!errJk) (jk || []).forEach((r) => { jkPerId[r.id] = String(r.jenis_kelamin || '').trim().toUpperCase() })
      } catch {
        jkPerId = {}
      }

      const jkDari = (id) => {
        const j = jkPerId[id] || ''
        return j.startsWith('L') ? 'L' : j.startsWith('P') ? 'P' : ''
      }
      const kelas6 = (data || []).filter((s) => isKelas6(s.kelas?.nama_kelas))
      setPeserta(kelas6.filter(sudahTerdaftarPeserta).map((s) => ({ id: s.id, jk: jkDari(s.id) })))
      // Dasar nilai asesmen: semua siswa Kelas 6 yang aktif (sama dengan halaman Nilai Asesmen).
      setSiswaK6(
        kelas6
          .filter((s) => !s.status || String(s.status).toLowerCase() === 'aktif')
          .map((s) => ({ id: s.id, jk: jkDari(s.id) }))
      )
    } catch (e) {
      console.error('Gagal memuat peserta untuk Laporan Asesmen:', e)
      setGalatSiswa(e?.message || 'Data siswa tidak dapat dibaca.')
      setPeserta([])
      setSiswaK6([])
    } finally {
      setMemuatSiswa(false)
    }
  }

  // Data guru milik sekolah yang sedang login (difilter sekolah_id, jadi data
  // sekolah lain tidak pernah ikut). Nama dicari dari kolom nama_lengkap / nama /
  // kolom pertama yang berawalan "nama".
  async function muatGuru() {
    if (!sekolahId) return
    try {
      const { data, error } = await supabase.from('guru').select('*').eq('sekolah_id', sekolahId)
      if (error) throw error
      const daftar = (data || [])
        .map((g) => ({
          id: g.id,
          nama: String(g.nama_lengkap || g.nama || cariKolom(g, /^nama/i) || '').trim(),
        }))
        .filter((g) => g.nama)
        .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
      setGuruList(daftar)
      setInfoGuru(daftar.length ? '' : 'Belum ada data guru untuk sekolah ini.')
    } catch (e) {
      console.error('Gagal memuat data guru:', e)
      setGuruList([])
      setInfoGuru(`Data guru belum bisa dibaca (${e?.message || 'galat tidak diketahui'}).`)
    }
  }

  // Isi baris panitia yang masih kosong, urut dari daftar guru (Kepala Sekolah dilewati).
  // Baris yang sudah terisi (termasuk Penanggung Jawab {kepsek}) tidak ditimpa.
  function isiPanitiaDariGuru() {
    const kepsek = String(form.kepalaNama || '').trim().toLowerCase()
    const pool = guruList.filter((g) => g.nama.toLowerCase() !== kepsek)
    setLap((l) => {
      let k = 0
      const baris = l.panitia.split('\n').map((b) => {
        const [j, ...n] = b.split('|')
        const sisa = n.join('|').trim()
        if (!(j || '').trim() || sisa) return b
        const g = pool[k++]
        return g ? `${j.trim()} | ${g.nama}` : b
      })
      return { ...l, panitia: baris.join('\n') }
    })
  }

  // Pilih guru untuk satu baris panitia lewat dropdown.
  function setNamaPanitia(idx, nama) {
    setLap((l) => {
      const baris = l.panitia.split('\n')
      const [j] = (baris[idx] || '').split('|')
      baris[idx] = `${(j || '').trim()} | ${nama}`
      return { ...l, panitia: baris.join('\n') }
    })
  }

  useEffect(() => {
    muat()
    muatSiswa()
    muatGuru()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  // Jadwal pengawas -> sumber tanggal & mapel Lembar 4.
  useEffect(() => {
    let batal = false
    sudahOtomatis.current = false
    if (!sekolahId) return undefined
    ;(async () => {
      const t = await muatJadwalPengawas(sekolahId)
      if (!batal) setSesiJadwal(ratakanSesiJadwal(t))
    })()
    return () => { batal = true }
  }, [sekolahId])

  function terapkanSesi(s, { timpa }) {
    setForm((f) => ({
      ...f,
      tanggalUjian: s.tanggal || f.tanggalUjian,
      mapelUjian: timpa ? s.mapel || '' : f.mapelUjian || s.mapel || '',
    }))
  }

  useEffect(() => {
    if (sudahOtomatis.current || sesiJadwal.length === 0) return
    sudahOtomatis.current = true
    const hariIni = isoHariIni()
    const pilih =
      sesiJadwal.find((s) => s.tanggal === hariIni) ||
      sesiJadwal.find((s) => s.tanggal >= hariIni) ||
      sesiJadwal[0]
    setSesiTerpilih(pilih.key)
    terapkanSesi(pilih, { timpa: false })
  }, [sesiJadwal])

  // Rentang tanggal Ujian Sekolah (tab Laporan) diambil dari jadwal pengawas
  // kalau belum diisi: tanggal paling awal s.d. paling akhir.
  useEffect(() => {
    if (sesiJadwal.length === 0) return
    const tgl = sesiJadwal.map((s) => s.tanggal).filter(Boolean).sort()
    if (tgl.length === 0) return
    setLap((l) => ({ ...l, usMulai: l.usMulai || tgl[0], usSelesai: l.usSelesai || tgl[tgl.length - 1] }))
  }, [sesiJadwal])

  const pilihSesi = (e) => {
    const key = e.target.value
    setSesiTerpilih(key)
    const s = sesiJadwal.find((x) => x.key === key)
    if (s) terapkanSesi(s, { timpa: true })
  }

  // --- Tarik nilai dari Nilai Asesmen (tabel nilai_ijazah) ---
  async function tarikNilai() {
    setMemuatNilai(true)
    setInfoNilai('')
    try {
      const tp = String(form.tapel || '').trim()
      const { data, error } = await supabase.from('nilai_ijazah').select('*').eq('tahun_pelajaran', tp)
      if (error) throw error

      const siswaPerId = new Map(siswaK6.map((s) => [s.id, s]))
      const baris = (data || []).filter((r) => siswaPerId.has(r.siswa_id))
      if (baris.length === 0) {
        setInfoNilai(`Belum ada nilai Kelas 6 untuk tahun pelajaran ${tp || '…'} di halaman Nilai Asesmen.`)
        return
      }

      const kkm = num(form.kkm) || 70
      const totL = siswaK6.filter((s) => s.jk === 'L').length
      const totP = siswaK6.filter((s) => s.jk === 'P').length
      const adaJk = totL + totP > 0
      const kunci = kunciPerMapel()

      const updNilai = {}
      const updKlas = {}
      const updLulus = {}
      const cocok = []
      const belum = []

      MAPEL.forEach((nama, i) => {
        const k = kunci[i]
        if (!k) { belum.push(nama.replace('*)', '')); return }
        const vals = baris
          .map((r) => ({ v: r[k] === '' ? null : Number(r[k]), jk: siswaPerId.get(r.siswa_id).jk }))
          .filter((x) => x.v !== null && !Number.isNaN(x.v))
        if (vals.length === 0) { belum.push(nama.replace('*)', '')); return }
        cocok.push(nama.replace('*)', ''))

        const semua = vals.map((x) => x.v)
        const rata = semua.reduce((a, b) => a + b, 0) / semua.length
        const praktik = MAPEL_PRAKTIK.includes(i)
        const pre = praktik ? 'p' : 't'
        updNilai[i] = {
          jml: String(vals.length),
          [`${pre}Tinggi`]: fmt(Math.max(...semua)),
          [`${pre}Rendah`]: fmt(Math.min(...semua)),
          [`${pre}Rata`]: fmt(rata),
        }

        const bucket = KLASIFIKASI.map(() => 0)
        vals.forEach((x) => { bucket[indeksKlasifikasi(x.v)] += 1 })
        updKlas[i] = bucket.map((b) => (b > 0 ? String(b) : ''))

        const hadL = vals.filter((x) => x.jk === 'L').length
        const hadP = vals.filter((x) => x.jk === 'P').length
        const lulusL = vals.filter((x) => x.jk === 'L' && x.v >= kkm).length
        const lulusP = vals.filter((x) => x.jk === 'P' && x.v >= kkm).length
        updLulus[i] = adaJk
          ? {
              tdL: String(totL), tdP: String(totP),
              hdL: String(hadL), hdP: String(hadP),
              lL: String(lulusL), lP: String(lulusP),
              tlL: String(hadL - lulusL), tlP: String(hadP - lulusP),
            }
          : {}
      })

      setNilai((arr) => arr.map((r, i) => (updNilai[i] ? { ...r, ...updNilai[i] } : r)))
      setKlas((arr) => arr.map((r, i) => (updKlas[i] ? { ...r, k: updKlas[i] } : r)))
      setLulus((arr) => arr.map((r, i) => (updLulus[i] ? { ...r, ...updLulus[i] } : r)))

      setInfoNilai(
        `Tertarik dari Nilai Asesmen: ${baris.length} siswa, ${cocok.length} mapel terisi.` +
          (belum.length ? ` Belum ada nilainya (isi manual bila perlu): ${belum.join(', ')}.` : '') +
          (adaJk ? '' : ' Jumlah L/P belum terbaca dari data siswa, jadi Lembar 3 isi manual.')
      )
    } catch (e) {
      console.error('Gagal menarik nilai asesmen:', e)
      setInfoNilai(`Nilai belum bisa dibaca (${e?.message || 'galat tidak diketahui'}).`)
    } finally {
      setMemuatNilai(false)
    }
  }

  // Otomatis: begitu data siswa termuat (dan tiap kali tahun pelajaran / KKM
  // berubah), tarik nilai terbaru. Ditunda sebentar supaya tidak jalan per ketikan.
  useEffect(() => {
    if (memuatSiswa || siswaK6.length === 0) return undefined
    const t = setTimeout(() => { tarikNilai() }, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memuatSiswa, siswaK6, form.tapel, form.kkm])

  const ubah = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // --- Pengubah sel tabel ---
  const setSel = (setter, idx, key) => (e) => {
    const v = e.target.value
    setter((arr) => arr.map((r, i) => (i === idx ? { ...r, [key]: v } : r)))
  }
  const setKlasSel = (idx, kidx) => (e) => {
    const v = e.target.value
    setKlas((arr) =>
      arr.map((r, i) => (i === idx ? { ...r, k: r.k.map((x, j) => (j === kidx ? v : x)) } : r))
    )
  }
  const setPenBaris = (baris, key) => (e) => {
    const v = e.target.value
    setPen((p) => ({ ...p, [baris]: { ...p[baris], [key]: v } }))
  }
  const setMasalah = (idx, key) => (e) => {
    const v = e.target.value
    setPen((p) => ({
      ...p,
      masalah: p.masalah.map((r, i) => (i === idx ? { ...r, [key]: v } : r)),
    }))
  }

  // --- Isi otomatis dari data siswa ---
  const totalPeserta = peserta.length
  const totalL = peserta.filter((p) => p.jk === 'L').length
  const totalP = peserta.filter((p) => p.jk === 'P').length
  const adaJk = totalL + totalP > 0

  function isiDariSiswa() {
    if (totalPeserta === 0) {
      setInfoIsi('Belum ada siswa Kelas 6 yang punya No. Peserta Ujian.')
      return
    }
    const t = String(totalPeserta)
    setNilai((arr) => arr.map((r) => ({ ...r, jml: t })))
    setPen((p) => ({ ...p, penyelenggara: { ...p.penyelenggara, terdaftar: t, mengikuti: t, hadir: t } }))
    if (adaJk) {
      setLulus((arr) =>
        arr.map((r) => ({ ...r, tdL: String(totalL), tdP: String(totalP), hdL: String(totalL), hdP: String(totalP) }))
      )
      setInfoIsi(`Terisi: ${totalPeserta} peserta (L ${totalL}, P ${totalP}). Periksa lagi, lalu lengkapi nilainya.`)
    } else {
      setInfoIsi(
        `Terisi: ${totalPeserta} peserta. Jumlah L/P belum terbaca dari data siswa, isi manual di Lembar 3.`
      )
    }
  }

  // --- Total yang dihitung otomatis ---
  const jmlKlasPerBaris = useMemo(
    () =>
      klas.map((r, i) => {
        const s = jumlah(...r.k)
        return s !== '' && s !== '0' ? s : nilai[i].jml
      }),
    [klas, nilai]
  )
  const totalKlasPerKolom = KLASIFIKASI.map((_, j) => jumlah(...klas.map((r) => r.k[j])))
  const totalKlasSemua = jumlah(...jmlKlasPerBaris)

  const totalPen = {
    terdaftar: jumlah(pen.penyelenggara.terdaftar, pen.bergabung.terdaftar),
    mengikuti: jumlah(pen.penyelenggara.mengikuti, pen.bergabung.mengikuti),
    hadir: jumlah(pen.penyelenggara.hadir, pen.bergabung.hadir),
    tidakHadir: jumlah(pen.penyelenggara.tidakHadir, pen.bergabung.tidakHadir),
  }

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tglTtd = `${isi(form.tempat, '…………')}, ${isi(tanggalPanjang(form.tanggalLaporan), '…………')}`

  // --- Data untuk tab Laporan (Kata Pengantar s.d. Lampiran) ---
  const bersihkan = (s, awalan) => String(s || '').replace(awalan, '').trim()
  const tokens = {
    sekolah: judulSekolah(sekolah.nama),
    kecamatan: judulKata(bersihkan(form.kecamatan, /^(kecamatan\s+)+/i)),
    kabupaten: judulKata(bersihkan(form.kabupaten, /^(pemerintah\s+)?(kabupaten\s+)+/i)),
    provinsi: judulKata(bersihkan(lap.provinsi, /^provinsi\s+/i)),
    desa: judulKata(bersihkan(lap.desa, /^desa\s+/i)),
    tapel: form.tapel,
    tahun: form.tanggalLaporan ? form.tanggalLaporan.slice(0, 4) : '',
    kepsek: form.kepalaNama,
    us: rentangTanggal(lap.usMulai, lap.usSelesai),
    praktik: rentangTanggal(lap.prMulai, lap.prSelesai),
    sk:
      lap.skNomor || lap.skTanggal
        ? `Nomor ${lap.skNomor || '…………'} tanggal ${tanggalPanjang(lap.skTanggal) || '…………'}`
        : '',
    rakor: hariTanggalPanjang(lap.rakorTanggal),
  }
  const T = (s) => isiTemplate(s, tokens)
  const panitiaBaris = lap.panitia
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [j, ...n] = x.split('|')
      // Nama yang masih kosong tampil sebagai titik-titik (bukan baris kosong).
      return { jabatan: (j || '').trim(), nama: T(n.join('|').trim()) || '…………' }
    })
  const ketuaPanitia = panitiaBaris.find((p) => /^ketua/i.test(p.jabatan))?.nama || ''

  // Ringkasan kelulusan per mapel, otomatis dari Lembar 3 (kalau sudah terisi).
  const ringkasKelulusan = MAPEL.map((m, i) => {
    const r = lulus[i]
    const hadir = num(r.hdL) + num(r.hdP)
    const l = num(r.lL) + num(r.lP)
    const tl = num(r.tlL) + num(r.tlP)
    if (hadir === 0 && l === 0 && tl === 0) return null
    return `${m.replace('*)', '')}: ${hadir} peserta hadir, ${l} lulus, ${tl} tidak lulus`
  }).filter(Boolean)

  const ubahLap = (k) => (e) => setLap((l) => ({ ...l, [k]: e.target.value }))
  const ubahTeks = (k) => (e) => {
    const v = e.target.value
    setLap((l) => ({ ...l, teks: { ...l.teks, [k]: v } }))
  }
  const ubahButir = (i, k) => (e) => {
    const v = e.target.value
    setLap((l) => ({ ...l, butir: l.butir.map((b, j) => (j === i ? { ...b, [k]: v } : b)) }))
  }

  // --- Potongan tampilan yang dipakai berulang di tiap lembar ---
  const kop = (
    <div className="kop-surat flex items-center gap-3 border-b-2 border-slate-800 pb-3 mb-4">
      <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
        {logoKabupatenUrl && (
          <img src={logoKabupatenUrl} alt="Logo kabupaten" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}
      </div>
      <div className="flex-1 text-center">
        {form.kabupaten && <p className="font-bold uppercase tracking-wide">{form.kabupaten}</p>}
        {form.dinas && <p className="font-bold uppercase tracking-wide">{form.dinas}</p>}
        <p className="font-bold uppercase tracking-wide text-base">{namaSekolah}</p>
        {form.kecamatan && <p className="font-bold uppercase tracking-wide">Kecamatan {form.kecamatan.replace(/^(kecamatan\s+)+/i, '')}</p>}
        {form.alamat && <p className="italic text-[12px]">{form.alamat}</p>}
      </div>
      <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
        {logoSekolahUrl && (
          <img src={logoSekolahUrl} alt="Logo sekolah" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}
      </div>
    </div>
  )

  const judul = (
    <div className="judul-blok text-center mb-4">
      <p className="font-display text-base font-bold">Laporan Asesmen Sekolah</p>
      <p className="font-bold">Tahun Pelajaran {isi(form.tapel, '…………')}</p>
    </div>
  )

  const ttd = (
    <div className="ttd-blok mt-6 flex justify-end">
      <div className="w-64 text-center">
        <p>{tglTtd}</p>
        <p className="mb-14">Kepala Sekolah</p>
        <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
          {isi(form.kepalaNama, '…………')}
        </p>
        <p>NIP. {isi(form.kepalaNip, '…………')}</p>
      </div>
    </div>
  )

  const identitas = (opsi = {}) => (
    <div className="info-blok mb-3 space-y-0.5">
      <Baris label="Nama Sekolah" nilai={namaSekolah} />
      <Baris label="Alamat" nilai={isi(form.alamat, '…………')} />
      <Baris label="Kecamatan" nilai={isi(form.kecamatan, '…………')} />
      {opsi.rayon && (
        <Baris label="Rayon / Sub Rayon" nilai={`${form.rayon || '…………'} / ${form.subRayon || '…………'}`} />
      )}
      {opsi.kabupaten && <Baris label="Kabupaten" nilai={isi(form.kabupaten, '…………')} />}
    </div>
  )

  const kelasLembar = (id) => `lembar ${tabAktif === id ? 'aktif' : ''}`

  return (
    <Layout
      title="Laporan Asesmen Sekolah"
      subtitle="Empat lembar laporan asesmen Kelas 6 dalam satu halaman — pilih tab untuk berpindah lembar, siap cetak."
    >
      <style>{`
        @page { size: A4; margin: 12mm 14mm; }
        #area-cetak-laporan .lembar { display: none; }
        #area-cetak-laporan .lembar.aktif { display: block; }
        #area-cetak-laporan .sel-input {
          width: 100%; background: transparent; border: 0; outline: 0;
          text-align: center; padding: 2px 2px; font: inherit; min-width: 0;
        }
        #area-cetak-laporan .sel-input:hover { background: #f8fafc; }
        #area-cetak-laporan .sel-input:focus { background: #eff6ff; }
        #area-cetak-laporan .sel-kiri { text-align: left; }
        #area-cetak-laporan .teks-laporan { text-align: justify; }
        #area-cetak-laporan .halaman + .halaman {
          margin-top: 2rem; padding-top: 1.5rem; border-top: 1px dashed #cbd5e1;
        }
        #area-cetak-laporan .kop-logo img {
          position: static !important; float: none !important;
          display: block; max-width: 100%; max-height: 100%; object-fit: contain;
        }
        @media print {
          body * { visibility: hidden; }
          #area-cetak-laporan, #area-cetak-laporan * { visibility: visible; }
          #area-cetak-laporan {
            position: absolute; left: 0; top: 0; width: 100%;
            border: 0 !important; border-radius: 0 !important; padding: 0 !important;
            max-width: none !important; margin: 0 !important;
            font-family: 'Times New Roman', Times, serif;
            color: #000 !important;
          }
          #area-cetak-laporan.cetak-semua .lembar { display: block; page-break-after: always; break-after: page; }
          #area-cetak-laporan.cetak-semua .lembar:last-child { page-break-after: auto; break-after: auto; }
          #area-cetak-laporan .kop-surat { border-bottom-color: #000 !important; }
          #area-cetak-laporan .ttd-blok { page-break-inside: avoid; }
          #area-cetak-laporan * { color: #000 !important; }
          #area-cetak-laporan table { border-color: #000 !important; }
          #area-cetak-laporan th, #area-cetak-laporan td { border-color: #000 !important; }
          #area-cetak-laporan .sel-input::placeholder { color: transparent !important; }
          #area-cetak-laporan .sel-input:hover, #area-cetak-laporan .sel-input:focus { background: transparent; }

          /* === MODE SATU HALAMAN PER LEMBAR === */
          #area-cetak-laporan { font-size: 10.5pt !important; line-height: 1.3 !important; }
          #area-cetak-laporan .kop-surat { padding-bottom: 6px !important; margin-bottom: 8px !important; }
          #area-cetak-laporan .kop-logo { width: 60px !important; height: 60px !important; }
          #area-cetak-laporan .judul-blok { margin-bottom: 8px !important; }
          #area-cetak-laporan .info-blok { margin-bottom: 6px !important; }
          #area-cetak-laporan td, #area-cetak-laporan th { padding: 1px 3px !important; }
          #area-cetak-laporan .lembar.laporan .halaman { font-size: 11.5pt !important; line-height: 1.45 !important; }
          #area-cetak-laporan .halaman + .halaman {
            margin-top: 0 !important; padding-top: 0 !important; border-top: 0 !important;
            break-before: page; page-break-before: always;
          }
        }
      `}</style>

      <div className="no-print max-w-4xl mx-auto mb-5">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data belum bisa dibaca ({galat}).
          </div>
        )}
        {!memuatSiswa && galatSiswa && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data siswa belum bisa dibaca ({galatSiswa}). Jumlah peserta bisa diisi manual di tabel.
          </div>
        )}

        <Bagian judul="Identitas & kop surat" keterangan="Terisi otomatis dari Profil Sekolah; bisa diubah di sini. Berlaku untuk keempat lembar.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Pemerintah Kabupaten/Kota">
              <input className={inputCls} value={form.kabupaten} onChange={ubah('kabupaten')} placeholder="KABUPATEN …" />
            </Field>
            <Field label="Dinas">
              <input className={inputCls} value={form.dinas} onChange={ubah('dinas')} />
            </Field>
            <Field label="Kecamatan">
              <input className={inputCls} value={form.kecamatan} onChange={ubah('kecamatan')} placeholder="mis. Aru Utara Timur Batuley" />
            </Field>
            <Field label="Alamat sekolah">
              <input className={inputCls} value={form.alamat} onChange={ubah('alamat')} placeholder="Jl. …, Desa …" />
            </Field>
            <Field label="Rayon">
              <input className={inputCls} value={form.rayon} onChange={ubah('rayon')} />
            </Field>
            <Field label="Sub Rayon">
              <input className={inputCls} value={form.subRayon} onChange={ubah('subRayon')} />
            </Field>
            <Field label="Tahun pelajaran">
              <input className={inputCls} value={form.tapel} onChange={ubah('tapel')} placeholder="2025/2026" />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Tanda tangan" keterangan="Tempat, tanggal laporan, dan Kepala Sekolah di bagian bawah tiap lembar.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tempat">
              <input className={inputCls} value={form.tempat} onChange={ubah('tempat')} placeholder="mis. Waria" />
            </Field>
            <Field label="Tanggal laporan">
              <input type="date" className={inputCls} value={form.tanggalLaporan} onChange={ubah('tanggalLaporan')} />
            </Field>
            <Field label="Nama Kepala Sekolah">
              <input className={inputCls} value={form.kepalaNama} onChange={ubah('kepalaNama')} />
            </Field>
            <Field label="NIP Kepala Sekolah">
              <input className={inputCls} value={form.kepalaNip} onChange={ubah('kepalaNip')} />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Nilai dari halaman Nilai Asesmen"
          keterangan="Lembar 1–3 terisi otomatis dari nilai siswa Kelas 6 (tahun pelajaran sesuai isian di atas). Isian manual di tabel akan tertimpa saat nilai ditarik ulang."
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-32">
              <Field label="KKM (batas lulus)">
                <input className={inputCls} value={form.kkm} onChange={ubah('kkm')} inputMode="decimal" />
              </Field>
            </div>
            <button
              type="button"
              onClick={tarikNilai}
              disabled={memuatNilai || memuatSiswa}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {memuatNilai ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Tarik ulang nilai
            </button>
          </div>
          {infoNilai && <p className="mt-2 text-sm text-slate-600">{infoNilai}</p>}
        </Bagian>

        <Bagian
          judul="Isi otomatis jumlah peserta"
          keterangan={
            memuatSiswa
              ? 'Memuat data siswa…'
              : `Ditemukan ${totalPeserta} peserta Kelas 6 ber-No. Peserta${adaJk ? ` (L ${totalL}, P ${totalP})` : ''}. Mengisi kolom jumlah peserta di Lembar 1, 3, dan 4.`
          }
        >
          <button
            type="button"
            onClick={isiDariSiswa}
            disabled={memuatSiswa}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Wand2 size={14} /> Isi dari data siswa
          </button>
          {infoIsi && <p className="mt-2 text-sm text-slate-600">{infoIsi}</p>}
        </Bagian>

        {tabAktif === 'laporan' && (
          <Bagian
            judul="Isi laporan lengkap (Kata Pengantar – Bab VI)"
            keterangan="Nama sekolah, kecamatan, kabupaten, tahun pelajaran, dan Kepala Sekolah terisi otomatis. Lengkapi data di bawah; teks bisa diubah dan ikut tampil di pratinjau."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Desa">
                <input className={inputCls} value={lap.desa} onChange={ubahLap('desa')} placeholder="mis. Waria" />
              </Field>
              <Field label="Provinsi">
                <input className={inputCls} value={lap.provinsi} onChange={ubahLap('provinsi')} placeholder="mis. Maluku" />
              </Field>
              <Field label="Nomor SK Dinas Pendidikan">
                <input className={inputCls} value={lap.skNomor} onChange={ubahLap('skNomor')} />
              </Field>
              <Field label="Tanggal SK">
                <input type="date" className={inputCls} value={lap.skTanggal} onChange={ubahLap('skTanggal')} />
              </Field>
              <Field label="Tanggal rapat koordinasi staf">
                <input type="date" className={inputCls} value={lap.rakorTanggal} onChange={ubahLap('rakorTanggal')} />
              </Field>
              <div />
              <Field label="Ujian Sekolah (tulis) — mulai" keterangan="Terisi otomatis dari Jadwal Pengawas Ruang.">
                <input type="date" className={inputCls} value={lap.usMulai} onChange={ubahLap('usMulai')} />
              </Field>
              <Field label="Ujian Sekolah (tulis) — selesai">
                <input type="date" className={inputCls} value={lap.usSelesai} onChange={ubahLap('usSelesai')} />
              </Field>
              <Field label="Ujian praktik — mulai">
                <input type="date" className={inputCls} value={lap.prMulai} onChange={ubahLap('prMulai')} />
              </Field>
              <Field label="Ujian praktik — selesai">
                <input type="date" className={inputCls} value={lap.prSelesai} onChange={ubahLap('prSelesai')} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Susunan panitia" keterangan="Satu baris per orang, format: Jabatan | Nama">
                  <textarea className={inputCls} rows={6} value={lap.panitia} onChange={ubahLap('panitia')} />
                </Field>

                {/* Pilih nama panitia dari data guru sekolah ini */}
                <div className="mt-2 rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700">Pilih dari data guru ({guruList.length})</p>
                    <button
                      type="button"
                      onClick={isiPanitiaDariGuru}
                      disabled={guruList.length === 0}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Isi otomatis yang masih kosong
                    </button>
                  </div>
                  {infoGuru && <p className="mb-2 text-xs text-amber-700">{infoGuru}</p>}
                  <div className="space-y-1.5">
                    {lap.panitia.split('\n').map((b, idx) => {
                      const [j, ...n] = b.split('|')
                      const jabatan = (j || '').trim()
                      const nama = n.join('|').trim()
                      if (!jabatan || nama.includes('{')) return null // lewati Penanggung Jawab
                      const ada = guruList.some((g) => g.nama === nama)
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-28 shrink-0 text-sm text-slate-600">{jabatan}</span>
                          <select
                            className={inputCls}
                            value={nama}
                            onChange={(e) => setNamaPanitia(idx, e.target.value)}
                          >
                            <option value="">— pilih guru —</option>
                            {nama && !ada && <option value={nama}>{nama}</option>}
                            {guruList.map((g) => (
                              <option key={g.id} value={g.nama}>{g.nama}</option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">Teks laporan (klik untuk membuka & mengubah)</p>
                <button
                  type="button"
                  onClick={() => setLap((l) => ({ ...l, teks: { ...TEKS_AWAL } }))}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Kembalikan semua teks ke bawaan
                </button>
              </div>
              <p className="mb-2 text-xs text-slate-500">
                Kata kunci otomatis: {'{sekolah} {desa} {kecamatan} {kabupaten} {provinsi} {tapel} {tahun} {kepsek} {us} {praktik} {sk} {rakor}'}
                . Di kolom yang berbentuk daftar, satu baris = satu butir.
              </p>
              {BLOK_EDIT.map(([k, label, baris]) => (
                <details key={k} className="mb-2 rounded-lg border border-slate-200">
                  <summary className="cursor-pointer px-3 py-2 text-sm text-slate-700">{label}</summary>
                  <div className="px-3 pb-3">
                    <textarea className={inputCls} rows={baris} value={lap.teks[k]} onChange={ubahTeks(k)} />
                  </div>
                </details>
              ))}
            </div>
          </Bagian>
        )}

        {tabAktif === 'penyelenggara' && (
          <Bagian
            judul="Pelaksanaan (Lembar 4)"
            keterangan="Tanggal & mata pelajaran bisa diambil dari Jadwal Pengawas Ruang, atau diketik manual."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field label="Ambil dari jadwal pengawas">
                  {sesiJadwal.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
                      Belum ada jadwal pengawas tersimpan. Isi dulu di halaman Jadwal Pengawas Ruang.
                    </p>
                  ) : (
                    <select className={inputCls} value={sesiTerpilih} onChange={pilihSesi}>
                      <option value="">— pilih sesi —</option>
                      {sesiJadwal.map((s) => (
                        <option key={s.key} value={s.key}>
                          {labelTanggal(s.tanggal)} • {s.waktu || '…'} • {s.mapel || '(mapel belum diisi)'}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
              <Field label="Hari / tanggal">
                <input type="date" className={inputCls} value={form.tanggalUjian} onChange={ubah('tanggalUjian')} />
              </Field>
              <Field label="Mata pelajaran">
                <input className={inputCls} value={form.mapelUjian} onChange={ubah('mapelUjian')} placeholder="mis. IPA" />
              </Field>
              <Field label="No. Telepon / HP">
                <input className={inputCls} value={form.telepon} onChange={ubah('telepon')} />
              </Field>
            </div>
          </Bagian>
        )}

        {/* Tab per lembar */}
        <div role="tablist" className="mt-2 mb-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TAB.map((t) => {
            const aktif = tabAktif === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={aktif}
                onClick={() => setTabAktif(t.id)}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  aktif
                    ? 'border-blue-900 bg-blue-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className={`block text-xs ${aktif ? 'text-blue-200' : 'text-slate-500'}`}>{t.sub}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={cetakSemua} onChange={(e) => setCetakSemua(e.target.checked)} />
            Cetak semua lembar sekaligus
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950"
          >
            <Printer size={16} /> {cetakSemua ? 'Cetak semua tab' : `Cetak ${TAB.find((t) => t.id === tabAktif)?.label}`}
          </button>
        </div>
      </div>

      <div
        id="area-cetak-laporan"
        className={`mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-[13px] leading-relaxed text-slate-800 ${
          cetakSemua ? 'cetak-semua' : ''
        }`}
      >
        {/* ===================== TAB LAPORAN: KATA PENGANTAR S.D. LAMPIRAN ===================== */}
        <section className={`${kelasLembar('laporan')} laporan`}>
          {/* Kata Pengantar */}
          <div className="halaman">
            <p className="text-center font-bold text-base mb-4">KATA PENGANTAR</p>
            <Paragraf teks={lap.teks.pengantar} v={tokens} />
            <div className="ttd-blok mt-6 flex justify-end">
              <div className="w-64 text-center">
                <p>{tglTtd}</p>
                <p className="mb-14">Panitia</p>
                <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
                  {isi(ketuaPanitia, '…………')}
                </p>
              </div>
            </div>
          </div>

          {/* Daftar Isi */}
          <div className="halaman">
            <p className="text-center font-bold text-base mb-4">DAFTAR ISI</p>
            <p className="text-center font-bold">LAPORAN LENGKAP ASESMEN TAHUN PELAJARAN {isi(form.tapel, '…………')}</p>
            <p className="text-center font-bold mb-6">PENYELENGGARA UJIAN SEKOLAH</p>
            <ul className="space-y-1.5">
              {DAFTAR_ISI.map(([teks, tingkat], i) => (
                <li key={i} className={tingkat === 0 ? 'font-semibold' : 'ml-8'}>
                  {teks}
                </li>
              ))}
            </ul>
          </div>

          {/* BAB I */}
          <div className="halaman">
            <JudulBab no="I" judul="Pendahuluan" />
            <Paragraf teks={lap.teks.pendahuluan} v={tokens} />

            <SubJudul>A. Dasar</SubJudul>
            <p className="teks-laporan mb-1">
              Adapun dasar pelaksanaan Asesmen Nasional (AN) diatur sesuai Undang-undang dan Permendikbud sebagai berikut:
            </p>
            <Butir teks={lap.teks.dasar} v={tokens} />

            <SubJudul>B. Maksud dan Tujuan</SubJudul>
            <p className="teks-laporan mb-1">
              {T('Program kerja panitia Ujian Sekolah {sekolah} tahun pelajaran {tapel} ini disusun untuk mencapai tujuan sebagai berikut:')}
            </p>
            <Butir teks={lap.teks.maksud} v={tokens} />

            <SubJudul>C. Sasaran</SubJudul>
            <p className="teks-laporan mb-1">
              Berdasarkan hal-hal tersebut di atas, maka sasaran yang ingin dicapai adalah:
            </p>
            <p className="font-semibold">1. Sasaran Umum</p>
            <div className="ml-5"><Paragraf teks={lap.teks.sasaranUmum} v={tokens} /></div>
            <p className="font-semibold">2. Sasaran Khusus</p>
            <Butir teks={lap.teks.sasaranKhusus} v={tokens} />
          </div>

          {/* BAB II */}
          <div className="halaman">
            <JudulBab no="II" judul="Persiapan Penyelenggaraan Ujian Sekolah" />

            <SubJudul>A. Organisasi Penyelenggaraan</SubJudul>
            <p className="mb-1">Susunan Panitia</p>
            <table className="mb-2 ml-4">
              <tbody>
                {panitiaBaris.map((p, i) => (
                  <tr key={i}>
                    <td className="pr-4 whitespace-nowrap">{p.jabatan}</td>
                    <td className="pr-2">:</td>
                    <td>{p.nama}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <SubJudul>B. Tugas Panitia</SubJudul>
            <p className="teks-laporan mb-1">
              {T('Adapun rincian tugas kepanitiaan Ujian Sekolah {sekolah} adalah sebagai berikut:')}
            </p>
            <Butir teks={lap.teks.tugas} v={tokens} />

            <SubJudul>C. Pengawas Ruang</SubJudul>
            <p className="teks-laporan mb-1">
              Pengawas ujian adalah seorang yang ditugaskan untuk mengawasi para siswa yang sedang mengerjakan soal-soal
              ujian pada bidang studi tertentu. Adapun tugas pengawas ruang adalah sebagai berikut:
            </p>
            <Butir teks={lap.teks.pengawas} v={tokens} nomor />
          </div>

          {/* BAB III */}
          <div className="halaman">
            <JudulBab no="III" judul="Penyelenggaraan Ujian Sekolah" />

            <SubJudul>A. Penyelenggaraan</SubJudul>
            <p className="font-semibold">1. Pelaksanaan Ujian Sekolah</p>
            <div className="ml-5"><Paragraf teks={lap.teks.us} v={tokens} /></div>

            <p className="font-semibold text-center mt-3 mb-1">Tabel Jumlah Butir Soal Ujian Sekolah</p>
            <table className="w-full border-collapse text-[12px] mb-3">
              <thead>
                <tr>
                  <Th rowSpan={2} className="w-8">No</Th>
                  <Th rowSpan={2}>Mata Pelajaran</Th>
                  <Th colSpan={2}>Bentuk dan Jumlah Butir Soal</Th>
                  <Th rowSpan={2} className="w-28">Alokasi Waktu</Th>
                </tr>
                <tr>
                  <Th className="w-16">PG</Th>
                  <Th className="w-16">Uraian</Th>
                </tr>
              </thead>
              <tbody>
                {MAPEL.map((m, i) => (
                  <tr key={m}>
                    <Td className="text-center">{i + 1}</Td>
                    <Td>{m}</Td>
                    <Td className="p-0"><input className="sel-input" value={lap.butir[i].pg} onChange={ubahButir(i, 'pg')} /></Td>
                    <Td className="p-0"><input className="sel-input" value={lap.butir[i].uraian} onChange={ubahButir(i, 'uraian')} /></Td>
                    <Td className="p-0"><input className="sel-input" value={lap.butir[i].waktu} onChange={ubahButir(i, 'waktu')} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="font-semibold">2. Pelaksanaan Ujian Praktik</p>
            <div className="ml-5"><Paragraf teks={lap.teks.praktik} v={tokens} /></div>

            <SubJudul>B. Hasil Pelaksanaan dan Evaluasi</SubJudul>
            <Paragraf teks={lap.teks.hasil} v={tokens} />

            <SubJudul>C. Kelulusan Hasil</SubJudul>
            {ringkasKelulusan.length > 0 && (
              <>
                <p className="teks-laporan mb-1">Rincian kehadiran dan kelulusan peserta per mata pelajaran adalah sebagai berikut:</p>
                <ul className="list-disc ml-8 mb-2 space-y-0.5">
                  {ringkasKelulusan.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </>
            )}
            <Paragraf teks={lap.teks.kelulusan} v={tokens} />
            {ringkasKelulusan.length === 0 && !lap.teks.kelulusan.trim() && <p>…………</p>}
          </div>

          {/* BAB IV */}
          <div className="halaman">
            <JudulBab no="IV" judul="Pembiayaan" />
            <Paragraf teks={lap.teks.pembiayaan} v={tokens} />
          </div>

          {/* BAB V */}
          <div className="halaman">
            <JudulBab no="V" judul="Hambatan dan Usaha Penanggulangan" />
            <Paragraf teks={lap.teks.hambatan} v={tokens} />
          </div>

          {/* BAB VI */}
          <div className="halaman">
            <JudulBab no="VI" judul="Penutup" />
            <SubJudul>A. Kesimpulan</SubJudul>
            <Paragraf teks={lap.teks.kesimpulan} v={tokens} />
            <SubJudul>B. Saran</SubJudul>
            <Paragraf teks={lap.teks.saran} v={tokens} />
          </div>

          {/* Lampiran */}
          <div className="halaman">
            <p className="text-center font-bold text-base mb-4">LAMPIRAN-LAMPIRAN</p>
            <Butir teks={lap.teks.lampiran} v={tokens} nomor />
          </div>
        </section>

        {/* ===================== LEMBAR 1: STATISTIK NILAI ===================== */}
        <section className={kelasLembar('nilai')}>
          {kop}
          {judul}
          <p className="mb-2">Jumlah peserta menurut klasifikasi nilai setiap mata pelajaran.</p>
          {identitas({ rayon: true })}

          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <Th rowSpan={2} className="w-8">No</Th>
                <Th rowSpan={2}>Mata Pelajaran</Th>
                <Th rowSpan={2} className="w-14">Jumlah Peserta</Th>
                <Th colSpan={3}>Nilai Tertulis</Th>
                <Th colSpan={3}>Nilai Praktik</Th>
                <Th rowSpan={2} className="w-14">Ket</Th>
              </tr>
              <tr>
                {['Tertinggi', 'Terendah', 'Rata-rata', 'Tertinggi', 'Terendah', 'Rata-rata'].map((h, i) => (
                  <Th key={i} className="w-14 text-[11px]">{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAPEL.map((m, i) => (
                <tr key={m}>
                  <Td className="text-center">{i + 1}</Td>
                  <Td>{m}</Td>
                  {['jml', 'tTinggi', 'tRendah', 'tRata', 'pTinggi', 'pRendah', 'pRata', 'ket'].map((k) => (
                    <Td key={k} className="p-0">
                      <input className="sel-input" value={nilai[i][k]} onChange={setSel(setNilai, i, k)} />
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[12px] italic">*) Mata pelajaran jenjang SD</p>
          {ttd}
        </section>

        {/* ===================== LEMBAR 2: KLASIFIKASI NILAI ===================== */}
        <section className={kelasLembar('klasifikasi')}>
          {kop}
          {judul}
          <p className="mb-2">Jumlah peserta menurut klasifikasi nilai setiap mata pelajaran.</p>
          {identitas({ rayon: true })}

          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <Th rowSpan={2} className="w-8">No</Th>
                <Th rowSpan={2}>Mata Pelajaran</Th>
                <Th colSpan={KLASIFIKASI.length}>Jumlah Peserta menurut Klasifikasi Nilai</Th>
                <Th rowSpan={2} className="w-16">Jumlah Peserta Seluruhnya</Th>
                <Th rowSpan={2} className="w-14">Ket</Th>
              </tr>
              <tr>
                {KLASIFIKASI.map((h) => (
                  <Th key={h} className="w-14 text-[10.5px]">{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAPEL.map((m, i) => (
                <tr key={m}>
                  <Td className="text-center">{i + 1}</Td>
                  <Td>{m}</Td>
                  {KLASIFIKASI.map((_, j) => (
                    <Td key={j} className="p-0">
                      <input className="sel-input" value={klas[i].k[j]} onChange={setKlasSel(i, j)} />
                    </Td>
                  ))}
                  <Td className="text-center">{jmlKlasPerBaris[i]}</Td>
                  <Td className="p-0">
                    <input className="sel-input" value={klas[i].ket} onChange={setSel(setKlas, i, 'ket')} />
                  </Td>
                </tr>
              ))}
              <tr>
                <Td colSpan={2} className="text-center font-semibold">Jumlah</Td>
                {totalKlasPerKolom.map((t, j) => (
                  <Td key={j} className="text-center font-semibold">{t}</Td>
                ))}
                <Td className="text-center font-semibold">{totalKlasSemua}</Td>
                <Td />
              </tr>
            </tbody>
          </table>

          <div className="mt-2 text-[12px]">
            <p className="font-bold">Catatan :</p>
            <p className="italic">*) Mata pelajaran jenjang SD</p>
            <p className="italic">Kolom "Jumlah Peserta Seluruhnya" otomatis dijumlahkan dari klasifikasi; bila klasifikasi masih kosong, memakai jumlah peserta di Lembar 1.</p>
          </div>
          {ttd}
        </section>

        {/* ===================== LEMBAR 3: KELULUSAN ===================== */}
        <section className={kelasLembar('kelulusan')}>
          {kop}
          {judul}
          {identitas({ kabupaten: true })}

          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr>
                <Th rowSpan={2} className="w-8">No</Th>
                <Th rowSpan={2}>Mata Pelajaran</Th>
                <Th colSpan={3}>Peserta Terdaftar</Th>
                <Th colSpan={3}>Peserta Hadir</Th>
                <Th colSpan={3}>Lulus</Th>
                <Th colSpan={3}>Tidak Lulus</Th>
                <Th rowSpan={2} className="w-12">Ket</Th>
              </tr>
              <tr>
                {[0, 1, 2, 3].flatMap((g) => ['L', 'P', 'Jml']).map((h, i) => (
                  <Th key={i} className="w-9">{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAPEL.map((m, i) => {
                const r = lulus[i]
                const sel = (k) => (
                  <Td key={k} className="p-0">
                    <input className="sel-input" value={r[k]} onChange={setSel(setLulus, i, k)} />
                  </Td>
                )
                return (
                  <tr key={m}>
                    <Td className="text-center">{i + 1}</Td>
                    <Td>{m}</Td>
                    {sel('tdL')}{sel('tdP')}
                    <Td className="text-center">{jumlah(r.tdL, r.tdP)}</Td>
                    {sel('hdL')}{sel('hdP')}
                    <Td className="text-center">{jumlah(r.hdL, r.hdP)}</Td>
                    {sel('lL')}{sel('lP')}
                    <Td className="text-center">{jumlah(r.lL, r.lP)}</Td>
                    {sel('tlL')}{sel('tlP')}
                    <Td className="text-center">{jumlah(r.tlL, r.tlP)}</Td>
                    {sel('ket')}
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="mt-2 text-[12px]">
            <p className="font-bold">Keterangan :</p>
            <p className="italic">*) Mata pelajaran jenjang SD</p>
            <p className="italic">Laporan ini disampaikan ke Penyelenggara, Tingkat Sub Rayon, Tingkat Rayon dan Tingkat Kabupaten.</p>
          </div>
          {ttd}
        </section>

        {/* ===================== LEMBAR 4: PENYELENGGARA ===================== */}
        <section className={kelasLembar('penyelenggara')}>
          {kop}
          {judul}
          <div className="info-blok mb-3 space-y-0.5">
            <Baris label="Nama Sekolah Penyelenggara" nilai={namaSekolah} lebar="w-56" />
            <Baris label="Alamat" nilai={isi(form.alamat, '…………')} lebar="w-56" />
            <Baris label="No. Telepon / HP" nilai={isi(form.telepon, '…………')} lebar="w-56" />
            <Baris label="Hari / Tanggal" nilai={isi(hariTanggalPanjang(form.tanggalUjian), '…………')} lebar="w-56" />
            <Baris label="Mata Pelajaran" nilai={isi(form.mapelUjian, '…………')} lebar="w-56" />
          </div>

          <p className="mb-1">
            Laporan sekolah penyelenggara bergabung: peserta terdaftar, peserta yang mengikuti, peserta yang hadir
            dan peserta tidak hadir.
          </p>
          <table className="w-full border-collapse text-[12px] mb-4">
            <thead>
              <tr>
                <Th className="w-8">No</Th>
                <Th className="w-28">Status</Th>
                <Th>Jumlah Peserta Terdaftar</Th>
                <Th>Jumlah Peserta Mengikuti</Th>
                <Th>Jumlah Peserta Yang Hadir</Th>
                <Th>Peserta Tidak Hadir</Th>
                <Th>Nomor Peserta Tidak Hadir</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ['penyelenggara', 'Penyelenggara'],
                ['bergabung', 'Bergabung'],
              ].map(([kunci, label], i) => (
                <tr key={kunci}>
                  <Td className="text-center">{i + 1}</Td>
                  <Td>{label}</Td>
                  {['terdaftar', 'mengikuti', 'hadir', 'tidakHadir', 'nomor'].map((k) => (
                    <Td key={k} className="p-0">
                      <input className="sel-input" value={pen[kunci][k]} onChange={setPenBaris(kunci, k)} />
                    </Td>
                  ))}
                </tr>
              ))}
              <tr>
                <Td />
                <Td className="font-semibold">Jumlah</Td>
                <Td className="text-center font-semibold">{isi(totalPen.terdaftar, '-')}</Td>
                <Td className="text-center font-semibold">{isi(totalPen.mengikuti, '-')}</Td>
                <Td className="text-center font-semibold">{isi(totalPen.hadir, '-')}</Td>
                <Td className="text-center font-semibold">{isi(totalPen.tidakHadir, '-')}</Td>
                <Td className="text-center">-</Td>
              </tr>
            </tbody>
          </table>

          <p className="mb-1">
            Laporan permasalahan, pemecahan dan usul/saran dalam pelaksanaan Asesmen Sekolah Tahun Pelajaran{' '}
            {isi(form.tapel, '…………')}.
          </p>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <Th className="w-8">No</Th>
                <Th className="w-28">Status</Th>
                <Th>Masalah yang dihadapi</Th>
                <Th>Langkah-langkah pemecahan</Th>
                <Th>Usul/Saran Tindak Lanjut</Th>
              </tr>
            </thead>
            <tbody>
              {['Pelaksanaan', 'Materi Soal', 'Lain-lain'].map((label, i) => (
                <tr key={label}>
                  <Td className="text-center">{i + 1}</Td>
                  <Td>{label}</Td>
                  {['m', 'l', 'u'].map((k) => (
                    <Td key={k} className="p-0">
                      <input className="sel-input" value={pen.masalah[i][k]} onChange={setMasalah(i, k)} />
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-2 text-[12px] italic">Laporan ini disampaikan ke Penyelenggara Tingkat Sub Rayon.</p>
          {ttd}
        </section>
      </div>
    </Layout>
  )
}

function Baris({ label, nilai, lebar = 'w-40' }) {
  return (
    <p className="flex">
      <span className={`${lebar} shrink-0`}>{label}</span>
      <span>: {nilai}</span>
    </p>
  )
}
function Th({ children, className = '', ...rest }) {
  return (
    <th className={`border border-slate-300 px-1 py-1 text-center font-semibold ${className}`} {...rest}>
      {children}
    </th>
  )
}
function Td({ children, className = '', ...rest }) {
  return (
    <td className={`border border-slate-300 px-1.5 py-1 ${className}`} {...rest}>
      {children}
    </td>
  )
}

// --- Pembantu tampilan tab Laporan ---

// Teks biasa: baris kosong = paragraf baru. Kata kunci {…} diisi otomatis.
function Paragraf({ teks, v }) {
  return isiTemplate(teks, v)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => (
      <p key={i} className="teks-laporan indent-8 mb-2">
        {p}
      </p>
    ))
}

// Daftar butir: satu baris = satu butir. Baris "## Judul" / "### Sub-judul" memulai kelompok baru.
function Butir({ teks, v, nomor = false }) {
  const baris = isiTemplate(teks, v)
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
  const grup = []
  baris.forEach((b) => {
    if (b.startsWith('#')) {
      const tingkat = (b.match(/^#+/) || [''])[0].length
      grup.push({ judul: b.replace(/^#+\s*/, ''), tingkat, item: [] })
    } else {
      if (grup.length === 0) grup.push({ judul: '', tingkat: 0, item: [] })
      grup[grup.length - 1].item.push(b)
    }
  })
  const Daftar = nomor ? 'ol' : 'ul'
  return grup.map((g, i) => (
    <div key={i} className="mb-2">
      {g.judul && <p className={g.tingkat >= 3 ? 'font-medium italic ml-4 mt-1' : 'font-semibold'}>{g.judul}</p>}
      {g.item.length > 0 && (
        <Daftar className={`teks-laporan ${nomor ? 'list-decimal' : 'list-disc'} ml-8 space-y-0.5`}>
          {g.item.map((it, j) => (
            <li key={j}>{it}</li>
          ))}
        </Daftar>
      )}
    </div>
  ))
}

function JudulBab({ no, judul }) {
  return (
    <div className="text-center font-bold mb-4">
      <p className="text-base">BAB {no}</p>
      <p className="text-base uppercase">{judul}</p>
    </div>
  )
}

function SubJudul({ children }) {
  return <p className="font-bold mt-3 mb-1">{children}</p>
}
