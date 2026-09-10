import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText, Menu, X } from 'lucide-react'
import SampulLaporan, { JENIS_LAPORAN_PRESET } from '../components/SampulLaporan'

// --- Daftar menu jenis laporan ---------------------------------------------
// Setiap item = satu "varian" halaman Cetak Sampul yang dulu berupa file
// terpisah (CetakSampul.jsx, CetakSampulSemester.jsx, CetakSampul8355.jsx, dst).
// Sekarang semuanya jadi satu entri di sini, tinggal ditambah kalau perlu
// varian baru — tidak perlu bikin file/route baru lagi.
const MENU_SAMPUL = [
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
    props: {
      jenisLaporanAwal: JENIS_LAPORAN_PRESET[0],
      kunciJenisLaporan: true,
      labelHalaman: 'Cetak Sampul Laporan Bulanan',
    },
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
    props: {
      jenisLaporanAwal: JENIS_LAPORAN_PRESET[5],
      kunciJenisLaporan: true,
      labelHalaman: 'Cetak Sampul BKU',
    },
  },
  {
    key: 'inventaris',
    label: 'Inventaris Sarana & Prasarana',
    props: {
      jenisLaporanAwal: JENIS_LAPORAN_PRESET[6],
      kunciJenisLaporan: true,
      labelHalaman: 'Cetak Sampul Inventaris',
    },
  },
  {
    key: 'kegiatan-sekolah',
    label: 'Laporan Kegiatan Sekolah',
    props: {
      jenisLaporanAwal: JENIS_LAPORAN_PRESET[7],
      kunciJenisLaporan: true,
      labelHalaman: 'Cetak Sampul Kegiatan Sekolah',
    },
  },
]

// Alias supaya link lama (?jenis=semester, ?jenis=8355 dari redirect route
// /cetak-sampul-semester dan /cetak-sampul-8355) tetap mengarah ke menu yang benar.
const ALIAS_JENIS = {
  semester: 'semester',
  8355: '8355',
}

export default function CetakSampulHub() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const jenisAwal = searchParams.get('jenis')
  const keyAwal = ALIAS_JENIS[jenisAwal] || MENU_SAMPUL[0].key

  const [activeKey, setActiveKey] = useState(keyAwal)
  const [sidebarTerbuka, setSidebarTerbuka] = useState(false)

  const menuAktif = useMemo(
    () => MENU_SAMPUL.find((m) => m.key === activeKey) || MENU_SAMPUL[0],
    [activeKey]
  )

  function pilihMenu(key) {
    setActiveKey(key)
    setSidebarTerbuka(false)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar menu — hilang saat dicetak */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200
          ${sidebarTerbuka ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:z-auto`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <button
            className="md:hidden text-slate-500"
            onClick={() => setSidebarTerbuka(false)}
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Jenis Sampul Laporan
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {MENU_SAMPUL.map((menu) => (
            <button
              key={menu.key}
              onClick={() => pilihMenu(menu.key)}
              className={`w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors
                ${
                  menu.key === activeKey
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              <FileText size={16} className="shrink-0 mt-0.5" />
              <span>
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

      {/* Overlay saat sidebar terbuka di mobile */}
      {sidebarTerbuka && (
        <div
          className="no-print fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarTerbuka(false)}
        />
      )}

      {/* Konten — tombol buka menu (mobile) + form & pratinjau sampul */}
      <div className="flex-1 min-w-0">
        <div className="no-print md:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2.5">
          <button
            onClick={() => setSidebarTerbuka(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600"
          >
            <Menu size={18} /> Pilih Jenis Laporan
          </button>
        </div>

        {/* key={activeKey} memastikan semua state form di SampulLaporan
            (tema, tahun, dibuat oleh, dst) direset bersih setiap kali
            pindah menu, bukan malah tercampur dari menu sebelumnya. */}
        <SampulLaporan key={activeKey} {...menuAktif.props} />
      </div>
    </div>
  )
}
