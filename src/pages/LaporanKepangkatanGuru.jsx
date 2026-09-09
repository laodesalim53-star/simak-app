import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { Printer, Loader2, Award } from 'lucide-react'

// Halaman cetak "Data Kepangkatan Guru/Pegawai" — bagian dari Pusat Laporan
// Guru (lihat PusatLaporanGuru.jsx, id: 'kepangkatan', path: '/laporan-kepangkatan-guru').
// Mengikuti pola LaporanNominatifGuru.jsx / LaporanBiodataGuru.jsx: ambil data
// guru + profil sekolah dari Supabase, tampilkan tabel di layar, dan sediakan
// tombol Cetak yang memicu window.print() dengan blok ".print-only" yang
// tampil hanya saat mode cetak (sudah ada aturannya di src/index.css).
//
// CATATAN PENTING (mohon disesuaikan dulu sebelum dipakai):
// 1. Nama kolom kepala sekolah di tabel profil_sekolah saya asumsikan
//    `kepala_sekolah` dan `nip_kepala_sekolah`. Kalau nama kolom aslinya
//    beda (mis. `nama_kepsek`), tinggal ganti 2 baris di bagian fetch di
//    bawah.
// 2. Kolom "gaji pokok" yang disebut di deskripsi kartu PusatLaporanGuru
//    BELUM ada di tabel `guru` saat ini (lihat emptyForm di Guru.jsx) —
//    jadi kolom ini sengaja tidak ditampilkan. Kalau memang mau ada, perlu
//    ditambah dulu kolom baru di tabel guru + form Guru.jsx.
export default function LaporanKepangkatanGuru() {
  const { sekolahId } = useAuth()
  const [guru, setGuru] = useState([])
  const [sekolah, setSekolah] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function muatData() {
      if (!sekolahId) {
        setLoading(false)
        return
      }
      setLoading(true)

      const [{ data: dataGuru, error: errGuru }, { data: dataSekolah, error: errSekolah }] = await Promise.all([
        supabase
          .from('guru')
          .select('*')
          .eq('sekolah_id', sekolahId)
          .eq('status', 'aktif')
          .order('nama_lengkap'),
        supabase
          .from('profil_sekolah')
          .select('*')
          .eq('sekolah_id', sekolahId)
          .maybeSingle(),
      ])

      if (errGuru) alert('Gagal memuat data guru: ' + errGuru.message)
      if (errSekolah) alert('Gagal memuat profil sekolah: ' + errSekolah.message)

      setGuru(dataGuru || [])
      setSekolah(dataSekolah || null)
      setLoading(false)
    }
    muatData()
  }, [sekolahId])

  function formatTanggal(tgl) {
    if (!tgl) return '-'
    try {
      return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return tgl
    }
  }

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Layout
      title="Data Kepangkatan Guru/Pegawai"
      subtitle="Riwayat SK pengangkatan pertama, SK terakhir, dan pangkat/golongan setiap guru"
      actions={
        <button className="btn-primary" onClick={() => window.print()} disabled={loading || guru.length === 0}>
          <Printer size={16} /> Cetak
        </button>
      }
    >
      {/* ===== Tampilan layar ===== */}
      <div className="card overflow-x-auto no-print">
        <table className="table-shell">
          <thead>
            <tr className="border-b-2 border-blue-600/20">
              <th>No</th>
              <th>Nama Lengkap</th>
              <th>NIP</th>
              <th>Pangkat / Golongan</th>
              <th>SK CPNS</th>
              <th>Tgl CPNS</th>
              <th>SK Pengangkatan</th>
              <th>TMT Pengangkatan</th>
              <th>Lembaga Pengangkatan</th>
              <th>TMT PNS</th>
              <th>Karpeg</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={11} className="text-center py-8 text-ink-700/50">
                  <Loader2 size={18} className="animate-spin inline mr-2" /> Memuat data...
                </td>
              </tr>
            )}
            {!loading && guru.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-8 text-ink-700/50">Belum ada data guru aktif.</td>
              </tr>
            )}
            {!loading &&
              guru.map((g, i) => (
                <tr key={g.id} className="hover:bg-blue-600/[0.03] transition-colors">
                  <td>{i + 1}</td>
                  <td className="font-medium">{g.nama_lengkap}</td>
                  <td className="font-mono text-xs">{g.nip || '-'}</td>
                  <td>{g.pangkat_golongan || '-'}</td>
                  <td>{g.sk_cpns || '-'}</td>
                  <td>{formatTanggal(g.tanggal_cpns)}</td>
                  <td>{g.sk_pengangkatan || '-'}</td>
                  <td>{formatTanggal(g.tmt_pengangkatan)}</td>
                  <td>{g.lembaga_pengangkatan || '-'}</td>
                  <td>{formatTanggal(g.tmt_pns)}</td>
                  <td>{g.karpeg || '-'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ===== Blok khusus cetak (mengikuti pola .print-only di index.css) ===== */}
      <div className="print-only">
        <div className="text-center mb-4 border-b-2 border-black pb-2">
          <p className="font-bold text-base uppercase">{sekolah?.nama_sekolah || 'Nama Sekolah'}</p>
          <p className="text-xs">{sekolah?.alamat || ''}{sekolah?.kabupaten ? `, ${sekolah.kabupaten}` : ''}</p>
        </div>

        <p className="text-center font-bold underline mb-4 uppercase text-sm">
          Data Kepangkatan Guru/Pegawai
        </p>

        <table className="w-full text-xs border-collapse border border-black">
          <thead>
            <tr className="border border-black">
              <th className="border border-black p-1">No</th>
              <th className="border border-black p-1">Nama Lengkap</th>
              <th className="border border-black p-1">NIP</th>
              <th className="border border-black p-1">Pangkat/Gol.</th>
              <th className="border border-black p-1">SK CPNS</th>
              <th className="border border-black p-1">Tgl CPNS</th>
              <th className="border border-black p-1">SK Pengangkatan</th>
              <th className="border border-black p-1">TMT Pengangkatan</th>
              <th className="border border-black p-1">Lembaga Pengangkatan</th>
              <th className="border border-black p-1">TMT PNS</th>
              <th className="border border-black p-1">Karpeg</th>
            </tr>
          </thead>
          <tbody>
            {guru.map((g, i) => (
              <tr key={g.id} className="border border-black">
                <td className="border border-black p-1 text-center">{i + 1}</td>
                <td className="border border-black p-1">{g.nama_lengkap}</td>
                <td className="border border-black p-1">{g.nip || '-'}</td>
                <td className="border border-black p-1">{g.pangkat_golongan || '-'}</td>
                <td className="border border-black p-1">{g.sk_cpns || '-'}</td>
                <td className="border border-black p-1">{formatTanggal(g.tanggal_cpns)}</td>
                <td className="border border-black p-1">{g.sk_pengangkatan || '-'}</td>
                <td className="border border-black p-1">{formatTanggal(g.tmt_pengangkatan)}</td>
                <td className="border border-black p-1">{g.lembaga_pengangkatan || '-'}</td>
                <td className="border border-black p-1">{formatTanggal(g.tmt_pns)}</td>
                <td className="border border-black p-1">{g.karpeg || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-10">
          <div className="text-center text-xs w-56">
            <p>{sekolah?.kabupaten || '...........'}, {tanggalCetak}</p>
            <p>Kepala Sekolah,</p>
            <div className="h-16" />
            <p className="font-bold underline">{sekolah?.kepala_sekolah || '...............................'}</p>
            <p>NIP. {sekolah?.nip_kepala_sekolah || '-'}</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
