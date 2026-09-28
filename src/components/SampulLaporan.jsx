import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, AlertTriangle, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { useIdentitasInstansi } from '../lib/identitasInstansi'
import { useAuth } from '../lib/AuthContext'

// Daftar jenis laporan untuk tenant SEKOLAH. Dipakai CetakSampulHub.jsx lewat
// indeks. Untuk kantor/puskesmas, daftar jenis laporan ada di
// CONFIG_INSTANSI (src/lib/identitasInstansi.js). Jaga agar daftar sekolah di
// sana tetap sama dengan yang ini.
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
  { id: 'kunci-hijau', label: 'Tema 11 — Hijau Kunci Sudut (Landscape)' },
  { id: 'pita-emas-hijau', label: 'Tema 12 — Hijau Pita Emas Diagonal (Landscape)' },
  { id: 'blok-geometris-hijau', label: 'Tema 13 — Hijau Blok Geometris (Landscape)' },
  { id: 'floral-hijau', label: 'Tema 14 — Hijau Floral Elegan (Landscape)' },
  { id: 'kotak-emas-hijau', label: 'Tema 15 — Kotak Emas & Pita Hijau (Landscape)' },
  { id: 'ombak-hijau', label: 'Tema 16 — Hijau Ombak Mengalir (Landscape)' },
  // Tema 17-19: sampul per jenis instansi (logo mengikuti tenant yang login).
  { id: 'kesehatan-hijau', label: 'Tema 17 — Kesehatan Hijau (Puskesmas)' },
  { id: 'pendidikan-biru', label: 'Tema 18 — Pendidikan Biru Emas (Sekolah)' },
  { id: 'kua-hijau-emas', label: 'Tema 19 — Mihrab Hijau Emas (KUA)' },
]

// Tema 17-19 dikaitkan ke jenis bingkainya. Dipakai untuk menentukan tema
// awal per tenant dan untuk menggambar bingkai di pola Kop Resmi.
const JENIS_BINGKAI_TENANT = {
  'kesehatan-hijau': 'kesehatan',
  'pendidikan-biru': 'pendidikan',
  'kua-hijau-emas': 'kua',
}

// Dua pola tata letak sampul yang tersedia. Pola tema warna (TEMA_SAMPUL) tetap
// sama untuk keduanya — pola ini hanya menentukan SUSUNAN kontennya.
export const POLA_SAMPUL = [
  { id: 'dekoratif', label: 'Dekoratif (Logo Bulat + Tabel Identitas)' },
  { id: 'kop-resmi', label: 'Kop Resmi (Kop 3 Baris + Logo Besar)' },
]

// Pilihan label yang tampil di depan field tahun pada sampul. Bisa dipilih
// bebas dari form — tidak lagi terkunci ke satu jenis laporan saja, supaya
// laporan data siswa (Tahun Ajaran/Tahun Pelajaran) dan laporan keuangan
// (Tahun Anggaran) bisa dipakai bergantian dari halaman yang sama.
export const PILIHAN_LABEL_TAHUN = ['Tahun Anggaran', 'Tahun Ajaran', 'Tahun Pelajaran']

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

// Hiasan sudut motif "kunci" bergaya bingkai ukir (dipakai tema 11 & 15,
// terinspirasi motif kotak-kotak emas/hijau bersusun di pojok bingkai).
function HiasanKunciSudut({ warna = '#166534', style }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: '54px', height: '54px', ...style }}>
      <path d="M4,4 H46 V14 H14 V46 H4 Z" fill="none" stroke={warna} strokeWidth="4" />
      <path d="M18,18 H34 V26 H26 V34 H18 Z" fill="none" stroke={warna} strokeWidth="3" />
    </svg>
  )
}

// Pola titik-titik dekoratif di pojok (dipakai tema 13 & 16).
function PolaTitikHijau({ warna = '#166534', style }) {
  return (
    <div
      style={{
        position: 'absolute',
        backgroundImage: `radial-gradient(${warna} 1.5px, transparent 1.5px)`,
        backgroundSize: '13px 13px',
        opacity: 0.4,
        zIndex: 0,
        ...style,
      }}
    />
  )
}

// Pita diagonal hijau-emas di satu pojok (dipakai tema 12 & 15). `style`
// menentukan posisi & ukuran kotak pembungkus; dibalik lewat transform
// scaleX/scaleY dari pemanggil untuk dapat pojok yang berlawanan.
function PitaDiagonalHijauEmas({ style }) {
  return (
    <div style={{ position: 'absolute', overflow: 'hidden', zIndex: 0, ...style }}>
      <div
        style={{
          position: 'absolute',
          width: '420px',
          height: '42px',
          background: 'linear-gradient(90deg,#14532d,#4ade80,#14532d)',
          transform: 'rotate(45deg)',
          top: '4px',
          right: '-140px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '420px',
          height: '9px',
          background: '#d4af37',
          transform: 'rotate(45deg)',
          top: '46px',
          right: '-150px',
        }}
      />
    </div>
  )
}

// Tabel identitas instansi. Saat orientasi landscape, daftar dipecah jadi
// 2 kolom berdampingan supaya memanfaatkan lebar halaman (bukan cuma satu
// kolom sempit di tengah kertas lebar) — ini alasan utama tema 11-16 lebih
// pas dipakai landscape dibanding tema-tema lama.
function TabelIdentitasDua({ barisIdentitas, warnaLabel, orientasi }) {
  const renderBaris = (baris) => (
    <tr key={baris.label}>
      <td className="pr-2 py-1 align-top whitespace-nowrap font-semibold" style={{ color: warnaLabel }}>
        {baris.label}
      </td>
      <td className="pr-2 py-1 align-top text-slate-700">:</td>
      <td className="py-1 align-top text-slate-800">{baris.nilai || '-'}</td>
    </tr>
  )

  if (orientasi !== 'landscape') {
    return (
      <table className="mx-auto">
        <tbody>{barisIdentitas.map(renderBaris)}</tbody>
      </table>
    )
  }

  const tengah = Math.ceil(barisIdentitas.length / 2)
  const kolomKiri = barisIdentitas.slice(0, tengah)
  const kolomKanan = barisIdentitas.slice(tengah)

  return (
    <div className="grid grid-cols-2 gap-x-10 max-w-[220mm] mx-auto">
      <table>
        <tbody>{kolomKiri.map(renderBaris)}</tbody>
      </table>
      <table>
        <tbody>{kolomKanan.map(renderBaris)}</tbody>
      </table>
    </div>
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

// ---------------------------------------------------------------------------
// TEMA 11–16 — Kelompok "Bingkai Hijau" baru, dirancang khusus supaya enak
// dilihat saat ORIENTASI LANDSCAPE (tema 1-10 dibuat untuk kolom sempit ala
// portrait, jadi kalau dipaksa landscape sisi kiri-kanannya kosong). Satu
// komponen SampulBingkaiHijau dipakai bersama oleh keenamnya — bedanya cuma
// warna & dekorasi sudut (lihat GAYA_BINGKAI_HIJAU) — dan tabel identitasnya
// otomatis jadi 2 kolom saat landscape lewat TabelIdentitasDua di atas.
// ---------------------------------------------------------------------------
const GAYA_BINGKAI_HIJAU = {
  'kunci-hijau': {
    border: '2px solid #166534',
    warnaJudul: '#166534',
    warnaKop: '#14532d',
    warnaAksen: '#166534',
    dekorasi: 'kunci',
  },
  'pita-emas-hijau': {
    border: '1.5px solid #d4af37',
    warnaJudul: '#166534',
    warnaKop: '#14532d',
    warnaAksen: '#d4af37',
    dekorasi: 'pita',
  },
  'blok-geometris-hijau': {
    border: 'none',
    warnaJudul: '#166534',
    warnaKop: '#14532d',
    warnaAksen: '#4ade80',
    dekorasi: 'blok',
  },
  'floral-hijau': {
    border: '1.5px solid #166534',
    warnaJudul: '#166534',
    warnaKop: '#14532d',
    warnaAksen: '#166534',
    dekorasi: 'floral',
  },
  'kotak-emas-hijau': {
    border: '2px solid #d4af37',
    warnaJudul: '#166534',
    warnaKop: '#14532d',
    warnaAksen: '#d4af37',
    dekorasi: 'kotak-pita',
  },
  'ombak-hijau': {
    border: 'none',
    warnaJudul: '#166534',
    warnaKop: '#14532d',
    warnaAksen: '#4ade80',
    dekorasi: 'ombak',
  },
}

function SampulBingkaiHijau({ tema, logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  const gaya = GAYA_BINGKAI_HIJAU[tema] || GAYA_BINGKAI_HIJAU['kunci-hijau']
  return (
    <div
      className="lembar-cetak print-only bg-white mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: '10mm' }}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden px-10 py-8"
        style={{ border: gaya.border !== 'none' ? gaya.border : undefined, borderRadius: '6px' }}
      >
        {/* -- dekorasi sesuai tema -- */}
        {gaya.dekorasi === 'kunci' && (
          <>
            <HiasanKunciSudut warna={gaya.warnaAksen} style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 1 }} />
            <HiasanKunciSudut warna={gaya.warnaAksen} style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 1, transform: 'scaleX(-1)' }} />
            <HiasanKunciSudut warna={gaya.warnaAksen} style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 1, transform: 'scaleY(-1)' }} />
            <HiasanKunciSudut warna={gaya.warnaAksen} style={{ position: 'absolute', bottom: '8px', right: '8px', zIndex: 1, transform: 'scale(-1,-1)' }} />
          </>
        )}

        {gaya.dekorasi === 'pita' && (
          <PitaDiagonalHijauEmas style={{ top: 0, right: 0, width: '220px', height: '220px' }} />
        )}

        {gaya.dekorasi === 'blok' && (
          <>
            <div className="absolute top-0 right-0" style={{ width: '220px', height: '150px', overflow: 'hidden', zIndex: 0 }}>
              <div style={{ position: 'absolute', width: '380px', height: '60px', background: '#14532d', transform: 'rotate(45deg)', top: '-30px', right: '-140px' }} />
              <div style={{ position: 'absolute', width: '380px', height: '30px', background: '#4ade80', transform: 'rotate(45deg)', top: '20px', right: '-160px' }} />
              <div style={{ position: 'absolute', width: '380px', height: '20px', background: '#86efac', transform: 'rotate(45deg)', top: '55px', right: '-175px' }} />
            </div>
            <PolaTitikHijau warna={gaya.warnaAksen} style={{ top: '10px', left: '10px', width: '90px', height: '90px' }} />
            <PolaTitikHijau warna={gaya.warnaAksen} style={{ bottom: '10px', right: '10px', width: '70px', height: '70px' }} />
          </>
        )}

        {gaya.dekorasi === 'floral' && (
          <>
            <div style={{ position: 'absolute', inset: '6px', border: '1px solid #86efac', borderRadius: '2px', zIndex: 0, pointerEvents: 'none' }} />
            <HiasanSudut warna={gaya.warnaAksen} style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1 }} />
            <HiasanSudut warna={gaya.warnaAksen} style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1, transform: 'scaleX(-1)' }} />
            <HiasanSudut warna={gaya.warnaAksen} style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 1, transform: 'scaleY(-1)' }} />
            <HiasanSudut warna={gaya.warnaAksen} style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 1, transform: 'scale(-1,-1)' }} />
          </>
        )}

        {gaya.dekorasi === 'kotak-pita' && (
          <>
            <HiasanKunciSudut warna={gaya.warnaAksen} style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 1 }} />
            <HiasanKunciSudut warna={gaya.warnaAksen} style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 1, transform: 'scaleX(-1)' }} />
            <HiasanKunciSudut warna={gaya.warnaAksen} style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 1, transform: 'scaleY(-1)' }} />
            <HiasanKunciSudut warna={gaya.warnaAksen} style={{ position: 'absolute', bottom: '8px', right: '8px', zIndex: 1, transform: 'scale(-1,-1)' }} />
            <PitaDiagonalHijauEmas style={{ top: 0, left: 0, width: '220px', height: '220px', transform: 'scaleX(-1)' }} />
            <PitaDiagonalHijauEmas style={{ bottom: 0, right: 0, width: '220px', height: '220px', transform: 'scale(-1,-1)' }} />
          </>
        )}

        {gaya.dekorasi === 'ombak' && (
          <>
            <PolaTitikHijau warna={gaya.warnaAksen} style={{ bottom: '10px', left: '10px', width: '80px', height: '110px' }} />
            <svg viewBox="0 0 800 260" preserveAspectRatio="none" className="absolute top-0 left-0 w-full" style={{ height: '150px', zIndex: 0 }}>
              <path d="M0,60 C200,10 500,120 800,40 L800,0 L0,0 Z" fill="#86efac" opacity="0.5" />
              <path d="M0,90 C220,40 520,150 800,70 L800,0 L0,0 Z" fill="#4ade80" opacity="0.6" />
              <path d="M0,120 C250,70 550,180 800,100 L800,0 L0,0 Z" fill="#166534" opacity="0.85" />
            </svg>
          </>
        )}

        <div className="flex flex-col items-center text-center relative pt-2" style={{ zIndex: 2 }}>
          {logoUrl && (
            <div
              className="flex items-center justify-center bg-white rounded-full mb-3 shadow"
              style={{ width: '86px', height: '86px', border: `2px solid ${gaya.warnaAksen}` }}
            >
              <img src={logoUrl} alt="Logo" className="object-contain" style={{ width: '66px', height: '66px' }} />
            </div>
          )}
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[170mm] mt-1" style={{ color: gaya.warnaJudul }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <>
              <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: gaya.warnaAksen }}>
                {labelTahun} {tahunAnggaran}
              </p>
              <div style={{ height: '1px', width: '80px', background: gaya.warnaAksen, margin: '4px auto 0' }} />
            </>
          )}
        </div>

        <div className="mt-6 relative flex-1 text-sm" style={{ zIndex: 2 }}>
          <TabelIdentitasDua barisIdentitas={barisIdentitas} warnaLabel={gaya.warnaKop} orientasi={orientasi} />
        </div>

        <div className="text-right relative pt-4" style={{ zIndex: 2 }}>
          {dibuatOleh && (
            <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TEMA 17–19 — Sampul per jenis instansi (desain dari gambar referensi):
//   17 Kesehatan Hijau  -> Puskesmas : segitiga sudut hijau, gelombang hijau,
//                          hati berdenyut EKG di kiri bawah
//   18 Pendidikan Biru  -> Sekolah   : lengkung atas biru-emas, gelombang biru
//                          di bawah, tumpukan buku + gelas pensil
//   19 Mihrab Hijau Emas-> KUA       : lengkung mihrab putih di bingkai hijau,
//                          bintang segi delapan emas di sudut, siluet masjid
// Emblem/logo pada gambar referensi SENGAJA tidak dibawa — tempatnya diisi
// logoUrl milik tenant yang sedang login (identitas.logoUrl), jadi logo
// Puskesmas / Sekolah / Kemenag otomatis sesuai instansinya masing-masing.
// Semua digambar dengan SVG berukuran mm (viewBox = ukuran kertas), sehingga
// berlaku untuk portrait maupun landscape tanpa gambar melar.
// ---------------------------------------------------------------------------

// Path bintang segi delapan (dua persegi diputar 45 derajat).
function bintang8(cx, cy, r, ri = r * 0.62) {
  const titik = []
  for (let i = 0; i < 16; i++) {
    const sudut = ((i * 22.5 - 90) * Math.PI) / 180
    const rad = i % 2 === 0 ? r : ri
    titik.push(`${(cx + rad * Math.cos(sudut)).toFixed(2)} ${(cy + rad * Math.sin(sudut)).toFixed(2)}`)
  }
  return `M${titik.join(' L')} Z`
}

// Menggambar `children` di empat sudut secara cermin. Titik (0,0) lokal =
// sudut halaman yang digeser sebesar `inset`.
function EmpatSudutSvg({ w, h, inset, children }) {
  return (
    <>
      <g transform={`translate(${inset} ${inset})`}>{children}</g>
      <g transform={`translate(${w - inset} ${inset}) scale(-1 1)`}>{children}</g>
      <g transform={`translate(${inset} ${h - inset}) scale(1 -1)`}>{children}</g>
      <g transform={`translate(${w - inset} ${h - inset}) scale(-1 -1)`}>{children}</g>
    </>
  )
}

function BingkaiKesehatan({ w, h }) {
  const hijau = '#15803d'
  const gelap = '#166534'
  const terang = '#86efac'
  const muda = '#bbf7d0'
  const ins = 9
  const c = 11
  const b = h - 3
  const dalam = `M${ins + c} ${ins} H${w - ins - c} L${w - ins} ${ins + c} V${h - ins - c} L${w - ins - c} ${h - ins} H${ins + c} L${ins} ${h - ins - c} V${ins + c} Z`
  return (
    <>
      <rect x="3" y="3" width={w - 6} height={h - 6} fill="none" stroke={hijau} strokeWidth="1.6" />
      <path d={dalam} fill="none" stroke="#22c55e" strokeWidth="0.7" />
      {/* tiga lapis gelombang di dasar halaman */}
      <path d={`M3 ${h - 34} C${w * 0.3} ${h - 52}, ${w * 0.62} ${h - 14}, ${w - 3} ${h - 42} L${w - 3} ${b} L3 ${b} Z`} fill={terang} opacity="0.6" />
      <path d={`M3 ${h - 22} C${w * 0.28} ${h - 40}, ${w * 0.6} ${h - 6}, ${w - 3} ${h - 30} L${w - 3} ${b} L3 ${b} Z`} fill="#22c55e" opacity="0.85" />
      <path d={`M3 ${h - 13} C${w * 0.3} ${h - 26}, ${w * 0.65} ${h - 4}, ${w - 3} ${h - 18} L${w - 3} ${b} L3 ${b} Z`} fill={gelap} />
      {/* hati berdenyut (EKG) di kiri bawah */}
      <g transform={`translate(28 ${h - 47})`}>
        <path d="M0 11 C-17 -1 -14 -14 -7 -14 C-3 -14 0 -11 0 -8 C0 -11 3 -14 7 -14 C14 -14 17 -1 0 11 Z" fill="#fff" stroke={gelap} strokeWidth="1.1" />
        <path d="M-21 0 H-9 L-6 -6 L-2 6 L2 -5 L5 0 H21" fill="none" stroke={gelap} strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
      </g>
      {/* segitiga hijau di empat sudut */}
      <EmpatSudutSvg w={w} h={h} inset={3}>
        <polygon points="0,0 32,0 0,32" fill={gelap} />
        <path d="M4 20 L20 4" stroke={terang} strokeWidth="0.9" />
        <path d="M5 23 L23 5" stroke={muda} strokeWidth="0.5" />
      </EmpatSudutSvg>
    </>
  )
}

function BingkaiPendidikan({ w, h }) {
  const biru = '#1d4ed8'
  const biruMuda = '#3b82f6'
  const emas = '#facc15'
  const b = h - 3
  return (
    <>
      <rect x="3" y="3" width={w - 6} height={h - 6} fill="none" stroke={biru} strokeWidth="1.6" />
      <rect x="6" y="6" width={w - 12} height={h - 12} fill="none" stroke={emas} strokeWidth="0.7" />
      <rect x="8.4" y="8.4" width={w - 16.8} height={h - 16.8} fill="none" stroke={biru} strokeWidth="0.5" />
      <rect x="10.6" y="10.6" width={w - 21.2} height={h - 21.2} fill="none" stroke={emas} strokeWidth="0.35" />
      {/* lengkung biru + garis emas di atas */}
      <path d={`M3 3 H${w - 3} V26 Q${w / 2} -4 3 26 Z`} fill={biru} />
      <path d={`M3 31 Q${w / 2} 1 ${w - 3} 31`} fill="none" stroke={emas} strokeWidth="1.4" />
      <path d={`M3 34 Q${w / 2} 4 ${w - 3} 34`} fill="none" stroke={biru} strokeWidth="0.6" />
      {/* gelombang biru di dasar halaman, naik ke kanan */}
      <path d={`M3 ${h - 22} C${w * 0.32} ${h - 4}, ${w * 0.62} ${h - 34}, ${w - 3} ${h - 58} L${w - 3} ${b} L3 ${b} Z`} fill={biruMuda} />
      <path d={`M3 ${h - 16} C${w * 0.32} ${h + 2}, ${w * 0.62} ${h - 28}, ${w - 3} ${h - 52}`} fill="none" stroke={emas} strokeWidth="3.2" />
      <path d={`M3 ${h - 12} C${w * 0.32} ${h + 6}, ${w * 0.62} ${h - 24}, ${w - 3} ${h - 47} L${w - 3} ${b} L3 ${b} Z`} fill={biru} />
      {/* kunci kecil di sudut */}
      <EmpatSudutSvg w={w} h={h} inset={13}>
        <path d="M0 0 H7 V1.6 H1.6 V7 H0 Z" fill={emas} />
      </EmpatSudutSvg>
      {/* tumpukan buku + gelas pensil di kiri bawah */}
      <g transform={`translate(12 ${h - 13})`}>
        <rect x="0" y="-5" width="36" height="5" fill={biru} />
        <rect x="1.5" y="-3.7" width="33" height="1.3" fill="#fff" />
        <rect x="3" y="-10" width="32" height="5" fill={emas} />
        <rect x="4.5" y="-8.7" width="29" height="1.3" fill="#fff" />
        <rect x="1" y="-15" width="33" height="5" fill={biru} />
        <rect x="2.5" y="-13.7" width="30" height="1.3" fill="#fff" />
        <rect x="3" y="-27" width="11" height="12" rx="1" fill={biru} />
        <path d="M5 -27 L4 -36" stroke={emas} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8.5 -27 L9.5 -37" stroke={biru} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 -27 L14 -35" stroke={emas} strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </>
  )
}

function BingkaiKUA({ w, h }) {
  const hijau = '#14532d'
  const emas = '#d4af37'
  const cx = w / 2
  // lengkung mihrab putih di dalam bingkai hijau
  const dalam = `M11 ${h - 11} V36 Q11 26 22 26 H${cx - 24} C${cx - 15} 26 ${cx - 12} 17 ${cx} 7 C${cx + 12} 17 ${cx + 15} 26 ${cx + 24} 26 H${w - 22} Q${w - 11} 26 ${w - 11} 36 V${h - 11} Z`
  const lengkungBukit = `M11 ${h - 43} C${w * 0.3} ${h - 25}, ${w * 0.62} ${h - 45}, ${w - 11} ${h - 35}`
  return (
    <>
      <rect x="3" y="3" width={w - 6} height={h - 6} fill={hijau} />
      <rect x="5.2" y="5.2" width={w - 10.4} height={h - 10.4} fill="none" stroke={emas} strokeWidth="0.4" />
      <path d={dalam} fill="#fff" stroke={emas} strokeWidth="0.9" />
      {/* bukit hijau + siluet masjid di kanan bawah */}
      <path d={`${lengkungBukit} V${h - 11} H11 Z`} fill={hijau} />
      <g transform={`translate(${w - 13} ${h - 37})`} fill={hijau}>
        <rect x="-50" y="-3" width="50" height="10" />
        <path d="M-33 -3 A9 9 0 0 1 -15 -3 Z" />
        <rect x="-24.4" y="-16" width="0.8" height="4" />
        <path d="M-46 -3 A4 4 0 0 1 -38 -3 Z" />
        <path d="M-13 -3 A3.2 3.2 0 0 1 -6.6 -3 Z" />
        <rect x="-6" y="-30" width="5" height="27" />
        <path d="M-6.6 -30 L-3.5 -35 L-0.4 -30 Z" />
        <circle cx="-3.5" cy="-36" r="0.9" />
      </g>
      <path d={lengkungBukit} fill="none" stroke={emas} strokeWidth="2.2" />
      <path d={`M11 ${h - 47} C${w * 0.3} ${h - 29}, ${w * 0.62} ${h - 49}, ${w - 11} ${h - 39}`} fill="none" stroke={emas} strokeWidth="0.5" />
      {/* bintang segi delapan emas di empat sudut */}
      <EmpatSudutSvg w={w} h={h} inset={3}>
        <path d={bintang8(11, 11, 9.5)} fill="none" stroke={emas} strokeWidth="0.8" />
        <path d={bintang8(11, 11, 5.6, 3.4)} fill={emas} opacity="0.9" />
        <circle cx="11" cy="11" r="1.6" fill={hijau} />
        <path d={bintang8(26, 7, 3.4)} fill="none" stroke={emas} strokeWidth="0.6" />
      </EmpatSudutSvg>
    </>
  )
}

// Lapisan latar bingkai sesuai jenis (kesehatan / pendidikan / kua).
function LatarBingkaiTenant({ jenis, orientasi }) {
  const landscape = orientasi === 'landscape'
  const w = landscape ? 297 : 210
  const h = landscape ? 210 : 297
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    >
      {jenis === 'kesehatan' && <BingkaiKesehatan w={w} h={h} />}
      {jenis === 'pendidikan' && <BingkaiPendidikan w={w} h={h} />}
      {jenis === 'kua' && <BingkaiKUA w={w} h={h} />}
    </svg>
  )
}

// Padding isi (atas, kiri-kanan, bawah) supaya teks tidak menabrak hiasan
// bingkai: lengkung di atas (pendidikan, KUA) dan gelombang/masjid di bawah.
function paddingBingkaiTenant(jenis, orientasi) {
  const tabel = {
    portrait: { kesehatan: '26mm 22mm 58mm', pendidikan: '38mm 22mm 60mm', kua: '36mm 26mm 60mm' },
    landscape: { kesehatan: '20mm 30mm 42mm', pendidikan: '32mm 30mm 46mm', kua: '30mm 34mm 42mm' },
  }
  return tabel[orientasi === 'landscape' ? 'landscape' : 'portrait'][jenis]
}

const PALET_TENANT = {
  kesehatan: { judul: '#166534', kop: '#14532d', aksen: '#16a34a', tahun: '#15803d' },
  pendidikan: { judul: '#1d4ed8', kop: '#1e3a8a', aksen: '#eab308', tahun: '#b45309' },
  kua: { judul: '#14532d', kop: '#14532d', aksen: '#b8860b', tahun: '#b8860b' },
}

// Garis pemisah dengan ornamen kecil di tengah (daun / belah ketupat / bintang).
function PemisahOrnamen({ jenis, warna }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-3 w-full">
      <span style={{ height: '1px', width: '34mm', background: warna }} />
      <svg width="14" height="14" viewBox="-7 -7 14 14">
        {jenis === 'kua' ? (
          <path d={bintang8(0, 0, 6)} fill={warna} />
        ) : jenis === 'pendidikan' ? (
          <path d="M0 -5 L5 0 L0 5 L-5 0 Z" fill={warna} />
        ) : (
          <path d="M0 5 C-6 1 -5 -5 0 -6 C5 -5 6 1 0 5 Z" fill={warna} />
        )}
      </svg>
      <span style={{ height: '1px', width: '34mm', background: warna }} />
    </div>
  )
}

function SampulTenant({ jenis, logoUrl, judulTampil, subJudul, labelTahun, tahunAnggaran, barisIdentitas, dibuatOleh, orientasi }) {
  const pal = PALET_TENANT[jenis]
  return (
    <div
      className="lembar-cetak print-only bg-white mx-auto my-6 flex flex-col relative overflow-hidden"
      style={dimensiHalaman(orientasi)}
    >
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ padding: paddingBingkaiTenant(jenis, orientasi) }}
      >
        <LatarBingkaiTenant jenis={jenis} orientasi={orientasi} />
        <div className="relative flex-1 flex flex-col" style={{ zIndex: 1 }}>
        <div className="flex flex-col items-center text-center">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo"
              className="object-contain mb-2"
              style={{ width: '26mm', height: '26mm' }}
            />
          )}
          <h1 className="text-xl font-extrabold uppercase leading-snug max-w-[150mm]" style={{ color: pal.judul }}>
            {judulTampil || 'Judul Laporan'}
          </h1>
          {subJudul && (
            <h2 className="text-sm font-bold uppercase mt-2 tracking-wide text-slate-700">{subJudul}</h2>
          )}
          {tahunAnggaran && (
            <p className="text-sm font-bold uppercase mt-1 tracking-wide" style={{ color: pal.tahun }}>
              {labelTahun} {tahunAnggaran}
            </p>
          )}
          <PemisahOrnamen jenis={jenis} warna={pal.aksen} />
        </div>

        <div className="mt-6 flex-1 text-sm">
          <TabelIdentitasDua barisIdentitas={barisIdentitas} warnaLabel={pal.kop} orientasi={orientasi} />
        </div>

        {dibuatOleh && (
          <div className="text-right pt-3">
            <p className="text-sm italic text-slate-800">Dibuat Oleh : {dibuatOleh}</p>
          </div>
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
  'kunci-hijau': (props) => <SampulBingkaiHijau tema="kunci-hijau" {...props} />,
  'pita-emas-hijau': (props) => <SampulBingkaiHijau tema="pita-emas-hijau" {...props} />,
  'blok-geometris-hijau': (props) => <SampulBingkaiHijau tema="blok-geometris-hijau" {...props} />,
  'floral-hijau': (props) => <SampulBingkaiHijau tema="floral-hijau" {...props} />,
  'kotak-emas-hijau': (props) => <SampulBingkaiHijau tema="kotak-emas-hijau" {...props} />,
  'ombak-hijau': (props) => <SampulBingkaiHijau tema="ombak-hijau" {...props} />,
  'kesehatan-hijau': (props) => <SampulTenant jenis="kesehatan" {...props} />,
  'pendidikan-biru': (props) => <SampulTenant jenis="pendidikan" {...props} />,
  'kua-hijau-emas': (props) => <SampulTenant jenis="kua" {...props} />,
}

// ---------------------------------------------------------------------------
// POLA KOP RESMI — satu komponen yang dipakai bersama oleh ke-19 tema warna.
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
  'kunci-hijau': { background: '#ffffff', border: '2px solid #166534', kopColor: '#14532d', judulColor: '#166534', aksenColor: '#166534' },
  'pita-emas-hijau': { background: '#ffffff', border: '1.5px solid #d4af37', kopColor: '#14532d', judulColor: '#166534', aksenColor: '#d4af37' },
  'blok-geometris-hijau': { background: '#ffffff', border: '2px solid #166534', kopColor: '#14532d', judulColor: '#166534', aksenColor: '#4ade80' },
  'floral-hijau': { background: '#ffffff', border: '1.5px solid #166534', border2: '1px solid #86efac', kopColor: '#14532d', judulColor: '#166534', aksenColor: '#166534' },
  'kotak-emas-hijau': { background: '#ffffff', border: '2px solid #d4af37', kopColor: '#14532d', judulColor: '#166534', aksenColor: '#d4af37' },
  'ombak-hijau': { background: '#ffffff', border: '2px solid #166534', kopColor: '#14532d', judulColor: '#166534', aksenColor: '#4ade80' },
  // Tema 17-19: bingkainya digambar oleh LatarBingkaiTenant, jadi tidak ada border CSS.
  'kesehatan-hijau': { background: '#ffffff', border: 'none', kopColor: '#14532d', judulColor: '#166534', aksenColor: '#16a34a' },
  'pendidikan-biru': { background: '#ffffff', border: 'none', kopColor: '#1e3a8a', judulColor: '#1d4ed8', aksenColor: '#eab308' },
  'kua-hijau-emas': { background: '#ffffff', border: 'none', kopColor: '#14532d', judulColor: '#14532d', aksenColor: '#b8860b' },
}

function SampulKopResmi({ tema, logoUrl, kopBaris1, kopBaris2, kopBaris3, judulUtama, kodeLaporan, subJudulEkstra, labelTahun, tahunAnggaran, orientasi }) {
  const gaya = GAYA_KOP_RESMI[tema] || GAYA_KOP_RESMI.gelombang
  const jenisBingkai = JENIS_BINGKAI_TENANT[tema] // undefined untuk tema 1-16
  return (
    <div
      className="lembar-cetak print-only mx-auto my-6 flex flex-col relative overflow-hidden"
      style={{ ...dimensiHalaman(orientasi), padding: jenisBingkai ? 0 : '10mm', background: gaya.background }}
    >
      <div
        className="flex-1 flex flex-col items-center relative overflow-hidden px-10 py-10"
        style={{
          border: jenisBingkai ? 'none' : gaya.border,
          borderRadius: '4px',
          ...(jenisBingkai ? { padding: paddingBingkaiTenant(jenisBingkai, orientasi) } : {}),
        }}
      >
        {jenisBingkai && <LatarBingkaiTenant jenis={jenisBingkai} orientasi={orientasi} />}
        {gaya.border2 && (
          <div style={{ position: 'absolute', inset: '6px', border: gaya.border2, borderRadius: '2px', zIndex: 0, pointerEvents: 'none' }} />
        )}

        {/* Kop 3 baris — Pemerintah/Kementerian, Nama Dinas/Kantor, Nama Instansi */}
        <div className="text-center relative" style={{ zIndex: 1 }}>
          <p className="font-bold uppercase leading-snug" style={{ color: gaya.kopColor, fontSize: '15px' }}>{kopBaris1 || 'PEMERINTAH KABUPATEN ...'}</p>
          <p className="font-bold uppercase leading-snug" style={{ color: gaya.kopColor, fontSize: '15px' }}>{kopBaris2 || 'NAMA DINAS / KANTOR'}</p>
          <p className="font-bold uppercase leading-snug" style={{ color: gaya.kopColor, fontSize: '15px' }}>{kopBaris3 || 'NAMA INSTANSI'}</p>
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
 * Komponen sampul laporan yang reusable untuk SEMUA tenant (sekolah, kantor,
 * puskesmas). Identitas instansi (nama, logo, alamat, pimpinan) diambil
 * otomatis lewat useIdentitasInstansi() sesuai tenant akun yang login.
 *
 * Tema awal mengikuti tenant: kantor -> Tema 19 (KUA), puskesmas -> Tema 17
 * (Kesehatan), selain itu -> Tema 18 (Pendidikan). Pengguna tetap bebas
 * memilih tema lain lewat dropdown.
 *
 * Props:
 * - jenisLaporanAwal   : jenis laporan default saat halaman dibuka. Kalau tidak ada
 *                        di daftar jenis laporan tenant, dipakai jenis pertama.
 * - kunciJenisLaporan  : true = dropdown "Jenis Laporan" disembunyikan, jenis laporan tetap
 *                        (dipakai oleh halaman cabang seperti Sampul Semester / Sampul 8355)
 * - subJudulAwal       : isi awal field Sub Judul
 * - labelTahun         : label AWAL yang tampil di depan tahun pada sampul, default 'Tahun Anggaran'
 *                        (mis. 'Tahun Ajaran' untuk laporan semester/8355). Pengguna tetap bisa
 *                        mengganti pilihan ini sendiri lewat dropdown "Label Tahun" di form.
 * - tampilkanBank      : true/false — tampilkan baris Nama Bank & Nomor Rekening di identitas
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
  const { cfg, identitas, loading, error: errorMuat } = useIdentitasInstansi()
  const { isKantor, isPuskesmas } = useAuth()

  // Jenis laporan yang tersedia mengikuti tipe tenant (sekolah/kantor/puskesmas)
  const opsiJenis = cfg.jenisLaporan
  const jenisAwalValid = opsiJenis.includes(jenisLaporanAwal) ? jenisLaporanAwal : opsiJenis[0]

  // Tema bawaan sesuai jenis tenant. Kalau pengguna belum memilih tema sendiri,
  // tema ikut berubah begitu status tenant selesai dimuat dari AuthContext.
  const temaTenant = isKantor ? 'kua-hijau-emas' : isPuskesmas ? 'kesehatan-hijau' : 'pendidikan-biru'

  const [polaSampul, setPolaSampul] = useState(polaSampulAwal)
  const [tema, setTema] = useState(temaTenant)
  const [temaDipilihManual, setTemaDipilihManual] = useState(false)
  const [orientasi, setOrientasi] = useState('portrait') // 'portrait' | 'landscape'
  const [jenisLaporan, setJenisLaporan] = useState(jenisAwalValid)
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
  const [namaDinas, setNamaDinas] = useState('') // khusus Kop Resmi, diisi dari profil di effect bawah
  const [labelTahunPilihan, setLabelTahunPilihan] = useState(
    PILIHAN_LABEL_TAHUN.includes(labelTahun) ? labelTahun : PILIHAN_LABEL_TAHUN[0]
  )

  useEffect(() => {
    if (!temaDipilihManual) setTema(temaTenant)
  }, [temaTenant, temaDipilihManual])

  const judulTampil = jenisLaporan === 'Lainnya (isi bebas)' ? judulBebas : jenisLaporan

  // Isi form dari profil instansi begitu selesai dimuat
  useEffect(() => {
    if (loading) return
    setNamaBank(identitas.namaBank)
    setNomorRekening(identitas.nomorRekening)
    setDesaKelurahan(identitas.desa)
    setEmailSekolah(identitas.email)
    setDibuatOleh(identitas.pimpinan)
    setNamaDinas(
      cfg.namaDinas({ ...identitas, kabupaten: bersihkanWilayah(identitas.kabupaten, 'kabupaten') })
    )
  }, [loading, identitas]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

  const kabupatenBersih = bersihkanWilayah(identitas.kabupaten, 'kabupaten')

  const barisIdentitas = [
    { label: cfg.labelNama, nilai: identitas.nama },
    ...(cfg.labelKode ? [{ label: cfg.labelKode, nilai: identitas.kode }] : []),
    { label: 'Alamat', nilai: identitas.alamat },
    { label: 'Desa/Kelurahan', nilai: desaKelurahan },
    { label: 'Kecamatan', nilai: bersihkanWilayah(identitas.kecamatan, 'kecamatan') },
    { label: 'Kab/Kota', nilai: kabupatenBersih },
    { label: 'Provinsi', nilai: identitas.provinsi },
    { label: 'Kode Pos', nilai: identitas.kodePos },
    ...(tampilkanKelas ? [{ label: 'Kelas', nilai: kelas }] : []),
    ...(tampilkanBank
      ? [
          { label: 'Nama Bank', nilai: namaBank },
          { label: 'Nomor Rekening', nilai: nomorRekening },
        ]
      : []),
    { label: `E-mail ${cfg.labelInstansi}`, nilai: emailSekolah },
  ]

  // Data khusus pola Kop Resmi: kop 3 baris + judul/kode terpisah.
  const { judul: judulKopResmi, kode: kodeKopResmi } = pisahJudulKode(judulTampil)
  const propsKopResmi = {
    tema,
    logoUrl: identitas.logoUrl,
    kopBaris1: cfg.kopAtas(jenisWilayah, kabupatenBersih),
    kopBaris2: namaDinas,
    kopBaris3: identitas.nama,
    judulUtama: judulKopResmi,
    kodeLaporan: kodeKopResmi,
    subJudulEkstra: subJudul,
    labelTahun: labelTahunPilihan,
    tahunAnggaran,
    orientasi,
  }

  const propsSampul = {
    logoUrl: identitas.logoUrl,
    judulTampil,
    subJudul,
    labelTahun: labelTahunPilihan,
    tahunAnggaran,
    barisIdentitas,
    dibuatOleh,
    orientasi,
  }
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
              {orientasi === 'landscape' && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Tema 11–16 (Bingkai Hijau) dan Tema 17–19 (per instansi) tabel identitasnya otomatis jadi 2 kolom di landscape, jadi lebih pas dibanding tema lain.
                </p>
              )}
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
                  ? `Logo bulat kecil + tabel identitas ${cfg.labelInstansi.toLowerCase()} lengkap.`
                  : 'Kop 3 baris + logo besar di tengah, seperti kop surat resmi.'}
              </p>
            </div>

            <label className="text-xs text-slate-500">
              Tema Sampul
              <select
                value={tema}
                onChange={(e) => {
                  setTema(e.target.value)
                  setTemaDipilihManual(true)
                }}
                className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5 font-medium"
              >
                {TEMA_SAMPUL.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}{t.id === temaTenant ? ' ★ sesuai instansi Anda' : ''}
                  </option>
                ))}
              </select>
            </label>

            {kunciJenisLaporan ? (
              <div className="text-xs text-slate-500">
                Jenis Laporan
                <div className="mt-0.5 w-full text-sm border border-slate-200 bg-slate-50 rounded px-2 py-1.5 text-slate-700 font-medium">
                  {jenisAwalValid}
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
                  {opsiJenis.map((j) => (
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
                  Nama Dinas / Kantor
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

            <div className="grid grid-cols-[auto_1fr] gap-2 items-end">
              <label className="text-xs text-slate-500">
                Label
                <select
                  value={labelTahunPilihan}
                  onChange={(e) => setLabelTahunPilihan(e.target.value)}
                  className="mt-0.5 text-sm border border-slate-300 rounded px-2 py-1.5 font-medium"
                >
                  {PILIHAN_LABEL_TAHUN.map((opsi) => (
                    <option key={opsi} value={opsi}>{opsi}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-500">
                Isi Tahun
                <input
                  type="text"
                  value={tahunAnggaran}
                  onChange={(e) => setTahunAnggaran(e.target.value)}
                  placeholder="mis. 2026 / 2027"
                  className="mt-0.5 w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                />
              </label>
            </div>

            {polaSampul === 'dekoratif' && (
              <>
                <label className="text-xs text-slate-500">
                  Desa/Kelurahan <span className="text-slate-400">(bisa diisi manual bila belum ada di profil)</span>
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
                      Nomor Rekening <span className="text-slate-400">(bisa diisi manual)</span>
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
                  E-mail {cfg.labelInstansi}
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
