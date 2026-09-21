import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  ArrowLeft,
  BookOpen,
  Calculator,
  Languages,
  Heart,
  Landmark,
  Sprout,
  FlaskConical,
  Globe,
  Dumbbell,
  Palette,
  MapPin,
  Monitor,
  Scissors,
  ChevronDown,
  FileText,
  ExternalLink,
  Search,
  X,
} from 'lucide-react'
import Layout from '../components/Layout'

// =====================================================================
// 1) DATA MATERI — bagian yang paling sering Anda ubah
// =====================================================================
// Kunci: `${jenjang}-${kelas}-${idMapel}`, contoh: 'SD-1-matematika'.
// Isi tiap kunci berupa daftar materi. `link` boleh dikosongkan; kalau diisi
// (Google Drive, YouTube, dll.), materi tampil sebagai tautan yang bisa dibuka.
//
// Contoh:
//   'SD-1-matematika': [
//     { judul: 'Bilangan 1 sampai 10', link: 'https://drive.google.com/...' },
//     { judul: 'Penjumlahan dan pengurangan sederhana' },
//   ],
const MATERI = {
  // ---------------------------------------------------------------
  // SD KELAS 1
  // ---------------------------------------------------------------
  'SD-1-agama': [
    { judul: 'Mengenal Allah melalui Asmaul Husna' },
    { judul: 'Rukun Iman dan Rukun Islam' },
    { judul: 'Bacaan dan gerakan salat' },
    { judul: 'Kisah keteladanan Nabi' },
    { judul: 'Perilaku terpuji sehari-hari' },
  ],
  'SD-1-pancasila': [
    { judul: 'Simbol dan lambang Pancasila' },
    { judul: 'Mengenal aturan di rumah dan sekolah' },
    { judul: 'Sikap saling menghormati perbedaan' },
    { judul: 'Gotong royong di lingkungan sekitar' },
  ],
  'SD-1-indonesia': [
    { judul: 'Mengenal huruf abjad A-Z' },
    { judul: 'Membaca suku kata sederhana' },
    { judul: 'Menyusun kata menjadi kalimat' },
    { judul: 'Bercerita tentang diri sendiri' },
    { judul: 'Mendengarkan dan memahami dongeng' },
  ],
  'SD-1-matematika': [
    { judul: 'Bilangan 1 sampai 10' },
    { judul: 'Bilangan 11 sampai 20' },
    { judul: 'Penjumlahan bilangan sampai 20' },
    { judul: 'Pengurangan bilangan sampai 20' },
    { judul: 'Mengenal bangun datar' },
    { judul: 'Mengukur panjang benda' },
  ],
  'SD-1-pjok': [
    { judul: 'Gerak dasar lokomotor (jalan, lari, lompat)' },
    { judul: 'Gerak dasar non-lokomotor (menekuk, memutar)' },
    { judul: 'Permainan bola sederhana' },
    { judul: 'Pola hidup sehat dan kebersihan diri' },
  ],
  'SD-1-seni': [
    { judul: 'Mengenal warna dan bentuk dasar' },
    { judul: 'Menggambar bebas dengan krayon' },
    { judul: 'Menyanyikan lagu anak sederhana' },
    { judul: 'Mengenal alat musik ritmis' },
  ],
  'SD-1-mulok': [
    { judul: 'Pengenalan bahasa daerah sehari-hari' },
    { judul: 'Mengenal budaya dan tradisi setempat' },
    { judul: 'Permainan tradisional daerah' },
  ],

  // ---------------------------------------------------------------
  // SD KELAS 2
  // ---------------------------------------------------------------
  'SD-2-agama': [
    { judul: 'Mengenal kitab suci dan cara merawatnya' },
    { judul: 'Kisah keteladanan Nabi dan Rasul' },
    { judul: 'Tata cara wudu dan salat berjemaah' },
    { judul: 'Sikap jujur dan santun dalam keseharian' },
  ],
  'SD-2-pancasila': [
    { judul: 'Makna sila-sila Pancasila' },
    { judul: 'Hak dan kewajiban di rumah dan sekolah' },
    { judul: 'Hidup rukun dalam keberagaman' },
    { judul: 'Musyawarah untuk mufakat' },
  ],
  'SD-2-indonesia': [
    { judul: 'Membaca teks pendek dengan lancar' },
    { judul: 'Menulis kalimat sederhana' },
    { judul: 'Menceritakan kembali isi cerita' },
    { judul: 'Mengenal kosakata tentang lingkungan' },
    { judul: 'Menulis puisi anak sederhana' },
  ],
  'SD-2-matematika': [
    { judul: 'Bilangan sampai 100' },
    { judul: 'Penjumlahan dan pengurangan bersusun' },
    { judul: 'Perkalian sebagai penjumlahan berulang' },
    { judul: 'Pengenalan pembagian sederhana' },
    { judul: 'Mengenal satuan waktu dan uang' },
    { judul: 'Bangun ruang sederhana' },
  ],
  'SD-2-pjok': [
    { judul: 'Kombinasi gerak lokomotor dan non-lokomotor' },
    { judul: 'Permainan kecil beregu' },
    { judul: 'Latihan keseimbangan tubuh' },
    { judul: 'Kebersihan dan keamanan saat berolahraga' },
  ],
  'SD-2-seni': [
    { judul: 'Menggambar imajinatif dengan pewarna' },
    { judul: 'Membuat karya kerajinan dari kertas' },
    { judul: 'Menyanyi dengan iringan sederhana' },
    { judul: 'Gerak tari sederhana mengikuti irama' },
  ],
  'SD-2-mulok': [
    { judul: 'Kosakata bahasa daerah tentang keluarga' },
    { judul: 'Lagu dan permainan daerah' },
    { judul: 'Cerita rakyat setempat' },
  ],

  // ---------------------------------------------------------------
  // SD KELAS 3
  // ---------------------------------------------------------------
  'SD-3-agama': [
    { judul: 'Makna asmaul husna dalam kehidupan' },
    { judul: 'Kisah keteladanan sahabat Nabi' },
    { judul: 'Tata cara salat berjemaah' },
    { judul: 'Perilaku hormat kepada orang tua dan guru' },
  ],
  'SD-3-pancasila': [
    { judul: 'Simbol dan makna sila Pancasila lebih dalam' },
    { judul: 'Aturan dan norma di masyarakat' },
    { judul: 'Keberagaman suku, agama, dan budaya' },
    { judul: 'Kerja sama dalam kehidupan sehari-hari' },
  ],
  'SD-3-indonesia': [
    { judul: 'Membaca pemahaman teks narasi' },
    { judul: 'Menulis surat sederhana' },
    { judul: 'Menyusun paragraf dari kalimat acak' },
    { judul: 'Mengenal jenis-jenis kalimat' },
    { judul: 'Bercerita dengan urutan yang runtut' },
  ],
  'SD-3-matematika': [
    { judul: 'Bilangan sampai 1.000' },
    { judul: 'Perkalian dan pembagian dasar' },
    { judul: 'Pecahan sederhana' },
    { judul: 'Pengukuran berat dan panjang' },
    { judul: 'Keliling dan luas bangun datar' },
  ],
  'SD-3-ipas': [
    { judul: 'Ciri-ciri makhluk hidup' },
    { judul: 'Lingkungan sehat dan tidak sehat' },
    { judul: 'Kenampakan alam di sekitar' },
    { judul: 'Kegiatan ekonomi masyarakat' },
  ],
  'SD-3-inggris': [
    { judul: 'Greetings and introductions' },
    { judul: 'Numbers and colors' },
    { judul: 'Family members vocabulary' },
    { judul: 'Simple daily expressions' },
  ],
  'SD-3-pjok': [
    { judul: 'Variasi gerak dasar dalam permainan bola kecil' },
    { judul: 'Latihan kekuatan dan kelenturan' },
    { judul: 'Aktivitas air (pengenalan)' },
    { judul: 'Pola makan sehat untuk anak' },
  ],
  'SD-3-seni': [
    { judul: 'Menggambar dekoratif' },
    { judul: 'Membuat kerajinan dari bahan alam' },
    { judul: 'Menyanyi lagu wajib dan daerah' },
    { judul: 'Gerak tari berpasangan' },
  ],
  'SD-3-mulok': [
    { judul: 'Percakapan sederhana bahasa daerah' },
    { judul: 'Aksara atau tulisan daerah (pengenalan)' },
    { judul: 'Kearifan lokal di lingkungan sekitar' },
  ],

  // ---------------------------------------------------------------
  // SD KELAS 4
  // ---------------------------------------------------------------
  'SD-4-agama': [
    { judul: 'Iman kepada malaikat dan tugasnya' },
    { judul: 'Kisah keteladanan Nabi Muhammad SAW' },
    { judul: 'Bacaan Al-Quran surat pendek' },
    { judul: 'Perilaku amanah dan tanggung jawab' },
  ],
  'SD-4-pancasila': [
    { judul: 'Nilai-nilai Pancasila dalam kehidupan bernegara' },
    { judul: 'Hak dan kewajiban sebagai warga negara' },
    { judul: 'Persatuan dan kesatuan bangsa' },
    { judul: 'Menghargai keberagaman budaya Indonesia' },
  ],
  'SD-4-indonesia': [
    { judul: 'Menemukan gagasan pokok dalam teks' },
    { judul: 'Menulis laporan sederhana' },
    { judul: 'Membaca dan memahami puisi' },
    { judul: 'Wawancara sederhana' },
    { judul: 'Menyampaikan pendapat secara lisan' },
  ],
  'SD-4-matematika': [
    { judul: 'Operasi hitung campuran' },
    { judul: 'Faktor dan kelipatan bilangan' },
    { judul: 'Pecahan dan desimal' },
    { judul: 'Pengukuran sudut' },
    { judul: 'Keliling dan luas bangun datar gabungan' },
  ],
  'SD-4-ipas': [
    { judul: 'Sistem gerak pada manusia dan hewan' },
    { judul: 'Siklus hidup makhluk hidup' },
    { judul: 'Sumber daya alam dan pemanfaatannya' },
    { judul: 'Keragaman budaya di Indonesia' },
  ],
  'SD-4-inggris': [
    { judul: 'Describing people and things' },
    { judul: 'Days, months, and dates' },
    { judul: 'Simple present tense' },
    { judul: 'Talking about daily activities' },
  ],
  'SD-4-pjok': [
    { judul: 'Permainan bola besar (sepak bola, bola voli mini)' },
    { judul: 'Atletik dasar (lari, lompat, lempar)' },
    { judul: 'Senam irama sederhana' },
    { judul: 'Bahaya rokok dan zat adiktif' },
  ],
  'SD-4-seni': [
    { judul: 'Menggambar model dan alam benda' },
    { judul: 'Kerajinan anyaman sederhana' },
    { judul: 'Bermain alat musik melodis' },
    { judul: 'Tari kreasi daerah' },
  ],
  'SD-4-mulok': [
    { judul: 'Menulis kalimat sederhana bahasa daerah' },
    { judul: 'Lagu daerah dan maknanya' },
    { judul: 'Adat istiadat di lingkungan sekitar' },
  ],

  // ---------------------------------------------------------------
  // SD KELAS 5
  // ---------------------------------------------------------------
  'SD-5-agama': [
    { judul: 'Iman kepada kitab-kitab Allah' },
    { judul: 'Kisah keteladanan Khulafaur Rasyidin' },
    { judul: 'Zakat, infak, dan sedekah' },
    { judul: 'Perilaku rendah hati dan hemat' },
  ],
  'SD-5-pancasila': [
    { judul: 'Sejarah perumusan Pancasila' },
    { judul: 'Norma dan hukum dalam masyarakat' },
    { judul: 'Tanggung jawab sebagai bagian dari NKRI' },
    { judul: 'Menghargai jasa para pahlawan' },
  ],
  'SD-5-indonesia': [
    { judul: 'Menganalisis unsur cerita fiksi' },
    { judul: 'Menulis teks eksplanasi sederhana' },
    { judul: 'Menyimpulkan isi teks bacaan' },
    { judul: 'Debat dan diskusi sederhana' },
    { judul: 'Menyajikan informasi dalam bentuk poster' },
  ],
  'SD-5-matematika': [
    { judul: 'Operasi hitung pecahan campuran' },
    { judul: 'Perbandingan dan skala' },
    { judul: 'Bangun ruang (kubus, balok, prisma)' },
    { judul: 'Volume bangun ruang sederhana' },
    { judul: 'Pengolahan data dan diagram' },
  ],
  'SD-5-ipas': [
    { judul: 'Sistem pencernaan dan pernapasan manusia' },
    { judul: 'Ekosistem dan rantai makanan' },
    { judul: 'Peristiwa penting sejarah Indonesia' },
    { judul: 'Kegiatan ekonomi dan koperasi' },
  ],
  'SD-5-inggris': [
    { judul: 'Simple past tense' },
    { judul: 'Giving directions' },
    { judul: 'Describing daily routines' },
    { judul: 'Reading short stories' },
  ],
  'SD-5-pjok': [
    { judul: 'Teknik dasar permainan bola besar lanjutan' },
    { judul: 'Atletik: lompat jauh dan tolak peluru' },
    { judul: 'Senam lantai dasar' },
    { judul: 'Pertolongan pertama sederhana' },
  ],
  'SD-5-seni': [
    { judul: 'Melukis dengan berbagai media' },
    { judul: 'Kerajinan dari bahan daur ulang' },
    { judul: 'Ansambel musik sederhana' },
    { judul: 'Tari kreasi berkelompok' },
  ],
  'SD-5-mulok': [
    { judul: 'Membaca teks sederhana bahasa daerah' },
    { judul: 'Pepatah dan peribahasa daerah' },
    { judul: 'Kesenian tradisional setempat' },
  ],

  // ---------------------------------------------------------------
  // SD KELAS 6
  // ---------------------------------------------------------------
  'SD-6-agama': [
    { judul: 'Iman kepada hari akhir' },
    { judul: 'Kisah keteladanan tokoh penyebar agama' },
    { judul: 'Ibadah puasa dan hikmahnya' },
    { judul: 'Perilaku toleransi antarumat beragama' },
  ],
  'SD-6-pancasila': [
    { judul: 'Pancasila sebagai dasar dan pandangan hidup' },
    { judul: 'Hak asasi manusia dan kewajiban warga negara' },
    { judul: 'Globalisasi dan identitas bangsa' },
    { judul: 'Peran serta dalam menjaga persatuan' },
  ],
  'SD-6-indonesia': [
    { judul: 'Menulis teks pidato sederhana' },
    { judul: 'Menganalisis informasi dari berbagai sumber' },
    { judul: 'Membuat ringkasan teks nonfiksi' },
    { judul: 'Menyusun teks eksposisi' },
    { judul: 'Presentasi hasil karya' },
  ],
  'SD-6-matematika': [
    { judul: 'Bilangan bulat dan operasinya' },
    { judul: 'Persen dan aritmetika sosial' },
    { judul: 'Bangun ruang gabungan dan jaring-jaring' },
    { judul: 'Statistika dasar (rata-rata, modus, median)' },
    { judul: 'Koordinat dan sistem bidang kartesius' },
  ],
  'SD-6-ipas': [
    { judul: 'Sistem tata surya dan gerak bumi' },
    { judul: 'Adaptasi makhluk hidup terhadap lingkungan' },
    { judul: 'Perjuangan kemerdekaan Indonesia' },
    { judul: 'Kerja sama antarnegara ASEAN' },
  ],
  'SD-6-inggris': [
    { judul: 'Simple future tense' },
    { judul: 'Writing short descriptive texts' },
    { judul: 'Comparing things (comparative/superlative)' },
    { judul: 'Basic conversation practice' },
  ],
  'SD-6-pjok': [
    { judul: 'Strategi dan taktik permainan beregu' },
    { judul: 'Kebugaran jasmani dan pengukurannya' },
    { judul: 'Senam ritmik lanjutan' },
    { judul: 'Bahaya pergaulan bebas dan narkoba' },
  ],
  'SD-6-seni': [
    { judul: 'Membuat karya seni rupa dua dan tiga dimensi' },
    { judul: 'Kerajinan fungsional sederhana' },
    { judul: 'Menciptakan melodi sederhana' },
    { judul: 'Pergelaran tari dan musik' },
  ],
  'SD-6-mulok': [
    { judul: 'Menulis cerita pendek bahasa daerah' },
    { judul: 'Pidato atau pantun bahasa daerah' },
    { judul: 'Melestarikan warisan budaya lokal' },
  ],

  // ---------------------------------------------------------------
  // SMP KELAS 1 (VII)
  // ---------------------------------------------------------------
  'SMP-1-agama': [
    { judul: 'Al-Quran sebagai pedoman hidup' },
    { judul: 'Iman kepada Allah melalui sifat-sifat-Nya' },
    { judul: 'Tata cara bersuci (thaharah)' },
    { judul: 'Perilaku jujur dan amanah dalam pergaulan' },
  ],
  'SMP-1-pancasila': [
    { judul: 'Sejarah lahirnya Pancasila' },
    { judul: 'Norma, kebiasaan, dan hukum dalam masyarakat' },
    { judul: 'Kedudukan UUD 1945 sebagai konstitusi negara' },
    { judul: 'Keberagaman sebagai kekayaan bangsa' },
  ],
  'SMP-1-indonesia': [
    { judul: 'Teks deskripsi' },
    { judul: 'Teks narasi (cerita fantasi)' },
    { judul: 'Puisi rakyat (pantun, syair)' },
    { judul: 'Teks prosedur' },
    { judul: 'Menyimak dan menanggapi berita' },
  ],
  'SMP-1-matematika': [
    { judul: 'Bilangan bulat dan pecahan' },
    { judul: 'Himpunan' },
    { judul: 'Bentuk aljabar' },
    { judul: 'Persamaan dan pertidaksamaan linear satu variabel' },
    { judul: 'Perbandingan senilai dan berbalik nilai' },
  ],
  'SMP-1-ipa': [
    { judul: 'Metode ilmiah dan pengukuran' },
    { judul: 'Klasifikasi makhluk hidup' },
    { judul: 'Zat dan perubahannya' },
    { judul: 'Suhu dan kalor' },
    { judul: 'Organisasi kehidupan (sel, jaringan, organ)' },
  ],
  'SMP-1-ips': [
    { judul: 'Keadaan alam dan interaksi sosial' },
    { judul: 'Perkembangan masyarakat masa praaksara' },
    { judul: 'Kegiatan ekonomi dan kebutuhan manusia' },
    { judul: 'Sosialisasi dan interaksi sosial' },
  ],
  'SMP-1-inggris': [
    { judul: 'Introducing self and others' },
    { judul: 'Descriptive text about people, animals, and things' },
    { judul: 'Telling time and daily routines' },
    { judul: 'Simple instructions and short messages' },
  ],
  'SMP-1-informatika': [
    { judul: 'Berpikir komputasional dasar' },
    { judul: 'Pengenalan perangkat keras dan lunak' },
    { judul: 'Mengetik dan mengolah dokumen sederhana' },
    { judul: 'Etika dan keamanan digital' },
  ],
  'SMP-1-pjok': [
    { judul: 'Permainan bola besar (sepak bola, bola voli, bola basket)' },
    { judul: 'Atletik: jalan, lari, lompat, lempar' },
    { judul: 'Kebugaran jasmani' },
    { judul: 'Pola hidup sehat dan gizi seimbang' },
  ],
  'SMP-1-seni': [
    { judul: 'Menggambar ragam hias' },
    { judul: 'Bernyanyi unisono' },
    { judul: 'Gerak tari berdasarkan level dan ruang' },
    { judul: 'Pengenalan seni teater' },
  ],
  'SMP-1-prakarya': [
    { judul: 'Kerajinan dari bahan alam' },
    { judul: 'Budidaya tanaman sayuran' },
    { judul: 'Pengolahan makanan awetan nabati' },
    { judul: 'Pengenalan teknologi konstruksi sederhana' },
  ],

  // ---------------------------------------------------------------
  // SMP KELAS 2 (VIII)
  // ---------------------------------------------------------------
  'SMP-2-agama': [
    { judul: 'Iman kepada kitab-kitab Allah' },
    { judul: 'Perilaku hormat dan patuh kepada orang tua dan guru' },
    { judul: 'Sujud syukur, sujud sahwi, dan sujud tilawah' },
    { judul: 'Sejarah masuknya Islam di Nusantara' },
  ],
  'SMP-2-pancasila': [
    { judul: 'Makna alinea Pembukaan UUD 1945' },
    { judul: 'Kedaulatan rakyat dan sistem pemerintahan' },
    { judul: 'Sumpah Pemuda dan semangat kebangsaan' },
    { judul: 'Harmoni dalam keberagaman sosial budaya' },
  ],
  'SMP-2-indonesia': [
    { judul: 'Teks berita' },
    { judul: 'Teks iklan, slogan, dan poster' },
    { judul: 'Teks eksposisi' },
    { judul: 'Puisi (unsur dan maknanya)' },
    { judul: 'Teks ulasan (resensi)' },
  ],
  'SMP-2-matematika': [
    { judul: 'Pola bilangan dan barisan' },
    { judul: 'Koordinat kartesius' },
    { judul: 'Relasi dan fungsi' },
    { judul: 'Persamaan garis lurus' },
    { judul: 'Sistem persamaan linear dua variabel' },
  ],
  'SMP-2-ipa': [
    { judul: 'Gerak dan gaya' },
    { judul: 'Sistem pencernaan dan sistem pernapasan' },
    { judul: 'Getaran, gelombang, dan bunyi' },
    { judul: 'Cahaya dan alat optik' },
    { judul: 'Zat aditif dan zat adiktif' },
  ],
  'SMP-2-ips': [
    { judul: 'Interaksi keruangan negara-negara ASEAN' },
    { judul: 'Mobilitas sosial' },
    { judul: 'Perkembangan kolonialisme di Indonesia' },
    { judul: 'Perdagangan antardaerah dan antarnegara' },
  ],
  'SMP-2-inggris': [
    { judul: 'Asking and giving opinions' },
    { judul: 'Procedure text (recipes and instructions)' },
    { judul: 'Recount text about past experiences' },
    { judul: 'Expressing invitation and requests' },
  ],
  'SMP-2-informatika': [
    { judul: 'Algoritma dan pemrograman dasar' },
    { judul: 'Pengolahan data sederhana' },
    { judul: 'Jaringan komputer dan internet' },
    { judul: 'Dampak sosial informatika' },
  ],
  'SMP-2-pjok': [
    { judul: 'Variasi dan kombinasi gerak permainan bola kecil' },
    { judul: 'Senam lantai (guling, sikap lilin, dsb.)' },
    { judul: 'Aktivitas ritmik/senam irama' },
    { judul: 'Bahaya penyalahgunaan zat adiktif' },
  ],
  'SMP-2-seni': [
    { judul: 'Menggambar ilustrasi' },
    { judul: 'Bernyanyi lagu daerah secara vokal grup' },
    { judul: 'Menciptakan gerak tari kreasi' },
    { judul: 'Bermain peran sederhana (teater)' },
  ],
  'SMP-2-prakarya': [
    { judul: 'Kerajinan dari bahan limbah' },
    { judul: 'Budidaya ikan konsumsi' },
    { judul: 'Pengolahan makanan awetan hewani' },
    { judul: 'Rekayasa alat penjernih air sederhana' },
  ],

  // ---------------------------------------------------------------
  // SMP KELAS 3 (IX)
  // ---------------------------------------------------------------
  'SMP-3-agama': [
    { judul: 'Iman kepada qada dan qadar' },
    { judul: 'Perilaku menghindari pergaulan bebas' },
    { judul: 'Zakat, haji, dan wakaf' },
    { judul: 'Sejarah perkembangan Islam di dunia' },
  ],
  'SMP-3-pancasila': [
    { judul: 'Pancasila sebagai ideologi terbuka' },
    { judul: 'Bela negara dan wawasan kebangsaan' },
    { judul: 'Peran Indonesia dalam hubungan internasional' },
    { judul: 'Tantangan keberagaman di era globalisasi' },
  ],
  'SMP-3-indonesia': [
    { judul: 'Teks laporan hasil observasi' },
    { judul: 'Teks pidato persuasif' },
    { judul: 'Cerita pendek (cerpen)' },
    { judul: 'Teks tanggapan kritis' },
    { judul: 'Karya ilmiah sederhana' },
  ],
  'SMP-3-matematika': [
    { judul: 'Perpangkatan dan bentuk akar' },
    { judul: 'Persamaan kuadrat' },
    { judul: 'Fungsi kuadrat' },
    { judul: 'Transformasi geometri' },
    { judul: 'Kesebangunan dan kekongruenan' },
  ],
  'SMP-3-ipa': [
    { judul: 'Sistem reproduksi manusia' },
    { judul: 'Pewarisan sifat (genetika)' },
    { judul: 'Listrik statis dan dinamis' },
    { judul: 'Kemagnetan dan induksi elektromagnetik' },
    { judul: 'Bioteknologi sederhana' },
  ],
  'SMP-3-ips': [
    { judul: 'Perubahan sosial budaya di era globalisasi' },
    { judul: 'Ketergantungan antarruang dan perdagangan internasional' },
    { judul: 'Persiapan kemerdekaan Indonesia' },
    { judul: 'Kerja sama ekonomi internasional' },
  ],
  'SMP-3-inggris': [
    { judul: 'Expressing hopes, wishes, and congratulations' },
    { judul: 'Narrative text (legends and folktales)' },
    { judul: 'Report text about nature and phenomena' },
    { judul: 'Writing formal and informal letters' },
  ],
  'SMP-3-informatika': [
    { judul: 'Analisis data dengan spreadsheet' },
    { judul: 'Dasar pemrograman visual/blok' },
    { judul: 'Keamanan dan privasi data' },
    { judul: 'Proyek kolaboratif berbasis TIK' },
  ],
  'SMP-3-pjok': [
    { judul: 'Kombinasi keterampilan permainan bola besar dan kecil' },
    { judul: 'Atletik lanjutan (lompat tinggi, lempar lembing)' },
    { judul: 'Aktivitas kebugaran jasmani terprogram' },
    { judul: 'Pencegahan pergaulan berisiko dan penyakit menular' },
  ],
  'SMP-3-seni': [
    { judul: 'Karya seni rupa murni dan terapan' },
    { judul: 'Aransemen lagu sederhana' },
    { judul: 'Komposisi tari kreasi kelompok' },
    { judul: 'Pementasan teater sederhana' },
  ],
  'SMP-3-prakarya': [
    { judul: 'Kerajinan berbasis kearifan lokal' },
    { judul: 'Budidaya tanaman hias' },
    { judul: 'Pengolahan bahan pangan setengah jadi' },
    { judul: 'Rekayasa alat teknologi tepat guna' },
  ],
}

// =====================================================================
// 2) JENJANG & KELAS
// =====================================================================
const JENJANG = {
  SD: { label: 'SD', nama: 'Sekolah Dasar', kelas: [1, 2, 3, 4, 5, 6] },
  SMP: { label: 'SMP', nama: 'Sekolah Menengah Pertama', kelas: [1, 2, 3] },
}

// =====================================================================
// 3) MATA PELAJARAN
// =====================================================================
const MAPEL = {
  agama: { judul: 'Pendidikan Agama dan Budi Pekerti', icon: Heart, warna: 'emerald' },
  pancasila: { judul: 'Pendidikan Pancasila', icon: Landmark, warna: 'rose' },
  indonesia: { judul: 'Bahasa Indonesia', icon: BookOpen, warna: 'blue' },
  matematika: { judul: 'Matematika', icon: Calculator, warna: 'indigo' },
  ipas: { judul: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', icon: Sprout, warna: 'green' },
  ipa: { judul: 'IPA', icon: FlaskConical, warna: 'teal' },
  ips: { judul: 'IPS', icon: Globe, warna: 'amber' },
  inggris: { judul: 'Bahasa Inggris', icon: Languages, warna: 'sky' },
  pjok: { judul: 'PJOK', icon: Dumbbell, warna: 'orange' },
  seni: { judul: 'Seni dan Budaya', icon: Palette, warna: 'purple' },
  mulok: { judul: 'Muatan Lokal', icon: MapPin, warna: 'violet' },
  informatika: { judul: 'Informatika', icon: Monitor, warna: 'cyan' },
  prakarya: { judul: 'Prakarya', icon: Scissors, warna: 'slate' },
}

// Daftar mapel per jenjang dan kelas. Untuk menambah/mengurangi mapel,
// cukup ubah larik di bawah ini.
const MAPEL_SD_BAWAH = ['agama', 'pancasila', 'indonesia', 'matematika', 'pjok', 'seni', 'mulok']
const MAPEL_SD_ATAS = ['agama', 'pancasila', 'indonesia', 'matematika', 'ipas', 'inggris', 'pjok', 'seni', 'mulok']
const MAPEL_SMP = ['agama', 'pancasila', 'indonesia', 'matematika', 'ipa', 'ips', 'inggris', 'informatika', 'pjok', 'seni', 'prakarya']

const MAPEL_KELAS = {
  SD: { 1: MAPEL_SD_BAWAH, 2: MAPEL_SD_BAWAH, 3: MAPEL_SD_ATAS, 4: MAPEL_SD_ATAS, 5: MAPEL_SD_ATAS, 6: MAPEL_SD_ATAS },
  SMP: { 1: MAPEL_SMP, 2: MAPEL_SMP, 3: MAPEL_SMP },
}

// Palet warna kartu — pola sama dengan GudangSK.jsx.
const PALET_WARNA = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100', hoverBorder: 'hover:border-blue-400' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100', hoverBorder: 'hover:border-emerald-400' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100', hoverBorder: 'hover:border-purple-400' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100', hoverBorder: 'hover:border-amber-400' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-100', hoverBorder: 'hover:border-rose-400' },
  cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-100', hoverBorder: 'hover:border-cyan-400' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100', hoverBorder: 'hover:border-indigo-400' },
  teal: { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-100', hoverBorder: 'hover:border-teal-400' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100', hoverBorder: 'hover:border-orange-400' },
  sky: { bg: 'bg-sky-50', icon: 'text-sky-600', border: 'border-sky-100', hoverBorder: 'hover:border-sky-400' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-100', hoverBorder: 'hover:border-green-400' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100', hoverBorder: 'hover:border-violet-400' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', border: 'border-slate-200', hoverBorder: 'hover:border-slate-400' },
}

const kunciMateri = (jenjang, kelas, idMapel) => `${jenjang}-${kelas}-${idMapel}`

export default function MateriKelas() {
  const navigate = useNavigate()
  const [jenjang, setJenjang] = useState('SD')
  const [kelas, setKelas] = useState(1)
  const [cari, setCari] = useState('')
  const [terbuka, setTerbuka] = useState(null)

  const pilihJenjang = (j) => {
    setJenjang(j)
    setKelas(1)
    setTerbuka(null)
  }

  const pilihKelas = (k) => {
    setKelas(k)
    setTerbuka(null)
  }

  // Semua mapel untuk jenjang + kelas terpilih, lengkap dengan materinya.
  const semuaMapel = useMemo(() => {
    const ids = MAPEL_KELAS[jenjang]?.[kelas] || []
    return ids.map((id) => ({
      id,
      ...MAPEL[id],
      materi: MATERI[kunciMateri(jenjang, kelas, id)] || [],
    }))
  }, [jenjang, kelas])

  // Pencarian cocok ke nama mapel maupun judul materi.
  const daftarMapel = useMemo(() => {
    const kata = cari.trim().toLowerCase()
    if (!kata) return semuaMapel
    return semuaMapel.filter(
      (m) =>
        m.judul.toLowerCase().includes(kata) ||
        m.materi.some((x) => x.judul.toLowerCase().includes(kata))
    )
  }, [semuaMapel, cari])

  const totalMateri = semuaMapel.reduce((jumlah, m) => jumlah + m.materi.length, 0)

  return (
    <Layout
      title="Materi Pembelajaran"
      subtitle="Pilih jenjang dan kelas, lalu buka mata pelajaran untuk melihat materinya."
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-800 mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
        >
          <ArrowLeft size={14} /> Kembali
        </button>

        {/* Banner */}
        <div className="relative overflow-hidden rounded-xl p-4 sm:p-6 mb-5 sm:mb-6 flex flex-wrap items-center gap-3 sm:gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <GraduationCap size={22} />
          </div>
          <div className="relative min-w-0">
            <p className="font-display font-semibold text-lg text-white">
              {JENJANG[jenjang].nama} · Kelas {kelas}
            </p>
            <p className="text-xs sm:text-sm text-blue-200/80">
              {semuaMapel.length} mata pelajaran, {totalMateri} materi tersedia.
            </p>
          </div>
        </div>

        {/* Pilihan jenjang */}
        <div
          role="group"
          aria-label="Pilih jenjang"
          className="inline-flex rounded-xl bg-slate-100 p-1 mb-3"
        >
          {Object.entries(JENJANG).map(([kode, j]) => (
            <button
              key={kode}
              type="button"
              onClick={() => pilihJenjang(kode)}
              aria-pressed={jenjang === kode}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                jenjang === kode ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {j.label}
            </button>
          ))}
        </div>

        {/* Pilihan kelas */}
        <div role="group" aria-label="Pilih kelas" className="flex flex-wrap gap-2 mb-5">
          {JENJANG[jenjang].kelas.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => pilihKelas(k)}
              aria-pressed={kelas === k}
              className={`min-w-[5.5rem] px-4 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                kelas === k
                  ? 'bg-blue-900 border-blue-900 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              Kelas {k}
            </button>
          ))}
        </div>

        {/* Pencarian */}
        <div className="relative mb-5 sm:mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari mata pelajaran atau materi"
            aria-label="Cari mata pelajaran atau materi"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
          />
          {cari && (
            <button
              type="button"
              onClick={() => setCari('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {daftarMapel.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-700">Tidak ada yang cocok dengan "{cari}".</p>
            <p className="text-xs text-slate-500 mt-1">
              Coba kata kunci lain, atau hapus pencarian untuk melihat semua mata pelajaran kelas {kelas}.
            </p>
          </div>
        )}

        {/* Daftar mata pelajaran */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
          {daftarMapel.map((m) => {
            const warna = PALET_WARNA[m.warna] || PALET_WARNA.slate
            const Icon = m.icon
            const buka = terbuka === m.id || (cari.trim() !== '' && daftarMapel.length <= 3)
            const idPanel = `panel-${jenjang}-${kelas}-${m.id}`

            return (
              <div
                key={m.id}
                className={`bg-white rounded-2xl border transition-colors ${warna.border} ${warna.hoverBorder}`}
              >
                <button
                  type="button"
                  onClick={() => setTerbuka(terbuka === m.id ? null : m.id)}
                  aria-expanded={buka}
                  aria-controls={idPanel}
                  className="w-full flex items-center gap-3 p-4 text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <span
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${warna.bg} ${warna.icon}`}
                  >
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm sm:text-[15px] font-semibold text-slate-900 leading-snug">
                      {m.judul}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {m.materi.length > 0 ? `${m.materi.length} materi` : 'Belum ada materi'}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${buka ? 'rotate-180' : ''}`}
                  />
                </button>

                {buka && (
                  <div id={idPanel} className="px-4 pb-4">
                    {m.materi.length === 0 ? (
                      <p className="text-xs sm:text-[13px] text-slate-500 border-t border-slate-100 pt-3">
                        Materi {m.judul} kelas {kelas} belum ditambahkan. Tambahkan di{' '}
                        <code className="bg-slate-100 px-1 rounded">MATERI['{kunciMateri(jenjang, kelas, m.id)}']</code>.
                      </p>
                    ) : (
                      <ul className="border-t border-slate-100 pt-2 divide-y divide-slate-100">
                        {m.materi.map((x, i) => (
                          <li key={`${x.judul}-${i}`}>
                            {x.link ? (
                              <a
                                href={x.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 py-2.5 text-sm text-slate-700 hover:text-blue-700 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                              >
                                <FileText size={15} className="shrink-0 text-slate-400" />
                                <span className="flex-1">{x.judul}</span>
                                <ExternalLink size={13} className="shrink-0 text-slate-400" />
                              </a>
                            ) : (
                              <div className="flex items-center gap-2.5 py-2.5 text-sm text-slate-700">
                                <FileText size={15} className="shrink-0 text-slate-400" />
                                <span className="flex-1">{x.judul}</span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
