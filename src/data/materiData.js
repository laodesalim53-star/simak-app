// =====================================================================
// DATA MATERI — bagian yang paling sering Anda ubah
// =====================================================================
// Kunci: `${jenjang}-${kelas}-${idMapel}`, contoh: 'SD-1-matematika'.
// Isi tiap kunci berupa daftar materi. `link` boleh dikosongkan; kalau diisi
// (Google Drive, YouTube, dll.), materi tampil sebagai tautan yang bisa dibuka.
//
// Contoh:
//   'SD-1-matematika': [
//     { judul: 'Bilangan 1 sampai 10', link: 'https://drive.google.com/...' },
//     { judul: 'Penjumlahan dan pengurangan sederhana' },
//   ...MATERI_SD1,],
export const MATERI = {
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
   ...MATERI_SD1,
}
