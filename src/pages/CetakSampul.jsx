import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const JENIS_LAPORAN_PRESET = [
  'Laporan Bulanan',
  'Laporan Semester',
  'Laporan Hasil Ujian',
  'Laporan Pertanggungjawaban (LPJ) Penggunaan Dana BOS',
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

  const [jenisLaporan, setJenisLaporan] = useState(JENIS_LAPORAN_PRESET[3])
  const [judulBebas, setJudulBebas] = useState('')
  const [subJudul, setSubJudul] = useState('BANTUAN OPERASIONAL SEKOLAH (BOS)')
  const [tahunAnggaran, setTahunAnggaran] = useState('')
  const [namaBank, setNamaBank] = useState('')
  const [desaKelurahan, setDesaKelurahan] = useState('')
  const [emailSekolah, setEmailSekolah] = useState('')
  const [dibuatOleh, setDibuatOleh] = useState('')

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
      setNamaBank(sekolah?.nama_bank || '')
      // Kolom desa_kelurahan/desa belum tentu ada di tabel profil_sekolah.
      // Kalau nanti sudah ditambahkan, baris ini otomatis mem-prefill isiannya.
      setDesaKelurahan(sekolah?.desa_kelurahan || sekolah?.desa || '')
      setEmailSekolah(sekolah?.email || sekolah?.website || '')
      setDibuatOleh(sekolah?.kepala_sekolah || '')

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

  const barisIdentitas = [
    { label: 'Nama Sekolah', nilai: profilSekolah?.nama_sekolah },
    { label: 'NPSN', nilai: profilSekolah?.npsn },
    { label: 'Alamat', nilai: profilSekolah?.alamat },
    { label: 'Desa/Kelurahan', nilai: desaKelurahan },
    { label: 'Kecamatan', nilai: profilSekolah?.kecamatan },
    { label: 'Kab/Kota', nilai: profilSekolah?.kabupaten },
    { label: 'Provinsi', nilai: profilSekolah?.provinsi },
    { label: 'Kode Pos', nilai: profilSekolah?.kode_pos },
    { label: 'Nama Bank', nilai: namaBank },
    { label: 'E-mail Sekolah', nilai: emailSekolah },
  ]

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
            Sub Judul <span className="text-slate-400">(opsional)</span>
            <input
              type="text"
              value={subJudul}
              onChange={(e) => setSubJudul(e.target.value)}
              placeholder="mis. BANTUAN OPERASIONAL SEKOLAH (BOS)"
              className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
            />
          </label>

          <label className="text-xs text-slate-500">
            Tahun Anggaran
            <input
              type="text"
              value={tahunAnggaran}
              onChange={(e) => setTahunAnggaran(e.target.value)}
              placeholder="mis. 2026"
              className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
            />
          </label>

          <label className="text-xs text-slate-500">
            Desa/Kelurahan <span className="text-slate-400">(belum ada di profil sekolah)</span>
            <input
              type="text"
              value={desaKelurahan}
              onChange={(e) => setDesaKelurahan(e.target.value)}
              placeholder="mis. Waria"
              className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-500">
              Nama Bank
              <input
                type="text"
                value={namaBank}
                onChange={(e) => setNamaBank(e.target.value)}
                placeholder="mis. Bank Pembangunan Daerah Maluku"
                className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
              />
            </label>
            <label className="text-xs text-slate-500">
              E-mail Sekolah
              <input
                type="text"
                value={emailSekolah}
                onChange={(e) => setEmailSekolah(e.target.value)}
                placeholder="opsional"
                className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
              />
            </label>
          </div>

          <label className="text-xs text-slate-500">
            Dibuat Oleh
            <input
              type="text"
              value={dibuatOleh}
              onChange={(e) => setDibuatOleh(e.target.value)}
              placeholder="mis. LD.SALIM, S.Pd"
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

        <div className="no-print mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-md mx-auto">
          Saat mencetak, pastikan opsi <strong>"Background graphics" / "Grafis latar belakang"</strong> dicentang
          di kotak dialog Print, supaya banner hitam dan gelombang birunya ikut tercetak.
        </div>
      </div>

      {/* Sampul — hanya tampil saat print */}
      <div
        className="lembar-cetak print-only bg-white mx-auto my-6 flex flex-col relative overflow-hidden"
        style={{ width: '210mm', height: '297mm', padding: '10mm' }}
      >
        <div
          className="flex-1 flex flex-col relative overflow-hidden"
          style={{ border: '2px solid #1e293b', borderRadius: '10px' }}
        >
          {/* Banner atas — hitam gradasi */}
          <div
            className="flex flex-col items-center text-center px-10 pt-8 pb-7"
            style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
          >
            {logoUrl && (
              <div
                className="flex items-center justify-center bg-white rounded-full mb-3 shadow"
                style={{ width: '90px', height: '90px' }}
              >
                <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
              </div>
            )}

            <h1
              className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa)' }}
            >
              {judulTampil || 'Judul Laporan'}
            </h1>
            {subJudul && (
              <h2 className="text-sm font-bold uppercase mt-2 tracking-wide" style={{ color: '#fb923c' }}>
                {subJudul}
              </h2>
            )}
            {tahunAnggaran && (
              <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#facc15' }}>
                Tahun Anggaran {tahunAnggaran}
              </p>
            )}
          </div>

          {/* Identitas sekolah — rata kiri, label berwarna */}
          <div className="mt-14 px-10 text-sm">
            <table>
              <tbody>
                {barisIdentitas.map((baris) => (
                  <tr key={baris.label}>
                    <td className="pr-2 py-1 align-top whitespace-nowrap font-semibold" style={{ color: '#dc2626' }}>
                      {baris.label}
                    </td>
                    <td className="pr-2 py-1 align-top text-slate-700">:</td>
                    <td className="py-1 align-top text-slate-800">{baris.nilai || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dibuat Oleh — kanan bawah, di atas gelombang */}
          <div className="flex-1 flex items-end justify-end px-10 pb-10 relative" style={{ zIndex: 2 }}>
            {dibuatOleh && (
              <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
            )}
          </div>

          {/* Gelombang biru dekoratif */}
          <svg
            viewBox="0 0 800 160"
            preserveAspectRatio="none"
            className="absolute bottom-0 left-0 w-full"
            style={{ height: '90px', zIndex: 1 }}
          >
            <path d="M0,80 C150,140 350,10 800,90 L800,160 L0,160 Z" fill="#0369a1" opacity="0.55" />
            <path d="M0,110 C200,60 500,150 800,70 L800,160 L0,160 Z" fill="#0284c7" opacity="0.75" />
            <path d="M0,130 C250,90 550,160 800,110 L800,160 L0,160 Z" fill="#38bdf8" />
          </svg>
        </div>
      </div>

      <style>{`
        .only-print { display: none; }

        html, body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
