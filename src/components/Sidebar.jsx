import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  X,
  LayoutDashboard,
  Users,
  UserX,
  GraduationCap,
  DoorOpen,
  CalendarClock,
  ClipboardCheck,
  BookOpenCheck,
  Megaphone,
  Power,
  Boxes,
  CalendarDays,
  Mail,
  FileBadge,
  ScrollText,
  Stamp,
  FileText,
  FileSignature,
  Wallet,
  Banknote,
  DatabaseBackup,
  UserPlus,
  Landmark,
  Library,
  NotebookPen,
  Archive,
  UserCircle,
  Images,
  Image,
  HardDrive,
  ClipboardList,
  Database,
  IdCard,
  FilePlus,
  CalendarOff,
  FileCheck2,
  UserCog,
  Award,
  Video,
  Receipt,
  ShoppingCart,
  Store,
  History,
  PackagePlus,
  FolderHeart,
  PiggyBank,
  FileSpreadsheet,
  Gamepad2,
  ScanLine,
  CalendarRange,
  ShieldCheck,
  MessageCircle,
  MessagesSquare,
  Building2,
  Inbox,
  Sparkles,
  FileStack,
  Briefcase,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Menu ADMIN dikelompokkan per kategori supaya tidak jadi satu daftar panjang.
// Dibuat sebagai fungsi karena "Persetujuan Akun" dan "Profil Sekolah" hanya
// boleh tampil untuk admin utama / superadmin, bukan admin biasa.
function getGroupsAdmin(
  isAdminUtama,
  isSuperAdmin,
  isKepalaSekolah,
  jumlahMenunggu = 0,
  jumlahPesanBelumDibaca = 0,
  jumlahPesanPusatBelumDibaca = 0,
  jumlahPengajuanTokoMenunggu = 0,
  jumlahSiapDicairkan = 0,
  jumlahLiveChatBelumDibaca = 0
) {
  return [
    {
      label: null, // tanpa judul grup — selalu di atas
      links: [
        // PERBAIKAN: "/" sekarang halaman Beranda publik (poster promosi),
        // Dashboard aplikasi dipindah ke "/dashboard" — menu ini harus ikut.
        { to: '/dashboard', label: 'Dasbor', icon: LayoutDashboard, end: true },
        { to: '/profil-saya', label: 'Profil Saya', icon: UserCircle },
        // Upgrade Fitur: status paket (free/premium) melekat ke akun masing-
        // masing, jadi menu ini tampil untuk semua role, bukan cuma admin.
        { to: '/upgrade-fitur', label: 'Upgrade Fitur', icon: Sparkles },
        { to: '/pesan', label: 'Pesan', icon: MessageCircle, badge: jumlahPesanBelumDibaca },
        // Chat dua arah dengan Superadmin ("Admin Pusat") — khusus admin-tier,
        // guru tidak pernah melihat menu ini karena guru pakai getLinksGuru().
        { to: '/pesan-pusat', label: 'Admin Pusat', icon: Building2, badge: jumlahPesanPusatBelumDibaca },
        // PERBAIKAN: "Live Chat" (percakapan dengan pengunjung publik di
        // Beranda) sebelumnya tampil untuk SEMUA admin-tier (admin,
        // admin_utama, superadmin, kepala_sekolah), padahal tabel
        // live_chat_pesan adalah satu kotak masuk GLOBAL milik superadmin
        // (tidak ada kolom sekolah_id, RLS di Supabase juga sudah dikunci
        // hanya untuk role 'superadmin'). Menu ini sekarang disembunyikan
        // untuk admin sekolah, sama seperti pola item superadmin-only lain
        // di bawah (Manajemen Sekolah, Persetujuan Toko, Pencairan Dana).
        ...(isSuperAdmin
          ? [{ to: '/live-chat', label: 'Live Chat', icon: MessagesSquare, badge: jumlahLiveChatBelumDibaca }]
          : []),
        { to: '/toko', label: 'Toko', icon: Store },
        { to: '/riwayat-pesanan', label: 'Riwayat Pesanan', icon: Receipt },
        { to: '/pesanan-masuk', label: 'Pesanan Masuk (Toko)', icon: Inbox },
        // "Ajukan Toko" hanya untuk admin sekolah (admin/admin_utama) — sesuai
        // RLS insert pengajuan_toko yang membatasi ke kedua role itu.
        // Superadmin tidak mengajukan toko, jadi menu ini disembunyikan
        // untuknya (superadmin punya menu "Persetujuan Toko" sendiri).
        ...(!isSuperAdmin
          ? [{ to: '/ajukan-toko', label: 'Ajukan Toko', icon: Store }]
          : []),
        { to: '/rapat', label: 'Rapat Video', icon: Video },
        { to: '/galeri', label: 'Galeri Kegiatan', icon: Images },
        { to: '/dokumen', label: 'Dokumen Penting', icon: HardDrive },
        { to: '/scan-dokumen', label: 'Scan Dokumen', icon: ScanLine },
        { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
      ],
    },
    {
      label: 'Akademik',
      links: [
        { to: '/siswa', label: 'Data Siswa', icon: Users },
        { to: '/siswa-nonaktif', label: 'Siswa Nonaktif', icon: UserX },
        { to: '/guru', label: 'Data Guru', icon: GraduationCap },
        { to: '/kelas', label: 'Kelas', icon: DoorOpen },
        { to: '/jadwal', label: 'Jadwal Pelajaran', icon: CalendarClock },
        { to: '/presensi', label: 'Presensi', icon: ClipboardCheck },
        { to: '/nilai', label: 'Nilai Siswa', icon: BookOpenCheck },
        { to: '/nilai-asesmen', label: 'Nilai Asesmen', icon: FileSpreadsheet },
        { to: '/rapor', label: 'Rapor Siswa', icon: FileBadge },
        { to: '/ijazah', label: 'Ijazah', icon: ScrollText },
        { to: '/portofolio-siswa', label: 'Portofolio Siswa', icon: FolderHeart },
        { to: '/rpp', label: 'RPP', icon: NotebookPen },
        { to: '/arsip-rpp', label: 'Arsip RPP', icon: Archive },
        { to: '/sertifikat', label: 'Sertifikat & Penghargaan', icon: Award },
        { to: '/buat-ujian', label: 'Buat Ujian', icon: FilePlus },
        { to: '/hasil-ujian', label: 'Hasil Ujian', icon: ClipboardList },
        { to: '/bank-soal', label: 'Bank Soal', icon: Database },
        { to: '/buat-kuis-seru', label: 'Kuis Seru (Kls 1-3)', icon: Gamepad2 },
      ],
    },
    {
      label: 'Keuangan & Aset',
      links: [
        { to: '/keuangan', label: 'Keuangan', icon: Wallet },
        { to: '/keuangan-kelas', label: 'Keuangan Kelas', icon: PiggyBank },
        { to: '/kuitansi', label: 'Kuitansi', icon: Receipt },
        { to: '/kuitansi-jasa', label: 'Kuitansi Jasa', icon: Receipt },
        { to: '/nota', label: 'Nota Belanja', icon: ShoppingCart },
        { to: '/perpustakaan', label: 'Perpustakaan', icon: Library },
        { to: '/inventaris', label: 'Inventaris', icon: Boxes },
        // Riwayat Pencairan Saya: sisi penjual/pemilik toko (admin/admin_utama)
        // melihat riwayat pencairan dana toko miliknya sendiri. Bukan untuk
        // superadmin — superadmin punya "Pencairan Dana" (global, semua toko)
        // di bawah, bukan riwayat pencairan milik toko sendiri.
        ...(!isSuperAdmin
          ? [{ to: '/riwayat-pencairan-saya', label: 'Riwayat Pencairan Saya', icon: History }]
          : []),
        // Pencairan Dana hanya untuk superadmin — satu-satunya yang boleh
        // menandai dana sudah ditransfer ke penjual (lewat RPC
        // fn_cairkan_pesanan / fn_tahan_pencairan, lihat PencairanDana.jsx).
        ...(isSuperAdmin
          ? [
              {
                to: '/pencairan-dana',
                label: 'Pencairan Dana',
                icon: Banknote,
                badge: jumlahSiapDicairkan,
              },
            ]
          : []),
      ],
    },
    {
      label: 'Administrasi',
      links: [
        { to: '/pengajuan-surat-aktif', label: 'Pengajuan Surat Aktif', icon: FileCheck2 },
        { to: '/perbaikan-data-siswa', label: 'Perbaikan Data Siswa', icon: UserCog },
        { to: '/pengajuan-kebutuhan-kelas', label: 'Kebutuhan Kelas', icon: PackagePlus },
        { to: '/agenda', label: 'Agenda Sekolah', icon: CalendarDays },
        { to: '/surat', label: 'Surat Masuk/Keluar', icon: Mail },
        { to: '/ppdb-admin', label: 'PPDB Siswa Baru', icon: UserPlus },
        { to: '/laporan', label: 'Laporan Bulanan', icon: FileText },
        // Laporan Kepegawaian Guru: satu pintu untuk semua laporan guru,
        // TERMASUK Data Ujian 8355 & Cetak 8355 (dua item menu terpisah
        // untuk itu sudah dihapus dari sini — sekarang jadi kartu di dalam
        // halaman ini, lihat PusatLaporanGuru.jsx).
        { to: '/laporan-guru', label: 'Laporan Kepegawaian Guru', icon: GraduationCap },
        { to: '/hari-libur', label: 'Hari Libur', icon: CalendarOff },
        { to: '/kalender-pendidikan', label: 'Kalender Pendidikan', icon: CalendarRange },
        { to: '/backup', label: 'Backup Data', icon: DatabaseBackup },
        // Cetak Sampul: ditaruh berdekatan dengan menu cetak lainnya.
        // Satu halaman ini sudah punya sidebar menu sendiri di dalamnya
        // untuk memilih semua jenis laporan (termasuk Semester & 8355),
        // jadi tidak perlu lagi item menu terpisah untuk tiap jenis.
        { to: '/cetak-sampul', label: 'Cetak Sampul', icon: FileStack },
        // Manajemen Sekolah dan Persetujuan Toko hanya untuk superadmin.
        ...(isSuperAdmin
          ? [
              { to: '/manajemen-sekolah', label: 'Manajemen Sekolah', icon: Building2 },
              {
                to: '/persetujuan-toko',
                label: 'Persetujuan Toko',
                icon: ShieldCheck,
                badge: jumlahPengajuanTokoMenunggu,
              },
            ]
          : []),
        // "Persetujuan Akun" dan "Profil Sekolah" hanya untuk admin utama / superadmin
        ...(isAdminUtama
          ? [
              { to: '/persetujuan-akun', label: 'Persetujuan Akun', icon: ShieldCheck, badge: jumlahMenunggu },
              { to: '/profil-sekolah', label: 'Profil Sekolah', icon: Landmark },
            ]
          : []),
        { to: '/kartu', label: 'Cetak Kartu', icon: IdCard },
      ],
    },
  ]
}

// Menu ADMIN untuk tenant "kantor" (isKantor) — versi ringkas dari
// getGroupsAdmin() di atas, hanya fitur umum yang diminta: data pegawai,
// presensi, surat-menyurat, dan dokumen. Semua item akademik (siswa, kelas,
// rapor, nilai, ijazah, RPP, bank soal, PPDB, dst) dan Toko/Keuangan sengaja
// TIDAK disertakan supaya menu tidak membingungkan untuk tenant kantor.
// CATATAN: "Data Pegawai" SEKARANG mengarah ke /data-pegawai-kantor (route
// & tabel `pegawai_kantor` terpisah dari /guru & tabel `guru`) — sebelumnya
// sempat reuse /guru, tapi itu bikin data pegawai kantor tercampur ke tabel
// guru yang penuh field khas Dapodik (NUPTK, mata pelajaran, dll) yang
// tidak relevan untuk kantor. Rute lain (Presensi, Laporan Kepegawaian,
// Profil Kantor) untuk saat ini MASIH reuse rute sekolah — lihat catatan di
// komponen halaman masing-masing kalau nanti perlu dipisah juga.
function getGroupsKantorAdmin(isAdminUtama, jumlahMenunggu = 0, jumlahPesanBelumDibaca = 0) {
  return [
    {
      label: null,
      links: [
        { to: '/dashboard', label: 'Dasbor', icon: LayoutDashboard, end: true },
        { to: '/profil-saya', label: 'Profil Saya', icon: UserCircle },
        { to: '/upgrade-fitur', label: 'Upgrade Fitur', icon: Sparkles },
        { to: '/pesan', label: 'Pesan', icon: MessageCircle, badge: jumlahPesanBelumDibaca },
        { to: '/dokumen', label: 'Dokumen Penting', icon: HardDrive },
        { to: '/scan-dokumen', label: 'Scan Dokumen', icon: ScanLine },
        { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
      ],
    },
    {
      label: 'Kepegawaian',
      links: [
        // Data Pegawai: route BARU, komponen DataPegawaiKantor.jsx, tabel
        // `pegawai_kantor` — TERPISAH dari Data Guru (/guru, tabel `guru`).
        { to: '/data-pegawai-kantor', label: 'Data Pegawai', icon: Briefcase },
        { to: '/presensi', label: 'Presensi Pegawai', icon: ClipboardCheck },
        { to: '/laporan-guru', label: 'Laporan Kepegawaian', icon: GraduationCap },
      ],
    },
    {
      label: 'Administrasi',
      links: [
        { to: '/agenda', label: 'Agenda Kantor', icon: CalendarDays },
        { to: '/surat', label: 'Surat Masuk/Keluar', icon: Mail },
        { to: '/backup', label: 'Backup Data', icon: DatabaseBackup },
        // "Persetujuan Akun" dan "Profil Kantor" hanya untuk admin utama.
        ...(isAdminUtama
          ? [
              { to: '/persetujuan-akun', label: 'Persetujuan Akun', icon: ShieldCheck, badge: jumlahMenunggu },
              { to: '/profil-sekolah', label: 'Profil Kantor', icon: Landmark },
            ]
          : []),
      ],
    },
  ]
}

// Menu GURU: tetap ringkas, tidak perlu dikelompokkan
// Kuitansi, Kuitansi Jasa & Nota Belanja SENGAJA TIDAK ada di sini — ketiga
// fitur ini admin-only (lihat RLS policy nota_hanya_admin di Supabase).
function getLinksGuru(jumlahPesanBelumDibaca = 0, sekolahIdGuru = null) {
  return [
  // PERBAIKAN: "/" sekarang halaman Beranda publik, Dashboard di "/dashboard".
  { to: '/dashboard', label: 'Dasbor', icon: LayoutDashboard, end: true },
  { to: '/profil-saya', label: 'Profil Saya', icon: UserCircle },
  { to: '/upgrade-fitur', label: 'Upgrade Fitur', icon: Sparkles },
  { to: '/pesan', label: 'Pesan', icon: MessageCircle, badge: jumlahPesanBelumDibaca },
  { to: '/toko', label: 'Toko', icon: Store },
  { to: '/riwayat-pesanan', label: 'Riwayat Pesanan', icon: Receipt },
  { to: '/pesanan-masuk', label: 'Pesanan Masuk (Toko)', icon: Inbox },
  { to: '/rapat', label: 'Rapat Video', icon: Video },
  { to: '/galeri', label: 'Galeri Kegiatan', icon: Images },
  { to: '/dokumen', label: 'Dokumen Penting', icon: HardDrive },
  { to: '/scan-dokumen', label: 'Scan Dokumen', icon: ScanLine },
  { to: '/keuangan-kelas', label: 'Keuangan Kelas', icon: PiggyBank },
  { to: '/siswa', label: 'Data Siswa', icon: Users },
  { to: '/siswa-nonaktif', label: 'Siswa Nonaktif', icon: UserX },
  { to: '/presensi', label: 'Presensi', icon: ClipboardCheck },
  { to: '/nilai', label: 'Nilai Siswa', icon: BookOpenCheck },
  { to: '/nilai-asesmen', label: 'Nilai Asesmen', icon: FileSpreadsheet },
  { to: '/rapor', label: 'Rapor Siswa', icon: FileBadge },
  { to: '/portofolio-siswa', label: 'Portofolio Siswa', icon: FolderHeart },
  { to: '/rpp', label: 'RPP', icon: NotebookPen },
  { to: '/arsip-rpp', label: 'Arsip RPP', icon: Archive },
  { to: '/sertifikat', label: 'Sertifikat & Penghargaan', icon: Award },
  { to: '/pengajuan-surat-aktif', label: 'Pengajuan Surat Aktif', icon: FileCheck2 },
  { to: '/perbaikan-data-siswa', label: 'Perbaikan Data Siswa', icon: UserCog },
  { to: '/pengajuan-kebutuhan-kelas', label: 'Kebutuhan Kelas', icon: PackagePlus },
  // Hanya tautan pintasan ke form publik, sama seperti menu orang tua —
  // approval pendaftar PPDB tetap khusus admin lewat /ppdb-admin.
  // PERBAIKAN: /ppdb/:sekolahId, bukan "/ppdb" polos (lihat catatan di
  // getLinksOrangTua di atas).
  { to: sekolahIdGuru ? `/ppdb/${sekolahIdGuru}` : '/ppdb', label: 'PPDB Siswa Baru', icon: UserPlus, external: true },
  { to: '/buat-ujian', label: 'Buat Ujian', icon: FilePlus },
  { to: '/hasil-ujian', label: 'Hasil Ujian', icon: ClipboardList },
  { to: '/bank-soal', label: 'Bank Soal', icon: Database },
  { to: '/buat-kuis-seru', label: 'Kuis Seru (Kls 1-3)', icon: Gamepad2 },
  { to: '/perpustakaan', label: 'Perpustakaan', icon: Library },
  { to: '/jadwal', label: 'Jadwal Pelajaran', icon: CalendarClock },
  { to: '/kalender-pendidikan', label: 'Kalender Pendidikan', icon: CalendarRange },
  { to: '/agenda', label: 'Agenda Sekolah', icon: CalendarDays },
  { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
  ]
}

// Menu PEGAWAI (non-admin) untuk tenant "kantor" — versi ringkas dari
// getLinksGuru() di atas, dipakai kalau isKantor true. Sama seperti
// getGroupsKantorAdmin(), rute tetap sama, cuma item akademik/toko
// dihilangkan dan labelnya disesuaikan.
function getLinksKantorPegawai(jumlahPesanBelumDibaca = 0) {
  return [
    { to: '/dashboard', label: 'Dasbor', icon: LayoutDashboard, end: true },
    { to: '/profil-saya', label: 'Profil Saya', icon: UserCircle },
    { to: '/upgrade-fitur', label: 'Upgrade Fitur', icon: Sparkles },
    { to: '/pesan', label: 'Pesan', icon: MessageCircle, badge: jumlahPesanBelumDibaca },
    { to: '/dokumen', label: 'Dokumen Penting', icon: HardDrive },
    { to: '/scan-dokumen', label: 'Scan Dokumen', icon: ScanLine },
    { to: '/presensi', label: 'Presensi', icon: ClipboardCheck },
    { to: '/agenda', label: 'Agenda Kantor', icon: CalendarDays },
    { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
  ]
}

function NavItem({ to, label, icon: Icon, end, badge, onNavigate, external }) {
  const content = (isActive) => (
    <>
      <Icon
        size={17}
        strokeWidth={1.8}
        fill={isActive ? 'rgba(255,255,255,0.25)' : 'currentColor'}
        fillOpacity={isActive ? 1 : 0.15}
      />
      <span className="flex-1">{label}</span>
      {!!badge && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm shadow-red-900/40">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  )

  // PERBAIKAN: beberapa halaman (mis. /ppdb) sengaja berdiri sendiri tanpa
  // Sidebar/tombol kembali, karena memang dibuat untuk diakses publik dari
  // luar aplikasi. Kalau dibuka lewat navigasi SPA biasa (NavLink), orang
  // tua yang sedang login akan "terdampar" di sana tanpa jalan kembali ke
  // dasbornya. Untuk item bertanda `external`, buka di tab baru supaya
  // dasbor tetap terbuka.
  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-white/70 hover:bg-white/[0.08] hover:text-white"
      >
        {content(false)}
      </a>
    )
  }

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-gradient-to-r from-blue-500 to-indigo-400 text-white shadow-sm shadow-black/20'
            : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
        }`
      }
    >
      {({ isActive }) => content(isActive)}
    </NavLink>
  )
}

// Ambil URL foto guru dari kolom foto_profil_path (isinya path storage,
// bukan URL lengkap) di bucket "foto-profil".
function getFotoUrl(fotoProfilPath) {
  if (!fotoProfilPath) return null
  if (fotoProfilPath.startsWith('http')) return fotoProfilPath
  const { data } = supabase.storage.from('foto-profil').getPublicUrl(fotoProfilPath)
  return data?.publicUrl || null
}

function getInisial(nama) {
  if (!nama) return '?'
  const kata = nama.trim().split(/\s+/)
  const inisial = kata.length > 1 ? kata[0][0] + kata[1][0] : kata[0].slice(0, 2)
  return inisial.toUpperCase()
}

// Label peran yang tampil di header sidebar — utamakan jabatan yang dipilih
// sendiri saat daftar (mis. "Kepala Sekolah"), baru fallback ke role teknis.
// PERBAIKAN: sebelumnya fungsi ini selalu jatuh ke 'Guru' sebagai default
// kalau semua pengecekan role di atas bernilai false — termasuk saat
// PROFIL BELUM DIMUAT atau user BELUM LOGIN (mis. tamu yang lihat-lihat
// halaman Toko, atau sesaat setelah klik Logout). Akibatnya sidebar
// sempat menampilkan "Guru" padahal orangnya tamu / bukan guru sama
// sekali. Sekarang: tanpa sesi -> 'Tamu', dan 'Guru' hanya dipakai kalau
// memang jabatan/role di profil benar-benar 'guru'.
function getLabelPeran(profil, isSuperAdmin, isAdminUtama, isAdmin, isOrangTua, hasSession) {
  if (!hasSession) return 'Tamu'
  if (isSuperAdmin) return 'Superadmin'
  if (profil?.jabatan === 'kepala_sekolah') return 'Kepala Sekolah'
  if (isAdminUtama) return 'Admin Utama'
  if (isAdmin) return 'Admin'
  if (isOrangTua) return 'Orang Tua/Wali'
  if (profil?.jabatan === 'guru' || profil?.role === 'guru') return 'Guru'
  // Sesi ada tapi profil belum selesai dimuat / tidak dikenali perannya.
  return 'Memuat...'
}

// Menu ORANG TUA: sangat ringkas, hanya halaman read-only milik anak
// mereka sendiri — TIDAK PERNAH pakai getLinksGuru(), supaya orang tua
// tidak pernah melihat menu kerja guru (Presensi, Nilai, dsb yang bisa
// diedit untuk SEMUA siswa di kelas).
function getLinksOrangTua(jumlahPesanBelumDibaca = 0, sekolahId = null) {
  return [
    // PERBAIKAN: "/" sekarang halaman Beranda publik, Dashboard di "/dashboard".
    { to: '/dashboard', label: 'Dasbor', icon: LayoutDashboard, end: true },
    { to: '/profil-saya', label: 'Profil Saya', icon: UserCircle },
    { to: '/upgrade-fitur', label: 'Upgrade Fitur', icon: Sparkles },
    { to: '/pesan', label: 'Pesan', icon: MessageCircle, badge: jumlahPesanBelumDibaca },
    { to: '/toko', label: 'Toko', icon: Store },
    { to: '/riwayat-pesanan', label: 'Riwayat Pesanan', icon: Receipt },
    { to: '/pesanan-masuk', label: 'Pesanan Masuk (Toko)', icon: Inbox },
    { to: '/rapat', label: 'Rapat Video', icon: Video },
    { to: '/rapor-anak', label: 'Rapor Anak', icon: FileBadge },
    { to: '/presensi-anak', label: 'Presensi Anak', icon: ClipboardCheck },
    { to: '/portofolio-anak', label: 'Portofolio Anak', icon: Image },
    { to: '/galeri-orang-tua', label: 'Galeri Kegiatan', icon: Images },
    { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
    // Kalender pendidikan (read-only untuk orang tua — halaman
    // KalenderPendidikan.jsx sudah otomatis menyembunyikan kontrol edit
    // untuk siapa pun yang bukan admin) dan tautan pintasan ke form
    // pendaftaran siswa baru (PPDB) yang memang sudah publik.
    // PERBAIKAN: link sekarang menyertakan sekolahId akun ini sendiri
    // (/ppdb/:sekolahId) — sebelumnya "/ppdb" polos selalu terbaca sebagai
    // sekolah yang salah (lihat perbaikan di PPDBPublik.jsx).
    { to: '/kalender-pendidikan', label: 'Kalender Pendidikan', icon: CalendarRange },
    { to: sekolahId ? `/ppdb/${sekolahId}` : '/ppdb', label: 'PPDB Siswa Baru', icon: UserPlus, external: true },
  ]
}

export default function Sidebar({ open = false, onClose = () => {} }) {
  const {
    signOut,
    session,
    profil,
    isAdmin,
    isAdminUtama,
    isSuperAdmin,
    isKepalaSekolah,
    isOrangTua,
    sekolahId,
    isKantor,
  } = useAuth()
  const navigate = useNavigate()
  const fotoUrl = getFotoUrl(profil?.foto_profil_path)
  const namaTampil = profil?.nama_lengkap || session?.user?.email || 'Pengguna'

  const labelPeran = getLabelPeran(profil, isSuperAdmin, isAdminUtama, isAdmin, isOrangTua, !!session)

  // PERBAIKAN: sebelumnya tombol ini cuma memanggil signOut() dan
  // menunggu redirect otomatis dari ProtectedRoute. Itu tidak berlaku di
  // halaman publik seperti /toko (sengaja bisa diakses tamu), jadi kalau
  // Logout diklik di sana, sesi Supabase sudah berakhir di baliknya tapi
  // tampilannya diam saja (terasa seperti "tidak langsung keluar", baru
  // ke-apply setelah diklik dua kali). Sekarang kita eksplisit arahkan ke
  // /login begitu proses signOut selesai, di halaman manapun.
  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  // Notifikasi real-time: jumlah pendaftaran akun yang masih menunggu persetujuan.
  // Hanya relevan untuk admin utama / superadmin yang punya menu "Persetujuan Akun".
  const [jumlahMenunggu, setJumlahMenunggu] = useState(0)

  useEffect(() => {
    if (!isAdminUtama) {
      setJumlahMenunggu(0)
      return
    }

    let aktif = true

    async function muatJumlahMenunggu() {
      let query = supabase
        .from('profil')
        .select('id', { count: 'exact', head: true })
        .eq('status_akun', 'menunggu')
      if (!isSuperAdmin) {
        query = query.eq('sekolah_id', sekolahId)
      }
      const { count } = await query
      if (aktif) setJumlahMenunggu(count || 0)
    }

    muatJumlahMenunggu()

    // Dengarkan perubahan tabel profil secara real-time (pendaftar baru, disetujui, ditolak, dll)
    // supaya badge notifikasi ter-update otomatis tanpa perlu refresh halaman.
    const channel = supabase
      .channel('persetujuan-akun-notifikasi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profil' }, () => {
        muatJumlahMenunggu()
      })
      .subscribe()

    return () => {
      aktif = false
      supabase.removeChannel(channel)
    }
  }, [isAdminUtama, isSuperAdmin, sekolahId])

  // Notifikasi real-time: jumlah pengajuan toko yang masih menunggu persetujuan.
  // Hanya relevan untuk superadmin (satu-satunya yang punya menu "Persetujuan Toko").
  const [jumlahPengajuanTokoMenunggu, setJumlahPengajuanTokoMenunggu] = useState(0)

  useEffect(() => {
    if (!isSuperAdmin) {
      setJumlahPengajuanTokoMenunggu(0)
      return
    }

    let aktif = true

    async function muatJumlahPengajuanToko() {
      const { count } = await supabase
        .from('pengajuan_toko')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'menunggu')
      if (aktif) setJumlahPengajuanTokoMenunggu(count || 0)
    }

    muatJumlahPengajuanToko()

    const channel = supabase
      .channel('pengajuan-toko-notifikasi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengajuan_toko' }, () => {
        muatJumlahPengajuanToko()
      })
      .subscribe()

    return () => {
      aktif = false
      supabase.removeChannel(channel)
    }
  }, [isSuperAdmin])

  // Notifikasi real-time: jumlah pesanan yang sudah siap dicairkan tapi
  // belum ditransfer ke penjual. Hanya relevan untuk superadmin (satu-
  // satunya yang punya menu "Pencairan Dana" dan boleh memanggil RPC
  // fn_cairkan_pesanan / fn_tahan_pencairan.
  const [jumlahSiapDicairkan, setJumlahSiapDicairkan] = useState(0)

  useEffect(() => {
    if (!isSuperAdmin) {
      setJumlahSiapDicairkan(0)
      return
    }

    let aktif = true

    async function muatJumlahSiapDicairkan() {
      const { count } = await supabase
        .from('pesanan')
        .select('id', { count: 'exact', head: true })
        .eq('status_pencairan', 'siap_dicairkan')
      if (aktif) setJumlahSiapDicairkan(count || 0)
    }

    muatJumlahSiapDicairkan()

    const channel = supabase
      .channel('pencairan-dana-notifikasi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, () => {
        muatJumlahSiapDicairkan()
      })
      .subscribe()

    return () => {
      aktif = false
      supabase.removeChannel(channel)
    }
  }, [isSuperAdmin])

  // Notifikasi real-time: jumlah pesan masuk yang belum dibaca (fitur Pesan).
  const [jumlahPesanBelumDibaca, setJumlahPesanBelumDibaca] = useState(0)

  useEffect(() => {
    if (!session?.user?.id) {
      setJumlahPesanBelumDibaca(0)
      return
    }

    let aktif = true

    async function muatJumlahPesan() {
      const { count: jumlahPribadi } = await supabase
        .from('pesan')
        .select('id', { count: 'exact', head: true })
        .eq('penerima_id', session.user.id)
        .eq('dibaca', false)

      // Siaran: RLS otomatis menyaring hanya yang sesuai target_role saya.
      // Belum dibaca = belum ada baris di pesan_siaran_dibaca untuk saya.
      const { data: semuaSiaran } = await supabase.from('pesan_siaran').select('id')
      const { data: siaranDibaca } = await supabase
        .from('pesan_siaran_dibaca')
        .select('siaran_id')
        .eq('profil_id', session.user.id)
      const idDibaca = new Set((siaranDibaca || []).map((r) => r.siaran_id))
      const jumlahSiaran = (semuaSiaran || []).filter((s) => !idDibaca.has(s.id)).length

      if (aktif) setJumlahPesanBelumDibaca((jumlahPribadi || 0) + jumlahSiaran)
    }

    muatJumlahPesan()

    const channel = supabase
      .channel('pesan-notifikasi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesan' }, () => {
        muatJumlahPesan()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesan_siaran' }, () => {
        muatJumlahPesan()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesan_siaran_dibaca' }, () => {
        muatJumlahPesan()
      })
      .subscribe()

    return () => {
      aktif = false
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id])

  // Notifikasi real-time: jumlah pesan Admin Pusat yang belum dibaca.
  // Guru tidak pernah masuk sini (isAdmin selalu false untuk guru).
  const [jumlahPesanPusatBelumDibaca, setJumlahPesanPusatBelumDibaca] = useState(0)

  useEffect(() => {
    if (!session?.user?.id || !isAdmin) {
      setJumlahPesanPusatBelumDibaca(0)
      return
    }

    let aktif = true

    async function muatJumlahPesanPusat() {
      let query = supabase
        .from('pesan_pusat')
        .select('id', { count: 'exact', head: true })

      query = isSuperAdmin
        ? query.eq('sisi', 'sekolah').eq('dibaca_pusat', false)
        : query.eq('sisi', 'pusat').eq('dibaca_sekolah', false).eq('sekolah_id', sekolahId)

      const { count } = await query
      if (aktif) setJumlahPesanPusatBelumDibaca(count || 0)
    }

    muatJumlahPesanPusat()

    const channel = supabase
      .channel('pesan-pusat-notifikasi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesan_pusat' }, () => {
        muatJumlahPesanPusat()
      })
      .subscribe()

    return () => {
      aktif = false
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id, isAdmin, isSuperAdmin, sekolahId])

  // Notifikasi real-time: jumlah pesan Live Chat dari pengunjung publik yang
  // belum dibaca admin.
  // PERBAIKAN: sebelumnya syaratnya "isAdmin" (mencakup admin sekolah biasa),
  // padahal Live Chat sekarang khusus superadmin (lihat catatan di
  // getGroupsAdmin di atas dan RLS live_chat_pesan di Supabase). Disamakan
  // jadi "isSuperAdmin" supaya admin sekolah tidak lagi query tabel ini sama
  // sekali dari Sidebar, dan tidak subscribe ke channel real-time-nya.
  const [jumlahLiveChatBelumDibaca, setJumlahLiveChatBelumDibaca] = useState(0)

  useEffect(() => {
    if (!isSuperAdmin) {
      setJumlahLiveChatBelumDibaca(0)
      return
    }

    let aktif = true

    async function muatJumlahLiveChat() {
      const { count } = await supabase
        .from('live_chat_pesan')
        .select('id', { count: 'exact', head: true })
        .eq('dibaca', false)
        .eq('pengirim', 'pengunjung')
      if (aktif) setJumlahLiveChatBelumDibaca(count || 0)
    }

    muatJumlahLiveChat()

    const channel = supabase
      .channel('live-chat-notifikasi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_chat_pesan' }, () => {
        muatJumlahLiveChat()
      })
      .subscribe()

    return () => {
      aktif = false
      supabase.removeChannel(channel)
    }
  }, [isSuperAdmin])

  // Pilih set menu admin & non-admin sesuai jenis tenant (sekolah vs kantor).
  // isKantor datang dari AuthContext (relasi profil -> sekolah.jenis_organisasi).
  const groupsAdmin = isKantor
    ? getGroupsKantorAdmin(isAdminUtama, jumlahMenunggu, jumlahPesanBelumDibaca)
    : getGroupsAdmin(
        isAdminUtama,
        isSuperAdmin,
        isKepalaSekolah,
        jumlahMenunggu,
        jumlahPesanBelumDibaca,
        jumlahPesanPusatBelumDibaca,
        jumlahPengajuanTokoMenunggu,
        jumlahSiapDicairkan,
        jumlahLiveChatBelumDibaca
      )
  const linksGuru = isKantor
    ? getLinksKantorPegawai(jumlahPesanBelumDibaca)
    : getLinksGuru(jumlahPesanBelumDibaca, sekolahId)
  const linksOrangTua = getLinksOrangTua(jumlahPesanBelumDibaca, sekolahId)

  return (
    <>
      {/* Overlay gelap di belakang drawer — hanya tampil di HP saat menu dibuka */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-72 max-w-[85vw] md:w-64 shrink-0 bg-blue-950 text-white flex flex-col h-screen fixed md:sticky top-0 left-0 z-50 border-r border-blue-900/50 transition-transform duration-300 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
      <div className="relative overflow-hidden px-4 py-5 border-b border-white/10 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900">
        {/* Tombol tutup — hanya tampil di HP */}
        <button
          onClick={onClose}
          title="Tutup menu"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors md:hidden"
        >
          <X size={18} />
        </button>
        {/* Motif batik dekoratif (senada dengan banner dashboard) */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.35] pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="batikSidebar" width="46" height="46" patternUnits="userSpaceOnUse">
              <circle cx="23" cy="23" r="12" fill="none" stroke="#fbbf24" strokeWidth="1.4" />
              <circle cx="23" cy="23" r="4" fill="none" stroke="#fbbf24" strokeWidth="1.4" />
              <path d="M23 5 v8 M23 33 v8 M5 23 h8 M33 23 h8" stroke="#fbbf24" strokeWidth="1.4" />
              <path d="M10 10 l4 4 M32 10 l-4 4 M10 36 l4 -4 M32 36 l-4 -4" stroke="#fbbf24" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#batikSidebar)" />
        </svg>

        <div className="relative flex items-center gap-3">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={namaTampil}
              className="w-11 h-11 rounded-full object-cover shrink-0 border-2 border-white/20"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-400 flex items-center justify-center font-display font-bold text-white text-sm shrink-0 border-2 border-white/20">
              {getInisial(namaTampil)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-[13px] leading-tight truncate text-white">{namaTampil}</p>
            <p className="text-[11px] text-white/50 mt-0.5">{labelPeran}</p>
          </div>
          <button
            onClick={session ? handleLogout : () => navigate('/login')}
            title={session ? 'Keluar' : 'Masuk'}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors shrink-0"
          >
            <Power size={20} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto py-4 px-3 bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-950">
        {/* Motif batik area menu — gaya berbeda dari header (kawung/diamond, bukan lingkaran) */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.22] pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="batikMenu"
              width="36"
              height="36"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect x="12" y="0" width="12" height="12" fill="none" stroke="#fbbf24" strokeWidth="1.2" />
              <circle cx="18" cy="6" r="2.6" fill="#fbbf24" />
              <path d="M0 18 L18 0 M18 36 L36 18" stroke="#fbbf24" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#batikMenu)" />
        </svg>

        <div className="relative">
        {isAdmin ? (
          groupsAdmin.map((group, i) => (
            <div key={group.label ?? `top-${i}`} className={i > 0 ? 'mt-5' : ''}>
              {group.label && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider uppercase text-white/35">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.links.map((link) => (
                  <NavItem key={link.to} {...link} onNavigate={onClose} />
                ))}
              </div>
            </div>
          ))
        ) : isOrangTua ? (
          <div className="space-y-1">
            {linksOrangTua.map((link) => (
              <NavItem key={link.to} {...link} onNavigate={onClose} />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {linksGuru.map((link) => (
              <NavItem key={link.to} {...link} onNavigate={onClose} />
            ))}
          </div>
        )}
        </div>
      </nav>
      </aside>
    </>
  )
}
