// =====================================================================
// MATERI — SD KELAS 4
// =====================================================================
// Format tiap item materi:
//   judul      : judul topik (wajib)
//   ringkasan  : teks singkat 1-2 kalimat (opsional, tampil di kartu ringkas)
//   materi     : penjelasan lengkap topik (opsional, tampil saat dibuka)
//   soal       : array 3 soal pilihan ganda (opsional)
//                { pertanyaan, pilihan: [4 opsi], kunci: indeks jawaban benar,
//                  pembahasan: penjelasan singkat kunci jawaban }
//   link       : tautan eksternal (opsional, kalau diisi materi tampil sebagai link)
export const MATERI_SD4 = {
  'SD-4-agama': [
    {
      judul: 'Iman kepada malaikat dan tugasnya',
      ringkasan: 'Mengenal nama-nama malaikat beserta tugas masing-masing, misalnya Jibril penyampai wahyu dan Mikail pembagi rezeki.',
      materi: 'Malaikat adalah makhluk gaib ciptaan Allah yang selalu taat menjalankan perintah-Nya tanpa pernah membangkang.\nSetiap malaikat memiliki tugas khusus, misalnya Malaikat Jibril bertugas menyampaikan wahyu kepada para nabi, Malaikat Mikail bertugas membagikan rezeki, dan Malaikat Izrail bertugas mencabut nyawa.\nMengimani malaikat berarti meyakini keberadaan mereka meskipun tidak dapat dilihat, serta meneladani sifat taat dan disiplin mereka dalam menjalankan tugas.',
      soal: [
        {
          pertanyaan: 'Malaikat yang bertugas menyampaikan wahyu kepada nabi adalah...',
          pilihan: ['Jibril', 'Mikail', 'Izrail', 'Israfil'],
          kunci: 0,
          pembahasan: 'Malaikat Jibril bertugas menyampaikan wahyu kepada para nabi.',
        },
        {
          pertanyaan: 'Malaikat yang bertugas membagikan rezeki adalah...',
          pilihan: ['Mikail', 'Jibril', 'Israfil', 'Munkar'],
          kunci: 0,
          pembahasan: 'Malaikat Mikail bertugas membagikan rezeki kepada makhluk.',
        },
        {
          pertanyaan: 'Sifat malaikat dalam menjalankan tugas adalah...',
          pilihan: ['Taat dan disiplin', 'Malas dan membangkang', 'Sombong', 'Pemarah'],
          kunci: 0,
          pembahasan: 'Malaikat selalu taat dan disiplin menjalankan perintah Allah.',
        },
      ],
    },
    {
      judul: 'Kisah keteladanan Nabi Muhammad SAW',
      ringkasan: 'Belajar sifat mulia Nabi Muhammad SAW seperti sidik (jujur) dan amanah (dapat dipercaya).',
      materi: 'Nabi Muhammad SAW adalah nabi dan rasul terakhir yang diutus Allah dengan membawa ajaran Islam sebagai rahmat bagi seluruh alam.\nBeliau memiliki empat sifat wajib yang patut diteladani, yaitu sidik (jujur), amanah (dapat dipercaya), tablig (menyampaikan), dan fatanah (cerdas).\nSejak kecil Nabi Muhammad SAW dikenal jujur dalam berdagang dan dipercaya oleh masyarakat Mekah, sehingga beliau mendapat julukan Al-Amin yang berarti orang yang dapat dipercaya.',
      soal: [
        {
          pertanyaan: 'Sifat jujur pada Nabi Muhammad SAW disebut...',
          pilihan: ['Sidik', 'Amanah', 'Tablig', 'Fatanah'],
          kunci: 0,
          pembahasan: 'Sidik artinya jujur, salah satu sifat wajib Nabi Muhammad SAW.',
        },
        {
          pertanyaan: 'Julukan Al-Amin diberikan kepada Nabi Muhammad SAW karena beliau...',
          pilihan: ['Dapat dipercaya', 'Suka berbohong', 'Malas bekerja', 'Suka mengingkari janji'],
          kunci: 0,
          pembahasan: 'Al-Amin berarti orang yang dapat dipercaya, sesuai sifat amanah Nabi Muhammad SAW.',
        },
        {
          pertanyaan: 'Nabi Muhammad SAW membawa ajaran Islam sebagai...',
          pilihan: ['Rahmat bagi seluruh alam', 'Hukuman bagi manusia', 'Beban bagi umat', 'Larangan tanpa tujuan'],
          kunci: 0,
          pembahasan: 'Ajaran Islam yang dibawa Nabi Muhammad SAW menjadi rahmat bagi seluruh alam.',
        },
      ],
    },
    {
      judul: 'Bacaan Al-Quran surat pendek',
      ringkasan: 'Berlatih membaca dan menghafal beberapa surat pendek dalam Al-Quran dengan tajwid dasar.',
      materi: 'Al-Quran adalah kitab suci umat Islam yang berisi beberapa surat pendek yang mudah dihafal, seperti Al-Fatihah, Al-Ikhlas, dan An-Nas.\nTajwid adalah ilmu yang mempelajari cara membaca Al-Quran dengan benar, termasuk panjang pendek bacaan dan tempat keluarnya huruf.\nSiswa berlatih membaca dan menghafal surat-surat pendek dengan memperhatikan tajwid dasar agar bacaannya semakin fasih dan benar.',
      soal: [
        {
          pertanyaan: 'Ilmu yang mempelajari cara membaca Al-Quran dengan benar disebut...',
          pilihan: ['Tajwid', 'Tafsir', 'Hadis', 'Fikih'],
          kunci: 0,
          pembahasan: 'Tajwid adalah ilmu tentang cara membaca Al-Quran dengan benar.',
        },
        {
          pertanyaan: 'Contoh surat pendek dalam Al-Quran adalah...',
          pilihan: ['Al-Ikhlas', 'Al-Baqarah', 'Ali Imran', 'An-Nisa'],
          kunci: 0,
          pembahasan: 'Al-Ikhlas adalah salah satu surat pendek dalam Al-Quran.',
        },
        {
          pertanyaan: 'Tajwid mempelajari tentang...',
          pilihan: ['Panjang pendek bacaan dan tempat keluar huruf', 'Jumlah ayat saja', 'Warna sampul Al-Quran', 'Ukuran kertas Al-Quran'],
          kunci: 0,
          pembahasan: 'Tajwid mengatur panjang pendek bacaan dan tempat keluarnya huruf.',
        },
      ],
    },
    {
      judul: 'Perilaku amanah dan tanggung jawab',
      ringkasan: 'Membiasakan menjaga kepercayaan dan menyelesaikan tugas yang diberikan dengan sungguh-sungguh.',
      materi: 'Amanah berarti dapat dipercaya dalam menjaga sesuatu yang dititipkan, baik berupa barang, tugas, maupun rahasia.\nTanggung jawab berarti kesediaan menyelesaikan tugas atau kewajiban dengan sungguh-sungguh sampai selesai, tanpa menghindar atau menyalahkan orang lain.\nSiswa dibiasakan bersikap amanah dan bertanggung jawab, misalnya mengembalikan barang pinjaman tepat waktu dan mengerjakan tugas sekolah dengan sebaik-baiknya.',
      soal: [
        {
          pertanyaan: 'Amanah berarti dapat dipercaya dalam menjaga...',
          pilihan: ['Titipan', 'Kesenangan sendiri', 'Kemalasan', 'Kebohongan'],
          kunci: 0,
          pembahasan: 'Amanah berarti dapat dipercaya menjaga sesuatu yang dititipkan.',
        },
        {
          pertanyaan: 'Contoh sikap tanggung jawab adalah...',
          pilihan: ['Menyelesaikan tugas sampai selesai', 'Menghindari tugas', 'Menyalahkan teman', 'Meninggalkan pekerjaan'],
          kunci: 0,
          pembahasan: 'Tanggung jawab ditunjukkan dengan menyelesaikan tugas sampai selesai.',
        },
        {
          pertanyaan: 'Contoh perilaku amanah adalah...',
          pilihan: ['Mengembalikan barang pinjaman tepat waktu', 'Menyembunyikan barang pinjaman', 'Merusak barang pinjaman', 'Melupakan barang pinjaman'],
          kunci: 0,
          pembahasan: 'Mengembalikan barang pinjaman tepat waktu adalah contoh sikap amanah.',
        },
      ],
    },
  ],
  'SD-4-pancasila': [
    {
      judul: 'Nilai-nilai Pancasila dalam kehidupan bernegara',
      ringkasan: 'Mengenal penerapan nilai Pancasila dalam kehidupan berbangsa dan bernegara sehari-hari.',
      materi: 'Pancasila adalah dasar negara Indonesia yang nilai-nilainya harus diterapkan dalam kehidupan berbangsa dan bernegara sehari-hari.\nPenerapan nilai Pancasila dapat dilihat misalnya dalam sikap toleransi beragama, gotong royong membangun fasilitas umum, dan mengutamakan musyawarah dalam pengambilan keputusan negara.\nSebagai warga negara, siswa perlu memahami dan mengamalkan nilai-nilai Pancasila agar tercipta kehidupan bernegara yang rukun dan sejahtera.',
      soal: [
        {
          pertanyaan: 'Pancasila adalah...',
          pilihan: ['Dasar negara Indonesia', 'Lagu kebangsaan', 'Bendera negara', 'Lambang partai'],
          kunci: 0,
          pembahasan: 'Pancasila merupakan dasar negara Indonesia.',
        },
        {
          pertanyaan: 'Contoh penerapan nilai Pancasila dalam bernegara adalah...',
          pilihan: ['Gotong royong membangun fasilitas umum', 'Bertengkar antarwarga', 'Mengabaikan musyawarah', 'Memaksakan kehendak'],
          kunci: 0,
          pembahasan: 'Gotong royong membangun fasilitas umum adalah contoh penerapan nilai Pancasila.',
        },
        {
          pertanyaan: 'Pengambilan keputusan negara sebaiknya mengutamakan...',
          pilihan: ['Musyawarah', 'Paksaan', 'Kekerasan', 'Keegoisan'],
          kunci: 0,
          pembahasan: 'Pancasila mengajarkan pengambilan keputusan melalui musyawarah.',
        },
      ],
    },
    {
      judul: 'Hak dan kewajiban sebagai warga negara',
      ringkasan: 'Mengenal hak dasar seperti pendidikan dan kewajiban seperti menaati aturan sebagai warga negara.',
      materi: 'Hak warga negara adalah sesuatu yang boleh diterima atau dilakukan oleh setiap warga negara, seperti hak mendapatkan pendidikan dan hak hidup aman.\nKewajiban warga negara adalah sesuatu yang harus dilakukan, seperti menaati peraturan yang berlaku dan membayar pajak sesuai ketentuan.\nHak dan kewajiban warga negara harus seimbang agar kehidupan bernegara berjalan tertib dan adil bagi semua orang.',
      soal: [
        {
          pertanyaan: 'Contoh hak warga negara adalah...',
          pilihan: ['Mendapatkan pendidikan', 'Menaati peraturan', 'Membayar pajak', 'Menjaga ketertiban'],
          kunci: 0,
          pembahasan: 'Mendapatkan pendidikan adalah contoh hak warga negara.',
        },
        {
          pertanyaan: 'Contoh kewajiban warga negara adalah...',
          pilihan: ['Menaati peraturan yang berlaku', 'Mendapatkan pendidikan', 'Hidup aman', 'Bebas berpendapat'],
          kunci: 0,
          pembahasan: 'Menaati peraturan yang berlaku adalah kewajiban warga negara.',
        },
        {
          pertanyaan: 'Hak dan kewajiban warga negara harus...',
          pilihan: ['Seimbang', 'Diabaikan', 'Dihilangkan salah satunya', 'Dilupakan'],
          kunci: 0,
          pembahasan: 'Hak dan kewajiban harus seimbang agar kehidupan bernegara tertib dan adil.',
        },
      ],
    },
    {
      judul: 'Persatuan dan kesatuan bangsa',
      ringkasan: 'Memahami pentingnya bersatu meski berbeda-beda demi menjaga keutuhan bangsa Indonesia.',
      materi: 'Persatuan dan kesatuan bangsa berarti bersatunya seluruh rakyat Indonesia yang beragam suku, agama, dan budaya menjadi satu bangsa yang utuh.\nMenjaga persatuan penting agar bangsa Indonesia tetap kuat dan tidak mudah terpecah belah oleh perbedaan yang ada.\nContoh sikap menjaga persatuan misalnya tidak membeda-bedakan teman berdasarkan suku atau agama, serta saling membantu tanpa memandang perbedaan.',
      soal: [
        {
          pertanyaan: 'Persatuan dan kesatuan bangsa berarti bersatunya rakyat Indonesia yang...',
          pilihan: ['Beragam suku, agama, dan budaya', 'Sama semua tanpa perbedaan', 'Terpisah-pisah', 'Saling bermusuhan'],
          kunci: 0,
          pembahasan: 'Persatuan berarti bersatunya rakyat meski beragam suku, agama, dan budaya.',
        },
        {
          pertanyaan: 'Menjaga persatuan penting agar bangsa Indonesia...',
          pilihan: ['Tetap kuat dan tidak terpecah belah', 'Mudah terpecah belah', 'Menjadi lemah', 'Saling bermusuhan'],
          kunci: 0,
          pembahasan: 'Persatuan menjaga bangsa Indonesia tetap kuat dan utuh.',
        },
        {
          pertanyaan: 'Contoh sikap menjaga persatuan adalah...',
          pilihan: ['Tidak membeda-bedakan teman', 'Membeda-bedakan berdasarkan suku', 'Memusuhi teman berbeda agama', 'Mengejek budaya lain'],
          kunci: 0,
          pembahasan: 'Tidak membeda-bedakan teman adalah contoh menjaga persatuan.',
        },
      ],
    },
    {
      judul: 'Menghargai keberagaman budaya Indonesia',
      ringkasan: 'Mengenal berbagai budaya daerah di Indonesia dan pentingnya saling menghormati perbedaan tersebut.',
      materi: 'Indonesia memiliki keberagaman budaya yang sangat kaya, terlihat dari banyaknya rumah adat, pakaian adat, tarian, dan bahasa daerah di setiap wilayah.\nKeberagaman budaya ini merupakan kekayaan bangsa yang perlu disyukuri dan dilestarikan, bukan dijadikan alasan untuk saling merendahkan.\nSikap menghargai keberagaman budaya dapat ditunjukkan dengan mempelajari budaya daerah lain dan tidak mengejek budaya yang berbeda dari kebiasaan sendiri.',
      soal: [
        {
          pertanyaan: 'Contoh keberagaman budaya Indonesia adalah...',
          pilihan: ['Rumah adat dan pakaian adat', 'Warna langit', 'Bentuk awan', 'Jumlah bintang'],
          kunci: 0,
          pembahasan: 'Rumah adat dan pakaian adat adalah contoh keberagaman budaya Indonesia.',
        },
        {
          pertanyaan: 'Keberagaman budaya Indonesia sebaiknya disikapi dengan...',
          pilihan: ['Rasa syukur dan pelestarian', 'Rasa malu', 'Sikap merendahkan', 'Pengabaian'],
          kunci: 0,
          pembahasan: 'Keberagaman budaya perlu disyukuri dan dilestarikan.',
        },
        {
          pertanyaan: 'Contoh sikap menghargai keberagaman budaya adalah...',
          pilihan: ['Mempelajari budaya daerah lain', 'Mengejek budaya lain', 'Mengabaikan budaya sendiri', 'Memusuhi budaya berbeda'],
          kunci: 0,
          pembahasan: 'Mempelajari budaya daerah lain adalah contoh sikap menghargai keberagaman.',
        },
      ],
    },
  ],
  'SD-4-indonesia': [
    {
      judul: 'Menemukan gagasan pokok dalam teks',
      ringkasan: 'Berlatih menemukan ide utama dari sebuah paragraf atau teks bacaan.',
      materi: 'Gagasan pokok adalah ide utama yang menjadi inti pembahasan dalam suatu paragraf, biasanya terdapat pada kalimat utama di awal, tengah, atau akhir paragraf.\nKalimat-kalimat lain dalam paragraf disebut kalimat penjelas, yang berfungsi mendukung atau menjelaskan gagasan pokok tersebut.\nSiswa berlatih menemukan gagasan pokok dengan cara membaca seluruh paragraf terlebih dahulu, lalu mengenali kalimat mana yang menjadi inti pembahasan.',
      soal: [
        {
          pertanyaan: 'Gagasan pokok adalah...',
          pilihan: ['Ide utama dalam paragraf', 'Kalimat terakhir saja', 'Judul cerita', 'Nama pengarang'],
          kunci: 0,
          pembahasan: 'Gagasan pokok adalah ide utama yang menjadi inti pembahasan paragraf.',
        },
        {
          pertanyaan: 'Kalimat yang mendukung gagasan pokok disebut kalimat...',
          pilihan: ['Penjelas', 'Utama', 'Tanya', 'Perintah'],
          kunci: 0,
          pembahasan: 'Kalimat penjelas berfungsi mendukung gagasan pokok.',
        },
        {
          pertanyaan: 'Untuk menemukan gagasan pokok, langkah pertama adalah...',
          pilihan: ['Membaca seluruh paragraf', 'Menghafal judul', 'Menghitung jumlah kata', 'Melihat gambar saja'],
          kunci: 0,
          pembahasan: 'Membaca seluruh paragraf membantu menemukan gagasan pokok.',
        },
      ],
    },
    {
      judul: 'Menulis laporan sederhana',
      ringkasan: 'Menulis laporan singkat tentang hasil pengamatan atau kegiatan yang dilakukan.',
      materi: 'Laporan sederhana adalah tulisan yang berisi hasil pengamatan atau kegiatan yang dilakukan, disusun secara ringkas dan jelas.\nLaporan biasanya memuat judul kegiatan, waktu dan tempat pelaksanaan, serta hasil yang diperoleh dari pengamatan tersebut.\nSiswa berlatih menulis laporan sederhana, misalnya laporan pengamatan pertumbuhan tanaman atau laporan kunjungan ke suatu tempat.',
      soal: [
        {
          pertanyaan: 'Laporan sederhana berisi hasil dari...',
          pilihan: ['Pengamatan atau kegiatan', 'Khayalan bebas', 'Karangan fiksi', 'Dongeng'],
          kunci: 0,
          pembahasan: 'Laporan sederhana berisi hasil pengamatan atau kegiatan yang dilakukan.',
        },
        {
          pertanyaan: 'Bagian yang biasanya ada dalam laporan sederhana adalah...',
          pilihan: ['Judul, waktu, dan hasil pengamatan', 'Hanya gambar', 'Hanya angka', 'Hanya nama penulis'],
          kunci: 0,
          pembahasan: 'Laporan memuat judul kegiatan, waktu, tempat, dan hasil pengamatan.',
        },
        {
          pertanyaan: 'Contoh kegiatan yang bisa dilaporkan siswa adalah...',
          pilihan: ['Pengamatan pertumbuhan tanaman', 'Menonton televisi', 'Bermain gawai', 'Tidur siang'],
          kunci: 0,
          pembahasan: 'Pengamatan pertumbuhan tanaman adalah contoh kegiatan yang bisa dilaporkan.',
        },
      ],
    },
    {
      judul: 'Membaca dan memahami puisi',
      ringkasan: 'Membaca puisi dengan lafal dan ekspresi yang tepat serta memahami maknanya.',
      materi: 'Puisi adalah karya sastra yang menggunakan kata-kata indah dan bermakna untuk mengungkapkan perasaan atau menggambarkan sesuatu.\nSaat membaca puisi, siswa perlu memperhatikan lafal yang jelas, intonasi yang sesuai, dan ekspresi wajah yang mendukung makna puisi tersebut.\nMemahami puisi berarti mengetahui makna atau pesan yang ingin disampaikan penyair melalui pilihan kata dan gaya bahasa yang digunakan.',
      soal: [
        {
          pertanyaan: 'Puisi menggunakan kata-kata yang...',
          pilihan: ['Indah dan bermakna', 'Sembarangan', 'Berupa angka', 'Berupa rumus'],
          kunci: 0,
          pembahasan: 'Puisi menggunakan kata-kata indah dan bermakna.',
        },
        {
          pertanyaan: 'Saat membaca puisi, hal yang perlu diperhatikan adalah...',
          pilihan: ['Lafal dan intonasi', 'Kecepatan berlari', 'Warna baju', 'Jumlah halaman'],
          kunci: 0,
          pembahasan: 'Lafal dan intonasi penting diperhatikan saat membaca puisi.',
        },
        {
          pertanyaan: 'Memahami puisi berarti mengetahui...',
          pilihan: ['Makna atau pesan puisi', 'Jumlah baris saja', 'Nama penerbit', 'Harga buku'],
          kunci: 0,
          pembahasan: 'Memahami puisi berarti mengetahui makna atau pesan yang disampaikan.',
        },
      ],
    },
    {
      judul: 'Wawancara sederhana',
      ringkasan: 'Berlatih menyusun pertanyaan dan melakukan wawancara singkat dengan narasumber di sekitar.',
      materi: 'Wawancara adalah kegiatan tanya jawab dengan seseorang untuk memperoleh informasi tentang suatu topik tertentu.\nSebelum wawancara, siswa perlu menyiapkan daftar pertanyaan yang jelas dan berkaitan dengan topik yang ingin diketahui.\nSaat wawancara berlangsung, siswa perlu bersikap sopan, mendengarkan jawaban narasumber dengan baik, dan mencatat informasi penting yang disampaikan.',
      soal: [
        {
          pertanyaan: 'Wawancara adalah kegiatan...',
          pilihan: ['Tanya jawab untuk memperoleh informasi', 'Menulis cerita bebas', 'Menggambar bebas', 'Bernyanyi bersama'],
          kunci: 0,
          pembahasan: 'Wawancara adalah kegiatan tanya jawab untuk memperoleh informasi.',
        },
        {
          pertanyaan: 'Sebelum wawancara, siswa perlu menyiapkan...',
          pilihan: ['Daftar pertanyaan', 'Makanan ringan', 'Baju baru', 'Mainan'],
          kunci: 0,
          pembahasan: 'Daftar pertanyaan perlu disiapkan sebelum wawancara.',
        },
        {
          pertanyaan: 'Saat wawancara berlangsung, siswa sebaiknya bersikap...',
          pilihan: ['Sopan dan mendengarkan dengan baik', 'Memotong pembicaraan', 'Berbicara kasar', 'Mengabaikan jawaban'],
          kunci: 0,
          pembahasan: 'Bersikap sopan dan mendengarkan dengan baik penting saat wawancara.',
        },
      ],
    },
    {
      judul: 'Menyampaikan pendapat secara lisan',
      ringkasan: 'Berlatih berbicara di depan kelas untuk menyampaikan pendapat dengan percaya diri.',
      materi: 'Menyampaikan pendapat secara lisan berarti mengutarakan pikiran atau pandangan tentang suatu hal secara langsung menggunakan bahasa yang jelas dan sopan.\nSebelum berbicara, siswa perlu menyusun pikirannya terlebih dahulu agar pendapat yang disampaikan runtut dan mudah dipahami pendengar.\nBerlatih menyampaikan pendapat di depan kelas membantu siswa melatih keberanian dan kepercayaan diri dalam berbicara di depan umum.',
      soal: [
        {
          pertanyaan: 'Menyampaikan pendapat secara lisan berarti mengutarakan pikiran secara...',
          pilihan: ['Langsung dengan bahasa jelas dan sopan', 'Diam saja', 'Tertulis saja', 'Dengan bahasa kasar'],
          kunci: 0,
          pembahasan: 'Pendapat lisan disampaikan langsung dengan bahasa yang jelas dan sopan.',
        },
        {
          pertanyaan: 'Sebelum berbicara menyampaikan pendapat, sebaiknya siswa...',
          pilihan: ['Menyusun pikiran terlebih dahulu', 'Langsung bicara tanpa persiapan', 'Diam saja', 'Mengabaikan topik'],
          kunci: 0,
          pembahasan: 'Menyusun pikiran terlebih dahulu membuat pendapat lebih runtut.',
        },
        {
          pertanyaan: 'Berlatih menyampaikan pendapat di depan kelas melatih...',
          pilihan: ['Keberanian dan percaya diri', 'Rasa takut', 'Sikap pemalu', 'Sikap pendiam'],
          kunci: 0,
          pembahasan: 'Latihan ini melatih keberanian dan kepercayaan diri siswa.',
        },
      ],
    },
  ],
  'SD-4-matematika': [
    {
      judul: 'Operasi hitung campuran',
      ringkasan: 'Menyelesaikan soal yang menggabungkan penjumlahan, pengurangan, perkalian, dan pembagian sesuai urutan operasi.',
      materi: 'Operasi hitung campuran adalah soal yang menggabungkan lebih dari satu jenis operasi, seperti penjumlahan, pengurangan, perkalian, dan pembagian dalam satu soal.\nDalam mengerjakan operasi hitung campuran, perkalian dan pembagian dikerjakan terlebih dahulu sebelum penjumlahan dan pengurangan, kecuali jika ada tanda kurung yang harus dikerjakan lebih dulu.\nMemahami urutan operasi hitung penting agar siswa dapat menyelesaikan soal campuran dengan hasil yang tepat.',
      soal: [
        {
          pertanyaan: 'Dalam operasi hitung campuran, yang dikerjakan lebih dulu adalah...',
          pilihan: ['Perkalian dan pembagian', 'Penjumlahan dan pengurangan', 'Semua secara acak', 'Pengurangan saja'],
          kunci: 0,
          pembahasan: 'Perkalian dan pembagian dikerjakan lebih dulu daripada penjumlahan dan pengurangan.',
        },
        {
          pertanyaan: 'Jika ada tanda kurung dalam soal, maka yang dikerjakan lebih dulu adalah...',
          pilihan: ['Isi dalam tanda kurung', 'Angka terakhir', 'Angka terbesar', 'Angka terkecil'],
          kunci: 0,
          pembahasan: 'Isi dalam tanda kurung dikerjakan lebih dulu sebelum operasi lainnya.',
        },
        {
          pertanyaan: 'Hasil dari 10 + 2 x 3 adalah...',
          pilihan: ['16', '36', '15', '12'],
          kunci: 0,
          pembahasan: '2 x 3 = 6 dikerjakan dulu, lalu 10 + 6 = 16.',
        },
      ],
    },
    {
      judul: 'Faktor dan kelipatan bilangan',
      ringkasan: 'Mengenal cara mencari faktor dan kelipatan suatu bilangan, termasuk FPB dan KPK sederhana.',
      materi: 'Faktor suatu bilangan adalah bilangan-bilangan yang dapat membagi habis bilangan tersebut, misalnya faktor dari 12 adalah 1, 2, 3, 4, 6, dan 12.\nKelipatan suatu bilangan adalah hasil perkalian bilangan tersebut dengan bilangan asli, misalnya kelipatan 3 adalah 3, 6, 9, 12, dan seterusnya.\nFPB (Faktor Persekutuan Terbesar) dan KPK (Kelipatan Persekutuan Terkecil) digunakan untuk mencari faktor atau kelipatan yang sama dari dua bilangan atau lebih.',
      soal: [
        {
          pertanyaan: 'Faktor dari 12 antara lain...',
          pilihan: ['1, 2, 3, 4, 6, 12', 'Hanya 12', 'Hanya 1 dan 12', '5, 7, 9'],
          kunci: 0,
          pembahasan: 'Faktor dari 12 adalah bilangan yang dapat membagi habis 12, yaitu 1, 2, 3, 4, 6, dan 12.',
        },
        {
          pertanyaan: 'Kelipatan 3 yang pertama adalah...',
          pilihan: ['3', '6', '9', '2'],
          kunci: 0,
          pembahasan: 'Kelipatan 3 yang pertama adalah 3 itu sendiri.',
        },
        {
          pertanyaan: 'FPB adalah singkatan dari...',
          pilihan: ['Faktor Persekutuan Terbesar', 'Kelipatan Persekutuan Terkecil', 'Faktor Persekutuan Terkecil', 'Kelipatan Persekutuan Terbesar'],
          kunci: 0,
          pembahasan: 'FPB adalah singkatan dari Faktor Persekutuan Terbesar.',
        },
      ],
    },
    {
      judul: 'Pecahan dan desimal',
      ringkasan: 'Mengenal hubungan antara pecahan dan bilangan desimal serta cara mengubah keduanya.',
      materi: 'Pecahan dapat diubah menjadi bentuk desimal dengan cara membagi pembilang dengan penyebutnya, misalnya 1/2 sama dengan 0,5.\nBilangan desimal juga dapat diubah kembali menjadi pecahan dengan memperhatikan angka di belakang koma sesuai nilai tempatnya.\nMemahami hubungan pecahan dan desimal membantu siswa dalam menyelesaikan soal berhitung yang melibatkan kedua bentuk bilangan tersebut.',
      soal: [
        {
          pertanyaan: 'Pecahan 1/2 jika diubah menjadi desimal adalah...',
          pilihan: ['0,5', '0,2', '0,1', '1,5'],
          kunci: 0,
          pembahasan: '1/2 = 0,5 karena 1 dibagi 2 sama dengan 0,5.',
        },
        {
          pertanyaan: 'Untuk mengubah pecahan menjadi desimal, caranya adalah...',
          pilihan: ['Membagi pembilang dengan penyebut', 'Mengalikan pembilang dan penyebut', 'Menjumlahkan pembilang dan penyebut', 'Mengurangi pembilang dengan penyebut'],
          kunci: 0,
          pembahasan: 'Pecahan diubah menjadi desimal dengan membagi pembilang dengan penyebutnya.',
        },
        {
          pertanyaan: 'Bentuk desimal dari 3/4 adalah...',
          pilihan: ['0,75', '0,25', '0,5', '3,4'],
          kunci: 0,
          pembahasan: '3 dibagi 4 sama dengan 0,75.',
        },
      ],
    },
    {
      judul: 'Pengukuran sudut',
      ringkasan: 'Mengenal jenis sudut (lancip, siku-siku, tumpul) dan cara mengukurnya dengan busur derajat.',
      materi: 'Sudut adalah daerah yang dibentuk oleh dua garis yang bertemu pada satu titik, dan besarnya diukur dalam satuan derajat menggunakan alat bernama busur derajat.\nJenis-jenis sudut antara lain sudut lancip (kurang dari 90 derajat), sudut siku-siku (tepat 90 derajat), dan sudut tumpul (lebih dari 90 derajat namun kurang dari 180 derajat).\nSiswa berlatih mengukur berbagai sudut menggunakan busur derajat serta mengelompokkannya sesuai jenis sudutnya.',
      soal: [
        {
          pertanyaan: 'Alat untuk mengukur besar sudut adalah...',
          pilihan: ['Busur derajat', 'Penggaris', 'Jangka', 'Timbangan'],
          kunci: 0,
          pembahasan: 'Busur derajat digunakan untuk mengukur besar sudut.',
        },
        {
          pertanyaan: 'Sudut yang besarnya tepat 90 derajat disebut sudut...',
          pilihan: ['Siku-siku', 'Lancip', 'Tumpul', 'Lurus'],
          kunci: 0,
          pembahasan: 'Sudut siku-siku besarnya tepat 90 derajat.',
        },
        {
          pertanyaan: 'Sudut yang besarnya kurang dari 90 derajat disebut sudut...',
          pilihan: ['Lancip', 'Siku-siku', 'Tumpul', 'Penuh'],
          kunci: 0,
          pembahasan: 'Sudut lancip besarnya kurang dari 90 derajat.',
        },
      ],
    },
    {
      judul: 'Keliling dan luas bangun datar gabungan',
      ringkasan: 'Menghitung keliling dan luas bangun datar yang terdiri dari gabungan beberapa bentuk.',
      materi: 'Bangun datar gabungan adalah bangun yang terbentuk dari penggabungan dua atau lebih bangun datar sederhana, seperti persegi dan segitiga.\nUntuk menghitung keliling bangun gabungan, siswa perlu menjumlahkan panjang seluruh sisi terluar bangun tersebut.\nUntuk menghitung luas bangun gabungan, siswa dapat memecah bangun menjadi beberapa bangun sederhana, menghitung luas masing-masing, lalu menjumlahkannya.',
      soal: [
        {
          pertanyaan: 'Bangun datar gabungan terbentuk dari...',
          pilihan: ['Penggabungan dua atau lebih bangun sederhana', 'Satu bangun saja', 'Titik-titik acak', 'Garis lurus saja'],
          kunci: 0,
          pembahasan: 'Bangun datar gabungan terbentuk dari gabungan dua atau lebih bangun sederhana.',
        },
        {
          pertanyaan: 'Untuk menghitung keliling bangun gabungan, kita perlu...',
          pilihan: ['Menjumlahkan panjang seluruh sisi terluar', 'Mengalikan semua sisi', 'Mengurangi sisi terpanjang', 'Membagi jumlah sisi'],
          kunci: 0,
          pembahasan: 'Keliling dihitung dengan menjumlahkan panjang seluruh sisi terluar bangun.',
        },
        {
          pertanyaan: 'Cara menghitung luas bangun gabungan adalah...',
          pilihan: ['Memecah menjadi bangun sederhana lalu menjumlahkan luasnya', 'Mengalikan semua sisi sekaligus', 'Hanya menghitung satu sisi', 'Mengabaikan sebagian bangun'],
          kunci: 0,
          pembahasan: 'Luas bangun gabungan dihitung dengan memecahnya menjadi bangun sederhana lalu menjumlahkan luasnya.',
        },
      ],
    },
  ],
  'SD-4-ipas': [
    {
      judul: 'Sistem gerak pada manusia dan hewan',
      ringkasan: 'Mengenal fungsi rangka dan otot dalam membantu manusia dan hewan bergerak.',
      materi: 'Sistem gerak pada manusia dan hewan terdiri dari rangka (tulang) dan otot yang bekerja sama untuk menghasilkan gerakan tubuh.\nRangka berfungsi sebagai penopang tubuh dan pelindung organ dalam, sedangkan otot berfungsi menggerakkan tulang dengan cara berkontraksi dan berelaksasi.\nSetiap hewan memiliki sistem gerak yang berbeda sesuai dengan cara hidupnya, misalnya burung memiliki sayap untuk terbang dan ikan memiliki sirip untuk berenang.',
      soal: [
        {
          pertanyaan: 'Sistem gerak pada manusia terdiri dari rangka dan...',
          pilihan: ['Otot', 'Darah', 'Kulit', 'Rambut'],
          kunci: 0,
          pembahasan: 'Sistem gerak terdiri dari rangka (tulang) dan otot.',
        },
        {
          pertanyaan: 'Fungsi rangka pada tubuh adalah...',
          pilihan: ['Penopang tubuh dan pelindung organ dalam', 'Menghasilkan suara', 'Mencerna makanan', 'Mengedarkan darah'],
          kunci: 0,
          pembahasan: 'Rangka berfungsi sebagai penopang tubuh dan pelindung organ dalam.',
        },
        {
          pertanyaan: 'Alat gerak yang digunakan ikan untuk berenang adalah...',
          pilihan: ['Sirip', 'Sayap', 'Kaki', 'Paruh'],
          kunci: 0,
          pembahasan: 'Ikan menggunakan sirip untuk bergerak dan berenang di air.',
        },
      ],
    },
    {
      judul: 'Siklus hidup makhluk hidup',
      ringkasan: 'Mengenal tahapan pertumbuhan makhluk hidup, misalnya siklus hidup kupu-kupu atau katak.',
      materi: 'Siklus hidup adalah tahapan pertumbuhan dan perkembangan yang dialami makhluk hidup sejak lahir hingga dewasa.\nKupu-kupu mengalami siklus hidup dengan metamorfosis sempurna, yaitu telur, ulat, kepompong, hingga menjadi kupu-kupu dewasa.\nKatak juga mengalami metamorfosis, dimulai dari telur, berudu (kecebong), katak berekor, hingga menjadi katak dewasa yang hidup di darat dan air.',
      soal: [
        {
          pertanyaan: 'Siklus hidup kupu-kupu dimulai dari...',
          pilihan: ['Telur', 'Ulat', 'Kepompong', 'Kupu-kupu dewasa'],
          kunci: 0,
          pembahasan: 'Siklus hidup kupu-kupu dimulai dari telur.',
        },
        {
          pertanyaan: 'Tahapan setelah telur pada siklus hidup kupu-kupu adalah...',
          pilihan: ['Ulat', 'Kepompong', 'Kupu-kupu dewasa', 'Larva ikan'],
          kunci: 0,
          pembahasan: 'Setelah telur, siklus hidup kupu-kupu berlanjut menjadi ulat.',
        },
        {
          pertanyaan: 'Sebutan untuk anak katak yang baru menetas dari telur adalah...',
          pilihan: ['Berudu', 'Ulat', 'Kepompong', 'Larva'],
          kunci: 0,
          pembahasan: 'Anak katak yang baru menetas disebut berudu atau kecebong.',
        },
      ],
    },
    {
      judul: 'Sumber daya alam dan pemanfaatannya',
      ringkasan: 'Mengenal jenis sumber daya alam serta cara memanfaatkannya secara bijak.',
      materi: 'Sumber daya alam adalah segala sesuatu yang berasal dari alam dan dapat dimanfaatkan untuk memenuhi kebutuhan manusia, seperti air, tanah, hutan, dan mineral.\nSumber daya alam dibedakan menjadi sumber daya alam yang dapat diperbarui, seperti tumbuhan dan air, serta yang tidak dapat diperbarui, seperti minyak bumi dan batu bara.\nPemanfaatan sumber daya alam perlu dilakukan secara bijak agar tidak merusak lingkungan dan tetap tersedia untuk generasi mendatang.',
      soal: [
        {
          pertanyaan: 'Sumber daya alam yang dapat diperbarui misalnya...',
          pilihan: ['Tumbuhan dan air', 'Minyak bumi', 'Batu bara', 'Emas'],
          kunci: 0,
          pembahasan: 'Tumbuhan dan air termasuk sumber daya alam yang dapat diperbarui.',
        },
        {
          pertanyaan: 'Contoh sumber daya alam yang tidak dapat diperbarui adalah...',
          pilihan: ['Minyak bumi', 'Air', 'Tumbuhan', 'Udara'],
          kunci: 0,
          pembahasan: 'Minyak bumi termasuk sumber daya alam yang tidak dapat diperbarui.',
        },
        {
          pertanyaan: 'Pemanfaatan sumber daya alam sebaiknya dilakukan secara...',
          pilihan: ['Bijak', 'Berlebihan', 'Sembarangan', 'Boros'],
          kunci: 0,
          pembahasan: 'Sumber daya alam perlu dimanfaatkan secara bijak agar tetap lestari.',
        },
      ],
    },
    {
      judul: 'Keragaman budaya di Indonesia',
      ringkasan: 'Mengenal rumah adat, pakaian adat, dan tarian dari berbagai daerah di Indonesia.',
      materi: 'Indonesia memiliki keragaman budaya yang tersebar di berbagai daerah, seperti rumah adat, pakaian adat, tarian daerah, dan alat musik tradisional yang berbeda-beda di setiap wilayah.\nSetiap daerah memiliki ciri khas budayanya sendiri, misalnya rumah gadang dari Sumatera Barat dan tari kecak dari Bali.\nMengenal keragaman budaya Indonesia membantu siswa lebih mencintai dan menghargai kekayaan budaya bangsa sendiri.',
      soal: [
        {
          pertanyaan: 'Rumah gadang berasal dari daerah...',
          pilihan: ['Sumatera Barat', 'Bali', 'Papua', 'Jawa Tengah'],
          kunci: 0,
          pembahasan: 'Rumah gadang adalah rumah adat khas Sumatera Barat.',
        },
        {
          pertanyaan: 'Tari kecak berasal dari daerah...',
          pilihan: ['Bali', 'Sumatera Barat', 'Papua', 'Kalimantan'],
          kunci: 0,
          pembahasan: 'Tari kecak adalah tarian tradisional yang berasal dari Bali.',
        },
        {
          pertanyaan: 'Mengenal keragaman budaya Indonesia membantu siswa untuk...',
          pilihan: ['Lebih mencintai budaya bangsa', 'Melupakan budaya sendiri', 'Meremehkan budaya daerah lain', 'Mengabaikan tradisi'],
          kunci: 0,
          pembahasan: 'Mengenal keragaman budaya membuat siswa lebih mencintai budaya bangsa.',
        },
      ],
    },
  ],
  'SD-4-inggris': [
    {
      judul: 'Describing people and things',
      ringkasan: 'Berlatih mendeskripsikan ciri orang dan benda menggunakan kata sifat sederhana dalam bahasa Inggris.',
      materi: 'Untuk mendeskripsikan orang atau benda dalam bahasa Inggris, kita menggunakan kata sifat (adjective) seperti tall (tinggi), short (pendek), big (besar), dan small (kecil).\nKata sifat biasanya diletakkan sebelum kata benda yang dideskripsikan, misalnya "a tall boy" (seorang anak laki-laki yang tinggi).\nSiswa berlatih mendeskripsikan orang atau benda di sekitar menggunakan kata sifat sederhana dalam bahasa Inggris.',
      soal: [
        {
          pertanyaan: 'Kata sifat dalam bahasa Inggris disebut...',
          pilihan: ['Adjective', 'Verb', 'Noun', 'Adverb'],
          kunci: 0,
          pembahasan: 'Kata sifat dalam bahasa Inggris disebut adjective.',
        },
        {
          pertanyaan: '"Tall" dalam bahasa Indonesia berarti...',
          pilihan: ['Tinggi', 'Pendek', 'Besar', 'Kecil'],
          kunci: 0,
          pembahasan: '"Tall" berarti tinggi.',
        },
        {
          pertanyaan: 'Dalam kalimat "a big house", kata sifatnya adalah...',
          pilihan: ['Big', 'House', 'A', 'Tidak ada'],
          kunci: 0,
          pembahasan: '"Big" adalah kata sifat yang mendeskripsikan house (rumah).',
        },
      ],
    },
    {
      judul: 'Days, months, and dates',
      ringkasan: 'Mengenal nama hari, bulan, dan cara menyebutkan tanggal dalam bahasa Inggris.',
      materi: 'Nama-nama hari dalam bahasa Inggris dimulai dari Monday (Senin) hingga Sunday (Minggu), sedangkan nama-nama bulan dimulai dari January (Januari) hingga December (Desember).\nUntuk menyebutkan tanggal dalam bahasa Inggris, biasanya digunakan angka urutan seperti "the first" (tanggal satu) atau "the tenth" (tanggal sepuluh).\nSiswa berlatih menyebutkan hari, bulan, dan tanggal dalam bahasa Inggris agar terbiasa menggunakannya dalam percakapan sehari-hari.',
      soal: [
        {
          pertanyaan: '"Monday" dalam bahasa Indonesia berarti...',
          pilihan: ['Senin', 'Selasa', 'Minggu', 'Sabtu'],
          kunci: 0,
          pembahasan: '"Monday" berarti hari Senin.',
        },
        {
          pertanyaan: 'Bulan pertama dalam bahasa Inggris adalah...',
          pilihan: ['January', 'February', 'December', 'March'],
          kunci: 0,
          pembahasan: 'January adalah bulan pertama dalam bahasa Inggris, berarti Januari.',
        },
        {
          pertanyaan: 'Untuk menyebutkan tanggal dalam bahasa Inggris, digunakan...',
          pilihan: ['Angka urutan seperti "the first"', 'Angka biasa saja', 'Nama hari saja', 'Nama bulan saja'],
          kunci: 0,
          pembahasan: 'Tanggal disebutkan menggunakan angka urutan seperti "the first".',
        },
      ],
    },
    {
      judul: 'Simple present tense',
      ringkasan: 'Belajar menyusun kalimat sederhana dalam bentuk simple present tense untuk kegiatan rutin.',
      materi: 'Simple present tense digunakan untuk menyatakan kegiatan yang dilakukan secara rutin atau kebiasaan sehari-hari, misalnya "I go to school every day" (saya pergi ke sekolah setiap hari).\nPada kalimat simple present tense dengan subjek orang ketiga tunggal (he, she, it), kata kerja biasanya ditambahkan akhiran -s atau -es, misalnya "She goes to school".\nSiswa berlatih menyusun kalimat sederhana dalam simple present tense untuk menceritakan kegiatan rutin mereka.',
      soal: [
        {
          pertanyaan: 'Simple present tense digunakan untuk menyatakan...',
          pilihan: ['Kegiatan rutin atau kebiasaan', 'Kejadian masa lalu', 'Rencana masa depan saja', 'Kejadian yang sedang terjadi'],
          kunci: 0,
          pembahasan: 'Simple present tense digunakan untuk kegiatan rutin atau kebiasaan sehari-hari.',
        },
        {
          pertanyaan: 'Kalimat "She goes to school" menggunakan kata kerja dengan akhiran...',
          pilihan: ['-es', '-ed', '-ing', 'Tanpa akhiran'],
          kunci: 0,
          pembahasan: 'Kata kerja "go" ditambah akhiran -es menjadi "goes" untuk subjek orang ketiga tunggal.',
        },
        {
          pertanyaan: 'Contoh kalimat simple present tense adalah...',
          pilihan: ['"I go to school every day."', '"I went to school yesterday."', '"I am going to school now."', '"I will go to school tomorrow."'],
          kunci: 0,
          pembahasan: '"I go to school every day" adalah contoh kalimat simple present tense untuk kebiasaan rutin.',
        },
      ],
    },
    {
      judul: 'Talking about daily activities',
      ringkasan: 'Berlatih bercerita tentang kegiatan sehari-hari menggunakan kosakata dan kalimat bahasa Inggris sederhana.',
      materi: 'Kegiatan sehari-hari (daily activities) adalah hal-hal yang biasa dilakukan setiap hari, seperti wake up (bangun tidur), eat breakfast (sarapan), go to school (pergi ke sekolah), dan sleep (tidur).\nSiswa berlatih menyusun kalimat sederhana menggunakan kosakata kegiatan sehari-hari, misalnya "I wake up at six o\'clock" (saya bangun pukul enam).\nBerlatih bercerita tentang kegiatan sehari-hari membantu siswa lebih percaya diri menggunakan bahasa Inggris dalam percakapan.',
      soal: [
        {
          pertanyaan: '"Wake up" dalam bahasa Indonesia berarti...',
          pilihan: ['Bangun tidur', 'Tidur', 'Makan', 'Belajar'],
          kunci: 0,
          pembahasan: '"Wake up" berarti bangun tidur.',
        },
        {
          pertanyaan: '"I eat breakfast" artinya...',
          pilihan: ['Saya sarapan', 'Saya tidur', 'Saya belajar', 'Saya bermain'],
          kunci: 0,
          pembahasan: '"I eat breakfast" berarti saya sarapan.',
        },
        {
          pertanyaan: 'Berlatih bercerita tentang kegiatan sehari-hari dalam bahasa Inggris membantu siswa...',
          pilihan: ['Lebih percaya diri berbahasa Inggris', 'Melupakan bahasa Indonesia', 'Menjadi pemalu', 'Takut berbicara'],
          kunci: 0,
          pembahasan: 'Latihan ini membantu siswa lebih percaya diri menggunakan bahasa Inggris.',
        },
      ],
    },
  ],
  'SD-4-pjok': [
    {
      judul: 'Permainan bola besar (sepak bola, bola voli mini)',
      ringkasan: 'Berlatih teknik dasar dan bermain permainan bola besar secara berkelompok.',
      materi: 'Permainan bola besar adalah permainan yang menggunakan bola berukuran besar, seperti bola sepak dan bola voli.\nDalam sepak bola, pemain berusaha memasukkan bola ke gawang lawan menggunakan kaki, sedangkan dalam bola voli mini, pemain memukul bola melewati net menggunakan tangan.\nBermain permainan bola besar secara berkelompok melatih kerja sama tim, kelincahan, dan kekuatan fisik siswa.',
      soal: [
        {
          pertanyaan: 'Contoh permainan bola besar adalah...',
          pilihan: ['Sepak bola dan bola voli', 'Kasti', 'Bulu tangkis tunggal', 'Tenis meja'],
          kunci: 0,
          pembahasan: 'Sepak bola dan bola voli adalah contoh permainan bola besar.',
        },
        {
          pertanyaan: 'Dalam sepak bola, pemain menggunakan bagian tubuh apa untuk mengarahkan bola ke gawang?',
          pilihan: ['Kaki', 'Tangan', 'Kepala saja', 'Punggung'],
          kunci: 0,
          pembahasan: 'Pemain sepak bola terutama menggunakan kaki untuk mengarahkan bola.',
        },
        {
          pertanyaan: 'Dalam bola voli mini, bola dipukul melewati...',
          pilihan: ['Net', 'Gawang', 'Ring', 'Garis start'],
          kunci: 0,
          pembahasan: 'Dalam bola voli, bola dipukul melewati net ke area lawan.',
        },
      ],
    },
    {
      judul: 'Atletik dasar (lari, lompat, lempar)',
      ringkasan: 'Berlatih teknik dasar lari, lompat, dan lempar sebagai cabang atletik.',
      materi: 'Atletik adalah cabang olahraga yang meliputi gerakan dasar seperti lari, lompat, dan lempar.\nLari melatih kecepatan dan daya tahan tubuh, lompat melatih kekuatan otot kaki, sedangkan lempar melatih kekuatan otot lengan.\nSiswa berlatih teknik dasar atletik seperti lari cepat, lompat jauh, dan lempar bola kecil untuk meningkatkan kebugaran jasmani.',
      soal: [
        {
          pertanyaan: 'Cabang olahraga yang meliputi gerakan lari, lompat, dan lempar disebut...',
          pilihan: ['Atletik', 'Senam', 'Renang', 'Bela diri'],
          kunci: 0,
          pembahasan: 'Atletik adalah cabang olahraga yang meliputi lari, lompat, dan lempar.',
        },
        {
          pertanyaan: 'Gerakan lari melatih...',
          pilihan: ['Kecepatan dan daya tahan tubuh', 'Kekuatan lengan saja', 'Kelenturan jari', 'Ketajaman penglihatan'],
          kunci: 0,
          pembahasan: 'Lari melatih kecepatan dan daya tahan tubuh.',
        },
        {
          pertanyaan: 'Gerakan lompat terutama melatih kekuatan otot...',
          pilihan: ['Kaki', 'Lengan', 'Leher', 'Jari'],
          kunci: 0,
          pembahasan: 'Lompat melatih kekuatan otot kaki.',
        },
      ],
    },
    {
      judul: 'Senam irama sederhana',
      ringkasan: 'Melakukan gerakan senam mengikuti irama musik secara bersama-sama.',
      materi: 'Senam irama adalah gerakan senam yang dilakukan mengikuti irama musik dengan gerakan tubuh yang teratur dan berkesinambungan.\nGerakan dasar senam irama meliputi langkah kaki, ayunan tangan, dan putaran badan yang disesuaikan dengan ketukan musik.\nMelakukan senam irama secara bersama-sama melatih kelenturan tubuh, kekompakan, serta kepekaan terhadap irama musik.',
      soal: [
        {
          pertanyaan: 'Senam irama dilakukan mengikuti...',
          pilihan: ['Irama musik', 'Angka hitungan matematika', 'Warna baju', 'Bentuk lapangan'],
          kunci: 0,
          pembahasan: 'Senam irama dilakukan dengan mengikuti irama musik.',
        },
        {
          pertanyaan: 'Gerakan dasar senam irama meliputi...',
          pilihan: ['Langkah kaki dan ayunan tangan', 'Berenang', 'Memanjat tali', 'Bermain bola'],
          kunci: 0,
          pembahasan: 'Langkah kaki dan ayunan tangan adalah gerakan dasar senam irama.',
        },
        {
          pertanyaan: 'Manfaat senam irama antara lain melatih...',
          pilihan: ['Kelenturan tubuh dan kekompakan', 'Kekuatan otot lengan saja', 'Ketajaman penglihatan', 'Kecepatan berlari saja'],
          kunci: 0,
          pembahasan: 'Senam irama melatih kelenturan tubuh dan kekompakan.',
        },
      ],
    },
    {
      judul: 'Bahaya rokok dan zat adiktif',
      ringkasan: 'Mengenal bahaya rokok dan zat adiktif bagi kesehatan tubuh sejak dini.',
      materi: 'Rokok dan zat adiktif adalah zat yang berbahaya bagi kesehatan tubuh jika dikonsumsi, karena dapat merusak organ tubuh seperti paru-paru dan jantung.\nZat adiktif dapat menyebabkan ketergantungan, sehingga orang yang sudah terbiasa akan merasa sulit untuk berhenti mengonsumsinya.\nSiswa perlu mengenal bahaya rokok dan zat adiktif sejak dini agar dapat menghindarinya dan menjaga kesehatan tubuh.',
      soal: [
        {
          pertanyaan: 'Rokok dapat merusak organ tubuh seperti...',
          pilihan: ['Paru-paru dan jantung', 'Rambut saja', 'Kuku saja', 'Kulit luar saja'],
          kunci: 0,
          pembahasan: 'Rokok dapat merusak paru-paru dan jantung.',
        },
        {
          pertanyaan: 'Zat adiktif dapat menyebabkan...',
          pilihan: ['Ketergantungan', 'Kesehatan yang lebih baik', 'Tubuh menjadi kuat', 'Pertumbuhan cepat'],
          kunci: 0,
          pembahasan: 'Zat adiktif dapat menyebabkan ketergantungan bagi penggunanya.',
        },
        {
          pertanyaan: 'Mengenal bahaya rokok sejak dini bertujuan agar siswa dapat...',
          pilihan: ['Menghindarinya dan menjaga kesehatan', 'Mencoba merokok', 'Mengabaikan bahayanya', 'Menganggap rokok aman'],
          kunci: 0,
          pembahasan: 'Tujuannya agar siswa dapat menghindari rokok dan menjaga kesehatan.',
        },
      ],
    },
  ],
  'SD-4-seni': [
    {
      judul: 'Menggambar model dan alam benda',
      ringkasan: 'Menggambar objek nyata di sekitar seperti buah atau perabot dengan memperhatikan bentuk dan bayangan.',
      materi: 'Menggambar model adalah kegiatan menggambar objek nyata yang ada di sekitar, seperti buah, perabot rumah, atau benda lainnya, dengan memperhatikan bentuk yang sebenarnya.\nDalam menggambar alam benda, siswa perlu memperhatikan proporsi bentuk, perbandingan ukuran, serta bayangan agar gambar terlihat lebih nyata.\nLatihan menggambar model membantu siswa mengasah ketelitian dalam mengamati bentuk benda di sekitarnya.',
      soal: [
        {
          pertanyaan: 'Menggambar model adalah kegiatan menggambar...',
          pilihan: ['Objek nyata di sekitar', 'Objek imajinasi bebas', 'Huruf abjad', 'Angka matematika'],
          kunci: 0,
          pembahasan: 'Menggambar model adalah menggambar objek nyata yang ada di sekitar.',
        },
        {
          pertanyaan: 'Hal yang perlu diperhatikan saat menggambar alam benda adalah...',
          pilihan: ['Proporsi bentuk dan bayangan', 'Warna favorit saja', 'Jumlah kertas', 'Ukuran pensil'],
          kunci: 0,
          pembahasan: 'Proporsi bentuk dan bayangan penting diperhatikan agar gambar terlihat nyata.',
        },
        {
          pertanyaan: 'Latihan menggambar model membantu siswa mengasah...',
          pilihan: ['Ketelitian mengamati bentuk benda', 'Kecepatan berlari', 'Kekuatan otot', 'Daya ingat angka'],
          kunci: 0,
          pembahasan: 'Latihan ini mengasah ketelitian siswa dalam mengamati bentuk benda.',
        },
      ],
    },
    {
      judul: 'Kerajinan anyaman sederhana',
      ringkasan: 'Membuat kerajinan anyaman dari bahan seperti kertas atau daun pandan.',
      materi: 'Anyaman adalah kerajinan yang dibuat dengan menyilangkan bahan seperti kertas atau daun pandan secara berulang hingga membentuk pola tertentu.\nSebelum menganyam, bahan biasanya dipotong menjadi bentuk memanjang agar mudah disilangkan satu sama lain.\nMembuat kerajinan anyaman sederhana melatih kesabaran, ketelitian, dan kreativitas siswa dalam menyusun pola.',
      soal: [
        {
          pertanyaan: 'Anyaman dibuat dengan cara...',
          pilihan: ['Menyilangkan bahan secara berulang', 'Menempelkan bahan tanpa pola', 'Membakar bahan', 'Mewarnai bahan saja'],
          kunci: 0,
          pembahasan: 'Anyaman dibuat dengan menyilangkan bahan secara berulang membentuk pola.',
        },
        {
          pertanyaan: 'Contoh bahan untuk membuat anyaman adalah...',
          pilihan: ['Kertas atau daun pandan', 'Besi', 'Kaca', 'Plastik keras'],
          kunci: 0,
          pembahasan: 'Kertas atau daun pandan adalah contoh bahan untuk anyaman.',
        },
        {
          pertanyaan: 'Membuat anyaman melatih sikap...',
          pilihan: ['Kesabaran dan ketelitian', 'Ketergesaan', 'Kecerobohan', 'Kemalasan'],
          kunci: 0,
          pembahasan: 'Membuat anyaman melatih kesabaran dan ketelitian siswa.',
        },
      ],
    },
    {
      judul: 'Bermain alat musik melodis',
      ringkasan: 'Berlatih memainkan alat musik melodis sederhana seperti pianika atau recorder.',
      materi: 'Alat musik melodis adalah alat musik yang dapat menghasilkan nada atau melodi, seperti pianika dan recorder, berbeda dengan alat musik ritmis yang hanya menghasilkan bunyi ketukan.\nPianika dimainkan dengan cara ditiup sambil menekan tuts, sedangkan recorder dimainkan dengan cara ditiup sambil menutup lubang nada menggunakan jari.\nSiswa berlatih memainkan alat musik melodis sederhana untuk mengiringi lagu dan mengasah kepekaan terhadap nada.',
      soal: [
        {
          pertanyaan: 'Alat musik melodis adalah alat musik yang dapat menghasilkan...',
          pilihan: ['Nada atau melodi', 'Hanya bunyi ketukan', 'Cahaya', 'Bau harum'],
          kunci: 0,
          pembahasan: 'Alat musik melodis dapat menghasilkan nada atau melodi.',
        },
        {
          pertanyaan: 'Pianika dimainkan dengan cara...',
          pilihan: ['Ditiup sambil menekan tuts', 'Dipukul', 'Digesek', 'Dipetik'],
          kunci: 0,
          pembahasan: 'Pianika dimainkan dengan cara ditiup sambil menekan tuts.',
        },
        {
          pertanyaan: 'Recorder dimainkan dengan cara ditiup sambil...',
          pilihan: ['Menutup lubang nada dengan jari', 'Memukul badan recorder', 'Menggoyangkan recorder', 'Menekan tombol listrik'],
          kunci: 0,
          pembahasan: 'Recorder dimainkan dengan ditiup sambil menutup lubang nada menggunakan jari.',
        },
      ],
    },
    {
      judul: 'Tari kreasi daerah',
      ringkasan: 'Menampilkan gerak tari kreasi yang terinspirasi dari tarian daerah setempat.',
      materi: 'Tari kreasi daerah adalah tarian yang dikembangkan dari gerak dasar tari tradisional suatu daerah namun dikreasikan dengan gerakan atau musik yang lebih baru.\nTari kreasi tetap mempertahankan ciri khas budaya daerah asalnya, meskipun ada penambahan gerakan yang lebih variatif.\nSiswa berlatih menampilkan tari kreasi daerah untuk melestarikan budaya sekaligus mengembangkan kreativitas dalam seni tari.',
      soal: [
        {
          pertanyaan: 'Tari kreasi daerah dikembangkan dari...',
          pilihan: ['Gerak dasar tari tradisional', 'Gerakan olahraga', 'Gerakan senam saja', 'Gerakan bebas tanpa dasar'],
          kunci: 0,
          pembahasan: 'Tari kreasi daerah dikembangkan dari gerak dasar tari tradisional.',
        },
        {
          pertanyaan: 'Tari kreasi daerah tetap mempertahankan...',
          pilihan: ['Ciri khas budaya daerah asalnya', 'Gerakan negara lain', 'Musik modern saja', 'Kostum bebas tanpa makna'],
          kunci: 0,
          pembahasan: 'Tari kreasi tetap mempertahankan ciri khas budaya daerah asalnya.',
        },
        {
          pertanyaan: 'Menampilkan tari kreasi daerah bertujuan untuk...',
          pilihan: ['Melestarikan budaya dan mengembangkan kreativitas', 'Melupakan budaya daerah', 'Meniru budaya asing', 'Mengabaikan tradisi'],
          kunci: 0,
          pembahasan: 'Tari kreasi daerah melestarikan budaya sekaligus mengembangkan kreativitas.',
        },
      ],
    },
  ],
  'SD-4-mulok': [
    {
      judul: 'Menulis kalimat sederhana bahasa daerah',
      ringkasan: 'Berlatih menulis kalimat pendek menggunakan kosakata bahasa daerah setempat.',
      materi: 'Menulis kalimat sederhana dalam bahasa daerah berarti menyusun kalimat pendek menggunakan kosakata dan tata bahasa daerah setempat.\nSiswa berlatih menulis kalimat tentang kegiatan sehari-hari menggunakan bahasa daerah, misalnya menceritakan kegiatan di rumah atau di sekolah.\nLatihan ini membantu siswa lebih mahir menggunakan bahasa daerah baik secara lisan maupun tulisan.',
      soal: [
        {
          pertanyaan: 'Menulis kalimat sederhana bahasa daerah berarti menyusun kalimat menggunakan...',
          pilihan: ['Kosakata bahasa daerah setempat', 'Bahasa asing', 'Kode angka', 'Simbol matematika'],
          kunci: 0,
          pembahasan: 'Kalimat sederhana bahasa daerah disusun menggunakan kosakata bahasa daerah setempat.',
        },
        {
          pertanyaan: 'Latihan menulis kalimat bahasa daerah membantu siswa lebih mahir dalam...',
          pilihan: ['Bahasa daerah secara lisan dan tulisan', 'Bahasa asing saja', 'Matematika', 'Olahraga'],
          kunci: 0,
          pembahasan: 'Latihan ini membantu siswa lebih mahir berbahasa daerah baik lisan maupun tulisan.',
        },
        {
          pertanyaan: 'Contoh topik kalimat sederhana bahasa daerah adalah...',
          pilihan: ['Kegiatan sehari-hari di rumah', 'Rumus matematika', 'Data statistik', 'Kode pemrograman'],
          kunci: 0,
          pembahasan: 'Kegiatan sehari-hari di rumah adalah contoh topik yang dekat dengan siswa.',
        },
      ],
    },
    {
      judul: 'Lagu daerah dan maknanya',
      ringkasan: 'Menyanyikan lagu daerah sambil memahami makna atau pesan di dalam liriknya.',
      materi: 'Lagu daerah adalah lagu yang berasal dari suatu daerah tertentu, biasanya menggunakan bahasa daerah setempat dan menggambarkan kehidupan masyarakatnya.\nSetiap lagu daerah memiliki makna atau pesan tertentu, misalnya tentang keindahan alam, nasihat hidup, atau kisah rakyat setempat.\nSiswa berlatih menyanyikan lagu daerah sambil memahami makna liriknya agar lebih menghayati pesan yang terkandung di dalamnya.',
      soal: [
        {
          pertanyaan: 'Lagu daerah biasanya menggunakan...',
          pilihan: ['Bahasa daerah setempat', 'Bahasa asing', 'Kode angka', 'Simbol musik saja'],
          kunci: 0,
          pembahasan: 'Lagu daerah biasanya menggunakan bahasa daerah setempat.',
        },
        {
          pertanyaan: 'Setiap lagu daerah memiliki...',
          pilihan: ['Makna atau pesan tertentu', 'Not angka saja', 'Nama penyanyi terkenal', 'Harga jual'],
          kunci: 0,
          pembahasan: 'Lagu daerah memiliki makna atau pesan tertentu di dalam liriknya.',
        },
        {
          pertanyaan: 'Memahami makna lagu daerah membantu siswa untuk...',
          pilihan: ['Lebih menghayati pesan lagu', 'Melupakan makna lagu', 'Mengabaikan lirik', 'Menyanyi tanpa penghayatan'],
          kunci: 0,
          pembahasan: 'Memahami makna lagu membantu siswa lebih menghayati pesan yang terkandung.',
        },
      ],
    },
    {
      judul: 'Adat istiadat di lingkungan sekitar',
      ringkasan: 'Mengenal kebiasaan dan tata cara adat yang berlaku di lingkungan tempat tinggal.',
      materi: 'Adat istiadat adalah kebiasaan dan tata cara yang berlaku secara turun-temurun di suatu daerah, mengatur berbagai aspek kehidupan masyarakat seperti upacara, perkawinan, dan kegiatan bersama.\nSetiap daerah memiliki adat istiadat yang berbeda-beda, misalnya upacara adat sebelum menanam padi atau tata cara menyambut tamu.\nMengenal adat istiadat di lingkungan sekitar membantu siswa menghargai dan melestarikan tradisi yang diwariskan oleh nenek moyang.',
      soal: [
        {
          pertanyaan: 'Adat istiadat adalah kebiasaan yang berlaku secara...',
          pilihan: ['Turun-temurun', 'Sekali saja', 'Ditentukan pemerintah pusat', 'Diubah setiap tahun'],
          kunci: 0,
          pembahasan: 'Adat istiadat adalah kebiasaan yang berlaku secara turun-temurun.',
        },
        {
          pertanyaan: 'Contoh adat istiadat di suatu daerah adalah...',
          pilihan: ['Upacara adat sebelum menanam padi', 'Belajar matematika', 'Bermain gawai', 'Menonton televisi'],
          kunci: 0,
          pembahasan: 'Upacara adat sebelum menanam padi adalah contoh adat istiadat daerah.',
        },
        {
          pertanyaan: 'Mengenal adat istiadat di lingkungan sekitar membantu siswa untuk...',
          pilihan: ['Menghargai dan melestarikan tradisi', 'Melupakan tradisi', 'Mengabaikan budaya daerah', 'Meniru budaya asing'],
          kunci: 0,
          pembahasan: 'Mengenal adat istiadat membantu siswa menghargai dan melestarikan tradisi.',
        },
      ],
    },
  ],
}
