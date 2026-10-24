import { Store, Receipt, Inbox } from 'lucide-react'
import Layout from '../components/Layout'
import HubMenu from '../components/HubMenu'

const ITEM = [
  {
    to: '/toko',
    label: 'Etalase Toko',
    desc: 'Lihat dan belanja produk dari toko yang tersedia.',
    icon: Store,
  },
  {
    to: '/riwayat-pesanan',
    label: 'Riwayat Pesanan',
    desc: 'Pesanan yang pernah kamu buat beserta statusnya.',
    icon: Receipt,
  },
  {
    to: '/pesanan-masuk',
    label: 'Pesanan Masuk',
    desc: 'Pesanan dari pembeli untuk produk di tokomu.',
    icon: Inbox,
  },
]

export default function PusatToko() {
  return (
    <Layout title="Toko" subtitle="Etalase, riwayat pesanan, dan pesanan masuk dalam satu tempat.">
      <HubMenu items={ITEM} />
    </Layout>
  )
}
