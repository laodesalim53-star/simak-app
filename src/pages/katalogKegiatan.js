// Katalog kegiatan BOK yang umum dijalankan puskesmas — hanya SARAN nama
// kegiatan & satuan (bukan Kode Rekening resmi, karena itu mengikuti
// Bagan Akun Standar/Kode Rekening APBD masing-masing daerah).
// Mau tambah/ubah kegiatan template? Cukup edit array di file ini.
export const KATALOG_KEGIATAN_BOK = [
  // --- UKM Esensial: Promosi Kesehatan ---
  { komponen: 'UKM Esensial', sub_komponen: 'Promosi Kesehatan', rincian_kegiatan: 'Penyuluhan kesehatan di sekolah', satuan: 'Kali' },
  { komponen: 'UKM Esensial', sub_komponen: 'Promosi Kesehatan', rincian_kegiatan: 'Penyuluhan kesehatan di posyandu', satuan: 'Kali' },
  { komponen: 'UKM Esensial', sub_komponen: 'Promosi Kesehatan', rincian_kegiatan: 'Pembinaan Desa/Kelurahan Siaga Aktif', satuan: 'OH' },
  { komponen: 'UKM Esensial', sub_komponen: 'Promosi Kesehatan', rincian_kegiatan: 'Advokasi lintas sektor tingkat kecamatan', satuan: 'OK' },
  { komponen: 'UKM Esensial', sub_komponen: 'Promosi Kesehatan', rincian_kegiatan: 'Pembuatan media promosi kesehatan (banner, leaflet, poster)', satuan: 'Paket' },
  // --- UKM Esensial: Kesehatan Ibu dan Anak (KIA) ---
  { komponen: 'UKM Esensial', sub_komponen: 'Kesehatan Ibu dan Anak (KIA)', rincian_kegiatan: 'Kunjungan rumah ibu hamil risiko tinggi', satuan: 'OH' },
  { komponen: 'UKM Esensial', sub_komponen: 'Kesehatan Ibu dan Anak (KIA)', rincian_kegiatan: 'Kelas ibu hamil', satuan: 'Kali' },
  { komponen: 'UKM Esensial', sub_komponen: 'Kesehatan Ibu dan Anak (KIA)', rincian_kegiatan: 'Pelacakan dan pelaporan kematian ibu/bayi', satuan: 'OK' },
  { komponen: 'UKM Esensial', sub_komponen: 'Kesehatan Ibu dan Anak (KIA)', rincian_kegiatan: 'Kunjungan neonatal risiko tinggi', satuan: 'OH' },
  { komponen: 'UKM Esensial', sub_komponen: 'Kesehatan Ibu dan Anak (KIA)', rincian_kegiatan: 'Pemantauan tumbuh kembang balita', satuan: 'Kali' },
  // --- UKM Esensial: Gizi Masyarakat ---
  { komponen: 'UKM Esensial', sub_komponen: 'Gizi Masyarakat', rincian_kegiatan: 'Pemantauan status gizi balita (PSG)', satuan: 'Paket' },
  { komponen: 'UKM Esensial', sub_komponen: 'Gizi Masyarakat', rincian_kegiatan: 'Pemberian PMT pemulihan balita gizi kurang', satuan: 'Paket' },
  { komponen: 'UKM Esensial', sub_komponen: 'Gizi Masyarakat', rincian_kegiatan: 'Sweeping vitamin A', satuan: 'OH' },
  { komponen: 'UKM Esensial', sub_komponen: 'Gizi Masyarakat', rincian_kegiatan: 'Pemantauan garam beryodium', satuan: 'OK' },
  // --- UKM Esensial: Kesehatan Lingkungan ---
  { komponen: 'UKM Esensial', sub_komponen: 'Kesehatan Lingkungan', rincian_kegiatan: 'Inspeksi kesehatan lingkungan tempat pengelolaan pangan', satuan: 'OH' },
  { komponen: 'UKM Esensial', sub_komponen: 'Kesehatan Lingkungan', rincian_kegiatan: 'Pemicuan STBM (Sanitasi Total Berbasis Masyarakat)', satuan: 'Kali' },
  { komponen: 'UKM Esensial', sub_komponen: 'Kesehatan Lingkungan', rincian_kegiatan: 'Pengawasan kualitas air minum', satuan: 'OH' },
  { komponen: 'UKM Esensial', sub_komponen: 'Kesehatan Lingkungan', rincian_kegiatan: 'Verifikasi desa/kelurahan Stop BABS', satuan: 'OK' },
  // --- UKM Esensial: Pencegahan dan Pengendalian Penyakit (P2P) ---
  { komponen: 'UKM Esensial', sub_komponen: 'Pencegahan dan Pengendalian Penyakit (P2P)', rincian_kegiatan: 'Pelacakan kontak kasus TBC', satuan: 'OH' },
  { komponen: 'UKM Esensial', sub_komponen: 'Pencegahan dan Pengendalian Penyakit (P2P)', rincian_kegiatan: 'Penemuan kasus aktif TBC', satuan: 'Kali' },
  { komponen: 'UKM Esensial', sub_komponen: 'Pencegahan dan Pengendalian Penyakit (P2P)', rincian_kegiatan: 'Fogging fokus DBD', satuan: 'Paket' },
  { komponen: 'UKM Esensial', sub_komponen: 'Pencegahan dan Pengendalian Penyakit (P2P)', rincian_kegiatan: 'Surveilans penyakit tidak menular (PTM)', satuan: 'OH' },
  { komponen: 'UKM Esensial', sub_komponen: 'Pencegahan dan Pengendalian Penyakit (P2P)', rincian_kegiatan: 'Imunisasi rutin dan sweeping imunisasi', satuan: 'OH' },
  { komponen: 'UKM Esensial', sub_komponen: 'Pencegahan dan Pengendalian Penyakit (P2P)', rincian_kegiatan: 'Pelacakan kasus kontak erat penyakit menular', satuan: 'OH' },
  // --- UKM Esensial: Posyandu / Pelayanan Kesehatan Dasar ---
  { komponen: 'UKM Esensial', sub_komponen: 'Posyandu', rincian_kegiatan: 'Transport petugas pendamping posyandu balita', satuan: 'OH' },
  { komponen: 'UKM Esensial', sub_komponen: 'Posyandu', rincian_kegiatan: 'Refreshing/pembinaan kader posyandu', satuan: 'Kali' },

  // --- UKM Pengembangan ---
  { komponen: 'UKM Pengembangan', sub_komponen: 'Kesehatan Jiwa', rincian_kegiatan: 'Kunjungan rumah ODGJ (Orang Dengan Gangguan Jiwa)', satuan: 'OH' },
  { komponen: 'UKM Pengembangan', sub_komponen: 'Kesehatan Lansia', rincian_kegiatan: 'Posyandu lansia (pemeriksaan kesehatan berkala)', satuan: 'OK' },
  { komponen: 'UKM Pengembangan', sub_komponen: 'Kesehatan Olahraga', rincian_kegiatan: 'Tes kebugaran jasmani anak sekolah', satuan: 'Paket' },
  { komponen: 'UKM Pengembangan', sub_komponen: 'Kesehatan Gigi dan Mulut (UKGS)', rincian_kegiatan: 'Penjaringan kesehatan gigi anak sekolah', satuan: 'Kali' },
  { komponen: 'UKM Pengembangan', sub_komponen: 'Kesehatan Kerja', rincian_kegiatan: 'Pembinaan Pos UKK (Upaya Kesehatan Kerja)', satuan: 'OK' },
  { komponen: 'UKM Pengembangan', sub_komponen: 'Kesehatan Tradisional', rincian_kegiatan: 'Pembinaan kelompok asuhan mandiri TOGA', satuan: 'OK' },

  // --- Manajemen BOK (Dukungan Manajemen) ---
  { komponen: 'Manajemen BOK (Dukungan Manajemen)', sub_komponen: '', rincian_kegiatan: 'Honor pengelola keuangan BOK (Bendahara)', satuan: 'Bulan' },
  { komponen: 'Manajemen BOK (Dukungan Manajemen)', sub_komponen: '', rincian_kegiatan: 'Belanja ATK pengelolaan BOK', satuan: 'Paket' },
  { komponen: 'Manajemen BOK (Dukungan Manajemen)', sub_komponen: '', rincian_kegiatan: 'Penggandaan dan pelaporan bulanan BOK', satuan: 'Bulan' },
  { komponen: 'Manajemen BOK (Dukungan Manajemen)', sub_komponen: '', rincian_kegiatan: 'Rapat koordinasi internal pengelola BOK', satuan: 'Kali' },
  { komponen: 'Manajemen BOK (Dukungan Manajemen)', sub_komponen: '', rincian_kegiatan: 'Perjalanan dinas konsultasi ke Dinas Kesehatan Kabupaten/Kota', satuan: 'OK' },

  // --- Dukungan Operasional UKM Tim Nusantara Sehat ---
  { komponen: 'Dukungan Operasional UKM Tim Nusantara Sehat', sub_komponen: '', rincian_kegiatan: 'Transport pendampingan Tim Nusantara Sehat ke lokasi binaan', satuan: 'OH' },
  { komponen: 'Dukungan Operasional UKM Tim Nusantara Sehat', sub_komponen: '', rincian_kegiatan: 'Konsumsi rapat koordinasi Tim Nusantara Sehat', satuan: 'Kali' },

  // --- Pengawasan Obat dan Makanan ---
  { komponen: 'Pengawasan Obat dan Makanan', sub_komponen: '', rincian_kegiatan: 'Pengawasan peredaran obat dan makanan di wilayah kerja', satuan: 'OH' },
  { komponen: 'Pengawasan Obat dan Makanan', sub_komponen: '', rincian_kegiatan: 'Pembinaan apotek dan toko obat', satuan: 'OK' },

  // --- Penyediaan Tenaga dengan Perjanjian Kerja ---
  { komponen: 'Penyediaan Tenaga dengan Perjanjian Kerja', sub_komponen: '', rincian_kegiatan: 'Honor tenaga kontrak promosi kesehatan/gizi/kesling', satuan: 'Bulan' },
]

// Kunci unik per item katalog (untuk pelacakan pilihan checkbox & deteksi
// "sudah ada") — kombinasi Komponen + Sub Komponen + Rincian Kegiatan.
export function kunciKatalog(item) {
  return `${item.komponen}|${item.sub_komponen || ''}|${item.rincian_kegiatan}`
}

export function kelompokkanKatalog(daftar) {
  const map = {}
  for (const item of daftar) {
    const key = item.komponen
    if (!map[key]) map[key] = []
    map[key].push(item)
  }
  return map
}

// Dikelompokkan sekali di level modul (data statis) — dipakai untuk
// dropdown pilih-satu-kegiatan di form Tambah/Ubah RKA.
export const KATALOG_KEGIATAN_DIKELOMPOKKAN = kelompokkanKatalog(KATALOG_KEGIATAN_BOK)
