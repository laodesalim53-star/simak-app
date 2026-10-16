import { useState, useEffect, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { ProtectedRoute } from '../components/RouteGuards'
import { commonRoutes, adminUmumRoutes } from './RoutesCommon'

// ============================================================
// ROUTE KHUSUS SEKOLAH — semua halaman sekolah dari App.jsx lama,
// kecuali yang sudah dipindah ke RoutesCommon.jsx.
// ============================================================
const Beranda = lazy(() => import('../pages/Beranda'))
const PPDBPublik = lazy(() => import('../pages/PPDBPublik'))
const UjianOnline = lazy(() => import('../pages/UjianOnline'))
const KuisSeru = lazy(() => import('../pages/KuisSeru'))

const Siswa = lazy(() => import('../pages/Siswa'))
const HasilUjian = lazy(() => import('../pages/HasilUjian'))
const Guru = lazy(() => import('../pages/Guru'))
const Kelas = lazy(() => import('../pages/Kelas'))
const DaftarHadirPegawai = lazy(() => import('../pages/DaftarHadirPegawai'))

const LaporanNominatifGuru = lazy(() => import('../pages/LaporanNominatifGuru'))
const LaporanBiodataGuru = lazy(() => import('../pages/LaporanBiodataGuru'))
const LaporanPendidikanGuru = lazy(() => import('../pages/LaporanPendidikanGuru'))
const LaporanKepangkatanGuru = lazy(() => import('../pages/LaporanKepangkatanGuru'))
const LaporanTanggunganKeluarga = lazy(() => import('../pages/LaporanTanggunganKeluarga'))
const LaporanTenagaPengajar = lazy(() => import('../pages/LaporanTenagaPengajar'))
const LaporanKeadaanMurid = lazy(() => import('../pages/LaporanKeadaanMurid'))
const LaporanSemester = lazy(() => import('../pages/LaporanSemester'))
const LaporanBulanan = lazy(() => import('../pages/LaporanBulanan'))
const LaporanDaftarHadirGuru = lazy(() => import('../pages/LaporanDaftarHadirGuru'))
const PusatLaporanGuru = lazy(() => import('../pages/PusatLaporanGuru'))

const AdministrasiKepalaSekolah = lazy(() => import('../pages/AdministrasiKepalaSekolah'))
const AdministrasiKepsekItem = lazy(() => import('../pages/AdministrasiKepsekItem'))
const BukuIndukSiswa = lazy(() => import('../pages/BukuIndukSiswa'))
const BukuKerjaKepsek = lazy(() => import('../pages/BukuKerjaKepsek'))
const SupervisiAkademik = lazy(() => import('../pages/SupervisiAkademik'))
const KinerjaTendik = lazy(() => import('../pages/KinerjaTendik'))
const AkreditasiSekolah = lazy(() => import('../pages/AkreditasiSekolah'))

const GudangSK = lazy(() => import('../pages/GudangSK'))
const KelengkapanSuratPengantar = lazy(() => import('../pages/KelengkapanSuratPengantar'))
const SKBebanMengajar = lazy(() => import('../pages/SKBebanMengajar'))
const KeteranganMelaksanakanTugas = lazy(() => import('../pages/KeteranganMelaksanakanTugas'))
const SKWaliKelas = lazy(() => import('../pages/SKWaliKelas'))
const SKPembinaEkstrakurikuler = lazy(() => import('../pages/SKPembinaEkstrakurikuler'))
const SKPetugasPerpustakaan = lazy(() => import('../pages/SKPetugasPerpustakaan'))
const SKPanitiaUjian = lazy(() => import('../pages/SKPanitiaUjian'))
const SKPanitiaPPDB = lazy(() => import('../pages/SKPanitiaPPDB'))
const SKTimBOS = lazy(() => import('../pages/SKTimBOS'))
const SKHonorGuru = lazy(() => import('../pages/SKHonorGuru'))
const SKTenagaKebersihan = lazy(() => import('../pages/SKTenagaKebersihan'))
const SKOperatorDapodik = lazy(() => import('../pages/SKOperatorDapodik'))
const SKBendaharaBOS = lazy(() => import('../pages/SKBendaharaBOS'))
const SKPengawasAsesmen = lazy(() => import('../pages/SKPengawasAsesmen'))
const DaftarHonorLiterasiNumerasi = lazy(() => import('../pages/DaftarHonorLiterasiNumerasi'))
const DaftarHonorPengawasAsesmen = lazy(() => import('../pages/DaftarHonorPengawasAsesmen'))
const DaftarHonorPanitiaUjian = lazy(() => import('../pages/DaftarHonorPanitiaUjian'))
const DaftarHonorPanitiaPPDB = lazy(() => import('../pages/DaftarHonorPanitiaPPDB'))

const PortalUjian = lazy(() => import('../pages/PortalUjian'))
const KartuPesertaUjian = lazy(() => import('../pages/KartuPesertaUjian'))
const JadwalPengawasRuangUjian = lazy(() => import('../pages/JadwalPengawasRuangUjian'))
const BeritaAcaraUjian = lazy(() => import('../pages/BeritaAcaraUjian'))
const DaftarHadirSiswaUjian = lazy(() => import('../pages/DaftarHadirSiswaUjian'))
const DaftarHadirPengawasUjian = lazy(() => import('../pages/DaftarHadirPengawasUjian'))
const BeritaAcaraSerahTerimaAS = lazy(() => import('../pages/BeritaAcaraSerahTerimaAS'))
const PaktaIntegritas = lazy(() => import('../pages/PaktaIntegritas'))
const BeritaAcaraUjianSekolah = lazy(() => import('../pages/BeritaAcaraUjianSekolah'))
const PaktaIntegritasPengawas = lazy(() => import('../pages/PaktaIntegritasPengawas'))
const LaporanAsesmenSekolah = lazy(() => import('../pages/LaporanAsesmenSekolah'))
const DataUjian8355 = lazy(() => import('../pages/DataUjian8355'))
const Cetak8355 = lazy(() => import('../pages/Cetak8355'))

const Jadwal = lazy(() => import('../pages/Jadwal'))
const Presensi = lazy(() => import('../pages/Presensi'))
const Nilai = lazy(() => import('../pages/Nilai'))
const NilaiAsesmen = lazy(() => import('../pages/NilaiAsesmen'))
const Rapor = lazy(() => import('../pages/Rapor'))
const PortofolioSiswa = lazy(() => import('../pages/PortofolioSiswa'))
const RaporCetak = lazy(() => import('../pages/RaporCetak'))
const Ijazah = lazy(() => import('../pages/Ijazah'))
const SuratKeteranganLulus = lazy(() => import('../pages/SuratKeteranganLulus'))
const RPP = lazy(() => import('../pages/RPP'))
const ArsipRPP = lazy(() => import('../pages/ArsipRPP'))
const BankSoal = lazy(() => import('../pages/BankSoal'))
const MateriKelas = lazy(() => import('../pages/MateriKelas'))
const BuatUjian = lazy(() => import('../pages/BuatUjian'))
const BuatKuisSeru = lazy(() => import('../pages/BuatKuisSeru'))
const HasilKuisSeru = lazy(() => import('../pages/HasilKuisSeru'))
const KartuSiswa = lazy(() => import('../pages/KartuSiswa'))
const DokumenPIP = lazy(() => import('../pages/DokumenPIP'))
const HariLibur = lazy(() => import('../pages/HariLibur'))
const KalenderPendidikan = lazy(() => import('../pages/KalenderPendidikan'))

const RaporAnak = lazy(() => import('../pages/RaporAnak'))
const PresensiAnak = lazy(() => import('../pages/PresensiAnak'))
const PortofolioAnak = lazy(() => import('../pages/PortofolioAnak'))
const GaleriOrangTua = lazy(() => import('../pages/GaleriOrangTua'))

const Nota = lazy(() => import('../pages/Nota'))
const KeuanganKelas = lazy(() => import('../pages/KeuanganKelas'))
const ProfilSekolah = lazy(() => import('../pages/ProfilSekolah'))
const ManajemenSekolah = lazy(() => import('../pages/ManajemenSekolah'))
const PPDBAdmin = lazy(() => import('../pages/PPDBAdmin'))
const Perpustakaan = lazy(() => import('../pages/Perpustakaan'))
const AdministrasiKantor = lazy(() => import('../pages/AdministrasiKantor'))

const PengajuanSuratAktif = lazy(() => import('../pages/PengajuanSuratAktif'))
const PengajuanEditSiswa = lazy(() => import('../pages/PengajuanEditSiswa'))
const PengajuanKebutuhanKelas = lazy(() => import('../pages/PengajuanKebutuhanKelas'))
const SertifikatPenghargaan = lazy(() => import('../pages/SertifikatPenghargaan'))

// --- Fitur Toko ---
const Toko = lazy(() => import('../pages/Toko'))
const Keranjang = lazy(() => import('../pages/Keranjang'))
const PilihPengiriman = lazy(() => import('../pages/PilihPengiriman'))
const Checkout = lazy(() => import('../pages/Checkout'))
const PesananSukses = lazy(() => import('../pages/PesananSukses'))
const RiwayatPesanan = lazy(() => import('../pages/RiwayatPesanan'))
const PesananMasuk = lazy(() => import('../pages/PesananMasuk'))
const RiwayatPencairanSaya = lazy(() => import('../pages/RiwayatPencairanSaya'))
const AjukanToko = lazy(() => import('../pages/AjukanToko'))
const PersetujuanToko = lazy(() => import('../pages/PersetujuanToko'))
const PencairanDana = lazy(() => import('../pages/PencairanDana'))

// Nota.jsx menerima `sekolah` lewat prop — wrapper ini mengambil profil sekolah.
function NotaDenganSekolah() {
  const { profil } = useAuth()
  const sekolahId = profil?.sekolah_id
  const [sekolah, setSekolah] = useState(null)

  useEffect(() => {
    if (!sekolahId) return
    supabase
      .from('profil_sekolah')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSekolah({ nama: data.nama_sekolah, alamat: data.alamat, kota: data.kabupaten })
        }
      })
  }, [sekolahId])

  return <Nota sekolah={sekolah} />
}

export default function RoutesSekolah() {
  return (
    <Routes>
      {/* 1. Publik */}
      <Route path="/" element={<Beranda />} />
      <Route path="/ppdb/:sekolahId" element={<PPDBPublik />} />
      <Route path="/ppdb" element={<PPDBPublik />} />
      <Route path="/ujian-online" element={<UjianOnline />} />
      <Route path="/kuis-seru" element={<KuisSeru />} />

      {commonRoutes}
      {adminUmumRoutes}

      {/* 2. Data siswa & guru */}
      <Route path="/siswa" element={<ProtectedRoute><Siswa /></ProtectedRoute>} />
      <Route path="/hasil-ujian" element={<ProtectedRoute><HasilUjian /></ProtectedRoute>} />
      <Route path="/guru" element={<ProtectedRoute adminOnly><Guru /></ProtectedRoute>} />
      <Route path="/kelas" element={<ProtectedRoute adminOnly><Kelas /></ProtectedRoute>} />
      {/* Daftar Hadir Guru & Tendik: BUKAN adminOnly (kontrol edit di dalam komponen) */}
      <Route path="/daftar-hadir-pegawai" element={<ProtectedRoute><DaftarHadirPegawai /></ProtectedRoute>} />

      {/* Administrasi Kepala Sekolah */}
      <Route path="/administrasi-kepsek" element={<ProtectedRoute adminOnly><AdministrasiKepalaSekolah /></ProtectedRoute>} />
      <Route path="/administrasi-kepsek/buku-induk-siswa" element={<ProtectedRoute adminOnly><BukuIndukSiswa /></ProtectedRoute>} />
      <Route path="/administrasi-kepsek/buku-kerja" element={<ProtectedRoute adminOnly><BukuKerjaKepsek /></ProtectedRoute>} />
      <Route path="/administrasi-kepsek/supervisi-akademik" element={<ProtectedRoute adminOnly><SupervisiAkademik /></ProtectedRoute>} />
      <Route path="/administrasi-kepsek/kinerja-tendik" element={<ProtectedRoute adminOnly><KinerjaTendik /></ProtectedRoute>} />
      <Route path="/administrasi-kepsek/akreditasi" element={<ProtectedRoute adminOnly><AkreditasiSekolah /></ProtectedRoute>} />
      <Route path="/administrasi-kepsek/:slug" element={<ProtectedRoute adminOnly><AdministrasiKepsekItem /></ProtectedRoute>} />

      {/* 3. Laporan guru */}
      <Route path="/laporan-nominatif-guru" element={<ProtectedRoute adminOnly><LaporanNominatifGuru /></ProtectedRoute>} />
      <Route path="/laporan-biodata-guru" element={<ProtectedRoute adminOnly><LaporanBiodataGuru /></ProtectedRoute>} />
      <Route path="/laporan-pendidikan-guru" element={<ProtectedRoute adminOnly><LaporanPendidikanGuru /></ProtectedRoute>} />
      <Route path="/laporan-kepangkatan-guru" element={<ProtectedRoute adminOnly><LaporanKepangkatanGuru /></ProtectedRoute>} />
      <Route path="/laporan-tanggungan-keluarga" element={<ProtectedRoute adminOnly><LaporanTanggunganKeluarga /></ProtectedRoute>} />
      <Route path="/laporan-tenaga-pengajar" element={<ProtectedRoute adminOnly><LaporanTenagaPengajar /></ProtectedRoute>} />
      <Route path="/laporan-keadaan-murid" element={<ProtectedRoute adminOnly><LaporanKeadaanMurid /></ProtectedRoute>} />
      <Route path="/laporan-semester" element={<ProtectedRoute adminOnly><LaporanSemester /></ProtectedRoute>} />
      <Route path="/laporan" element={<ProtectedRoute adminOnly><LaporanBulanan /></ProtectedRoute>} />
      <Route path="/laporan-daftar-hadir-guru" element={<ProtectedRoute adminOnly><LaporanDaftarHadirGuru /></ProtectedRoute>} />
      <Route path="/laporan-guru" element={<ProtectedRoute adminOnly><PusatLaporanGuru /></ProtectedRoute>} />

      {/* Gudang SK */}
      <Route path="/gudang-sk" element={<ProtectedRoute adminOnly><GudangSK /></ProtectedRoute>} />
      <Route path="/gudang-sk/beban-mengajar" element={<ProtectedRoute adminOnly><SKBebanMengajar /></ProtectedRoute>} />
      <Route path="/gudang-sk/keterangan-melaksanakan-tugas" element={<ProtectedRoute adminOnly><KeteranganMelaksanakanTugas /></ProtectedRoute>} />
      {/* TODO: route SK/honor di bawah ini belum dibungkus ProtectedRoute (sama seperti App.jsx lama) */}
      <Route path="/gudang-sk/wali-kelas" element={<SKWaliKelas />} />
      <Route path="/gudang-sk/pembina-ekstrakurikuler" element={<SKPembinaEkstrakurikuler />} />
      <Route path="/gudang-sk/petugas-perpustakaan" element={<SKPetugasPerpustakaan />} />
      <Route path="/gudang-sk/panitia-ujian" element={<SKPanitiaUjian />} />
      <Route path="/gudang-sk/panitia-ppdb" element={<SKPanitiaPPDB />} />
      <Route path="/gudang-sk/tim-bos" element={<SKTimBOS />} />
      <Route path="/gudang-sk/honor-guru" element={<SKHonorGuru />} />
      <Route path="/gudang-sk/tenaga-kebersihan" element={<SKTenagaKebersihan />} />
      <Route path="/gudang-sk/operator-dapodik" element={<SKOperatorDapodik />} />
      <Route path="/gudang-sk/bendahara-bos" element={<SKBendaharaBOS />} />
      <Route path="/gudang-sk/pengawas-asesmen" element={<ProtectedRoute adminOnly><SKPengawasAsesmen /></ProtectedRoute>} />
      <Route path="/gudang-sk/daftar-honor-literasi-numerasi" element={<DaftarHonorLiterasiNumerasi />} />
      <Route path="/gudang-sk/daftar-honor-pengawas-asesmen" element={<DaftarHonorPengawasAsesmen />} />
      <Route path="/gudang-sk/daftar-honor-panitia-ujian" element={<DaftarHonorPanitiaUjian />} />
      <Route path="/gudang-sk/daftar-honor-panitia-ppdb" element={<DaftarHonorPanitiaPPDB />} />

      {/* Portal Ujian */}
      <Route path="/gudang-sk/portal-ujian" element={<ProtectedRoute adminOnly><PortalUjian /></ProtectedRoute>} />
      <Route path="/gudang-sk/portal-ujian/kartu-peserta" element={<ProtectedRoute adminOnly><KartuPesertaUjian /></ProtectedRoute>} />
      <Route path="/gudang-sk/portal-ujian/berita-acara" element={<ProtectedRoute adminOnly><BeritaAcaraUjian /></ProtectedRoute>} />
      <Route path="/gudang-sk/portal-ujian/daftar-hadir-siswa" element={<ProtectedRoute adminOnly><DaftarHadirSiswaUjian /></ProtectedRoute>} />
      <Route path="/gudang-sk/portal-ujian/daftar-hadir-pengawas" element={<ProtectedRoute adminOnly><DaftarHadirPengawasUjian /></ProtectedRoute>} />
      <Route path="/gudang-sk/portal-ujian/berita-acara-serah-terima-as" element={<ProtectedRoute adminOnly><BeritaAcaraSerahTerimaAS /></ProtectedRoute>} />
      <Route path="/gudang-sk/portal-ujian/jadwal-pengawas-ruang" element={<ProtectedRoute adminOnly><JadwalPengawasRuangUjian /></ProtectedRoute>} />
      <Route path="/gudang-sk/portal-ujian/pakta-integritas" element={<ProtectedRoute adminOnly><PaktaIntegritas /></ProtectedRoute>} />
      <Route path="/gudang-sk/portal-ujian/berita-acara-ujian-sekolah" element={<ProtectedRoute adminOnly><BeritaAcaraUjianSekolah /></ProtectedRoute>} />
      <Route path="/gudang-sk/portal-ujian/pakta-integritas-pengawas" element={<ProtectedRoute adminOnly><PaktaIntegritasPengawas /></ProtectedRoute>} />
      <Route path="/gudang-sk/portal-ujian/laporan-asesmen" element={<ProtectedRoute adminOnly><LaporanAsesmenSekolah /></ProtectedRoute>} />
      <Route path="/kelengkapan-surat-pengantar" element={<ProtectedRoute adminOnly><KelengkapanSuratPengantar /></ProtectedRoute>} />
      <Route path="/data-ujian-8355" element={<ProtectedRoute adminOnly><DataUjian8355 /></ProtectedRoute>} />
      <Route path="/cetak-8355" element={<ProtectedRoute adminOnly><Cetak8355 /></ProtectedRoute>} />

      {/* 4. Akademik */}
      <Route path="/jadwal" element={<ProtectedRoute><Jadwal /></ProtectedRoute>} />
      <Route path="/presensi" element={<ProtectedRoute><Presensi /></ProtectedRoute>} />
      <Route path="/nilai" element={<ProtectedRoute><Nilai /></ProtectedRoute>} />
      <Route path="/nilai-asesmen" element={<ProtectedRoute><NilaiAsesmen /></ProtectedRoute>} />
      <Route path="/rapor" element={<ProtectedRoute><Rapor /></ProtectedRoute>} />
      <Route path="/portofolio-siswa" element={<ProtectedRoute><PortofolioSiswa /></ProtectedRoute>} />
      <Route path="/rapor/cetak" element={<ProtectedRoute><RaporCetak /></ProtectedRoute>} />
      <Route path="/ijazah" element={<ProtectedRoute><Ijazah /></ProtectedRoute>} />
      <Route path="/skl" element={<ProtectedRoute><SuratKeteranganLulus /></ProtectedRoute>} />
      <Route path="/rpp" element={<ProtectedRoute><RPP /></ProtectedRoute>} />
      <Route path="/arsip-rpp" element={<ProtectedRoute><ArsipRPP /></ProtectedRoute>} />
      <Route path="/bank-soal" element={<ProtectedRoute><BankSoal /></ProtectedRoute>} />
      <Route path="/materi-kelas" element={<MateriKelas />} />
      <Route path="/buat-ujian" element={<ProtectedRoute><BuatUjian /></ProtectedRoute>} />
      <Route path="/buat-kuis-seru" element={<ProtectedRoute><BuatKuisSeru /></ProtectedRoute>} />
      <Route path="/hasil-kuis-seru" element={<ProtectedRoute><HasilKuisSeru /></ProtectedRoute>} />
      <Route path="/kartu" element={<ProtectedRoute adminOnly><KartuSiswa /></ProtectedRoute>} />
      <Route path="/dokumen-pip" element={<ProtectedRoute adminOnly><DokumenPIP /></ProtectedRoute>} />
      <Route path="/hari-libur" element={<ProtectedRoute adminOnly><HariLibur /></ProtectedRoute>} />
      <Route path="/kalender-pendidikan" element={<ProtectedRoute><KalenderPendidikan /></ProtectedRoute>} />

      {/* 5. Orang tua */}
      <Route path="/rapor-anak" element={<ProtectedRoute><RaporAnak /></ProtectedRoute>} />
      <Route path="/presensi-anak" element={<ProtectedRoute><PresensiAnak /></ProtectedRoute>} />
      <Route path="/portofolio-anak" element={<ProtectedRoute><PortofolioAnak /></ProtectedRoute>} />
      <Route path="/galeri-orang-tua" element={<ProtectedRoute><GaleriOrangTua /></ProtectedRoute>} />

      {/* 6. Administrasi sekolah (di luar adminUmumRoutes) */}
      <Route path="/nota" element={<ProtectedRoute adminOnly><NotaDenganSekolah /></ProtectedRoute>} />
      <Route path="/keuangan-kelas" element={<ProtectedRoute><KeuanganKelas /></ProtectedRoute>} />
      <Route path="/profil-sekolah" element={<ProtectedRoute adminUtamaOnly><ProfilSekolah /></ProtectedRoute>} />
      <Route path="/manajemen-sekolah" element={<ProtectedRoute superAdminOnly><ManajemenSekolah /></ProtectedRoute>} />
      <Route path="/ppdb-admin" element={<ProtectedRoute adminOnly><PPDBAdmin /></ProtectedRoute>} />

      {/* 7. Konten */}
      <Route path="/perpustakaan" element={<ProtectedRoute><Perpustakaan /></ProtectedRoute>} />
      <Route path="/administrasi-kelas" element={<ProtectedRoute><AdministrasiKantor /></ProtectedRoute>} />

      {/* 8. Pengajuan & profil */}
      <Route path="/pengajuan-surat-aktif" element={<ProtectedRoute><PengajuanSuratAktif /></ProtectedRoute>} />
      <Route path="/perbaikan-data-siswa" element={<ProtectedRoute><PengajuanEditSiswa /></ProtectedRoute>} />
      <Route path="/pengajuan-kebutuhan-kelas" element={<ProtectedRoute><PengajuanKebutuhanKelas /></ProtectedRoute>} />
      <Route path="/sertifikat" element={<ProtectedRoute><SertifikatPenghargaan /></ProtectedRoute>} />

      {/* 9. Toko — keranjang & pengiriman terbuka untuk pengunjung, login saat checkout */}
      <Route path="/toko" element={<Toko />} />
      <Route path="/toko/:id/keranjang" element={<Keranjang />} />
      <Route path="/toko/:id/pengiriman" element={<PilihPengiriman />} />
      <Route path="/toko/:id/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/toko/:id/pesanan-sukses" element={<ProtectedRoute><PesananSukses /></ProtectedRoute>} />
      <Route path="/riwayat-pesanan" element={<ProtectedRoute><RiwayatPesanan /></ProtectedRoute>} />
      <Route path="/pesanan-masuk" element={<ProtectedRoute><PesananMasuk /></ProtectedRoute>} />
      <Route path="/riwayat-pencairan-saya" element={<ProtectedRoute><RiwayatPencairanSaya /></ProtectedRoute>} />
      <Route path="/ajukan-toko" element={<ProtectedRoute adminOnly><AjukanToko /></ProtectedRoute>} />
      <Route path="/persetujuan-toko" element={<ProtectedRoute superAdminOnly><PersetujuanToko /></ProtectedRoute>} />
      <Route path="/pencairan-dana" element={<ProtectedRoute superAdminOnly><PencairanDana /></ProtectedRoute>} />

      {/* 10. Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
