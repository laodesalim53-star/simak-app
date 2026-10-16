// Pilihan isi otomatis untuk halaman Buku Kerja Kepala Sekolah.
// Ubah/tambah teks sesuai kebutuhan sekolah. Format: { label, nilai: { ...kolom } }.
// Nama kolom di `nilai` HARUS sama dengan nama field baris di state halaman Anda.
// (Dipakai di BukuKerjaKepsek.jsx: kegiatan, hasil, ket | bidang, program, target, waktu | topik, tindak)

export const PRESET_JURNAL = [
  { label: 'Memimpin apel / upacara bendera', nilai: { kegiatan: 'Memimpin apel pagi / upacara bendera hari Senin', hasil: 'Apel berjalan tertib; disampaikan pengarahan kedisiplinan', ket: '' } },
  { label: 'Memeriksa kehadiran guru dan siswa', nilai: { kegiatan: 'Memeriksa daftar hadir guru, tenaga kependidikan, dan siswa', hasil: 'Kehadiran terpantau; ketidakhadiran ditindaklanjuti', ket: '' } },
  { label: 'Supervisi kelas / kunjungan kelas', nilai: { kegiatan: 'Melaksanakan supervisi pembelajaran di kelas', hasil: 'Hasil pengamatan dicatat; umpan balik diberikan kepada guru', ket: '' } },
  { label: 'Rapat dewan guru', nilai: { kegiatan: 'Memimpin rapat dewan guru', hasil: 'Keputusan rapat dicatat dalam notulen dan disosialisasikan', ket: '' } },
  { label: 'Menyusun / memeriksa administrasi sekolah', nilai: { kegiatan: 'Memeriksa dan menandatangani administrasi sekolah', hasil: 'Dokumen administrasi lengkap dan tertata', ket: '' } },
  { label: 'Mengelola dana BOS', nilai: { kegiatan: 'Memeriksa pembukuan dan realisasi dana BOS', hasil: 'BKU, bukti belanja, dan laporan tercatat sesuai ketentuan', ket: '' } },
  { label: 'Menerima tamu / dinas', nilai: { kegiatan: 'Menerima kunjungan tamu / pengawas / instansi terkait', hasil: 'Kunjungan dicatat di buku tamu; hasil pertemuan ditindaklanjuti', ket: '' } },
  { label: 'Menghadiri undangan / rapat dinas', nilai: { kegiatan: 'Menghadiri undangan rapat / pembinaan dari Dinas Pendidikan', hasil: 'Informasi dan arahan disampaikan kepada guru', ket: '' } },
  { label: 'Pembinaan guru', nilai: { kegiatan: 'Melakukan pembinaan kepada guru dan tenaga kependidikan', hasil: 'Guru memahami arahan; perbaikan dijadwalkan', ket: '' } },
  { label: 'Pemeriksaan sarana dan prasarana', nilai: { kegiatan: 'Memeriksa kondisi sarana, prasarana, dan kebersihan sekolah', hasil: 'Kerusakan dicatat dan diusulkan perbaikan', ket: '' } },
]

export const PRESET_PROGRAM = [
  { label: 'Kurikulum: menyusun KOSP dan perangkat ajar', nilai: { bidang: 'Kurikulum', program: 'Menyusun dan mengevaluasi KOSP, modul ajar, dan jadwal pelajaran', target: '100% guru memiliki perangkat ajar', waktu: 'Juli', ket: '' } },
  { label: 'Kesiswaan: penerimaan peserta didik baru', nilai: { bidang: 'Kesiswaan', program: 'Pelaksanaan penerimaan peserta didik baru dan masa orientasi', target: 'Kuota kelas 1 terpenuhi', waktu: 'Juni - Juli', ket: '' } },
  { label: 'Kesiswaan: ekstrakurikuler', nilai: { bidang: 'Kesiswaan', program: 'Pembinaan kegiatan ekstrakurikuler dan pembiasaan karakter', target: 'Siswa aktif minimal 1 kegiatan', waktu: 'Sepanjang semester', ket: '' } },
  { label: 'Tenaga pendidik: supervisi akademik', nilai: { bidang: 'Tenaga Pendidik', program: 'Supervisi akademik dan pembinaan guru', target: 'Setiap guru disupervisi minimal 1 kali per semester', waktu: 'Agustus - November', ket: '' } },
  { label: 'Tenaga pendidik: peningkatan kompetensi', nilai: { bidang: 'Tenaga Pendidik', program: 'Mengikutsertakan guru dalam pelatihan / KKG / pengembangan diri', target: 'Setiap guru mengikuti minimal 1 pelatihan', waktu: 'Sepanjang semester', ket: '' } },
  { label: 'Sarana prasarana: pemeliharaan', nilai: { bidang: 'Sarana Prasarana', program: 'Pemeliharaan dan perbaikan sarana prasarana sekolah', target: 'Sarana layak pakai', waktu: 'Sepanjang semester', ket: '' } },
  { label: 'Keuangan: pengelolaan dana BOS', nilai: { bidang: 'Keuangan', program: 'Pengelolaan dan pelaporan dana BOS secara transparan', target: 'Laporan tepat waktu dan sesuai RKAS', waktu: 'Tiap triwulan', ket: '' } },
  { label: 'Hubungan masyarakat: komite sekolah', nilai: { bidang: 'Hubungan Masyarakat', program: 'Rapat dan koordinasi dengan komite sekolah dan orang tua', target: 'Minimal 2 kali per semester', waktu: 'Agustus, Desember', ket: '' } },
  { label: 'Administrasi: tata usaha dan laporan', nilai: { bidang: 'Administrasi', program: 'Penataan administrasi sekolah dan pelaporan rutin (Dapodik, laporan bulanan)', target: 'Data valid dan tepat waktu', waktu: 'Sepanjang semester', ket: '' } },
]

export const PRESET_PEMBINAAN = [
  { label: 'Kelengkapan perangkat pembelajaran', nilai: { topik: 'Kelengkapan dan kualitas perangkat pembelajaran (modul ajar, ATP, asesmen)', tindak: 'Guru melengkapi perangkat dan menyerahkan kepada kepala sekolah' } },
  { label: 'Kedisiplinan dan kehadiran', nilai: { topik: 'Kedisiplinan dan ketepatan waktu kehadiran', tindak: 'Pemantauan kehadiran rutin dan teguran lisan bila diperlukan' } },
  { label: 'Metode dan media pembelajaran', nilai: { topik: 'Penggunaan metode dan media pembelajaran yang variatif', tindak: 'Guru menerapkan metode baru; dipantau pada supervisi berikutnya' } },
  { label: 'Pelaksanaan asesmen', nilai: { topik: 'Pelaksanaan asesmen diagnostik, formatif, dan sumatif', tindak: 'Guru menyusun rekap nilai dan rencana remedial' } },
  { label: 'Administrasi kelas', nilai: { topik: 'Kelengkapan administrasi kelas (absensi, jurnal, daftar nilai)', tindak: 'Administrasi dilengkapi paling lambat satu minggu' } },
  { label: 'Pengelolaan kelas dan karakter siswa', nilai: { topik: 'Pengelolaan kelas dan pembiasaan karakter siswa', tindak: 'Guru menerapkan tata tertib kelas dan pembiasaan harian' } },
  { label: 'Pengembangan diri guru', nilai: { topik: 'Pengembangan kompetensi guru (pelatihan, PMM, KKG)', tindak: 'Guru mengikuti pelatihan dan membagikan hasilnya kepada rekan' } },
  { label: 'Pemanfaatan teknologi', nilai: { topik: 'Pemanfaatan teknologi dalam pembelajaran dan administrasi', tindak: 'Pendampingan penggunaan aplikasi pendukung' } },
]
