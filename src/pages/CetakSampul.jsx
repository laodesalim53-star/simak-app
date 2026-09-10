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

const TEMA_SAMPUL = [
  { id: 'gelombang', label: 'Tema 1 — Gelombang Biru (Elegan Gelap)' },
  { id: 'geometris', label: 'Tema 2 — Geometris Modern' },
  { id: 'alam', label: 'Tema 3 — Alam & Pastel' },
  { id: 'batik', label: 'Tema 4 — Batik Coklat' },
  { id: 'emas', label: 'Tema 5 — Emas Elegan' },
  { id: 'klasik', label: 'Tema 6 — Klasik Merah' },
]

// Membersihkan nilai wilayah dari kata yang sudah terwakili oleh label,
// contoh: label "Kecamatan" + nilai "KECAMATAN ARU UTARA TIMUR" jadi dobel.
function bersihkanWilayah(nilai, tipe) {
  if (!nilai) return nilai
  let teks = String(nilai).trim()
  if (tipe === 'kecamatan') {
    teks = teks.replace(/^kecamatan\s+/i, '')
  } else if (tipe === 'kabupaten') {
    teks = teks
      .replace(/^pemerintah\s+(kabupaten|kota)\s+/i, '')
      .replace(/^(kabupaten|kota)\s+/i, '')
  }
  return teks
}

function SampulGelombang({ logoUrl, judulTampil, subJudul, tahunAnggaran, barisIdentitas, dibuatOleh }) {
  return (
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
  )
}

function SampulGeometris({ logoUrl, judulTampil, subJudul, tahunAnggaran, barisIdentitas, dibuatOleh }) {
  return (
    <div
      className="lembar-cetak print-only bg-white mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ width: '210mm', height: '297mm', padding: '10mm' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '2px solid #1e293b', borderRadius: '10px' }}
      >
        {/* Dekorasi diagonal pojok kiri atas */}
        <div className="absolute top-0 left-0" style={{ width: '260px', height: '260px', overflow: 'hidden', zIndex: 0 }}>
          <div style={{ position: 'absolute', width: '420px', height: '80px', background: '#0f172a', transform: 'rotate(-45deg)', top: '-10px', left: '-140px' }} />
          <div style={{ position: 'absolute', width: '420px', height: '40px', background: '#60a5fa', transform: 'rotate(-45deg)', top: '55px', left: '-160px' }} />
          <div style={{ position: 'absolute', width: '420px', height: '30px', background: '#f59e0b', transform: 'rotate(-45deg)', top: '95px', left: '-175px' }} />
          <div style={{ position: 'absolute', width: '420px', height: '22px', background: '#facc15', transform: 'rotate(-45deg)', top: '128px', left: '-190px' }} />
        </div>

        <div className="flex flex-col items-center text-center px-10 pt-10 pb-4 relative" style={{ zIndex: 1 }}>
          {logoUrl && (
            <div
              className="flex items-center justify-center bg-white rounded-full mb-3 shadow"
              style={{ width: '90px', height: '90px', border: '2px solid #e2e8f0' }}
            >
              <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Laporan Pertanggungjawaban (LPJ)
          </p>
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] text-slate-900 mt-1">
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#f59e0b' }}>
              Tahun Anggaran {tahunAnggaran}
            </p>
          )}
        </div>

        <div className="mt-10 px-10 text-sm relative" style={{ zIndex: 1 }}>
          <table>
            <tbody>
              {barisIdentitas.map((baris) => (
                <tr key={baris.label}>
                  <td className="pr-2 py-1 align-top whitespace-nowrap font-semibold text-slate-900">
                    {baris.label}
                  </td>
                  <td className="pr-2 py-1 align-top text-slate-700">:</td>
                  <td className="py-1 align-top text-slate-800">{baris.nilai || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-1 flex items-end justify-end px-10 pb-10 relative" style={{ zIndex: 1 }}>
          {dibuatOleh && (
            <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
          )}
        </div>

        {/* Dekorasi diagonal pojok kanan bawah */}
        <div className="absolute bottom-0 right-0" style={{ width: '220px', height: '160px', overflow: 'hidden', zIndex: 0 }}>
          <div style={{ position: 'absolute', width: '380px', height: '70px', background: '#facc15', transform: 'rotate(-45deg)', bottom: '-5px', right: '-150px' }} />
          <div style={{ position: 'absolute', width: '380px', height: '90px', background: '#0f172a', transform: 'rotate(-45deg)', bottom: '40px', right: '-170px' }} />
        </div>
      </div>
    </div>
  )
}

function SampulAlam({ logoUrl, judulTampil, subJudul, tahunAnggaran, barisIdentitas, dibuatOleh }) {
  return (
    <div
      className="lembar-cetak print-only mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ width: '210mm', height: '297mm', padding: '10mm', background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 60%)' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '2px solid #86efac', borderRadius: '10px' }}
      >
        {/* Dedaunan dekoratif */}
        <svg className="absolute top-0 left-0" width="180" height="180" viewBox="0 0 180 180" style={{ zIndex: 0, opacity: 0.55 }}>
          <path d="M0,0 C60,10 90,60 60,110 C40,70 10,50 0,0 Z" fill="#86efac" />
          <path d="M0,0 C40,30 50,80 20,130 C10,80 0,40 0,0 Z" fill="#4ade80" />
        </svg>
        <svg className="absolute bottom-0 right-0" width="200" height="200" viewBox="0 0 200 200" style={{ zIndex: 0, opacity: 0.55 }}>
          <path d="M200,200 C140,190 110,140 140,90 C160,130 190,150 200,200 Z" fill="#86efac" />
          <path d="M200,200 C160,170 150,120 180,70 C190,120 200,160 200,200 Z" fill="#4ade80" />
        </svg>

        <div className="flex flex-col items-center text-center px-10 pt-10 pb-4 relative" style={{ zIndex: 1 }}>
          {logoUrl && (
            <div
              className="flex items-center justify-center bg-white rounded-full mb-3 shadow"
              style={{ width: '90px', height: '90px', border: '2px solid #bbf7d0' }}
            >
              <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#166534' }}>
          </p>
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mt-1" style={{ color: '#15803d' }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#65a30d' }}>
              Tahun Anggaran {tahunAnggaran}
            </p>
          )}
        </div>

        <div className="flex-1 flex items-start justify-center px-10 pt-6 relative" style={{ zIndex: 1 }}>
          <div className="bg-white/80 rounded-2xl px-8 py-6 text-sm w-full max-w-[150mm]" style={{ border: '1px solid #bbf7d0' }}>
            <table className="w-full">
              <tbody>
                {barisIdentitas.map((baris) => (
                  <tr key={baris.label}>
                    <td className="pr-2 py-1 align-top whitespace-nowrap font-semibold" style={{ color: '#166534' }}>
                      {baris.label}
                    </td>
                    <td className="pr-2 py-1 align-top text-slate-700">:</td>
                    <td className="py-1 align-top text-slate-800">{baris.nilai || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-10 pb-10 pt-6 text-right relative" style={{ zIndex: 1 }}>
          {dibuatOleh && (
            <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SampulBatik({ logoUrl, judulTampil, subJudul, tahunAnggaran, barisIdentitas, dibuatOleh }) {
  return (
    <div
      className="lembar-cetak print-only mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ width: '210mm', height: '297mm', padding: '10mm', background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 55%)' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '2px solid #c2703d', borderRadius: '10px' }}
      >
        {/* Pita diagonal oranye pojok kiri atas */}
        <div className="absolute top-0 left-0" style={{ width: '260px', height: '90px', overflow: 'hidden', zIndex: 0 }}>
          <div style={{ position: 'absolute', width: '420px', height: '55px', background: 'linear-gradient(90deg,#c2410c,#ea580c)', transform: 'rotate(-40deg)', top: '-20px', left: '-150px' }} />
          <div style={{ position: 'absolute', width: '420px', height: '18px', background: '#fbbf24', transform: 'rotate(-40deg)', top: '25px', left: '-165px' }} />
        </div>

        <div className="flex flex-col items-center text-center px-10 pt-10 pb-4 relative" style={{ zIndex: 1 }}>
          {logoUrl && (
            <div
              className="flex items-center justify-center bg-white rounded-full mb-3 shadow"
              style={{ width: '90px', height: '90px', border: '2px solid #fed7aa' }}
            >
              <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9a3412' }}>
            Laporan Pertanggungjawaban (LPJ)
          </p>
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mt-1" style={{ color: '#9a3412' }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p
              className="text-sm font-bold uppercase mt-1 tracking-wide inline-block px-4 py-1 rounded-full"
              style={{ color: '#ffffff', background: '#c2410c' }}
            >
              Tahun Anggaran {tahunAnggaran}
            </p>
          )}
        </div>

        <div className="mt-10 px-10 text-sm relative" style={{ zIndex: 1 }}>
          <table>
            <tbody>
              {barisIdentitas.map((baris) => (
                <tr key={baris.label} style={{ borderBottom: '1px solid #fed7aa' }}>
                  <td className="pr-2 py-1.5 align-top whitespace-nowrap font-semibold" style={{ color: '#9a3412' }}>
                    {baris.label}
                  </td>
                  <td className="pr-2 py-1.5 align-top text-slate-700">:</td>
                  <td className="py-1.5 align-top text-slate-800">{baris.nilai || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-1 flex items-end justify-end px-10 pb-10 relative" style={{ zIndex: 1 }}>
          {dibuatOleh && (
            <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
          )}
        </div>

        {/* Motif batik dekoratif pojok kanan bawah */}
        <svg className="absolute bottom-0 right-0" width="220" height="220" viewBox="0 0 220 220" style={{ zIndex: 0, opacity: 0.9 }}>
          <path d="M220,220 C160,210 120,160 150,100 C175,150 205,170 220,220 Z" fill="#9a3412" />
          <path d="M220,220 C180,190 170,140 200,90 C210,140 220,180 220,220 Z" fill="#ea580c" />
          <circle cx="185" cy="150" r="4" fill="#fbbf24" />
          <circle cx="200" cy="175" r="3" fill="#fbbf24" />
          <circle cx="170" cy="130" r="3" fill="#fbbf24" />
        </svg>
      </div>
    </div>
  )
}

function SampulEmas({ logoUrl, judulTampil, subJudul, tahunAnggaran, barisIdentitas, dibuatOleh }) {
  return (
    <div
      className="lembar-cetak print-only mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ width: '210mm', height: '297mm', padding: '10mm', background: '#0b1229' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '1px solid #d4af37', borderRadius: '10px' }}
      >
        {/* Pita emas diagonal atas */}
        <div style={{ position: 'absolute', width: '700px', height: '26px', background: 'linear-gradient(90deg,#b8860b,#facc15,#b8860b)', transform: 'rotate(-32deg)', top: '-10px', left: '-120px', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: '700px', height: '10px', background: 'rgba(250,204,21,0.5)', transform: 'rotate(-32deg)', top: '18px', left: '-140px', zIndex: 0 }} />

        <div className="flex flex-col items-center text-center px-10 pt-10 pb-4 relative" style={{ zIndex: 1 }}>
          {logoUrl && (
            <div
              className="flex items-center justify-center bg-white rounded-full mb-3"
              style={{ width: '90px', height: '90px', border: '2px solid #d4af37' }}
            >
              <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#e5c76b' }}>
          </p>
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mt-1" style={{ color: '#facc15' }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide" style={{ color: '#f1f5f9' }}>{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#e5c76b' }}>
              Tahun Anggaran {tahunAnggaran}
            </p>
          )}
        </div>

        <div className="mt-10 px-10 text-sm relative" style={{ zIndex: 1 }}>
          <table>
            <tbody>
              {barisIdentitas.map((baris) => (
                <tr key={baris.label} style={{ borderBottom: '1px solid rgba(212,175,55,0.35)' }}>
                  <td className="pr-2 py-1.5 align-top whitespace-nowrap font-semibold" style={{ color: '#e5c76b' }}>
                    {baris.label}
                  </td>
                  <td className="pr-2 py-1.5 align-top" style={{ color: '#94a3b8' }}>:</td>
                  <td className="py-1.5 align-top" style={{ color: '#f1f5f9' }}>{baris.nilai || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-1 flex items-end justify-end px-10 pb-10 relative" style={{ zIndex: 1 }}>
          {dibuatOleh && (
            <p className="text-sm italic" style={{ color: '#e2e8f0' }}>Dibuat Oleh : {dibuatOleh}</p>
          )}
        </div>

        {/* Pita emas diagonal bawah */}
        <div style={{ position: 'absolute', width: '700px', height: '26px', background: 'linear-gradient(90deg,#b8860b,#facc15,#b8860b)', transform: 'rotate(-32deg)', bottom: '10px', right: '-140px', zIndex: 0 }} />
      </div>
    </div>
  )
}

function SampulKlasik({ logoUrl, judulTampil, subJudul, tahunAnggaran, barisIdentitas, dibuatOleh }) {
  return (
    <div
      className="lembar-cetak print-only bg-white mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ width: '210mm', height: '297mm', padding: '10mm' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '3px double #7f1d1d', borderRadius: '4px' }}
      >
        <div style={{ position: 'absolute', inset: '6px', border: '1px solid #d4af37', borderRadius: '2px', zIndex: 0, pointerEvents: 'none' }} />

        <div className="flex flex-col items-center text-center px-10 pt-10 pb-4 relative" style={{ zIndex: 1 }}>
          {logoUrl && (
            <div
              className="flex items-center justify-center bg-white rounded-full mb-3 shadow"
              style={{ width: '90px', height: '90px', border: '2px solid #7f1d1d' }}
            >
              <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          </p>
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mt-1" style={{ color: '#7f1d1d' }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#b8860b' }}>
              Tahun Anggaran {tahunAnggaran}
            </p>
          )}
        </div>

        <div className="mt-10 px-10 text-sm relative" style={{ zIndex: 1 }}>
          <table>
            <tbody>
              {barisIdentitas.map((baris) => (
                <tr key={baris.label}>
                  <td className="pr-2 py-1 align-top whitespace-nowrap font-semibold" style={{ color: '#7f1d1d' }}>
                    {baris.label}
                  </td>
                  <td className="pr-2 py-1 align-top text-slate-700">:</td>
                  <td className="py-1 align-top text-slate-800">{baris.nilai || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-1 flex items-end justify-end px-10 pb-10 relative" style={{ zIndex: 1 }}>
          {dibuatOleh && (
            <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CetakSampul() {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()

  const [profilSekolah, setProfilSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMuat, setErrorMuat] = useState('')

  const [tema, setTema] = useState('gelombang')
  const [jenisLaporan, setJenisLaporan] = useState(JENIS_LAPORAN_PRESET[3])
  const [judulBebas, setJudulBebas] = useState('')
  const [subJudul, setSubJudul] = useState('BANTUAN OPERASIONAL SEKOLAH (BOS)')
  const [tahunAnggaran, setTahunAnggaran] = useState('')
  const [namaBank, setNamaBank] = useState('')
  const [nomorRekening, setNomorRekening] = useState('')
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
      // Kolom nomor_rekening/no_rekening belum tentu ada di tabel profil_sekolah.
      // Kalau nanti sudah ditambahkan, baris ini otomatis mem-prefill isiannya.
      setNomorRekening(sekolah?.nomor_rekening || sekolah?.no_rekening || '')
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
    { label: 'Kecamatan', nilai: bersihkanWilayah(profilSekolah?.kecamatan, 'kecamatan') },
    { label: 'Kab/Kota', nilai: bersihkanWilayah(profilSekolah?.kabupaten, 'kabupaten') },
    { label: 'Provinsi', nilai: profilSekolah?.provinsi },
    { label: 'Kode Pos', nilai: profilSekolah?.kode_pos },
    { label: 'Nama Bank', nilai: namaBank },
    { label: 'Nomor Rekening', nilai: nomorRekening },
    { label: 'E-mail Sekolah', nilai: emailSekolah },
  ]

  const propsSampul = { logoUrl, judulTampil, subJudul, tahunAnggaran, barisIdentitas, dibuatOleh }

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
            Tema Sampul
            <select
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5 font-medium"
            >
              {TEMA_SAMPUL.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>

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
              Nomor Rekening <span className="text-slate-400">(belum ada di profil sekolah)</span>
              <input
                type="text"
                value={nomorRekening}
                onChange={(e) => setNomorRekening(e.target.value)}
                placeholder="mis. 0123456789"
                className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
              />
            </label>
          </div>

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
          di kotak dialog Print, supaya warna dan dekorasi latar ikut tercetak. Pilih dulu <strong>Tema Sampul</strong>{' '}
          di atas, baru tekan Cetak Sampul.
        </div>
      </div>

      {/* Sampul — hanya tampil sesuai tema yang dipilih */}
      {tema === 'gelombang' && <SampulGelombang {...propsSampul} />}
      {tema === 'geometris' && <SampulGeometris {...propsSampul} />}
      {tema === 'alam' && <SampulAlam {...propsSampul} />}
      {tema === 'batik' && <SampulBatik {...propsSampul} />}
      {tema === 'emas' && <SampulEmas {...propsSampul} />}
      {tema === 'klasik' && <SampulKlasik {...propsSampul} />}

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
