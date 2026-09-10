import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Halaman "Cetak Sampul Laporan" — generik, dipakai untuk membuat halaman
// sampul (cover) berbagai jenis laporan (Laporan Bulanan, Laporan Semester,
// Hasil Ujian, Keuangan, Inventaris, dll).
//
// Mengikuti pola yang sudah berjalan di LaporanSemester.jsx:
//   - Kop/logo/nama sekolah diambil OTOMATIS dari tabel profil_sekolah
//     (query by sekolah_id, logo dari bucket storage 'profil-sekolah')
//   - Toolbar (tombol Kembali & Cetak) diberi class "no-print" supaya
//     hilang saat dicetak
//   - Area sampul diberi class "lembar-cetak print-only" + lebar 210mm,
//     sama seperti LaporanSemester.jsx, supaya konsisten dengan
//     override CSS print-only yang sudah ada di index.css/halaman lain
//   - Field yang bisa diedit dibuat dengan pola input (no-print) + span
//     (only-print) seperti BarisIdentitas, jadi hasil isian ikut tercetak
//
// PENTING — sesuaikan bila perlu:
// Nama kolom profil_sekolah yang dipakai di sini (dinas_pendidikan,
// nama_sekolah, alamat, kecamatan, kabupaten, provinsi, kode_pos,
// logo_path, kepala_sekolah, nip_kepala_sekolah) diambil dari
// LaporanSemester.jsx yang sudah terbukti jalan — kalau ada kolom lain
// yang ingin ditambah (mis. npsn/nss), tinggal tambah di KopSekolah().

const JENIS_LAPORAN_PRESET = [
  'Laporan Bulanan',
  'Laporan Semester',
  'Laporan Hasil Ujian',
  'Laporan Keuangan (BKU)',
  'Laporan Inventaris Sarana & Prasarana',
  'Laporan Kegiatan Sekolah',
  'Lainnya (isi bebas)',
]

export default function CetakSampul() {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()

  const [profilSekolah, setProfilSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMuat, setErrorMuat] = useState('')

  // --- isian sampul (tidak disimpan ke Supabase, hanya untuk cetak) ---
  const [jenisLaporan, setJenisLaporan] = useState(JENIS_LAPORAN_PRESET[0])
  const [judulBebas, setJudulBebas] = useState('')
  const [subJudul, setSubJudul] = useState('') // mis. "Semester Ganjil"
  const [tahunPelajaran, setTahunPelajaran] = useState('')

  const judulTampil = jenisLaporan === 'Lainnya (isi bebas)' ? judulBebas : jenisLaporan

  useEffect(() => {
    async function muat() {
      setLoading(true)
      setErrorMuat('')
      if (!sekolahId) {
        setLoading(false)
        return
      }

      const { data: sekolah, error: sekolahError } = await supabase
        .from('profil_sekolah')
        .select('*')
        .eq('sekolah_id', sekolahId)
        .maybeSingle()

      if (sekolahError) {
        console.error('Gagal memuat profil sekolah:', sekolahError)
        setErrorMuat(
          `Gagal memuat profil sekolah dari database, sehingga kop di sampul ini bisa kosong. ` +
          `Coba muat ulang halaman; kalau masih gagal, periksa console browser (F12). Detail: ${sekolahError.message || ''}`
        )
      }

      setProfilSekolah(sekolah || null)
      if (sekolah?.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(sekolah.logo_path)
        setLogoUrl(pub?.publicUrl || '')
      } else {
        setLogoUrl('')
      }

      setLoading(false)
    }
    muat()
  }, [sekolahId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

  const alamatLengkap = [
    profilSekolah?.alamat,
    profilSekolah?.kecamatan,
    profilSekolah?.kabupaten,
    profilSekolah?.provinsi,
  ]
    .filter(Boolean)
    .join(', ') + (profilSekolah?.kode_pos ? ` ${profilSekolah.kode_pos}` : '')

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar — hilang saat dicetak */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
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
            <Printer size={16} /> Cetak Sampul
          </button>
        </div>

        <div className="max-w-md mx-auto mt-3 grid grid-cols-1 gap-2">
          <label className="text-xs text-slate-500">
            Jenis Laporan
            <select
              value={jenisLaporan}
              onChange={(e) => setJenisLaporan(e.target.value)}
              className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
            >
              {JENIS_LAPORAN_PRESET.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </label>

          {jenisLaporan === 'Lainnya (isi bebas)' && (
            <label className="text-xs text-slate-500">
              Judul Laporan
              <input
                type="text"
                value={judulBebas}
                onChange={(e) => setJudulBebas(e.target.value)}
                placeholder="mis. Laporan Kegiatan Perpustakaan"
                className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
              />
            </label>
          )}

          <label className="text-xs text-slate-500">
            Sub Judul / Periode <span className="text-slate-400">(opsional)</span>
            <input
              type="text"
              value={subJudul}
              onChange={(e) => setSubJudul(e.target.value)}
              placeholder="mis. Semester Ganjil"
              className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
            />
          </label>

          <label className="text-xs text-slate-500">
            Tahun Pelajaran
            <input
              type="text"
              value={tahunPelajaran}
              onChange={(e) => setTahunPelajaran(e.target.value)}
              placeholder="mis. 2026/2027"
              className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
            />
          </label>
        </div>

        {errorMuat && (
          <div className="no-print mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 max-w-md mx-auto">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{errorMuat}</span>
          </div>
        )}
      </div>

      {/* Sampul — hanya tampil saat print (sama seperti LaporanSemester.jsx) */}
      <div
        className="lembar-cetak print-only bg-white mx-auto my-6 p-8 shadow-sm flex flex-col"
        style={{ width: '210mm', height: '297mm' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center text-center px-10">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="w-32 h-32 object-contain mb-8" />
          )}

          <h1 className="text-2xl font-bold uppercase tracking-wide leading-snug mb-2">
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-lg font-medium uppercase mb-2">{subJudul}</h2>
          )}
          {tahunPelajaran && (
            <p className="text-base mt-1">Tahun Pelajaran {tahunPelajaran}</p>
          )}
        </div>

        <div className="text-center pb-6">
          <p className="text-lg font-bold uppercase">{profilSekolah?.nama_sekolah || 'Nama Sekolah'}</p>
          {profilSekolah?.dinas_pendidikan && (
            <p className="text-sm uppercase">{profilSekolah.dinas_pendidikan}</p>
          )}
          <p className="text-sm mt-1">{alamatLengkap}</p>
        </div>
      </div>

      <style>{`
        .only-print { display: none; }

        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .only-print { display: inline !important; }

          .lembar-cetak.print-only {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }

        @media screen {
          .lembar-cetak.print-only {
            display: flex !important;
          }
        }
        @page {
          size: A4 portrait;
          margin: 0mm;
        }
      `}</style>
    </div>
  )
}
