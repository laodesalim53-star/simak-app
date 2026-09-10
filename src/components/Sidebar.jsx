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
  Table2,
  Printer,
  FileStack,
  Palette,
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
        { to: '/skl', label: 'Surat Keterangan Lulus', icon: Stamp },
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
        { to: '/surat-keterangan', label: 'Surat Keterangan', icon: FileSignature },
        { to: '/ppdb-admin', label: 'PPDB Siswa Baru', icon: UserPlus },
        { to: '/laporan', label: 'Laporan Bulanan', icon: FileText },
        { to: '/laporan-guru', label: 'Laporan Kepegawaian Guru', icon: GraduationCap },
        { to: '/hari-libur', label: 'Hari Libur', icon: CalendarOff },
        { to: '/kalender-pendidikan', label: 'Kalender Pendidikan', icon: CalendarRange },
        { to: '/backup', label: 'Backup Data', icon: DatabaseBackup },
        // Data Ujian 8355 & Cetak 8355
        { to: '/data-ujian-8355', label: 'Data Ujian 8355', icon: Table2 },
        { to: '/cetak-8355', label: 'Cetak 8355 (Kelas 6)', icon: Printer },
        // Cetak Sampul & Pusat Tema Sampul
        { to: '/cetak-sampul', label: 'Cetak Sampul', icon: FileStack },
        { to: '/pusat-tema-sampul', label: 'Pusat Tema Sampul', icon: Palette },
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

// Menu GURU: tetap ringkas, tidak perlu dikelompokkan
// Kuitansi, Kuitansi Jasa & Nota Belanja SENGAJA TIDAK ada di sini — ketiga
// fitur ini admin-only (lihat RLS policy nota_hanya_admin di Supabase).
function getLinksGuru(jumlahPesanBelumDibaca = 0, sekolahIdGuru = null) {
  return [
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
    { to: '/ijazah', label: 'Ijazah', icon: ScrollText },
    { to: '/skl', label: 'Surat Keterangan Lulus', icon: Stamp },
    { to: '/portofolio-siswa', label: 'Portofolio Siswa', icon: FolderHeart },
    { to: '/rpp', label: 'RPP', icon: NotebookPen },
    { to: '/arsip-rpp', label: 'Arsip RPP', icon: Archive },
    { to: '/sertifikat', label: 'Sertifikat & Penghargaan', icon: Award },
    { to: '/pengajuan-surat-aktif', label: 'Pengajuan Surat Aktif', icon: FileCheck2 },
    { to: '/perbaikan-data-siswa', label: 'Perbaikan Data Siswa', icon: UserCog },
    { to: '/pengajuan-kebutuhan-kelas', label: 'Kebutuhan Kelas', icon: PackagePlus },
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

function getLabelPeran(profil, isSuperAdmin, isAdminUtama, isAdmin, isOrangTua, hasSession) {
  if (!hasSession) return 'Tamu'
  if (isSuperAdmin) return 'Superadmin'
  if (profil?.jabatan === 'kepala_sekolah') return 'Kepala Sekolah'
  if (isAdminUtama) return 'Admin Utama'
  if (isAdmin) return 'Admin'
  if (isOrangTua) return 'Orang Tua/Wali'
  if (profil?.jabatan === 'guru' || profil?.role === 'guru') return 'Guru'
  return 'Memuat...'
}

function getLinksOrangTua(jumlahPesanBelumDibaca = 0, sekolahId = null) {
  return [
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
    { to: '/kalender-pendidikan', label: 'Kalender Pendidikan', icon: CalendarRange },
    { to: sekolahId ? `/ppdb/${sekolahId}` : '/ppdb', label: 'PPDB Siswa Baru', icon: UserPlus, external: true },
  ]
}

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { signOut, session, profil, isAdmin, isAdminUtama, isSuperAdmin, isKepalaSekolah, isOrangTua, sekolahId } = useAuth()
  const navigate = useNavigate()
  const fotoUrl = getFotoUrl(profil?.foto_profil_path)
  const namaTampil = profil?.nama_lengkap || session?.user?.email || 'Pengguna'

  const labelPeran = getLabelPeran(profil, isSuperAdmin, isAdminUtama, isAdmin, isOrangTua, !!session)

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

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

  const groupsAdmin = getGroupsAdmin(
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
  const linksGuru = getLinksGuru(jumlahPesanBelumDibaca, sekolahId)
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
          {/* Motif batik dekoratif */}
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

        <nav className="relative flex-1 overflow-y-auto py-4 px-3 bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-950 space-y-6">
          {/* Motif batik area menu */}
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

          <div className="relative space-y-6">
            {isAdmin ? (
              groupsAdmin.map((group, idx) => (
                <div key={idx} className="space-y-1">
                  {group.label && (
                    <div className="px-3 pb-1 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                      {group.label}
                    </div>
                  )}
                  {group.links.map((link) => (
                    <NavItem key={link.to} {...link} onNavigate={onClose} />
                  ))}
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
