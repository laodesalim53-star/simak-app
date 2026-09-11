import { Link } from 'react-router-dom'
import {
  GraduationCap,
  FileText,
  ClipboardList,
  BookOpen,
  Award,
  Lock,
} from 'lucide-react'
import Layout from '../components/Layout'

// Halaman "bagan" / hub untuk semua dokumen akademik siswa: Ijazah, Surat
// Keterangan Lulus, Nilai Asesmen, Rapor Siswa, dan Sertifikat & Penghargaan.
// Mengikuti pola PusatLaporanGuru.jsx — satu kartu ditambahkan di sini setiap
// kali satu halaman/fitur baru selesai dibuat, supaya Sidebar cukup punya 1
// link ke halaman ini saja.
//
// PENTING: berbeda dari PusatLaporanGuru (kepegawaian, admin-only), kelima
// fitur di hub ini bisa diakses guru juga. Route-route di bawah dibuat TANPA
// adminOnly di router, jadi guru tetap bisa membukanya seperti sebelumnya.
//
// Cara mengaktifkan fitur baru: ubah `siap: false` menjadi `siap: true` dan
// isi `path` dengan route halamannya di array `daftarArsip` di bawah.
const daftarArsip = [
  {
    id: 'ijazah',
    judul: 'Ijazah',
    deskripsi: 'Cetak dan kelola data ijazah siswa, termasuk nomor seri dan tanggal penerbitan.',
    icon: GraduationCap,
    path: '/ijazah',
    siap: true,
  },
  {
    id: 'skl',
    judul: 'Surat Keterangan Lulus',
    deskripsi: 'Buat dan cetak Surat Keterangan Lulus (SKL) sebagai pengganti sementara sebelum ijazah terbit.',
    icon: FileText,
    path: '/surat-keterangan-lulus',
    siap: true,
  },
  {
    id: 'nilai-asesmen',
    judul: 'Nilai Asesmen',
    deskripsi: 'Rekap hasil asesmen siswa per mata pelajaran dan per periode penilaian.',
    icon: ClipboardList,
    path: '/nilai-asesmen',
    siap: true,
  },
  {
    id: 'rapor-siswa',
    judul: 'Rapor Siswa',
    deskripsi: 'Akses dan cetak rapor siswa per kelas dan semester.',
    icon: BookOpen,
    path: '/rapor-siswa',
    siap: true,
  },
  {
    id: 'sertifikat-penghargaan',
    judul: 'Sertifikat & Penghargaan',
    deskripsi: 'Kelola dan cetak sertifikat serta penghargaan yang pernah diterima siswa.',
    icon: Award,
    path: '/sertifikat-penghargaan',
    siap: true,
  },
]

export default function ArsipAkademikSiswa() {
  return (
    <Layout
      title="Arsip Akademik Siswa"
      subtitle="Pilih jenis dokumen akademik siswa yang ingin dikelola atau dicetak."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {daftarArsip.map((arsip) => {
          const Icon = arsip.icon
          const Isi = () => (
            <>
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
                  arsip.siap ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon size={20} />
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${arsip.siap ? 'text-slate-800' : 'text-slate-400'}`}>
                {arsip.judul}
              </h3>
              <p className={`text-xs leading-relaxed ${arsip.siap ? 'text-slate-500' : 'text-slate-400'}`}>
                {arsip.deskripsi}
              </p>
              {!arsip.siap && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full mt-3">
                  <Lock size={10} /> Segera Hadir
                </span>
              )}
            </>
          )

          return arsip.siap ? (
            <Link
              key={arsip.id}
              to={arsip.path}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <Isi />
            </Link>
          ) : (
            <div
              key={arsip.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 opacity-70 cursor-not-allowed"
            >
              <Isi />
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
