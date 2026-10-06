// KOSP (Kurikulum Operasional Satuan Pendidikan) JENJANG SD
// Format mengikuti CONFIG.kosp: bagian, tahun_ajaran, uraian, status, tautan.
// Teks dalam [KURUNG SIKU] = isi sesuai kondisi sekolah Anda sebelum status diubah ke "Final".
// Nilai `bagian` harus persis sama dengan opsi di CONFIG.kosp.

const TA = '2026/2027'

export const KOSP_SD = [
  {
    bagian: 'Analisis Konteks',
    tahun_ajaran: TA,
    status: 'Draf',
    tautan: '',
    uraian: `A. Karakteristik Satuan Pendidikan
Nama sekolah: [NAMA SD], NPSN [NPSN], akreditasi [PERINGKAT/TAHUN].
Alamat: [ALAMAT LENGKAP]. Status: [NEGERI/SWASTA].
Jumlah peserta didik: [JUMLAH] siswa dalam [JUMLAH] rombongan belajar (kelas 1 s.d. 6).
Pendidik dan tenaga kependidikan: [JUMLAH GURU KELAS], [JUMLAH GURU MAPEL (PAI, PJOK, dll)], [JUMLAH TENDIK].
Sarana dan prasarana: [RUANG KELAS, PERPUSTAKAAN, LAB/RUANG KOMPUTER, UKS, LAPANGAN, SUMBER AIR, LISTRIK, INTERNET].

B. Konteks Lingkungan dan Sosial Budaya
Lingkungan sekolah berada di [DESA/KELURAHAN, KECAMATAN, KABUPATEN]. Mata pencaharian utama orang tua: [MISAL: NELAYAN/PETANI/PNS/WIRASWASTA].
Potensi daerah yang dapat menjadi sumber belajar: [MISAL: LAUT, HUTAN, BUDAYA/ADAT SETEMPAT, SENTRA USAHA, SITUS SEJARAH].
Bahasa sehari-hari peserta didik: [BAHASA DAERAH/INDONESIA]. Tantangan geografis dan akses: [JARAK, TRANSPORTASI, CUACA].

C. Karakteristik Peserta Didik
Kemampuan awal literasi dan numerasi berdasarkan asesmen diagnostik dan hasil Asesmen Nasional/rapor pendidikan: [RINGKAS HASIL, MISAL % KELAS 1-2 BELUM LANCAR MEMBACA].
Latar belakang keluarga, minat, dan kebutuhan belajar khusus: [RINGKAS].
Kehadiran dan partisipasi peserta didik: [RINGKAS].

D. Hasil Evaluasi Diri dan Rapor Pendidikan
Capaian yang sudah baik: [MISAL: KARAKTER, KEAMANAN SEKOLAH].
Capaian yang perlu ditingkatkan: [MISAL: LITERASI, NUMERASI, KUALITAS PEMBELAJARAN].
Prioritas perbaikan tahun ini: [2-3 PRIORITAS].

E. Peluang dan Tantangan
Peluang: dukungan komite sekolah, dukungan pemerintah daerah, dana BOSP, platform pembelajaran digital, pelatihan guru.
Tantangan: [MISAL: KETERBATASAN JUMLAH GURU, INTERNET, SARANA, KEHADIRAN SISWA].

F. Dasar Hukum
1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
2. Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan beserta perubahannya.
3. Peraturan Menteri yang berlaku tentang Standar Isi, Standar Proses, dan Standar Penilaian Pendidikan.
4. Keputusan Menteri tentang Kurikulum pada PAUD, Pendidikan Dasar, dan Pendidikan Menengah beserta Capaian Pembelajaran yang berlaku.
5. Peraturan Menteri tentang Petunjuk Teknis Pengelolaan BOSP yang berlaku.
[Periksa dan sesuaikan nomor dan tahun regulasi dengan ketentuan terbaru dari Kemendikdasmen.]`,
  },

  {
    bagian: 'Visi, Misi, Tujuan',
    tahun_ajaran: TA,
    status: 'Draf',
    tautan: '',
    uraian: `A. Visi Satuan Pendidikan
"[RUMUSAN VISI SEKOLAH]"
Contoh arah rumusan: Terwujudnya peserta didik yang beriman dan bertakwa, berakhlak mulia, cerdas, mandiri, gotong royong, dan cinta lingkungan.

B. Misi Satuan Pendidikan
1. Menanamkan nilai keimanan, ketakwaan, dan akhlak mulia melalui pembiasaan sehari-hari.
2. Melaksanakan pembelajaran yang berpusat pada peserta didik, bermakna, dan menyenangkan.
3. Menguatkan literasi dan numerasi sebagai dasar kemampuan belajar sepanjang hayat.
4. Mengembangkan karakter Profil Pelajar Pancasila melalui projek penguatan dan kegiatan pembiasaan.
5. Memanfaatkan potensi dan budaya lokal sebagai sumber belajar.
6. Mewujudkan lingkungan sekolah yang bersih, aman, nyaman, dan ramah anak.
7. Membangun kemitraan yang kuat dengan orang tua, komite sekolah, dan masyarakat.
[Sesuaikan jumlah dan redaksi misi dengan dokumen visi misi sekolah yang sudah ditetapkan.]

C. Tujuan Satuan Pendidikan
Tujuan jangka menengah (4 tahun):
1. Seluruh peserta didik kelas 3 ke atas lancar membaca dan menulis; [TARGET]% mencapai kompetensi minimum literasi dan numerasi.
2. Seluruh peserta didik mengikuti projek penguatan profil pelajar Pancasila minimal [JUMLAH] projek per tahun.
3. Seluruh guru menerapkan asesmen diagnostik dan pembelajaran berdiferensiasi secara berkala.
4. Terwujud lingkungan sekolah yang bersih, aman, dan bebas perundungan.
5. Meningkatnya keterlibatan orang tua dalam mendukung belajar anak di rumah.

Tujuan tahun ajaran ini:
[RINCIAN TARGET TERUKUR TAHUN INI, MISAL: KEHADIRAN SISWA ≥ 95%; SELURUH KELAS 1 LANCAR MEMBACA PADA AKHIR SEMESTER 2].

D. Profil Pelajar Pancasila yang Dikembangkan
Beriman, bertakwa kepada Tuhan Yang Maha Esa, dan berakhlak mulia; berkebinekaan global; bergotong royong; mandiri; bernalar kritis; dan kreatif.
Penekanan sekolah: [PILIH 2-3 DIMENSI SESUAI KONTEKS].
[Jika sekolah sudah mengadopsi rumusan dimensi profil lulusan yang lebih baru, sesuaikan istilahnya.]`,
  },

  {
    bagian: 'Pengorganisasian Pembelajaran',
    tahun_ajaran: TA,
    status: 'Draf',
    tautan: '',
    uraian: `A. Struktur Kurikulum SD
Pembelajaran diorganisasikan dalam tiga fase:
- Fase A: kelas 1 dan 2
- Fase B: kelas 3 dan 4
- Fase C: kelas 5 dan 6

Muatan intrakurikuler:
1. Pendidikan Agama dan Budi Pekerti (PAI atau agama lain sesuai peserta didik)
2. Pendidikan Pancasila
3. Bahasa Indonesia
4. Matematika
5. Ilmu Pengetahuan Alam dan Sosial (IPAS), mulai kelas 3
6. Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)
7. Seni (pilihan satu: Musik, Seni Rupa, Teater, atau Tari)
8. Bahasa Inggris (pilihan/ sesuai kesiapan sekolah)
9. Muatan Lokal: [NAMA MUATAN LOKAL, MISAL BAHASA DAERAH/ KEARIFAN LOKAL]

Muatan kokurikuler/ projek penguatan profil pelajar Pancasila dialokasikan sekitar 20-30% dari total jam pelajaran per tahun dan dilaksanakan dengan tema: [TEMA PROJEK, MISAL: GAYA HIDUP BERKELANJUTAN, KEARIFAN LOKAL, BANGUNLAH JIWA DAN RAGANYA].
Ekstrakurikuler: Pramuka (wajib), [PILIHAN LAIN: OLAHRAGA, SENI, TILAWAH/KEROHANIAN, DLL].

B. Beban Belajar dan Hari Efektif
Satu jam pelajaran (JP) = 35 menit.
Alokasi jam pelajaran per minggu dan per tahun mengikuti struktur kurikulum yang berlaku: [LAMPIRKAN TABEL JP PER MAPEL PER KELAS SESUAI JADWAL SEKOLAH].
Hari belajar: [SENIN-SABTU/ SENIN-JUMAT]. Jam masuk: [JAM], jam pulang: [JAM].
Kalender pendidikan mengikuti kalender dari dinas pendidikan dan disesuaikan dengan agenda sekolah (lihat halaman Kalender Pendidikan).

C. Pengorganisasian Pembelajaran
1. Sistem guru kelas untuk kelas 1-6; guru mata pelajaran untuk PAI dan PJOK dan [LAINNYA].
2. Pembelajaran tematik/ terpadu pada fase A, serta pembelajaran per mapel dengan keterpaduan tema pada fase B dan C sesuai kebijakan sekolah.
3. Pembelajaran berdiferensiasi sesuai kesiapan, minat, dan gaya belajar peserta didik.
4. Penguatan literasi dan numerasi melalui gerakan membaca 15 menit sebelum pembelajaran dan pembiasaan berhitung.
5. Pembelajaran memanfaatkan lingkungan sekitar dan potensi lokal.
6. Pembiasaan karakter: salat/ibadah sesuai agama, 5S (senyum, sapa, salam, sopan, santun), piket kebersihan, upacara bendera, [LAINNYA].

D. Pengelolaan Pembelajaran Fase Awal (Kelas 1)
Masa pengenalan lingkungan sekolah pada minggu-minggu awal, transisi PAUD ke SD yang menyenangkan, serta penguatan membaca, menulis, dan berhitung permulaan secara bertahap.

E. Penugasan Guru
Pembagian tugas mengajar, wali kelas, dan tugas tambahan ditetapkan melalui SK Kepala Sekolah pada awal tahun ajaran (lihat Administrasi Kepala Sekolah dan Buku Kerja).`,
  },

  {
    bagian: 'Perencanaan Pembelajaran',
    tahun_ajaran: TA,
    status: 'Draf',
    tautan: '',
    uraian: `A. Alur Perencanaan
Capaian Pembelajaran (CP) → Tujuan Pembelajaran (TP) → Alur Tujuan Pembelajaran (ATP) → Modul Ajar/ Rencana Pembelajaran → Asesmen.

B. Penyusunan Alur Tujuan Pembelajaran dan Modul Ajar
1. Guru menyusun atau mengadaptasi ATP per mata pelajaran dan fase dari CP yang berlaku, secara mandiri atau kolaboratif melalui Komunitas Belajar/ KKG gugus.
2. Guru menyusun modul ajar atau rencana pembelajaran yang memuat: tujuan, kompetensi awal, pemahaman bermakna, kegiatan pembelajaran, asesmen, dan pengayaan/ remedial.
3. Guru boleh memakai modul ajar contoh dari Kemendikdasmen dengan menyesuaikannya pada konteks dan kebutuhan peserta didik.
4. Perangkat dikumpulkan dan diverifikasi kepala sekolah pada awal semester.

C. Asesmen
1. Asesmen diagnostik: kognitif (literasi, numerasi) dan non-kognitif (kesejahteraan, kondisi keluarga, gaya belajar) pada awal tahun ajaran dan awal topik jika diperlukan.
2. Asesmen formatif: observasi, tanya jawab, tugas, dan produk selama proses pembelajaran sebagai dasar tindak lanjut.
3. Asesmen sumatif: akhir lingkup materi, akhir semester, dan akhir tahun; dilengkapi sumatif akhir jenjang untuk kelas 6.
4. Kriteria ketercapaian tujuan pembelajaran (KKTP) ditetapkan guru dengan rubrik atau interval nilai: [CONTOH: BELUM TERCAPAI, SEDANG BERKEMBANG, CAKAP, MAHIR].

D. Pembelajaran Berdiferensiasi
Guru mengelompokkan peserta didik berdasarkan hasil diagnostik dan memberikan strategi yang sesuai (konten, proses, produk). Peserta didik yang belum mencapai kompetensi mendapat pendampingan tambahan/ remedial; yang sudah melampaui mendapat pengayaan.

E. Perencanaan Projek Penguatan Profil Pelajar Pancasila
Tema, durasi, dan jadwal projek per fase ditetapkan oleh tim fasilitator projek dan disahkan kepala sekolah: [TEMA 1], [TEMA 2], [TEMA 3].

F. Perencanaan Penilaian Hasil Belajar dan Rapor
1. Pelaporan hasil belajar berupa rapor di akhir semester, memuat capaian kompetensi tiap mata pelajaran dan deskripsi capaian projek serta ekstrakurikuler.
2. Kriteria kenaikan kelas dan kelulusan mengikuti peraturan yang berlaku dan kebijakan sekolah: [KRITERIA KENAIKAN KELAS SEKOLAH].

G. Perencanaan Pembelajaran Inklusif
Peserta didik berkebutuhan khusus (jika ada) dilayani dengan adaptasi pembelajaran, bekerja sama dengan orang tua dan pihak terkait: [RINGKAS KONDISI SEKOLAH].`,
  },

  {
    bagian: 'Pendampingan dan Evaluasi',
    tahun_ajaran: TA,
    status: 'Draf',
    tautan: '',
    uraian: `A. Pendampingan
1. Supervisi akademik oleh kepala sekolah minimal [JUMLAH] kali per guru per semester, mencakup perencanaan, pelaksanaan, dan asesmen pembelajaran; diikuti refleksi dan tindak lanjut (lihat halaman Supervisi Akademik).
2. Komunitas belajar sekolah dan KKG gugus untuk berbagi praktik baik, menyusun perangkat bersama, dan membahas hasil asesmen: jadwal [MINGGU/ BULAN].
3. Pendampingan guru baru dan guru yang membutuhkan penguatan oleh guru pengimbas atau pengawas sekolah.
4. Pemanfaatan platform belajar mandiri bagi guru serta pelatihan: [DAFTAR PELATIHAN YANG DIRENCANAKAN].
5. Pendampingan peserta didik oleh wali kelas dan guru: bimbingan belajar tambahan untuk literasi dan numerasi, serta pembinaan karakter.

B. Evaluasi Pelaksanaan Kurikulum
1. Evaluasi internal dilakukan setiap akhir semester melalui rapat dewan guru dengan menelaah: hasil asesmen peserta didik, pelaksanaan pembelajaran, pelaksanaan projek, kehadiran, dan ketercapaian target sekolah.
2. Evaluasi tahunan menggunakan data rapor pendidikan, hasil Asesmen Nasional, dan evaluasi diri sekolah (lihat halaman Evaluasi Diri Sekolah).
3. Sumber data evaluasi: observasi pembelajaran, dokumen perangkat, angket/ masukan peserta didik, guru, dan orang tua, serta catatan di Buku Kerja Kepala Sekolah.

C. Indikator Keberhasilan
- Persentase peserta didik mencapai kompetensi minimum literasi dan numerasi: target [ANGKA]%.
- Persentase guru yang memiliki perangkat ajar lengkap dan menerapkan asesmen diagnostik: target [ANGKA]%.
- Kehadiran peserta didik: target ≥ [ANGKA]%.
- Pelaksanaan projek penguatan profil pelajar Pancasila: [JUMLAH] projek selesai dan terdokumentasi.
- Kepuasan orang tua dan peserta didik terhadap layanan sekolah: [ANGKA/ KATEGORI].

D. Tindak Lanjut dan Revisi KOSP
Hasil evaluasi menjadi dasar perbaikan program dan revisi KOSP setiap tahun ajaran (atau saat ada perubahan kebijakan/ kondisi). Revisi dilakukan oleh tim pengembang kurikulum bersama guru, komite sekolah, dan disahkan kepala sekolah.

E. Pelaporan
Laporan pelaksanaan kurikulum dan hasil evaluasi disampaikan kepada dewan guru, komite sekolah, orang tua, dan dinas pendidikan sesuai ketentuan.`,
  },

  {
    bagian: 'Lainnya',
    tahun_ajaran: TA,
    status: 'Draf',
    tautan: '',
    uraian: `Penutup dan Pengesahan
Dokumen KOSP [NAMA SD] Tahun Ajaran ${TA} disusun oleh Tim Pengembang Kurikulum bersama dewan guru dengan melibatkan komite sekolah, dan menjadi acuan seluruh warga sekolah dalam merencanakan serta melaksanakan pembelajaran.

Tim Pengembang Kurikulum:
Ketua: [NAMA KEPALA SEKOLAH]
Sekretaris: [NAMA]
Anggota: [NAMA GURU/ KOMITE SEKOLAH]

Ditetapkan di: [KOTA/ KABUPATEN]
Tanggal: [TANGGAL PENETAPAN]
Kepala Sekolah, [NAMA] NIP. [NIP]
Mengetahui/ Mengesahkan: Pengawas Sekolah atau Dinas Pendidikan setempat [NAMA/ NIP].

Lampiran yang disarankan: SK Tim Pengembang Kurikulum, kalender pendidikan, struktur kurikulum dan alokasi JP, ATP, modul ajar, daftar projek P5, dan jadwal pelajaran.`,
  },
]

// ---------------------------------------------------------------------------
// Opsional: muat sekaligus ke tabel administrasi_kepsek.
// SESUAIKAN bentuk baris dengan kolom tabel Anda (contoh di bawah mengasumsikan
// kolom `jenis`, `tanggal`, dan kolom `data` bertipe JSONB). Jika field disimpan
// sebagai kolom terpisah, ubah objek `baris`. Tambahkan juga kolom tenant/sekolah
// bila halaman lain Anda memakainya.
export async function muatKOSPSD(supabase, extra = {}) {
  const baris = KOSP_SD.map((d) => ({
    jenis: 'kosp',
    tanggal: new Date().toISOString().slice(0, 10),
    data: d,
    ...extra,
  }))
  const { error } = await supabase.from('administrasi_kepsek').insert(baris)
  if (error) throw error
  return baris.length
}
