import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Halaman cetak "DATA TANGGUNGAN KELUARGA" — kolektif semua guru di satu
// sekolah sekaligus. Mengikuti pola LaporanKepangkatanGuru.jsx /
// LaporanNominatifGuru.jsx (kop surat, toolbar no-print, lembar-cetak A4,
// blok tanda tangan, Kepala Sekolah selalu di baris paling atas).
//
// UPDATE: kolom "Jumlah Anak" sekarang diisi dari kolom baru
// `jumlah_anak_tanggungan` (integer, nullable) di tabel guru. Jalankan
// migration 001_add_jumlah_anak_tanggungan.sql lebih dulu, dan tambahkan
// field-nya di form Guru.jsx (lihat GURU_JSX_PANDUAN.md) supaya nilainya
// bisa diisi & tersimpan dari sana.
export default function LaporanTanggunganKeluarga() {
  const navigate = useNavigate()
  const { sekolahId: sekolahIdSaya } = useAuth()
  const [profilSekolah, setProfilSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [daftarGuru, setDaftarGuru] = useState([])
  const [loading, setLoading] = useState(true)

  // Kepala Sekolah dideteksi dari kolom tugas_tambahan / jenis_ptk, sama
  // seperti pola yang sudah dipakai di laporan-laporan guru lainnya.
  function isKepalaSekolah(g) {
    const jabatan = `${g.tugas_tambahan || ''} ${g.jenis_ptk || ''}`.toLowerCase()
    return jabatan.includes('kepala sekolah')
  }

  function urutkanGuru(daftar) {
    return [...daftar].sort((a, b) => {
      const aKS = isKepalaSekolah(a) ? 0 : 1
      const bKS = isKepalaSekolah(b) ? 0 : 1
      if (aKS !== bKS) return aKS - bKS

      return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '')
    })
  }

  useEffect(() => {
    async function muat() {
      setLoading(true)

      const sekolahId = sekolahIdSaya
      if (!sekolahId) {
        setLoading(false)
        return
      }

      const [{ data: sekolah }, { data: guru }] = await Promise.all([
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
        supabase
          .from('guru')
          .select(
            'id, nip, nama_lengkap, status_perkawinan, nama_pasangan, nip_pasangan, pekerjaan_pasangan, jumlah_anak_tanggungan, tugas_tambahan, jenis_ptk, status'
          )
          .eq('sekolah_id', sekolahId)
          .eq('status', 'aktif'),
      ])

      setProfilSekolah(sekolah || null)

      // logo_path adalah path di Supabase Storage, bukan URL lengkap — harus
      // dikonversi lewat getPublicUrl() dulu, sama seperti pola di laporan
      // guru lainnya (bucket 'profil-sekolah').
      if (sekolah?.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(sekolah.logo_path)
        setLogoUrl(pub?.publicUrl || '')
      } else {
        setLogoUrl('')
      }

      setDaftarGuru(urutkanGuru(guru || []))
      setLoading(false)
    }
    muat()
  }, [sekolahIdSaya])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar — hilang saat dicetak */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Printer size={16} /> Cetak
        </button>
      </div>

      <div className="lembar-cetak bg-white mx-auto my-6 p-8 shadow-sm" style={{ width: '297mm', minHeight: '210mm' }}>
        {/* Kop Surat */}
        <div className="flex items-center gap-4 border-b-4 border-black pb-3 mb-4">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain shrink-0" />
          )}
          <div className="text-center flex-1">
            <p className="text-sm font-medium uppercase">
              {profilSekolah?.dinas_pendidikan || 'PEMERINTAH DAERAH'}
            </p>
            <p className="text-lg font-bold uppercase">{profilSekolah?.nama_sekolah || 'Nama Sekolah'}</p>
            <p className="text-xs">
              {[profilSekolah?.alamat, profilSekolah?.kecamatan, profilSekolah?.kabupaten, profilSekolah?.provinsi]
                .filter(Boolean)
                .join(', ')}
              {profilSekolah?.kode_pos ? ` ${profilSekolah.kode_pos}` : ''}
            </p>
            {(profilSekolah?.telepon || profilSekolah?.email || profilSekolah?.website) && (
              <p className="text-xs">
                {[profilSekolah?.telepon, profilSekolah?.email, profilSekolah?.website].filter(Boolean).join(' | ')}
              </p>
            )}
          </div>
        </div>

        <h1 className="text-center font-bold text-base uppercase underline mb-4">
          Data Tanggungan Keluarga Guru/Pegawai
        </h1>

        <div className="text-xs mb-4 grid grid-cols-[120px_1fr] gap-y-0.5 max-w-xs">
          <span>Sekolah</span>
          <span>: {profilSekolah?.nama_sekolah || '—'}</span>
          <span>Kecamatan</span>
          <span>: {profilSekolah?.kecamatan || '—'}</span>
          <span>Kabupaten</span>
          <span>: {profilSekolah?.kabupaten || '—'}</span>
        </div>

        <table className="w-full text-[10px] border-collapse border border-black">
          <thead>
            <tr className="text-center">
              <th className="border border-black px-1 py-1 w-6">No</th>
              <th className="border border-black px-1 py-1">Nama Lengkap</th>
              <th className="border border-black px-1 py-1">NIP</th>
              <th className="border border-black px-1 py-1">Status Perkawinan</th>
              <th className="border border-black px-1 py-1">Nama Suami/Istri</th>
              <th className="border border-black px-1 py-1">NIP Suami/Istri</th>
              <th className="border border-black px-1 py-1">Pekerjaan Suami/Istri</th>
              <th className="border border-black px-1 py-1 w-14">Jumlah Anak</th>
              <th className="border border-black px-1 py-1">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {daftarGuru.length === 0 ? (
              <tr>
                <td colSpan={9} className="border border-black text-center py-4 text-slate-400">
                  Belum ada data guru untuk sekolah ini.
                </td>
              </tr>
            ) : (
              daftarGuru.map((g, i) => (
                <tr key={g.id}>
                  <td className="border border-black px-1 py-1 text-center">{i + 1}</td>
                  <td className="border border-black px-1 py-1">{g.nama_lengkap || '—'}</td>
                  <td className="border border-black px-1 py-1">{g.nip || '—'}</td>
                  <td className="border border-black px-1 py-1">{g.status_perkawinan || '—'}</td>
                  <td className="border border-black px-1 py-1">{g.nama_pasangan || '—'}</td>
                  <td className="border border-black px-1 py-1">{g.nip_pasangan || '—'}</td>
                  <td className="border border-black px-1 py-1">{g.pekerjaan_pasangan || '—'}</td>
                  <td className="border border-black px-1 py-1 text-center">
                    {g.jumlah_anak_tanggungan ?? '—'}
                  </td>
                  <td className="border border-black px-1 py-1"></td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Blok tanda tangan kepala sekolah */}
        <div className="flex justify-end mt-10">
          <div className="text-center text-xs w-64">
            <p>
              {profilSekolah?.tempat_ttd || profilSekolah?.kecamatan || '............'},{' '}
              {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className="mt-1">Mengetahui,</p>
            <p>Kepala Sekolah</p>
            <div className="h-16" />
            <p className="font-semibold underline">{profilSekolah?.kepala_sekolah || '............................'}</p>
            <p>NIP. {profilSekolah?.nip_kepala_sekolah || '............................'}</p>
          </div>
        </div>
      </div>

      {/* CSS cetak — mengikuti pola @page A4 landscape yang sudah dipakai di
          laporan guru lainnya, karena tabel ini juga lebar (9 kolom). */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
      `}</style>
    </div>
  )
}
