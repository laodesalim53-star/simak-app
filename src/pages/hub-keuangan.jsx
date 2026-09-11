import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import {
  Wallet, Receipt, HandCoins, ScrollText, ArrowRight, TrendingUp, TrendingDown,
} from 'lucide-react'

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0)
}

// Setiap kartu di hub ini menautkan ke satu halaman modul. `hitung` (opsional)
// mengambil satu angka ringkas dari Supabase untuk ditampilkan di kartu —
// dibuat sebagai fungsi supaya bisa dijalankan paralel di useEffect di bawah.
const MODUL = [
  {
    key: 'keuangan',
    judul: 'Keuangan',
    deskripsi: 'Transaksi kas, ARKAS, dan Buku Kas Umum (BKU) bulanan.',
    href: '/keuangan',
    icon: Wallet,
    warna: 'sage',
    async hitung() {
      const now = new Date()
      const awal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const { data } = await supabase.from('keuangan').select('jenis, jumlah').gte('tanggal', awal)
      const masuk = (data || []).filter((d) => d.jenis === 'masuk').reduce((a, b) => a + Number(b.jumlah), 0)
      const keluar = (data || []).filter((d) => d.jenis === 'keluar').reduce((a, b) => a + Number(b.jumlah), 0)
      return { label: 'Saldo bulan ini', nilai: formatRupiah(masuk - keluar) }
    },
  },
  {
    key: 'kuitansi',
    judul: 'Kuitansi',
    deskripsi: 'Riwayat kuitansi pembayaran, bisa ditarik langsung dari data BKU.',
    href: '/kuitansi',
    icon: Receipt,
    warna: 'brass',
    async hitung() {
      const { count } = await supabase.from('kuitansi').select('id', { count: 'exact', head: true }).eq('jenis', 'kuitansi')
      return { label: 'Total kuitansi', nilai: count ?? 0 }
    },
  },
  {
    key: 'kuitansi_jasa',
    judul: 'Kuitansi Jasa',
    deskripsi: 'Kuitansi untuk transport, honor kegiatan, dan jasa lainnya.',
    href: '/kuitansi-jasa',
    icon: HandCoins,
    warna: 'brass',
    async hitung() {
      const { count } = await supabase.from('kuitansi').select('id', { count: 'exact', head: true }).eq('jenis', 'kuitansi_jasa')
      return { label: 'Total kuitansi jasa', nilai: count ?? 0 }
    },
  },
  {
    key: 'nota',
    judul: 'Nota Belanja',
    deskripsi: 'Nota belanja dengan rincian barang, bisa ditarik dari BKU atau diimpor massal.',
    href: '/nota',
    icon: ScrollText,
    warna: 'sage',
    async hitung() {
      const { count } = await supabase.from('nota').select('id', { count: 'exact', head: true })
      return { label: 'Total nota', nilai: count ?? 0 }
    },
  },
]

const WARNA_KELAS = {
  sage: { bg: 'bg-sage-500/10', text: 'text-sage-500' },
  brass: { bg: 'bg-brass-400/20', text: 'text-brass-600' },
}

export default function Hub() {
  const navigate = useNavigate()
  const { profil } = useAuth()
  const [ringkasan, setRingkasan] = useState({}) // key modul -> { label, nilai }

  useEffect(() => {
    let batal = false
    MODUL.forEach((m) => {
      if (!m.hitung) return
      m.hitung().then((hasil) => {
        if (!batal) setRingkasan((r) => ({ ...r, [m.key]: hasil }))
      }).catch(() => {})
    })
    return () => { batal = true }
  }, [])

  return (
    <Layout
      title="Beranda"
      subtitle={profil?.nama_sekolah ? `Ringkasan administrasi keuangan — ${profil.nama_sekolah}` : 'Ringkasan administrasi keuangan'}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        {MODUL.map((m) => {
          const Icon = m.icon
          const warna = WARNA_KELAS[m.warna]
          const info = ringkasan[m.key]
          return (
            <button
              key={m.key}
              onClick={() => navigate(m.href)}
              className="card p-5 text-left flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${warna.bg} ${warna.text}`}>
                  <Icon size={20} />
                </div>
                <ArrowRight size={16} className="text-ink-700/30 mt-1" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-ink-950">{m.judul}</h3>
                <p className="text-sm text-ink-700/60 mt-1">{m.deskripsi}</p>
              </div>
              {info && (
                <div className="pt-3 border-t border-ink-950/10 flex items-center justify-between">
                  <span className="text-xs text-ink-700/50">{info.label}</span>
                  <span className="font-display text-sm font-semibold text-ink-950">{info.nilai}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </Layout>
  )
}
