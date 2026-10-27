import { useNavigate } from 'react-router-dom'
import {
  Landmark,
  School,
  GraduationCap,
  Award,
  CalendarDays,
  Wallet,
  HeartHandshake,
  Hammer,
  Store,
  Users,
  BookOpenCheck,
  Trees,
  FileText,
  Lock,
} from 'lucide-react'

// Hub "Proposal" — pola sama dengan GudangSK / PusatLaporanGuru: satu halaman
// berisi kartu-kartu. Kartu `aktif: true` sudah punya halaman; sisanya tampil
// sebagai "Segera" dan tinggal diaktifkan satu per satu (isi `to` + `aktif`).
const GRUP = [
  {
    judul: 'Pembangunan & Sarana',
    kartu: [
      {
        key: 'pembangunan',
        label: 'Proposal Bantuan Pembangunan / Renovasi',
        desc: 'Masjid, gereja, mushola, balai, ruang kelas. Surat permohonan, proposal, RAB, SK panitia & susunan panitia dalam satu paket cetak.',
        icon: Landmark,
        to: '/proposal/pembangunan',
        aktif: true,
      },
      { key: 'sarana-sekolah', label: 'Pengadaan Sarana & Prasarana Sekolah', desc: 'Meubelair, alat peraga, komputer, perpustakaan.', icon: School },
      { key: 'rehab-kelas', label: 'Rehabilitasi Ruang Kelas / Toilet', desc: 'Perbaikan bangunan sekolah dengan RAB.', icon: Hammer },
      { key: 'taman', label: 'Penataan Lingkungan & Taman', desc: 'Pagar, taman, drainase, sumber air.', icon: Trees },
    ],
  },
  {
    judul: 'Kegiatan',
    kartu: [
      { key: 'kegiatan-umum', label: 'Proposal Kegiatan (Umum)', desc: 'Latar belakang, tujuan, sasaran, waktu, susunan panitia, anggaran.', icon: FileText },
      { key: 'kegiatan-siswa', label: 'Kegiatan Siswa / Lomba / Study Tour', desc: 'Pembinaan siswa, lomba, perkemahan, wisata edukasi.', icon: Award },
      { key: 'hari-besar', label: 'Peringatan Hari Besar (PHBN / PHBI / Natal)', desc: 'HUT RI, Maulid, Isra Mi\'raj, Natal, dll.', icon: CalendarDays },
      { key: 'keagamaan', label: 'Kegiatan Keagamaan & Pembinaan Majelis', desc: 'TPQ, pengajian, pesantren kilat, Ramadan.', icon: BookOpenCheck },
    ],
  },
  {
    judul: 'Dana & Kerja Sama',
    kartu: [
      { key: 'hibah', label: 'Permohonan Dana Hibah / Bantuan Sosial', desc: 'Ke pemerintah daerah, dinas, atau instansi.', icon: Wallet },
      { key: 'sponsor', label: 'Proposal Sponsorship / CSR', desc: 'Penawaran kerja sama ke perusahaan dan donatur.', icon: HeartHandshake },
      { key: 'beasiswa', label: 'Bantuan Pendidikan / Beasiswa', desc: 'Siswa kurang mampu dan berprestasi.', icon: GraduationCap },
      { key: 'usaha', label: 'Proposal Usaha / Koperasi / BUMDes', desc: 'Modal usaha, kantin, koperasi sekolah.', icon: Store },
      { key: 'komunitas', label: 'Pemberdayaan Masyarakat', desc: 'Kelompok binaan, pelatihan keterampilan.', icon: Users },
    ],
  },
]

export default function Proposal() {
  const navigate = useNavigate()

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-800">Proposal</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pilih jenis proposal. Isi formulir sekali, lalu cetak paket lengkapnya (surat, proposal, RAB, SK panitia).
        </p>
      </div>

      {GRUP.map((g) => (
        <section key={g.judul} className="mb-8">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">{g.judul}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.kartu.map((k) => {
              const Icon = k.icon
              return (
                <button
                  key={k.key}
                  type="button"
                  disabled={!k.aktif}
                  onClick={() => k.aktif && navigate(k.to)}
                  className={`text-left rounded-xl border p-4 flex gap-3 transition-all touch-manipulation ${
                    k.aktif
                      ? 'bg-white border-slate-200 shadow-sm active:scale-[0.99] md:hover:border-emerald-500 md:hover:shadow-md'
                      : 'bg-slate-50 border-dashed border-slate-300 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                      k.aktif ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold text-sm leading-snug ${k.aktif ? 'text-slate-800' : 'text-slate-500'}`}>
                      {k.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{k.desc}</p>
                    {!k.aktif && (
                      <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                        <Lock size={11} /> Segera
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
