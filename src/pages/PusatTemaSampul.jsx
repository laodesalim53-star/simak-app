import {
  Waves,
  Shapes,
  Trees,
  Sparkles,
  Award,
  BookOpen,
  Palette,
} from 'lucide-react'

export const DAFTAR_TEMA_SAMPUL = [
  {
    id: 'gelombang',
    judul: 'Tema Gelombang',
    deskripsi: 'Desain modern dengan corak gelombang dinamis. Cocok untuk laporan formal dan resmi.',
    icon: Waves,
    path: '/cetak-sampul?tema=gelombang',
    siap: true,
  },
  {
    id: 'geometris',
    judul: 'Tema Geometris',
    deskripsi: 'Tampilan minimalis dengan garis dan bentuk geometris tegas untuk kesan profesional.',
    icon: Shapes,
    path: '/cetak-sampul?tema=geometris',
    siap: true,
  },
  {
    id: 'alam',
    judul: 'Tema Alam',
    deskripsi: 'Nuansa bernuansa hijau dan ornamen dedaunan yang segar dan ramah lingkungan.',
    icon: Trees,
    path: '/cetak-sampul?tema=alam',
    siap: true,
  },
  {
    id: 'batik',
    judul: 'Tema Batik',
    deskripsi: 'Sentuhan ornamen tradisional khas kebudayaan Indonesia untuk laporan formal.',
    icon: Palette,
    path: '/cetak-sampul?tema=batik',
    siap: true,
  },
  {
    id: 'emas',
    judul: 'Tema Emas',
    deskripsi: 'Kesan elegan dan premium dengan kombinasi warna emas dan bingkai mewah.',
    icon: Award,
    path: '/cetak-sampul?tema=emas',
    siap: true,
  },
  {
    id: 'klasik',
    judul: 'Tema Klasik',
    deskripsi: 'Tampilan korporat konvensional yang rapi, simpel, dan bersih.',
    icon: BookOpen,
    path: '/cetak-sampul?tema=klasik',
    siap: true,
  },
  {
    id: 'minimalis-modern',
    judul: 'Tema Minimalis Modern',
    deskripsi: 'Tata letak bersih dengan tipografi modern untuk laporan berkala.',
    icon: Sparkles,
    path: '/cetak-sampul?tema=minimalis-modern',
    siap: false, // Set false jika tema ini belum selesai dibuat
  },
]
