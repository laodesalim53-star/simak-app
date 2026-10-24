import { Video, ScanLine, FileType2 } from 'lucide-react'
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
]

export default function AlatMedia() {
  return (
    <Layout title="Alat / Media" subtitle="Rapat video, pemindai dokumen, dan alat PDF dalam satu tempat.">
      <HubMenu items={ITEM} />
    </Layout>
  )
}
