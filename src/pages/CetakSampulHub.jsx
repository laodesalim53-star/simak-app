import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText, Menu, X } from 'lucide-react'
import SampulLaporan, { JENIS_LAPORAN_PRESET } from '../components/SampulLaporan'
import { CONFIG_INSTANSI } from '../lib/identitasInstansi'
import { useAuth } from '../lib/AuthContext'

// --- Daftar menu jenis laporan PER TIPE TENANT ------------------------------
// (Isi menu tidak berubah dari versi sebelumnya.)

const MENU_SEKOLAH = [
  {
    key: 'bebas',
    label: 'Pilih Bebas',
    keterangan: 'Pilih sendiri jenis laporan dari daftar',
    props: {
      jenisLaporanAwal: JENIS_LAPORAN_PRESET[4], // LPJ BOS
      kunciJenisLaporan: false,
      labelHalaman: 'Cetak Sampul Laporan',
    },
  },
  {
    key: 'bulanan',
    label: 'Laporan Bulanan',
    props: { jenisLaporanAwal: JENIS_LAPORAN_PRESET[0], kunciJenisLaporan: true, labelHalaman: 'Cetak Sampul Laporan Bulanan' },
  },
  {
    key: 'semester',
    label: 'Laporan Semester',
    props: {
      jenisLaporanAwal: JENIS_LAPORAN_PRESET[1],
      kunciJenisLaporan: true,
      subJudulAwal: 'LAPORAN HASIL BELAJAR PESERTA DIDIK',
      labelTahun: 'Tahun Ajaran',
      labelHalaman: 'Cetak Sampul Laporan Semester',
    },
  },
  {
    key: 'hasil-ujian',
    label: 'Laporan Hasil Ujian',
    props: {
      jenisLaporanAwal: JENIS_LAPORAN_PRESET[2],
      kunciJenisLaporan: true,
      labelTahun: 'Tahun Ajaran',
      labelHalaman: 'Cetak Sampul Laporan Hasil Ujian',
    },
  },
  {
    key: '8355',
    label: 'Daftar Calon Peserta Ujian (8355)',
    props: {
      jenisLaporanAwal: JENIS_LAPORAN_PRESET[3],
      kunciJenisLaporan: true,
      subJudulAwal: 'DAFTAR CALON PESERTA UJIAN SEKOLAH',
      labelTahun: 'Tahun Ajaran',
      tampilkanBank: false,
      tampilkanKelas: true,
      kelasAwal: 'VI',
      labelHalaman: 'Cetak Sampul 8355',
    },
  },
  {
    key: 'lpj-bos',
    label: 'LPJ Penggunaan Dana BOS',
    props: {
      jenisLaporanAwal: JENIS_LAPORAN_PRESET[4],
      kunciJenisLaporan: true,
      subJudulAwal: 'BANTUAN OPERASIONAL SEKOLAH (BOS)',
      labelHalaman: 'Cetak Sampul LPJ BOS',
    },
  },
  {
    key: 'bku',
    label: 'Laporan Keuangan (BKU)',
    props: { jenisLaporanAwal: JENIS_LAPORAN_PRESET[5], kunciJenisLaporan: true, labelHalaman: 'Cetak Sampul BKU' },
  },
  {
    key: 'inventaris',
    label: 'Inventaris Sarana & Prasarana',
    props: { jenisLaporanAwal: JENIS_LAPORAN_PRESET[6], kunciJenisLaporan: true, labelHalaman: 'Cetak Sampul Inventaris' },
  },
  {
    key: 'kegiatan',
    label: 'Laporan Kegiatan Sekolah',
    props: { jenisLaporanAwal: JENIS_LAPORAN_PRESET[7], kunciJenisLaporan: true, labelHalaman: 'Cetak Sampul Kegiatan Sekolah' },
  },
]

function buatMenuUmum(tenant) {
  const daftar = CONFIG_INSTANSI[tenant].jenisLaporan
  const [bulanan, tahunan, keuangan, inventaris, kegiatan] = daftar
  const item = (key, teks) => ({
    key,
    label: teks,
    props: { jenisLaporanAwal: teks, kunciJenisLaporan: true, labelTahun: 'Tahun Anggaran', labelHalaman: `Cetak Sampul ${teks}` },
  })
  return [
    {
      key: 'bebas',
      label: 'Pilih Bebas',
      keterangan: 'Pilih sendiri jenis laporan dari daftar',
      props: { jenisLaporanAwal: bulanan, kunciJenisLaporan: false, tampilkanBank: false, labelHalaman: 'Cetak Sampul Laporan' },
    },
    { ...item('bulanan', bulanan), props: { ...item('bulanan', bulanan).props, tampilkanBank: false } },
    { ...item('tahunan', tahunan), props: { ...item('tahunan', tahunan).props, tampilkanBank: false } },
    item('keuangan', keuangan),
    { ...item('inventaris', inventaris), props: { ...item('inventaris', inventaris).props, tampilkanBank: false } },
    { ...item('kegiatan', kegiatan), props: { ...item('kegiatan', kegiatan).props, tampilkanBank: false } },
  ]
}

const MENU_PER_TENANT = {
  sekolah: MENU_SEKOLAH,
  kantor: buatMenuUmum('kantor'),
  puskesmas: buatMenuUmum('puskesmas'),
}

const ALIAS_JENIS = {
  semester: 'semester',
  8355: '8355',
}

export default function CetakSampulHub() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isKantor, isPuskesmas } = useAuth()

  const tenant = isKantor ? 'kantor' : isPuskesmas ? 'puskesmas' : 'sekolah'
  const MENU_SAMPUL = MENU_PER_TENANT[tenant]

  const jenisAwal = searchParams.get('jenis')
  const keyAlias = ALIAS_JENIS[jenisAwal]
  const keyAwal = MENU_SAMPUL.some((m) => m.key === keyAlias) ? keyAlias : MENU_SAMPUL[0].key

  const [activeKey, setActiveKey] = useState(keyAwal)
  const [sidebarTerbuka, setSidebarTerbuka] = useState(false)

  const menuAktif = useMemo(
    () => MENU_SAMPUL.find((m) => m.key === activeKey) || MENU_SAMPUL[0],
    [activeKey, MENU_SAMPUL]
  )

  // Saat drawer terbuka di HP: kunci scroll halaman di belakangnya
  // dan izinkan tombol Back/Escape untuk menutup.
  useEffect(() => {
    if (!sidebarTerbuka) return
    const overflowLama = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && setSidebarTerbuka(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflowLama
      window.removeEventListener('keydown', onKey)
    }
  }, [sidebarTerbuka])

  function pilihMenu(key) {
    setActiveKey(key)
    setSidebarTerbuka(false)
    window.scrollTo({ top: 0 }) // form baru mulai dari atas
  }

  return (
    // dvh = tinggi layar yang sebenarnya di Chrome Android (address bar turun/naik)
    <div className="min-h-[100dvh] bg-slate-100 flex">
      {/* Sidebar / drawer */}
      <aside
        className={`no-print print:hidden fixed inset-y-0 left-0 z-30 h-[100dvh] w-72 max-w-[85vw]
          bg-white border-r border-slate-200 flex flex-col shadow-xl md:shadow-none
          transform transition-transform duration-200 ease-out
          ${sidebarTerbuka ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-auto md:h-auto md:min-h-[100dvh] md:shrink-0`}
        aria-hidden={!sidebarTerbuka ? undefined : false}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-slate-200"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 min-h-[44px] pr-3 text-sm font-medium text-slate-600 hover:text-slate-800 active:text-slate-900"
          >
            <ArrowLeft size={18} /> Kembali
          </button>
          <button
            className="md:hidden flex items-center justify-center w-11 h-11 -mr-2 rounded-full text-slate-500 active:bg-slate-100"
            onClick={() => setSidebarTerbuka(false)}
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Jenis Sampul Laporan
        </div>

        <nav
          className="flex-1 overflow-y-auto overscroll-contain px-2 pb-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {MENU_SAMPUL.map((menu) => (
            <button
              key={menu.key}
              onClick={() => pilihMenu(menu.key)}
              aria-current={menu.key === activeKey ? 'page' : undefined}
              className={`w-full text-left flex items-start gap-2.5 px-3 py-3 min-h-[44px] rounded-lg text-sm mb-0.5 transition-colors
                ${
                  menu.key === activeKey
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                }`}
            >
              <FileText size={16} className="shrink-0 mt-0.5" />
              <span className="min-w-0 break-words">
                {menu.label}
                {menu.keterangan && (
                  <span className="block text-xs font-normal text-slate-400 mt-0.5">
                    {menu.keterangan}
                  </span>
                )}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Overlay di belakang drawer (mobile) */}
      <div
        className={`no-print print:hidden fixed inset-0 z-20 bg-black/40 md:hidden transition-opacity duration-200
          ${sidebarTerbuka ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarTerbuka(false)}
        aria-hidden="true"
      />

      {/* Konten */}
      <div className="flex-1 min-w-0">
        {/* Bar atas mobile: tombol menu + nama jenis laporan yang aktif */}
        <div
          className="no-print print:hidden md:hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 px-3 pb-2"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        >
          <button
            onClick={() => setSidebarTerbuka(true)}
            className="flex items-center gap-2 w-full min-h-[44px] text-left text-sm font-medium text-slate-700 active:text-slate-900"
            aria-label="Buka menu jenis laporan"
          >
            <Menu size={20} className="shrink-0" />
            <span className="truncate">{menuAktif.label}</span>
          </button>
        </div>

        {/* key: reset state form setiap pindah menu/tenant */}
        <SampulLaporan key={`${tenant}-${activeKey}`} {...menuAktif.props} />
      </div>
    </div>
  )
}
