// Paket soal TKA tambahan (SD & SMP) dengan soal bergambar.
// Gambar dibuat sebagai SVG "data URI" lewat fungsi di bawah, jadi tidak perlu
// file gambar terpisah, tidak butuh upload ke storage, dan tetap tajam di layar HP.
//
// Cara pakai: SimulasiTKA.jsx menggabungkan PAKET_TAMBAHAN ini dengan BANK_TKA.
// Bisa diimpor dengan dua cara:
//   import { PAKET_TAMBAHAN } from './paketTambahan';
//   import PAKET_TAMBAHAN from './paketTambahan';
//
// Menambah soal baru: salin satu objek soal di dalam `soal`, ganti isinya.
//   - q       : teks soal (boleh pakai \n untuk paragraf bacaan)
//   - opsi    : 4 pilihan jawaban
//   - kunci   : indeks jawaban benar (0 = A, 1 = B, 2 = C, 3 = D)
//   - bahas   : pembahasan
//   - gambar  : (opsional) hasil salah satu fungsi gambar di bawah, atau data URI lain
//   - alt     : (opsional) deskripsi gambar untuk pembaca layar

/* ======================= PEMBUAT GAMBAR (SVG) ======================= */

const bungkus = (w, h, isi) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Arial, sans-serif" font-size="14" fill="#3b0a0a"><rect width="${w}" height="${h}" fill="#ffffff"/>${isi}</svg>`
  );

const rad = (d) => (d * Math.PI) / 180;

// Diagram batang dengan label nilai di atas tiap batang.
function diagramBatang(judul, data, maks, langkah) {
  const x0 = 50;
  const y0 = 190;
  const tinggi = 150;
  const lebar = 290;
  const slot = lebar / data.length;
  let isi = `<text x="195" y="22" text-anchor="middle" font-weight="bold">${judul}</text>`;
  for (let v = 0; v <= maks; v += langkah) {
    const y = y0 - (v / maks) * tinggi;
    isi += `<line x1="${x0}" y1="${y}" x2="${x0 + lebar}" y2="${y}" stroke="#d1d5db"/><text x="${x0 - 6}" y="${y + 4}" text-anchor="end" font-size="12">${v}</text>`;
  }
  data.forEach((d, i) => {
    const bw = slot * 0.55;
    const bx = x0 + i * slot + (slot - bw) / 2;
    const bh = (d.nilai / maks) * tinggi;
    isi += `<rect x="${bx}" y="${y0 - bh}" width="${bw}" height="${bh}" fill="#6b0f1a"/>`;
    isi += `<text x="${bx + bw / 2}" y="${y0 - bh - 5}" text-anchor="middle" font-size="12" font-weight="bold">${d.nilai}</text>`;
    isi += `<text x="${bx + bw / 2}" y="${y0 + 16}" text-anchor="middle" font-size="12">${d.label}</text>`;
  });
  return bungkus(380, 220, isi);
}

// Pita pecahan: `bagian` kotak berwarna dari `total` kotak.
function gambarPecahan(bagian, total) {
  const cw = 36;
  let isi = '';
  for (let i = 0; i < total; i++) {
    isi += `<rect x="${10 + i * cw}" y="10" width="${cw}" height="50" fill="${i < bagian ? '#d4a017' : '#ffffff'}" stroke="#3b0a0a" stroke-width="2"/>`;
  }
  return bungkus(20 + total * cw, 70, isi);
}

// Jam analog.
function gambarJam(jam, menit) {
  const garis = (sudut, p, tebal, warna) =>
    `<line x1="80" y1="80" x2="${(80 + p * Math.sin(rad(sudut))).toFixed(1)}" y2="${(80 - p * Math.cos(rad(sudut))).toFixed(1)}" stroke="${warna}" stroke-width="${tebal}" stroke-linecap="round"/>`;
  let isi = `<circle cx="80" cy="80" r="72" fill="#ffffff" stroke="#3b0a0a" stroke-width="4"/>`;
  for (let n = 1; n <= 12; n++) {
    const s = n * 30;
    isi += `<text x="${(80 + 57 * Math.sin(rad(s))).toFixed(1)}" y="${(80 - 57 * Math.cos(rad(s)) + 5).toFixed(1)}" text-anchor="middle" font-weight="bold">${n}</text>`;
  }
  isi += garis(((jam % 12) + menit / 60) * 30, 36, 5, '#3b0a0a');
  isi += garis(menit * 6, 55, 3, '#6b0f1a');
  isi += `<circle cx="80" cy="80" r="4" fill="#3b0a0a"/>`;
  return bungkus(160, 160, isi);
}

// Persegi panjang dengan ukuran sisi (gambar tidak berskala).
function gambarPersegiPanjang(p, l) {
  const isi =
    `<rect x="40" y="30" width="200" height="100" fill="#f7e6e3" stroke="#3b0a0a" stroke-width="3"/>` +
    `<text x="140" y="22" text-anchor="middle" font-weight="bold">${p} cm</text>` +
    `<text x="252" y="85" font-weight="bold">${l} cm</text>`;
  return bungkus(310, 150, isi);
}

// Segitiga siku-siku dengan dua sisi tegak diketahui, sisi miring = x.
function gambarSegitigaSiku(tegak, alas) {
  const isi =
    `<polygon points="40,170 40,20 240,170" fill="#f7e6e3" stroke="#3b0a0a" stroke-width="3"/>` +
    `<polyline points="40,150 60,150 60,170" fill="none" stroke="#3b0a0a" stroke-width="2"/>` +
    `<text x="30" y="100" text-anchor="end" font-weight="bold">${tegak} cm</text>` +
    `<text x="140" y="192" text-anchor="middle" font-weight="bold">${alas} cm</text>` +
    `<text x="158" y="86" font-weight="bold">x</text>`;
  return bungkus(290, 200, isi);
}

// Lingkaran dengan jari-jari.
function gambarLingkaran(r) {
  const isi =
    `<circle cx="100" cy="90" r="70" fill="#f7e6e3" stroke="#3b0a0a" stroke-width="3"/>` +
    `<line x1="100" y1="90" x2="170" y2="90" stroke="#6b0f1a" stroke-width="3"/>` +
    `<circle cx="100" cy="90" r="4" fill="#3b0a0a"/>` +
    `<text x="135" y="82" text-anchor="middle" font-weight="bold">${r} cm</text>`;
  return bungkus(220, 180, isi);
}

// Bidang koordinat dengan garis melalui dua titik: A(1, 2) dan B(3, 8).
function gambarKoordinat() {
  const ox = 40;
  const oy = 200;
  const sx = 50;
  const sy = 20;
  let isi =
    `<line x1="${ox}" y1="${oy}" x2="270" y2="${oy}" stroke="#3b0a0a" stroke-width="2"/>` +
    `<line x1="${ox}" y1="${oy}" x2="${ox}" y2="10" stroke="#3b0a0a" stroke-width="2"/>` +
    `<text x="276" y="${oy + 4}" font-weight="bold">x</text><text x="${ox - 4}" y="8" font-weight="bold">y</text>`;
  for (let x = 1; x <= 4; x++) {
    isi += `<line x1="${ox + x * sx}" y1="${oy - 3}" x2="${ox + x * sx}" y2="${oy + 3}" stroke="#3b0a0a"/><text x="${ox + x * sx}" y="${oy + 18}" text-anchor="middle" font-size="12">${x}</text>`;
  }
  for (let y = 2; y <= 8; y += 2) {
    isi += `<line x1="${ox - 3}" y1="${oy - y * sy}" x2="${ox + 3}" y2="${oy - y * sy}" stroke="#3b0a0a"/><text x="${ox - 8}" y="${oy - y * sy + 4}" text-anchor="end" font-size="12">${y}</text>`;
  }
  const ax = ox + 1 * sx;
  const ay = oy - 2 * sy;
  const bx = ox + 3 * sx;
  const by = oy - 8 * sy;
  isi += `<line x1="${ax - 25}" y1="${ay + 30}" x2="${bx + 12.5}" y2="${by - 18.75}" stroke="#6b0f1a" stroke-width="3"/>`;
  isi += `<circle cx="${ax}" cy="${ay}" r="5" fill="#d4a017" stroke="#3b0a0a"/><text x="${ax + 8}" y="${ay + 16}" font-weight="bold">A(1, 2)</text>`;
  isi += `<circle cx="${bx}" cy="${by}" r="5" fill="#d4a017" stroke="#3b0a0a"/><text x="${bx + 8}" y="${by + 4}" font-weight="bold">B(3, 8)</text>`;
  return bungkus(310, 232, isi);
}

// Pengumuman / pamflet sederhana.
function gambarPamflet(judul, barisList) {
  const h = 74 + barisList.length * 26;
  let isi =
    `<rect x="6" y="6" width="368" height="${h - 12}" rx="10" fill="#fff8e6" stroke="#6b0f1a" stroke-width="3"/>` +
    `<text x="190" y="42" text-anchor="middle" font-size="20" font-weight="bold" fill="#6b0f1a">${judul}</text>` +
    `<line x1="30" y1="54" x2="350" y2="54" stroke="#d4a017" stroke-width="2"/>`;
  barisList.forEach((b, i) => {
    isi += `<text x="24" y="${82 + i * 26}">${b}</text>`;
  });
  return bungkus(380, h, isi);
}

/* ============================ PAKET SOAL ============================ */

export const PAKET_TAMBAHAN = [
  /* ---------------------------- SD: MATEMATIKA ---------------------------- */
  {
    id: 'tbh-sd-wajib-mtk',
    jenjang: 'sd',
    jenis: 'wajib',
    mapel: 'Matematika',
    label: 'Matematika (Latihan Bergambar)',
    durasiMenit: 25,
    soal: [
      {
        q: 'Hasil dari 345 + 278 adalah ...',
        opsi: ['723', '613', '633', '623'],
        kunci: 3,
        bahas: '345 + 278 = 623. Jumlahkan satuan, puluhan, lalu ratusan: 5+8=13 (tulis 3, simpan 1), 4+7+1=12 (tulis 2, simpan 1), 3+2+1=6.',
      },
      {
        q: 'Hasil dari 12 × 15 adalah ...',
        opsi: ['170', '190', '180', '160'],
        kunci: 2,
        bahas: '12 × 15 = 12 × 10 + 12 × 5 = 120 + 60 = 180.',
      },
      {
        q: 'Perhatikan gambar berikut! Bagian yang berwarna kuning menunjukkan pecahan ...',
        gambar: gambarPecahan(3, 8),
        alt: 'Pita dibagi menjadi 8 bagian sama besar, 3 bagian berwarna kuning',
        opsi: ['5/8', '3/8', '3/5', '8/3'],
        kunci: 1,
        bahas: 'Pita terbagi 8 bagian sama besar dan 3 bagian diwarnai, sehingga pecahannya 3/8.',
      },
      {
        q: 'Jam pada gambar berikut menunjukkan pukul ...',
        gambar: gambarJam(7, 30),
        alt: 'Jam analog dengan jarum pendek di antara angka 7 dan 8, jarum panjang di angka 6',
        opsi: ['06.30', '07.15', '08.30', '07.30'],
        kunci: 3,
        bahas: 'Jarum pendek berada di antara angka 7 dan 8, jarum panjang menunjuk angka 6 (30 menit). Jadi pukul 07.30.',
      },
      {
        q: 'Perhatikan gambar berikut! Keliling persegi panjang tersebut adalah ...',
        gambar: gambarPersegiPanjang(12, 7),
        alt: 'Persegi panjang dengan panjang 12 cm dan lebar 7 cm',
        opsi: ['38 cm', '19 cm', '84 cm', '76 cm'],
        kunci: 0,
        bahas: 'Keliling = 2 × (p + l) = 2 × (12 + 7) = 2 × 19 = 38 cm. (84 cm adalah luasnya.)',
      },
      {
        q: 'Perhatikan diagram batang jumlah buah yang terjual dalam satu hari! Selisih penjualan buah terbanyak dan tersedikit adalah ...',
        gambar: diagramBatang(
          'Buah Terjual (kg)',
          [
            { label: 'Apel', nilai: 15 },
            { label: 'Jeruk', nilai: 25 },
            { label: 'Mangga', nilai: 20 },
            { label: 'Pisang', nilai: 10 },
          ],
          30,
          5
        ),
        alt: 'Diagram batang: apel 15, jeruk 25, mangga 20, pisang 10',
        opsi: ['10 kg', '20 kg', '15 kg', '25 kg'],
        kunci: 2,
        bahas: 'Terbanyak: jeruk 25 kg. Tersedikit: pisang 10 kg. Selisihnya 25 − 10 = 15 kg.',
      },
      {
        q: 'Kelipatan Persekutuan Terkecil (KPK) dari 6 dan 8 adalah ...',
        opsi: ['12', '24', '36', '48'],
        kunci: 1,
        bahas: 'Kelipatan 6: 6, 12, 18, 24. Kelipatan 8: 8, 16, 24. KPK = 24.',
      },
      {
        q: 'Sebuah motor melaju dengan kecepatan 40 km/jam selama 3 jam. Jarak yang ditempuh adalah ...',
        opsi: ['120 km', '43 km', '80 km', '140 km'],
        kunci: 0,
        bahas: 'Jarak = kecepatan × waktu = 40 × 3 = 120 km.',
      },
    ],
  },

  /* ------------------------ SD: BAHASA INDONESIA ------------------------ */
  {
    id: 'tbh-sd-wajib-bin',
    jenjang: 'sd',
    jenis: 'wajib',
    mapel: 'Bahasa Indonesia',
    label: 'Bahasa Indonesia (Latihan Bergambar)',
    durasiMenit: 25,
    soal: [
      {
        q: 'Sinonim (persamaan kata) dari kata "pandai" adalah ...',
        opsi: ['bodoh', 'malas', 'pintar', 'rajin'],
        kunci: 2,
        bahas: '"Pandai" bermakna sama dengan "pintar".',
      },
      {
        q: 'Antonim (lawan kata) dari kata "rajin" adalah ...',
        opsi: ['malas', 'tekun', 'giat', 'ulet'],
        kunci: 0,
        bahas: 'Tekun, giat, dan ulet bermakna sama dengan rajin. Lawan katanya adalah malas.',
      },
      {
        q: 'Kata baku yang tepat adalah ...',
        opsi: ['aktifitas', 'aktivitas', 'aktipitas', 'aktivites'],
        kunci: 1,
        bahas: 'Penulisan baku menurut KBBI adalah "aktivitas".',
      },
      {
        q: 'Bacalah paragraf berikut!\nKucing adalah hewan peliharaan yang populer. Kucing mudah dirawat dan jinak. Banyak orang memelihara kucing di rumah. Selain lucu, kucing juga membantu mengusir tikus.\n\nIde pokok paragraf tersebut adalah ...',
        opsi: [
          'Kucing dapat mengusir tikus.',
          'Cara merawat kucing.',
          'Kucing hewan peliharaan yang populer.',
          'Kucing itu lucu dan jinak.',
        ],
        kunci: 2,
        bahas: 'Ide pokok terdapat pada kalimat pertama (kalimat utama), yaitu kucing adalah hewan peliharaan yang populer. Kalimat lain menjelaskan kalimat tersebut.',
      },
      {
        q: 'Perhatikan pengumuman berikut! Kegiatan kerja bakti akan dilaksanakan pada ...',
        gambar: gambarPamflet('PENGUMUMAN', [
          'Kerja Bakti Membersihkan Sekolah',
          'Hari/Tanggal : Sabtu, 17 Oktober 2026',
          'Pukul : 07.00 WIB',
          'Tempat : Halaman SD Negeri 1',
          'Bawa : sapu, cangkul, dan kantong sampah',
        ]),
        alt: 'Pengumuman kerja bakti Sabtu 17 Oktober 2026 pukul 07.00 WIB di halaman SD Negeri 1',
        opsi: [
          'Sabtu, 17 Oktober 2026, pukul 07.00 WIB',
          'Minggu, 17 Oktober 2026, pukul 07.00 WIB',
          'Sabtu, 17 Oktober 2026, pukul 09.00 WIB',
          'Sabtu, 7 Oktober 2026, pukul 07.00 WIB',
        ],
        kunci: 0,
        bahas: 'Pada pengumuman tertulis hari/tanggal Sabtu, 17 Oktober 2026 dan pukul 07.00 WIB.',
      },
      {
        q: 'Penulisan tanda baca yang tepat adalah ...',
        opsi: [
          'Ibu membeli apel jeruk, dan mangga di pasar.',
          'Ibu membeli apel, jeruk, dan mangga di pasar.',
          'Ibu, membeli apel jeruk dan mangga di pasar.',
          'Ibu membeli, apel jeruk dan mangga, di pasar.',
        ],
        kunci: 1,
        bahas: 'Tanda koma dipakai untuk memisahkan unsur dalam perincian: apel, jeruk, dan mangga.',
      },
      {
        q: 'Kata dasar dari kata "menyapu" adalah ...',
        opsi: ['nyapu', 'apu', 'sapu', 'menyap'],
        kunci: 2,
        bahas: 'Menyapu = me- + sapu. Huruf s luluh menjadi ny. Kata dasarnya "sapu".',
      },
      {
        q: 'Kata tanya yang tepat untuk menanyakan "naik sepeda" pada kalimat "Budi pergi ke sekolah naik sepeda" adalah ...',
        opsi: ['Siapa', 'Kapan', 'Bagaimana', 'Mengapa'],
        kunci: 2,
        bahas: '"Naik sepeda" menjelaskan cara Budi pergi ke sekolah, sehingga ditanyakan dengan "bagaimana".',
      },
    ],
  },

  /* ---------------------------- SMP: MATEMATIKA ---------------------------- */
  {
    id: 'tbh-smp-wajib-mtk',
    jenjang: 'smp',
    jenis: 'wajib',
    mapel: 'Matematika',
    label: 'Matematika (Latihan Bergambar)',
    durasiMenit: 30,
    soal: [
      {
        q: 'Hasil dari (−8) + 15 − (−3) adalah ...',
        opsi: ['4', '20', '−4', '10'],
        kunci: 3,
        bahas: '(−8) + 15 = 7. Lalu 7 − (−3) = 7 + 3 = 10.',
      },
      {
        q: 'Hasil dari 2/3 + 3/4 adalah ...',
        opsi: ['5/7', '5/12', '17/12', '1/12'],
        kunci: 2,
        bahas: 'Samakan penyebut 12: 8/12 + 9/12 = 17/12 = 1 5/12.',
      },
      {
        q: 'Nilai x yang memenuhi persamaan 3x − 7 = 11 adalah ...',
        opsi: ['4', '6', '5', '18'],
        kunci: 1,
        bahas: '3x − 7 = 11 → 3x = 18 → x = 6.',
      },
      {
        q: 'Perhatikan segitiga siku-siku berikut! Panjang sisi miring (x) adalah ...',
        gambar: gambarSegitigaSiku(6, 8),
        alt: 'Segitiga siku-siku dengan sisi tegak 6 cm dan alas 8 cm',
        opsi: ['12 cm', '14 cm', '10 cm', '48 cm'],
        kunci: 2,
        bahas: 'Teorema Pythagoras: x² = 6² + 8² = 36 + 64 = 100, sehingga x = 10 cm.',
      },
      {
        q: 'Perhatikan diagram batang nilai ulangan lima siswa! Rata-rata nilai mereka adalah ...',
        gambar: diagramBatang(
          'Nilai Ulangan Matematika',
          [
            { label: 'Ani', nilai: 70 },
            { label: 'Budi', nilai: 85 },
            { label: 'Cici', nilai: 90 },
            { label: 'Dedi', nilai: 75 },
            { label: 'Eka', nilai: 80 },
          ],
          100,
          20
        ),
        alt: 'Diagram batang nilai: Ani 70, Budi 85, Cici 90, Dedi 75, Eka 80',
        opsi: ['80', '75', '78', '82'],
        kunci: 0,
        bahas: 'Jumlah = 70 + 85 + 90 + 75 + 80 = 400. Rata-rata = 400 ÷ 5 = 80.',
      },
      {
        q: 'Perhatikan gambar lingkaran berikut! Luas lingkaran tersebut (π = 22/7) adalah ...',
        gambar: gambarLingkaran(7),
        alt: 'Lingkaran dengan jari-jari 7 cm',
        opsi: ['44 cm²', '154 cm²', '308 cm²', '49 cm²'],
        kunci: 1,
        bahas: 'Luas = π × r² = 22/7 × 7 × 7 = 154 cm². (44 cm adalah kelilingnya.)',
      },
      {
        q: 'Perhatikan gambar berikut! Gradien garis yang melalui titik A dan B adalah ...',
        gambar: gambarKoordinat(),
        alt: 'Bidang koordinat dengan garis melalui titik A(1, 2) dan B(3, 8)',
        opsi: ['6', '4', '2', '3'],
        kunci: 3,
        bahas: 'Gradien m = (y₂ − y₁) ÷ (x₂ − x₁) = (8 − 2) ÷ (3 − 1) = 6 ÷ 2 = 3.',
      },
      {
        q: 'Uang Rp60.000 dibagi untuk Ani dan Budi dengan perbandingan 2 : 3. Bagian uang Ani adalah ...',
        opsi: ['Rp36.000', 'Rp40.000', 'Rp20.000', 'Rp24.000'],
        kunci: 3,
        bahas: 'Jumlah perbandingan = 2 + 3 = 5. Bagian Ani = 2/5 × 60.000 = Rp24.000.',
      },
    ],
  },

  /* ------------------------ SMP: BAHASA INDONESIA ------------------------ */
  {
    id: 'tbh-smp-wajib-bin',
    jenjang: 'smp',
    jenis: 'wajib',
    mapel: 'Bahasa Indonesia',
    label: 'Bahasa Indonesia (Latihan Bergambar)',
    durasiMenit: 30,
    soal: [
      {
        q: 'Bacalah teks berikut!\nSampah plastik membutuhkan waktu ratusan tahun untuk terurai. Di laut, sampah ini mengancam kehidupan penyu dan ikan yang sering salah mengira plastik sebagai makanan. Karena itu, kita perlu mengurangi penggunaan kantong plastik sekali pakai dan membiasakan membawa tas belanja sendiri.\n\nGagasan utama teks tersebut adalah ...',
        opsi: [
          'Sampah plastik membahayakan penyu.',
          'Pentingnya mengurangi sampah plastik karena sulit terurai dan membahayakan hewan laut.',
          'Cara membuat tas belanja sendiri.',
          'Plastik terbuat dari minyak bumi.',
        ],
        kunci: 1,
        bahas: 'Teks memaparkan sulitnya plastik terurai, dampaknya bagi hewan laut, dan ajakan mengurangi pemakaian plastik. Gagasan utamanya mencakup semua hal itu.',
      },
      {
        q: 'Kalimat yang berisi fakta adalah ...',
        opsi: [
          'Durian adalah buah yang paling enak.',
          'Film itu sangat membosankan.',
          'Batik pasti lebih indah daripada kain lain.',
          'Air membeku pada suhu 0 derajat Celsius.',
        ],
        kunci: 3,
        bahas: 'Fakta dapat dibuktikan kebenarannya. Kalimat lainnya berupa pendapat (opini) karena bergantung pada penilaian pribadi.',
      },
      {
        q: 'Majas yang digunakan pada kalimat "Angin berbisik lembut di telinga malam" adalah ...',
        opsi: ['Hiperbola', 'Metafora', 'Personifikasi', 'Ironi'],
        kunci: 2,
        bahas: 'Angin digambarkan dapat berbisik seperti manusia, sehingga majasnya personifikasi.',
      },
      {
        q: 'Kalimat dengan penulisan kata depan "di" yang benar adalah ...',
        opsi: [
          'Buku itu diletakkan di atas meja.',
          'Buku itu di letakkan di atas meja.',
          'Buku itu diletakkan diatas meja.',
          'Buku itu di letakkan diatas meja.',
        ],
        kunci: 0,
        bahas: '"Diletakkan" adalah kata kerja pasif sehingga "di-" ditulis serangkai. "Di atas" adalah kata depan sehingga ditulis terpisah.',
      },
      {
        q: 'Perhatikan pamflet berikut! Peserta yang ingin mengikuti lomba harus mendaftar paling lambat tanggal ...',
        gambar: gambarPamflet('LOMBA MENDONGENG', [
          'Tingkat SMP se-Kabupaten',
          'Sabtu, 24 Oktober 2026 | 08.00 WIB',
          'Tempat : Aula SMP Negeri 1',
          'Pendaftaran gratis',
          'Batas pendaftaran : 20 Oktober 2026',
        ]),
        alt: 'Pamflet lomba mendongeng, batas pendaftaran 20 Oktober 2026',
        opsi: ['17 Oktober 2026', '20 Oktober 2026', '24 Oktober 2026', '8 Oktober 2026'],
        kunci: 1,
        bahas: 'Pada pamflet tertulis batas pendaftaran 20 Oktober 2026. Tanggal 24 Oktober adalah hari pelaksanaan lomba.',
      },
      {
        q: 'Makna ungkapan "membanting tulang" adalah ...',
        opsi: ['Bermalas-malasan', 'Mematahkan tulang', 'Sakit parah', 'Bekerja sangat keras'],
        kunci: 3,
        bahas: '"Membanting tulang" adalah ungkapan yang berarti bekerja keras.',
      },
      {
        q: 'Kata penghubung yang menyatakan hubungan pertentangan adalah ...',
        opsi: ['karena', 'tetapi', 'dan', 'sehingga'],
        kunci: 1,
        bahas: '"Tetapi" menghubungkan dua hal yang berlawanan. "Karena" menyatakan sebab, "dan" penambahan, "sehingga" akibat.',
      },
      {
        q: 'Kalimat efektif di bawah ini adalah ...',
        opsi: [
          'Siswa-siswa para berkumpul di lapangan.',
          'Para siswa-siswa berkumpul di lapangan.',
          'Para siswa berkumpul di lapangan.',
          'Para siswa berkumpul-kumpul di lapangan.',
        ],
        kunci: 2,
        bahas: '"Para" sudah menyatakan jamak, sehingga tidak perlu diikuti bentuk ulang "siswa-siswa" (pemborosan kata).',
      },
    ],
  },
];

// Default export agar file ini aman diimpor dengan cara apa pun.
export default PAKET_TAMBAHAN;
