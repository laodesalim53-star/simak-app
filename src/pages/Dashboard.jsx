import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import StoryBar from '../components/StoryBar'
import StoryUploader from '../components/StoryUploader'
import PintasanKUA from '../components/PintasanKUA'
import { Users, GraduationCap, DoorOpen, Megaphone, LayoutDashboard, ClipboardCheck, FileClock, Briefcase, UserCheck, AlertTriangle, Link2, ArrowRight } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts'

const COLORS = ['#D9A441', '#4C7A6E', '#22315B', '#A87A1F']

const RPP_STATUS_COLOR = {
  menunggu: '#D9A441',
  disetujui: '#4C7A6E',
  ditolak: '#B4453A',
}
const RPP_STATUS_LABEL = { menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak' }

const KATEGORI_STYLE = {
  Informasi: 'bg-ink-700/10 text-ink-700',
  Keuangan: 'bg-brass-400/15 text-brass-600',
  Akademik: 'bg-sage-500/15 text-sage-500',
}

const CARD_THEME = {
  navy: { gradient: 'from-blue-900 to-indigo-950' },
  indigo: { gradient: 'from-blue-800 to-indigo-900' },
  sage: { gradient: 'from-[#6B9C8D] to-[#4C7A6E]' },
  gold: { gradient: 'from-amber-600 to-amber-700' },
  slate: { gradient: 'from-slate-700 to-slate-800' },
  rose: { gradient: 'from-rose-500 to-rose-600' },
  emerald: { gradient: 'from-emerald-600 to-emerald-700' },
}

// PERBAIKAN: opacity default diturunkan dari 1 -> 0.4. Sebelumnya banner
// "Selamat datang..." memanggil <BatikOverlay> tanpa prop opacity, jadi
// pakai default 1 (motif penuh), yang menurunkan kontras teks putih di
// atasnya. Kartu statistik tidak terdampak karena mereka selalu mengirim
// opacity secara eksplisit (0.5).
function BatikOverlay({ patternId, strokeColor = '#d4af37', opacity = 0.4, size = 72 }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(8)"
        >
          <g fill="none" stroke={strokeColor} strokeWidth="1.1" opacity={opacity}>
            <ellipse cx={size / 2} cy={size * 0.333} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size / 2} cy={size * 0.667} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size * 0.333} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <ellipse cx={size * 0.667} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <circle cx={size / 2} cy={size / 2} r={size * 0.042} opacity="0.7" />
          </g>
          <path
            d={`M0 ${size} L${size * 0.25} ${size * 0.75} L${size * 0.5} ${size} L${size * 0.75} ${size * 0.75} L${size} ${size}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.35}
          />
          <path
            d={`M0 0 L${size * 0.25} ${size * 0.25} L0 ${size * 0.5}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.3}
          />
          <circle cx={size * 0.11} cy={size * 0.11} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.89} cy={size * 0.22} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.22} cy={size * 0.89} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (typeof target !== 'number') return
    let raf
    let start = null
    function step(ts) {
      if (start === null) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

function formatRelativeDate(iso) {
  const date = new Date(iso)
  const today = new Date()
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86400000)
  if (diffDays === 0) return 'Hari ini'
  if (diffDays === 1) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function formatTanggalHariIni() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function aggregateAttendance(rows) {
  const map = {}
  rows.forEach((r) => {
    if (!map[r.tanggal]) map[r.tanggal] = { total: 0, hadir: 0 }
    map[r.tanggal].total += 1
    if (r.status === 'hadir') map[r.tanggal].hadir += 1
  })
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tanggal, v]) => ({
      tanggal: new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      persen: v.total ? Math.round((v.hadir / v.total) * 100) : 0,
    }))
}

function aggregateNilai(rows) {
  const map = {}
  rows.forEach((r) => {
    if (!r.mata_pelajaran) return
    if (!map[r.mata_pelajaran]) map[r.mata_pelajaran] = { total: 0, count: 0 }
    map[r.mata_pelajaran].total += Number(r.nilai) || 0
    map[r.mata_pelajaran].count += 1
  })
  return Object.entries(map)
    .map(([mapel, v]) => ({ mapel, rata: Math.round((v.total / v.count) * 10) / 10 }))
    .sort((a, b) => b.rata - a.rata)
    .slice(0, 8)
}

// BARU: dipakai untuk mengganti pesan "Belum ada data" saat state masih
// loading, supaya tidak ada kedipan pesan kosong yang keliru (lihat
// catatan PERBAIKAN di DashboardSekolah/DashboardKantor).
function ChartSkeleton({ height = 220 }) {
  return <div className="animate-pulse rounded-lg bg-ink-900/[0.06]" style={{ height }} />
}

// BARU: cek field `.error` dari setiap respons Supabase dalam sebuah
// Promise.all. Sebelumnya semua hasil query langsung dipakai lewat
// `.count || 0` / `.data || []`, jadi kalau query gagal (RLS, koneksi,
// dll) dashboard diam-diam menampilkan 0 / kosong seolah memang tidak
// ada data — padahal sebenarnya gagal dimuat. Ini menimbulkan risiko
// admin salah baca data sekolah sebagai "benar-benar kosong".
function logSupabaseErrors(scope, resultsByName) {
  const failed = Object.entries(resultsByName).filter(([, r]) => r?.error)
  failed.forEach(([name, r]) => {
    console.error(`[Dashboard:${scope}] gagal memuat "${name}":`, r.error)
  })
  return failed.length > 0
}

// BARU: banner kecil yang muncul kalau salah satu query gagal, supaya
// user tahu sebagian data mungkin tidak akurat, bukan cuma diam saja.
function DataErrorBanner() {
  return (
    <div className="dash-fade-in opacity-0 mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
      <AlertTriangle size={16} className="shrink-0" />
      <span>Sebagian data gagal dimuat. Coba muat ulang halaman; jika masih terjadi, hubungi admin sistem.</span>
    </div>
  )
}

// BARU: kartu pintasan ke halaman Link Layanan (KGB, kenaikan pangkat,
// Dapodik, dll). Hanya dipakai di DashboardSekolah — sengaja TIDAK
// ditampilkan di DashboardKantor (KUA sudah punya <PintasanKUA /> sendiri
// dan link ini memang dilewatkan untuk tenant kantor & peran orang tua).
function PintasanLinkLayanan() {
  return (
    <Link
      to="/link-layanan"
      className="dash-fade-in opacity-0 card p-5 mb-8 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
      style={{ animationDelay: '420ms' }}
    >
      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <Link2 size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold text-ink-950">Link Layanan &amp; Kepegawaian</p>
        <p className="text-xs text-ink-700/60 mt-0.5">
          Akses cepat ke portal KGB, kenaikan pangkat, mutasi pegawai, info GTK, dan Dapodik.
        </p>
      </div>
      <ArrowRight size={16} className="text-ink-700/30 shrink-0" />
    </Link>
  )
}

function StatCard({ label, value, icon: Icon, theme, sublabel, loading, delay, patternId }) {
  const t = CARD_THEME[theme]
  const isNumeric = typeof value === 'number'
  const animated = useCountUp(isNumeric ? value : 0)
  const display = isNumeric ? animated : value
  const urgent = theme === 'rose'

  return (
    <div
      className={`dash-fade-in opacity-0 group relative overflow-hidden rounded-2xl p-5 text-white shadow-md bg-gradient-to-br ${t.gradient} transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <BatikOverlay patternId={patternId} strokeColor="#ffffff" opacity={0.5} size={56} />

      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <div className="relative flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-white/90">{label}</p>
        <div className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          {urgent && <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" />}
          <Icon size={18} className="relative" />
        </div>
      </div>

      {loading ? (
        <div className="h-8 w-16 rounded-md bg-white/20 animate-pulse" />
      ) : (
        <p className="relative text-3xl font-display font-bold tabular-nums">{display}</p>
      )}

      {sublabel && !loading && (
        <p className="relative text-xs text-white/80 mt-1.5">{sublabel}</p>
      )}
    </div>
  )
}

/* ================================================================
   ==================  DASBOR SEKOLAH  ================================
   ================================================================ */
function DashboardSekolah({ sekolahId }) {
  const [stats, setStats] = useState({ siswa: 0, guru: 0, kelas: 0, pengumuman: 0 })
  const [genderData, setGenderData] = useState([])
  const [pengumuman, setPengumuman] = useState([])
  const [attendanceTrend, setAttendanceTrend] = useState([])
  const [nilaiPerMapel, setNilaiPerMapel] = useState([])
  const [rppStatus, setRppStatus] = useState({ menunggu: 0, disetujui: 0, ditolak: 0 })
  const [presensiHariIni, setPresensiHariIni] = useState({ terisi: 0, hadir: 0, izin: 0, alpa: 0 })
  const [pengajuanMenunggu, setPengajuanMenunggu] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [storyRefreshKey, setStoryRefreshKey] = useState(0)

  const hariIni = formatTanggalHariIni()

  useEffect(() => {
    async function load() {
      if (!sekolahId) {
        setLoading(false)
        return
      }

      setLoading(true)

      const since = new Date()
      since.setDate(since.getDate() - 13)
      const sinceStr = since.toISOString().slice(0, 10)
      const todayStr = new Date().toISOString().slice(0, 10)

      const [
        siswaCount, guruCount, kelasCount, pengumumanCount, lakiCount, perempuanCount, pengumumanRecent,
        presensiRows, nilaiRows, rppMenunggu, rppDisetujui, rppDitolak,
        presensiHariIniRows, pengajuanMenungguCount,
      ] = await Promise.all([
        supabase.from('siswa').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId).eq('status', 'aktif'),
        supabase.from('guru').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId),
        supabase.from('kelas').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId),
        supabase.from('pengumuman').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId),
        supabase.from('siswa').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId).eq('status', 'aktif').eq('jenis_kelamin', 'L'),
        supabase.from('siswa').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId).eq('status', 'aktif').eq('jenis_kelamin', 'P'),
        supabase.from('pengumuman').select('id, judul, kategori, dibuat_pada')
          .eq('sekolah_id', sekolahId).order('dibuat_pada', { ascending: false }).limit(5),
        supabase.from('presensi_siswa').select('tanggal, status')
          .eq('sekolah_id', sekolahId).gte('tanggal', sinceStr),
        supabase.from('nilai').select('mata_pelajaran, nilai')
          .eq('sekolah_id', sekolahId),
        supabase.from('rpp').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId).eq('status', 'menunggu'),
        supabase.from('rpp').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId).eq('status', 'disetujui'),
        supabase.from('rpp').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId).eq('status', 'ditolak'),
        supabase.from('presensi_siswa').select('status')
          .eq('sekolah_id', sekolahId).eq('tanggal', todayStr),
        supabase.from('pengajuan_izin').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId).eq('status', 'diajukan'),
      ])

      // PERBAIKAN: cek error sebelum dipakai, jangan langsung `.count || 0`.
      const gagal = logSupabaseErrors('Sekolah', {
        siswaCount, guruCount, kelasCount, pengumumanCount, lakiCount, perempuanCount,
        pengumumanRecent, presensiRows, nilaiRows, rppMenunggu, rppDisetujui, rppDitolak,
        presensiHariIniRows, pengajuanMenungguCount,
      })
      setLoadError(gagal)

      setStats({
        siswa: siswaCount.count || 0,
        guru: guruCount.count || 0,
        kelas: kelasCount.count || 0,
        pengumuman: pengumumanCount.count || 0,
      })
      setGenderData([
        { name: 'Laki-laki', value: lakiCount.count || 0 },
        { name: 'Perempuan', value: perempuanCount.count || 0 },
      ])
      setPengumuman(pengumumanRecent.data || [])
      setAttendanceTrend(aggregateAttendance(presensiRows.data || []))
      setNilaiPerMapel(aggregateNilai(nilaiRows.data || []))
      setRppStatus({
        menunggu: rppMenunggu.count || 0,
        disetujui: rppDisetujui.count || 0,
        ditolak: rppDitolak.count || 0,
      })

      const rekapHariIni = { hadir: 0, izin: 0, alpa: 0 }
      for (const p of presensiHariIniRows.data || []) {
        if (rekapHariIni[p.status] !== undefined) rekapHariIni[p.status]++
      }
      setPresensiHariIni({ terisi: (presensiHariIniRows.data || []).length, ...rekapHariIni })
      setPengajuanMenunggu(pengajuanMenungguCount.count || 0)

      setLoading(false)
    }
    load()
  }, [sekolahId])

  const cards = [
    { label: 'Total Siswa', value: stats.siswa, icon: Users, theme: 'navy' },
    { label: 'Total Guru', value: stats.guru, icon: GraduationCap, theme: 'sage' },
    { label: 'Jumlah Kelas', value: stats.kelas, icon: DoorOpen, theme: 'indigo' },
    { label: 'Pengumuman', value: stats.pengumuman, icon: Megaphone, theme: 'gold' },
    {
      label: 'Presensi Hari Ini',
      value: `${presensiHariIni.terisi}/${stats.siswa}`,
      sublabel: `${presensiHariIni.hadir} hadir · ${presensiHariIni.izin} izin · ${presensiHariIni.alpa} alpa`,
      icon: ClipboardCheck,
      theme: 'slate',
    },
    {
      label: 'Pengajuan Menunggu',
      value: pengajuanMenunggu,
      sublabel: pengajuanMenunggu > 0 ? 'menunggu persetujuan Anda' : 'tidak ada yang menunggu',
      icon: FileClock,
      theme: pengajuanMenunggu > 0 ? 'rose' : 'emerald',
    },
  ]

  return (
    <Layout title="Dasbor" subtitle="Ringkasan data sekolah Anda hari ini">
      <style>{`
        @keyframes dashFadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-fade-in {
          animation: dashFadeInUp 0.5s ease-out forwards;
        }
      `}</style>

      <div className="relative">
        <div className="dash-fade-in opacity-0 relative overflow-hidden rounded-xl p-6 mb-6 flex items-center gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <BatikOverlay patternId="batikBanner" strokeColor="#d4af37" />
          <div className="relative w-12 h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <LayoutDashboard size={22} />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="font-display font-semibold text-lg text-white">Selamat datang kembali di SIMAK</p>
            <p className="text-sm text-blue-200/70">
              {!loading && pengajuanMenunggu > 0
                ? `${pengajuanMenunggu} pengajuan izin menunggu persetujuan Anda.`
                : 'Semua ringkasan data sekolah ada di bawah ini.'}
            </p>
          </div>
          <div className="relative hidden sm:block text-right shrink-0">
            <p className="text-xs text-blue-200/60 capitalize">{hariIni}</p>
          </div>
        </div>

        {loadError && <DataErrorBanner />}

        <StoryBar key={storyRefreshKey} />
        <StoryUploader onPosted={() => setStoryRefreshKey((k) => k + 1)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {cards.map(({ label, value, icon, theme, sublabel }, i) => (
            <StatCard
              key={label}
              label={label}
              value={value}
              icon={icon}
              theme={theme}
              sublabel={sublabel}
              loading={loading}
              delay={i * 90}
              patternId={`batikCard-${theme}-${i}`}
            />
          ))}
        </div>

        <PintasanLinkLayanan />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="dash-fade-in opacity-0 card p-6 lg:col-span-2" style={{ animationDelay: '540ms' }}>
            <h3 className="font-display text-lg font-semibold mb-4">Komposisi Siswa</h3>
            {loading ? (
              <ChartSkeleton height={220} />
            ) : stats.siswa === 0 ? (
              <p className="text-sm text-ink-700/50">Belum ada data siswa.</p>
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                      {genderData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[92px] left-1/2 -translate-x-1/2 text-center pointer-events-none">
                  <p className="text-xl font-display font-semibold text-ink-950">{stats.siswa}</p>
                  <p className="text-[11px] text-ink-700/50">siswa</p>
                </div>
              </div>
            )}
          </div>

          <div className="dash-fade-in opacity-0 card p-6 lg:col-span-3" style={{ animationDelay: '600ms' }}>
            <h3 className="font-display text-lg font-semibold mb-4">Pengumuman Terbaru</h3>
            {loading ? (
              <ChartSkeleton height={180} />
            ) : pengumuman.length === 0 ? (
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
                    <span className="text-xs text-ink-700/40 shrink-0">
                      {formatRelativeDate(p.dibuat_pada)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <h2 className="font-display text-xl font-semibold text-ink-950 mt-8 mb-4">Analitik</h2>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="dash-fade-in opacity-0 card p-6 lg:col-span-3" style={{ animationDelay: '660ms' }}>
            <h3 className="font-display text-lg font-semibold mb-4">Tren Kehadiran Siswa (14 Hari Terakhir)</h3>
            {loading ? (
              <ChartSkeleton height={220} />
            ) : attendanceTrend.length === 0 ? (
              <p className="text-sm text-ink-700/50">Belum ada data presensi.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={40} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Kehadiran']} />
                  <Line type="monotone" dataKey="persen" stroke="#4C7A6E" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="dash-fade-in opacity-0 card p-6 lg:col-span-2" style={{ animationDelay: '720ms' }}>
            <h3 className="font-display text-lg font-semibold mb-4">Status RPP</h3>
            {loading ? (
              <ChartSkeleton height={140} />
            ) : rppStatus.menunggu + rppStatus.disetujui + rppStatus.ditolak === 0 ? (
              <p className="text-sm text-ink-700/50">Belum ada RPP diupload.</p>
            ) : (
              <div className="space-y-3 pt-1">
                {Object.entries(rppStatus).map(([key, value]) => {
                  const total = rppStatus.menunggu + rppStatus.disetujui + rppStatus.ditolak
                  const pct = total ? (value / total) * 100 : 0
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-ink-700">{RPP_STATUS_LABEL[key]}</span>
                        <span className="font-medium text-ink-950">{value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-ink-900/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%`, backgroundColor: RPP_STATUS_COLOR[key] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="dash-fade-in opacity-0 card p-6 lg:col-span-5" style={{ animationDelay: '780ms' }}>
            <h3 className="font-display text-lg font-semibold mb-4">Rata-rata Nilai per Mata Pelajaran</h3>
            {loading ? (
              <ChartSkeleton height={240} />
            ) : nilaiPerMapel.length === 0 ? (
              <p className="text-sm text-ink-700/50">Belum ada data nilai.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={nilaiPerMapel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="mapel" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip />
                  <Bar dataKey="rata" fill="#D9A441" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

/* ================================================================
   ==================  DASBOR KANTOR  =================================
   ================================================================ */
function DashboardKantor({ sekolahId }) {
  const [stats, setStats] = useState({ pegawai: 0, pengumuman: 0 })
  const [pengumuman, setPengumuman] = useState([])
  const [attendanceTrend, setAttendanceTrend] = useState([])
  const [presensiHariIni, setPresensiHariIni] = useState({ terisi: 0, hadir: 0, izin: 0, alpa: 0 })
  const [akunMenunggu, setAkunMenunggu] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [storyRefreshKey, setStoryRefreshKey] = useState(0)

  const hariIni = formatTanggalHariIni()

  useEffect(() => {
    async function load() {
      if (!sekolahId) {
        setLoading(false)
        return
      }

      setLoading(true)

      const since = new Date()
      since.setDate(since.getDate() - 13)
      const sinceStr = since.toISOString().slice(0, 10)
      const todayStr = new Date().toISOString().slice(0, 10)

      const [
        pegawaiCount, pengumumanCount, pengumumanRecent, pegawaiRows, akunMenungguCount,
      ] = await Promise.all([
        supabase.from('pegawai_kantor').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId).eq('status', 'aktif'),
        supabase.from('pengumuman').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId),
        supabase.from('pengumuman').select('id, judul, kategori, dibuat_pada')
          .eq('sekolah_id', sekolahId).order('dibuat_pada', { ascending: false }).limit(5),
        supabase.from('pegawai_kantor').select('id')
          .eq('sekolah_id', sekolahId).eq('status', 'aktif'),
        supabase.from('profil').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId).eq('status_akun', 'menunggu'),
      ])

      const pegawaiIds = (pegawaiRows.data || []).map((p) => p.id)

      const [presensiTrenRows, presensiHariIniRows] = await Promise.all([
        pegawaiIds.length
          ? supabase.from('presensi_pegawai').select('tanggal, status')
              .in('pegawai_id', pegawaiIds).gte('tanggal', sinceStr)
          : Promise.resolve({ data: [] }),
        pegawaiIds.length
          ? supabase.from('presensi_pegawai').select('status')
              .in('pegawai_id', pegawaiIds).eq('tanggal', todayStr)
          : Promise.resolve({ data: [] }),
      ])

      // PERBAIKAN: sama seperti DashboardSekolah — cek error sebelum dipakai.
      const gagal = logSupabaseErrors('Kantor', {
        pegawaiCount, pengumumanCount, pengumumanRecent, pegawaiRows, akunMenungguCount,
        presensiTrenRows, presensiHariIniRows,
      })
      setLoadError(gagal)

      setStats({
        pegawai: pegawaiCount.count || 0,
        pengumuman: pengumumanCount.count || 0,
      })
      setPengumuman(pengumumanRecent.data || [])
      setAttendanceTrend(aggregateAttendance(presensiTrenRows.data || []))

      const rekapHariIni = { hadir: 0, izin: 0, alpa: 0 }
      for (const p of presensiHariIniRows.data || []) {
        if (rekapHariIni[p.status] !== undefined) rekapHariIni[p.status]++
      }
      setPresensiHariIni({ terisi: (presensiHariIniRows.data || []).length, ...rekapHariIni })
      setAkunMenunggu(akunMenungguCount.count || 0)

      setLoading(false)
    }
    load()
  }, [sekolahId])

  const cards = [
    { label: 'Total Pegawai', value: stats.pegawai, icon: Briefcase, theme: 'navy' },
    { label: 'Pengumuman', value: stats.pengumuman, icon: Megaphone, theme: 'gold' },
    {
      label: 'Presensi Hari Ini',
      value: `${presensiHariIni.terisi}/${stats.pegawai}`,
      sublabel: `${presensiHariIni.hadir} hadir · ${presensiHariIni.izin} izin · ${presensiHariIni.alpa} alpa`,
      icon: ClipboardCheck,
      theme: 'slate',
    },
    {
      label: 'Akun Menunggu',
      value: akunMenunggu,
      sublabel: akunMenunggu > 0 ? 'menunggu persetujuan Anda' : 'tidak ada yang menunggu',
      icon: UserCheck,
      theme: akunMenunggu > 0 ? 'rose' : 'emerald',
    },
  ]

  return (
    <Layout title="Dasbor" subtitle="Ringkasan data kantor Anda hari ini">
      <style>{`
        @keyframes dashFadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-fade-in {
          animation: dashFadeInUp 0.5s ease-out forwards;
        }
      `}</style>

      <div className="relative">
        <div className="dash-fade-in opacity-0 relative overflow-hidden rounded-xl p-6 mb-6 flex items-center gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <BatikOverlay patternId="batikBannerKantor" strokeColor="#d4af37" />
          <div className="relative w-12 h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <LayoutDashboard size={22} />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="font-display font-semibold text-lg text-white">Selamat datang kembali</p>
            <p className="text-sm text-blue-200/70">
              {!loading && akunMenunggu > 0
                ? `${akunMenunggu} akun menunggu persetujuan Anda.`
                : 'Semua ringkasan data kantor ada di bawah ini.'}
            </p>
          </div>
          <div className="relative hidden sm:block text-right shrink-0">
            <p className="text-xs text-blue-200/60 capitalize">{hariIni}</p>
          </div>
        </div>

        {loadError && <DataErrorBanner />}

        <StoryBar key={storyRefreshKey} />
        <StoryUploader onPosted={() => setStoryRefreshKey((k) => k + 1)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map(({ label, value, icon, theme, sublabel }, i) => (
            <StatCard
              key={label}
              label={label}
              value={value}
              icon={icon}
              theme={theme}
              sublabel={sublabel}
              loading={loading}
              delay={i * 90}
              patternId={`batikCardKantor-${theme}-${i}`}
            />
          ))}
        </div>

        <PintasanKUA />

        <div className="dash-fade-in opacity-0 card p-6 mb-8" style={{ animationDelay: '450ms' }}>
          <h3 className="font-display text-lg font-semibold mb-4">Pengumuman Terbaru</h3>
          {loading ? (
            <ChartSkeleton height={180} />
          ) : pengumuman.length === 0 ? (
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
                  <span className="text-xs text-ink-700/40 shrink-0">
                    {formatRelativeDate(p.dibuat_pada)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <h2 className="font-display text-xl font-semibold text-ink-950 mt-8 mb-4">Analitik</h2>
        <div className="dash-fade-in opacity-0 card p-6" style={{ animationDelay: '520ms' }}>
          <h3 className="font-display text-lg font-semibold mb-4">Tren Kehadiran Pegawai (14 Hari Terakhir)</h3>
          {loading ? (
            <ChartSkeleton height={240} />
          ) : attendanceTrend.length === 0 ? (
            <p className="text-sm text-ink-700/50">Belum ada data presensi.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={40} />
                <Tooltip formatter={(v) => [`${v}%`, 'Kehadiran']} />
                <Line type="monotone" dataKey="persen" stroke="#4C7A6E" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Layout>
  )
}
/* ================================================================
   ==================  DASBOR PUSKESMAS  ==============================
   ================================================================ */
function DashboardPuskesmas({ sekolahId }) {
  const [stats, setStats] = useState({ pegawai: 0, pengumuman: 0 })
  const [pengumuman, setPengumuman] = useState([])
  const [attendanceTrend, setAttendanceTrend] = useState([])
  const [presensiHariIni, setPresensiHariIni] = useState({ terisi: 0, hadir: 0, izin: 0, alpa: 0 })
  const [akunMenunggu, setAkunMenunggu] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [storyRefreshKey, setStoryRefreshKey] = useState(0)

  const hariIni = formatTanggalHariIni()

  useEffect(() => {
    async function load() {
      if (!sekolahId) {
        setLoading(false)
        return
      }

      setLoading(true)

      const since = new Date()
      since.setDate(since.getDate() - 13)
      const sinceStr = since.toISOString().slice(0, 10)
      const todayStr = new Date().toISOString().slice(0, 10)

      const [
        pegawaiCount, pengumumanCount, pengumumanRecent, pegawaiRows, akunMenungguCount,
      ] = await Promise.all([
        supabase.from('pegawai_puskesmas').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId).eq('status', 'aktif'),
        supabase.from('pengumuman').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId),
        supabase.from('pengumuman').select('id, judul, kategori, dibuat_pada')
          .eq('sekolah_id', sekolahId).order('dibuat_pada', { ascending: false }).limit(5),
        supabase.from('pegawai_puskesmas').select('id')
          .eq('sekolah_id', sekolahId).eq('status', 'aktif'),
        supabase.from('profil').select('*', { count: 'exact', head: true })
          .eq('sekolah_id', sekolahId).eq('status_akun', 'menunggu'),
      ])

      const pegawaiIds = (pegawaiRows.data || []).map((p) => p.id)

      const [presensiTrenRows, presensiHariIniRows] = await Promise.all([
        pegawaiIds.length
          ? supabase.from('presensi_puskesmas').select('tanggal, status')
              .in('pegawai_id', pegawaiIds).gte('tanggal', sinceStr)
          : Promise.resolve({ data: [] }),
        pegawaiIds.length
          ? supabase.from('presensi_puskesmas').select('status')
              .in('pegawai_id', pegawaiIds).eq('tanggal', todayStr)
          : Promise.resolve({ data: [] }),
      ])

      const gagal = logSupabaseErrors('Puskesmas', {
        pegawaiCount, pengumumanCount, pengumumanRecent, pegawaiRows, akunMenungguCount,
        presensiTrenRows, presensiHariIniRows,
      })
      setLoadError(gagal)

      setStats({
        pegawai: pegawaiCount.count || 0,
        pengumuman: pengumumanCount.count || 0,
      })
      setPengumuman(pengumumanRecent.data || [])
      setAttendanceTrend(aggregateAttendance(presensiTrenRows.data || []))

      const rekapHariIni = { hadir: 0, izin: 0, alpa: 0 }
      for (const p of presensiHariIniRows.data || []) {
        if (rekapHariIni[p.status] !== undefined) rekapHariIni[p.status]++
      }
      setPresensiHariIni({ terisi: (presensiHariIniRows.data || []).length, ...rekapHariIni })
      setAkunMenunggu(akunMenungguCount.count || 0)

      setLoading(false)
    }
    load()
  }, [sekolahId])

  const cards = [
    { label: 'Total Pegawai', value: stats.pegawai, icon: Briefcase, theme: 'navy' },
    { label: 'Pengumuman', value: stats.pengumuman, icon: Megaphone, theme: 'gold' },
    {
      label: 'Presensi Hari Ini',
      value: `${presensiHariIni.terisi}/${stats.pegawai}`,
      sublabel: `${presensiHariIni.hadir} hadir · ${presensiHariIni.izin} izin · ${presensiHariIni.alpa} alpa`,
      icon: ClipboardCheck,
      theme: 'slate',
    },
    {
      label: 'Akun Menunggu',
      value: akunMenunggu,
      sublabel: akunMenunggu > 0 ? 'menunggu persetujuan Anda' : 'tidak ada yang menunggu',
      icon: UserCheck,
      theme: akunMenunggu > 0 ? 'rose' : 'emerald',
    },
  ]

  return (
    <Layout title="Dasbor" subtitle="Ringkasan data puskesmas Anda hari ini">
      <style>{`
        @keyframes dashFadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-fade-in {
          animation: dashFadeInUp 0.5s ease-out forwards;
        }
      `}</style>

      <div className="relative">
        <div className="dash-fade-in opacity-0 relative overflow-hidden rounded-xl p-6 mb-6 flex items-center gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <BatikOverlay patternId="batikBannerPuskesmas" strokeColor="#d4af37" />
          <div className="relative w-12 h-12 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
            <LayoutDashboard size={22} />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="font-display font-semibold text-lg text-white">Selamat datang kembali</p>
            <p className="text-sm text-blue-200/70">
              {!loading && akunMenunggu > 0
                ? `${akunMenunggu} akun menunggu persetujuan Anda.`
                : 'Semua ringkasan data puskesmas ada di bawah ini.'}
            </p>
          </div>
          <div className="relative hidden sm:block text-right shrink-0">
            <p className="text-xs text-blue-200/60 capitalize">{hariIni}</p>
          </div>
        </div>

        {loadError && <DataErrorBanner />}

        <StoryBar key={storyRefreshKey} />
        <StoryUploader onPosted={() => setStoryRefreshKey((k) => k + 1)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map(({ label, value, icon, theme, sublabel }, i) => (
            <StatCard
              key={label}
              label={label}
              value={value}
              icon={icon}
              theme={theme}
              sublabel={sublabel}
              loading={loading}
              delay={i * 90}
              patternId={`batikCardPuskesmas-${theme}-${i}`}
            />
          ))}
        </div>

        <div className="dash-fade-in opacity-0 card p-6 mb-8" style={{ animationDelay: '450ms' }}>
          <h3 className="font-display text-lg font-semibold mb-4">Pengumuman Terbaru</h3>
          {loading ? (
            <ChartSkeleton height={180} />
          ) : pengumuman.length === 0 ? (
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
                  <span className="text-xs text-ink-700/40 shrink-0">
                    {formatRelativeDate(p.dibuat_pada)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <h2 className="font-display text-xl font-semibold text-ink-950 mt-8 mb-4">Analitik</h2>
        <div className="dash-fade-in opacity-0 card p-6" style={{ animationDelay: '520ms' }}>
          <h3 className="font-display text-lg font-semibold mb-4">Tren Kehadiran Pegawai (14 Hari Terakhir)</h3>
          {loading ? (
            <ChartSkeleton height={240} />
          ) : attendanceTrend.length === 0 ? (
            <p className="text-sm text-ink-700/50">Belum ada data presensi.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={40} />
                <Tooltip formatter={(v) => [`${v}%`, 'Kehadiran']} />
                <Line type="monotone" dataKey="persen" stroke="#4C7A6E" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Layout>
  )
}

// ============================================================
// Entry point: pilih tampilan berdasarkan jenis_organisasi.
// ============================================================
export default function Dashboard() {
  const { sekolahId, isKantor, isPuskesmas } = useAuth()
  if (isKantor) return <DashboardKantor sekolahId={sekolahId} />
  if (isPuskesmas) return <DashboardPuskesmas sekolahId={sekolahId} />
  return <DashboardSekolah sekolahId={sekolahId} />
}
