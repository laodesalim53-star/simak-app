import { Link } from 'react-router-dom'
import {
  FileText,
  Users,
  GraduationCap,
  Award,
  Heart,
  BookOpen,
  School,
  Lock,
} from 'lucide-react'
import Layout from '../components/Layout'

// Halaman "bagan" / hub untuk semua laporan kepegawaian guru yang berasal
// dari format Laporan Bulanan sekolah (LAPORAN_BULANAN_JULI_2023.xlsx).
// Ditambahkan SATU kartu di sini setiap kali satu halaman cetak baru selesai
// dibuat — supaya Sidebar cukup punya 1 link ke halaman ini saja, tidak perlu
// nambah menu baru tiap kali ada laporan baru.
//
// Cara mengaktifkan laporan baru: ubah `siap: false` menjadi `siap: true` dan
// isi `path` dengan route halaman cetaknya di array `daftarLaporan` di bawah.
const daftarLaporan = [
  {
    id: 'nominatif',
    judul: 'Daftar Nominatif Guru/Pegawai',
    deskripsi: 'Data kepegawaian lengkap: NIP, NUPTK, pangkat/golongan, status kepegawaian, SK, dan masa kerja.',
    icon: Users,
    path: '/laporan-nominatif-guru',
    siap: true,
  },
  {
    id: 'biodata',
    judul: 'Biodata Guru/Pegawai',
    deskripsi: 'Data diri ringkas: nama, tempat/tanggal lahir, agama, status pegawai, jabatan, dan alamat.',
    icon: FileText,
    path: '/laporan-biodata-guru',
    siap: false,
  },
  {
    id: 'pendidikan',
    judul: 'Data Pendidikan Guru/Pegawai',
    deskripsi: 'Riwayat pendidikan terakhir, lembaga, jurusan, tahun lulus, dan pelatihan yang pernah diikuti.',
    icon: GraduationCap,
    path: '/laporan-pendidikan-guru',
    siap: false,
  },
  {
    id: 'kepangkatan',
    judul: 'Data Kepangkatan Guru/Pegawai',
    deskripsi: 'Riwayat SK pengangkatan pertama, SK terakhir, SK penempatan, dan gaji pokok.',
    icon: Award,
    path: '/laporan-kepangkatan-guru',
    siap: false,
  },
  {
    id: 'tanggungan',
    judul: 'Data Tanggungan Keluarga',
    deskripsi: 'Status perkawinan, data pasangan, dan jumlah anak yang menjadi tanggungan.',
    icon: Heart,
    path: '/laporan-tanggungan-keluarga',
    siap: false,
  },
  {
    id: 'tenaga-pengajar',
    judul: 'Data Rincian Tenaga Pengajar',
    deskripsi: 'Beban mengajar per guru: kelas, mata pelajaran, jam mengajar, dan rekap kehadiran.',
    icon: BookOpen,
    path: '/laporan-tenaga-pengajar',
    siap: false,
  },
  {
    id: 'keadaan-murid',
    judul: 'Data Keadaan Murid',
    deskripsi: 'Rekap jumlah murid per kelas dan ruang belajar yang tersedia.',
    icon: School,
    path: '/laporan-keadaan-murid',
    siap: false,
  },
]

export default function PusatLaporanGuru() {
  return (
    <Layout
      title="Laporan Kepegawaian Guru"
      subtitle="Pilih jenis laporan yang ingin dicetak. Setiap laporan diambil otomatis dari data Guru dan Profil Sekolah."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {daftarLaporan.map((laporan) => {
          const Icon = laporan.icon
          const Isi = () => (
            <>
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
                  laporan.siap ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon size={20} />
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${laporan.siap ? 'text-slate-800' : 'text-slate-400'}`}>
                {laporan.judul}
              </h3>
              <p className={`text-xs leading-relaxed ${laporan.siap ? 'text-slate-500' : 'text-slate-400'}`}>
                {laporan.deskripsi}
              </p>
              {!laporan.siap && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full mt-3">
                  <Lock size={10} /> Segera Hadir
                </span>
              )}
            </>
          )

          return laporan.siap ? (
            <Link
              key={laporan.id}
              to={laporan.path}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <Isi />
            </Link>
          ) : (
            <div
              key={laporan.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 opacity-70 cursor-not-allowed"
            >
              <Isi />
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
