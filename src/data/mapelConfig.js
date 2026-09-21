import {
  BookOpen,
  Calculator,
  Languages,
  Heart,
  Landmark,
  Sprout,
  FlaskConical,
  Globe,
  Dumbbell,
  Palette,
  MapPin,
  Monitor,
  Scissors,
} from 'lucide-react'

// =====================================================================
// JENJANG & KELAS
// =====================================================================
export const JENJANG = {
  SD: { label: 'SD', nama: 'Sekolah Dasar', kelas: [1, 2, 3, 4, 5, 6] },
  SMP: { label: 'SMP', nama: 'Sekolah Menengah Pertama', kelas: [1, 2, 3] },
}

// =====================================================================
// MATA PELAJARAN
// =====================================================================
export const MAPEL = {
  agama: { judul: 'Pendidikan Agama dan Budi Pekerti', icon: Heart, warna: 'emerald' },
  pancasila: { judul: 'Pendidikan Pancasila', icon: Landmark, warna: 'rose' },
  indonesia: { judul: 'Bahasa Indonesia', icon: BookOpen, warna: 'blue' },
  matematika: { judul: 'Matematika', icon: Calculator, warna: 'indigo' },
  ipas: { judul: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', icon: Sprout, warna: 'green' },
  ipa: { judul: 'IPA', icon: FlaskConical, warna: 'teal' },
  ips: { judul: 'IPS', icon: Globe, warna: 'amber' },
  inggris: { judul: 'Bahasa Inggris', icon: Languages, warna: 'sky' },
  pjok: { judul: 'PJOK', icon: Dumbbell, warna: 'orange' },
  seni: { judul: 'Seni dan Budaya', icon: Palette, warna: 'purple' },
  mulok: { judul: 'Muatan Lokal', icon: MapPin, warna: 'violet' },
  informatika: { judul: 'Informatika', icon: Monitor, warna: 'cyan' },
  prakarya: { judul: 'Prakarya', icon: Scissors, warna: 'slate' },
}

// Daftar mapel per jenjang dan kelas. Untuk menambah/mengurangi mapel,
// cukup ubah larik di bawah ini.
const MAPEL_SD_BAWAH = ['agama', 'pancasila', 'indonesia', 'matematika', 'pjok', 'seni', 'mulok']
const MAPEL_SD_ATAS = ['agama', 'pancasila', 'indonesia', 'matematika', 'ipas', 'inggris', 'pjok', 'seni', 'mulok']
const MAPEL_SMP = ['agama', 'pancasila', 'indonesia', 'matematika', 'ipa', 'ips', 'inggris', 'informatika', 'pjok', 'seni', 'prakarya']

export const MAPEL_KELAS = {
  SD: { 1: MAPEL_SD_BAWAH, 2: MAPEL_SD_BAWAH, 3: MAPEL_SD_ATAS, 4: MAPEL_SD_ATAS, 5: MAPEL_SD_ATAS, 6: MAPEL_SD_ATAS },
  SMP: { 1: MAPEL_SMP, 2: MAPEL_SMP, 3: MAPEL_SMP },
}

// Palet warna kartu — pola sama dengan GudangSK.jsx.
export const PALET_WARNA = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100', hoverBorder: 'hover:border-blue-400' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100', hoverBorder: 'hover:border-emerald-400' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100', hoverBorder: 'hover:border-purple-400' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100', hoverBorder: 'hover:border-amber-400' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-100', hoverBorder: 'hover:border-rose-400' },
  cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-100', hoverBorder: 'hover:border-cyan-400' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100', hoverBorder: 'hover:border-indigo-400' },
  teal: { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-100', hoverBorder: 'hover:border-teal-400' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100', hoverBorder: 'hover:border-orange-400' },
  sky: { bg: 'bg-sky-50', icon: 'text-sky-600', border: 'border-sky-100', hoverBorder: 'hover:border-sky-400' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-100', hoverBorder: 'hover:border-green-400' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100', hoverBorder: 'hover:border-violet-400' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', border: 'border-slate-200', hoverBorder: 'hover:border-slate-400' },
}

export const kunciMateri = (jenjang, kelas, idMapel) => `${jenjang}-${kelas}-${idMapel}`
