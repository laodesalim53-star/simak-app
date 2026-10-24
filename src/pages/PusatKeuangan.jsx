import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import {
  Wallet,
  PiggyBank,
  Receipt,
  Banknote,
  ShoppingCart,
  ChevronRight,
} from 'lucide-react'

// Halaman "hub" Keuangan — kumpulan pintasan (kartu) ke halaman keuangan yang
// SUDAH ADA. Tidak menduplikasi logika apa pun, hanya menaut ke rute
// masing-masing. Pola sama dengan AdministrasiKelas.jsx.
//
// Seluruh rute di bawah ini khusus admin (menu Sidebar-nya juga hanya muncul
// untuk admin), jadi halaman hub ini dipasang dengan <ProtectedRoute adminOnly>.
const KARTU = [
  {
    to: '/keuangan',
    label: 'Keuangan',
    icon: Wallet,
    desc: 'Catat pemasukan, pengeluaran, dan pantau kas sekolah.',
  },
  {
    to: '/bku-bank',
    label: 'BKU Bank (BOS-K5)',
    icon: PiggyBank,
    desc: 'Buku kas umum bank untuk dana BOS (format BOS-K5).',
  },
  {
    to: '/kuitansi',
    label: 'Kuitansi',
    icon: Receipt,
    desc: 'Buat dan cetak kuitansi pembayaran.',
  },
  {
    to: '/kuitansi-jasa',
    label: 'Kuitansi Jasa',
    icon: Banknote,
    desc: 'Buat dan cetak kuitansi pembayaran jasa/honor.',
  },
  {
    to: '/nota',
    label: 'Nota Belanja',
    icon: ShoppingCart,
    desc: 'Buat dan cetak nota belanja kebutuhan sekolah.',
  },
]

export default function PusatKeuangan() {
  return (
    <Layout
      title="Keuangan"
      subtitle="Pusat pintasan untuk seluruh administrasi keuangan sekolah"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {KARTU.map((k) => {
          const Icon = k.icon
          return (
            <Link
              key={k.to}
              to={k.to}
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                <Icon size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-800">{k.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{k.desc}</p>
              </div>

              <ChevronRight
                size={18}
                className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-400"
              />
            </Link>
          )
        })}
      </div>
    </Layout>
  )
}
