import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import {
  Users,
  Gavel,
  FileText,
  Megaphone,
  LayoutDashboard,
  ClipboardCheck,
  ArrowRight,
} from 'lucide-react'

// Dasbor untuk tenant "polres". Dipanggil dari entry point Dashboard()
// (lihat Dashboard.jsx: if (isPolres) return <DashboardPolres ... />).
//
// Warna banner mengikuti tema tenant lewat variabel --sidebar-* yang diatur
// TemaSync + tema.css. Warna kartu dibuat tetap (biru/abu/emas) agar senada
// dengan tema polres.

// TODO: ganti dengan nama tabel Data Personel yang sebenarnya.
const TABEL_PERSONEL = 'personel_polres'

const KARTU_TEMA = {
  biru: 'from-blue-700 to-blue-900',
  abu: 'from-slate-600 to-slate-800',
  emas: 'from-amber-500 to-amber-700',
  langit: 'from-sky-600 to-sky-800',
}

const PINTASAN = [
  { to: '/reskrim-penyidik', label: 'Register Perkara (Penyidik)', icon: Gavel },
  { to: '/reskrim/surat', label: 'Surat Reskrim', icon: FileText },
  { to: '/presensi-polres', label: 'Presensi Personel', icon: ClipboardCheck },
  { to: '/data-personel-polres', label: 'Data Personel', icon: Users },
]

const KATEGORI_STYLE = {
  Informasi: 'bg-ink-700/10 text-ink-700',
  Keuangan: 'bg-brass-400/15 text-brass-600',
  Akademik: 'bg-sage-500/15 text-sage-500',
}

function formatRelativeDate(iso) {
  const date = new Date(iso)
  const today = new Date()
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86400000)
  if (diffDays === 0) return 'Hari ini'
  if (diffDays === 1) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default function DashboardPolres() {
  const [stats, setStats] = useState({ personel: 0, perkara: 0, surat: 0, pengumuman: 0 })
  const [pengumuman, setPengumuman] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let aktif = true

    async function load() {
      const hitung = (tabel) => supabase.from(tabel).select('*', { count: 'exact', head: true })

      const [personel, perkara, surat, pengCount, pengRecent] = await Promise.all([
        hitung(TABEL_PERSONEL),
        hitung('perkara_reskrim'),
        hitung('surat_reskrim'),
        hitung('pengumuman'),
        supabase
          .from('pengumuman')
          .select('id, judul, kategori, dibuat_pada')
          .order('dibuat_pada', { ascending: false })
          .limit(5),
      ])

      if (!aktif) return
      setStats({
        personel: personel.count || 0,
        perkara: perkara.count || 0,
        surat: surat.count || 0,
        pengumuman: pengCount.count || 0,
      })
      setPengumuman(pengRecent.data || [])
      setLoading(false)
    }

    load()
    return () => {
      aktif = false
    }
  }, [])

  const kartu = [
    { label: 'Total Personel', value: stats.personel, icon: Users, tema: 'biru' },
    { label: 'Perkara Reskrim', value: stats.perkara, icon: Gavel, tema: 'abu' },
    { label: 'Surat Reskrim', value: stats.surat, icon: FileText, tema: 'emas' },
    { label: 'Pengumuman', value: stats.pengumuman, icon: Megaphone, tema: 'langit' },
  ]

  return (
    <Layout title="Dasbor" subtitle="Ringkasan data satuan Anda hari ini">
      <div
        className="relative overflow-hidden rounded-xl p-6 mb-6 flex items-center gap-4"
        style={{ background: 'var(--sidebar-header-gradient)' }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
        <div
          className="relative w-12 h-12 rounded-full bg-white/10 ring-2 text-white flex items-center justify-center shrink-0"
          style={{ '--tw-ring-color': 'color-mix(in srgb, var(--sidebar-accent) 50%, transparent)' }}
        >
          <LayoutDashboard size={22} />
        </div>
        <div className="relative">
          <p className="font-display font-semibold text-lg text-white">Selamat datang kembali di SIMAK</p>
          <p className="text-sm text-white/70">Semua ringkasan data satuan ada di bawah ini.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {kartu.map(({ label, value, icon: Icon, tema }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-md bg-gradient-to-br ${KARTU_TEMA[tema]}`}
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-medium text-white/90">{label}</p>
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Icon size={18} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold mb-4">Pintasan</h3>
          <ul className="space-y-1">
            {PINTASAN.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-ink-900 active:bg-ink-900/[0.06] md:hover:bg-ink-900/[0.04] touch-manipulation"
                >
                  <Icon size={18} className="text-ink-700/60 shrink-0" />
                  <span className="flex-1">{label}</span>
                  <ArrowRight size={14} className="text-ink-700/30 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6 lg:col-span-3">
          <h3 className="font-display text-lg font-semibold mb-4">Pengumuman Terbaru</h3>
          {pengumuman.length === 0 ? (
            <p className="text-sm text-ink-700/50">Belum ada pengumuman.</p>
          ) : (
            <ul className="divide-y divide-ink-900/[0.06]">
              {pengumuman.map((p) => (
                <li key={p.id} className="py-3 flex items-center gap-3">
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0 ${
                      KATEGORI_STYLE[p.kategori] || KATEGORI_STYLE.Informasi
                    }`}
                  >
                    {p.kategori || 'Informasi'}
                  </span>
                  <span className="text-sm text-ink-900 truncate flex-1">{p.judul}</span>
                  <span className="text-xs text-ink-700/40 shrink-0">{formatRelativeDate(p.dibuat_pada)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  )
}
