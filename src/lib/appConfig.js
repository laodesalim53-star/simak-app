// ============================================================
// Konfigurasi per aplikasi. Tipe aktif ditentukan SAAT BUILD lewat
// VITE_APP_TIPE (lihat .env.sekolah / .env.kantor / .env.puskesmas / .env.polres).
//
// PENTING: di tempat lain, tulis perbandingan
// `import.meta.env.VITE_APP_TIPE === '...'` secara langsung supaya Vite bisa
// membuang kode tipe lain dari bundle (lihat routes/index.js, Sidebar.jsx).
// ============================================================

// Label tampilan jenis institusi (nilai internal = kolom jenis_organisasi).
export const JENIS_LABEL = {
  sekolah: 'Sekolah',
  kantor: 'Kantor (KUA)',
  puskesmas: 'Puskesmas',
  polres: 'Keamanan', // nilai internal tetap "polres"
}

const KAIN_MERAH_PUTIH = { atas: '#c81e1e', atas2: '#e23b3b', bawah: '#f5f5f0', bawah2: '#ffffff' }

const CONFIGS = {
  sekolah: {
    nama: 'SIMAK',
    tagline: 'Sistem Informasi Manajemen Sekolah',
    warna: '#1e40af',
    tipeTenant: ['sekolah'],
    lisensi: 'sekolah',
    fitur: [
      { judul: 'Data Siswa & Guru', isi: 'Kelola data induk, kelas, dan presensi dalam satu tempat.' },
      { judul: 'Rapor & Ujian', isi: 'Nilai, rapor, kartu peserta, dan berita acara ujian otomatis.' },
      { judul: 'Administrasi Sekolah', isi: 'Surat, SK, laporan, keuangan, dan inventaris siap cetak.' },
    ],
    // Tampilan halaman Login (warna kain, aksen, teks di kain)
    tema: {
      hurufBadge: 'S',
      aksen: '#38bdf8',
      aksenKuat: '#7dd3fc',
      kain: KAIN_MERAH_PUTIH,
      teksAtas: ['Sistem Informasi Manajemen Sekolah'],
      teksBawah: ['Administrasi sekolah lebih rapi, cepat, dan terpercaya'],
    },
  },
  kantor: {
    nama: 'SIMAK Kantor',
    tagline: 'Administrasi Kantor & KUA',
    warna: '#047857',
    tipeTenant: ['kantor'],
    lisensi: 'sekolah', // ganti bila LisensiCetak punya kunci khusus kantor
    fitur: [
      { judul: 'Data & Presensi Pegawai', isi: 'Pegawai, presensi, dan daftar hadir siap cetak.' },
      { judul: 'Laporan Keagamaan', isi: 'Laporan bulanan, kepenghuluan, dan pembinaan.' },
      { judul: 'Pendaftaran Nikah', isi: 'Pengajuan dan verifikasi nikah secara online.' },
    ],
    tema: {
      hurufBadge: 'K',
      aksen: '#34d399',
      aksenKuat: '#6ee7b7',
      kain: { atas: '#047857', atas2: '#10b981', bawah: '#f5f5f0', bawah2: '#ffffff' },
      teksAtas: ['Administrasi Kantor & KUA'],
      teksBawah: ['Pelayanan administrasi yang tertib dan akuntabel'],
    },
  },
  puskesmas: {
    nama: 'SIMPUS',
    tagline: 'Sistem Informasi Puskesmas',
    warna: '#0e7490',
    tipeTenant: ['puskesmas'],
    lisensi: 'sekolah',
    fitur: [
      { judul: 'Data Pegawai', isi: 'STR/SIP, jadwal piket, cuti, dan izin pegawai.' },
      { judul: 'Presensi', isi: 'Presensi dan daftar hadir pegawai puskesmas.' },
      { judul: 'Keuangan BOK', isi: 'Pencatatan keuangan BOK dan laporan.' },
    ],
    tema: {
      hurufBadge: 'P',
      aksen: '#22d3ee',
      aksenKuat: '#67e8f9',
      kain: { atas: '#0e7490', atas2: '#06b6d4', bawah: '#f5f5f0', bawah2: '#ffffff' },
      teksAtas: ['Sistem Informasi Puskesmas'],
      teksBawah: ['Mendukung pelayanan kesehatan yang tertata'],
    },
  },
  polres: {
    nama: 'Keamanan',
    tagline: 'Administrasi Personel Polres',
    warna: '#374151',
    tipeTenant: ['polres'],
    lisensi: 'sekolah',
    fitur: [
      { judul: 'Data Personel', isi: 'Profil satuan dan data personel.' },
      { judul: 'Presensi', isi: 'Presensi dan daftar hadir personel.' },
      { judul: 'Reskrim', isi: 'Data penyidik dan surat reskrim.' },
    ],
    tema: {
      hurufBadge: 'K',
      aksen: '#9ca3af',
      aksenKuat: '#d1d5db',
      kain: { atas: '#1f2937', atas2: '#4b5563', bawah: '#f5f5f0', bawah2: '#ffffff' },
      teksAtas: ['Administrasi Personel'],
      teksBawah: ['Tertib administrasi, kuat pelayanan'],
    },
  },
}

export const APP_TIPE = import.meta.env.VITE_APP_TIPE || 'sekolah'
const dasar = CONFIGS[APP_TIPE] || CONFIGS.sekolah

// `tema.judul` dan `tema.tagline` otomatis mengikuti nama & tagline aplikasi.
export const APP = {
  ...dasar,
  tema: { judul: dasar.nama, tagline: dasar.tagline, ...dasar.tema },
}
