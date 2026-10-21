// Isian awal Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP) untuk SD,
// per mata pelajaran dan fase (A = kelas 1-2, B = kelas 3-4, C = kelas 5-6).
//
// PENTING: ini RINGKASAN dengan bahasa sendiri sebagai draf awal, BUKAN salinan
// kata per kata dari dokumen CP resmi (Kemendikbudristek/BSKAP). Guru tetap perlu
// memeriksa dan menyesuaikannya dengan dokumen CP resmi, kelas, dan agama masing-masing.
// Untuk mengganti isi, cukup edit teks di bawah ini.

const MULOK = {
  capaian:
    'Peserta didik mempelajari potensi, budaya, bahasa, dan kearifan lokal daerah sesuai ketetapan sekolah, serta mampu menghargai dan melestarikannya.',
  tujuan:
    '1. Mengenal potensi dan budaya daerah setempat.\n2. Terlibat dalam kegiatan yang melestarikan budaya dan kearifan lokal.\n3. Menunjukkan sikap bangga dan peduli terhadap daerahnya.',
}

export const CP_DEFAULT = {
  'Pendidikan Agama dan Budi Pekerti': {
    A: {
      capaian:
        'Peserta didik mengenal Tuhan dan ciptaan-Nya, mengenal ajaran dasar agamanya (ibadah, kitab suci, tokoh teladan), dan membiasakan perilaku baik seperti jujur, hormat, dan sopan di rumah maupun sekolah.',
      tujuan:
        '1. Menyebutkan ciptaan Tuhan di sekitarnya dan bersyukur.\n2. Menirukan doa dan ibadah dasar sesuai agamanya.\n3. Membiasakan jujur, hormat kepada orang tua dan guru, serta sopan kepada teman.',
    },
    B: {
      capaian:
        'Peserta didik memahami pokok ajaran agamanya (keyakinan, ibadah, kisah teladan), mampu membaca atau melafalkan bagian kitab suci sesuai kemampuan, serta menerapkan akhlak mulia dan sikap toleran dalam pergaulan.',
      tujuan:
        '1. Menjelaskan pokok-pokok keyakinan dan ibadah sesuai agamanya.\n2. Menceritakan kisah teladan dan mengambil pelajaran darinya.\n3. Menerapkan akhlak baik dan menghargai teman yang berbeda keyakinan.',
    },
    C: {
      capaian:
        'Peserta didik memahami dan menerapkan ajaran agamanya dengan lebih mendalam, meneladani tokoh, melaksanakan ibadah dengan benar, serta menunjukkan tanggung jawab, kepedulian sosial, dan sikap toleran dalam kehidupan sehari-hari.',
      tujuan:
        '1. Menjelaskan dan melaksanakan ibadah dengan benar dan tertib.\n2. Meneladani sikap tokoh agama dalam kehidupan sehari-hari.\n3. Menunjukkan kepedulian sosial dan toleransi antarumat beragama.',
    },
  },

  'Pendidikan Pancasila': {
    A: {
      capaian:
        'Peserta didik mengenal lambang negara dan sila-sila Pancasila secara sederhana, memahami aturan di rumah dan sekolah, serta menghargai perbedaan di antara teman.',
      tujuan:
        '1. Menyebutkan lambang negara dan sila-sila Pancasila.\n2. Menaati aturan di rumah dan di sekolah.\n3. Bermain dan bekerja sama dengan teman yang berbeda latar belakang.',
    },
    B: {
      capaian:
        'Peserta didik memahami makna sila-sila Pancasila dan contoh penerapannya, memahami norma, hak dan kewajiban, serta menghargai keberagaman suku, budaya, dan agama dalam semangat Bhinneka Tunggal Ika dan gotong royong.',
      tujuan:
        '1. Menjelaskan makna sila Pancasila dengan contoh perilaku sehari-hari.\n2. Menyebutkan hak dan kewajiban sebagai anggota keluarga dan sekolah.\n3. Menunjukkan sikap gotong royong dan menghargai keberagaman.',
    },
    C: {
      capaian:
        'Peserta didik menganalisis penerapan Pancasila dalam kehidupan sehari-hari, memahami dasar-dasar UUD 1945, hak dan kewajiban warga negara, serta berperan aktif menjaga persatuan dalam keberagaman di lingkungan dan negara.',
      tujuan:
        '1. Menganalisis contoh penerapan nilai Pancasila di lingkungan sekitar.\n2. Menjelaskan hak dan kewajiban warga negara secara sederhana.\n3. Berpartisipasi dalam kegiatan yang menjaga persatuan dan kerukunan.',
    },
  },

  'Bahasa Indonesia': {
    A: {
      capaian:
        'Peserta didik mampu menyimak dan memahami pesan lisan, berbicara dengan kalimat sederhana, membaca kata dan kalimat pendek, serta menulis huruf, kata, dan kalimat sederhana.',
      tujuan:
        '1. Menyimak dan menceritakan kembali pesan lisan sederhana.\n2. Membaca kata dan kalimat pendek dengan lancar.\n3. Menulis kata dan kalimat sederhana dengan tulisan yang rapi.',
    },
    B: {
      capaian:
        'Peserta didik mampu memahami informasi dari berbagai teks, membaca dengan lancar dan memahami isi bacaan, menyampaikan pendapat secara lisan, serta menulis teks sederhana seperti narasi dan deskripsi.',
      tujuan:
        '1. Menemukan ide pokok dan informasi penting dari bacaan.\n2. Menyampaikan pendapat dan pengalaman secara lisan dengan runtut.\n3. Menulis paragraf narasi atau deskripsi sederhana dengan ejaan yang tepat.',
    },
    C: {
      capaian:
        'Peserta didik mampu memahami dan mengevaluasi isi berbagai jenis teks, menyampaikan gagasan secara lisan dan tulis dengan runtut dan santun, serta menulis teks informasi, narasi, dan persuasi dengan struktur dan kaidah bahasa yang tepat.',
      tujuan:
        '1. Menyimpulkan isi dan menanggapi berbagai jenis teks.\n2. Mempresentasikan gagasan dengan runtut dan santun.\n3. Menulis teks informasi atau persuasi dengan struktur dan kaidah yang tepat.',
    },
  },

  Matematika: {
    A: {
      capaian:
        'Peserta didik mengenal dan mengoperasikan bilangan cacah (penjumlahan dan pengurangan), mengenal bangun datar dan bangun ruang sederhana, mengukur panjang dengan satuan tidak baku, dan membaca data sederhana.',
      tujuan:
        '1. Membaca, menulis, dan membandingkan bilangan cacah.\n2. Menyelesaikan soal penjumlahan dan pengurangan sederhana.\n3. Mengenali bentuk bangun datar dan membandingkan panjang benda.',
    },
    B: {
      capaian:
        'Peserta didik mengoperasikan bilangan cacah yang lebih besar (empat operasi hitung), memahami pecahan sederhana, menghitung keliling dan luas bangun datar, mengukur dengan satuan baku, serta menyajikan dan membaca data dalam diagram.',
      tujuan:
        '1. Menyelesaikan soal perkalian dan pembagian dalam kehidupan sehari-hari.\n2. Menjelaskan dan membandingkan pecahan sederhana.\n3. Menghitung keliling dan luas bangun datar serta membaca diagram data.',
    },
    C: {
      capaian:
        'Peserta didik memahami bilangan cacah besar, pecahan, desimal, dan persen, menggunakan rasio sederhana, menghitung luas dan volume bangun, serta menyajikan dan menafsirkan data termasuk nilai rata-rata.',
      tujuan:
        '1. Menyelesaikan masalah dengan operasi hitung pecahan dan desimal.\n2. Menghitung luas dan volume bangun datar dan bangun ruang.\n3. Menyajikan dan menafsirkan data serta menghitung rata-rata.',
    },
  },

  IPAS: {
    B: {
      capaian:
        'Peserta didik memahami ciri makhluk hidup dan lingkungannya, gaya, bunyi, cahaya, dan wujud zat dalam kehidupan sehari-hari, serta mengenal kondisi bumi, keberagaman sosial dan budaya daerahnya, dan peran dirinya dalam lingkungan.',
      tujuan:
        '1. Mengidentifikasi makhluk hidup dan hubungannya dengan lingkungan.\n2. Menjelaskan contoh gaya, bunyi, cahaya, dan perubahan wujud zat.\n3. Menceritakan keberagaman sosial dan budaya di daerahnya.',
    },
    C: {
      capaian:
        'Peserta didik memahami sistem organ tubuh, perubahan zat, energi dan listrik, serta tata surya dan bumi, juga memahami interaksi sosial, kegiatan ekonomi, dan sejarah daerah dan bangsanya.',
      tujuan:
        '1. Menjelaskan fungsi sistem organ tubuh manusia.\n2. Menjelaskan perubahan zat, energi, dan rangkaian listrik sederhana.\n3. Menjelaskan interaksi sosial, kegiatan ekonomi, dan sejarah daerah.',
    },
  },

  PJOK: {
    A: {
      capaian:
        'Peserta didik mempraktikkan gerak dasar (lokomotor, nonlokomotor, manipulatif) dalam permainan sederhana, mengenal kebugaran jasmani, dan membiasakan perilaku hidup bersih dan sehat.',
      tujuan:
        '1. Melakukan gerak dasar berjalan, berlari, melompat, dan melempar.\n2. Mengikuti permainan sederhana dengan aturan dan bekerja sama.\n3. Membiasakan cuci tangan dan menjaga kebersihan diri.',
    },
    B: {
      capaian:
        'Peserta didik mempraktikkan keterampilan gerak dalam permainan bola kecil, senam, dan aktivitas ritmik, meningkatkan kebugaran jasmani, serta menerapkan pola hidup sehat dan aman.',
      tujuan:
        '1. Mempraktikkan keterampilan dasar permainan bola kecil.\n2. Melakukan gerakan senam dan aktivitas ritmik sederhana.\n3. Menjelaskan manfaat olahraga dan pola hidup sehat.',
    },
    C: {
      capaian:
        'Peserta didik mempraktikkan keterampilan gerak dalam permainan bola besar dan aktivitas olahraga lainnya dengan sportif, meningkatkan kebugaran jasmani, dan menerapkan upaya pencegahan penyakit serta hidup sehat.',
      tujuan:
        '1. Mempraktikkan teknik dasar permainan bola besar.\n2. Menunjukkan sikap sportif dan kerja sama dalam permainan.\n3. Menerapkan kebiasaan hidup sehat untuk mencegah penyakit.',
    },
  },

  'Seni dan Budaya': {
    A: {
      capaian:
        'Peserta didik mengenal unsur dasar seni rupa, musik, tari, dan teater melalui eksplorasi, serta mengekspresikan ide dan perasaan melalui karya sederhana.',
      tujuan:
        '1. Mengenali warna, garis, bentuk, bunyi, dan gerak.\n2. Membuat karya seni sederhana dari bahan di sekitar.\n3. Menunjukkan karyanya dengan percaya diri.',
    },
    B: {
      capaian:
        'Peserta didik berkreasi menggunakan unsur seni rupa, musik, tari, dan teater, mengenal seni dan budaya daerahnya, serta menampilkan karya dan menghargai karya orang lain.',
      tujuan:
        '1. Menciptakan karya seni dengan mengombinasikan unsur seni.\n2. Mengenal contoh seni dan budaya daerah.\n3. Menampilkan karya dan memberi apresiasi kepada teman.',
    },
    C: {
      capaian:
        'Peserta didik merancang dan menampilkan karya seni dengan teknik dan media yang lebih beragam, memahami seni budaya daerah dan nusantara, serta merefleksikan karya sendiri dan orang lain.',
      tujuan:
        '1. Merencanakan dan membuat karya seni dengan media pilihan.\n2. Menampilkan karya dalam pameran atau pertunjukan kelas.\n3. Menjelaskan nilai seni budaya daerah dan nusantara.',
    },
  },

  'Bahasa Inggris': {
    A: {
      capaian:
        'Peserta didik memahami dan menggunakan kosakata dan ungkapan sederhana seperti salam, perkenalan diri, benda di sekitar, angka, dan warna dalam bahasa Inggris.',
      tujuan:
        '1. Menirukan salam dan perkenalan diri sederhana.\n2. Menyebutkan benda, angka, dan warna dalam bahasa Inggris.\n3. Menanggapi instruksi lisan sederhana.',
    },
    B: {
      capaian:
        'Peserta didik memahami dan menyampaikan informasi sederhana tentang diri, keluarga, dan lingkungan melalui dialog dan teks pendek bahasa Inggris.',
      tujuan:
        '1. Bercakap sederhana tentang diri dan keluarga.\n2. Membaca teks pendek dan menemukan informasi dasar.\n3. Menulis kalimat sederhana tentang diri dan benda di sekitar.',
    },
    C: {
      capaian:
        'Peserta didik memahami dan menyampaikan informasi dalam teks deskriptif dan percakapan sehari-hari secara lisan dan tulis dengan kosakata dan tata bahasa dasar.',
      tujuan:
        '1. Mempresentasikan diri, kegiatan, dan lingkungan secara singkat.\n2. Membaca dan memahami teks deskriptif pendek.\n3. Menulis paragraf pendek dengan kosakata dan tata bahasa dasar.',
    },
  },

  'Muatan Lokal': { A: MULOK, B: MULOK, C: MULOK },
}

// ---- Helper untuk form manual di Silabus.jsx ----
const ROMAWI = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }

export function faseDariNamaKelas(nama) {
  if (!nama) return null
  const s = String(nama)
  let t = null
  const angka = s.match(/\d+/)
  if (angka) t = Number(angka[0])
  else {
    const r = s.toUpperCase().match(/\b(VI|IV|V|III|II|I)\b/)
    if (r) t = ROMAWI[r[1]]
  }
  if (!t || t < 1 || t > 6) return null
  return t <= 2 ? 'A' : t <= 4 ? 'B' : 'C'
}

// Cari CP & TP default berdasarkan nama mapel (tidak peka huruf besar/kecil) dan nama kelas.
export function cariCpDefault(mapel, namaKelas) {
  const fase = faseDariNamaKelas(namaKelas)
  if (!fase || !mapel) return null
  const kunci = Object.keys(CP_DEFAULT).find(
    (k) => k.toLowerCase() === String(mapel).trim().toLowerCase()
  )
  return kunci ? CP_DEFAULT[kunci][fase] || null : null
}
