import { Video, ScanLine, FileType2, Images, HardDrive, ImagePlus } from 'lucide-react'
import Layout from '../components/Layout'
import HubMenu from '../components/HubMenu'

const ITEM = [
  {
    to: '/rapat',
    label: 'Rapat Video',
    desc: 'Buat atau ikuti rapat tatap muka online dengan guru dan rekan kerja.',
    icon: Video,
  },
  {
    to: '/scan-dokumen',
    label: 'Scan Dokumen',
    desc: 'Pindai dokumen lewat kamera menjadi file yang rapi.',
    icon: ScanLine,
  },
  {
    to: '/alat-pdf',
    label: 'Alat PDF',
    desc: 'Gabung, pisah, dan olah file PDF.',
    icon: FileType2,
  },
    {
    to: '/edit-foto-latar',
    label: 'Edit Foto Latar',
    desc: 'Ganti latar foto siswa (merah, biru, dll.) untuk raport dan ijazah, lalu cetak per lembar.',
    icon: ImagePlus,
  },
  {
    to: '/galeri',
    label: 'Galeri Kegiatan',
    desc: 'Foto dan dokumentasi kegiatan sekolah.',
    icon: Images,
  },
  {
    to: '/dokumen',
    label: 'Dokumen Penting',
    desc: 'Simpan dan buka dokumen penting sekolah.',
    icon: HardDrive,
  },
]

export default function AlatMedia() {
  return (
    <Layout title="Alat / Media" subtitle="Rapat video, scan, alat PDF, galeri kegiatan, dan dokumen penting dalam satu tempat.">
      <HubMenu items={ITEM} />
    </Layout>
  )
}
