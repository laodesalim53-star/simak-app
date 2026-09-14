import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import { supabase } from './lib/supabaseClient'
import Loader from './components/Loader'
import { CartProvider } from './lib/CartContext'
import PresensiKantor from './pages/PresensiKantor'
import DaftarHadirKantor from './pages/DaftarHadirKantor'
// ...

// ============================================================
// LAZY-LOADED PAGES
// Setiap halaman baru diunduh saat rutenya benar-benar dibuka,
// bukan semua sekaligus di awal — supaya loading pertama (mis. /login)
// jauh lebih cepat dan tidak menunggu bundle raksasa.
// ============================================================
const Beranda = lazy(() => import('./pages/Beranda'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const MenungguPersetujuan = lazy(() => import('./pages/MenungguPersetujuan'))
const PersetujuanAkun = lazy(() => import('./pages/PersetujuanAkun'))
const Dashboard = lazy(() => import('./pages/Dashboard'))

const Siswa = lazy(() => import('./pages/Siswa'))
const HasilUjian = lazy(() => import('./pages/HasilUjian'))
const Guru = lazy(() => import('./pages/Guru'))
// Data Pegawai (tenant kantor) — komponen & tabel TERPISAH dari Guru/`guru`.
// Lihat DataPegawaiKantor.jsx: menulis ke tabel `pegawai_kantor`.
const PresensiKantor = lazy(() => import('./pages/PresensiKantor'))
const DaftarHadirKantor = lazy(() => import('./pages/DaftarHadirKantor'))
const DataPegawaiKantor = lazy(() => import('./pages/DataPegawaiKantor'))
const Kelas = lazy(() => import('./pages/Kelas'))

const LaporanNominatifGuru = lazy(() => import('./pages/LaporanNominatifGuru'))
const LaporanBiodataGuru = lazy(() => import('./pages/LaporanBiodataGuru'))
const LaporanPendidikanGuru = lazy(() => import('./pages/LaporanPendidikanGuru'))
const LaporanKepangkatanGuru = lazy(() => import('./pages/LaporanKepangkatanGuru'))
const LaporanTanggunganKeluarga = lazy(() => import('./pages/LaporanTanggunganKeluarga'))
const LaporanTenagaPengajar = lazy(() => import('./pages/LaporanTenagaPengajar'))
const LaporanKeadaanMurid = lazy(() => import('./pages/LaporanKeadaanMurid'))
const LaporanSemester = lazy(() => import('./pages/LaporanSemester'))
const LaporanBulanan = lazy(() => import('./pages/LaporanBulanan'))
// Laporan Daftar Hadir Guru/Pegawai — halaman berdiri sendiri, dipisah dari
// selector "Jenis Laporan" di LaporanBulanan.jsx (logika & template sama).
const LaporanDaftarHadirGuru = lazy(() => import('./pages/LaporanDaftarHadirGuru'))
const PusatLaporanGuru = lazy(() => import('./pages/PusatLaporanGuru'))
// Cetak Sampul Laporan (generik, kop otomatis dari profil_sekolah) — satu
// halaman dengan sidebar menu, menggantikan file terpisah CetakSampul.jsx /
// CetakSampulSemester.jsx / CetakSampul8355.jsx.
const CetakSampulHub = lazy(() => import('./pages/CetakSampulHub'))
const DataUjian8355 = lazy(() => import('./pages/DataUjian8355'))
const Cetak8355 = lazy(() => import('./pages/Cetak8355'))

const Jadwal = lazy(() => import('./pages/Jadwal'))
const Presensi = lazy(() => import('./pages/Presensi'))
const Nilai = lazy(() => import('./pages/Nilai'))
const NilaiAsesmen = lazy(() => import('./pages/NilaiAsesmen'))
const Rapor = lazy(() => import('./pages/Rapor'))
const PortofolioSiswa = lazy(() => import('./pages/PortofolioSiswa'))
const RaporCetak = lazy(() => import('./pages/RaporCetak'))
const Ijazah = lazy(() => import('./pages/Ijazah'))
const SuratKeteranganLulus = lazy(() => import('./pages/SuratKeteranganLulus'))
const RPP = lazy(() => import('./pages/RPP'))
const ArsipRPP = lazy(() => import('./pages/ArsipRPP'))
const BankSoal = lazy(() => import('./pages/BankSoal'))
const BuatUjian = lazy(() => import('./pages/BuatUjian'))
const BuatKuisSeru = lazy(() => import('./pages/BuatKuisSeru'))
const HasilKuisSeru = lazy(() => import('./pages/HasilKuisSeru'))
const KartuSiswa = lazy(() => import('./pages/KartuSiswa'))
const HariLibur = lazy(() => import('./pages/HariLibur'))
const KalenderPendidikan = lazy(() => import('./pages/KalenderPendidikan'))

const RaporAnak = lazy(() => import('./pages/RaporAnak'))
const PresensiAnak = lazy(() => import('./pages/PresensiAnak'))
const PortofolioAnak = lazy(() => import('./pages/PortofolioAnak'))
const GaleriOrangTua = lazy(() => import('./pages/GaleriOrangTua'))

const Inventaris = lazy(() => import('./pages/Inventaris'))
const Agenda = lazy(() => import('./pages/Agenda'))
const Surat = lazy(() => import('./pages/Surat'))
const SuratKeterangan = lazy(() => import('./pages/SuratKeterangan'))
const Keuangan = lazy(() => import('./pages/Keuangan'))
const KeuanganKelas = lazy(() => import('./pages/KeuanganKelas'))
const Kuitansi = lazy(() => import('./pages/Kuitansi'))
const Nota = lazy(() => import('./pages/Nota'))
const KuitansiJasa = lazy(() => import('./pages/KuitansiJasa'))
const Backup = lazy(() => import('./pages/Backup'))
const ProfilSekolah = lazy(() => import('./pages/ProfilSekolah'))
const ManajemenSekolah = lazy(() => import('./pages/ManajemenSekolah'))
const PPDBPublik = lazy(() => import('./pages/PPDBPublik'))
const PPDBAdmin = lazy(() => import('./pages/PPDBAdmin'))

const Perpustakaan = lazy(() => import('./pages/Perpustakaan'))
const Pengumuman = lazy(() => import('./pages/Pengumuman'))
const Galeri = lazy(() => import('./pages/Galeri'))
const Dokumen = lazy(() => import('./pages/Dokumen'))
const Pesan = lazy(() => import('./pages/Pesan'))
const AdministrasiKantor = lazy(() => import('./pages/AdministrasiKantor'))
const AdminLiveChat = lazy(() => import('./pages/AdminLiveChat'))
const ScanDokumen = lazy(() => import('./pages/ScanDokumen'))
const Rapat = lazy(() => import('./pages/Rapat'))
const RapatVideo = lazy(() => import('./pages/RapatVideo'))

const PengajuanSuratAktif = lazy(() => import('./pages/PengajuanSuratAktif'))
const PengajuanEditSiswa = lazy(() => import('./pages/PengajuanEditSiswa'))
const PengajuanKebutuhanKelas = lazy(() => import('./pages/PengajuanKebutuhanKelas'))
const ProfilSaya = lazy(() => import('./pages/ProfilSaya'))
const SertifikatPenghargaan = lazy(() => import('./pages/SertifikatPenghargaan'))
const UpgradeFitur = lazy(() => import('./pages/UpgradeFitur'))

// --- Fitur Toko: Keranjang & Checkout ---
const Toko = lazy(() => import('./pages/Toko'))
const Keranjang = lazy(() => import('./pages/Keranjang'))
const PilihPengiriman = lazy(() => import('./pages/PilihPengiriman'))
const Checkout = lazy(() => import('./pages/Checkout'))
const PesananSukses = lazy(() => import('./pages/PesananSukses'))
const RiwayatPesanan = lazy(() => import('./pages/RiwayatPesanan'))
const PesananMasuk = lazy(() => import('./pages/PesananMasuk'))
const RiwayatPencairanSaya = lazy(() => import('./pages/RiwayatPencairanSaya'))
// --- Fitur Toko: Pengajuan & Persetujuan Toko Baru ---
const AjukanToko = lazy(() => import('./pages/AjukanToko'))
const PersetujuanToko = lazy(() => import('./pages/PersetujuanToko'))
// --- Fitur Toko: Pencairan Dana ke penjual (superadmin only) ---
const PencairanDana = lazy(() => import('./pages/PencairanDana'))

const UjianOnline = lazy(() => import('./pages/UjianOnline'))
const KuisSeru = lazy(() => import('./pages/KuisSeru'))

// Halaman "dashboard" (setelah login) — semua redirect kegagalan akses
// (adminOnly/adminUtamaOnly/superAdminOnly) mengarah ke sini, BUKAN ke "/"
// lagi, karena "/" sekarang adalah halaman Beranda publik (poster promosi).
const HALAMAN_SETELAH_LOGIN = '/dashboard'

// Tampilan fallback saat sebuah chunk halaman sedang diunduh (Suspense),
// sama seperti fallback loading di ProtectedRoute/RouteMenunggu di bawah.
function FallbackLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <Loader />
    </div>
  )
}

function ProtectedRoute({ children, adminOnly, adminUtamaOnly, superAdminOnly }) {
  const { session, loading, isAdmin, isAdminUtama, isSuperAdmin, statusAkun } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 2200)
    return () => clearTimeout(timer)
  }, [])

  if (loading || !minTimeElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <Loader />
      </div>
    )
  }
  // Kirim lokasi yang tadi mau diakses lewat state, supaya Login.jsx bisa
  // mengembalikan user ke sana setelah berhasil login (mis. /toko/123/checkout).
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />

  // Akun yang belum disetujui (atau ditolak) tidak boleh mengakses halaman manapun
  // selain halaman menunggu persetujuan.
  if (statusAkun === 'menunggu' || statusAkun === 'ditolak') {
    return <Navigate to="/menunggu-persetujuan" replace />
  }

  if (adminOnly && !isAdmin) return <Navigate to={HALAMAN_SETELAH_LOGIN} replace />
  if (adminUtamaOnly && !isAdminUtama) return <Navigate to={HALAMAN_SETELAH_LOGIN} replace />
  if (superAdminOnly && !isSuperAdmin) return <Navigate to={HALAMAN_SETELAH_LOGIN} replace />
  return children
}

// Guard khusus halaman menunggu persetujuan: butuh login, tapi TIDAK dialihkan
// oleh pengecekan status_akun di ProtectedRoute (justru halaman ini yang menampilkannya).
function RouteMenunggu({ children }) {
  const { session, loading, statusAkun } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 900)
    return () => clearTimeout(timer)
  }, [])

  if (loading || !minTimeElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <Loader />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  if (statusAkun !== 'menunggu' && statusAkun !== 'ditolak') return <Navigate to={HALAMAN_SETELAH_LOGIN} replace />
  return children
}

// Nota.jsx menerima `sekolah` lewat prop (beda dari Kuitansi.jsx/KuitansiJasa.jsx
// yang mengambil sendiri profil sekolah secara internal) — wrapper kecil ini
// mengambilkan profil sekolah dengan cara yang sama supaya kop surat di cetakan
// nota tetap terisi.
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
          setSekolah({
            nama: data.nama_sekolah,
            alamat: data.alamat,
            kota: data.kabupaten,
          })
        }
      })
  }, [sekolahId])

  return <Nota sekolah={sekolah} />
}

export default function App() {
  return (
    <CartProvider>
      <Suspense fallback={<FallbackLoader />}>
        <Routes>
          {/* ============================================================
              1. HALAMAN PUBLIK — tidak perlu login
             ============================================================ */}
          <Route path="/" element={<Beranda />} />
          <Route path="/ppdb/:sekolahId" element={<PPDBPublik />} />
          <Route path="/ppdb" element={<PPDBPublik />} />
          <Route path="/ujian-online" element={<UjianOnline />} />
          <Route path="/kuis-seru" element={<KuisSeru />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/menunggu-persetujuan" element={<RouteMenunggu><MenungguPersetujuan /></RouteMenunggu>} />
          <Route path="/persetujuan-akun" element={<ProtectedRoute adminUtamaOnly><PersetujuanAkun /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* ============================================================
              2. DATA SISWA & GURU
             ============================================================ */}
          <Route path="/siswa" element={<ProtectedRoute><Siswa /></ProtectedRoute>} />
          <Route path="/hasil-ujian" element={<ProtectedRoute><HasilUjian /></ProtectedRoute>} />
          <Route path="/guru" element={<ProtectedRoute adminOnly><Guru /></ProtectedRoute>} />
          {/* Data Pegawai (tenant kantor) — route BARU & TERPISAH dari /guru,
              supaya "Data Guru" milik sekolah tidak tersentuh sama sekali.
              Menulis ke tabel `pegawai_kantor` (lihat DataPegawaiKantor.jsx). */}
          <Route path="/data-pegawai-kantor" element={<ProtectedRoute adminOnly><DataPegawaiKantor /></ProtectedRoute>} />
          <Route path="/kelas" element={<ProtectedRoute adminOnly><Kelas /></ProtectedRoute>} />

          {/* ============================================================
              3. LAPORAN GURU & SAMPUL LAPORAN
             ============================================================ */}
          <Route path="/laporan-nominatif-guru" element={<ProtectedRoute adminOnly><LaporanNominatifGuru /></ProtectedRoute>} />
          <Route path="/laporan-biodata-guru" element={<ProtectedRoute adminOnly><LaporanBiodataGuru /></ProtectedRoute>} />
          <Route path="/laporan-pendidikan-guru" element={<ProtectedRoute adminOnly><LaporanPendidikanGuru /></ProtectedRoute>} />
          <Route path="/laporan-kepangkatan-guru" element={<ProtectedRoute adminOnly><LaporanKepangkatanGuru /></ProtectedRoute>} />
          <Route path="/laporan-tanggungan-keluarga" element={<ProtectedRoute adminOnly><LaporanTanggunganKeluarga /></ProtectedRoute>} />
          {/* Data Rincian Tenaga Pengajar & Data Keadaan Murid — dua kartu yang
              sebelumnya "Segera Hadir" di PusatLaporanGuru.jsx, sekarang aktif. */}
          <Route path="/laporan-tenaga-pengajar" element={<ProtectedRoute adminOnly><LaporanTenagaPengajar /></ProtectedRoute>} />
          <Route path="/laporan-keadaan-murid" element={<ProtectedRoute adminOnly><LaporanKeadaanMurid /></ProtectedRoute>} />
          {/* Laporan Semester — dari format LAPORAN_BULANAN_-_Copy.docx (jam
              pelajaran per kelas, keadaan gedung/ruang, keadaan buku KTSP & K-13). */}
          <Route path="/laporan-semester" element={<ProtectedRoute adminOnly><LaporanSemester /></ProtectedRoute>} />
          <Route path="/laporan" element={<ProtectedRoute adminOnly><LaporanBulanan /></ProtectedRoute>} />
          {/* Laporan Daftar Hadir Guru/Pegawai — halaman berdiri sendiri (dilepas
              dari selector "Jenis Laporan" di LaporanBulanan.jsx, logika sama). */}
          <Route path="/laporan-daftar-hadir-guru" element={<ProtectedRoute adminOnly><LaporanDaftarHadirGuru /></ProtectedRoute>} />
          <Route path="/laporan-guru" element={<ProtectedRoute adminOnly><PusatLaporanGuru /></ProtectedRoute>} />
          {/* Cetak Sampul Laporan — satu halaman dengan sidebar menu berisi
              semua jenis laporan (Bulanan, Semester, 8355, LPJ BOS, dst). */}
          <Route path="/cetak-sampul" element={<ProtectedRoute adminOnly><CetakSampulHub /></ProtectedRoute>} />
          {/* Link lama dipertahankan (redirect) supaya bookmark/tautan yang
              sudah pernah dibagikan tidak mati. */}
          <Route path="/cetak-sampul-semester" element={<Navigate to="/cetak-sampul?jenis=semester" replace />} />
          <Route path="/cetak-sampul-8355" element={<Navigate to="/cetak-sampul?jenis=8355" replace />} />
          <Route path="/data-ujian-8355" element={<ProtectedRoute adminOnly><DataUjian8355 /></ProtectedRoute>} />
          <Route path="/cetak-8355" element={<ProtectedRoute adminOnly><Cetak8355 /></ProtectedRoute>} />

          {/* ============================================================
              4. AKADEMIK — jadwal, presensi, nilai, rapor, kelulusan
             ============================================================ */}
          <Route path="/jadwal" element={<ProtectedRoute><Jadwal /></ProtectedRoute>} />
          <Route path="/presensi" element={<ProtectedRoute><Presensi /></ProtectedRoute>} />
          <Route path="/nilai" element={<ProtectedRoute><Nilai /></ProtectedRoute>} />
          <Route path="/nilai-asesmen" element={<ProtectedRoute><NilaiAsesmen /></ProtectedRoute>} />
          <Route path="/rapor" element={<ProtectedRoute><Rapor /></ProtectedRoute>} />
          <Route path="/portofolio-siswa" element={<ProtectedRoute><PortofolioSiswa /></ProtectedRoute>} />
          <Route path="/rapor/cetak" element={<ProtectedRoute><RaporCetak /></ProtectedRoute>} />
          <Route path="/ijazah" element={<ProtectedRoute><Ijazah /></ProtectedRoute>} />
          <Route path="/skl" element={<ProtectedRoute><SuratKeteranganLulus /></ProtectedRoute>} />
          <Route path="/cetak-sampul" element={<ProtectedRoute><CetakSampulHub /></ProtectedRoute>} />
          <Route path="/rpp" element={<ProtectedRoute><RPP /></ProtectedRoute>} />
          <Route path="/arsip-rpp" element={<ProtectedRoute><ArsipRPP /></ProtectedRoute>} />
          <Route path="/bank-soal" element={<ProtectedRoute><BankSoal /></ProtectedRoute>} />
          <Route path="/buat-ujian" element={<ProtectedRoute><BuatUjian /></ProtectedRoute>} />
          <Route path="/buat-kuis-seru" element={<ProtectedRoute><BuatKuisSeru /></ProtectedRoute>} />
          <Route path="/hasil-kuis-seru" element={<ProtectedRoute><HasilKuisSeru /></ProtectedRoute>} />
          <Route path="/kartu" element={<ProtectedRoute adminOnly><KartuSiswa /></ProtectedRoute>} />
          <Route path="/hari-libur" element={<ProtectedRoute adminOnly><HariLibur /></ProtectedRoute>} />
          {/* Kalender Pendidikan: BUKAN adminOnly — guru tetap bisa melihat kalender,
              kontrol edit (klik tanggal untuk ubah status) sudah dibatasi di dalam
              komponen lewat isAdmin dari useAuth(). */}
          <Route path="/kalender-pendidikan" element={<ProtectedRoute><KalenderPendidikan /></ProtectedRoute>} />

          {/* ============================================================
              5. HALAMAN ORANG TUA — read-only, anak diambil lewat tabel
                 orang_tua_siswa (lihat getAnakSaya di AuthContext)
             ============================================================ */}
          <Route path="/rapor-anak" element={<ProtectedRoute><RaporAnak /></ProtectedRoute>} />
          <Route path="/presensi-anak" element={<ProtectedRoute><PresensiAnak /></ProtectedRoute>} />
          <Route path="/portofolio-anak" element={<ProtectedRoute><PortofolioAnak /></ProtectedRoute>} />
          <Route path="/galeri-orang-tua" element={<ProtectedRoute><GaleriOrangTua /></ProtectedRoute>} />

          {/* ============================================================
              6. ADMINISTRASI & KEUANGAN SEKOLAH
             ============================================================ */}
          <Route path="/inventaris" element={<ProtectedRoute adminOnly><Inventaris /></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
          <Route path="/surat" element={<ProtectedRoute adminOnly><Surat /></ProtectedRoute>} />
          <Route path="/surat-keterangan" element={<ProtectedRoute adminOnly><SuratKeterangan /></ProtectedRoute>} />
          <Route path="/keuangan" element={<ProtectedRoute adminOnly><Keuangan /></ProtectedRoute>} />
          {/* Keuangan Kelas: BUKAN adminOnly — ini kas kelas yang dipegang wali kelas (guru),
              admin tetap bisa membuka untuk memantau semua kelas. */}
          <Route path="/keuangan-kelas" element={<ProtectedRoute><KeuanganKelas /></ProtectedRoute>} />
          <Route path="/kuitansi" element={<ProtectedRoute adminOnly><Kuitansi /></ProtectedRoute>} />
          <Route path="/nota" element={<ProtectedRoute adminOnly><NotaDenganSekolah /></ProtectedRoute>} />
          <Route path="/kuitansi-jasa" element={<ProtectedRoute adminOnly><KuitansiJasa /></ProtectedRoute>} />
          <Route path="/backup" element={<ProtectedRoute adminOnly><Backup /></ProtectedRoute>} />
          <Route path="/profil-sekolah" element={<ProtectedRoute adminUtamaOnly><ProfilSekolah /></ProtectedRoute>} />
          <Route path="/manajemen-sekolah" element={<ProtectedRoute superAdminOnly><ManajemenSekolah /></ProtectedRoute>} />
          <Route path="/ppdb-admin" element={<ProtectedRoute adminOnly><PPDBAdmin /></ProtectedRoute>} />

          {/* ============================================================
              7. KONTEN & KOMUNIKASI
             ============================================================ */}
          <Route path="/perpustakaan" element={<ProtectedRoute><Perpustakaan /></ProtectedRoute>} />
          <Route path="/pengumuman" element={<ProtectedRoute><Pengumuman /></ProtectedRoute>} />
          <Route path="/galeri" element={<ProtectedRoute><Galeri /></ProtectedRoute>} />
          <Route path="/dokumen" element={<ProtectedRoute><Dokumen /></ProtectedRoute>} />
          <Route path="/pesan" element={<ProtectedRoute><Pesan /></ProtectedRoute>} />
          <Route path="/administrasi-kelas" element={<ProtectedRoute><AdministrasiKantor /></ProtectedRoute>} />
          {/* Live Chat: percakapan real-time dengan pengunjung publik di Beranda.
              Dibatasi superAdminOnly karena tabel live_chat_pesan adalah satu
              kotak masuk GLOBAL (tanpa kolom sekolah_id) dan RLS di Supabase
              sudah dikunci hanya untuk role 'superadmin'. */}
          <Route path="/live-chat" element={<ProtectedRoute superAdminOnly><AdminLiveChat /></ProtectedRoute>} />
          {/* Scan Dokumen: OCR upload/foto dokumen jadi teks yang bisa diunduh sebagai
              Word/txt. Sengaja BUKAN adminOnly — guru juga butuh fitur ini. */}
          <Route path="/scan-dokumen" element={<ProtectedRoute><ScanDokumen /></ProtectedRoute>} />
          <Route path="/rapat" element={<ProtectedRoute><Rapat /></ProtectedRoute>} />
          {/* Sengaja TIDAK dibungkus ProtectedRoute — link rapat dibagikan ke
              peserta yang mungkin belum/tidak punya akun (mis. orang tua, tamu),
              jadi mereka bisa langsung gabung cukup dengan mengisi nama.
              RapatVideo sendiri yang menangani kasus sudah login vs tamu. */}
          <Route path="/rapat/:roomId" element={<RapatVideo />} />

          {/* ============================================================
              8. PENGAJUAN & PROFIL PRIBADI
             ============================================================ */}
          <Route path="/pengajuan-surat-aktif" element={<ProtectedRoute><PengajuanSuratAktif /></ProtectedRoute>} />
          <Route path="/perbaikan-data-siswa" element={<ProtectedRoute><PengajuanEditSiswa /></ProtectedRoute>} />
          <Route path="/pengajuan-kebutuhan-kelas" element={<ProtectedRoute><PengajuanKebutuhanKelas /></ProtectedRoute>} />
          <Route path="/profil-saya" element={<ProtectedRoute><ProfilSaya /></ProtectedRoute>} />
          <Route path="/sertifikat" element={<ProtectedRoute><SertifikatPenghargaan /></ProtectedRoute>} />
          {/* Halaman terbuka untuk SEMUA role yang sudah login (admin, guru,
              orang tua) — status paket (free/premium) melekat ke masing-masing
              akun individu, bukan ke sekolah. */}
          <Route path="/upgrade-fitur" element={<ProtectedRoute><UpgradeFitur /></ProtectedRoute>} />

          {/* ============================================================
              9. TOKO — semua route bertema toko dikumpulkan di sini
             ============================================================ */}
          {/* Belanja & checkout — /toko, /toko/:id/keranjang, dan
              /toko/:id/pengiriman sengaja TIDAK dibungkus ProtectedRoute,
              pengunjung boleh lihat-lihat & isi keranjang tanpa akun. Login
              baru diwajibkan saat checkout, dan otomatis kembali ke halaman
              checkout setelah berhasil login (lihat state `from` di
              ProtectedRoute & Login.jsx). */}
          <Route path="/toko" element={<Toko />} />
          <Route path="/toko/:id/keranjang" element={<Keranjang />} />
          <Route path="/toko/:id/pengiriman" element={<PilihPengiriman />} />
          <Route path="/toko/:id/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/toko/:id/pesanan-sukses" element={<ProtectedRoute><PesananSukses /></ProtectedRoute>} />
          {/* Riwayat Pesanan: rekap semua transaksi milik pembeli yang login,
              lintas toko (bukan per toko_id seperti keranjang/checkout). */}
          <Route path="/riwayat-pesanan" element={<ProtectedRoute><RiwayatPesanan /></ProtectedRoute>} />
          {/* Pesanan Masuk: sisi penjual — pemilik toko lihat pesanan ke
              tokonya sendiri (view-only), superadmin lihat semua toko dan
              satu-satunya yang boleh mengubah status (dikunci lewat RLS
              "Superadmin ubah status pesanan" di Supabase). */}
          <Route path="/pesanan-masuk" element={<ProtectedRoute><PesananMasuk /></ProtectedRoute>} />
          {/* Riwayat Pencairan Saya: sisi penjual — pemilik toko pantau status
              pencairan dana tokonya sendiri (view-only). Sengaja BUKAN
              superAdminOnly/adminOnly, dibatasi lewat RLS "Pemilik toko lihat
              pesanan tokonya" — akun tanpa toko otomatis melihat daftar kosong. */}
          <Route path="/riwayat-pencairan-saya" element={<ProtectedRoute><RiwayatPencairanSaya /></ProtectedRoute>} />
          {/* Pengajuan & Persetujuan Toko Baru:
              /ajukan-toko: admin sekolah (adminOnly — mencakup admin & admin_utama,
              RLS insert pengajuan_toko sudah membatasi lebih ketat lagi ke role
              'admin'/'admin_utama' persis).
              /persetujuan-toko: khusus superadmin, sesuai policy select "Superadmin
              lihat semua pengajuan toko" dan function fn_setujui_pengajuan_toko /
              fn_tolak_pengajuan_toko yang mengunci syarat superadmin di server. */}
          <Route path="/ajukan-toko" element={<ProtectedRoute adminOnly><AjukanToko /></ProtectedRoute>} />
          <Route path="/persetujuan-toko" element={<ProtectedRoute superAdminOnly><PersetujuanToko /></ProtectedRoute>} />
          {/* Pencairan Dana: khusus superadmin — satu-satunya yang boleh
              menandai dana sudah ditransfer manual ke penjual, lewat RPC
              security definer fn_cairkan_pesanan / fn_tahan_pencairan. */}
          <Route path="/pencairan-dana" element={<ProtectedRoute superAdminOnly><PencairanDana /></ProtectedRoute>} />

          {/* ============================================================
              10. FALLBACK
             ============================================================ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </CartProvider>
  )
}
