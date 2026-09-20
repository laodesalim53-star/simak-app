import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  X,
  LayoutDashboard,
  Users,
  GraduationCap,
  DoorOpen,
  CalendarClock,
  ClipboardCheck,
  FileType2,
  BookOpenCheck,
  Megaphone,
  Power,
  Boxes,
  CalendarDays,
  Mail,
  FileBadge,
  ScrollText,
  Stamp,
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
  BookOpen,
  LayoutGrid,
  CalendarCheck,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PaketBadge, { usePaketSaatIni } from './PaketBadge'

// Helper: hapus channel Supabase Realtime dengan nama (topic) yang sama
// kalau masih ada, sebelum bikin channel baru dengan nama itu lagi.
// Mencegah error "cannot add postgres_changes callback after subscribe()"
// yang muncul kalau channel dengan topic sama sempat ter-subscribe dua
// kali — biasanya karena React StrictMode menjalankan useEffect dua kali
// saat development, atau navigasi cepat antar halaman sebelum channel
// lama sempat dibersihkan oleh fungsi cleanup useEffect.
function bersihkanChannelLama(namaChannel) {
  const channelLama = supabase.getChannels().find((ch) => ch.topic === `realtime:${namaChannel}`)
  if (channelLama) supabase.removeChannel(channelLama)
}

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
        // Upgrade Fitur: status paket (free/standar/premium) melekat ke akun
        // masing-masing, jadi menu ini tampil untuk semua role, bukan cuma admin.
        { to: '/upgrade-fitur', label: 'Upgrade Fitur', icon: Sparkles },
        // Tab "Admin Pusat" sekarang jadi bagian dari halaman /pesan (lihat
        // Pesan.jsx) — badge menggabungkan unread pesan biasa + admin pusat.
        { to: '/pesan', label: 'Pesan', icon: MessageCircle, badge: jumlahPesanBelumDibaca + jumlahPesanPusatBelumDibaca },
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
        // PERBAIKAN: menu "Administrasi Kelas" sebelumnya tidak ada di sini
        // sama sekali — hanya ada di menu Guru, menu Admin Kantor, dan menu
        // Pegawai Kantor. Akibatnya admin sekolah (admin/admin_utama/
        // superadmin/kepala_sekolah) tidak bisa mengakses halaman ini dari
        // sidebar. Ditambahkan di sini, sejajar posisinya dengan menu Guru.
        { to: '/administrasi-kelas', label: 'Administrasi Kelas', icon: LayoutGrid },
        { to: '/rapat', label: 'Rapat Video', icon: Video },
        { to: '/galeri', label: 'Galeri Kegiatan', icon: Images },
        { to: '/dokumen', label: 'Dokumen Penting', icon: HardDrive },
        { to: '/scan-dokumen', label: 'Scan Dokumen', icon: ScanLine },
        { to: '/alat-pdf', label: 'Alat PDF', icon: FileType2 },
        { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
      ],
    },
    {
      label: 'Akademik',
      links: [
        { to: '/siswa', label: 'Data Siswa', icon: Users },
        { to: '/guru', label: 'Data Guru', icon: GraduationCap },
        { to: '/nilai-asesmen', label: 'Nilai Asesmen', icon: FileSpreadsheet },
        // PERBAIKAN: baris "Rapor Siswa" (/rapor) dihapus dari sini — sudah
        // bisa diakses lewat kartu "Rapor" di halaman Administrasi Kelas
        // (menu di atas), jadi baris ini dulu bikin dobel untuk admin.
        { to: '/portofolio-siswa', label: 'Portofolio Siswa', icon: FolderHeart },
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
        { to: '/kuitansi', label: 'Kuitansi', icon: Receipt },
        { to: '/kuitansi-jasa', label: 'Kuitansi Jasa', icon: Receipt },
        { to: '/nota', label: 'Nota Belanja', icon: ShoppingCart },
        { to: '/perpustakaan', label: 'Perpustakaan', icon: Library },
        { to: '/inventaris', label: 'Inventaris', icon: Boxes },
        // BARU: Kondisi Bangunan — satu paket dengan RingkasanAset.jsx yang
        // dipakai di Laporan Kepala Sekolah / Laporan Kepala KUA.
        { to: '/bangunan', label: 'Kondisi Bangunan', icon: DoorOpen },
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
        { to: '/surat', label: 'Surat Masuk/Keluar', icon: Mail },
        { to: '/surat-keterangan', label: 'Surat Keterangan', icon: FileSignature },
        { to: '/ppdb-admin', label: 'PPDB Siswa Baru', icon: UserPlus },
        // Laporan Kepegawaian Guru: satu pintu untuk semua laporan guru,
        // TERMASUK Laporan Bulanan, Cetak Sampul, Data Ujian 8355 & Cetak
        // 8355 (menu-menu terpisah untuk itu semua sudah dihapus dari sini
        // — sekarang jadi kartu di dalam halaman ini, lihat PusatLaporanGuru.jsx).
        { to: '/laporan-guru', label: 'Pusat Laporan Kepegawaian', icon: GraduationCap },
        { to: '/hari-libur', label: 'Hari Libur', icon: CalendarOff },
        { to: '/kalender-pendidikan', label: 'Kalender Pendidikan', icon: CalendarRange },
        { to: '/backup', label: 'Backup Data', icon: DatabaseBackup },
        // Manajemen Sekolah hanya untuk superadmin.
        ...(isSuperAdmin
          ? [
              { to: '/manajemen-sekolah', label: 'Manajemen Sekolah', icon: Building2 },
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
        { to: '/alat-pdf', label: 'Alat PDF', icon: FileType2 },
        { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
      ],
    },
    {
      label: 'Kepegawaian',
      links: [
        { to: '/data-pegawai-kantor', label: 'Data Pegawai', icon: Briefcase },
        // PERBAIKAN: sebelumnya reuse "/presensi" (punya guru) — sekarang pakai
        // rute & tabel presensi_pegawai_kantor sendiri (lihat PresensiKantor.jsx).
        { to: '/presensi-kantor', label: 'Presensi Pegawai', icon: ClipboardCheck },
        { to: '/profil-kantor', label: 'Profil Kantor', icon: Building2 },
        { to: '/daftar-hadir-kantor', label: 'Daftar Hadir Kantor', icon: FileSpreadsheet },
        { to: '/daftar-hadir-pegawai', label: 'Daftar Hadir Pegawai', icon: ClipboardList },
      ],
    },
    {
      label: 'Keagamaan',
      links: [
        { to: '/pusat-materi-majelis', label: 'Materi Majelis', icon: BookOpenCheck },
        { to: '/rktp-penyuluh-2', label: 'RKTP Penyuluh 2', icon: CalendarCheck },
        { to: '/pusat-kelompok-binaan', label: 'Kelompok Binaan', icon: Users },
        { to: '/pendaftaran-nikah', label: 'Pendaftaran Nikah', icon: FileSignature },
        { to: '/laporan-kepenghuluan', label: 'Laporan Kepenghuluan', icon: FileStack },
      ],
    },
    // BARU: Aset Kantor — Inventaris & Kondisi Bangunan kantor (dipakai
    // juga oleh RingkasanAset.jsx di Laporan Kepala KUA / Laporan Bulanan KUA).
    {
      label: 'Aset Kantor',
      links: [
        { to: '/inventaris', label: 'Inventaris', icon: Boxes },
        { to: '/bangunan', label: 'Kondisi Bangunan', icon: DoorOpen },
      ],
    },
    {
      label: 'Administrasi',
      links: [
        { to: '/agenda', label: 'Agenda Kantor', icon: CalendarDays },
        { to: '/surat', label: 'Surat Masuk/Keluar', icon: Mail },
        { to: '/backup', label: 'Backup Data', icon: DatabaseBackup },
        // "Persetujuan Akun", "Verifikasi Nikah", "Laporan Kepala KUA" dan
        // "Laporan Bulanan KUA" hanya untuk admin utama.
        ...(isAdminUtama
          ? [
              { to: '/persetujuan-akun', label: 'Persetujuan Akun', icon: ShieldCheck, badge: jumlahMenunggu },
              { to: '/verifikasi-nikah', label: 'Verifikasi Nikah', icon: FileSignature },
              { to: '/laporan-kepala-kua', label: 'Laporan Kepala KUA', icon: BookOpen },
              { to: '/laporan-bulanan-kua', label: 'Laporan Bulanan KUA', icon: NotebookPen },
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
  { to: '/administrasi-kelas', label: 'Administrasi Kelas', icon: LayoutGrid },
  { to: '/rapat', label: 'Rapat Video', icon: Video },
  { to: '/galeri', label: 'Galeri Kegiatan', icon: Images },
  { to: '/dokumen', label: 'Dokumen Penting', icon: HardDrive },
  { to: '/scan-dokumen', label: 'Scan Dokumen', icon: ScanLine },
  { to: '/alat-pdf', label: 'Alat PDF', icon: FileType2 },
  // PERBAIKAN: baris "Administrasi Kelas" sebelumnya terduplikasi di sini
  // (sudah ada satu di atas, sebelum "Rapat Video") — duplikat dihapus.
  { to: '/siswa', label: 'Data Siswa', icon: Users },
  { to: '/nilai-asesmen', label: 'Nilai Asesmen', icon: FileSpreadsheet },
  // PERBAIKAN: baris "Rapor Siswa" (/rapor) dihapus dari sini — sudah bisa
  // diakses lewat kartu "Rapor" di halaman Administrasi Kelas (menu di
  // atas), jadi baris ini dulu bikin dobel untuk guru.
  { to: '/sertifikat', label: 'Sertifikat & Penghargaan', icon: Award },
  { to: '/pengajuan-surat-aktif', label: 'Pengajuan Surat Aktif', icon: FileCheck2 },
  { to: '/perbaikan-data-siswa', label: 'Perbaikan Data Siswa', icon: UserCog },
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
  { to: '/kalender-pendidikan', label: 'Kalender Pendidikan', icon: CalendarRange },
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
    { to: '/pusat-materi-majelis', label: 'Materi Majelis', icon: BookOpenCheck },
    { to: '/rktp-penyuluh-2', label: 'RKTP Penyuluh 2', icon: CalendarCheck },
    { to: '/pusat-kelompok-binaan', label: 'Kelompok Binaan', icon: Users },
    { to: '/pendaftaran-nikah', label: 'Pendaftaran Nikah', icon: FileSignature },
    { to: '/laporan-kepenghuluan', label: 'Laporan Kepenghuluan', icon: FileStack },
    { to: '/pesan', label: 'Pesan', icon: MessageCircle, badge: jumlahPesanBelumDibaca },
    { to: '/dokumen', label: 'Dokumen Penting', icon: HardDrive },
    { to: '/scan-dokumen', label: 'Scan Dokumen', icon: ScanLine },
    { to: '/alat-pdf', label: 'Alat PDF', icon: FileType2 },
    { to: '/presensi', label: 'Presensi', icon: ClipboardCheck },
    { to: '/agenda', label: 'Agenda Kantor', icon: CalendarDays },
    { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
    { to: '/upgrade-fitur', label: 'Upgrade Fitur', icon: Sparkles },
  ]
}

// PERBAIKAN ANDROID: tinggi baris menu dinaikkan di layar kecil (py-3, teks
// 15px) supaya area sentuh lebih nyaman (~44px), `touch-manipulation`
// menghilangkan jeda 300ms saat tap, dan efek hover dibatasi ke layar
// desktop (md:hover) supaya tidak "menempel" setelah menyentuh menu di
// layar sentuh — diganti efek `active:` saat ditekan.
function NavItem({ to, label, icon: Icon, end, badge, onNavigate, external }) {
  const content = (isActive) => (
    <>
      <Icon
        size={18}
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
        className="flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-[15px] md:text-sm font-medium transition-all touch-manipulation text-white/70 active:bg-white/[0.12] md:hover:bg-white/[0.08] md:hover:text-white"
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
        `flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-[15px] md:text-sm font-medium transition-all touch-manipulation ${
          isActive
            ? 'bg-gradient-to-r from-blue-500 to-indigo-400 text-white shadow-sm shadow-black/20'
            : 'text-white/70 active:bg-white/[0.12] md:hover:bg-white/[0.08] md:hover:text-white'
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
// PERBAIKAN 2: tambahan untuk tenant kantor — 'kepala_kantor' & 'pegawai'
// sebelumnya tidak dikenali sama sekali sehingga macet di 'Memuat...'.
function getLabelPeran(profil, isSuperAdmin, isAdminUtama, isAdmin, isOrangTua, hasSession) {
  if (!hasSession) return 'Tamu'
  if (isSuperAdmin) return 'Superadmin'
  if (profil?.jabatan === 'kepala_sekolah') return 'Kepala Sekolah'
  if (profil?.jabatan === 'kepala_kantor') return 'Kepala Kantor'
  if (isAdminUtama) return 'Admin Utama'
  if (isAdmin) return 'Admin'
  if (isOrangTua) return 'Orang Tua/Wali'
  if (profil?.jabatan === 'guru' || profil?.role === 'guru') return 'Guru'
  if (profil?.jabatan === 'pegawai' || profil?.role === 'pegawai') return 'Pegawai'
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
  // Paket akun yang sedang login (free / standar / premium) untuk lencana di header.
  const paketSaatIni = usePaketSaatIni()

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

  // PERBAIKAN ANDROID: saat drawer menu terbuka di HP, kunci scroll halaman
  // di belakangnya supaya menggeser menu tidak ikut menggulung halaman.
  // Hanya berlaku di layar kecil (di desktop sidebar selalu tampil).
  useEffect(() => {
    if (!open || typeof window === 'undefined' || window.innerWidth >= 768) return
    const overflowSebelumnya = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowSebelumnya
    }
  }, [open])

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
    // PERBAIKAN: bersihkan channel lama dengan nama sama dulu (kalau masih
    // ada) sebelum subscribe baru — mencegah error "cannot add
    // postgres_changes callback after subscribe()".
    bersihkanChannelLama('persetujuan-akun-notifikasi')
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

    bersihkanChannelLama('pengajuan-toko-notifikasi')
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

    bersihkanChannelLama('pencairan-dana-notifikasi')
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

    bersihkanChannelLama('pesan-notifikasi')
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

    bersihkanChannelLama('pesan-pusat-notifikasi')
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

    bersihkanChannelLama('live-chat-notifikasi')
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

      {/*
        PERBAIKAN ANDROID:
        - tinggi memakai 100dvh (tinggi layar yang sudah dikurangi address bar
          Chrome Android) — sebelumnya h-screen (100vh) membuat menu paling
          bawah tertutup bilah browser. Class h-screen dibiarkan sebagai
          cadangan untuk browser lama yang belum mengenal dvh.
        - tap highlight abu-abu bawaan Android dimatikan.
      */}
      <aside
        style={{ height: '100dvh' }}
        className={`w-72 max-w-[85vw] md:w-64 shrink-0 bg-blue-950 text-white flex flex-col h-screen fixed md:sticky top-0 left-0 z-50 border-r border-blue-900/50 transition-transform duration-300 ease-out [-webkit-tap-highlight-color:transparent]
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
      <div
        style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}
        className="relative overflow-hidden shrink-0 px-4 pb-5 border-b border-white/10 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900"
      >
        {/*
          Tombol tutup — hanya tampil di HP.
          PERBAIKAN ANDROID: dulu tombol ini menempel di pojok kanan atas dan
          bertumpuk dengan tombol Keluar (power). Sekarang sejajar
          vertikal di tengah baris header, dan baris di bawahnya diberi
          ruang kosong di kanan (pr-11) supaya keduanya berdampingan.
        */}
        <button
          onClick={onClose}
          title="Tutup menu"
          aria-label="Tutup menu"
          className="absolute top-1/2 right-2 -translate-y-1/2 z-10 w-10 h-10 rounded-lg flex items-center justify-center text-white/70 active:bg-white/10 touch-manipulation md:hidden"
        >
          <X size={20} />
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

        <div className="relative flex items-center gap-3 pr-11 md:pr-0">
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
            {/* Label peran + lencana paket (Free / Standar / Premium). Lencana
                disembunyikan untuk superadmin karena bukan pelanggan paket. */}
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <p className="text-xs text-white/60">{labelPeran}</p>
              {session && !isSuperAdmin && <PaketBadge paket={paketSaatIni} size="sm" />}
            </div>
          </div>
          <button
            onClick={session ? handleLogout : () => navigate('/login')}
            title={session ? 'Keluar' : 'Masuk'}
            aria-label={session ? 'Keluar' : 'Masuk'}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-red-400 active:bg-red-500/20 md:hover:bg-red-500/15 md:hover:text-red-300 transition-colors shrink-0 touch-manipulation"
          >
            <Power size={20} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/*
        PERBAIKAN: motif batik menu dulu diletakkan DI DALAM area yang bisa
        di-scroll, sehingga ikut tergulung ke atas dan bagian bawah menu yang
        panjang jadi polos tanpa motif. Sekarang motif ada di pembungkus luar
        yang diam, dan hanya <nav> di dalamnya yang di-scroll.
        - overscroll-contain: menggulung sampai ujung menu tidak lagi
          "menembus" menggulung halaman di belakang.
        - padding bawah ditambah area aman (env) supaya menu terakhir tidak
          tertutup bilah navigasi/gestur Android.
      */}
      <div className="relative flex-1 min-h-0 bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-950">
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

        <nav
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          className="relative h-full overflow-y-auto overscroll-contain pt-4 px-3"
        >
        {isAdmin ? (
          groupsAdmin.map((group, i) => (
            <div key={group.label ?? `top-${i}`} className={i > 0 ? 'mt-5' : ''}>
              {group.label && (
                <p className="px-3 mb-1.5 text-[11px] font-semibold tracking-wider uppercase text-white/50">
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
        </nav>
      </div>
      </aside>
    </>
  )
}
