// Template otomatis untuk:
//  1. Evaluasi Kinerja Guru & Kinerja Tendik (predikat/nilai -> catatan & tindak lanjut)
//  2. Notulen Rapat (jenis rapat -> pembahasan, keputusan, tindak lanjut)
// Teks yang sudah Anda ketik/edit sendiri TIDAK akan ditimpa.

/* ===================== PENILAIAN ===================== */

export const TEMPLATE = {
  'Sangat Baik': {
    nilai: 95,
    catatan: [
      'Kinerja sangat baik, disiplin, kreatif, dan menjadi teladan bagi rekan sejawat dalam melaksanakan tugas.',
      'Melaksanakan tugas dengan penuh tanggung jawab, inovatif, dan memberikan pelayanan terbaik bagi peserta didik.',
    ],
    tindak: [
      'Pertahankan dan tingkatkan prestasi; dilibatkan sebagai pembimbing atau narasumber bagi rekan guru.',
      'Diberi kesempatan mengikuti pelatihan lanjutan dan berbagi praktik baik di forum KKG/MGMP.',
    ],
  },
  Baik: {
    nilai: 80,
    catatan: [
      'Kinerja sudah baik, tugas dilaksanakan tepat waktu dan sesuai ketentuan. Diharapkan dapat terus dipertahankan.',
      'Menunjukkan tanggung jawab dan komitmen yang baik dalam melaksanakan tugas pokok dan fungsinya.',
    ],
    tindak: [
      'Terus tingkatkan kompetensi melalui pelatihan dan pengembangan diri secara berkelanjutan.',
      'Pembinaan rutin dan diskusi reflektif untuk mengembangkan inovasi pembelajaran.',
    ],
  },
  Cukup: {
    nilai: 67,
    catatan: [
      'Kinerja cukup, namun masih ada aspek yang perlu ditingkatkan, terutama kedisiplinan dan kelengkapan administrasi.',
      'Tugas sudah dilaksanakan, tetapi belum optimal. Perlu peningkatan kualitas perencanaan dan pelaksanaannya.',
    ],
    tindak: [
      'Dilakukan pembinaan dan pendampingan oleh kepala sekolah secara berkala.',
      'Menyusun rencana perbaikan kinerja dan dievaluasi kembali pada semester berikutnya.',
    ],
  },
  Kurang: {
    nilai: 50,
    catatan: [
      'Kinerja masih kurang dan belum memenuhi standar yang diharapkan. Perlu perbaikan menyeluruh.',
      'Terdapat beberapa kewajiban yang belum terlaksana dengan baik dan perlu perhatian khusus.',
    ],
    tindak: [
      'Pembinaan intensif dan pendampingan khusus, disertai target perbaikan yang terukur dan batas waktu.',
      'Dipanggil untuk konsultasi, dibuatkan rencana tindak lanjut, dan dimonitor setiap bulan.',
    ],
  },
}

// Catatan khusus tenaga kependidikan (tidak menyebut mengajar/peserta didik secara langsung)
export const TEMPLATE_TENDIK = {
  'Sangat Baik': [
    'Kinerja sangat baik, cekatan, disiplin, dan menjadi teladan dalam memberikan layanan administrasi sekolah.',
    'Melaksanakan tugas dengan penuh tanggung jawab, rapi, tepat waktu, dan ramah dalam melayani warga sekolah.',
  ],
  Baik: [
    'Kinerja baik, tugas dilaksanakan tepat waktu dan sesuai ketentuan. Diharapkan dapat terus dipertahankan.',
    'Menunjukkan tanggung jawab dan komitmen yang baik dalam menjalankan tugas dan layanan di sekolah.',
  ],
  Cukup: [
    'Kinerja cukup, namun kerapian administrasi dan ketepatan waktu penyelesaian tugas masih perlu ditingkatkan.',
    'Tugas sudah dilaksanakan, tetapi belum optimal. Perlu peningkatan ketelitian dan inisiatif.',
  ],
  Kurang: [
    'Kinerja masih kurang dan belum memenuhi standar yang diharapkan. Perlu perbaikan menyeluruh.',
    'Beberapa tugas belum terlaksana dengan baik dan memerlukan perhatian serta pendampingan khusus.',
  ],
}

export const predikatDariNilai = (n) => {
  const v = Number(n)
  if (n === '' || n == null || Number.isNaN(v)) return ''
  if (v >= 90) return 'Sangat Baik'
  if (v >= 75) return 'Baik'
  if (v >= 60) return 'Cukup'
  return 'Kurang'
}

const semuaCatatan = [
  ...Object.values(TEMPLATE).flatMap((t) => t.catatan),
  ...Object.values(TEMPLATE_TENDIK).flat(),
]
const semuaTindak = Object.values(TEMPLATE).flatMap((t) => t.tindak)

// Boleh ditimpa hanya jika kosong atau masih berisi teks template (belum diedit manual).
const bolehTimpa = (val, daftar) => !val || daftar.includes(val)
const acak = (arr) => arr[Math.floor(Math.random() * arr.length)]

/**
 * Panggil setiap field berubah (halaman penilaian).
 * @param prev  data form sebelumnya
 * @param k     kunci field yang berubah
 * @param v     nilai baru
 * @param opsi  { tindak: boolean (form punya field tindak_lanjut), tendik: boolean }
 */
export function autoIsiPenilaian(prev, k, v, opsi = {}) {
  const { tindak = true, tendik = false } = opsi
  const next = { ...prev, [k]: v }
  let predikat

  if (k === 'nilai') {
    predikat = predikatDariNilai(v)
    if (!predikat) return next
    next.predikat = predikat
  } else if (k === 'predikat') {
    predikat = v
    // Nilai disesuaikan hanya jika kosong atau tidak cocok dengan predikat yang dipilih
    if (TEMPLATE[v] && predikatDariNilai(next.nilai) !== v) next.nilai = TEMPLATE[v].nilai
  } else {
    return next
  }

  const t = TEMPLATE[predikat]
  if (!t) return next

  // Teks hanya diganti saat predikat berubah (atau kolom masih kosong),
  // agar tidak berganti-ganti acak setiap kali angka nilai diketik.
  const berubah = predikat !== prev.predikat
  const sumberCatatan = tendik ? TEMPLATE_TENDIK[predikat] : t.catatan
  if ((berubah || !next.catatan) && bolehTimpa(prev.catatan, semuaCatatan)) next.catatan = acak(sumberCatatan)
  if (tindak && (berubah || !next.tindak_lanjut) && bolehTimpa(prev.tindak_lanjut, semuaTindak)) {
    next.tindak_lanjut = acak(t.tindak)
  }
  return next
}

/* ===================== NOTULEN RAPAT ===================== */

const PEMBUKA = 'A. Pembukaan\nRapat dibuka oleh pimpinan rapat dengan salam dan doa bersama, dilanjutkan dengan penyampaian tujuan dan agenda rapat kepada seluruh peserta.'
const PENUTUP = 'C. Penutup\nSetelah seluruh agenda dibahas dan keputusan disepakati, rapat ditutup oleh pimpinan rapat dengan doa dan ucapan terima kasih kepada seluruh peserta.'

const rangka = (butir) =>
  `${PEMBUKA}\n\nB. Pembahasan\n${butir.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n${PENUTUP}`
const daftar = (arr) => arr.map((x, i) => `${i + 1}. ${x}`).join('\n')

export const JENIS_RAPAT = [
  'Rapat Dewan Guru',
  'Rapat Awal Tahun Ajaran',
  'Rapat Evaluasi Semester',
  'Rapat Persiapan Ujian / Asesmen',
  'Rapat Penyusunan RKAS / RKT',
  'Rapat dengan Komite / Orang Tua',
  'Rapat Lainnya',
]

export const TEMPLATE_NOTULEN = {
  'Rapat Dewan Guru': {
    pembahasan: rangka([
      'Kepala sekolah menyampaikan informasi dan arahan terbaru dari dinas pendidikan.',
      'Evaluasi pelaksanaan pembelajaran dan kedisiplinan guru selama periode berjalan.',
      'Pembahasan kendala yang dihadapi guru di kelas beserta usulan solusinya.',
      'Pembagian tugas dan tanggung jawab untuk kegiatan sekolah mendatang.',
      'Usulan dan masukan dari peserta rapat.',
    ]),
    keputusan: daftar([
      'Seluruh guru wajib melaksanakan tugas pembelajaran sesuai jadwal dan ketentuan yang berlaku.',
      'Kendala pembelajaran dilaporkan kepada kepala sekolah untuk dicarikan solusi bersama.',
      'Pembagian tugas yang telah disepakati dilaksanakan oleh masing-masing penanggung jawab.',
    ]),
    tindak_lanjut: daftar([
      'Guru melaksanakan hasil kesepakatan rapat mulai hari ini.',
      'Kepala sekolah memantau dan mengevaluasi pelaksanaan keputusan rapat pada pertemuan berikutnya.',
    ]),
  },
  'Rapat Awal Tahun Ajaran': {
    pembahasan: rangka([
      'Penyampaian kalender pendidikan dan program kerja sekolah tahun ajaran baru.',
      'Pembagian tugas mengajar, wali kelas, dan tugas tambahan guru.',
      'Persiapan penerimaan peserta didik baru dan masa pengenalan lingkungan sekolah.',
      'Persiapan perangkat pembelajaran (ATP, modul ajar, dan asesmen diagnostik).',
      'Kesiapan sarana dan prasarana sekolah.',
    ]),
    keputusan: daftar([
      'Kalender pendidikan dan program kerja sekolah ditetapkan dan dilaksanakan oleh seluruh warga sekolah.',
      'Pembagian tugas mengajar dan wali kelas ditetapkan melalui surat keputusan kepala sekolah.',
      'Perangkat pembelajaran diselesaikan guru paling lambat pada waktu yang disepakati.',
    ]),
    tindak_lanjut: daftar([
      'Kepala sekolah menerbitkan surat keputusan pembagian tugas.',
      'Guru menyusun dan menyerahkan perangkat pembelajaran kepada kepala sekolah.',
      'Panitia menyiapkan kegiatan pengenalan lingkungan sekolah.',
    ]),
  },
  'Rapat Evaluasi Semester': {
    pembahasan: rangka([
      'Paparan capaian pembelajaran dan hasil belajar peserta didik selama satu semester.',
      'Evaluasi pelaksanaan program kerja sekolah dan penyerapan anggaran.',
      'Identifikasi peserta didik yang memerlukan remedial dan pengayaan.',
      'Persiapan penyusunan dan pembagian rapor.',
      'Rekomendasi perbaikan untuk semester berikutnya.',
    ]),
    keputusan: daftar([
      'Program yang belum tercapai dijadwalkan ulang dan diprioritaskan pada semester berikutnya.',
      'Peserta didik yang belum tuntas mengikuti remedial, dan yang unggul mengikuti pengayaan.',
      'Rapor diselesaikan dan dibagikan sesuai jadwal pada kalender pendidikan.',
    ]),
    tindak_lanjut: daftar([
      'Wali kelas menyelesaikan rapor dan menyerahkannya kepada kepala sekolah untuk diperiksa.',
      'Tim pengembang sekolah merevisi program kerja berdasarkan hasil evaluasi.',
    ]),
  },
  'Rapat Persiapan Ujian / Asesmen': {
    pembahasan: rangka([
      'Jadwal pelaksanaan ujian atau asesmen dan pembagian ruang.',
      'Pembentukan panitia dan pembagian tugas pengawas.',
      'Kesiapan soal, lembar jawaban, dan perangkat pendukung lainnya.',
      'Tata tertib pelaksanaan dan penanganan peserta didik yang berhalangan.',
    ]),
    keputusan: daftar([
      'Jadwal dan susunan panitia ditetapkan dan disosialisasikan kepada peserta didik dan orang tua.',
      'Seluruh pengawas wajib menjaga ketertiban dan kejujuran pelaksanaan ujian.',
      'Peserta didik berhalangan karena alasan sah diberi kesempatan ujian susulan.',
    ]),
    tindak_lanjut: daftar([
      'Panitia menyelesaikan seluruh persiapan paling lambat sebelum hari pelaksanaan.',
      'Kepala sekolah memantau pelaksanaan ujian dan melaporkan hasilnya.',
    ]),
  },
  'Rapat Penyusunan RKAS / RKT': {
    pembahasan: rangka([
      'Paparan pagu anggaran dan sumber dana yang tersedia.',
      'Hasil evaluasi diri sekolah sebagai dasar penentuan prioritas program.',
      'Penyusunan rencana kegiatan dan rincian anggaran sesuai delapan standar nasional pendidikan.',
      'Pembagian anggaran per tahap dan jadwal pelaksanaan kegiatan.',
    ]),
    keputusan: daftar([
      'Program prioritas dan rincian anggaran disepakati sesuai pagu yang tersedia.',
      'Penggunaan dana mengikuti ketentuan juknis dan dilaporkan secara transparan.',
      'RKAS dan RKT disahkan oleh kepala sekolah dengan persetujuan komite sekolah.',
    ]),
    tindak_lanjut: daftar([
      'Bendahara menginput RKAS ke aplikasi ARKAS sesuai hasil rapat.',
      'Kepala sekolah menandatangani dokumen RKAS dan RKT yang telah disahkan.',
    ]),
  },
  'Rapat dengan Komite / Orang Tua': {
    pembahasan: rangka([
      'Kepala sekolah menyampaikan program dan perkembangan sekolah.',
      'Pemaparan penggunaan dana dan rencana kegiatan sekolah.',
      'Masukan, saran, dan aspirasi dari komite sekolah dan orang tua.',
      'Kerja sama sekolah dan orang tua dalam mendukung pembelajaran dan pembinaan karakter.',
    ]),
    keputusan: daftar([
      'Program sekolah yang disampaikan disetujui dan didukung oleh komite dan orang tua.',
      'Saran dan masukan peserta rapat ditampung dan dijadikan bahan perbaikan sekolah.',
      'Komunikasi sekolah dan orang tua terus ditingkatkan melalui wali kelas.',
    ]),
    tindak_lanjut: daftar([
      'Sekolah menindaklanjuti masukan peserta rapat sesuai kemampuan dan kewenangan.',
      'Hasil rapat disampaikan kepada orang tua yang tidak hadir melalui wali kelas.',
    ]),
  },
  'Rapat Lainnya': {
    pembahasan: rangka([
      '[Butir pembahasan pertama]',
      '[Butir pembahasan kedua]',
      '[Tanggapan dan masukan peserta rapat]',
    ]),
    keputusan: daftar(['[Keputusan pertama]', '[Keputusan kedua]']),
    tindak_lanjut: daftar(['[Tindak lanjut dan penanggung jawab]']),
  },
}

const semuaPembahasan = Object.values(TEMPLATE_NOTULEN).map((t) => t.pembahasan)
const semuaKeputusan = Object.values(TEMPLATE_NOTULEN).map((t) => t.keputusan)
const semuaTindakNotulen = Object.values(TEMPLATE_NOTULEN).map((t) => t.tindak_lanjut)

/** Panggil setiap field notulen berubah. Saat jenis rapat dipilih, format notulen terisi. */
export function autoIsiNotulen(prev, k, v) {
  const next = { ...prev, [k]: v }
  if (k !== 'jenis_rapat') return next
  const t = TEMPLATE_NOTULEN[v]
  if (!t) return next
  if (bolehTimpa(prev.pembahasan, semuaPembahasan)) next.pembahasan = t.pembahasan
  if (bolehTimpa(prev.keputusan, semuaKeputusan)) next.keputusan = t.keputusan
  if (bolehTimpa(prev.tindak_lanjut, semuaTindakNotulen)) next.tindak_lanjut = t.tindak_lanjut
  return next
}
