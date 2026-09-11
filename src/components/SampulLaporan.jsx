import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, AlertTriangle, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

export const JENIS_LAPORAN_PRESET = [
  'Laporan Bulanan',
  'Laporan Semester',
  'Laporan Hasil Ujian',
  'Daftar Calon Peserta Ujian (8355)',
  'Laporan Pertanggungjawaban (LPJ) Penggunaan Dana BOS',
  'Laporan Keuangan (BKU)',
  'Laporan Inventaris Sarana & Prasarana',
  'Laporan Kegiatan Sekolah',
  'Lainnya (isi bebas)',
]

export const TEMA_SAMPUL = [
  { id: 'gelombang', label: 'Tema 1 — Gelombang Biru (Elegan Gelap)' },
  { id: 'geometris', label: 'Tema 2 — Geometris Modern' },
  { id: 'alam', label: 'Tema 3 — Alam & Pastel' },
  { id: 'batik', label: 'Tema 4 — Batik Coklat' },
  { id: 'emas', label: 'Tema 5 — Emas Elegan' },
  { id: 'klasik', label: 'Tema 6 — Klasik Merah' },
  { id: 'navy-zigzag', label: 'Tema 7 — Navy Zigzag Emas' },
  { id: 'daun-hijau', label: 'Tema 8 — Daun Hijau Elegan' },
  { id: 'ombak-biru', label: 'Tema 9 — Ombak Biru Klasik' },
  { id: 'merah-ornamen', label: 'Tema 10 — Merah Ornamen Emas' },
]

// Dua pola tata letak sampul yang tersedia. Pola tema warna (TEMA_SAMPUL) tetap
// sama untuk keduanya — pola ini hanya menentukan SUSUNAN kontennya.
export const POLA_SAMPUL = [
  { id: 'dekoratif', label: 'Dekoratif (Logo Bulat + Tabel Identitas)' },
  { id: 'kop-resmi', label: 'Kop Resmi (Kop 3 Baris + Logo Besar)' },
]

// Dimensi halaman A4 sesuai orientasi yang dipilih user.
function dimensiHalaman(orientasi) {
  return orientasi === 'landscape'
    ? { width: '297mm', height: '210mm' }
    : { width: '210mm', height: '297mm' }
}

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

// Memisahkan judul laporan yang punya kode di dalam kurung di akhir, misal
// "Daftar Calon Peserta Ujian (8355)" -> judul "Daftar Calon Peserta Ujian"
// dan kode "8355". Dipakai oleh pola Kop Resmi supaya kode tampil di baris
// tersendiri persis seperti pada kop dinas resmi.
function pisahJudulKode(teks) {
  if (!teks) return { judul: teks || '', kode: '' }
  const cocok = String(teks).match(/^(.*?)\s*\(([^()]+)\)\s*$/)
  if (cocok) return { judul: cocok[1].trim(), kode: cocok[2].trim() }
  return { judul: String(teks).trim(), kode: '' }
}

// Hiasan sudut berbentuk sulur/flourish emas, dipakai ulang di beberapa tema
// (tinggal dibalik/diputar lewat prop `style` untuk tiap posisi sudut).
function HiasanSudut({ warna = '#d4af37', style }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: '64px', height: '64px', ...style }}>
      <path
        d="M5,5 C5,40 20,70 60,80 C40,75 20,60 15,35 C25,55 45,65 70,68 C45,55 30,35 25,10 C40,30 60,40 85,42"
        fill="none"
        stroke={warna}
        strokeWidth="2"
      />
      <circle cx="85" cy="42" r="3" fill={warna} />
      <circle cx="60" cy="80" r="3" fill={warna} />
    </svg>
  )
}

function SampulGelombang({ logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  return (
    <div
      className="lembar-cetak print-only bg-white mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: '10mm' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '2px solid #1e293b', borderRadius: '10px' }}
      >
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
              {labelTahun} {tahunAnggaran}
            </p>
          )}
        </div>

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

        <div className="flex-1 flex items-end justify-end px-10 pb-10 relative" style={{ zIndex: 2 }}>
          {dibuatOleh && (
            <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
          )}
        </div>

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

function SampulGeometris({ logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  return (
    <div
      className="lembar-cetak print-only bg-white mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: '10mm' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '2px solid #1e293b', borderRadius: '10px' }}
      >
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
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] text-slate-900 mt-1">
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#f59e0b' }}>
              {labelTahun} {tahunAnggaran}
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

        <div className="absolute bottom-0 right-0" style={{ width: '220px', height: '160px', overflow: 'hidden', zIndex: 0 }}>
          <div style={{ position: 'absolute', width: '380px', height: '70px', background: '#facc15', transform: 'rotate(-45deg)', bottom: '-5px', right: '-150px' }} />
          <div style={{ position: 'absolute', width: '380px', height: '90px', background: '#0f172a', transform: 'rotate(-45deg)', bottom: '40px', right: '-170px' }} />
        </div>
      </div>
    </div>
  )
}

function SampulAlam({ logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  return (
    <div
      className="lembar-cetak print-only mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: '10mm', background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 60%)' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '2px solid #86efac', borderRadius: '10px' }}
      >
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
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mt-1" style={{ color: '#15803d' }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#65a30d' }}>
              {labelTahun} {tahunAnggaran}
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

function SampulBatik({ logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  return (
    <div
      className="lembar-cetak print-only mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: '10mm', background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 55%)' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '2px solid #c2703d', borderRadius: '10px' }}
      >
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
              {labelTahun} {tahunAnggaran}
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

function SampulEmas({ logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  return (
    <div
      className="lembar-cetak print-only mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: '10mm', background: '#0b1229' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '1px solid #d4af37', borderRadius: '10px' }}
      >
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
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mt-1" style={{ color: '#facc15' }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide" style={{ color: '#f1f5f9' }}>{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#e5c76b' }}>
              {labelTahun} {tahunAnggaran}
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

        <div style={{ position: 'absolute', width: '700px', height: '26px', background: 'linear-gradient(90deg,#b8860b,#facc15,#b8860b)', transform: 'rotate(-32deg)', bottom: '10px', right: '-140px', zIndex: 0 }} />
      </div>
    </div>
  )
}

function SampulKlasik({ logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  return (
    <div
      className="lembar-cetak print-only bg-white mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: '10mm' }}
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
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mt-1" style={{ color: '#7f1d1d' }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#b8860b' }}>
              {labelTahun} {tahunAnggaran}
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

// ---------------------------------------------------------------------------
// TEMA 7 — Navy Zigzag Emas: pita zigzag navy-emas di atas, dua sudut segitiga
// navy di bawah dihubungkan garis emas, aksen titik emas di pojok kanan atas.
// ---------------------------------------------------------------------------
function SampulNavyZigzag({ logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  return (
    <div
      className="lembar-cetak print-only bg-white mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: '10mm' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '2px solid #d4af37', borderRadius: '6px' }}
      >
        {/* titik-titik emas dekoratif pojok kanan atas */}
        <div
          className="absolute top-0 right-0"
          style={{
            width: '150px',
            height: '150px',
            backgroundImage: 'radial-gradient(#d4af37 1.5px, transparent 1.5px)',
            backgroundSize: '14px 14px',
            opacity: 0.35,
            zIndex: 0,
          }}
        />

        {/* pita zigzag navy di atas */}
        <svg viewBox="0 0 800 130" preserveAspectRatio="none" className="w-full" style={{ height: '78px', zIndex: 1 }}>
          <polygon points="0,0 800,0 800,60 650,110 550,55 450,110 350,55 250,110 150,55 50,110 0,60" fill="#0f172a" />
          <polygon points="0,58 800,58 800,66 650,116 550,61 450,116 350,61 250,116 150,61 50,116 0,66" fill="#d4af37" />
        </svg>

        <div className="flex flex-col items-center text-center px-10 -mt-2 pb-4 relative" style={{ zIndex: 2 }}>
          {logoUrl && (
            <div
              className="flex items-center justify-center bg-white rounded-full mb-3 shadow"
              style={{ width: '86px', height: '86px', border: '2px solid #d4af37' }}
            >
              <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '66px', height: '66px' }} />
            </div>
          )}
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mt-1" style={{ color: '#1e3a8a' }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <>
              <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#b8860b' }}>
                {labelTahun} {tahunAnggaran}
              </p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span style={{ height: '1px', width: '36px', background: '#d4af37' }} />
                <span style={{ color: '#d4af37', fontSize: '10px' }}>✦</span>
                <span style={{ height: '1px', width: '36px', background: '#d4af37' }} />
              </div>
            </>
          )}
        </div>

        <div className="mt-8 px-10 text-sm relative" style={{ zIndex: 2 }}>
          <table>
            <tbody>
              {barisIdentitas.map((baris) => (
                <tr key={baris.label}>
                  <td className="pr-2 py-1 align-top whitespace-nowrap font-semibold" style={{ color: '#1e3a8a' }}>
                    {baris.label}
                  </td>
                  <td className="pr-2 py-1 align-top text-slate-700">:</td>
                  <td className="py-1 align-top text-slate-800">{baris.nilai || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-1 flex items-end justify-end px-10 pb-16 relative" style={{ zIndex: 2 }}>
          {dibuatOleh && (
            <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
          )}
        </div>

        {/* dua segitiga navy di sudut bawah, dihubungkan garis emas */}
        <svg viewBox="0 0 800 120" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full" style={{ height: '70px', zIndex: 1 }}>
          <polygon points="0,120 0,20 180,120" fill="#0f172a" />
          <polygon points="800,120 800,20 620,120" fill="#0f172a" />
          <polyline points="0,16 180,116 620,116 800,16" fill="none" stroke="#d4af37" strokeWidth="3" />
        </svg>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TEMA 8 — Daun Hijau Elegan: bingkai ganda tipis emas+hijau, sulur daun hijau
// di pojok kiri bawah, watercolor hijau samar di latar.
// ---------------------------------------------------------------------------
function SampulDaunHijau({ logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  return (
    <div
      className="lembar-cetak print-only mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: '10mm', background: '#fffdf7' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden p-2"
        style={{ border: '1.5px solid #d4af37', borderRadius: '4px' }}
      >
        <div
          className="flex-1 flex flex-col relative overflow-hidden"
          style={{ border: '1px solid #86efac', borderRadius: '2px' }}
        >
          {/* watercolor hijau samar pojok kiri atas */}
          <div
            className="absolute top-0 left-0"
            style={{ width: '220px', height: '220px', background: 'radial-gradient(circle at top left, #bbf7d0, transparent 70%)', opacity: 0.6, zIndex: 0 }}
          />

          <div className="flex flex-col items-center text-center px-10 pt-10 pb-2 relative" style={{ zIndex: 1 }}>
            {logoUrl && (
              <div
                className="flex items-center justify-center bg-white rounded-full mb-3 shadow"
                style={{ width: '86px', height: '86px', border: '2px solid #86efac' }}
              >
                <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '66px', height: '66px' }} />
              </div>
            )}
            <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mt-1" style={{ color: '#166534' }}>
              {judulTampil || 'Judul Laporan'}
            </h1>
            {subJudul && (
              <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
            )}
            {tahunAnggaran && (
              <>
                <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#b8860b' }}>
                  {labelTahun} {tahunAnggaran}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span style={{ height: '1px', width: '36px', background: '#d4af37' }} />
                  <span style={{ color: '#166534', fontSize: '10px' }}>❦</span>
                  <span style={{ height: '1px', width: '36px', background: '#d4af37' }} />
                </div>
              </>
            )}
          </div>

          <div className="flex-1 flex items-start justify-center px-10 pt-4 relative" style={{ zIndex: 1 }}>
            <table>
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

          <div className="px-10 pb-8 text-right relative" style={{ zIndex: 1 }}>
            {dibuatOleh && (
              <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
            )}
          </div>

          {/* sulur daun di pojok kiri bawah */}
          <svg className="absolute bottom-0 left-0" width="200" height="260" viewBox="0 0 200 260" style={{ zIndex: 0, opacity: 0.9 }}>
            <path d="M0,260 C10,200 40,170 30,120 C60,160 55,200 40,260 Z" fill="#4ade80" />
            <path d="M0,260 C25,210 60,190 55,140 C85,175 75,215 55,260 Z" fill="#86efac" opacity="0.85" />
            <path d="M0,260 C40,225 75,215 80,170 C105,200 95,235 70,260 Z" fill="#4ade80" opacity="0.7" />
            <circle cx="70" cy="150" r="2.5" fill="#d4af37" />
            <circle cx="95" cy="180" r="2" fill="#d4af37" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TEMA 9 — Ombak Biru Klasik: bingkai tipis biru bersudut bulat, tanpa header
// gelap, ombak biru lembut di dasar halaman.
// ---------------------------------------------------------------------------
function SampulOmbakBiru({ logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  return (
    <div
      className="lembar-cetak print-only bg-white mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: '10mm' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '1.5px solid #2563eb', borderRadius: '16px' }}
      >
        <div className="flex flex-col items-center text-center px-10 pt-10 pb-2 relative" style={{ zIndex: 2 }}>
          {logoUrl && (
            <div
              className="flex items-center justify-center bg-white rounded-full mb-3 shadow"
              style={{ width: '90px', height: '90px', border: '2px solid #2563eb' }}
            >
              <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
            </div>
          )}
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mt-1" style={{ color: '#1d4ed8' }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p
              className="text-sm font-bold uppercase mt-2 tracking-wide inline-block px-4 py-1 rounded-full"
              style={{ color: '#1d4ed8', border: '1px solid #93c5fd' }}
            >
              {labelTahun} {tahunAnggaran}
            </p>
          )}
        </div>

        <div className="mt-10 px-10 text-sm relative" style={{ zIndex: 2 }}>
          <table>
            <tbody>
              {barisIdentitas.map((baris) => (
                <tr key={baris.label}>
                  <td className="pr-2 py-1 align-top whitespace-nowrap font-semibold" style={{ color: '#1d4ed8' }}>
                    {baris.label}
                  </td>
                  <td className="pr-2 py-1 align-top text-slate-700">:</td>
                  <td className="py-1 align-top text-slate-800">{baris.nilai || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-1 flex items-end justify-end px-10 pb-24 relative" style={{ zIndex: 2 }}>
          {dibuatOleh && (
            <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
          )}
        </div>

        <svg
          viewBox="0 0 800 220"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full"
          style={{ height: '130px', zIndex: 1 }}
        >
          <path d="M0,110 C150,180 350,40 800,120 L800,220 L0,220 Z" fill="#bfdbfe" opacity="0.7" />
          <path d="M0,140 C200,90 500,190 800,100 L800,220 L0,220 Z" fill="#60a5fa" opacity="0.8" />
          <path d="M0,170 C250,130 550,210 800,150 L800,220 L0,220 Z" fill="#1d4ed8" />
        </svg>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TEMA 10 — Merah Ornamen Emas: bingkai ganda merah marun + emas, hiasan
// sulur emas di keempat sudut, latar krem bertekstur marmer samar.
// ---------------------------------------------------------------------------
function SampulMerahOrnamen({ logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  return (
    <div
      className="lembar-cetak print-only mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{
        ...dimensiHalaman(orientasi),
        padding: '10mm',
        background:
          'radial-gradient(circle at 20% 30%, rgba(0,0,0,0.03), transparent 40%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.03), transparent 40%), #fdfaf5',
      }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ border: '3px double #7f1d1d', borderRadius: '4px' }}
      >
        <div style={{ position: 'absolute', inset: '6px', border: '1px solid #d4af37', borderRadius: '2px', zIndex: 0, pointerEvents: 'none' }} />

        <HiasanSudut warna="#d4af37" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1 }} />
        <HiasanSudut warna="#d4af37" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1, transform: 'scaleX(-1)' }} />
        <HiasanSudut warna="#d4af37" style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 1, transform: 'scaleY(-1)' }} />
        <HiasanSudut warna="#d4af37" style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 1, transform: 'scale(-1,-1)' }} />

        <div className="flex flex-col items-center text-center px-10 pt-12 pb-4 relative" style={{ zIndex: 2 }}>
          {logoUrl && (
            <div
              className="flex items-center justify-center bg-white rounded-full mb-3 shadow"
              style={{ width: '90px', height: '90px', border: '2px solid #7f1d1d' }}
            >
              <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
            </div>
          )}
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mt-1" style={{ color: '#7f1d1d' }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: '#b8860b' }}>
              {labelTahun} {tahunAnggaran}
            </p>
          )}
        </div>

        <div className="mt-10 px-14 text-sm relative" style={{ zIndex: 2 }}>
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

        <div className="flex-1 flex items-end justify-end px-14 pb-14 relative" style={{ zIndex: 2 }}>
          {dibuatOleh && (
            <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
          )}
        </div>
      </div>
    </div>
  )
}

const KOMPONEN_TEMA = {
  gelombang: SampulGelombang,
  geometris: SampulGeometris,
  alam: SampulAlam,
  batik: SampulBatik,
  emas: SampulEmas,
  klasik: SampulKlasik,
  'navy-zigzag': SampulNavyZigzag,
  'daun-hijau': SampulDaunHijau,
  'ombak-biru': SampulOmbakBiru,
  'merah-ornamen': SampulMerahOrnamen,
}

// ---------------------------------------------------------------------------
// POLA KOP RESMI — satu komponen yang dipakai bersama oleh ke-10 tema warna.
// Susunannya meniru kop dinas resmi (3 baris kop rata tengah → judul laporan
// → logo besar di tengah → "TAHUN PELAJARAN/ANGGARAN ..." di bawah), persis
// pola pada dokumen contoh yang diunggah. Warna & bingkai tiap baris ikut
// ciri khas temanya masing-masing supaya tetap terasa "bertema".
// ---------------------------------------------------------------------------
const GAYA_KOP_RESMI = {
  gelombang: { background: '#ffffff', border: '2px solid #1e293b', kopColor: '#0f172a', judulColor: '#1e293b', aksenColor: '#38bdf8' },
  geometris: { background: '#ffffff', border: '2px solid #1e293b', kopColor: '#0f172a', judulColor: '#0f172a', aksenColor: '#f59e0b' },
  alam: { background: '#f7fdf9', border: '2px solid #86efac', kopColor: '#14532d', judulColor: '#15803d', aksenColor: '#4ade80' },
  batik: { background: '#fffaf5', border: '2px solid #c2703d', kopColor: '#7c2d12', judulColor: '#9a3412', aksenColor: '#ea580c' },
  emas: { background: '#0b1229', border: '1px solid #d4af37', kopColor: '#f1f5f9', judulColor: '#facc15', aksenColor: '#d4af37', gelap: true },
  klasik: { background: '#ffffff', border: '3px double #7f1d1d', border2: '1px solid #d4af37', kopColor: '#7f1d1d', judulColor: '#7f1d1d', aksenColor: '#b8860b' },
  'navy-zigzag': { background: '#ffffff', border: '2px solid #d4af37', kopColor: '#0f172a', judulColor: '#1e3a8a', aksenColor: '#d4af37' },
  'daun-hijau': { background: '#fffdf7', border: '1.5px solid #d4af37', border2: '1px solid #86efac', kopColor: '#14532d', judulColor: '#166534', aksenColor: '#d4af37' },
  'ombak-biru': { background: '#ffffff', border: '1.5px solid #2563eb', kopColor: '#1e3a8a', judulColor: '#1d4ed8', aksenColor: '#2563eb' },
  'merah-ornamen': { background: '#fdfaf5', border: '3px double #7f1d1d', border2: '1px solid #d4af37', kopColor: '#7f1d1d', judulColor: '#7f1d1d', aksenColor: '#d4af37' },
}

function SampulKopResmi({ tema, logoUrl, kopBaris1, kopBaris2, kopBaris3, judulUtama, kodeLaporan, subJudulEkstra, labelTahun, tahunAnggaran, orientasi }) {
  const gaya = GAYA_KOP_RESMI[tema] || GAYA_KOP_RESMI.gelombang
  return (
    <div
      className="lembar-cetak print-only mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: '10mm', background: gaya.background }}
    >
      <div
        className="flex-1 flex flex-col items-center relative overflow-hidden px-10 py-10"
        style={{ border: gaya.border, borderRadius: '4px' }}
      >
        {gaya.border2 && (
          <div style={{ position: 'absolute', inset: '6px', border: gaya.border2, borderRadius: '2px', zIndex: 0, pointerEvents: 'none' }} />
        )}

        {/* Kop 3 baris — Pemerintah Kab/Kota, Nama Dinas, Nama Sekolah */}
        <div className="text-center relative" style={{ zIndex: 1 }}>
          <p className="font-bold uppercase leading-snug" style={{ color: gaya.kopColor, fontSize: '15px' }}>{kopBaris1 || 'PEMERINTAH KABUPATEN ...'}</p>
          <p className="font-bold uppercase leading-snug" style={{ color: gaya.kopColor, fontSize: '15px' }}>{kopBaris2 || 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}</p>
          <p className="font-bold uppercase leading-snug" style={{ color: gaya.kopColor, fontSize: '15px' }}>{kopBaris3 || 'NAMA SEKOLAH'}</p>
        </div>

        {/* Judul laporan + kode (mis. nomor 8355) */}
        <div className="text-center mt-7 relative" style={{ zIndex: 1 }}>
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm] mx-auto" style={{ color: gaya.judulColor }}>
            {judulUtama || 'Judul Laporan'}
          </h1>
          {kodeLaporan && (
            <p className="text-lg font-bold mt-1" style={{ color: gaya.judulColor }}>( {kodeLaporan} )</p>
          )}
          {subJudulEkstra && (
            <p className="text-sm font-semibold uppercase mt-2 tracking-wide" style={{ color: gaya.kopColor }}>{subJudulEkstra}</p>
          )}
        </div>

        {/* Logo besar di tengah halaman */}
        <div className="flex-1 flex items-center justify-center relative w-full" style={{ zIndex: 1 }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '150px', height: '150px' }} />
          ) : (
            <div
              className="flex items-center justify-center text-xs"
              style={{ width: '150px', height: '150px', border: `2px dashed ${gaya.aksenColor}`, borderRadius: '8px', color: gaya.kopColor, opacity: 0.6 }}
            >
              Logo
            </div>
          )}
        </div>

        {/* Tahun pelajaran/anggaran di bagian bawah */}
        <div className="text-center relative pb-2" style={{ zIndex: 1 }}>
          <div className="mx-auto mb-2" style={{ width: '70px', height: '2px', background: gaya.aksenColor }} />
          <p className="font-bold uppercase" style={{ color: gaya.kopColor, fontSize: '14px' }}>
            {labelTahun} {tahunAnggaran || '.... / ....'}
          </p>
        </div>
      </div>
    </div>
  )
}

// Skala tampilan pratinjau di layar (bukan ukuran cetak — cetak tetap A4 penuh).
const SKALA_PRATINJAU = 0.62

/**
 * Komponen sampul laporan yang reusable.
 *
 * Props:
 * - jenisLaporanAwal   : jenis laporan default saat halaman dibuka (default: preset ke-4 / LPJ BOS)
 * - kunciJenisLaporan  : true = dropdown "Jenis Laporan" disembunyikan, jenis laporan tetap
 *                        (dipakai oleh halaman cabang seperti Sampul Semester / Sampul 8355)
 * - subJudulAwal       : isi awal field Sub Judul
 * - labelTahun         : label yang tampil di depan tahun pada sampul, default 'Tahun Anggaran'
 *                        (mis. 'Tahun Ajaran' untuk laporan semester/8355)
 * - tampilkanBank      : true/false — tampilkan baris Nama Bank & Nomor Rekening di identitas sekolah
 *                        (hanya berlaku untuk Pola Sampul Dekoratif)
 * - tampilkanKelas     : true/false — tampilkan field & baris "Kelas" (dipakai untuk sampul 8355 Kelas 6)
 * - kelasAwal          : isi awal field Kelas (mis. 'VI')
 * - labelHalaman       : judul kecil di toolbar (opsional, untuk membedakan halaman di UI)
 * - polaSampulAwal     : 'dekoratif' (default) atau 'kop-resmi' — pola sampul saat halaman dibuka
 */
export default function SampulLaporan({
  jenisLaporanAwal = JENIS_LAPORAN_PRESET[4],
  kunciJenisLaporan = false,
  subJudulAwal = '',
  labelTahun = 'Tahun Anggaran',
  tampilkanBank = true,
  tampilkanKelas = false,
  kelasAwal = '',
  labelHalaman = 'Cetak Sampul Laporan',
  polaSampulAwal = 'dekoratif',
}) {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()

  const [profilSekolah, setProfilSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMuat, setErrorMuat] = useState('')

  const [polaSampul, setPolaSampul] = useState(polaSampulAwal)
  const [tema, setTema] = useState('gelombang')
  const [orientasi, setOrientasi] = useState('portrait') // 'portrait' | 'landscape'
  const [jenisLaporan, setJenisLaporan] = useState(jenisLaporanAwal)
  const [judulBebas, setJudulBebas] = useState('')
  const [subJudul, setSubJudul] = useState(subJudulAwal)
  const [tahunAnggaran, setTahunAnggaran] = useState('')
  const [namaBank, setNamaBank] = useState('')
  const [nomorRekening, setNomorRekening] = useState('')
  const [desaKelurahan, setDesaKelurahan] = useState('')
  const [emailSekolah, setEmailSekolah] = useState('')
  const [dibuatOleh, setDibuatOleh] = useState('')
  const [kelas, setKelas] = useState(kelasAwal)
  const [jenisWilayah, setJenisWilayah] = useState('Kabupaten') // 'Kabupaten' | 'Kota' — khusus Kop Resmi
  const [namaDinas, setNamaDinas] = useState('DINAS PENDIDIKAN DAN KEBUDAYAAN') // khusus Kop Resmi

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
      setNomorRekening(sekolah?.nomor_rekening || sekolah?.no_rekening || '')
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

  const kabupatenBersih = bersihkanWilayah(profilSekolah?.kabupaten, 'kabupaten')

  const barisIdentitas = [
    { label: 'Nama Sekolah', nilai: profilSekolah?.nama_sekolah },
    { label: 'NPSN', nilai: profilSekolah?.npsn },
    { label: 'Alamat', nilai: profilSekolah?.alamat },
    { label: 'Desa/Kelurahan', nilai: desaKelurahan },
    { label: 'Kecamatan', nilai: bersihkanWilayah(profilSekolah?.kecamatan, 'kecamatan') },
    { label: 'Kab/Kota', nilai: kabupatenBersih },
    { label: 'Provinsi', nilai: profilSekolah?.provinsi },
    { label: 'Kode Pos', nilai: profilSekolah?.kode_pos },
    ...(tampilkanKelas ? [{ label: 'Kelas', nilai: kelas }] : []),
    ...(tampilkanBank
      ? [
          { label: 'Nama Bank', nilai: namaBank },
          { label: 'Nomor Rekening', nilai: nomorRekening },
        ]
      : []),
    { label: 'E-mail Sekolah', nilai: emailSekolah },
  ]

  // Data khusus pola Kop Resmi: kop 3 baris + judul/kode terpisah.
  const { judul: judulKopResmi, kode: kodeKopResmi } = pisahJudulKode(judulTampil)
  const propsKopResmi = {
    tema,
    logoUrl,
    kopBaris1: `PEMERINTAH ${jenisWilayah.toUpperCase()}${kabupatenBersih ? ` ${kabupatenBersih.toUpperCase()}` : ''}`,
    kopBaris2: namaDinas,
    kopBaris3: profilSekolah?.nama_sekolah || '',
    judulUtama: judulKopResmi,
    kodeLaporan: kodeKopResmi,
    subJudulEkstra: subJudul,
    labelTahun,
    tahunAnggaran,
    orientasi,
  }

  const propsSampul = { logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }
  const KomponenAktif = KOMPONEN_TEMA[tema] || SampulGelombang
  const dimensi = dimensiHalaman(orientasi)

  return (
    <div className="min-h-screen bg-slate-100 md:grid md:grid-cols-[380px_1fr] tata-letak-sampul">
      {/* ======================= PANEL FORM — KIRI ======================= */}
      <div className="no-print bg-white border-r border-slate-200 md:h-screen md:overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <span className="text-sm font-semibold text-slate-700">{labelHalaman}</span>
        </div>

        <div className="px-4 py-4">
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700 mb-4"
          >
            <Printer size={16} /> Cetak Sampul
          </button>

          <div className="grid grid-cols-1 gap-3">
            <div className="text-xs text-slate-500">
              Orientasi Kertas
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientasi('portrait')}
                  className={`flex items-center justify-center gap-1.5 text-sm rounded px-2 py-1.5 border font-medium transition-colors ${
                    orientasi === 'portrait'
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <RectangleVertical size={15} /> Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setOrientasi('landscape')}
                  className={`flex items-center justify-center gap-1.5 text-sm rounded px-2 py-1.5 border font-medium transition-colors ${
                    orientasi === 'landscape'
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <RectangleHorizontal size={15} /> Landscape
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Pola Sampul
              <div className="mt-1 grid grid-cols-2 gap-2">
                {POLA_SAMPUL.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPolaSampul(p.id)}
                    className={`text-sm rounded px-2 py-1.5 border font-medium transition-colors ${
                      polaSampul === p.id
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.id === 'dekoratif' ? 'Dekoratif' : 'Kop Resmi'}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {polaSampul === 'dekoratif'
                  ? 'Logo bulat kecil + tabel identitas sekolah lengkap.'
                  : 'Kop dinas 3 baris + logo besar di tengah, seperti kop surat resmi.'}
              </p>
            </div>

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

            {kunciJenisLaporan ? (
              <div className="text-xs text-slate-500">
                Jenis Laporan
                <div className="mt-0.5 w-full text-sm border border-slate-200 bg-slate-50 rounded px-2 py-1.5 text-slate-700 font-medium">
                  {jenisLaporanAwal}
                </div>
              </div>
            ) : (
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
            )}

            {!kunciJenisLaporan && jenisLaporan === 'Lainnya (isi bebas)' && (
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

            {polaSampul === 'kop-resmi' && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">
                  Jenis Wilayah
                  <select
                    value={jenisWilayah}
                    onChange={(e) => setJenisWilayah(e.target.value)}
                    className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                  >
                    <option value="Kabupaten">Kabupaten</option>
                    <option value="Kota">Kota</option>
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  Nama Dinas
                  <input
                    type="text"
                    value={namaDinas}
                    onChange={(e) => setNamaDinas(e.target.value)}
                    placeholder="mis. DINAS PENDIDIKAN DAN KEBUDAYAAN"
                    className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                  />
                </label>
              </div>
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

            {tampilkanKelas && (
              <label className="text-xs text-slate-500">
                Kelas
                <input
                  type="text"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  placeholder="mis. VI"
                  className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                />
              </label>
            )}

            <label className="text-xs text-slate-500">
              {labelTahun}
              <input
                type="text"
                value={tahunAnggaran}
                onChange={(e) => setTahunAnggaran(e.target.value)}
                placeholder="mis. 2026 / 2027"
                className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
              />
            </label>

            {polaSampul === 'dekoratif' && (
              <>
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

                {tampilkanBank && (
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
                )}

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
              </>
            )}
          </div>

          {errorMuat && (
            <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMuat}</span>
            </div>
          )}

          <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Saat mencetak, pastikan opsi <strong>"Background graphics" / "Grafis latar belakang"</strong> dicentang
            di kotak dialog Print, supaya warna dan dekorasi latar ikut tercetak. Pilih dulu <strong>Orientasi</strong>,{' '}
            <strong>Pola Sampul</strong>, dan <strong>Tema Sampul</strong> di atas, baru tekan Cetak Sampul.
          </div>
        </div>
      </div>

      {/* ===================== AREA PRATINJAU — KANAN ===================== */}
      <div className="area-pratinjau no-print md:h-screen md:overflow-y-auto bg-slate-200 flex items-start justify-center p-6 md:p-10">
        <div
          className="pratinjau-bungkus shadow-lg"
          style={{
            width: `calc(${dimensi.width} * ${SKALA_PRATINJAU})`,
            height: `calc(${dimensi.height} * ${SKALA_PRATINJAU})`,
            overflow: 'hidden',
          }}
        >
          <div
            className="pratinjau-skala"
            style={{
              width: dimensi.width,
              height: dimensi.height,
              transform: `scale(${SKALA_PRATINJAU})`,
              transformOrigin: 'top left',
            }}
          >
            {polaSampul === 'kop-resmi' ? (
              <SampulKopResmi {...propsKopResmi} />
            ) : (
              <KomponenAktif {...propsSampul} />
            )}
          </div>
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
          .tata-letak-sampul { display: block !important; }
          .area-pratinjau { display: block !important; padding: 0 !important; background: white !important; height: auto !important; overflow: visible !important; }
          .pratinjau-bungkus { width: auto !important; height: auto !important; overflow: visible !important; box-shadow: none !important; }
          .pratinjau-skala { width: auto !important; height: auto !important; transform: none !important; }

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
          size: A4 ${orientasi};
          margin: 0mm;
        }
      `}</style>
    </div>
  )
}
