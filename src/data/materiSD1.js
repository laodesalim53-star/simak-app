// =====================================================================
// MATERI — SD KELAS 1
// =====================================================================
// Format tiap item materi:
//   judul      : judul topik (wajib)
//   ringkasan  : teks singkat 1-2 kalimat (opsional, tampil di kartu ringkas)
//   materi     : penjelasan lengkap topik (opsional, tampil saat dibuka)
//   soal       : array 3 soal pilihan ganda (opsional)
//                { pertanyaan, pilihan: [4 opsi], kunci: indeks jawaban benar,
//                  pembahasan: penjelasan singkat kunci jawaban }
//   link       : tautan eksternal (opsional, kalau diisi materi tampil sebagai link)
export const MATERI_SD1 = {
  'SD-1-agama': [
    {
      judul: 'Mengenal Allah melalui Asmaul Husna',
      ringkasan: 'Allah memiliki nama-nama yang indah, misalnya Ar-Rahman (Maha Pengasih) dan Ar-Rahim (Maha Penyayang). Kita belajar menyebutnya dan mensyukuri kasih sayang-Nya.',
      materi: 'Asmaul Husna adalah nama-nama Allah yang indah dan baik, jumlahnya ada 99. Dua di antaranya yang paling sering diucapkan adalah Ar-Rahman yang artinya Maha Pengasih kepada seluruh makhluk, dan Ar-Rahim yang artinya Maha Penyayang khusus kepada orang yang beriman.\nAnak-anak belajar mengenal Asmaul Husna dengan cara menyanyikannya atau menepuk tangan sambil menghafal, supaya lebih mudah diingat dan menyenangkan.\nDengan mengenal nama-nama Allah ini, kita diajak untuk selalu bersyukur atas kasih sayang-Nya, misalnya bersyukur karena diberi orang tua yang menyayangi kita, makanan yang cukup, dan tubuh yang sehat.',
      soal: [
        {
          pertanyaan: 'Ar-Rahman artinya adalah...',
          pilihan: ['Maha Pengasih', 'Maha Kuat', 'Maha Melihat', 'Maha Kaya'],
          kunci: 0,
          pembahasan: 'Ar-Rahman berarti Allah Maha Pengasih kepada semua makhluk-Nya.',
        },
        {
          pertanyaan: 'Asmaul Husna adalah...',
          pilihan: ['Nama-nama indah Allah', 'Nama kitab suci', 'Nama malaikat', 'Nama surga'],
          kunci: 0,
          pembahasan: 'Asmaul Husna adalah kumpulan nama-nama Allah yang indah dan baik.',
        },
        {
          pertanyaan: 'Sikap yang tepat setelah mengenal Asmaul Husna adalah...',
          pilihan: ['Bersyukur kepada Allah', 'Malas belajar', 'Marah kepada teman', 'Tidak mau berbagi'],
          kunci: 0,
          pembahasan: 'Mengenal kasih sayang Allah membuat kita semakin bersyukur.',
        },
      ],
    },
    {
      judul: 'Rukun Iman dan Rukun Islam',
      ringkasan: 'Rukun Iman ada 6 dan Rukun Islam ada 5. Pada tahap ini siswa mengenal urutan dan namanya lewat nyanyian atau tepuk.',
      materi: 'Rukun Iman adalah 6 hal yang wajib dipercaya oleh setiap muslim, yaitu iman kepada Allah, malaikat, kitab-kitab, rasul, hari akhir, dan qada-qadar (ketentuan Allah).\nRukun Islam adalah 5 amalan pokok dalam agama Islam, yaitu syahadat, salat, zakat, puasa, dan haji bagi yang mampu.\nDi kelas 1, anak-anak diajak menghafal urutannya dengan cara yang menyenangkan seperti nyanyian atau tepuk tangan berirama, sehingga mudah diingat tanpa perlu memahami detail rumit terlebih dahulu.',
      soal: [
        {
          pertanyaan: 'Jumlah Rukun Iman ada...',
          pilihan: ['5', '6', '4', '7'],
          kunci: 1,
          pembahasan: 'Rukun Iman berjumlah 6.',
        },
        {
          pertanyaan: 'Jumlah Rukun Islam ada...',
          pilihan: ['5', '6', '3', '9'],
          kunci: 0,
          pembahasan: 'Rukun Islam berjumlah 5.',
        },
        {
          pertanyaan: 'Rukun Islam yang pertama adalah...',
          pilihan: ['Puasa', 'Zakat', 'Syahadat', 'Haji'],
          kunci: 2,
          pembahasan: 'Syahadat, yaitu persaksian iman, adalah rukun Islam yang pertama.',
        },
      ],
    },
    {
      judul: 'Bacaan dan gerakan salat',
      ringkasan: 'Siswa mengenal gerakan salat dari berdiri, rukuk, sujud, sampai duduk, beserta bacaan pendek yang sederhana.',
      materi: 'Salat memiliki urutan gerakan yang tetap, dimulai dari berdiri tegak sambil takbir, lalu rukuk (membungkukkan badan), kemudian sujud (menempelkan dahi ke lantai), dan diakhiri dengan duduk.\nSetiap gerakan salat disertai bacaan pendek. Misalnya saat berdiri membaca surat pendek, saat rukuk dan sujud membaca kalimat tasbih.\nDi kelas 1, anak-anak berlatih menirukan gerakan salat secara bertahap sambil menghafal bacaan pendek yang mudah, agar terbiasa melakukannya dengan benar.',
      soal: [
        {
          pertanyaan: 'Gerakan menempelkan dahi ke lantai saat salat disebut...',
          pilihan: ['Rukuk', 'Sujud', 'Duduk', 'Berdiri'],
          kunci: 1,
          pembahasan: 'Sujud adalah gerakan menempelkan dahi ke lantai.',
        },
        {
          pertanyaan: 'Gerakan membungkukkan badan saat salat disebut...',
          pilihan: ['Sujud', 'Rukuk', 'Salam', 'Takbir'],
          kunci: 1,
          pembahasan: 'Rukuk adalah gerakan membungkukkan badan.',
        },
        {
          pertanyaan: 'Urutan gerakan salat yang benar adalah...',
          pilihan: ['Sujud, berdiri, rukuk', 'Berdiri, rukuk, sujud', 'Duduk, sujud, berdiri', 'Rukuk, berdiri, duduk'],
          kunci: 1,
          pembahasan: 'Salat dimulai dari berdiri, lalu rukuk, kemudian sujud.',
        },
      ],
    },
    {
      judul: 'Kisah keteladanan Nabi',
      ringkasan: 'Cerita pendek tentang sifat jujur, sabar, dan penyayang Nabi Muhammad SAW sebagai contoh perilaku sehari-hari.',
      materi: 'Nabi Muhammad SAW dikenal memiliki sifat-sifat terpuji yang bisa dicontoh, di antaranya jujur (siddiq), sabar menghadapi kesulitan, dan penyayang kepada semua orang termasuk anak-anak dan hewan.\nCerita-cerita pendek tentang Nabi disampaikan agar anak mudah memahami dan meneladani sifat baik tersebut, misalnya cerita tentang Nabi yang tetap ramah kepada orang yang pernah berbuat tidak baik kepadanya.\nDengan mengenal kisah ini, siswa diajak untuk mempraktikkan sifat jujur dan sabar dalam kehidupan sehari-hari, misalnya jujur saat mengerjakan tugas dan sabar saat mengantre.',
      soal: [
        {
          pertanyaan: 'Sifat selalu berkata benar disebut...',
          pilihan: ['Jujur', 'Marah', 'Malas', 'Sombong'],
          kunci: 0,
          pembahasan: 'Jujur artinya selalu berkata dan berbuat sesuai kebenaran.',
        },
        {
          pertanyaan: 'Nabi Muhammad SAW terkenal dengan sifatnya yang...',
          pilihan: ['Pemarah', 'Penyayang', 'Sombong', 'Pemalas'],
          kunci: 1,
          pembahasan: 'Nabi Muhammad SAW dikenal sangat penyayang kepada semua makhluk.',
        },
        {
          pertanyaan: 'Contoh meneladani sifat sabar Nabi adalah...',
          pilihan: ['Marah saat mengantre', 'Sabar menunggu giliran', 'Merebut mainan teman', 'Berteriak di kelas'],
          kunci: 1,
          pembahasan: 'Sabar berarti bisa menahan diri dan menunggu dengan tenang.',
        },
      ],
    },
    {
      judul: 'Perilaku terpuji sehari-hari',
      ringkasan: 'Membiasakan mengucap salam, berkata jujur, berterima kasih, dan meminta maaf di rumah dan di sekolah.',
      materi: 'Perilaku terpuji adalah kebiasaan baik yang bisa dilakukan sehari-hari, seperti mengucap salam saat bertemu atau berpisah, berkata jujur, mengucap terima kasih ketika dibantu, dan meminta maaf ketika berbuat salah.\nKebiasaan ini penting dilatih sejak kecil di rumah maupun di sekolah, misalnya mengucap salam saat masuk kelas, berterima kasih kepada guru, dan meminta maaf kepada teman jika bersalah.\nDengan membiasakan perilaku terpuji, anak akan disukai teman-temannya dan hidup lebih rukun dengan orang di sekitarnya.',
      soal: [
        {
          pertanyaan: 'Ucapan yang tepat saat dibantu teman adalah...',
          pilihan: ['Terima kasih', 'Maaf', 'Permisi', 'Tolong'],
          kunci: 0,
          pembahasan: 'Terima kasih diucapkan sebagai balasan ketika dibantu orang lain.',
        },
        {
          pertanyaan: 'Ucapan yang tepat ketika kita berbuat salah adalah...',
          pilihan: ['Terima kasih', 'Selamat', 'Maaf', 'Halo'],
          kunci: 2,
          pembahasan: 'Meminta maaf adalah sikap terpuji ketika kita berbuat salah.',
        },
        {
          pertanyaan: 'Contoh perilaku terpuji di sekolah adalah...',
          pilihan: ['Mengucap salam kepada guru', 'Mengambil barang teman diam-diam', 'Berbohong tentang tugas', 'Mengganggu teman belajar'],
          kunci: 0,
          pembahasan: 'Mengucap salam adalah kebiasaan baik yang mencerminkan sopan santun.',
        },
      ],
    },
  ],
  'SD-1-pancasila': [
    {
      judul: 'Simbol dan lambang Pancasila',
      ringkasan: 'Lambang Pancasila adalah Garuda Pancasila. Setiap sila punya simbol: bintang, rantai, pohon beringin, kepala banteng, dan padi kapas.',
      materi: 'Lambang negara Indonesia adalah Garuda Pancasila, seekor burung garuda yang di dadanya terdapat perisai dengan lima simbol sila Pancasila.\nSila pertama dilambangkan bintang, sila kedua dilambangkan rantai, sila ketiga dilambangkan pohon beringin, sila keempat dilambangkan kepala banteng, dan sila kelima dilambangkan padi dan kapas.\nSetiap simbol memiliki arti yang berkaitan dengan bunyi silanya, misalnya padi dan kapas melambangkan kecukupan sandang dan pangan sebagai wujud keadilan sosial bagi seluruh rakyat Indonesia.',
      soal: [
        {
          pertanyaan: 'Lambang negara Indonesia adalah...',
          pilihan: ['Garuda Pancasila', 'Bendera Merah Putih', 'Peta Indonesia', 'Candi Borobudur'],
          kunci: 0,
          pembahasan: 'Garuda Pancasila adalah lambang resmi negara Indonesia.',
        },
        {
          pertanyaan: 'Simbol bintang melambangkan sila ke-...',
          pilihan: ['1', '2', '3', '5'],
          kunci: 0,
          pembahasan: 'Bintang adalah lambang sila pertama, Ketuhanan Yang Maha Esa.',
        },
        {
          pertanyaan: 'Padi dan kapas adalah simbol sila ke-...',
          pilihan: ['2', '3', '4', '5'],
          kunci: 3,
          pembahasan: 'Padi dan kapas melambangkan sila kelima, Keadilan Sosial.',
        },
      ],
    },
    {
      judul: 'Mengenal aturan di rumah dan sekolah',
      ringkasan: 'Aturan membuat kita aman dan tertib, misalnya merapikan mainan, antre, dan datang tepat waktu.',
      materi: 'Aturan adalah pedoman yang dibuat agar kehidupan bersama menjadi aman, nyaman, dan tertib. Aturan ada di berbagai tempat, termasuk di rumah dan di sekolah.\nContoh aturan di rumah antara lain merapikan mainan setelah bermain, makan bersama pada waktunya, dan meminta izin sebelum keluar rumah. Contoh aturan di sekolah antara lain datang tepat waktu, mengantre saat masuk kelas, dan mendengarkan guru saat menjelaskan.\nMematuhi aturan akan membuat kegiatan sehari-hari berjalan lancar dan semua orang merasa nyaman, sedangkan melanggar aturan bisa menimbulkan masalah bagi diri sendiri maupun orang lain.',
      soal: [
        {
          pertanyaan: 'Contoh aturan di rumah adalah...',
          pilihan: ['Merapikan mainan', 'Berlari di jalan raya', 'Mengganggu tetangga', 'Membuang sampah sembarangan'],
          kunci: 0,
          pembahasan: 'Merapikan mainan setelah bermain adalah aturan sederhana di rumah.',
        },
        {
          pertanyaan: 'Contoh aturan di sekolah adalah...',
          pilihan: ['Datang tepat waktu', 'Berteriak saat guru mengajar', 'Tidak membawa buku', 'Mengganggu teman'],
          kunci: 0,
          pembahasan: 'Datang tepat waktu ke sekolah adalah aturan penting yang harus dipatuhi.',
        },
        {
          pertanyaan: 'Manfaat mematuhi aturan adalah...',
          pilihan: ['Membuat kacau', 'Membuat kehidupan aman dan tertib', 'Membuat orang lain kesal', 'Membuat rugi diri sendiri'],
          kunci: 1,
          pembahasan: 'Aturan dibuat agar kehidupan bersama menjadi aman dan tertib.',
        },
      ],
    },
    {
      judul: 'Sikap saling menghormati perbedaan',
      ringkasan: 'Teman-teman kita berbeda dalam suku, agama, dan kesukaan, tetapi tetap bisa berteman dan bermain bersama.',
      materi: 'Indonesia memiliki banyak suku, agama, dan budaya yang berbeda-beda, sehingga teman-teman di sekolah pun bisa berasal dari latar belakang yang berbeda.\nMeskipun berbeda suku, agama, atau kesukaan, kita tetap bisa berteman baik, bermain bersama, dan saling membantu tanpa membeda-bedakan.\nMenghormati perbedaan berarti tidak mengejek teman yang berbeda, mau mendengarkan cerita mereka, dan menerima teman apa adanya sebagai bentuk sikap persatuan.',
      soal: [
        {
          pertanyaan: 'Sikap yang tepat terhadap teman yang berbeda agama adalah...',
          pilihan: ['Menghormatinya', 'Menjauhinya', 'Mengejeknya', 'Tidak mau berteman'],
          kunci: 0,
          pembahasan: 'Kita harus tetap menghormati teman meskipun berbeda agama.',
        },
        {
          pertanyaan: 'Indonesia terdiri dari banyak...',
          pilihan: ['Suku dan budaya', 'Hanya satu suku', 'Hanya satu agama', 'Hanya satu bahasa'],
          kunci: 0,
          pembahasan: 'Indonesia memiliki keberagaman suku, agama, dan budaya.',
        },
        {
          pertanyaan: 'Contoh menghormati perbedaan adalah...',
          pilihan: ['Mengejek logat bicara teman', 'Mau bermain dengan semua teman', 'Memilih-milih teman', 'Menolak teman baru'],
          kunci: 1,
          pembahasan: 'Mau bermain dengan semua teman tanpa membeda-bedakan adalah sikap menghormati perbedaan.',
        },
      ],
    },
    {
      judul: 'Gotong royong di lingkungan sekitar',
      ringkasan: 'Bekerja bersama membuat pekerjaan lebih ringan, contohnya kerja bakti membersihkan kelas.',
      materi: 'Gotong royong adalah kegiatan bekerja bersama-sama untuk mencapai tujuan yang sama, sehingga pekerjaan menjadi lebih ringan dan cepat selesai.\nContoh gotong royong di sekolah adalah kerja bakti membersihkan kelas bersama teman-teman, sedangkan contoh di rumah adalah membantu orang tua membereskan rumah.\nGotong royong juga mengajarkan kita untuk peduli kepada orang lain dan bekerja sama, bukan hanya memikirkan diri sendiri.',
      soal: [
        {
          pertanyaan: 'Gotong royong artinya...',
          pilihan: ['Bekerja sendirian', 'Bekerja bersama-sama', 'Bermalas-malasan', 'Bertengkar'],
          kunci: 1,
          pembahasan: 'Gotong royong adalah kegiatan bekerja bersama-sama.',
        },
        {
          pertanyaan: 'Contoh gotong royong di sekolah adalah...',
          pilihan: ['Kerja bakti membersihkan kelas', 'Bermain sendiri', 'Tidur di kelas', 'Mengganggu teman'],
          kunci: 0,
          pembahasan: 'Kerja bakti membersihkan kelas bersama adalah contoh gotong royong di sekolah.',
        },
        {
          pertanyaan: 'Manfaat gotong royong adalah pekerjaan menjadi...',
          pilihan: ['Lebih berat', 'Lebih ringan dan cepat selesai', 'Lebih lama', 'Tidak selesai'],
          kunci: 1,
          pembahasan: 'Dengan bekerja bersama, pekerjaan menjadi lebih ringan dan cepat selesai.',
        },
      ],
    },
  ],
  'SD-1-indonesia': [
    {
      judul: 'Mengenal huruf abjad A-Z',
      ringkasan: 'Siswa mengenal 26 huruf, membedakan huruf besar dan kecil, dan menyebut bunyinya.',
      materi: 'Abjad dalam Bahasa Indonesia terdiri dari 26 huruf, dari A sampai Z. Setiap huruf memiliki bentuk huruf besar (kapital) dan huruf kecil.\nSiswa belajar mengenali bentuk setiap huruf, menyebutkan namanya, dan melafalkan bunyinya, misalnya huruf "B" berbunyi "beh".\nMengenal huruf adalah dasar penting sebelum belajar membaca dan menulis kata-kata, sehingga latihan ini dilakukan berulang-ulang melalui kartu huruf, nyanyian, atau permainan.',
      soal: [
        {
          pertanyaan: 'Jumlah huruf abjad dalam Bahasa Indonesia ada...',
          pilihan: ['24', '25', '26', '27'],
          kunci: 2,
          pembahasan: 'Abjad Bahasa Indonesia berjumlah 26 huruf, dari A sampai Z.',
        },
        {
          pertanyaan: 'Huruf kapital digunakan untuk menulis huruf...',
          pilihan: ['Besar', 'Kecil', 'Miring', 'Tebal'],
          kunci: 0,
          pembahasan: 'Huruf kapital adalah sebutan lain untuk huruf besar.',
        },
        {
          pertanyaan: 'Huruf pertama dalam abjad adalah...',
          pilihan: ['B', 'A', 'C', 'Z'],
          kunci: 1,
          pembahasan: 'Huruf A adalah huruf pertama dalam urutan abjad.',
        },
      ],
    },
    {
      judul: 'Membaca suku kata sederhana',
      ringkasan: 'Menggabungkan huruf konsonan dan vokal menjadi suku kata, misalnya ba-bi-bu-be-bo, lalu membaca kata seperti "bola".',
      materi: 'Suku kata terbentuk dari gabungan huruf konsonan dan huruf vokal, misalnya huruf "b" digabung dengan huruf vokal menjadi ba, bi, bu, be, bo.\nSetelah menguasai suku kata, siswa berlatih menggabungkan dua atau lebih suku kata menjadi kata utuh, misalnya suku kata "bo" dan "la" digabung menjadi kata "bola".\nLatihan membaca suku kata sebaiknya dilakukan secara berulang dengan berbagai kata sederhana yang dekat dengan kehidupan anak, seperti "mata", "buku", dan "meja", agar anak semakin lancar membaca.',
      soal: [
        {
          pertanyaan: 'Suku kata "bo" dan "la" jika digabung menjadi kata...',
          pilihan: ['Bola', 'Buku', 'Baju', 'Mata'],
          kunci: 0,
          pembahasan: 'Gabungan suku kata "bo" dan "la" membentuk kata "bola".',
        },
        {
          pertanyaan: 'Suku kata terbentuk dari gabungan huruf...',
          pilihan: ['Konsonan dan vokal', 'Angka dan simbol', 'Hanya angka', 'Hanya simbol'],
          kunci: 0,
          pembahasan: 'Suku kata dibentuk dari huruf konsonan yang digabung dengan huruf vokal.',
        },
        {
          pertanyaan: 'Kata yang tersusun dari suku kata "ma" dan "ta" adalah...',
          pilihan: ['Mata', 'Meja', 'Baju', 'Kaki'],
          kunci: 0,
          pembahasan: 'Gabungan suku kata "ma" dan "ta" membentuk kata "mata".',
        },
      ],
    },
    {
      judul: 'Menyusun kata menjadi kalimat',
      ringkasan: 'Menyusun kata acak menjadi kalimat pendek yang bermakna, misalnya "Ibu memasak nasi".',
      materi: 'Kalimat adalah kumpulan kata yang tersusun sehingga memiliki arti yang jelas. Kalimat sederhana biasanya terdiri dari subjek (pelaku), predikat (kegiatan), dan objek.\nContohnya kata "Ibu", "memasak", dan "nasi" jika disusun dengan urutan yang benar menjadi kalimat "Ibu memasak nasi", yang memiliki makna jelas.\nSiswa berlatih menyusun kata-kata acak menjadi kalimat yang benar dan bermakna, serta belajar mengawali kalimat dengan huruf kapital dan mengakhirinya dengan tanda titik.',
      soal: [
        {
          pertanyaan: 'Susunan kata yang benar dari "nasi - memasak - Ibu" adalah...',
          pilihan: ['Ibu memasak nasi', 'Nasi Ibu memasak', 'Memasak nasi Ibu', 'Nasi memasak Ibu'],
          kunci: 0,
          pembahasan: 'Urutan yang benar dan bermakna adalah "Ibu memasak nasi".',
        },
        {
          pertanyaan: 'Kalimat yang benar diawali dengan huruf...',
          pilihan: ['Kecil', 'Kapital', 'Angka', 'Simbol'],
          kunci: 1,
          pembahasan: 'Kalimat yang benar diawali dengan huruf kapital.',
        },
        {
          pertanyaan: 'Tanda yang digunakan untuk mengakhiri kalimat berita adalah...',
          pilihan: ['Tanda tanya', 'Tanda seru', 'Tanda titik', 'Tanda koma'],
          kunci: 2,
          pembahasan: 'Kalimat berita diakhiri dengan tanda titik (.)',
        },
      ],
    },
    {
      judul: 'Bercerita tentang diri sendiri',
      ringkasan: 'Siswa memperkenalkan nama, umur, alamat, dan hal yang disukai dengan kalimat sederhana.',
      materi: 'Bercerita tentang diri sendiri adalah kegiatan memperkenalkan identitas diri kepada orang lain menggunakan kalimat sederhana.\nHal-hal yang biasa disampaikan antara lain nama lengkap, umur, alamat rumah, nama orang tua, serta hobi atau hal yang disukai.\nLatihan ini membantu siswa berani berbicara di depan orang lain dan melatih kepercayaan diri, misalnya dengan kalimat "Nama saya Budi, saya berumur 7 tahun, saya suka menggambar".',
      soal: [
        {
          pertanyaan: 'Saat memperkenalkan diri, hal yang biasanya disebutkan adalah...',
          pilihan: ['Nama dan umur', 'Warna favorit tetangga', 'Nama presiden', 'Nama negara lain'],
          kunci: 0,
          pembahasan: 'Perkenalan diri biasanya mencakup nama dan umur.',
        },
        {
          pertanyaan: 'Manfaat berlatih bercerita tentang diri sendiri adalah melatih...',
          pilihan: ['Rasa takut', 'Kepercayaan diri', 'Rasa malas', 'Sikap sombong'],
          kunci: 1,
          pembahasan: 'Latihan bercerita membantu melatih kepercayaan diri saat berbicara.',
        },
        {
          pertanyaan: 'Kalimat "Nama saya Budi" digunakan untuk...',
          pilihan: ['Menanyakan sesuatu', 'Memperkenalkan diri', 'Meminta maaf', 'Mengucap salam perpisahan'],
          kunci: 1,
          pembahasan: 'Kalimat tersebut digunakan untuk memperkenalkan nama diri sendiri.',
        },
      ],
    },
    {
      judul: 'Mendengarkan dan memahami dongeng',
      ringkasan: 'Menyimak dongeng lalu menjawab pertanyaan tentang tokoh dan kejadian utamanya.',
      materi: 'Dongeng adalah cerita rekaan yang biasanya berisi pesan moral, tokohnya bisa berupa manusia, hewan, atau makhluk khayalan.\nSaat mendengarkan dongeng, siswa dilatih untuk menyimak dengan saksama, mengenali tokoh-tokoh dalam cerita, serta memahami kejadian penting yang terjadi dari awal hingga akhir.\nSetelah mendengarkan dongeng, siswa biasanya diminta menjawab pertanyaan sederhana, misalnya siapa tokohnya, apa yang terjadi, dan pesan apa yang bisa diambil dari cerita tersebut.',
      soal: [
        {
          pertanyaan: 'Dongeng adalah cerita yang bersifat...',
          pilihan: ['Nyata dan resmi', 'Rekaan atau khayalan', 'Data ilmiah', 'Laporan berita'],
          kunci: 1,
          pembahasan: 'Dongeng adalah cerita rekaan atau khayalan.',
        },
        {
          pertanyaan: 'Tokoh dalam dongeng bisa berupa...',
          pilihan: ['Hanya manusia', 'Manusia, hewan, atau makhluk khayalan', 'Hanya angka', 'Hanya benda mati tanpa sifat'],
          kunci: 1,
          pembahasan: 'Tokoh dongeng bisa berupa manusia, hewan, maupun makhluk khayalan.',
        },
        {
          pertanyaan: 'Setelah mendengarkan dongeng, kita bisa mengambil...',
          pilihan: ['Pesan moral cerita', 'Uang dari cerita', 'Nilai matematika', 'Alamat penulis'],
          kunci: 0,
          pembahasan: 'Dongeng biasanya mengandung pesan moral yang bisa diambil pembacanya.',
        },
      ],
    },
  ],
  'SD-1-matematika': [
    {
      judul: 'Bilangan 1 sampai 10',
      ringkasan: 'Menghitung benda, menyebut, membaca, dan menulis angka 1 sampai 10 serta membandingkan lebih banyak atau lebih sedikit.',
      materi: 'Bilangan 1 sampai 10 adalah bilangan dasar yang perlu dikuasai siswa kelas 1, mulai dari mengenal angka, membaca, menulis, hingga menghitung jumlah benda.\nSiswa berlatih menghitung benda-benda di sekitar, misalnya menghitung jumlah pensil atau buah, kemudian menuliskan angka yang sesuai dengan jumlah benda tersebut.\nSelain itu, siswa juga belajar membandingkan dua kumpulan benda untuk menentukan mana yang lebih banyak, lebih sedikit, atau sama banyak.',
      soal: [
        {
          pertanyaan: 'Angka setelah 6 adalah...',
          pilihan: ['5', '7', '8', '9'],
          kunci: 1,
          pembahasan: 'Urutan bilangan setelah 6 adalah 7.',
        },
        {
          pertanyaan: 'Jika ada 4 apel dan 7 apel, kelompok yang lebih banyak adalah...',
          pilihan: ['4 apel', '7 apel', 'Sama banyak', 'Tidak bisa dibandingkan'],
          kunci: 1,
          pembahasan: '7 lebih besar daripada 4, sehingga 7 apel lebih banyak.',
        },
        {
          pertanyaan: 'Angka yang menunjukkan jumlah 5 jari tangan adalah...',
          pilihan: ['4', '5', '6', '10'],
          kunci: 1,
          pembahasan: 'Satu tangan memiliki 5 jari.',
        },
      ],
    },
    {
      judul: 'Bilangan 11 sampai 20',
      ringkasan: 'Mengenal bilangan belasan sebagai sepuluh ditambah satuan, misalnya 13 = 10 + 3.',
      materi: 'Bilangan 11 sampai 20 disebut juga bilangan belasan, yang bisa dipahami sebagai gabungan sepuluh ditambah satuan.\nMisalnya bilangan 13 dapat dipahami sebagai 10 + 3, dan bilangan 17 dapat dipahami sebagai 10 + 7.\nSiswa berlatih menghitung benda hingga 20, menuliskan angkanya, serta memahami nilai tempat sederhana yaitu puluhan dan satuan.',
      soal: [
        {
          pertanyaan: 'Bilangan 13 sama dengan...',
          pilihan: ['10 + 3', '10 + 4', '20 - 3', '10 + 5'],
          kunci: 0,
          pembahasan: '13 dapat diuraikan menjadi 10 + 3.',
        },
        {
          pertanyaan: 'Angka setelah 19 adalah...',
          pilihan: ['18', '20', '21', '10'],
          kunci: 1,
          pembahasan: 'Urutan bilangan setelah 19 adalah 20.',
        },
        {
          pertanyaan: 'Bilangan 17 terdiri dari...',
          pilihan: ['1 puluhan dan 7 satuan', '7 puluhan dan 1 satuan', '2 puluhan', '17 satuan saja tanpa puluhan'],
          kunci: 0,
          pembahasan: '17 terdiri dari 1 puluhan (10) dan 7 satuan (7).',
        },
      ],
    },
    {
      judul: 'Penjumlahan bilangan sampai 20',
      ringkasan: 'Menjumlahkan dengan benda konkret, garis bilangan, atau jari, misalnya 8 + 5 = 13.',
      materi: 'Penjumlahan adalah operasi menggabungkan dua bilangan atau lebih menjadi satu jumlah total.\nSiswa kelas 1 belajar menjumlahkan bilangan hingga 20 dengan bantuan benda konkret seperti kelereng atau lidi, garis bilangan, maupun jari tangan.\nContohnya, 8 + 5 dapat dihitung dengan menggabungkan 8 benda dan 5 benda, kemudian menghitung seluruhnya sehingga hasilnya adalah 13.',
      soal: [
        {
          pertanyaan: 'Hasil dari 6 + 7 adalah...',
          pilihan: ['12', '13', '14', '11'],
          kunci: 1,
          pembahasan: '6 + 7 = 13.',
        },
        {
          pertanyaan: 'Hasil dari 9 + 4 adalah...',
          pilihan: ['12', '13', '14', '11'],
          kunci: 1,
          pembahasan: '9 + 4 = 13.',
        },
        {
          pertanyaan: 'Penjumlahan adalah operasi untuk...',
          pilihan: ['Mengurangi bilangan', 'Menggabungkan bilangan', 'Membagi bilangan', 'Mengalikan bilangan'],
          kunci: 1,
          pembahasan: 'Penjumlahan berarti menggabungkan dua bilangan atau lebih.',
        },
      ],
    },
    {
      judul: 'Pengurangan bilangan sampai 20',
      ringkasan: 'Mengurangi dengan mengambil atau mencoret benda, misalnya 15 - 6 = 9.',
      materi: 'Pengurangan adalah operasi mengambil sebagian dari suatu jumlah bilangan sehingga tersisa jumlah yang lebih sedikit.\nSiswa berlatih mengurangi dengan cara mengambil atau mencoret sejumlah benda, misalnya dari 15 benda diambil 6 benda, sehingga tersisa 9 benda.\nLatihan pengurangan juga dilakukan menggunakan garis bilangan, yaitu bergerak mundur sesuai jumlah yang dikurangkan.',
      soal: [
        {
          pertanyaan: 'Hasil dari 15 - 6 adalah...',
          pilihan: ['8', '9', '10', '7'],
          kunci: 1,
          pembahasan: '15 - 6 = 9.',
        },
        {
          pertanyaan: 'Hasil dari 18 - 9 adalah...',
          pilihan: ['9', '10', '8', '7'],
          kunci: 0,
          pembahasan: '18 - 9 = 9.',
        },
        {
          pertanyaan: 'Pengurangan berarti...',
          pilihan: ['Menggabungkan bilangan', 'Mengambil sebagian jumlah', 'Mengalikan bilangan', 'Membagi bilangan'],
          kunci: 1,
          pembahasan: 'Pengurangan berarti mengambil sebagian dari suatu jumlah.',
        },
      ],
    },
    {
      judul: 'Mengenal bangun datar',
      ringkasan: 'Mengenal persegi, persegi panjang, segitiga, dan lingkaran dari benda di sekitar.',
      materi: 'Bangun datar adalah bentuk-bentuk dasar yang memiliki dua dimensi, yaitu panjang dan lebar, tanpa memiliki ketebalan.\nBeberapa bangun datar yang dikenalkan di kelas 1 antara lain persegi (memiliki 4 sisi sama panjang), persegi panjang (memiliki 4 sisi dengan 2 pasang sama panjang), segitiga (memiliki 3 sisi), dan lingkaran (berbentuk bulat).\nSiswa diajak mencari contoh bangun datar pada benda di sekitar, misalnya buku berbentuk persegi panjang, jam dinding berbentuk lingkaran, dan penggaris segitiga berbentuk segitiga.',
      soal: [
        {
          pertanyaan: 'Bangun datar yang memiliki 3 sisi adalah...',
          pilihan: ['Persegi', 'Lingkaran', 'Segitiga', 'Persegi panjang'],
          kunci: 2,
          pembahasan: 'Segitiga adalah bangun datar dengan 3 sisi.',
        },
        {
          pertanyaan: 'Bangun datar yang berbentuk bulat adalah...',
          pilihan: ['Lingkaran', 'Persegi', 'Segitiga', 'Persegi panjang'],
          kunci: 0,
          pembahasan: 'Lingkaran adalah bangun datar yang berbentuk bulat.',
        },
        {
          pertanyaan: 'Contoh benda berbentuk persegi panjang adalah...',
          pilihan: ['Jam dinding', 'Buku tulis', 'Bola', 'Uang koin'],
          kunci: 1,
          pembahasan: 'Buku tulis umumnya berbentuk persegi panjang.',
        },
      ],
    },
    {
      judul: 'Mengukur panjang benda',
      ringkasan: 'Mengukur dengan satuan tidak baku seperti jengkal, langkah, dan pensil, lalu membandingkan lebih panjang atau lebih pendek.',
      materi: 'Mengukur panjang adalah kegiatan menentukan seberapa panjang suatu benda. Pada tahap awal, siswa mengukur menggunakan satuan tidak baku seperti jengkal tangan, langkah kaki, atau pensil.\nContohnya, panjang meja dapat diukur dengan menghitung berapa kali jengkal tangan yang dibutuhkan untuk mengukur dari ujung ke ujung meja.\nSetelah mengukur, siswa belajar membandingkan panjang dua benda, misalnya menentukan mana yang lebih panjang atau lebih pendek antara pensil dan penghapus.',
      soal: [
        {
          pertanyaan: 'Satuan tidak baku untuk mengukur panjang adalah...',
          pilihan: ['Jengkal tangan', 'Kilogram', 'Liter', 'Derajat celcius'],
          kunci: 0,
          pembahasan: 'Jengkal tangan adalah salah satu satuan tidak baku untuk mengukur panjang.',
        },
        {
          pertanyaan: 'Jika meja diukur dengan 8 jengkal dan pintu dengan 12 jengkal, yang lebih panjang adalah...',
          pilihan: ['Meja', 'Pintu', 'Sama panjang', 'Tidak bisa dibandingkan'],
          kunci: 1,
          pembahasan: '12 jengkal lebih banyak daripada 8 jengkal, sehingga pintu lebih panjang.',
        },
        {
          pertanyaan: 'Kegiatan mengukur panjang bertujuan untuk mengetahui...',
          pilihan: ['Berat benda', 'Seberapa panjang benda', 'Warna benda', 'Rasa benda'],
          kunci: 1,
          pembahasan: 'Mengukur panjang bertujuan mengetahui seberapa panjang suatu benda.',
        },
      ],
    },
  ],
  'SD-1-pjok': [
    {
      judul: 'Gerak dasar lokomotor (jalan, lari, lompat)',
      ringkasan: 'Gerakan berpindah tempat: berjalan, berlari, melompat, dan berjingkat, dilakukan lewat permainan.',
      materi: 'Gerak lokomotor adalah gerakan tubuh yang menyebabkan perpindahan tempat dari satu titik ke titik lain, seperti berjalan, berlari, melompat, dan berjingkat.\nSetiap gerakan memiliki ciri khas, misalnya berjalan dilakukan dengan langkah teratur, berlari dilakukan lebih cepat dari berjalan, dan melompat dilakukan dengan mengangkat kedua kaki dari tanah.\nGerak lokomotor biasanya dilatih melalui permainan sederhana, seperti lomba lari pendek atau permainan lompat tali, agar anak bergerak aktif sambil bersenang-senang.',
      soal: [
        {
          pertanyaan: 'Gerakan yang menyebabkan perpindahan tempat disebut gerak...',
          pilihan: ['Lokomotor', 'Non-lokomotor', 'Manipulatif', 'Statis'],
          kunci: 0,
          pembahasan: 'Gerak lokomotor adalah gerakan yang menyebabkan perpindahan tempat.',
        },
        {
          pertanyaan: 'Contoh gerak lokomotor adalah...',
          pilihan: ['Menekuk lutut di tempat', 'Berlari', 'Memutar badan', 'Meregangkan tangan'],
          kunci: 1,
          pembahasan: 'Berlari adalah contoh gerak lokomotor karena menyebabkan perpindahan tempat.',
        },
        {
          pertanyaan: 'Gerakan mengangkat kedua kaki dari tanah untuk berpindah disebut...',
          pilihan: ['Berjalan', 'Melompat', 'Duduk', 'Berdiri'],
          kunci: 1,
          pembahasan: 'Melompat dilakukan dengan mengangkat kedua kaki dari tanah.',
        },
      ],
    },
    {
      judul: 'Gerak dasar non-lokomotor (menekuk, memutar)',
      ringkasan: 'Gerakan di tempat: menekuk, meregang, memutar badan, dan menggoyang lengan.',
      materi: 'Gerak non-lokomotor adalah gerakan tubuh yang dilakukan di tempat, tanpa berpindah posisi, seperti menekuk, meregangkan tubuh, memutar badan, dan menggoyangkan lengan.\nGerakan ini biasanya digunakan untuk melatih kelenturan dan kekuatan otot tubuh, serta sering dilakukan saat pemanasan sebelum berolahraga.\nContoh latihan gerak non-lokomotor adalah menekuk lutut sambil berdiri, memutar pinggang perlahan, dan mengayunkan lengan ke berbagai arah.',
      soal: [
        {
          pertanyaan: 'Gerak non-lokomotor dilakukan tanpa...',
          pilihan: ['Berpindah tempat', 'Bergerak sama sekali', 'Bernafas', 'Melihat'],
          kunci: 0,
          pembahasan: 'Gerak non-lokomotor dilakukan di tempat, tanpa berpindah posisi.',
        },
        {
          pertanyaan: 'Contoh gerak non-lokomotor adalah...',
          pilihan: ['Berlari', 'Melompat', 'Memutar badan', 'Berjalan'],
          kunci: 2,
          pembahasan: 'Memutar badan dilakukan di tempat, sehingga termasuk gerak non-lokomotor.',
        },
        {
          pertanyaan: 'Gerak non-lokomotor biasa dilakukan saat...',
          pilihan: ['Tidur', 'Pemanasan sebelum olahraga', 'Makan', 'Belajar membaca'],
          kunci: 1,
          pembahasan: 'Gerak non-lokomotor sering dilakukan saat pemanasan sebelum berolahraga.',
        },
      ],
    },
    {
      judul: 'Permainan bola sederhana',
      ringkasan: 'Melempar, menangkap, dan menggelindingkan bola dengan teman secara bergantian.',
      materi: 'Permainan bola sederhana melatih gerak dasar manipulatif, yaitu gerakan yang melibatkan benda seperti bola, misalnya melempar, menangkap, dan menggelindingkan.\nSiswa berlatih melempar bola kepada teman dengan arah yang tepat, menangkap bola yang dilemparkan teman, serta menggelindingkan bola di lantai secara bergantian.\nPermainan ini dilakukan secara berkelompok agar siswa belajar bekerja sama, sabar menunggu giliran, dan melatih koordinasi mata dan tangan.',
      soal: [
        {
          pertanyaan: 'Gerakan melempar dan menangkap bola termasuk gerak...',
          pilihan: ['Lokomotor', 'Non-lokomotor', 'Manipulatif', 'Statis'],
          kunci: 2,
          pembahasan: 'Gerakan yang melibatkan benda seperti bola disebut gerak manipulatif.',
        },
        {
          pertanyaan: 'Saat bermain bola bersama teman, sikap yang baik adalah...',
          pilihan: ['Merebut bola dari teman', 'Menunggu giliran dengan sabar', 'Bermain sendiri', 'Tidak mau berbagi bola'],
          kunci: 1,
          pembahasan: 'Menunggu giliran dengan sabar adalah sikap baik dalam bermain bersama.',
        },
        {
          pertanyaan: 'Permainan bola melatih koordinasi antara...',
          pilihan: ['Mata dan tangan', 'Hidung dan telinga', 'Mulut dan gigi', 'Rambut dan kulit'],
          kunci: 0,
          pembahasan: 'Permainan bola melatih koordinasi mata dan tangan.',
        },
      ],
    },
    {
      judul: 'Pola hidup sehat dan kebersihan diri',
      ringkasan: 'Mencuci tangan, menyikat gigi, mandi teratur, dan makan makanan bergizi.',
      materi: 'Pola hidup sehat adalah kebiasaan baik yang dilakukan untuk menjaga kesehatan tubuh, seperti mencuci tangan sebelum makan, menyikat gigi dua kali sehari, mandi secara teratur, dan makan makanan bergizi.\nMencuci tangan penting dilakukan untuk menghilangkan kuman yang menempel di tangan, terutama sebelum makan dan setelah dari kamar mandi.\nSelain menjaga kebersihan diri, olahraga teratur dan istirahat yang cukup juga termasuk bagian dari pola hidup sehat yang perlu dibiasakan sejak kecil.',
      soal: [
        {
          pertanyaan: 'Waktu yang tepat untuk mencuci tangan adalah...',
          pilihan: ['Sebelum makan', 'Saat tidur', 'Saat menonton TV', 'Saat bermain gawai'],
          kunci: 0,
          pembahasan: 'Mencuci tangan sebelum makan penting untuk menghilangkan kuman.',
        },
        {
          pertanyaan: 'Menyikat gigi sebaiknya dilakukan...',
          pilihan: ['Sekali seminggu', 'Dua kali sehari', 'Setiap hari Minggu', 'Tidak perlu rutin'],
          kunci: 1,
          pembahasan: 'Menyikat gigi dianjurkan dilakukan dua kali sehari.',
        },
        {
          pertanyaan: 'Contoh pola hidup sehat adalah...',
          pilihan: ['Makan makanan bergizi', 'Begadang setiap malam', 'Jarang mandi', 'Malas berolahraga'],
          kunci: 0,
          pembahasan: 'Makan makanan bergizi adalah bagian dari pola hidup sehat.',
        },
      ],
    },
  ],
  'SD-1-seni': [
    {
      judul: 'Mengenal warna dan bentuk dasar',
      ringkasan: 'Mengenal warna merah, kuning, biru, dan bentuk dasar, lalu mencari contohnya di sekitar.',
      materi: 'Warna dasar terdiri dari merah, kuning, dan biru, yang bisa dicampur untuk menghasilkan warna-warna baru, misalnya merah dicampur kuning menghasilkan warna oranye.\nSelain warna, siswa juga mengenal bentuk dasar seperti persegi, segitiga, dan lingkaran yang sering muncul dalam karya seni maupun benda sehari-hari.\nSiswa diajak mengamati lingkungan sekitar untuk menemukan warna dan bentuk yang mereka kenal, misalnya warna merah pada apel atau bentuk lingkaran pada roda sepeda.',
      soal: [
        {
          pertanyaan: 'Warna dasar terdiri dari merah, kuning, dan...',
          pilihan: ['Hijau', 'Biru', 'Ungu', 'Coklat'],
          kunci: 1,
          pembahasan: 'Warna dasar terdiri dari merah, kuning, dan biru.',
        },
        {
          pertanyaan: 'Campuran warna merah dan kuning menghasilkan warna...',
          pilihan: ['Hijau', 'Ungu', 'Oranye', 'Hitam'],
          kunci: 2,
          pembahasan: 'Merah dicampur kuning menghasilkan warna oranye.',
        },
        {
          pertanyaan: 'Bentuk roda sepeda menyerupai bentuk...',
          pilihan: ['Persegi', 'Segitiga', 'Lingkaran', 'Persegi panjang'],
          kunci: 2,
          pembahasan: 'Roda sepeda berbentuk bulat, menyerupai bentuk lingkaran.',
        },
      ],
    },
    {
      judul: 'Menggambar bebas dengan krayon',
      ringkasan: 'Menuangkan ide lewat gambar bebas dengan krayon, misalnya rumah, pohon, atau hewan kesukaan.',
      materi: 'Menggambar bebas adalah kegiatan berkarya seni tanpa tema yang ditentukan, sehingga siswa bebas menuangkan ide dan imajinasinya di atas kertas.\nKrayon dipilih sebagai alat menggambar karena mudah digunakan dan menghasilkan warna yang cerah, cocok untuk anak-anak kelas 1.\nSiswa dapat menggambar apa saja yang mereka sukai, misalnya rumah, pohon, hewan peliharaan, atau anggota keluarga, sambil belajar mengenal dan mencampur warna.',
      soal: [
        {
          pertanyaan: 'Alat yang biasa digunakan untuk menggambar bebas di kelas 1 adalah...',
          pilihan: ['Krayon', 'Gunting', 'Penggaris', 'Kalkulator'],
          kunci: 0,
          pembahasan: 'Krayon adalah alat yang mudah digunakan dan cocok untuk anak menggambar.',
        },
        {
          pertanyaan: 'Menggambar bebas berarti menggambar...',
          pilihan: ['Sesuai contoh guru saja', 'Sesuai ide dan imajinasi sendiri', 'Tanpa boleh memakai warna', 'Hanya boleh menggambar angka'],
          kunci: 1,
          pembahasan: 'Menggambar bebas berarti menuangkan ide dan imajinasi sendiri.',
        },
        {
          pertanyaan: 'Contoh objek yang bisa digambar bebas adalah...',
          pilihan: ['Rumah dan pohon', 'Rumus matematika', 'Peta dunia lengkap', 'Tabel angka'],
          kunci: 0,
          pembahasan: 'Rumah dan pohon adalah contoh objek sederhana yang bisa digambar bebas.',
        },
      ],
    },
    {
      judul: 'Menyanyikan lagu anak sederhana',
      ringkasan: 'Menyanyikan lagu anak dengan nada dan lirik yang jelas secara bersama-sama.',
      materi: 'Menyanyi adalah kegiatan mengeluarkan suara dengan nada dan irama tertentu untuk membawakan sebuah lagu.\nSiswa kelas 1 berlatih menyanyikan lagu anak sederhana dengan lirik pendek dan nada yang mudah diikuti, seperti lagu tentang binatang atau lagu tentang keluarga.\nMenyanyi bersama-sama juga melatih kekompakan, keberanian tampil di depan teman, serta membantu siswa mengingat kosakata baru melalui lirik lagu.',
      soal: [
        {
          pertanyaan: 'Menyanyi adalah kegiatan mengeluarkan suara dengan...',
          pilihan: ['Nada dan irama', 'Gerakan tangan saja', 'Diam tanpa suara', 'Hanya bertepuk tangan'],
          kunci: 0,
          pembahasan: 'Menyanyi dilakukan dengan mengeluarkan suara sesuai nada dan irama.',
        },
        {
          pertanyaan: 'Manfaat menyanyi bersama-sama adalah melatih...',
          pilihan: ['Kekompakan', 'Sikap egois', 'Rasa malas', 'Sikap sombong'],
          kunci: 0,
          pembahasan: 'Menyanyi bersama melatih kekompakan antar siswa.',
        },
        {
          pertanyaan: 'Lagu anak sederhana biasanya memiliki lirik yang...',
          pilihan: ['Sangat panjang dan rumit', 'Pendek dan mudah diikuti', 'Berbahasa asing sulit', 'Tanpa nada'],
          kunci: 1,
          pembahasan: 'Lagu anak biasanya memiliki lirik pendek dan mudah diikuti.',
        },
      ],
    },
    {
      judul: 'Mengenal alat musik ritmis',
      ringkasan: 'Mengenal dan memainkan alat musik ritmis seperti tamborin, marakas, dan kentongan mengikuti irama.',
      materi: 'Alat musik ritmis adalah alat musik yang tidak memiliki nada, tetapi digunakan untuk mengiringi irama lagu, seperti tamborin, marakas, dan kentongan.\nSiswa berlatih memainkan alat musik ritmis dengan cara dipukul atau digoyangkan mengikuti irama lagu yang dinyanyikan.\nBermain alat musik ritmis membantu siswa mengenal irama, melatih koordinasi gerak tangan, dan menambah kemeriahan saat bernyanyi bersama.',
      soal: [
        {
          pertanyaan: 'Alat musik ritmis adalah alat musik yang tidak memiliki...',
          pilihan: ['Bentuk', 'Nada', 'Warna', 'Berat'],
          kunci: 1,
          pembahasan: 'Alat musik ritmis tidak memiliki nada, hanya digunakan untuk mengiringi irama.',
        },
        {
          pertanyaan: 'Contoh alat musik ritmis adalah...',
          pilihan: ['Piano', 'Gitar', 'Marakas', 'Biola'],
          kunci: 2,
          pembahasan: 'Marakas adalah salah satu contoh alat musik ritmis.',
        },
        {
          pertanyaan: 'Marakas dimainkan dengan cara...',
          pilihan: ['Ditiup', 'Digoyangkan', 'Dipetik', 'Digesek'],
          kunci: 1,
          pembahasan: 'Marakas dimainkan dengan cara digoyangkan mengikuti irama.',
        },
      ],
    },
  ],
  'SD-1-mulok': [
    {
      judul: 'Pengenalan bahasa daerah sehari-hari',
      ringkasan: 'Mengenal sapaan dan kata yang sering dipakai dalam bahasa daerah setempat.',
      materi: 'Bahasa daerah adalah bahasa yang digunakan oleh masyarakat di suatu wilayah tertentu, yang berbeda dengan Bahasa Indonesia sebagai bahasa resmi negara.\nSiswa mengenal kata-kata sapaan sederhana dalam bahasa daerah setempat, misalnya kata untuk menyapa, mengucap terima kasih, atau menyebut anggota keluarga.\nMempelajari bahasa daerah penting untuk melestarikan budaya setempat dan menghargai kekayaan bahasa di Indonesia yang beragam.',
      soal: [
        {
          pertanyaan: 'Bahasa daerah digunakan oleh masyarakat di suatu...',
          pilihan: ['Wilayah tertentu', 'Seluruh dunia', 'Negara lain', 'Planet lain'],
          kunci: 0,
          pembahasan: 'Bahasa daerah digunakan oleh masyarakat di wilayah tertentu.',
        },
        {
          pertanyaan: 'Mempelajari bahasa daerah bermanfaat untuk...',
          pilihan: ['Melestarikan budaya setempat', 'Melupakan Bahasa Indonesia', 'Menghapus budaya lain', 'Mengabaikan tradisi'],
          kunci: 0,
          pembahasan: 'Mempelajari bahasa daerah membantu melestarikan budaya setempat.',
        },
        {
          pertanyaan: 'Contoh kata yang dipelajari dalam bahasa daerah adalah...',
          pilihan: ['Kata sapaan', 'Rumus matematika', 'Nama planet', 'Simbol kimia'],
          kunci: 0,
          pembahasan: 'Siswa belajar kata sapaan sederhana dalam bahasa daerah.',
        },
      ],
    },
    {
      judul: 'Mengenal budaya dan tradisi setempat',
      ringkasan: 'Mengenal pakaian adat, makanan khas, dan kebiasaan di lingkungan tempat tinggal.',
      materi: 'Setiap daerah di Indonesia memiliki budaya dan tradisi khas yang berbeda-beda, seperti pakaian adat, makanan khas, rumah adat, dan kebiasaan masyarakat setempat.\nSiswa diajak mengenal budaya di lingkungan tempat tinggalnya, misalnya nama pakaian adat daerah setempat, makanan khas yang sering dimakan, atau kebiasaan unik yang ada di daerahnya.\nDengan mengenal budaya sendiri, siswa diharapkan tumbuh rasa bangga dan cinta terhadap daerah tempat tinggalnya.',
      soal: [
        {
          pertanyaan: 'Contoh budaya khas suatu daerah adalah...',
          pilihan: ['Pakaian adat', 'Rumus matematika', 'Bahasa Inggris', 'Peta dunia'],
          kunci: 0,
          pembahasan: 'Pakaian adat adalah salah satu contoh budaya khas daerah.',
        },
        {
          pertanyaan: 'Mengenal budaya daerah sendiri menumbuhkan rasa...',
          pilihan: ['Malu', 'Bangga dan cinta daerah', 'Takut', 'Malas'],
          kunci: 1,
          pembahasan: 'Mengenal budaya sendiri menumbuhkan rasa bangga dan cinta daerah.',
        },
        {
          pertanyaan: 'Selain pakaian adat, contoh budaya daerah lainnya adalah...',
          pilihan: ['Makanan khas', 'Rumus fisika', 'Kode pemrograman', 'Angka Romawi'],
          kunci: 0,
          pembahasan: 'Makanan khas juga merupakan bagian dari budaya suatu daerah.',
        },
      ],
    },
    {
      judul: 'Permainan tradisional daerah',
      ringkasan: 'Memainkan permainan tradisional bersama teman, misalnya congklak, engklek, atau gasing, sesuai daerah masing-masing.',
      materi: 'Permainan tradisional adalah permainan yang sudah dimainkan sejak dahulu oleh masyarakat di suatu daerah, dan masih diwariskan hingga sekarang.\nBeberapa contoh permainan tradisional di Indonesia adalah congklak, engklek, dan gasing, yang masing-masing memiliki cara bermain dan aturan tersendiri.\nBermain permainan tradisional bersama teman melatih kerja sama, kesabaran menunggu giliran, serta membantu melestarikan budaya bangsa agar tidak hilang.',
      soal: [
        {
          pertanyaan: 'Contoh permainan tradisional Indonesia adalah...',
          pilihan: ['Congklak', 'Video game', 'Catur online', 'Aplikasi ponsel'],
          kunci: 0,
          pembahasan: 'Congklak adalah salah satu permainan tradisional Indonesia.',
        },
        {
          pertanyaan: 'Bermain permainan tradisional bersama teman melatih...',
          pilihan: ['Kerja sama dan kesabaran', 'Sikap egois', 'Rasa malas', 'Sikap sombong'],
          kunci: 0,
          pembahasan: 'Permainan tradisional melatih kerja sama dan kesabaran menunggu giliran.',
        },
        {
          pertanyaan: 'Permainan tradisional penting dilestarikan karena merupakan bagian dari...',
          pilihan: ['Budaya bangsa', 'Teknologi modern', 'Pelajaran matematika', 'Ilmu kimia'],
          kunci: 0,
          pembahasan: 'Permainan tradisional adalah bagian dari budaya bangsa yang perlu dilestarikan.',
        },
      ],
    },
  ],
}
