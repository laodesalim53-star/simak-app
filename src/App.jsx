import { useState, useEffect } from 'react'
import BankSoal from './pages/BankSoal'
import KartuSiswa from './pages/KartuSiswa'
import Galeri from './pages/Galeri'
import GaleriOrangTua from './pages/GaleriOrangTua'
import Dokumen from './pages/Dokumen'
import Pesan from './pages/Pesan'
import PesanPusat from './pages/PesanPusat'
import AdminLiveChat from './pages/AdminLiveChat'
import ScanDokumen from './pages/ScanDokumen'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import { supabase } from './lib/supabaseClient'
import Beranda from './pages/Beranda'
import Login from './pages/Login'
import Register from './pages/Register'
import MenungguPersetujuan from './pages/MenungguPersetujuan'
import PersetujuanAkun from './pages/PersetujuanAkun'
import Dashboard from './pages/Dashboard'
import Siswa from './pages/Siswa'
import HasilUjian from './pages/HasilUjian'
import Guru from './pages/Guru'
// Data Pegawai (tenant kantor) — komponen & tabel TERPISAH dari Guru/`guru`.
// Lihat DataPegawaiKantor.jsx: menulis ke tabel `pegawai_kantor`.
import DataPegawaiKantor from './pages/DataPegawaiKantor'
import LaporanNominatifGuru from './pages/LaporanNominatifGuru'
import LaporanBiodataGuru from './pages/LaporanBiodataGuru'
import LaporanPendidikanGuru from './pages/LaporanPendidikanGuru'
import LaporanKepangkatanGuru from './pages/LaporanKepangkatanGuru'
import LaporanTanggunganKeluarga from './pages/LaporanTanggunganKeluarga'
import LaporanTenagaPengajar from './pages/LaporanTenagaPengajar'
import LaporanKeadaanMurid from './pages/LaporanKeadaanMurid'
import LaporanSemester from './pages/LaporanSemester'
import PusatLaporanGuru from './pages/PusatLaporanGuru'
// Laporan Daftar Hadir Guru/Pegawai — halaman berdiri sendiri, dipisah dari
// selector "Jenis Laporan" di LaporanBulanan.jsx (logika & template sama).
import LaporanDaftarHadirGuru from './pages/LaporanDaftarHadirGuru'
import Kelas from './pages/Kelas'
import Jadwal from './pages/Jadwal'
import Presensi from './pages/Presensi'
import Nilai from './pages/Nilai'
import Pengumuman from './pages/Pengumuman'
import Inventaris from './pages/Inventaris'
import Agenda from './pages/Agenda'
import Surat from './pages/Surat'
import SuratKeterangan from './pages/SuratKeterangan'
import Rapor from './pages/Rapor'
import RaporCetak from './pages/RaporCetak'
import LaporanBulanan from './pages/LaporanBulanan'
import Keuangan from './pages/Keuangan'
import KeuanganKelas from './pages/KeuanganKelas'
import Kuitansi from './pages/Kuitansi'
import Nota from './pages/Nota'
import KuitansiJasa from './pages/KuitansiJasa'
import Backup from './pages/Backup'
import ProfilSekolah from './pages/ProfilSekolah'
import ManajemenSekolah from './pages/ManajemenSekolah'
import PPDBPublik from './pages/PPDBPublik'
import PPDBAdmin from './pages/PPDBAdmin'
import Perpustakaan from './pages/Perpustakaan'
import RPP from './pages/RPP'
import ArsipRPP from './pages/ArsipRPP'
import BuatUjian from './pages/BuatUjian'
import UjianOnline from './pages/UjianOnline'
import ProfilSaya from './pages/ProfilSaya'
import SertifikatPenghargaan from './pages/SertifikatPenghargaan'
import PortofolioSiswa from './pages/PortofolioSiswa'
import PengajuanSuratAktif from './pages/PengajuanSuratAktif'
import PengajuanEditSiswa from './pages/PengajuanEditSiswa'
import PengajuanKebutuhanKelas from './pages/PengajuanKebutuhanKelas'
import HariLibur from './pages/HariLibur'
import KalenderPendidikan from './pages/KalenderPendidikan'
import Rapat from './pages/Rapat'
import RapatVideo from './pages/RapatVideo'
import Ijazah from './pages/Ijazah'
import NilaiAsesmen from './pages/NilaiAsesmen'
import SuratKeteranganLulus from './pages/SuratKeteranganLulus'
import BuatKuisSeru from './pages/BuatKuisSeru'
import KuisSeru from './pages/KuisSeru'
import HasilKuisSeru from './pages/HasilKuisSeru'
import RaporAnak from './pages/RaporAnak'
import PresensiAnak from './pages/PresensiAnak'
import PortofolioAnak from './pages/PortofolioAnak'
import Loader from './components/Loader'
// --- Fitur Toko: Keranjang & Checkout ---
import Toko from './pages/Toko'
import Keranjang from './pages/Keranjang'
import PilihPengiriman from './pages/PilihPengiriman'
import Checkout from './pages/Checkout'
import PesananSukses from './pages/PesananSukses'
import RiwayatPesanan from './pages/RiwayatPesanan'
import PesananMasuk from './pages/PesananMasuk'
import RiwayatPencairanSaya from './pages/RiwayatPencairanSaya'
// --- Fitur Toko: Pengajuan & Persetujuan Toko Baru ---
import AjukanToko from './pages/AjukanToko'
import PersetujuanToko from './pages/PersetujuanToko'
// --- Fitur Toko: Pencairan Dana ke penjual (superadmin only) ---
import PencairanDana from './pages/PencairanDana'
// --- Fitur Upgrade Paket/Langganan (Free vs Premium, per user) ---
import UpgradeFitur from './pages/UpgradeFitur'
// --- Fitur Data/Cetak Ujian 8355 (superadmin only) ---
import DataUjian8355 from './pages/DataUjian8355'
import Cetak8355 from './pages/Cetak8355'
// --- Fitur Cetak Sampul Laporan (generik, kop otomatis dari profil_sekolah) ---
// Satu halaman dengan sidebar menu, menggantikan file terpisah
// CetakSampul.jsx / CetakSampulSemester.jsx / CetakSampul8355.jsx.
import CetakSampulHub from './pages/CetakSampulHub'
import { CartProvider } from './lib/CartContext'

// Halaman "dashboard" (setelah login) — semua redirect kegagalan akses
// (adminOnly/adminUtamaOnly/superAdminOnly) mengarah ke sini, BUKAN ke "/"
// lagi, karena "/" sekarang adalah halaman Beranda publik (poster promosi).
const HALAMAN_SETELAH_LOGIN = '/dashboard'

function ProtectedRoute({ children, adminOnly, adminUtamaOnly, superAdminOnly }) {
  const { session, loading, isAdmin, isAdminUtama, isSuperAdmin, statusAkun } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const location = useLocation()

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
        <Route path="/siswa-nonaktif" element={<ProtectedRoute adminOnly><SiswaNonaktif /></ProtectedRoute>} />
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
        <Route path="/rapor/cetak" element={<ProtectedRoute><RaporCetak /></ProtectedRoute>} />
        <Route path="/ijazah" element={<ProtectedRoute><Ijazah /></ProtectedRoute>} />
        <Route path="/skl" element={<ProtectedRoute><SuratKeteranganLulus /></ProtectedRoute>} />
        <Route path="/cetak-sampul" element={<ProtectedRoute ><CetakSampulHub /></ProtectedRoute>} />
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
        <Route path="/pesan-pusat" element={<ProtectedRoute adminOnly><PesanPusat /></ProtectedRoute>} />
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
        <Route path="/portofolio-siswa" element={<ProtectedRoute><PortofolioSiswa /></ProtectedRoute>} />
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
    </CartProvider>
  )
}
