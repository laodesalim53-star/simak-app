// =====================================================================
// MATERI — SD KELAS 2
// =====================================================================
// Format tiap item materi:
//   judul      : judul topik (wajib)
//   ringkasan  : teks singkat 1-2 kalimat (opsional, tampil di kartu ringkas)
//   materi     : penjelasan lengkap topik (opsional, tampil saat dibuka)
//   soal       : array 3 soal pilihan ganda (opsional)
//                { pertanyaan, pilihan: [4 opsi], kunci: indeks jawaban benar,
//                  pembahasan: penjelasan singkat kunci jawaban }
//   link       : tautan eksternal (opsional, kalau diisi materi tampil sebagai link)
export const MATERI_SD2 = {
  'SD-2-agama': [
    {
      judul: 'Mengenal kitab suci dan cara merawatnya',
      ringkasan: 'Siswa mengenal nama kitab suci agamanya dan belajar cara memperlakukannya dengan hormat, misalnya menyimpannya di tempat bersih dan tidak meletakkannya sembarangan.',
      materi: 'Kitab suci adalah pedoman hidup yang berisi ajaran agama, sehingga harus diperlakukan dengan penuh hormat dan kehati-hatian.\nCara merawat kitab suci antara lain menyimpannya di tempat yang bersih dan tinggi, tidak meletakkannya di lantai sembarangan, mencuci tangan sebelum memegangnya, dan tidak mencoret-coretnya.\nMembiasakan sikap hormat terhadap kitab suci sejak kecil akan menumbuhkan rasa cinta terhadap ajaran agama yang dipelajari.',
      soal: [
        {
          pertanyaan: 'Kitab suci sebaiknya disimpan di tempat yang...',
          pilihan: ['Lembap dan kotor', 'Bersih dan tinggi', 'Lantai sembarangan', 'Di luar rumah'],
          kunci: 1,
          pembahasan: 'Kitab suci sebaiknya disimpan di tempat yang bersih dan tinggi agar terjaga.',
        },
        {
          pertanyaan: 'Sebelum memegang kitab suci, sebaiknya kita...',
          pilihan: ['Mencuci tangan', 'Makan dahulu', 'Bermain dahulu', 'Tidur dahulu'],
          kunci: 0,
          pembahasan: 'Mencuci tangan sebelum memegang kitab suci adalah bentuk penghormatan.',
        },
        {
          pertanyaan: 'Kitab suci berisi...',
          pilihan: ['Ajaran agama', 'Resep masakan', 'Jadwal pelajaran', 'Peta dunia'],
          kunci: 0,
          pembahasan: 'Kitab suci berisi ajaran agama yang menjadi pedoman hidup.',
        },
      ],
    },
    {
      judul: 'Kisah keteladanan Nabi dan Rasul',
      ringkasan: 'Cerita singkat tentang sifat baik para nabi dan rasul, seperti sabar dan jujur, yang bisa dicontoh dalam kehidupan sehari-hari.',
      materi: 'Nabi dan Rasul adalah utusan Allah yang memiliki sifat-sifat terpuji sehingga patut dijadikan teladan, di antaranya sabar, jujur, amanah (dapat dipercaya), dan penyayang.\nKisah para nabi biasanya menceritakan bagaimana mereka menghadapi kesulitan dengan sabar dan tetap berbuat baik meskipun diperlakukan tidak adil oleh orang lain.\nSiswa diajak mengambil pelajaran dari kisah tersebut, misalnya tetap jujur meski sulit, sabar saat menghadapi masalah, dan selalu menepati janji.',
      soal: [
        {
          pertanyaan: 'Sifat dapat dipercaya disebut...',
          pilihan: ['Amanah', 'Sombong', 'Pemarah', 'Pembohong'],
          kunci: 0,
          pembahasan: 'Amanah artinya dapat dipercaya dalam menjalankan tugas.',
        },
        {
          pertanyaan: 'Kisah nabi mengajarkan kita untuk bersikap...',
          pilihan: ['Sabar dan jujur', 'Malas dan curang', 'Sombong dan pemarah', 'Egois dan pembohong'],
          kunci: 0,
          pembahasan: 'Kisah nabi mengajarkan sifat sabar dan jujur sebagai teladan.',
        },
        {
          pertanyaan: 'Nabi dan Rasul adalah...',
          pilihan: ['Utusan Allah', 'Tokoh cerita fiksi', 'Pemimpin negara', 'Tokoh kartun'],
          kunci: 0,
          pembahasan: 'Nabi dan Rasul adalah utusan Allah yang membawa ajaran kebaikan.',
        },
      ],
    },
    {
      judul: 'Tata cara wudu dan salat berjemaah',
      ringkasan: 'Siswa belajar urutan berwudu dengan benar serta mempraktikkan salat berjemaah bersama teman di sekolah.',
      materi: 'Wudu adalah cara bersuci sebelum salat dengan membasuh anggota tubuh tertentu secara berurutan, yaitu wajah, tangan, sebagian kepala, dan kaki.\nSalat berjemaah adalah salat yang dilakukan bersama-sama, dipimpin oleh satu orang imam dan diikuti oleh makmum di belakangnya, dengan gerakan yang serempak.\nMelaksanakan salat berjemaah melatih kekompakan, kedisiplinan mengikuti gerakan imam, dan mempererat persaudaraan antar teman.',
      soal: [
        {
          pertanyaan: 'Wudu dilakukan sebelum melaksanakan...',
          pilihan: ['Salat', 'Makan', 'Bermain', 'Tidur'],
          kunci: 0,
          pembahasan: 'Wudu adalah cara bersuci yang dilakukan sebelum salat.',
        },
        {
          pertanyaan: 'Orang yang memimpin salat berjemaah disebut...',
          pilihan: ['Makmum', 'Imam', 'Muazin', 'Khatib'],
          kunci: 1,
          pembahasan: 'Imam adalah orang yang memimpin salat berjemaah.',
        },
        {
          pertanyaan: 'Manfaat salat berjemaah adalah melatih...',
          pilihan: ['Kekompakan', 'Sikap egois', 'Rasa malas', 'Sikap sombong'],
          kunci: 0,
          pembahasan: 'Salat berjemaah melatih kekompakan dan persaudaraan.',
        },
      ],
    },
    {
      judul: 'Sikap jujur dan santun dalam keseharian',
      ringkasan: 'Membiasakan berkata benar, tidak berbohong, serta bersikap sopan kepada orang tua, guru, dan teman.',
      materi: 'Jujur berarti berkata dan berbuat sesuai dengan kenyataan, tidak menutupi kebenaran atau berbohong kepada orang lain.\nSantun berarti bersikap sopan dalam bertutur kata dan berperilaku, misalnya berbicara dengan lembut, tidak memotong pembicaraan orang lain, dan menghormati orang yang lebih tua.\nSiswa dibiasakan bersikap jujur dan santun kepada orang tua, guru, dan teman dalam kehidupan sehari-hari, misalnya mengakui kesalahan dan berbicara dengan bahasa yang baik.',
      soal: [
        {
          pertanyaan: 'Berkata sesuai kenyataan disebut sikap...',
          pilihan: ['Jujur', 'Bohong', 'Sombong', 'Malas'],
          kunci: 0,
          pembahasan: 'Jujur artinya berkata sesuai dengan kenyataan.',
        },
        {
          pertanyaan: 'Contoh sikap santun adalah...',
          pilihan: ['Berbicara dengan lembut', 'Memotong pembicaraan orang', 'Berteriak kepada guru', 'Mengejek teman'],
          kunci: 0,
          pembahasan: 'Berbicara dengan lembut adalah contoh sikap santun.',
        },
        {
          pertanyaan: 'Jika kita berbuat salah, sikap jujur yang tepat adalah...',
          pilihan: ['Mengakui kesalahan', 'Menyalahkan orang lain', 'Berbohong', 'Diam saja pura-pura tidak tahu'],
          kunci: 0,
          pembahasan: 'Mengakui kesalahan adalah bentuk kejujuran.',
        },
      ],
    },
  ],
  'SD-2-pancasila': [
    {
      judul: 'Makna sila-sila Pancasila',
      ringkasan: 'Mengenal arti sederhana dari kelima sila Pancasila dan contoh perilaku yang mencerminkannya di rumah dan sekolah.',
      materi: 'Pancasila terdiri dari 5 sila yang masing-masing memiliki makna: sila pertama tentang ketuhanan, sila kedua tentang kemanusiaan yang adil dan beradab, sila ketiga tentang persatuan Indonesia, sila keempat tentang musyawarah, dan sila kelima tentang keadilan sosial.\nSetiap sila memiliki contoh perilaku yang bisa dipraktikkan sehari-hari, misalnya sila pertama dengan beribadah sesuai agama masing-masing, dan sila kedua dengan saling tolong-menolong.\nMemahami makna Pancasila membantu siswa menerapkan nilai-nilainya dalam kehidupan di rumah, sekolah, dan masyarakat.',
      soal: [
        {
          pertanyaan: 'Sila pertama Pancasila berbunyi...',
          pilihan: ['Ketuhanan Yang Maha Esa', 'Kemanusiaan yang Adil dan Beradab', 'Persatuan Indonesia', 'Keadilan Sosial'],
          kunci: 0,
          pembahasan: 'Sila pertama Pancasila adalah Ketuhanan Yang Maha Esa.',
        },
        {
          pertanyaan: 'Contoh pengamalan sila kedua adalah...',
          pilihan: ['Beribadah', 'Saling tolong-menolong', 'Bermusyawarah', 'Bergotong royong membangun jalan'],
          kunci: 1,
          pembahasan: 'Sila kedua tentang kemanusiaan dicontohkan dengan saling tolong-menolong.',
        },
        {
          pertanyaan: 'Jumlah sila dalam Pancasila ada...',
          pilihan: ['4', '5', '6', '3'],
          kunci: 1,
          pembahasan: 'Pancasila terdiri dari 5 sila.',
        },
      ],
    },
    {
      judul: 'Hak dan kewajiban di rumah dan sekolah',
      ringkasan: 'Siswa belajar membedakan hak (misalnya bermain) dan kewajiban (misalnya belajar) yang harus dijalankan bersama.',
      materi: 'Hak adalah sesuatu yang boleh kita dapatkan atau lakukan, sedangkan kewajiban adalah sesuatu yang harus kita lakukan sebagai tanggung jawab.\nContoh hak siswa di sekolah adalah mendapat pengajaran dari guru dan bermain saat istirahat, sedangkan contoh kewajiban adalah belajar dengan sungguh-sungguh dan mematuhi tata tertib sekolah.\nDi rumah, contoh hak anak adalah mendapat kasih sayang orang tua, sedangkan kewajibannya adalah membantu pekerjaan rumah dan menghormati orang tua. Hak dan kewajiban harus seimbang agar kehidupan berjalan harmonis.',
      soal: [
        {
          pertanyaan: 'Sesuatu yang boleh kita dapatkan disebut...',
          pilihan: ['Hak', 'Kewajiban', 'Hukuman', 'Larangan'],
          kunci: 0,
          pembahasan: 'Hak adalah sesuatu yang boleh kita dapatkan atau lakukan.',
        },
        {
          pertanyaan: 'Contoh kewajiban siswa di sekolah adalah...',
          pilihan: ['Bermain saat pelajaran', 'Belajar dengan sungguh-sungguh', 'Mengganggu teman', 'Terlambat setiap hari'],
          kunci: 1,
          pembahasan: 'Belajar dengan sungguh-sungguh adalah kewajiban siswa di sekolah.',
        },
        {
          pertanyaan: 'Contoh hak anak di rumah adalah...',
          pilihan: ['Mendapat kasih sayang orang tua', 'Dimarahi terus-menerus', 'Tidak diberi makan', 'Dilarang bermain selamanya'],
          kunci: 0,
          pembahasan: 'Mendapat kasih sayang orang tua adalah hak setiap anak di rumah.',
        },
      ],
    },
    {
      judul: 'Hidup rukun dalam keberagaman',
      ringkasan: 'Belajar akur dan saling menghargai meski teman-teman berbeda suku, agama, atau kebiasaan.',
      materi: 'Keberagaman adalah keadaan di mana terdapat banyak perbedaan, seperti suku, agama, bahasa, dan kebiasaan di antara masyarakat Indonesia.\nHidup rukun berarti bisa hidup berdampingan dengan damai meskipun ada perbedaan, misalnya tetap bermain bersama teman walau berbeda suku atau agama.\nSikap yang perlu dibiasakan agar hidup rukun antara lain saling menghargai, tidak mengejek perbedaan, mau membantu teman yang kesulitan, dan menyelesaikan masalah tanpa bertengkar.',
      soal: [
        {
          pertanyaan: 'Hidup rukun berarti hidup...',
          pilihan: ['Berdampingan dengan damai', 'Saling bertengkar', 'Saling mengejek', 'Terpisah-pisah'],
          kunci: 0,
          pembahasan: 'Hidup rukun berarti bisa hidup berdampingan dengan damai meski berbeda.',
        },
        {
          pertanyaan: 'Contoh keberagaman di Indonesia adalah perbedaan...',
          pilihan: ['Suku dan agama', 'Warna langit', 'Bentuk bulan', 'Jumlah planet'],
          kunci: 0,
          pembahasan: 'Keberagaman di Indonesia terlihat dari perbedaan suku dan agama.',
        },
        {
          pertanyaan: 'Sikap yang tepat menghadapi perbedaan adalah...',
          pilihan: ['Saling menghargai', 'Mengejek', 'Menjauhi', 'Memusuhi'],
          kunci: 0,
          pembahasan: 'Saling menghargai adalah sikap tepat dalam menghadapi perbedaan.',
        },
      ],
    },
    {
      judul: 'Musyawarah untuk mufakat',
      ringkasan: 'Mengenal cara mengambil keputusan bersama lewat diskusi kelas, misalnya memilih ketua kelas atau permainan bersama.',
      materi: 'Musyawarah adalah cara mengambil keputusan bersama dengan berdiskusi, mendengarkan pendapat semua orang, hingga tercapai kesepakatan bersama yang disebut mufakat.\nContoh musyawarah di kelas adalah saat memilih ketua kelas, menentukan permainan yang akan dimainkan bersama, atau membagi tugas kelompok.\nDalam musyawarah, setiap orang berhak menyampaikan pendapat, namun harus menghargai pendapat orang lain dan menerima hasil keputusan bersama dengan lapang dada.',
      soal: [
        {
          pertanyaan: 'Musyawarah adalah cara mengambil keputusan dengan...',
          pilihan: ['Berdiskusi bersama', 'Memaksakan kehendak', 'Bertengkar', 'Diam-diam sendiri'],
          kunci: 0,
          pembahasan: 'Musyawarah dilakukan dengan cara berdiskusi bersama.',
        },
        {
          pertanyaan: 'Hasil kesepakatan dari musyawarah disebut...',
          pilihan: ['Mufakat', 'Hukuman', 'Larangan', 'Perintah'],
          kunci: 0,
          pembahasan: 'Kesepakatan bersama hasil musyawarah disebut mufakat.',
        },
        {
          pertanyaan: 'Sikap yang tepat saat pendapat kita tidak dipilih dalam musyawarah adalah...',
          pilihan: ['Menerima dengan lapang dada', 'Marah-marah', 'Keluar dari kelas', 'Mengganggu teman'],
          kunci: 0,
          pembahasan: 'Kita harus menerima hasil musyawarah dengan lapang dada.',
        },
      ],
    },
  ],
  'SD-2-indonesia': [
    {
      judul: 'Membaca teks pendek dengan lancar',
      ringkasan: 'Berlatih membaca kalimat dan paragraf pendek dengan intonasi yang tepat dan lancar.',
      materi: 'Membaca lancar berarti membaca tanpa terbata-bata, dengan kecepatan yang wajar dan intonasi yang sesuai dengan tanda baca.\nSiswa berlatih membaca teks pendek, seperti beberapa kalimat atau satu paragraf, sambil memperhatikan tanda titik untuk berhenti sejenak dan tanda tanya untuk nada bertanya.\nLatihan membaca secara rutin akan meningkatkan kelancaran, membantu siswa memahami isi bacaan, serta menambah kosakata baru yang ditemui dalam teks.',
      soal: [
        {
          pertanyaan: 'Membaca lancar berarti membaca tanpa...',
          pilihan: ['Terbata-bata', 'Suara', 'Melihat teks', 'Bernafas'],
          kunci: 0,
          pembahasan: 'Membaca lancar berarti membaca tanpa terbata-bata.',
        },
        {
          pertanyaan: 'Saat membaca dan menemukan tanda titik, sebaiknya kita...',
          pilihan: ['Berhenti sejenak', 'Membaca lebih cepat', 'Berteriak', 'Berhenti membaca'],
          kunci: 0,
          pembahasan: 'Tanda titik menandakan kita perlu berhenti sejenak.',
        },
        {
          pertanyaan: 'Manfaat latihan membaca secara rutin adalah...',
          pilihan: ['Menambah kosakata', 'Mengurangi kosakata', 'Membuat bosan', 'Tidak ada manfaat'],
          kunci: 0,
          pembahasan: 'Latihan membaca rutin dapat menambah kosakata baru.',
        },
      ],
    },
    {
      judul: 'Menulis kalimat sederhana',
      ringkasan: 'Menulis kalimat lengkap dengan huruf kapital dan tanda baca yang benar, misalnya tentang kegiatan sehari-hari.',
      materi: 'Kalimat sederhana adalah kalimat yang terdiri dari satu ide pokok, biasanya berupa subjek dan predikat, seperti "Adik bermain bola".\nSaat menulis kalimat, siswa perlu memperhatikan aturan penulisan, yaitu diawali huruf kapital dan diakhiri tanda baca yang sesuai, seperti tanda titik untuk kalimat berita.\nSiswa berlatih menulis kalimat sederhana tentang kegiatan sehari-hari, misalnya "Aku bangun pagi", "Ibu memasak sarapan", atau "Kami bermain di taman".',
      soal: [
        {
          pertanyaan: 'Kalimat yang benar harus diawali dengan huruf...',
          pilihan: ['Kapital', 'Kecil', 'Miring', 'Tebal'],
          kunci: 0,
          pembahasan: 'Kalimat yang benar diawali dengan huruf kapital.',
        },
        {
          pertanyaan: 'Kalimat berita diakhiri dengan tanda...',
          pilihan: ['Titik', 'Tanya', 'Seru', 'Koma'],
          kunci: 0,
          pembahasan: 'Kalimat berita diakhiri dengan tanda titik.',
        },
        {
          pertanyaan: 'Contoh kalimat sederhana yang benar adalah...',
          pilihan: ['Adik bermain bola.', 'adik bermain bola', 'ADIK Bermain BOLA', 'Adik, bermain, bola'],
          kunci: 0,
          pembahasan: '"Adik bermain bola." memakai huruf kapital di awal dan titik di akhir.',
        },
      ],
    },
    {
      judul: 'Menceritakan kembali isi cerita',
      ringkasan: 'Setelah mendengar atau membaca cerita, siswa menceritakan ulang isinya dengan kata-kata sendiri.',
      materi: 'Menceritakan kembali adalah kegiatan mengulang isi sebuah cerita menggunakan kata-kata sendiri, tanpa harus sama persis dengan cerita aslinya.\nUntuk bisa menceritakan kembali dengan baik, siswa perlu menyimak atau membaca cerita dengan saksama, mengingat tokoh, tempat kejadian, dan urutan peristiwa.\nLatihan ini membantu siswa memahami isi cerita secara mendalam serta melatih kemampuan berbicara dan menyusun kalimat secara runtut.',
      soal: [
        {
          pertanyaan: 'Menceritakan kembali berarti mengulang cerita dengan...',
          pilihan: ['Kata-kata sendiri', 'Menyalin persis', 'Diam saja', 'Menggambar saja'],
          kunci: 0,
          pembahasan: 'Menceritakan kembali dilakukan dengan kata-kata sendiri.',
        },
        {
          pertanyaan: 'Hal yang perlu diingat saat menceritakan kembali adalah...',
          pilihan: ['Tokoh dan urutan peristiwa', 'Warna baju penulis', 'Jumlah halaman buku', 'Harga buku'],
          kunci: 0,
          pembahasan: 'Tokoh dan urutan peristiwa penting untuk diingat.',
        },
        {
          pertanyaan: 'Manfaat latihan menceritakan kembali adalah melatih kemampuan...',
          pilihan: ['Berbicara', 'Berenang', 'Menggambar', 'Berlari'],
          kunci: 0,
          pembahasan: 'Latihan ini melatih kemampuan berbicara dan menyusun kalimat.',
        },
      ],
    },
    {
      judul: 'Mengenal kosakata tentang lingkungan',
      ringkasan: 'Memperkaya kosakata seputar rumah, sekolah, dan alam sekitar melalui gambar dan bacaan.',
      materi: 'Kosakata adalah kumpulan kata yang kita ketahui dan gunakan dalam berbicara maupun menulis. Semakin banyak kosakata, semakin mudah kita menyampaikan ide.\nSiswa belajar kosakata baru seputar lingkungan sekitar, seperti nama benda di rumah (meja, kursi, lemari), nama tempat di sekolah (perpustakaan, kantin, lapangan), dan nama benda di alam (sungai, gunung, sawah).\nKosakata baru biasanya dikenalkan melalui gambar, bacaan pendek, atau permainan tebak kata, agar siswa lebih mudah mengingat dan memahami artinya.',
      soal: [
        {
          pertanyaan: 'Kosakata adalah kumpulan...',
          pilihan: ['Kata yang kita ketahui', 'Gambar yang kita lihat', 'Angka yang kita hitung', 'Warna yang kita kenal'],
          kunci: 0,
          pembahasan: 'Kosakata adalah kumpulan kata yang kita ketahui dan gunakan.',
        },
        {
          pertanyaan: 'Contoh kosakata tempat di sekolah adalah...',
          pilihan: ['Perpustakaan', 'Sungai', 'Gunung', 'Sawah'],
          kunci: 0,
          pembahasan: 'Perpustakaan adalah contoh tempat yang ada di sekolah.',
        },
        {
          pertanyaan: 'Semakin banyak kosakata yang kita miliki, semakin mudah kita...',
          pilihan: ['Menyampaikan ide', 'Melupakan bahasa', 'Sulit berbicara', 'Sulit menulis'],
          kunci: 0,
          pembahasan: 'Banyak kosakata memudahkan kita menyampaikan ide.',
        },
      ],
    },
    {
      judul: 'Menulis puisi anak sederhana',
      ringkasan: 'Mencoba menulis baris-baris puisi pendek tentang benda atau perasaan yang dekat dengan keseharian siswa.',
      materi: 'Puisi adalah karya tulis yang menggunakan kata-kata indah dan singkat untuk mengungkapkan perasaan atau menggambarkan sesuatu.\nPuisi anak sederhana biasanya terdiri dari beberapa baris pendek yang mudah dipahami, misalnya menggambarkan ibu, sahabat, atau alam sekitar.\nSiswa berlatih menulis puisi sederhana dengan memilih kata-kata yang indah tentang benda atau perasaan yang dekat dengan kesehariannya, seperti perasaan senang atau kasih sayang kepada keluarga.',
      soal: [
        {
          pertanyaan: 'Puisi menggunakan kata-kata yang...',
          pilihan: ['Indah dan singkat', 'Panjang dan rumit', 'Berupa angka', 'Berupa rumus'],
          kunci: 0,
          pembahasan: 'Puisi menggunakan kata-kata indah dan singkat.',
        },
        {
          pertanyaan: 'Puisi biasanya digunakan untuk mengungkapkan...',
          pilihan: ['Perasaan', 'Data statistik', 'Hasil hitungan', 'Jadwal pelajaran'],
          kunci: 0,
          pembahasan: 'Puisi digunakan untuk mengungkapkan perasaan atau menggambarkan sesuatu.',
        },
        {
          pertanyaan: 'Contoh tema puisi anak sederhana adalah...',
          pilihan: ['Kasih sayang ibu', 'Rumus matematika', 'Peta dunia', 'Kode pemrograman'],
          kunci: 0,
          pembahasan: 'Kasih sayang ibu adalah tema yang dekat dengan keseharian anak.',
        },
      ],
    },
  ],
  'SD-2-matematika': [
    {
      judul: 'Bilangan sampai 100',
      ringkasan: 'Membaca, menulis, dan membandingkan bilangan sampai 100, termasuk mengurutkan dari terkecil ke terbesar.',
      materi: 'Bilangan sampai 100 terdiri dari bilangan puluhan dan satuan, misalnya bilangan 45 terdiri dari 4 puluhan dan 5 satuan.\nSiswa berlatih membaca dan menulis bilangan sampai 100, serta membandingkan dua bilangan untuk menentukan mana yang lebih besar atau lebih kecil menggunakan simbol lebih dari (>) dan kurang dari (<).\nSelain itu, siswa juga belajar mengurutkan sekumpulan bilangan dari yang terkecil ke terbesar, atau sebaliknya, sebagai latihan pemahaman nilai bilangan.',
      soal: [
        {
          pertanyaan: 'Bilangan 45 terdiri dari...',
          pilihan: ['4 puluhan dan 5 satuan', '5 puluhan dan 4 satuan', '45 satuan tanpa puluhan', '4 satuan dan 5 puluhan'],
          kunci: 0,
          pembahasan: '45 terdiri dari 4 puluhan (40) dan 5 satuan (5).',
        },
        {
          pertanyaan: 'Bilangan yang lebih besar antara 67 dan 76 adalah...',
          pilihan: ['67', '76', 'Sama besar', 'Tidak bisa dibandingkan'],
          kunci: 1,
          pembahasan: '76 lebih besar daripada 67.',
        },
        {
          pertanyaan: 'Urutan bilangan dari terkecil ke terbesar adalah...',
          pilihan: ['30, 15, 50', '15, 30, 50', '50, 30, 15', '30, 50, 15'],
          kunci: 1,
          pembahasan: 'Urutan dari terkecil ke terbesar yang benar adalah 15, 30, 50.',
        },
      ],
    },
    {
      judul: 'Penjumlahan dan pengurangan bersusun',
      ringkasan: 'Berlatih menjumlah dan mengurangi dua bilangan dengan cara bersusun ke bawah.',
      materi: 'Penjumlahan dan pengurangan bersusun adalah cara menghitung dengan menuliskan bilangan secara vertikal, sesuai nilai tempatnya (satuan di bawah satuan, puluhan di bawah puluhan).\nSaat menjumlahkan bersusun, kita mulai menghitung dari kolom satuan terlebih dahulu, lalu kolom puluhan. Jika hasil satuan lebih dari 9, angka puluhannya disimpan dan ditambahkan ke kolom puluhan.\nCara yang sama berlaku untuk pengurangan bersusun, namun jika angka atas lebih kecil dari angka bawah, kita perlu meminjam satu dari puluhan di sebelahnya.',
      soal: [
        {
          pertanyaan: 'Hasil dari 27 + 15 dengan cara bersusun adalah...',
          pilihan: ['42', '32', '52', '12'],
          kunci: 0,
          pembahasan: '27 + 15 = 42.',
        },
        {
          pertanyaan: 'Hasil dari 54 - 28 dengan cara bersusun adalah...',
          pilihan: ['26', '36', '16', '32'],
          kunci: 0,
          pembahasan: '54 - 28 = 26.',
        },
        {
          pertanyaan: 'Saat menghitung bersusun, kolom yang dihitung terlebih dahulu adalah...',
          pilihan: ['Satuan', 'Puluhan', 'Ratusan', 'Semua sekaligus'],
          kunci: 0,
          pembahasan: 'Perhitungan bersusun dimulai dari kolom satuan.',
        },
      ],
    },
    {
      judul: 'Perkalian sebagai penjumlahan berulang',
      ringkasan: 'Mengenal konsep perkalian dengan menjumlahkan bilangan yang sama berulang kali, misalnya 3 + 3 + 3 = 3 x 3.',
      materi: 'Perkalian adalah cara cepat untuk menghitung penjumlahan bilangan yang sama secara berulang. Misalnya 3 + 3 + 3 dapat ditulis lebih singkat menjadi 3 x 3.\nDalam perkalian, angka pertama menunjukkan bilangan yang dijumlahkan, dan angka kedua menunjukkan berapa kali bilangan tersebut dijumlahkan. Contoh: 4 x 2 berarti 4 dijumlahkan sebanyak 2 kali, yaitu 4 + 4 = 8.\nSiswa berlatih mengubah bentuk penjumlahan berulang menjadi perkalian, dan sebaliknya, sebagai dasar sebelum menghafal tabel perkalian.',
      soal: [
        {
          pertanyaan: 'Bentuk perkalian dari 5 + 5 + 5 adalah...',
          pilihan: ['5 x 3', '3 x 3', '5 x 2', '3 x 5 x 5'],
          kunci: 0,
          pembahasan: '5 + 5 + 5 (tiga kali angka 5) sama dengan 5 x 3.',
        },
        {
          pertanyaan: 'Hasil dari 4 x 2 adalah...',
          pilihan: ['6', '8', '10', '4'],
          kunci: 1,
          pembahasan: '4 x 2 = 4 + 4 = 8.',
        },
        {
          pertanyaan: 'Perkalian adalah cara cepat untuk menghitung...',
          pilihan: ['Penjumlahan berulang', 'Pengurangan berulang', 'Bilangan acak', 'Pembulatan angka'],
          kunci: 0,
          pembahasan: 'Perkalian merupakan cara cepat menghitung penjumlahan bilangan yang sama secara berulang.',
        },
      ],
    },
    {
      judul: 'Pengenalan pembagian sederhana',
      ringkasan: 'Belajar membagi kumpulan benda menjadi bagian yang sama besar sebagai dasar konsep pembagian.',
      materi: 'Pembagian adalah operasi membagi suatu jumlah menjadi beberapa bagian yang sama besar.\nSiswa belajar konsep pembagian dengan cara membagikan benda konkret secara merata, misalnya 8 permen dibagikan kepada 2 anak, sehingga masing-masing mendapat 4 permen (8 : 2 = 4).\nPembagian merupakan kebalikan dari perkalian, sehingga siswa juga diajak melihat hubungannya, misalnya jika 4 x 2 = 8, maka 8 : 2 = 4.',
      soal: [
        {
          pertanyaan: 'Jika 8 permen dibagi rata kepada 2 anak, masing-masing mendapat...',
          pilihan: ['3 permen', '4 permen', '5 permen', '6 permen'],
          kunci: 1,
          pembahasan: '8 : 2 = 4, jadi masing-masing anak mendapat 4 permen.',
        },
        {
          pertanyaan: 'Pembagian adalah kebalikan dari...',
          pilihan: ['Penjumlahan', 'Pengurangan', 'Perkalian', 'Pembulatan'],
          kunci: 2,
          pembahasan: 'Pembagian merupakan kebalikan dari operasi perkalian.',
        },
        {
          pertanyaan: 'Hasil dari 10 : 5 adalah...',
          pilihan: ['1', '2', '5', '10'],
          kunci: 1,
          pembahasan: '10 : 5 = 2.',
        },
      ],
    },
    {
      judul: 'Mengenal satuan waktu dan uang',
      ringkasan: 'Membaca jam, mengenal hari dan bulan, serta mengenal nilai mata uang untuk berhitung sederhana.',
      materi: 'Satuan waktu digunakan untuk mengetahui lamanya suatu kejadian, seperti detik, menit, jam, hari, minggu, dan bulan. Siswa belajar membaca jam analog untuk mengetahui pukul berapa saat itu.\nSelain waktu, siswa juga mengenal nama-nama hari dalam seminggu dan bulan dalam setahun secara berurutan.\nSiswa juga mulai mengenal nilai mata uang rupiah, mulai dari uang koin hingga uang kertas, serta berlatih berhitung sederhana seperti menjumlahkan nilai uang atau menghitung kembalian.',
      soal: [
        {
          pertanyaan: 'Satu jam sama dengan berapa menit?',
          pilihan: ['30 menit', '60 menit', '100 menit', '24 menit'],
          kunci: 1,
          pembahasan: 'Satu jam sama dengan 60 menit.',
        },
        {
          pertanyaan: 'Jumlah hari dalam satu minggu ada...',
          pilihan: ['5', '6', '7', '8'],
          kunci: 2,
          pembahasan: 'Satu minggu terdiri dari 7 hari.',
        },
        {
          pertanyaan: 'Jika membeli barang seharga Rp2.000 dan membayar dengan Rp5.000, kembaliannya adalah...',
          pilihan: ['Rp2.000', 'Rp3.000', 'Rp5.000', 'Rp7.000'],
          kunci: 1,
          pembahasan: 'Rp5.000 - Rp2.000 = Rp3.000.',
        },
      ],
    },
    {
      judul: 'Bangun ruang sederhana',
      ringkasan: 'Mengenal bentuk kubus, balok, bola, dan tabung dari benda-benda di sekitar.',
      materi: 'Bangun ruang adalah bentuk yang memiliki tiga dimensi, yaitu panjang, lebar, dan tinggi, berbeda dengan bangun datar yang hanya dua dimensi.\nBeberapa bangun ruang yang dikenalkan di kelas 2 antara lain kubus (seperti dadu), balok (seperti kotak sepatu), bola (seperti bola sepak), dan tabung (seperti kaleng susu).\nSiswa diajak mengamati benda-benda di sekitar untuk menemukan contoh bangun ruang, sehingga lebih mudah memahami bentuk-bentuk tersebut dalam kehidupan sehari-hari.',
      soal: [
        {
          pertanyaan: 'Bangun ruang yang berbentuk seperti dadu adalah...',
          pilihan: ['Kubus', 'Bola', 'Tabung', 'Balok'],
          kunci: 0,
          pembahasan: 'Kubus adalah bangun ruang yang berbentuk seperti dadu.',
        },
        {
          pertanyaan: 'Contoh benda berbentuk tabung adalah...',
          pilihan: ['Kaleng susu', 'Dadu', 'Bola sepak', 'Kotak sepatu'],
          kunci: 0,
          pembahasan: 'Kaleng susu adalah contoh benda berbentuk tabung.',
        },
        {
          pertanyaan: 'Bangun ruang memiliki dimensi berupa...',
          pilihan: ['Panjang dan lebar saja', 'Panjang, lebar, dan tinggi', 'Hanya tinggi', 'Tidak memiliki dimensi'],
          kunci: 1,
          pembahasan: 'Bangun ruang memiliki tiga dimensi: panjang, lebar, dan tinggi.',
        },
      ],
    },
  ],
  'SD-2-pjok': [
    {
      judul: 'Kombinasi gerak lokomotor dan non-lokomotor',
      ringkasan: 'Menggabungkan gerakan berpindah tempat (lari, lompat) dengan gerakan di tempat (menekuk, memutar) dalam satu latihan.',
      materi: 'Kombinasi gerak adalah gabungan antara gerak lokomotor (berpindah tempat) dan gerak non-lokomotor (di tempat) yang dilakukan secara berurutan dalam satu rangkaian latihan.\nContohnya adalah berlari lalu berhenti dan memutar badan, atau melompat lalu menekuk lutut sambil berdiri di tempat.\nLatihan kombinasi gerak ini bertujuan melatih kelincahan, koordinasi tubuh, serta membuat siswa lebih terampil dalam bergerak.',
      soal: [
        {
          pertanyaan: 'Kombinasi gerak adalah gabungan antara gerak...',
          pilihan: ['Lokomotor dan non-lokomotor', 'Hanya lokomotor', 'Hanya non-lokomotor', 'Diam saja'],
          kunci: 0,
          pembahasan: 'Kombinasi gerak menggabungkan gerak lokomotor dan non-lokomotor.',
        },
        {
          pertanyaan: 'Contoh kombinasi gerak adalah...',
          pilihan: ['Berlari lalu memutar badan', 'Duduk diam saja', 'Tidur di lapangan', 'Membaca buku'],
          kunci: 0,
          pembahasan: 'Berlari (lokomotor) lalu memutar badan (non-lokomotor) adalah contoh kombinasi gerak.',
        },
        {
          pertanyaan: 'Latihan kombinasi gerak bertujuan melatih...',
          pilihan: ['Kelincahan', 'Rasa kantuk', 'Rasa lapar', 'Sikap malas'],
          kunci: 0,
          pembahasan: 'Latihan kombinasi gerak bertujuan melatih kelincahan dan koordinasi tubuh.',
        },
      ],
    },
    {
      judul: 'Permainan kecil beregu',
      ringkasan: 'Bermain permainan sederhana secara berkelompok yang melatih kerja sama dan kekompakan.',
      materi: 'Permainan kecil beregu adalah permainan sederhana yang dimainkan secara berkelompok, biasanya memiliki aturan yang mudah dipahami anak-anak.\nContoh permainan kecil beregu adalah lomba estafet membawa bola, permainan menyusun menara balok secara berkelompok, atau permainan mengoper bola berantai.\nPermainan ini melatih kerja sama tim, kekompakan, serta kemampuan berkomunikasi dengan teman satu regu untuk mencapai tujuan bersama.',
      soal: [
        {
          pertanyaan: 'Permainan kecil beregu dimainkan secara...',
          pilihan: ['Berkelompok', 'Sendirian', 'Diam saja', 'Tidur bersama'],
          kunci: 0,
          pembahasan: 'Permainan kecil beregu dimainkan secara berkelompok.',
        },
        {
          pertanyaan: 'Contoh permainan kecil beregu adalah...',
          pilihan: ['Lomba estafet membawa bola', 'Membaca buku sendirian', 'Menggambar sendiri', 'Tidur siang'],
          kunci: 0,
          pembahasan: 'Lomba estafet membawa bola adalah contoh permainan beregu.',
        },
        {
          pertanyaan: 'Manfaat permainan beregu adalah melatih...',
          pilihan: ['Kerja sama tim', 'Sikap egois', 'Rasa malas', 'Sikap individualis'],
          kunci: 0,
          pembahasan: 'Permainan beregu melatih kerja sama tim dan kekompakan.',
        },
      ],
    },
    {
      judul: 'Latihan keseimbangan tubuh',
      ringkasan: 'Berlatih berdiri satu kaki, berjalan di garis lurus, dan gerakan lain untuk melatih keseimbangan.',
      materi: 'Keseimbangan tubuh adalah kemampuan mempertahankan posisi tubuh agar tidak jatuh saat bergerak maupun diam.\nLatihan keseimbangan yang biasa dilakukan antara lain berdiri dengan satu kaki selama beberapa detik, berjalan di atas garis lurus, dan berjalan sambil membawa benda di atas kepala.\nLatihan keseimbangan penting untuk melatih kekuatan otot kaki dan perut, serta membantu tubuh lebih terampil dalam bergerak dan mengurangi risiko terjatuh.',
      soal: [
        {
          pertanyaan: 'Keseimbangan tubuh adalah kemampuan agar tubuh tidak...',
          pilihan: ['Jatuh', 'Bergerak', 'Bernafas', 'Berkeringat'],
          kunci: 0,
          pembahasan: 'Keseimbangan adalah kemampuan mempertahankan posisi tubuh agar tidak jatuh.',
        },
        {
          pertanyaan: 'Contoh latihan keseimbangan adalah...',
          pilihan: ['Berdiri dengan satu kaki', 'Tidur telentang', 'Makan sambil duduk', 'Menonton televisi'],
          kunci: 0,
          pembahasan: 'Berdiri dengan satu kaki adalah contoh latihan keseimbangan.',
        },
        {
          pertanyaan: 'Latihan keseimbangan bermanfaat melatih otot...',
          pilihan: ['Kaki dan perut', 'Mata saja', 'Telinga saja', 'Rambut'],
          kunci: 0,
          pembahasan: 'Latihan keseimbangan melatih kekuatan otot kaki dan perut.',
        },
      ],
    },
    {
      judul: 'Kebersihan dan keamanan saat berolahraga',
      ringkasan: 'Membiasakan memakai pakaian olahraga yang sesuai serta menjaga kebersihan badan sebelum dan sesudah berolahraga.',
      materi: 'Sebelum berolahraga, penting untuk memakai pakaian dan sepatu olahraga yang sesuai agar gerakan lebih leluasa dan aman dari cedera.\nSetelah berolahraga, tubuh perlu dibersihkan dengan mandi atau mengelap keringat, serta mengganti pakaian yang basah agar tidak masuk angin.\nKeamanan saat berolahraga juga penting diperhatikan, misalnya melakukan pemanasan sebelum mulai, bermain di tempat yang aman, dan tidak bercanda berlebihan yang bisa menyebabkan cedera.',
      soal: [
        {
          pertanyaan: 'Sebelum berolahraga sebaiknya memakai...',
          pilihan: ['Pakaian dan sepatu olahraga', 'Pakaian pesta', 'Sandal jepit', 'Baju tidur'],
          kunci: 0,
          pembahasan: 'Pakaian dan sepatu olahraga membuat gerakan lebih leluasa dan aman.',
        },
        {
          pertanyaan: 'Setelah berolahraga, sebaiknya kita...',
          pilihan: ['Membersihkan tubuh dan mengganti pakaian', 'Langsung tidur tanpa mandi', 'Memakai pakaian basah terus', 'Tidak minum air putih'],
          kunci: 0,
          pembahasan: 'Membersihkan tubuh dan mengganti pakaian penting setelah berolahraga.',
        },
        {
          pertanyaan: 'Kegiatan yang perlu dilakukan sebelum berolahraga inti adalah...',
          pilihan: ['Pemanasan', 'Tidur siang', 'Makan besar', 'Bermain gawai'],
          kunci: 0,
          pembahasan: 'Pemanasan penting dilakukan sebelum berolahraga untuk mencegah cedera.',
        },
      ],
    },
  ],
  'SD-2-seni': [
    {
      judul: 'Menggambar imajinatif dengan pewarna',
      ringkasan: 'Menuangkan ide dan imajinasi ke dalam gambar menggunakan pensil warna, krayon, atau cat air.',
      materi: 'Menggambar imajinatif adalah kegiatan menggambar sesuatu yang berasal dari khayalan atau ide sendiri, tidak harus meniru benda nyata.\nSiswa dapat menggunakan berbagai alat pewarna seperti pensil warna, krayon, atau cat air untuk mewarnai gambar imajinatifnya, misalnya menggambar hewan yang bisa terbang atau rumah impian.\nMenggambar imajinatif melatih kreativitas dan kemampuan siswa dalam menuangkan ide-ide unik yang ada di pikirannya ke dalam sebuah karya gambar.',
      soal: [
        {
          pertanyaan: 'Menggambar imajinatif berasal dari...',
          pilihan: ['Khayalan atau ide sendiri', 'Contekan teman', 'Foto orang lain', 'Buku pelajaran'],
          kunci: 0,
          pembahasan: 'Menggambar imajinatif berasal dari khayalan atau ide sendiri.',
        },
        {
          pertanyaan: 'Contoh alat pewarna untuk menggambar adalah...',
          pilihan: ['Krayon', 'Gunting', 'Penggaris', 'Kalkulator'],
          kunci: 0,
          pembahasan: 'Krayon adalah salah satu alat pewarna untuk menggambar.',
        },
        {
          pertanyaan: 'Menggambar imajinatif melatih kemampuan...',
          pilihan: ['Kreativitas', 'Berhitung', 'Berlari', 'Menghafal rumus'],
          kunci: 0,
          pembahasan: 'Menggambar imajinatif melatih kreativitas siswa.',
        },
      ],
    },
    {
      judul: 'Membuat karya kerajinan dari kertas',
      ringkasan: 'Membuat bentuk sederhana seperti lipatan atau tempelan kertas menjadi karya kerajinan kecil.',
      materi: 'Kerajinan dari kertas adalah karya seni yang dibuat dengan melipat, menggunting, atau menempel kertas menjadi bentuk tertentu.\nTeknik melipat kertas disebut origami, misalnya melipat kertas menjadi bentuk perahu, pesawat, atau bunga sederhana.\nSelain melipat, siswa juga bisa membuat kerajinan dengan menempel potongan kertas warna-warni membentuk gambar atau kolase yang menarik.',
      soal: [
        {
          pertanyaan: 'Teknik melipat kertas menjadi bentuk tertentu disebut...',
          pilihan: ['Origami', 'Kolase', 'Mozaik', 'Batik'],
          kunci: 0,
          pembahasan: 'Origami adalah teknik melipat kertas menjadi bentuk tertentu.',
        },
        {
          pertanyaan: 'Karya seni yang dibuat dengan menempel potongan kertas disebut...',
          pilihan: ['Kolase', 'Origami', 'Ukiran', 'Patung'],
          kunci: 0,
          pembahasan: 'Kolase dibuat dengan menempel potongan kertas menjadi sebuah gambar.',
        },
        {
          pertanyaan: 'Contoh bentuk yang bisa dibuat dari origami adalah...',
          pilihan: ['Perahu kertas', 'Patung batu', 'Lukisan cat minyak', 'Ukiran kayu'],
          kunci: 0,
          pembahasan: 'Perahu kertas adalah salah satu bentuk origami yang sederhana.',
        },
      ],
    },
    {
      judul: 'Menyanyi dengan iringan sederhana',
      ringkasan: 'Menyanyikan lagu anak sambil bertepuk tangan atau diiringi alat musik sederhana.',
      materi: 'Menyanyi dengan iringan berarti menyanyikan lagu sambil diiringi bunyi-bunyian, baik dari tepukan tangan, hentakan kaki, maupun alat musik sederhana.\nSiswa berlatih menyanyikan lagu anak sambil bertepuk tangan mengikuti irama, atau diiringi alat musik ritmis seperti tamborin dan marakas.\nMenyanyi dengan iringan membantu siswa memahami ketukan dan irama lagu dengan lebih baik, serta membuat kegiatan bernyanyi menjadi lebih menyenangkan.',
      soal: [
        {
          pertanyaan: 'Menyanyi dengan iringan berarti menyanyi sambil diiringi...',
          pilihan: ['Bunyi-bunyian', 'Diam total', 'Menulis surat', 'Membaca buku'],
          kunci: 0,
          pembahasan: 'Menyanyi dengan iringan dilakukan sambil diiringi bunyi-bunyian.',
        },
        {
          pertanyaan: 'Contoh iringan sederhana saat menyanyi adalah...',
          pilihan: ['Bertepuk tangan', 'Menutup mata', 'Menulis di buku', 'Membaca dalam hati'],
          kunci: 0,
          pembahasan: 'Bertepuk tangan adalah contoh iringan sederhana saat menyanyi.',
        },
        {
          pertanyaan: 'Menyanyi dengan iringan membantu siswa memahami...',
          pilihan: ['Ketukan dan irama', 'Rumus matematika', 'Warna gambar', 'Bentuk bangun ruang'],
          kunci: 0,
          pembahasan: 'Iringan membantu siswa memahami ketukan dan irama lagu.',
        },
      ],
    },
    {
      judul: 'Gerak tari sederhana mengikuti irama',
      ringkasan: 'Menirukan gerakan tari dasar mengikuti irama musik secara berkelompok.',
      materi: 'Gerak tari sederhana adalah gerakan tubuh yang dilakukan mengikuti irama musik, seperti mengayunkan tangan, melangkah, atau memutar badan dengan lembut.\nSiswa berlatih menirukan gerakan tari dasar yang dicontohkan guru, kemudian mempraktikkannya bersama teman-teman secara berkelompok mengikuti irama musik yang diputar.\nBelajar gerak tari melatih kelenturan tubuh, kepekaan terhadap irama musik, serta kekompakan saat menari bersama dalam kelompok.',
      soal: [
        {
          pertanyaan: 'Gerak tari sederhana dilakukan mengikuti...',
          pilihan: ['Irama musik', 'Angka hitungan matematika', 'Warna baju', 'Bentuk ruangan'],
          kunci: 0,
          pembahasan: 'Gerak tari dilakukan dengan mengikuti irama musik.',
        },
        {
          pertanyaan: 'Contoh gerak tari sederhana adalah...',
          pilihan: ['Mengayunkan tangan', 'Duduk diam', 'Menulis di buku', 'Tidur di lantai'],
          kunci: 0,
          pembahasan: 'Mengayunkan tangan adalah contoh gerak tari sederhana.',
        },
        {
          pertanyaan: 'Belajar gerak tari bermanfaat melatih...',
          pilihan: ['Kelenturan tubuh', 'Rasa kantuk', 'Rasa lapar', 'Sikap malas'],
          kunci: 0,
          pembahasan: 'Gerak tari melatih kelenturan tubuh dan kepekaan irama.',
        },
      ],
    },
  ],
  'SD-2-mulok': [
    {
      judul: 'Kosakata bahasa daerah tentang keluarga',
      ringkasan: 'Mengenal sebutan anggota keluarga (ayah, ibu, kakak, adik) dalam bahasa daerah setempat.',
      materi: 'Setiap bahasa daerah memiliki sebutan tersendiri untuk anggota keluarga, yang berbeda dengan sebutan dalam Bahasa Indonesia.\nSiswa belajar mengenal sebutan ayah, ibu, kakak, adik, kakek, dan nenek dalam bahasa daerah setempat, sehingga bisa menggunakannya saat berbicara dengan keluarga.\nMengenal kosakata keluarga dalam bahasa daerah membantu siswa lebih dekat dengan budaya dan bahasa asli daerah tempat tinggalnya.',
      soal: [
        {
          pertanyaan: 'Kosakata bahasa daerah tentang keluarga berguna untuk...',
          pilihan: ['Berbicara dengan keluarga', 'Belajar matematika', 'Bermain gawai', 'Menghitung uang'],
          kunci: 0,
          pembahasan: 'Kosakata keluarga dalam bahasa daerah berguna saat berbicara dengan keluarga.',
        },
        {
          pertanyaan: 'Setiap bahasa daerah memiliki sebutan untuk anggota keluarga yang...',
          pilihan: ['Berbeda-beda', 'Sama semua', 'Tidak ada', 'Hanya satu macam'],
          kunci: 0,
          pembahasan: 'Setiap bahasa daerah memiliki sebutan tersendiri untuk anggota keluarga.',
        },
        {
          pertanyaan: 'Manfaat mengenal kosakata bahasa daerah adalah...',
          pilihan: ['Lebih dekat dengan budaya asli', 'Melupakan bahasa sendiri', 'Menjauh dari keluarga', 'Tidak ada manfaat'],
          kunci: 0,
          pembahasan: 'Mengenal kosakata bahasa daerah membuat siswa lebih dekat dengan budaya asli.',
        },
      ],
    },
    {
      judul: 'Lagu dan permainan daerah',
      ringkasan: 'Menyanyikan lagu daerah dan memainkan permainan tradisional bersama teman sekelas.',
      materi: 'Lagu daerah adalah lagu yang berasal dari suatu daerah tertentu di Indonesia, biasanya menggunakan bahasa daerah setempat dan menceritakan kehidupan masyarakatnya.\nSiswa berlatih menyanyikan lagu daerah bersama teman sekelas, sekaligus mengenal maknanya secara sederhana.\nSelain lagu, siswa juga memainkan permainan tradisional daerah bersama teman, yang melatih kekompakan sekaligus melestarikan budaya daerah.',
      soal: [
        {
          pertanyaan: 'Lagu daerah biasanya menggunakan...',
          pilihan: ['Bahasa daerah setempat', 'Bahasa asing', 'Kode angka', 'Simbol matematika'],
          kunci: 0,
          pembahasan: 'Lagu daerah biasanya menggunakan bahasa daerah setempat.',
        },
        {
          pertanyaan: 'Bermain permainan tradisional daerah bermanfaat melatih...',
          pilihan: ['Kekompakan', 'Sikap egois', 'Rasa malas', 'Sikap sombong'],
          kunci: 0,
          pembahasan: 'Permainan tradisional daerah melatih kekompakan antar teman.',
        },
        {
          pertanyaan: 'Menyanyikan lagu daerah membantu melestarikan...',
          pilihan: ['Budaya daerah', 'Teknologi modern', 'Bahasa asing', 'Ilmu kimia'],
          kunci: 0,
          pembahasan: 'Menyanyikan lagu daerah membantu melestarikan budaya daerah.',
        },
      ],
    },
    {
      judul: 'Cerita rakyat setempat',
      ringkasan: 'Mendengarkan cerita rakyat daerah dan mengenal pesan moral yang terkandung di dalamnya.',
      materi: 'Cerita rakyat adalah cerita yang berasal dari suatu daerah dan diwariskan secara turun-temurun, biasanya berisi kisah asal-usul tempat, tokoh legenda, atau dongeng dengan pesan moral.\nSiswa mendengarkan cerita rakyat dari daerah setempat, mengenal tokoh-tokohnya, serta memahami jalan cerita dari awal sampai akhir.\nSetiap cerita rakyat biasanya memiliki pesan moral yang bisa diambil pelajarannya, misalnya pentingnya kejujuran, kerja keras, atau sikap saling menolong.',
      soal: [
        {
          pertanyaan: 'Cerita rakyat diwariskan secara...',
          pilihan: ['Turun-temurun', 'Ditulis sekali saja', 'Tidak pernah diceritakan', 'Dibuat oleh komputer'],
          kunci: 0,
          pembahasan: 'Cerita rakyat diwariskan secara turun-temurun dari generasi ke generasi.',
        },
        {
          pertanyaan: 'Cerita rakyat biasanya mengandung...',
          pilihan: ['Pesan moral', 'Rumus matematika', 'Data statistik', 'Kode pemrograman'],
          kunci: 0,
          pembahasan: 'Cerita rakyat biasanya mengandung pesan moral yang bisa dipetik.',
        },
        {
          pertanyaan: 'Contoh isi cerita rakyat adalah...',
          pilihan: ['Asal-usul suatu tempat', 'Jadwal pelajaran sekolah', 'Rumus fisika', 'Daftar belanja'],
          kunci: 0,
          pembahasan: 'Cerita rakyat sering menceritakan asal-usul suatu tempat atau tokoh legenda.',
        },
      ],
    },
  ],
}
