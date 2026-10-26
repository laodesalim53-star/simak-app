import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UserCircle, Network, Target, ClipboardCheck, Link2, Sparkles, MessageCircle, Store, LayoutGrid, Wrench,
  Video, Megaphone, Users, GraduationCap, FileSpreadsheet, Award, FilePlus, Database, BookMarked, Gamepad2,
  FileBadge, Image, Images, Wallet, Library, Boxes, DoorOpen, History, Banknote, FileCheck2, Mail, FileText,
  FileStack, UserPlus, ScrollText, BadgeCheck, ClipboardList, CalendarOff, CalendarRange, DatabaseBackup,
  Building2, ShieldCheck, Landmark, IdCard, FileSignature, Search,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

// ============================================================
// MENU LAYANAN — kisi menu per kelompok, isinya sama dengan Sidebar.jsx (tenant sekolah).
// Taruh di: src/components/MenuLayanan.jsx, lalu sisipkan <MenuLayanan /> di DashboardSekolah.
// Peran: a=admin  g=guru  o=orang tua.   Syarat: n=bukan superadmin  s=superadmin  u=admin utama  k=kepsek/admin utama
// ============================================================
const GROUPS = [
  { id: 'utama', nama: 'Menu Utama', warna: '#2A3AA8' },
  { id: 'anak', nama: 'Anak Saya', warna: '#0F7F9C' },
  { id: 'akademik', nama: 'Akademik', warna: '#C96A0E' },
  { id: 'keuangan', nama: 'Keuangan & Pustaka', warna: '#0E8A5C' },
  { id: 'adm', nama: 'Administrasi', warna: '#5B6B8C' },
]

// [kelompok, tujuan, label, ikon, peran, syarat, buka di tab baru]
const ITEMS = [
  ['utama', '/profil-saya', 'Profil Saya', UserCircle, 'ago'],
  ['utama', '/visi-misi', 'Visi Misi Sekolah', Target, 'g'],
  ['utama', '/struktur-organisasi', 'Bagan Struktur Organisasi', Network, 'ag'],
  ['utama', '/presensi', 'Presensi', ClipboardCheck, 'ag'],
  ['utama', '/link-layanan', 'Link Layanan', Link2, 'ag'],
  ['utama', '/upgrade-fitur', 'Upgrade Fitur', Sparkles, 'ago'],
  ['utama', '/pesan', 'Pesan', MessageCircle, 'ago'],
  ['utama', '/pusat-toko', 'Toko', Store, 'ago'],
  ['utama', '/ajukan-toko', 'Ajukan Toko', Store, 'a', 'n'],
  ['utama', '/administrasi-kelas', 'Administrasi Kelas', LayoutGrid, 'ag'],
  ['utama', '/alat-media', 'Alat / Media', Wrench, 'ag'],
  ['utama', '/rapat', 'Rapat Video', Video, 'o'],
  ['utama', '/pengumuman', 'Pengumuman', Megaphone, 'ago'],

  ['anak', '/rapor-anak', 'Rapor Anak', FileBadge, 'o'],
  ['anak', '/presensi-anak', 'Presensi Anak', ClipboardCheck, 'o'],
  ['anak', '/portofolio-anak', 'Portofolio Anak', Image, 'o'],
  ['anak', '/galeri-orang-tua', 'Galeri Kegiatan', Images, 'o'],

  ['akademik', '/siswa', 'Data Siswa', Users, 'ag'],
  ['akademik', '/guru', 'Data Guru', GraduationCap, 'a'],
  ['akademik', '/nilai-asesmen', 'Nilai Asesmen', FileSpreadsheet, 'a'],
  ['akademik', '/sertifikat', 'Sertifikat & Penghargaan', Award, 'ag'],
  ['akademik', '/buat-ujian', 'Buat Ujian', FilePlus, 'ag'],
  ['akademik', '/bank-soal', 'Bank Soal', Database, 'ag'],
  ['akademik', '/simulasi-tka', 'Simulasi TKA', GraduationCap, 'ag'],
  ['akademik', '/materi-kelas', 'Materi Pembelajaran', BookMarked, 'ag'],
  ['akademik', '/buat-kuis-seru', 'Kuis Seru (Kls 1-3)', Gamepad2, 'ag'],
  ['akademik', '/rapor-kumer', 'Raport Kumer', FileBadge, 'ag'],

  ['keuangan', '/pusat-keuangan', 'Keuangan', Wallet, 'a'],
  ['keuangan', '/perpustakaan', 'Perpustakaan', Library, 'ag'],
  ['keuangan', '/inventaris', 'Inventaris', Boxes, 'a'],
  ['keuangan', '/bangunan', 'Kondisi Bangunan', DoorOpen, 'a'],
  ['keuangan', '/riwayat-pencairan-saya', 'Riwayat Pencairan Saya', History, 'a', 'n'],
  ['keuangan', '/pencairan-dana', 'Pencairan Dana', Banknote, 'a', 's'],

  ['adm', '/pengajuan-surat-aktif', 'Pengajuan Surat Aktif', FileCheck2, 'ag'],
  ['adm', '/surat', 'Surat Masuk/Keluar', Mail, 'a'],
  ['adm', '/kelengkapan-surat-pengantar', 'Kelengkapan Surat Pengantar', FileText, 'a'],
  ['adm', '/gudang-sk', 'Gudang SK', FileStack, 'a'],
  ['adm', '/gudang-sk/portal-ujian', 'Portal Ujian', ClipboardCheck, 'a'],
  ['adm', '/ppdb-admin', 'PPDB Siswa Baru', UserPlus, 'a'],
  ['adm', '/ppdb/:id', 'PPDB Siswa Baru', UserPlus, 'go', null, true],
  ['adm', '/laporan-guru', 'Pusat Laporan Kepegawaian', GraduationCap, 'a'],
  ['adm', '/administrasi-kepsek', 'Administrasi Kepsek', ScrollText, 'a', 'k'],
  ['adm', '/administrasi-kepsek/akreditasi', 'Berkas Akreditasi', BadgeCheck, 'a', 'k'],
  ['adm', '/daftar-hadir-pegawai', 'Daftar Hadir Guru & Tendik', ClipboardList, 'ag'],
  ['adm', '/hari-libur', 'Hari Libur', CalendarOff, 'a'],
  ['adm', '/kalender-pendidikan', 'Kalender Pendidikan', CalendarRange, 'ago'],
  ['adm', '/backup', 'Backup Data', DatabaseBackup, 'a'],
  ['adm', '/manajemen-sekolah', 'Manajemen Sekolah', Building2, 'a', 's'],
  ['adm', '/persetujuan-akun', 'Persetujuan Akun', ShieldCheck, 'a', 'u'],
  ['adm', '/profil-sekolah', 'Profil Sekolah', Landmark, 'a', 'u'],
  ['adm', '/kartu', 'Cetak Kartu', IdCard, 'a'],
  ['adm', '/dokumen-pip', 'Dokumen PIP', FileSignature, 'a'],
  ['adm', '/cetak-sampul', 'Cetak Sampul', FileStack, 'ag'],
]

export default function MenuLayanan() {
  const { isAdmin, isAdminUtama, isSuperAdmin, isKepalaSekolah, isOrangTua, sekolahId } = useAuth()
  const peran = isAdmin ? 'a' : isOrangTua ? 'o' : 'g'
  const [cari, setCari] = useState('')
  const [tab, setTab] = useState(null)

  const grup = useMemo(() => {
    const syarat = (s) => {
      if (!s) return true
      if (s === 'n') return !isSuperAdmin
      if (s === 's') return !!isSuperAdmin
      if (s === 'u') return !!isAdminUtama
      if (s === 'k') return !!(isKepalaSekolah || isAdminUtama)
      return true
    }
    return GROUPS.map((g) => ({
      ...g,
      items: ITEMS.filter((i) => i[0] === g.id && i[4].includes(peran) && syarat(i[5])),
    })).filter((g) => g.items.length)
  }, [peran, isSuperAdmin, isAdminUtama, isKepalaSekolah])

  const q = cari.trim().toLowerCase()
  const aktif = tab && grup.some((g) => g.id === tab) ? tab : grup[0]?.id
  const tampil = grup
    .filter((g) => q || g.id === aktif)
    .map((g) => ({ ...g, items: g.items.filter((i) => !q || i[2].toLowerCase().includes(q)) }))
    .filter((g) => g.items.length)

  const href = (i) => (i[1] === '/ppdb/:id' ? (sekolahId ? `/ppdb/${sekolahId}` : '/ppdb') : i[1])
  const kelas =
    'flex items-center gap-3 rounded-xl border border-ink-900/[0.08] bg-white p-3 min-h-[56px] transition-all hover:-translate-y-0.5 hover:shadow-md active:bg-ink-900/[0.04] touch-manipulation'

  return (
    <section className="dash-fade-in opacity-0 card p-6 mb-8" style={{ animationDelay: '380ms' }} aria-labelledby="judul-menu-layanan">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 id="judul-menu-layanan" className="font-display text-lg font-semibold">Semua layanan</h3>
          <p className="text-xs text-ink-700/60 mt-0.5">Pintasan ke semua menu yang boleh Anda buka.</p>
        </div>
        <label className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari menu…"
            aria-label="Cari menu"
            className="w-full rounded-lg border border-ink-900/[0.12] bg-white py-2.5 pl-9 pr-3 text-base sm:text-sm"
          />
        </label>
      </div>

      {!q && (
        <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1" role="tablist" aria-label="Kelompok menu">
          {grup.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={aktif === g.id}
              onClick={() => setTab(g.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium touch-manipulation ${
                aktif === g.id ? 'bg-blue-900 text-white' : 'bg-ink-900/[0.05] text-ink-700 hover:bg-ink-900/[0.09]'
              }`}
            >
              {g.nama} <span className="opacity-60">({g.items.length})</span>
            </button>
          ))}
        </div>
      )}

      {tampil.length === 0 && <p className="text-sm text-ink-700/50">Menu tidak ditemukan. Coba kata kunci lain.</p>}

      {tampil.map((g) => (
        <div key={g.id} className="mt-2">
          {q && <p className="text-xs font-semibold text-ink-700/60 mb-2">{g.nama}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {g.items.map((i) => {
              const Ikon = i[3]
              const isi = (
                <>
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ color: g.warna, background: `${g.warna}1A` }}
                  >
                    <Ikon size={18} strokeWidth={1.9} />
                  </span>
                  <span className="text-sm font-medium text-ink-950 leading-snug">{i[2]}</span>
                </>
              )
              return i[6] ? (
                <a key={i[1] + i[4]} href={href(i)} target="_blank" rel="noopener noreferrer" className={kelas}>{isi}</a>
              ) : (
                <Link key={i[1] + i[4]} to={href(i)} className={kelas}>{isi}</Link>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
