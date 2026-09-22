// =====================================================================
// MATERI — SD KELAS 3
// =====================================================================
// Format tiap item materi:
//   judul      : judul topik (wajib)
//   ringkasan  : teks singkat 1-2 kalimat (opsional, tampil di kartu ringkas)
//   materi     : penjelasan lengkap topik (opsional, tampil saat dibuka)
//   soal       : array 3 soal pilihan ganda (opsional)
//                { pertanyaan, pilihan: [4 opsi], kunci: indeks jawaban benar,
//                  pembahasan: penjelasan singkat kunci jawaban }
//   link       : tautan eksternal (opsional, kalau diisi materi tampil sebagai link)
export const MATERI_SD3 = {
  'SD-3-agama': [
    {
      judul: 'Makna asmaul husna dalam kehidupan',
      ringkasan: 'Memahami arti beberapa nama indah Allah dan mengaitkannya dengan sikap sehari-hari, misalnya Al-Ghaffar (Maha Pengampun) mengajarkan sikap pemaaf.',
      materi: 'Asmaul husna adalah nama-nama indah Allah yang berjumlah 99, masing-masing menggambarkan sifat-sifat mulia-Nya.\nContoh asmaul husna yang dikenalkan di kelas 3 misalnya Al-Ghaffar (Maha Pengampun), Ar-Rahim (Maha Penyayang), dan As-Sami\' (Maha Mendengar), yang bisa dijadikan teladan sikap sehari-hari.\nMeneladani asmaul husna berarti mencontoh sifat baik di dalamnya, misalnya bersikap pemaaf karena Allah Maha Pengampun, atau menyayangi sesama karena Allah Maha Penyayang.',
      soal: [
        {
          pertanyaan: 'Asmaul husna berjumlah...',
          pilihan: ['99', '25', '10', '5'],
          kunci: 0,
          pembahasan: 'Asmaul husna atau nama-nama indah Allah berjumlah 99.',
        },
        {
          pertanyaan: 'Al-Ghaffar berarti...',
          pilihan: ['Maha Pengampun', 'Maha Kaya', 'Maha Kuat', 'Maha Melihat'],
          kunci: 0,
          pembahasan: 'Al-Ghaffar berarti Maha Pengampun, mengajarkan sikap pemaaf.',
        },
        {
          pertanyaan: 'Meneladani asmaul husna berarti...',
          pilihan: ['Mencontoh sifat baik di dalamnya', 'Menghafal tanpa memahami', 'Mengabaikan maknanya', 'Hanya diucapkan saat ujian'],
          kunci: 0,
          pembahasan: 'Meneladani asmaul husna berarti mencontoh sifat baik yang terkandung di dalamnya.',
        },
      ],
    },
    {
      judul: 'Kisah keteladanan sahabat Nabi',
      ringkasan: 'Belajar sifat baik para sahabat Nabi seperti keberanian dan kesetiaan sebagai teladan hidup.',
      materi: 'Sahabat Nabi adalah orang-orang yang hidup semasa dengan Nabi Muhammad SAW dan setia mendampingi perjuangan dakwahnya.\nBeberapa sahabat Nabi dikenal memiliki sifat teladan seperti keberanian, kejujuran, dan kesetiaan yang tinggi meski menghadapi berbagai kesulitan.\nKisah-kisah sahabat Nabi mengajarkan siswa untuk berani membela kebenaran, setia kepada janji, dan selalu berbuat baik kepada sesama.',
      soal: [
        {
          pertanyaan: 'Sahabat Nabi adalah orang yang...',
          pilihan: ['Hidup semasa dan setia mendampingi Nabi', 'Musuh Nabi', 'Tokoh dongeng', 'Hewan peliharaan Nabi'],
          kunci: 0,
          pembahasan: 'Sahabat Nabi hidup semasa dengan Nabi dan setia mendampingi dakwahnya.',
        },
        {
          pertanyaan: 'Sifat yang dicontohkan sahabat Nabi antara lain...',
          pilihan: ['Keberanian dan kejujuran', 'Kesombongan', 'Kemalasan', 'Ketidakjujuran'],
          kunci: 0,
          pembahasan: 'Sahabat Nabi dikenal dengan sifat berani dan jujur.',
        },
        {
          pertanyaan: 'Kisah sahabat Nabi mengajarkan kita untuk...',
          pilihan: ['Berani membela kebenaran', 'Takut berbuat baik', 'Mengingkari janji', 'Bersikap egois'],
          kunci: 0,
          pembahasan: 'Kisah sahabat Nabi mengajarkan keberanian membela kebenaran.',
        },
      ],
    },
    {
      judul: 'Tata cara salat berjemaah',
      ringkasan: 'Mempraktikkan urutan dan aturan salat berjemaah, termasuk posisi imam dan makmum.',
      materi: 'Salat berjemaah adalah salat yang dilaksanakan bersama-sama, dipimpin oleh seorang imam dan diikuti oleh makmum di belakangnya.\nSebelum salat berjemaah dimulai, makmum merapikan saf (barisan) agar rapat dan lurus, kemudian mengikuti setiap gerakan imam secara tertib.\nMelaksanakan salat berjemaah dengan tertib melatih kedisiplinan, kekompakan, dan mempererat tali persaudaraan antar sesama.',
      soal: [
        {
          pertanyaan: 'Barisan dalam salat berjemaah disebut...',
          pilihan: ['Saf', 'Rukun', 'Wudu', 'Azan'],
          kunci: 0,
          pembahasan: 'Barisan dalam salat berjemaah disebut saf.',
        },
        {
          pertanyaan: 'Sebelum salat berjemaah, saf sebaiknya...',
          pilihan: ['Rapat dan lurus', 'Berantakan', 'Renggang', 'Menyilang'],
          kunci: 0,
          pembahasan: 'Saf yang rapat dan lurus penting sebelum salat berjemaah dimulai.',
        },
        {
          pertanyaan: 'Makmum bertugas untuk...',
          pilihan: ['Mengikuti gerakan imam', 'Memimpin salat', 'Mengumandangkan azan', 'Duduk saja'],
          kunci: 0,
          pembahasan: 'Makmum mengikuti setiap gerakan yang dilakukan imam.',
        },
      ],
    },
    {
      judul: 'Perilaku hormat kepada orang tua dan guru',
      ringkasan: 'Membiasakan bersikap sopan, mendengarkan nasihat, dan membantu orang tua serta guru.',
      materi: 'Menghormati orang tua dan guru adalah kewajiban setiap anak karena mereka telah berjasa merawat dan mendidik dengan penuh kasih sayang.\nContoh sikap hormat kepada orang tua misalnya mendengarkan nasihat, membantu pekerjaan rumah, dan berbicara dengan sopan.\nSikap hormat kepada guru dapat ditunjukkan dengan memperhatikan saat dijelaskan, mengerjakan tugas dengan sungguh-sungguh, dan mengucapkan salam saat bertemu.',
      soal: [
        {
          pertanyaan: 'Contoh sikap hormat kepada orang tua adalah...',
          pilihan: ['Mendengarkan nasihat', 'Membantah perkataan', 'Mengabaikan panggilan', 'Berkata kasar'],
          kunci: 0,
          pembahasan: 'Mendengarkan nasihat orang tua adalah bentuk sikap hormat.',
        },
        {
          pertanyaan: 'Sikap hormat kepada guru dapat ditunjukkan dengan...',
          pilihan: ['Memperhatikan saat dijelaskan', 'Bermain saat pelajaran', 'Mengganggu teman', 'Tidur di kelas'],
          kunci: 0,
          pembahasan: 'Memperhatikan penjelasan guru adalah bentuk sikap hormat.',
        },
        {
          pertanyaan: 'Mengapa kita harus menghormati orang tua?',
          pilihan: ['Karena telah merawat dengan kasih sayang', 'Karena takut dimarahi', 'Karena disuruh teman', 'Tanpa alasan'],
          kunci: 0,
          pembahasan: 'Kita menghormati orang tua karena mereka merawat kita dengan kasih sayang.',
        },
      ],
    },
  ],
  'SD-3-pancasila': [
    {
      judul: 'Simbol dan makna sila Pancasila lebih dalam',
      ringkasan: 'Mengenal lebih detail simbol tiap sila Pancasila beserta contoh penerapannya di kehidupan sekolah.',
      materi: 'Setiap sila Pancasila memiliki simbol yang tergambar pada perisai burung Garuda, misalnya bintang untuk sila pertama, rantai untuk sila kedua, pohon beringin untuk sila ketiga, kepala banteng untuk sila keempat, dan padi kapas untuk sila kelima.\nSimbol-simbol tersebut mewakili makna dari masing-masing sila, misalnya rantai melambangkan hubungan manusia yang saling membutuhkan, dan padi kapas melambangkan kecukupan pangan dan sandang bagi seluruh rakyat.\nDi lingkungan sekolah, nilai Pancasila dapat diterapkan misalnya dengan berdoa sebelum belajar (sila pertama), saling membantu teman (sila kedua), dan bermusyawarah memilih ketua kelas (sila keempat).',
      soal: [
        {
          pertanyaan: 'Simbol sila ketiga Pancasila adalah...',
          pilihan: ['Pohon beringin', 'Bintang', 'Rantai', 'Padi kapas'],
          kunci: 0,
          pembahasan: 'Pohon beringin adalah simbol sila ketiga, Persatuan Indonesia.',
        },
        {
          pertanyaan: 'Padi kapas melambangkan...',
          pilihan: ['Kecukupan pangan dan sandang', 'Persatuan', 'Ketuhanan', 'Musyawarah'],
          kunci: 0,
          pembahasan: 'Padi kapas melambangkan kecukupan pangan dan sandang bagi rakyat.',
        },
        {
          pertanyaan: 'Contoh sila keempat di sekolah adalah...',
          pilihan: ['Bermusyawarah memilih ketua kelas', 'Berdoa sebelum belajar', 'Membantu teman', 'Menghormati bendera'],
          kunci: 0,
          pembahasan: 'Musyawarah memilih ketua kelas adalah contoh pengamalan sila keempat.',
        },
      ],
    },
    {
      judul: 'Aturan dan norma di masyarakat',
      ringkasan: 'Mengenal aturan tertulis dan tidak tertulis yang berlaku di lingkungan masyarakat sekitar.',
      materi: 'Norma adalah aturan yang mengatur perilaku manusia dalam kehidupan bermasyarakat, baik yang tertulis maupun tidak tertulis.\nNorma tertulis misalnya undang-undang dan peraturan daerah, sedangkan norma tidak tertulis misalnya adat istiadat dan sopan santun yang berlaku turun-temurun.\nMematuhi norma dan aturan penting agar kehidupan bermasyarakat berjalan tertib, aman, dan nyaman bagi semua orang.',
      soal: [
        {
          pertanyaan: 'Norma yang tertulis contohnya adalah...',
          pilihan: ['Undang-undang', 'Adat istiadat', 'Sopan santun', 'Kebiasaan'],
          kunci: 0,
          pembahasan: 'Undang-undang adalah contoh norma yang tertulis.',
        },
        {
          pertanyaan: 'Norma tidak tertulis contohnya adalah...',
          pilihan: ['Adat istiadat', 'Undang-undang', 'Peraturan daerah', 'Hukum negara'],
          kunci: 0,
          pembahasan: 'Adat istiadat adalah contoh norma yang tidak tertulis.',
        },
        {
          pertanyaan: 'Mematuhi norma penting agar kehidupan masyarakat...',
          pilihan: ['Tertib dan nyaman', 'Kacau', 'Tidak teratur', 'Penuh masalah'],
          kunci: 0,
          pembahasan: 'Mematuhi norma membuat kehidupan masyarakat tertib dan nyaman.',
        },
      ],
    },
    {
      judul: 'Keberagaman suku, agama, dan budaya',
      ringkasan: 'Mengenal keragaman suku, agama, dan budaya di Indonesia serta pentingnya saling menghargai.',
      materi: 'Indonesia memiliki keberagaman suku, agama, bahasa, dan budaya yang tersebar di seluruh wilayah nusantara.\nKeberagaman ini menjadi kekayaan bangsa yang perlu disyukuri dan dijaga, bukan menjadi alasan untuk saling membeda-bedakan atau bermusuhan.\nSikap saling menghargai perbedaan, seperti menghormati teman yang berbeda agama atau suku, akan menciptakan kerukunan dalam kehidupan sehari-hari.',
      soal: [
        {
          pertanyaan: 'Keberagaman di Indonesia meliputi perbedaan...',
          pilihan: ['Suku, agama, dan budaya', 'Warna langit', 'Bentuk awan', 'Jumlah bintang'],
          kunci: 0,
          pembahasan: 'Keberagaman Indonesia terlihat dari perbedaan suku, agama, dan budaya.',
        },
        {
          pertanyaan: 'Sikap yang tepat menghadapi keberagaman adalah...',
          pilihan: ['Saling menghargai', 'Saling membeda-bedakan', 'Bermusuhan', 'Mengejek'],
          kunci: 0,
          pembahasan: 'Saling menghargai adalah sikap yang tepat menghadapi keberagaman.',
        },
        {
          pertanyaan: 'Keberagaman bangsa Indonesia sebaiknya disikapi dengan...',
          pilihan: ['Rasa syukur dan menjaga kerukunan', 'Rasa iri', 'Sikap acuh', 'Permusuhan'],
          kunci: 0,
          pembahasan: 'Keberagaman sebaiknya disyukuri dan dijaga kerukunannya.',
        },
      ],
    },
    {
      judul: 'Kerja sama dalam kehidupan sehari-hari',
      ringkasan: 'Belajar bekerja sama menyelesaikan tugas kelompok di sekolah maupun kegiatan di rumah.',
      materi: 'Kerja sama adalah kegiatan yang dilakukan bersama-sama untuk mencapai tujuan yang sama, sehingga pekerjaan menjadi lebih ringan dan cepat selesai.\nContoh kerja sama di sekolah adalah mengerjakan tugas kelompok, membersihkan kelas bersama saat piket, atau bermain permainan beregu.\nDi rumah, kerja sama dapat dilakukan misalnya dengan membantu orang tua membereskan rumah atau menyiapkan keperluan keluarga bersama-sama.',
      soal: [
        {
          pertanyaan: 'Kerja sama membuat pekerjaan menjadi...',
          pilihan: ['Lebih ringan dan cepat selesai', 'Lebih berat', 'Lebih lama', 'Sulit diselesaikan'],
          kunci: 0,
          pembahasan: 'Kerja sama membuat pekerjaan menjadi lebih ringan dan cepat selesai.',
        },
        {
          pertanyaan: 'Contoh kerja sama di sekolah adalah...',
          pilihan: ['Mengerjakan tugas kelompok', 'Belajar sendirian', 'Bermain sendiri', 'Tidur di kelas'],
          kunci: 0,
          pembahasan: 'Mengerjakan tugas kelompok adalah contoh kerja sama di sekolah.',
        },
        {
          pertanyaan: 'Contoh kerja sama di rumah adalah...',
          pilihan: ['Membantu orang tua membereskan rumah', 'Menonton televisi sendirian', 'Bermain gawai terus', 'Mengganggu adik'],
          kunci: 0,
          pembahasan: 'Membantu orang tua membereskan rumah adalah contoh kerja sama di rumah.',
        },
      ],
    },
  ],
  'SD-3-indonesia': [
    {
      judul: 'Membaca pemahaman teks narasi',
      ringkasan: 'Membaca cerita lalu menjawab pertanyaan tentang tokoh, latar, dan alur ceritanya.',
      materi: 'Teks narasi adalah teks yang menceritakan suatu peristiwa atau kejadian secara berurutan, biasanya memiliki tokoh, latar tempat dan waktu, serta alur cerita.\nMembaca pemahaman berarti membaca teks lalu memahami isinya, termasuk mengenali siapa tokohnya, di mana dan kapan cerita terjadi, serta bagaimana urutan peristiwanya.\nSiswa berlatih menjawab pertanyaan tentang isi teks narasi, misalnya "siapa tokoh utamanya" atau "apa yang terjadi di akhir cerita", untuk melatih kemampuan memahami bacaan.',
      soal: [
        {
          pertanyaan: 'Teks narasi menceritakan...',
          pilihan: ['Suatu peristiwa secara berurutan', 'Data angka', 'Rumus matematika', 'Daftar belanja'],
          kunci: 0,
          pembahasan: 'Teks narasi menceritakan peristiwa secara berurutan.',
        },
        {
          pertanyaan: 'Bagian dari teks narasi antara lain...',
          pilihan: ['Tokoh dan latar', 'Rumus hitung', 'Tabel data', 'Grafik'],
          kunci: 0,
          pembahasan: 'Tokoh dan latar adalah bagian penting dari teks narasi.',
        },
        {
          pertanyaan: 'Membaca pemahaman berarti membaca lalu...',
          pilihan: ['Memahami isinya', 'Menghafal tanpa mengerti', 'Mengabaikan isinya', 'Hanya melihat gambar'],
          kunci: 0,
          pembahasan: 'Membaca pemahaman berarti membaca sekaligus memahami isi teks.',
        },
      ],
    },
    {
      judul: 'Menulis surat sederhana',
      ringkasan: 'Berlatih menulis surat pribadi kepada teman atau keluarga dengan format yang benar.',
      materi: 'Surat sederhana adalah tulisan yang digunakan untuk menyampaikan pesan atau kabar kepada orang lain, misalnya teman atau keluarga.\nBagian-bagian surat sederhana antara lain tanggal penulisan, salam pembuka, isi surat, salam penutup, dan nama pengirim.\nSiswa berlatih menulis surat pribadi dengan bahasa yang sopan dan jelas, misalnya menceritakan kabar atau mengundang teman ke acara ulang tahun.',
      soal: [
        {
          pertanyaan: 'Bagian surat yang berisi pesan utama disebut...',
          pilihan: ['Isi surat', 'Salam pembuka', 'Tanggal', 'Nama pengirim'],
          kunci: 0,
          pembahasan: 'Pesan utama surat terdapat pada bagian isi surat.',
        },
        {
          pertanyaan: 'Surat pribadi biasanya ditujukan kepada...',
          pilihan: ['Teman atau keluarga', 'Presiden', 'Perusahaan besar', 'Media massa'],
          kunci: 0,
          pembahasan: 'Surat pribadi biasanya ditujukan kepada teman atau keluarga.',
        },
        {
          pertanyaan: 'Bahasa yang digunakan dalam surat pribadi sebaiknya...',
          pilihan: ['Sopan dan jelas', 'Kasar', 'Sulit dipahami', 'Penuh singkatan aneh'],
          kunci: 0,
          pembahasan: 'Surat pribadi sebaiknya ditulis dengan bahasa yang sopan dan jelas.',
        },
      ],
    },
    {
      judul: 'Menyusun paragraf dari kalimat acak',
      ringkasan: 'Mengurutkan kalimat-kalimat yang tersusun acak menjadi sebuah paragraf yang runtut dan bermakna.',
      materi: 'Paragraf yang baik tersusun dari beberapa kalimat yang saling berhubungan dan membentuk satu ide pokok yang runtut.\nUntuk menyusun paragraf dari kalimat acak, siswa perlu mencari kalimat yang menjadi awal cerita, lalu mengurutkan kalimat berikutnya berdasarkan hubungan sebab-akibat atau urutan waktu kejadian.\nLatihan ini membantu siswa memahami struktur paragraf yang logis dan melatih kemampuan berpikir runtut.',
      soal: [
        {
          pertanyaan: 'Paragraf yang baik tersusun dari kalimat yang...',
          pilihan: ['Saling berhubungan dan runtut', 'Acak tanpa aturan', 'Tidak berkaitan', 'Berbeda topik'],
          kunci: 0,
          pembahasan: 'Paragraf yang baik memiliki kalimat yang saling berhubungan dan runtut.',
        },
        {
          pertanyaan: 'Untuk menyusun paragraf acak, langkah pertama adalah mencari...',
          pilihan: ['Kalimat awal cerita', 'Kalimat terakhir', 'Kalimat tersulit', 'Kalimat terpanjang'],
          kunci: 0,
          pembahasan: 'Langkah pertama adalah menemukan kalimat yang menjadi awal cerita.',
        },
        {
          pertanyaan: 'Latihan menyusun paragraf melatih kemampuan...',
          pilihan: ['Berpikir runtut', 'Berhitung cepat', 'Menggambar', 'Bernyanyi'],
          kunci: 0,
          pembahasan: 'Latihan ini melatih kemampuan berpikir secara runtut.',
        },
      ],
    },
    {
      judul: 'Mengenal jenis-jenis kalimat',
      ringkasan: 'Membedakan kalimat berita, tanya, perintah, dan seru beserta tanda bacanya.',
      materi: 'Kalimat berita digunakan untuk menyampaikan informasi dan diakhiri dengan tanda titik (.), misalnya "Budi pergi ke sekolah."\nKalimat tanya digunakan untuk menanyakan sesuatu dan diakhiri dengan tanda tanya (?), sedangkan kalimat perintah digunakan untuk menyuruh dan biasanya diakhiri tanda titik atau seru.\nKalimat seru digunakan untuk mengungkapkan perasaan yang kuat, seperti kaget atau senang, dan diakhiri dengan tanda seru (!).',
      soal: [
        {
          pertanyaan: 'Kalimat berita diakhiri dengan tanda...',
          pilihan: ['Titik', 'Tanya', 'Seru', 'Koma'],
          kunci: 0,
          pembahasan: 'Kalimat berita diakhiri dengan tanda titik.',
        },
        {
          pertanyaan: 'Kalimat yang digunakan untuk menanyakan sesuatu disebut kalimat...',
          pilihan: ['Tanya', 'Berita', 'Perintah', 'Seru'],
          kunci: 0,
          pembahasan: 'Kalimat tanya digunakan untuk menanyakan sesuatu.',
        },
        {
          pertanyaan: 'Kalimat "Wah, indah sekali pemandangan ini!" adalah contoh kalimat...',
          pilihan: ['Seru', 'Berita', 'Tanya', 'Perintah'],
          kunci: 0,
          pembahasan: 'Kalimat tersebut mengungkapkan perasaan kuat, sehingga termasuk kalimat seru.',
        },
      ],
    },
    {
      judul: 'Bercerita dengan urutan yang runtut',
      ringkasan: 'Berlatih bercerita di depan kelas dengan urutan awal, tengah, dan akhir yang jelas.',
      materi: 'Bercerita dengan runtut berarti menyampaikan cerita sesuai urutan kejadian, mulai dari awal, tengah, hingga akhir cerita.\nSebelum bercerita, siswa perlu memahami isi cerita dengan baik, mengingat tokoh dan peristiwa penting, agar cerita dapat disampaikan secara jelas dan tidak melompat-lompat.\nBerlatih bercerita di depan kelas membantu siswa melatih keberanian, kepercayaan diri, dan kemampuan berbicara di depan umum.',
      soal: [
        {
          pertanyaan: 'Bercerita dengan runtut berarti menyampaikan cerita sesuai...',
          pilihan: ['Urutan kejadian', 'Suasana hati', 'Warna favorit', 'Angka acak'],
          kunci: 0,
          pembahasan: 'Bercerita dengan runtut mengikuti urutan kejadian dalam cerita.',
        },
        {
          pertanyaan: 'Sebelum bercerita, sebaiknya kita...',
          pilihan: ['Memahami isi cerita dengan baik', 'Langsung bercerita tanpa persiapan', 'Menghafal kata demi kata tanpa paham', 'Mengabaikan urutan cerita'],
          kunci: 0,
          pembahasan: 'Memahami isi cerita dengan baik membantu bercerita secara jelas.',
        },
        {
          pertanyaan: 'Berlatih bercerita di depan kelas melatih...',
          pilihan: ['Keberanian dan percaya diri', 'Rasa takut', 'Sikap pemalu', 'Sikap pendiam'],
          kunci: 0,
          pembahasan: 'Latihan bercerita di depan kelas melatih keberanian dan percaya diri.',
        },
      ],
    },
  ],
  'SD-3-matematika': [
    {
      judul: 'Bilangan sampai 1.000',
      ringkasan: 'Membaca, menulis, dan membandingkan bilangan sampai seribu, termasuk nilai tempat ratusan.',
      materi: 'Bilangan sampai 1.000 terdiri dari ratusan, puluhan, dan satuan, misalnya bilangan 356 terdiri dari 3 ratusan, 5 puluhan, dan 6 satuan.\nSiswa berlatih membaca dan menulis bilangan sampai seribu, serta membandingkan dua bilangan menggunakan simbol lebih dari (>), kurang dari (<), atau sama dengan (=).\nSelain itu, siswa juga belajar mengurutkan sekumpulan bilangan dari yang terkecil ke terbesar untuk memahami nilai tempat bilangan dengan lebih baik.',
      soal: [
        {
          pertanyaan: 'Bilangan 356 terdiri dari...',
          pilihan: ['3 ratusan, 5 puluhan, 6 satuan', '3 puluhan, 5 ratusan, 6 satuan', '356 satuan saja', '3 satuan, 5 puluhan, 6 ratusan'],
          kunci: 0,
          pembahasan: '356 terdiri dari 3 ratusan (300), 5 puluhan (50), dan 6 satuan (6).',
        },
        {
          pertanyaan: 'Bilangan yang lebih besar antara 480 dan 408 adalah...',
          pilihan: ['480', '408', 'Sama besar', 'Tidak bisa dibandingkan'],
          kunci: 0,
          pembahasan: '480 lebih besar daripada 408.',
        },
        {
          pertanyaan: 'Nilai tempat ratusan pada suatu bilangan menunjukkan kelipatan...',
          pilihan: ['100', '10', '1', '1000'],
          kunci: 0,
          pembahasan: 'Nilai tempat ratusan menunjukkan kelipatan 100.',
        },
      ],
    },
    {
      judul: 'Perkalian dan pembagian dasar',
      ringkasan: 'Menghafal dan menerapkan perkalian serta pembagian dasar sampai bilangan 10.',
      materi: 'Perkalian dasar sampai bilangan 10 penting dihafal agar siswa dapat berhitung dengan cepat, misalnya 6 x 7 = 42.\nPembagian adalah kebalikan dari perkalian, sehingga jika 6 x 7 = 42, maka 42 : 7 = 6 dan 42 : 6 = 7.\nMenghafal tabel perkalian dan memahami hubungannya dengan pembagian membantu siswa menyelesaikan soal berhitung sehari-hari dengan lebih cepat dan tepat.',
      soal: [
        {
          pertanyaan: 'Hasil dari 7 x 8 adalah...',
          pilihan: ['56', '54', '64', '48'],
          kunci: 0,
          pembahasan: '7 x 8 = 56.',
        },
        {
          pertanyaan: 'Hasil dari 45 : 9 adalah...',
          pilihan: ['5', '6', '4', '9'],
          kunci: 0,
          pembahasan: '45 : 9 = 5.',
        },
        {
          pertanyaan: 'Pembagian merupakan kebalikan dari...',
          pilihan: ['Perkalian', 'Penjumlahan', 'Pengurangan', 'Pembulatan'],
          kunci: 0,
          pembahasan: 'Pembagian adalah kebalikan dari operasi perkalian.',
        },
      ],
    },
    {
      judul: 'Pecahan sederhana',
      ringkasan: 'Mengenal pecahan seperti setengah dan seperempat lewat pembagian benda menjadi bagian sama besar.',
      materi: 'Pecahan adalah bilangan yang menunjukkan bagian dari suatu keseluruhan, misalnya setengah (1/2) berarti satu bagian dari dua bagian yang sama besar.\nPecahan sederhana yang dikenalkan di kelas 3 antara lain 1/2 (setengah), 1/3 (sepertiga), dan 1/4 (seperempat), yang dapat digambarkan dengan membagi benda seperti kue atau kertas.\nSiswa berlatih mengenali dan membandingkan pecahan sederhana melalui gambar, misalnya menentukan bagian mana yang lebih besar antara 1/2 dan 1/4.',
      soal: [
        {
          pertanyaan: 'Pecahan 1/2 dibaca...',
          pilihan: ['Setengah', 'Sepertiga', 'Seperempat', 'Satu perdua puluh'],
          kunci: 0,
          pembahasan: 'Pecahan 1/2 dibaca setengah.',
        },
        {
          pertanyaan: 'Jika sebuah kue dibagi menjadi 4 bagian sama besar, satu bagian disebut...',
          pilihan: ['Seperempat', 'Setengah', 'Sepertiga', 'Utuh'],
          kunci: 0,
          pembahasan: 'Satu bagian dari 4 bagian sama besar disebut seperempat.',
        },
        {
          pertanyaan: 'Pecahan yang lebih besar antara 1/2 dan 1/4 adalah...',
          pilihan: ['1/2', '1/4', 'Sama besar', 'Tidak bisa dibandingkan'],
          kunci: 0,
          pembahasan: '1/2 lebih besar daripada 1/4.',
        },
      ],
    },
    {
      judul: 'Pengukuran berat dan panjang',
      ringkasan: 'Mengukur berat dengan timbangan dan panjang dengan penggaris atau meteran menggunakan satuan baku.',
      materi: 'Berat suatu benda dapat diukur menggunakan timbangan dengan satuan gram (g) atau kilogram (kg), sedangkan panjang diukur dengan penggaris atau meteran menggunakan satuan sentimeter (cm) atau meter (m).\nSatu kilogram sama dengan 1.000 gram, sedangkan satu meter sama dengan 100 sentimeter, sehingga siswa perlu memahami hubungan antar satuan ini.\nSiswa berlatih mengukur benda-benda di sekitar, seperti berat buku atau panjang meja, serta membandingkan hasil pengukuran dengan satuan yang tepat.',
      soal: [
        {
          pertanyaan: 'Satu kilogram sama dengan berapa gram?',
          pilihan: ['1.000 gram', '100 gram', '10 gram', '10.000 gram'],
          kunci: 0,
          pembahasan: '1 kilogram sama dengan 1.000 gram.',
        },
        {
          pertanyaan: 'Satu meter sama dengan berapa sentimeter?',
          pilihan: ['100 cm', '10 cm', '1.000 cm', '50 cm'],
          kunci: 0,
          pembahasan: '1 meter sama dengan 100 sentimeter.',
        },
        {
          pertanyaan: 'Alat untuk mengukur berat benda adalah...',
          pilihan: ['Timbangan', 'Penggaris', 'Termometer', 'Jam'],
          kunci: 0,
          pembahasan: 'Timbangan digunakan untuk mengukur berat benda.',
        },
      ],
    },
    {
      judul: 'Keliling dan luas bangun datar',
      ringkasan: 'Menghitung keliling dan luas persegi serta persegi panjang menggunakan rumus sederhana.',
      materi: 'Keliling adalah jumlah panjang seluruh sisi suatu bangun datar, sedangkan luas adalah ukuran daerah yang tertutup oleh bangun datar tersebut.\nKeliling persegi dihitung dengan rumus 4 x sisi, sedangkan luas persegi dihitung dengan rumus sisi x sisi.\nUntuk persegi panjang, keliling dihitung dengan rumus 2 x (panjang + lebar), sedangkan luasnya dihitung dengan rumus panjang x lebar.',
      soal: [
        {
          pertanyaan: 'Rumus keliling persegi adalah...',
          pilihan: ['4 x sisi', 'sisi x sisi', '2 x sisi', 'sisi + sisi'],
          kunci: 0,
          pembahasan: 'Keliling persegi dihitung dengan rumus 4 x sisi.',
        },
        {
          pertanyaan: 'Luas persegi dengan sisi 5 cm adalah...',
          pilihan: ['25 cm persegi', '20 cm persegi', '10 cm persegi', '5 cm persegi'],
          kunci: 0,
          pembahasan: 'Luas persegi = sisi x sisi = 5 x 5 = 25 cm persegi.',
        },
        {
          pertanyaan: 'Rumus luas persegi panjang adalah...',
          pilihan: ['Panjang x lebar', 'Panjang + lebar', '2 x panjang', '4 x lebar'],
          kunci: 0,
          pembahasan: 'Luas persegi panjang dihitung dengan rumus panjang x lebar.',
        },
      ],
    },
  ],
  'SD-3-ipas': [
    {
      judul: 'Ciri-ciri makhluk hidup',
      ringkasan: 'Mengenal ciri makhluk hidup seperti bernapas, tumbuh, dan berkembang biak dibandingkan benda mati.',
      materi: 'Makhluk hidup memiliki ciri-ciri yang membedakannya dari benda mati, seperti bernapas, bergerak, tumbuh, berkembang biak, dan memerlukan makanan.\nBernapas berarti mengambil udara untuk kebutuhan tubuh, sedangkan tumbuh berarti bertambah besar dan tinggi seiring waktu.\nBerkembang biak adalah kemampuan makhluk hidup menghasilkan keturunan agar jenisnya tidak punah, misalnya manusia dan hewan melahirkan atau bertelur.',
      soal: [
        {
          pertanyaan: 'Ciri makhluk hidup yang membedakannya dari benda mati antara lain...',
          pilihan: ['Bernapas dan tumbuh', 'Diam saja', 'Tidak memerlukan makanan', 'Tidak bergerak'],
          kunci: 0,
          pembahasan: 'Bernapas dan tumbuh adalah ciri makhluk hidup.',
        },
        {
          pertanyaan: 'Kemampuan menghasilkan keturunan disebut...',
          pilihan: ['Berkembang biak', 'Bernapas', 'Bergerak', 'Tumbuh'],
          kunci: 0,
          pembahasan: 'Berkembang biak adalah kemampuan menghasilkan keturunan.',
        },
        {
          pertanyaan: 'Contoh makhluk hidup yang bernapas menggunakan paru-paru adalah...',
          pilihan: ['Manusia', 'Batu', 'Meja', 'Kursi'],
          kunci: 0,
          pembahasan: 'Manusia bernapas menggunakan paru-paru.',
        },
      ],
    },
    {
      judul: 'Lingkungan sehat dan tidak sehat',
      ringkasan: 'Membedakan ciri lingkungan bersih dan kotor serta dampaknya bagi kesehatan.',
      materi: 'Lingkungan sehat adalah lingkungan yang bersih, memiliki udara segar, air bersih, dan bebas dari sampah berserakan.\nLingkungan tidak sehat biasanya kotor, banyak sampah menumpuk, dan dapat menjadi sarang penyakit atau tempat berkembang biak nyamuk.\nMenjaga lingkungan tetap sehat dapat dilakukan dengan membuang sampah pada tempatnya, membersihkan selokan, dan menanam pohon di sekitar rumah.',
      soal: [
        {
          pertanyaan: 'Ciri lingkungan sehat adalah...',
          pilihan: ['Bersih dan udara segar', 'Kotor dan banyak sampah', 'Bau tidak sedap', 'Airnya keruh'],
          kunci: 0,
          pembahasan: 'Lingkungan sehat memiliki ciri bersih dan udara segar.',
        },
        {
          pertanyaan: 'Lingkungan yang kotor dapat menjadi sarang...',
          pilihan: ['Penyakit', 'Bunga indah', 'Udara segar', 'Air bersih'],
          kunci: 0,
          pembahasan: 'Lingkungan kotor dapat menjadi sarang penyakit.',
        },
        {
          pertanyaan: 'Cara menjaga lingkungan tetap sehat adalah...',
          pilihan: ['Membuang sampah pada tempatnya', 'Membuang sampah sembarangan', 'Membiarkan selokan tersumbat', 'Menebang pohon sembarangan'],
          kunci: 0,
          pembahasan: 'Membuang sampah pada tempatnya menjaga lingkungan tetap sehat.',
        },
      ],
    },
    {
      judul: 'Kenampakan alam di sekitar',
      ringkasan: 'Mengenal bentuk permukaan bumi seperti gunung, sungai, dan pantai di lingkungan sekitar.',
      materi: 'Kenampakan alam adalah bentuk-bentuk permukaan bumi yang terjadi secara alami, seperti gunung, sungai, danau, dan pantai.\nGunung adalah dataran yang menjulang tinggi, sungai adalah aliran air yang mengalir dari tempat tinggi ke tempat rendah, dan pantai adalah daerah pertemuan antara daratan dan laut.\nSetiap daerah di Indonesia memiliki kenampakan alam yang berbeda-beda, yang memengaruhi kegiatan dan mata pencaharian penduduk di sekitarnya.',
      soal: [
        {
          pertanyaan: 'Aliran air yang mengalir dari tempat tinggi ke tempat rendah disebut...',
          pilihan: ['Sungai', 'Gunung', 'Pantai', 'Danau'],
          kunci: 0,
          pembahasan: 'Sungai adalah aliran air dari tempat tinggi ke tempat rendah.',
        },
        {
          pertanyaan: 'Daerah pertemuan antara daratan dan laut disebut...',
          pilihan: ['Pantai', 'Gunung', 'Sungai', 'Hutan'],
          kunci: 0,
          pembahasan: 'Pantai adalah daerah pertemuan antara daratan dan laut.',
        },
        {
          pertanyaan: 'Kenampakan alam memengaruhi...',
          pilihan: ['Mata pencaharian penduduk', 'Warna langit', 'Jumlah bintang', 'Bentuk awan'],
          kunci: 0,
          pembahasan: 'Kenampakan alam memengaruhi mata pencaharian penduduk sekitar.',
        },
      ],
    },
    {
      judul: 'Kegiatan ekonomi masyarakat',
      ringkasan: 'Mengenal jenis pekerjaan dan kegiatan jual beli sederhana di lingkungan sekitar.',
      materi: 'Kegiatan ekonomi adalah kegiatan yang dilakukan manusia untuk memenuhi kebutuhan hidup, seperti bekerja, memproduksi barang, dan melakukan jual beli.\nJenis pekerjaan di masyarakat bermacam-macam, misalnya petani menghasilkan padi, nelayan menangkap ikan, dan pedagang menjual barang kebutuhan sehari-hari.\nKegiatan jual beli sederhana melibatkan penjual yang menawarkan barang dan pembeli yang membayar dengan uang sesuai harga yang disepakati.',
      soal: [
        {
          pertanyaan: 'Kegiatan ekonomi dilakukan manusia untuk...',
          pilihan: ['Memenuhi kebutuhan hidup', 'Bermain saja', 'Menghabiskan waktu', 'Mengganggu orang lain'],
          kunci: 0,
          pembahasan: 'Kegiatan ekonomi dilakukan untuk memenuhi kebutuhan hidup.',
        },
        {
          pertanyaan: 'Pekerjaan yang menghasilkan ikan adalah...',
          pilihan: ['Nelayan', 'Petani', 'Guru', 'Dokter'],
          kunci: 0,
          pembahasan: 'Nelayan bekerja menangkap ikan.',
        },
        {
          pertanyaan: 'Dalam kegiatan jual beli, pembeli bertugas untuk...',
          pilihan: ['Membayar barang', 'Menjual barang', 'Membuat barang', 'Mengantar barang'],
          kunci: 0,
          pembahasan: 'Pembeli bertugas membayar barang yang dibeli.',
        },
      ],
    },
  ],
  'SD-3-inggris': [
    {
      judul: 'Greetings and introductions',
      ringkasan: 'Belajar sapaan dan cara memperkenalkan diri dalam bahasa Inggris secara sederhana.',
      materi: 'Greetings adalah sapaan yang digunakan saat bertemu seseorang, misalnya "Good morning" (selamat pagi) atau "Hello" (halo).\nUntuk memperkenalkan diri, siswa dapat menggunakan kalimat sederhana seperti "My name is..." (nama saya...) diikuti dengan nama mereka sendiri.\nSiswa berlatih mempraktikkan sapaan dan perkenalan diri dalam percakapan sederhana bersama teman sekelas.',
      soal: [
        {
          pertanyaan: '"Good morning" artinya...',
          pilihan: ['Selamat pagi', 'Selamat siang', 'Selamat malam', 'Selamat tinggal'],
          kunci: 0,
          pembahasan: '"Good morning" berarti selamat pagi.',
        },
        {
          pertanyaan: 'Untuk memperkenalkan nama, kita mengatakan...',
          pilihan: ['My name is...', 'How are you?', 'Thank you', 'Good bye'],
          kunci: 0,
          pembahasan: '"My name is..." digunakan untuk memperkenalkan nama.',
        },
        {
          pertanyaan: 'Greetings digunakan saat...',
          pilihan: ['Bertemu seseorang', 'Makan siang', 'Tidur malam', 'Belajar matematika'],
          kunci: 0,
          pembahasan: 'Greetings atau sapaan digunakan saat bertemu seseorang.',
        },
      ],
    },
    {
      judul: 'Numbers and colors',
      ringkasan: 'Mengenal angka dan nama warna dalam bahasa Inggris melalui benda-benda di sekitar.',
      materi: 'Angka dalam bahasa Inggris dimulai dari one (satu), two (dua), three (tiga), dan seterusnya hingga bilangan yang lebih besar.\nWarna dalam bahasa Inggris misalnya red (merah), blue (biru), yellow (kuning), dan green (hijau), yang dapat dikenalkan melalui benda-benda di sekitar.\nSiswa berlatih menyebutkan angka dan warna dalam bahasa Inggris sambil menunjukkan benda nyata di kelas.',
      soal: [
        {
          pertanyaan: '"Three" dalam bahasa Indonesia berarti...',
          pilihan: ['Tiga', 'Dua', 'Empat', 'Lima'],
          kunci: 0,
          pembahasan: '"Three" berarti tiga.',
        },
        {
          pertanyaan: 'Warna "red" dalam bahasa Indonesia adalah...',
          pilihan: ['Merah', 'Biru', 'Kuning', 'Hijau'],
          kunci: 0,
          pembahasan: '"Red" berarti warna merah.',
        },
        {
          pertanyaan: '"Blue" berarti warna...',
          pilihan: ['Biru', 'Merah', 'Kuning', 'Hitam'],
          kunci: 0,
          pembahasan: '"Blue" berarti warna biru.',
        },
      ],
    },
    {
      judul: 'Family members vocabulary',
      ringkasan: 'Mempelajari kosakata anggota keluarga dalam bahasa Inggris, seperti mother, father, dan sister.',
      materi: 'Kosakata anggota keluarga dalam bahasa Inggris misalnya mother (ibu), father (ayah), sister (kakak/adik perempuan), dan brother (kakak/adik laki-laki).\nSelain itu ada juga grandmother (nenek) dan grandfather (kakek) untuk menyebut anggota keluarga yang lebih tua.\nSiswa berlatih menyebutkan anggota keluarganya sendiri menggunakan kosakata bahasa Inggris yang telah dipelajari.',
      soal: [
        {
          pertanyaan: '"Mother" dalam bahasa Indonesia berarti...',
          pilihan: ['Ibu', 'Ayah', 'Kakak', 'Adik'],
          kunci: 0,
          pembahasan: '"Mother" berarti ibu.',
        },
        {
          pertanyaan: '"Father" dalam bahasa Indonesia berarti...',
          pilihan: ['Ayah', 'Ibu', 'Nenek', 'Kakek'],
          kunci: 0,
          pembahasan: '"Father" berarti ayah.',
        },
        {
          pertanyaan: 'Sebutan untuk kakek dalam bahasa Inggris adalah...',
          pilihan: ['Grandfather', 'Grandmother', 'Brother', 'Sister'],
          kunci: 0,
          pembahasan: '"Grandfather" adalah sebutan untuk kakek.',
        },
      ],
    },
    {
      judul: 'Simple daily expressions',
      ringkasan: 'Berlatih ungkapan sehari-hari sederhana seperti meminta tolong dan berterima kasih dalam bahasa Inggris.',
      materi: 'Ungkapan sehari-hari sederhana digunakan untuk berkomunikasi dalam situasi tertentu, misalnya "Please" (tolong) saat meminta bantuan dan "Thank you" (terima kasih) saat menerima bantuan.\nUngkapan "Excuse me" (permisi) digunakan saat ingin lewat atau menyela pembicaraan dengan sopan.\nSiswa berlatih menggunakan ungkapan-ungkapan ini dalam percakapan sederhana sehari-hari di kelas.',
      soal: [
        {
          pertanyaan: '"Thank you" artinya...',
          pilihan: ['Terima kasih', 'Tolong', 'Permisi', 'Maaf'],
          kunci: 0,
          pembahasan: '"Thank you" berarti terima kasih.',
        },
        {
          pertanyaan: 'Ungkapan untuk meminta bantuan adalah...',
          pilihan: ['Please', 'Thank you', 'Good bye', 'Hello'],
          kunci: 0,
          pembahasan: '"Please" digunakan untuk meminta bantuan.',
        },
        {
          pertanyaan: '"Excuse me" digunakan saat...',
          pilihan: ['Ingin lewat dengan sopan', 'Marah', 'Makan', 'Tidur'],
          kunci: 0,
          pembahasan: '"Excuse me" digunakan saat ingin lewat atau menyela dengan sopan.',
        },
      ],
    },
  ],
  'SD-3-pjok': [
    {
      judul: 'Variasi gerak dasar dalam permainan bola kecil',
      ringkasan: 'Berlatih melempar, menangkap, dan memukul dalam permainan menggunakan bola kecil.',
      materi: 'Permainan bola kecil adalah permainan yang menggunakan bola berukuran kecil, seperti bola kasti atau bola tenis.\nGerak dasar dalam permainan bola kecil meliputi melempar, menangkap, dan memukul bola, yang perlu dilatih agar siswa terampil bermain.\nMelempar dilakukan dengan mengayunkan tangan ke arah sasaran, menangkap dilakukan dengan menyambut bola menggunakan kedua tangan, dan memukul dilakukan menggunakan alat pemukul seperti tongkat kasti.',
      soal: [
        {
          pertanyaan: 'Contoh permainan bola kecil adalah...',
          pilihan: ['Kasti', 'Sepak bola', 'Basket', 'Voli'],
          kunci: 0,
          pembahasan: 'Kasti adalah contoh permainan bola kecil.',
        },
        {
          pertanyaan: 'Gerak dasar dalam permainan bola kecil meliputi...',
          pilihan: ['Melempar, menangkap, memukul', 'Berenang dan menyelam', 'Bersepeda jarak jauh', 'Melompat tinggi saja'],
          kunci: 0,
          pembahasan: 'Gerak dasar bola kecil meliputi melempar, menangkap, dan memukul.',
        },
        {
          pertanyaan: 'Menangkap bola dilakukan dengan...',
          pilihan: ['Kedua tangan', 'Satu kaki', 'Kepala', 'Punggung'],
          kunci: 0,
          pembahasan: 'Menangkap bola dilakukan dengan kedua tangan.',
        },
      ],
    },
    {
      judul: 'Latihan kekuatan dan kelenturan',
      ringkasan: 'Melakukan gerakan peregangan dan latihan otot ringan untuk melatih kekuatan dan kelenturan tubuh.',
      materi: 'Latihan kekuatan bertujuan meningkatkan tenaga otot tubuh, misalnya dengan push-up sederhana atau mengangkat beban ringan.\nLatihan kelenturan bertujuan membuat tubuh lebih lentur dan tidak kaku, misalnya dengan gerakan peregangan seperti mencium lutut atau memutar pinggang.\nMelakukan latihan kekuatan dan kelenturan secara rutin membantu tubuh menjadi lebih bugar dan mengurangi risiko cedera saat beraktivitas.',
      soal: [
        {
          pertanyaan: 'Latihan kekuatan bertujuan meningkatkan...',
          pilihan: ['Tenaga otot', 'Berat badan', 'Tinggi badan', 'Rasa kantuk'],
          kunci: 0,
          pembahasan: 'Latihan kekuatan bertujuan meningkatkan tenaga otot.',
        },
        {
          pertanyaan: 'Contoh latihan kelenturan adalah...',
          pilihan: ['Peregangan mencium lutut', 'Push-up', 'Lari cepat', 'Angkat beban berat'],
          kunci: 0,
          pembahasan: 'Peregangan mencium lutut adalah contoh latihan kelenturan.',
        },
        {
          pertanyaan: 'Manfaat latihan kekuatan dan kelenturan adalah...',
          pilihan: ['Tubuh lebih bugar', 'Tubuh lebih kaku', 'Mudah cedera', 'Mudah lelah'],
          kunci: 0,
          pembahasan: 'Latihan ini membuat tubuh lebih bugar dan mengurangi risiko cedera.',
        },
      ],
    },
    {
      judul: 'Aktivitas air (pengenalan)',
      ringkasan: 'Mengenalkan gerakan dasar di air seperti mengapung dan bernapas dengan aman.',
      materi: 'Aktivitas air adalah kegiatan olahraga yang dilakukan di dalam air, seperti berenang, yang perlu dikenalkan secara bertahap agar siswa merasa aman.\nSebelum berenang, siswa perlu belajar teknik dasar seperti mengapung dan mengatur napas dengan benar agar tidak panik saat berada di air.\nKeselamatan saat beraktivitas di air sangat penting, misalnya selalu didampingi orang dewasa dan tidak bermain di kolam yang dalam tanpa pengawasan.',
      soal: [
        {
          pertanyaan: 'Contoh aktivitas air adalah...',
          pilihan: ['Berenang', 'Bermain bola', 'Lari maraton', 'Bermain layang-layang'],
          kunci: 0,
          pembahasan: 'Berenang adalah contoh aktivitas air.',
        },
        {
          pertanyaan: 'Sebelum berenang, siswa perlu belajar teknik dasar seperti...',
          pilihan: ['Mengapung dan mengatur napas', 'Melempar bola', 'Memukul bola', 'Melompat tinggi'],
          kunci: 0,
          pembahasan: 'Teknik dasar sebelum berenang adalah mengapung dan mengatur napas.',
        },
        {
          pertanyaan: 'Saat beraktivitas di air, penting untuk...',
          pilihan: ['Didampingi orang dewasa', 'Bermain sendirian di kolam dalam', 'Mengabaikan keselamatan', 'Berenang tanpa pengawasan'],
          kunci: 0,
          pembahasan: 'Keselamatan di air penting, misalnya selalu didampingi orang dewasa.',
        },
      ],
    },
    {
      judul: 'Pola makan sehat untuk anak',
      ringkasan: 'Mengenal jenis makanan bergizi seimbang dan pentingnya sarapan sebelum beraktivitas.',
      materi: 'Pola makan sehat adalah kebiasaan makan makanan bergizi seimbang yang terdiri dari karbohidrat, protein, sayur, dan buah.\nSarapan sebelum beraktivitas penting agar tubuh memiliki energi yang cukup untuk belajar dan bermain sepanjang hari.\nSiswa perlu membiasakan makan makanan bergizi dan mengurangi makanan tidak sehat seperti jajanan yang terlalu manis atau berminyak berlebihan.',
      soal: [
        {
          pertanyaan: 'Makanan bergizi seimbang terdiri dari...',
          pilihan: ['Karbohidrat, protein, sayur, dan buah', 'Hanya nasi', 'Hanya permen', 'Hanya minuman manis'],
          kunci: 0,
          pembahasan: 'Makanan bergizi seimbang terdiri dari karbohidrat, protein, sayur, dan buah.',
        },
        {
          pertanyaan: 'Sarapan penting dilakukan sebelum...',
          pilihan: ['Beraktivitas', 'Tidur malam', 'Bermain gawai', 'Menonton televisi'],
          kunci: 0,
          pembahasan: 'Sarapan penting sebelum beraktivitas agar tubuh berenergi.',
        },
        {
          pertanyaan: 'Contoh makanan yang sebaiknya dikurangi adalah...',
          pilihan: ['Jajanan terlalu manis dan berminyak', 'Sayur dan buah', 'Nasi dan lauk', 'Susu'],
          kunci: 0,
          pembahasan: 'Jajanan terlalu manis dan berminyak sebaiknya dikurangi.',
        },
      ],
    },
  ],
  'SD-3-seni': [
    {
      judul: 'Menggambar dekoratif',
      ringkasan: 'Membuat gambar dengan motif hias berulang yang memadukan garis, bentuk, dan warna.',
      materi: 'Gambar dekoratif adalah gambar yang menggunakan motif hias berulang, biasanya berupa garis, bentuk, atau pola tertentu yang disusun secara teratur.\nMotif hias dapat berupa bentuk geometris seperti segitiga dan lingkaran, atau bentuk alam seperti bunga dan daun yang digambar secara berulang.\nSiswa berlatih membuat gambar dekoratif dengan memadukan garis, bentuk, dan warna agar menghasilkan karya yang indah dan menarik.',
      soal: [
        {
          pertanyaan: 'Gambar dekoratif menggunakan motif yang...',
          pilihan: ['Berulang dan teratur', 'Acak tanpa pola', 'Hanya satu warna', 'Tidak beraturan'],
          kunci: 0,
          pembahasan: 'Gambar dekoratif menggunakan motif yang berulang dan teratur.',
        },
        {
          pertanyaan: 'Contoh motif hias adalah...',
          pilihan: ['Bentuk geometris dan bunga', 'Angka matematika', 'Huruf abjad saja', 'Peta dunia'],
          kunci: 0,
          pembahasan: 'Bentuk geometris dan bunga adalah contoh motif hias.',
        },
        {
          pertanyaan: 'Gambar dekoratif memadukan unsur...',
          pilihan: ['Garis, bentuk, dan warna', 'Hanya angka', 'Hanya huruf', 'Hanya suara'],
          kunci: 0,
          pembahasan: 'Gambar dekoratif memadukan garis, bentuk, dan warna.',
        },
      ],
    },
    {
      judul: 'Membuat kerajinan dari bahan alam',
      ringkasan: 'Membuat karya kerajinan sederhana dari daun, biji, atau ranting yang mudah ditemukan.',
      materi: 'Bahan alam adalah bahan yang berasal dari alam sekitar, seperti daun, biji-bijian, ranting, dan batu kecil, yang dapat digunakan untuk membuat karya kerajinan.\nContoh kerajinan dari bahan alam misalnya membuat kolase dari daun kering, kalung dari biji-bijian, atau hiasan dari ranting pohon.\nMembuat kerajinan dari bahan alam melatih kreativitas siswa sekaligus mengajarkan untuk memanfaatkan bahan yang mudah ditemukan di sekitar.',
      soal: [
        {
          pertanyaan: 'Contoh bahan alam untuk kerajinan adalah...',
          pilihan: ['Daun dan biji-bijian', 'Kertas plastik', 'Besi', 'Kaca'],
          kunci: 0,
          pembahasan: 'Daun dan biji-bijian adalah contoh bahan alam untuk kerajinan.',
        },
        {
          pertanyaan: 'Kolase dari daun kering termasuk contoh kerajinan dari...',
          pilihan: ['Bahan alam', 'Bahan plastik', 'Bahan logam', 'Bahan kaca'],
          kunci: 0,
          pembahasan: 'Kolase daun kering termasuk kerajinan dari bahan alam.',
        },
        {
          pertanyaan: 'Membuat kerajinan dari bahan alam melatih...',
          pilihan: ['Kreativitas', 'Rasa malas', 'Sikap boros', 'Sikap ceroboh'],
          kunci: 0,
          pembahasan: 'Kegiatan ini melatih kreativitas siswa.',
        },
      ],
    },
    {
      judul: 'Menyanyi lagu wajib dan daerah',
      ringkasan: 'Menyanyikan lagu wajib nasional dan lagu daerah dengan nada yang tepat.',
      materi: 'Lagu wajib nasional adalah lagu yang menggambarkan semangat cinta tanah air, seperti lagu "Indonesia Raya" dan "Garuda Pancasila".\nLagu daerah adalah lagu yang berasal dari suatu daerah tertentu dan biasanya menggunakan bahasa daerah setempat.\nSiswa berlatih menyanyikan lagu wajib dan lagu daerah dengan nada yang tepat, sekaligus memahami makna yang terkandung di dalamnya.',
      soal: [
        {
          pertanyaan: 'Contoh lagu wajib nasional adalah...',
          pilihan: ['Indonesia Raya', 'Lagu daerah bebas', 'Lagu pop terbaru', 'Lagu anak asing'],
          kunci: 0,
          pembahasan: '"Indonesia Raya" adalah contoh lagu wajib nasional.',
        },
        {
          pertanyaan: 'Lagu daerah biasanya menggunakan...',
          pilihan: ['Bahasa daerah setempat', 'Bahasa asing', 'Kode angka', 'Simbol matematika'],
          kunci: 0,
          pembahasan: 'Lagu daerah biasanya menggunakan bahasa daerah setempat.',
        },
        {
          pertanyaan: 'Menyanyikan lagu wajib nasional menumbuhkan semangat...',
          pilihan: ['Cinta tanah air', 'Malas belajar', 'Sikap individualis', 'Sikap acuh'],
          kunci: 0,
          pembahasan: 'Lagu wajib nasional menumbuhkan semangat cinta tanah air.',
        },
      ],
    },
    {
      judul: 'Gerak tari berpasangan',
      ringkasan: 'Menampilkan gerak tari sederhana secara berpasangan dengan kekompakan gerak.',
      materi: 'Gerak tari berpasangan adalah tarian yang dilakukan oleh dua orang secara bersamaan dengan gerakan yang saling melengkapi.\nDalam tari berpasangan, kekompakan gerak antara kedua penari sangat penting agar tarian terlihat serasi dan indah.\nSiswa berlatih menari berpasangan dengan teman, memperhatikan ketukan musik dan gerakan pasangannya agar tampil kompak.',
      soal: [
        {
          pertanyaan: 'Gerak tari berpasangan dilakukan oleh...',
          pilihan: ['Dua orang bersamaan', 'Satu orang saja', 'Banyak orang tanpa aturan', 'Boneka'],
          kunci: 0,
          pembahasan: 'Tari berpasangan dilakukan oleh dua orang secara bersamaan.',
        },
        {
          pertanyaan: 'Hal penting dalam tari berpasangan adalah...',
          pilihan: ['Kekompakan gerak', 'Kecepatan berlari', 'Kekuatan otot', 'Suara keras'],
          kunci: 0,
          pembahasan: 'Kekompakan gerak sangat penting dalam tari berpasangan.',
        },
        {
          pertanyaan: 'Saat menari berpasangan, siswa perlu memperhatikan...',
          pilihan: ['Ketukan musik dan gerakan pasangan', 'Warna baju saja', 'Bentuk panggung saja', 'Jumlah penonton'],
          kunci: 0,
          pembahasan: 'Ketukan musik dan gerakan pasangan penting diperhatikan saat menari.',
        },
      ],
    },
  ],
  'SD-3-mulok': [
    {
      judul: 'Percakapan sederhana bahasa daerah',
      ringkasan: 'Berlatih percakapan singkat sehari-hari menggunakan bahasa daerah setempat.',
      materi: 'Percakapan sederhana dalam bahasa daerah biasanya berisi sapaan, perkenalan diri, atau obrolan singkat sehari-hari.\nSiswa berlatih menggunakan bahasa daerah dalam percakapan singkat dengan teman, misalnya menanyakan kabar atau menyebutkan nama.\nMembiasakan berbicara dengan bahasa daerah membantu melestarikan bahasa daerah agar tidak hilang dan tetap digunakan oleh generasi muda.',
      soal: [
        {
          pertanyaan: 'Percakapan sederhana bahasa daerah biasanya berisi...',
          pilihan: ['Sapaan dan perkenalan diri', 'Rumus matematika', 'Kode pemrograman', 'Data statistik'],
          kunci: 0,
          pembahasan: 'Percakapan sederhana biasanya berisi sapaan dan perkenalan diri.',
        },
        {
          pertanyaan: 'Membiasakan berbicara bahasa daerah bertujuan untuk...',
          pilihan: ['Melestarikan bahasa daerah', 'Melupakan bahasa daerah', 'Menghindari bahasa daerah', 'Mengabaikan budaya sendiri'],
          kunci: 0,
          pembahasan: 'Berbicara bahasa daerah bertujuan melestarikan bahasa daerah.',
        },
        {
          pertanyaan: 'Bahasa daerah sebaiknya tetap digunakan oleh...',
          pilihan: ['Generasi muda', 'Hanya orang tua', 'Tidak perlu digunakan', 'Hanya di sekolah'],
          kunci: 0,
          pembahasan: 'Bahasa daerah sebaiknya tetap digunakan oleh generasi muda agar lestari.',
        },
      ],
    },
    {
      judul: 'Aksara atau tulisan daerah (pengenalan)',
      ringkasan: 'Mengenal bentuk dasar aksara atau tulisan khas daerah, bila ada, sebagai pengetahuan budaya.',
      materi: 'Beberapa daerah di Indonesia memiliki aksara atau tulisan khas daerah, seperti aksara Jawa, aksara Bali, atau aksara Lontara di Sulawesi.\nAksara daerah biasanya memiliki bentuk huruf yang berbeda dengan huruf abjad Latin yang biasa digunakan sehari-hari.\nMengenal aksara daerah membantu siswa memahami dan menghargai kekayaan budaya tulis yang dimiliki daerahnya sendiri.',
      soal: [
        {
          pertanyaan: 'Contoh aksara daerah di Indonesia adalah...',
          pilihan: ['Aksara Jawa', 'Huruf Latin', 'Angka Romawi', 'Simbol matematika'],
          kunci: 0,
          pembahasan: 'Aksara Jawa adalah contoh aksara daerah di Indonesia.',
        },
        {
          pertanyaan: 'Aksara daerah memiliki bentuk huruf yang...',
          pilihan: ['Berbeda dengan huruf Latin', 'Sama persis dengan huruf Latin', 'Berupa angka saja', 'Berupa gambar acak'],
          kunci: 0,
          pembahasan: 'Aksara daerah memiliki bentuk huruf yang berbeda dari huruf Latin.',
        },
        {
          pertanyaan: 'Mengenal aksara daerah membantu siswa...',
          pilihan: ['Menghargai budaya tulis daerah', 'Melupakan budaya sendiri', 'Mengabaikan sejarah', 'Menghindari tradisi'],
          kunci: 0,
          pembahasan: 'Mengenal aksara daerah membantu siswa menghargai budaya tulis daerahnya.',
        },
      ],
    },
    {
      judul: 'Kearifan lokal di lingkungan sekitar',
      ringkasan: 'Mengenal kebiasaan dan nilai-nilai baik yang diwariskan turun-temurun di daerah setempat.',
      materi: 'Kearifan lokal adalah nilai-nilai baik dan kebiasaan yang diwariskan turun-temurun oleh masyarakat suatu daerah, biasanya berkaitan dengan cara hidup selaras dengan alam dan sesama.\nContoh kearifan lokal misalnya gotong royong membersihkan kampung, upacara adat sebelum menanam padi, atau kebiasaan menjaga kebersihan sungai.\nMelestarikan kearifan lokal penting agar nilai-nilai baik dari nenek moyang tetap terjaga dan dapat diteruskan kepada generasi berikutnya.',
      soal: [
        {
          pertanyaan: 'Kearifan lokal adalah nilai-nilai yang diwariskan secara...',
          pilihan: ['Turun-temurun', 'Sekali saja', 'Ditulis ulang tiap tahun', 'Dibuat oleh pemerintah pusat'],
          kunci: 0,
          pembahasan: 'Kearifan lokal diwariskan secara turun-temurun.',
        },
        {
          pertanyaan: 'Contoh kearifan lokal adalah...',
          pilihan: ['Gotong royong membersihkan kampung', 'Membuang sampah sembarangan', 'Menebang hutan sembarangan', 'Mengabaikan tradisi'],
          kunci: 0,
          pembahasan: 'Gotong royong membersihkan kampung adalah contoh kearifan lokal.',
        },
        {
          pertanyaan: 'Melestarikan kearifan lokal bertujuan agar nilai baik nenek moyang...',
          pilihan: ['Tetap terjaga', 'Dilupakan', 'Dihapuskan', 'Diabaikan'],
          kunci: 0,
          pembahasan: 'Tujuannya agar nilai-nilai baik nenek moyang tetap terjaga.',
        },
      ],
    },
  ],
}
