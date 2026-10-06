// Konfigurasi halaman Administrasi Kepala Sekolah.
// Semua data disimpan di satu tabel: administrasi_kepsek (kolom `jenis` = kunci di bawah).
// Field: k=kunci, l=label, t=tipe (text|textarea|date|time|number|rp|select|guru),
//        o=opsi (select), req=wajib, tab=tampil di tabel & cetak.
const f = (k, l, t = 'text', extra = {}) => ({ k, l, t, ...extra })
const STATUS = ['Draf', 'Final']
const PREDIKAT = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang']
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export const CONFIG = {
  kosp: {
    judul: 'KOSP', ket: 'Kurikulum Operasional Satuan Pendidikan', tanggalLabel: 'Tanggal Penetapan',
    fields: [
      f('bagian', 'Bagian Dokumen', 'select', { o: ['Analisis Konteks', 'Visi, Misi, Tujuan', 'Pengorganisasian Pembelajaran', 'Perencanaan Pembelajaran', 'Pendampingan dan Evaluasi', 'Lainnya'], req: 1, tab: 1 }),
      f('tahun_ajaran', 'Tahun Ajaran', 'text', { req: 1, tab: 1 }),
      f('uraian', 'Uraian', 'textarea', { tab: 1 }),
      f('status', 'Status', 'select', { o: STATUS, tab: 1 }),
      f('tautan', 'Tautan Berkas (opsional)'),
    ],
  },
  rkt: {
    judul: 'RKT', ket: 'Rencana Kerja Tahunan', tanggalLabel: 'Tanggal Disusun',
    // Tombol "Tarik Data Otomatis" (di halaman) menyusun draf dari RKAS, Kalender,
    // Inventaris, Evaluasi Diri, KOSP, data siswa, dan guru. Jenjang dibaca dari profil sekolah.
    // Field "Data ARKAS" di bawah dipakai tombol "Tarik dari RKT" di halaman RKAS.
    fields: [
      f('jenjang', 'Jenjang', 'select', { o: ['SD', 'SMP'], tab: 1 }),
      f('tahun', 'Tahun Anggaran', 'text', { req: 1 }),
      f('program', 'Program', 'text', { req: 1, tab: 1 }),
      f('kegiatan', 'Kegiatan', 'textarea', { req: 1, tab: 1 }),
      f('sasaran', 'Sasaran / Target', 'text', { tab: 1 }),
      f('pj', 'Penanggung Jawab', 'text', { tab: 1 }),
      f('waktu', 'Waktu Pelaksanaan', 'text', { tab: 1 }),
      f('anggaran', 'Anggaran', 'rp', { tab: 1 }),
      f('komponen', 'Komponen (ARKAS)'),
      f('kode_kegiatan', 'Kode Kegiatan (ARKAS)'),
      f('kode_rekening', 'Kode Rekening (ARKAS)'),
      f('volume', 'Volume (ARKAS)', 'number'),
      f('satuan', 'Satuan (ARKAS)'),
      f('bulan', 'Bulan (ARKAS)', 'select', { o: BULAN }),
      f('tahap', 'Tahap (ARKAS)', 'select', { o: ['Tahap 1', 'Tahap 2'] }),
      f('sumber_data', 'Sumber Data', 'select', { o: ['Manual', 'KOSP', 'RKAS', 'Kalender', 'Inventaris', 'Evaluasi Diri', 'Data Siswa', 'Data Guru'] }),
      f('status', 'Status', 'select', { o: ['Rencana', 'Berjalan', 'Selesai'] }),
    ],
  },
  rkas: {
    judul: 'RKAS', ket: 'Rencana Kegiatan dan Anggaran Sekolah', tanggalLabel: 'Tanggal',
    fields: [
      f('tahun', 'Tahun Anggaran', 'text', { req: 1 }),
      f('sumber', 'Sumber Dana', 'select', { o: ['BOS Reguler', 'BOS Kinerja', 'BOS Afirmasi', 'Lainnya'], tab: 1 }),
      // Tiga field di bawah dirender khusus di form (isian kode dengan saran dari tabel referensi).
      // Posisi `komponen` menentukan letak isian kode di form.
      f('komponen', 'Komponen'),
      f('kode_kegiatan', 'Kode Kegiatan', 'text', { tab: 1 }),
      f('kode_rekening', 'Kode Rekening'),
      f('uraian', 'Uraian Kegiatan', 'textarea', { req: 1, tab: 1 }),
      f('volume', 'Volume', 'number', { tab: 1 }),
      f('satuan', 'Satuan', 'text', { tab: 1 }),
      f('harga', 'Harga Satuan', 'rp'),
      f('jumlah', 'Jumlah', 'rp', { tab: 1 }),
      f('bulan', 'Bulan', 'select', { o: BULAN }),
      f('tahap', 'Tahap', 'select', { o: ['Tahap 1', 'Tahap 2'], tab: 1 }),
    ],
  },
  'kalender-pendidikan': {
    judul: 'Kalender Pendidikan', ket: 'Hari efektif dan agenda tahunan', tanggalLabel: 'Tanggal Mulai',
    fields: [
      f('kegiatan', 'Kegiatan', 'text', { req: 1, tab: 1 }),
      f('selesai', 'Tanggal Selesai', 'date', { tab: 1 }),
      f('jenis', 'Jenis', 'select', { o: ['Hari Efektif', 'Libur', 'Ujian', 'Kegiatan Sekolah', 'Rapat'], tab: 1 }),
      f('keterangan', 'Keterangan', 'textarea', { tab: 1 }),
    ],
  },
  'buku-induk-siswa': {
    judul: 'Buku Induk Siswa', ket: 'Data lengkap siswa sejak masuk sampai lulus', tanggalLabel: 'Tanggal Masuk',
    // Impor dari tabel siswa. Kolom nama di tabel siswa adalah `nama_lengkap`.
    impor: { tabel: 'siswa', tanggal: 'tanggal_masuk', peta: { nama: 'nama_lengkap', nis: 'nis', nisn: 'nisn', kelas: 'kelas', jk: 'jenis_kelamin', tempat_lahir: 'tempat_lahir', tanggal_lahir: 'tanggal_lahir', agama: 'agama', alamat: 'alamat', nama_ayah: 'nama_ayah', nama_ibu: 'nama_ibu' } },
    fields: [
      f('nama', 'Nama Lengkap', 'text', { req: 1, tab: 1 }),
      f('nis', 'NIS', 'text', { tab: 1 }),
      f('nisn', 'NISN', 'text', { tab: 1 }),
      f('kelas', 'Kelas', 'text', { tab: 1 }),
      f('jk', 'Jenis Kelamin', 'select', { o: ['Laki-laki', 'Perempuan'], tab: 1 }),
      f('tempat_lahir', 'Tempat Lahir'),
      f('tanggal_lahir', 'Tanggal Lahir', 'date'),
      f('agama', 'Agama'),
      f('alamat', 'Alamat', 'textarea'),
      f('nama_ayah', 'Nama Ayah'),
      f('nama_ibu', 'Nama Ibu'),
      f('pekerjaan_ortu', 'Pekerjaan Orang Tua'),
      f('asal_sekolah', 'Asal Sekolah / TK'),
      f('status', 'Status', 'select', { o: ['Aktif', 'Lulus', 'Pindah', 'Keluar'], tab: 1 }),
      f('keterangan', 'Keterangan', 'textarea'),
    ],
  },
  // Mutasi Siswa: kolom identitas diisi otomatis dari Data Siswa lewat kotak cari di form
  // (lihat pilihSiswa di AdministrasiKepsekItem.jsx). Tetap bisa diisi manual.
  'mutasi-siswa': {
    judul: 'Mutasi Siswa', ket: 'Siswa masuk, pindah, dan keluar', tanggalLabel: 'Tanggal Mutasi',
    fields: [
      f('nama', 'Nama Siswa', 'text', { req: 1, tab: 1 }),
      f('nis', 'NIS'),
      f('nisn', 'NISN'),
      f('kelas', 'Kelas', 'text', { tab: 1 }),
      f('jk', 'Jenis Kelamin', 'select', { o: ['Laki-laki', 'Perempuan'] }),
      f('tempat_lahir', 'Tempat Lahir'),
      f('tanggal_lahir', 'Tanggal Lahir', 'date'),
      f('nama_ortu', 'Nama Orang Tua / Wali'),
      f('jenis', 'Jenis Mutasi', 'select', { o: ['Masuk', 'Pindah', 'Keluar', 'Lulus'], req: 1, tab: 1 }),
      f('asal_tujuan', 'Asal / Sekolah Tujuan', 'text', { tab: 1 }),
      f('alasan', 'Alasan', 'textarea', { tab: 1 }),
      f('no_surat', 'No. Surat', 'text', { tab: 1 }),
    ],
  },
  'buku-tamu': {
    judul: 'Buku Tamu', ket: 'Catatan kunjungan tamu sekolah', tanggalLabel: 'Tanggal Kunjungan',
    fields: [
      f('nama', 'Nama Tamu', 'text', { req: 1, tab: 1 }),
      f('instansi', 'Instansi / Alamat', 'text', { tab: 1 }),
      f('keperluan', 'Keperluan', 'textarea', { req: 1, tab: 1 }),
      f('bertemu', 'Bertemu Dengan', 'text', { tab: 1 }),
      f('jam_datang', 'Jam Datang', 'time', { tab: 1 }),
      f('jam_pulang', 'Jam Pulang', 'time', { tab: 1 }),
      f('no_hp', 'No. HP'),
    ],
  },
  'agenda-surat': {
    judul: 'Agenda Surat', ket: 'Surat masuk dan surat keluar', tanggalLabel: 'Tanggal Diterima / Dikirim',
    // Impor dari halaman Surat Masuk & Keluar (tabel `surat`). Yang sudah ada dilewati.
    imporTabel: {
      tabel: 'surat', label: 'Impor dari Surat Masuk & Keluar',
      kunci: (d, t) => `${d.jenis}|${d.no_surat}|${d.perihal}|${t || ''}`,
      ubah: (s) => ({
        tanggal: s.tanggal || null,
        data: {
          jenis: s.jenis === 'keluar' ? 'Surat Keluar' : 'Surat Masuk',
          no_surat: s.nomor_surat || '-',
          tgl_surat: s.tanggal || '',
          asal_tujuan: s.pengirim_tujuan || '',
          perihal: s.perihal,
          keterangan: s.catatan || '',
        },
      }),
    },
    fields: [
      f('jenis', 'Jenis', 'select', { o: ['Surat Masuk', 'Surat Keluar'], req: 1, tab: 1 }),
      f('no_surat', 'Nomor Surat', 'text', { req: 1, tab: 1 }),
      f('tgl_surat', 'Tanggal Surat', 'date', { tab: 1 }),
      f('asal_tujuan', 'Asal / Tujuan', 'text', { tab: 1 }),
      f('perihal', 'Perihal', 'textarea', { req: 1, tab: 1 }),
      f('disposisi', 'Disposisi', 'textarea'),
      f('keterangan', 'Keterangan'),
    ],
  },
  'buku-kerja': {
    judul: 'Buku Kerja Kepala Sekolah', ket: 'Catatan kerja harian dan tugas pokok', tanggalLabel: 'Tanggal',
    fields: [
      f('kegiatan', 'Kegiatan', 'text', { req: 1, tab: 1 }),
      f('uraian', 'Uraian', 'textarea', { tab: 1 }),
      f('hasil', 'Hasil', 'textarea', { tab: 1 }),
      f('tindak_lanjut', 'Tindak Lanjut', 'textarea', { tab: 1 }),
    ],
  },
  'evaluasi-kinerja-guru': {
    judul: 'Evaluasi Kinerja Guru', ket: 'Penilaian kinerja guru (PKG)', tanggalLabel: 'Tanggal Penilaian',
    fields: [
      f('guru', 'Nama Guru', 'guru', { req: 1, tab: 1 }),
      f('semester', 'Semester / Tahun Ajaran', 'text', { tab: 1 }),
      f('nilai', 'Nilai', 'number', { tab: 1 }),
      f('predikat', 'Predikat', 'select', { o: PREDIKAT, tab: 1 }),
      f('catatan', 'Catatan Penilai', 'textarea', { tab: 1 }),
      f('tindak_lanjut', 'Tindak Lanjut / Pembinaan', 'textarea'),
    ],
  },
  'supervisi-akademik': {
    judul: 'Supervisi Akademik', ket: 'Kunjungan kelas dan tindak lanjutnya', tanggalLabel: 'Tanggal Supervisi',
    fields: [
      f('guru', 'Guru yang Disupervisi', 'guru', { req: 1, tab: 1 }),
      f('kelas', 'Kelas', 'text', { tab: 1 }),
      f('mapel', 'Mata Pelajaran', 'text', { tab: 1 }),
      f('temuan', 'Temuan', 'textarea', { tab: 1 }),
      f('rekomendasi', 'Rekomendasi', 'textarea', { tab: 1 }),
      f('tindak_lanjut', 'Tindak Lanjut', 'textarea'),
    ],
  },
  'kinerja-tendik': {
    judul: 'Kinerja Tenaga Kependidikan', ket: 'Penilaian kinerja tenaga kependidikan', tanggalLabel: 'Tanggal Penilaian',
    fields: [
      f('nama', 'Nama', 'text', { req: 1, tab: 1 }),
      f('jabatan', 'Jabatan', 'text', { tab: 1 }),
      f('nilai', 'Nilai', 'number', { tab: 1 }),
      f('predikat', 'Predikat', 'select', { o: PREDIKAT, tab: 1 }),
      f('catatan', 'Catatan', 'textarea', { tab: 1 }),
    ],
  },
  inventaris: {
    judul: 'Buku Inventaris', ket: 'Barang milik sekolah dan kondisinya', tanggalLabel: 'Tanggal Perolehan',
    // Impor dari halaman Inventaris (tabel `inventaris`). Yang sudah ada dilewati.
    imporTabel: {
      tabel: 'inventaris', label: 'Impor dari Data Inventaris',
      kunci: (d) => `${d.nama}|${d.lokasi || ''}`,
      ubah: (s) => ({
        tanggal: s.tanggal_masuk || null,
        data: {
          nama: s.nama_barang,
          jumlah: s.jumlah,
          kondisi: { baik: 'Baik', rusak_ringan: 'Rusak Ringan', rusak_berat: 'Rusak Berat' }[s.kondisi] || '',
          lokasi: s.lokasi || '',
          keterangan: [s.kategori, s.catatan].filter(Boolean).join(' - '),
        },
      }),
    },
    fields: [
      f('nama', 'Nama Barang', 'text', { req: 1, tab: 1 }),
      f('kode', 'Kode Barang', 'text', { tab: 1 }),
      f('jumlah', 'Jumlah', 'number', { tab: 1 }),
      f('kondisi', 'Kondisi', 'select', { o: ['Baik', 'Rusak Ringan', 'Rusak Berat'], tab: 1 }),
      f('sumber', 'Sumber Perolehan', 'text', { tab: 1 }),
      f('lokasi', 'Lokasi / Ruangan', 'text', { tab: 1 }),
      f('keterangan', 'Keterangan'),
    ],
  },
  'notulen-rapat': {
    judul: 'Notulen Rapat', ket: 'Catatan dan keputusan rapat', tanggalLabel: 'Tanggal Rapat',
    fields: [
      f('agenda', 'Agenda Rapat', 'text', { req: 1, tab: 1 }),
      f('tempat', 'Tempat', 'text', { tab: 1 }),
      f('pimpinan', 'Pimpinan Rapat', 'text'),
      f('peserta', 'Jumlah Peserta', 'number', { tab: 1 }),
      f('pembahasan', 'Pembahasan', 'textarea', { tab: 1 }),
      f('keputusan', 'Keputusan', 'textarea', { tab: 1 }),
    ],
  },
  'evaluasi-diri': {
    judul: 'Evaluasi Diri Sekolah', ket: 'Rapor mutu dan rencana perbaikan', tanggalLabel: 'Tanggal',
    fields: [
      f('standar', 'Standar', 'select', { o: ['Standar Kompetensi Lulusan', 'Standar Isi', 'Standar Proses', 'Standar Penilaian', 'Standar Pendidik dan Tendik', 'Standar Sarana Prasarana', 'Standar Pengelolaan', 'Standar Pembiayaan'], req: 1, tab: 1 }),
      f('capaian', 'Capaian Saat Ini', 'textarea', { tab: 1 }),
      f('bukti', 'Bukti / Data Dukung', 'textarea'),
      f('rencana', 'Rencana Perbaikan', 'textarea', { tab: 1 }),
      f('status', 'Status', 'select', { o: ['Belum', 'Proses', 'Tercapai'], tab: 1 }),
    ],
  },
}

// ---------------------------------------------------------------------
// OPSIONAL (patch tahap 3): Realisasi BOS / BKU.
// Hapus blok ini jika belum memakai halaman realisasi-bos.
// Ditaruh DI LUAR objek CONFIG, setelah tanda } penutup di atas.
// ---------------------------------------------------------------------
const opsi = (k) => CONFIG.rkas.fields.find((x) => x.k === k)?.o || []

CONFIG['realisasi-bos'] = {
  judul: 'Realisasi BOS (BKU)',
  ket: 'Catatan belanja yang sudah dibayar, padanan Penatausahaan di ARKAS. Dibandingkan dengan RKAS di halaman RKAS.',
  tanggalLabel: 'Tanggal Transaksi',
  fields: [
    f('tahun', 'Tahun Anggaran', 'text', { req: 1, tab: 1 }),
    f('sumber', 'Sumber Dana', 'select', { o: opsi('sumber'), req: 1, tab: 1 }),
    f('tahap', 'Tahap', 'select', { o: ['Tahap 1', 'Tahap 2'], req: 1, tab: 1 }),
    f('kode_kegiatan', 'Kode Kegiatan', 'text', { tab: 1 }),
    f('uraian', 'Uraian Transaksi', 'textarea', { req: 1, tab: 1 }),
    f('no_bukti', 'No. Bukti / Kuitansi', 'text', { tab: 1 }),
    f('kode_rekening', 'Kode Rekening'),
    f('belanja', 'Jumlah Belanja (Rp)', 'rp', { req: 1, tab: 1 }),
    f('pajak_dipungut', 'Pajak Dipungut (Rp)', 'rp'),
    f('pajak_disetor', 'Pajak Disetor (Rp)', 'rp'),
  ],
}
