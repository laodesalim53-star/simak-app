// src/pages/KartuPesertaUjian.jsx
//
// Versi React dari desain kartu peserta ujian yang sudah disetujui.
// Saat ini datanya masih contoh (`SISWA_CONTOH`) — ganti dengan data asli
// (misalnya hasil fetch dari tabel siswa/rombel) sebelum dipakai produksi.
//
// Perlu paket QR code, install salah satu dulu:
//   npm install qrcode.react
//
// Kalau paket lain sudah dipakai di proyek Anda (mis. react-qr-code),
// tinggal ganti import di bawah.

import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { GraduationCap, Printer, User } from 'lucide-react'
import Layout from '../components/Layout'

// TODO: ganti dengan data sekolah & siswa yang sebenarnya.
const IDENTITAS_SEKOLAH = {
  namaSekolah: 'SD Negeri Waria',
  tapel: '2024/2025',
  tempatTanggal: 'Waria, 5 Mei 2025',
  kepalaSekolah: 'La Ode Salim, S.Pd',
}

const SISWA_CONTOH = [
  {
    noPeserta: '09-0039-0001-8',
    noInduk: '0127745573',
    nama: 'Abdul Rahman Djutay',
    tanggalLahir: '10 Mei 2012',
    ruangUjian: '1',
  },
  {
    noPeserta: '09-0039-0002-6',
    noInduk: '0127745574',
    nama: 'Siti Aminah',
    tanggalLahir: '22 Agustus 2012',
    ruangUjian: '1',
  },
  {
    noPeserta: '09-0039-0003-4',
    noInduk: '0127745575',
    nama: 'Muhammad Fajar',
    tanggalLahir: '3 Januari 2013',
    ruangUjian: '2',
  },
]

function KartuUjian({ siswa, sekolah }) {
  const qrValue = `PESERTA:${siswa.noPeserta}|NAMA:${siswa.nama}|SEKOLAH:${sekolah.namaSekolah}`

  return (
    <div className="kartu-ujian w-full max-w-[340px] rounded-[22px] border border-teal-900/10 bg-white shadow-lg shadow-teal-900/10 overflow-hidden relative">
      <div className="h-1.5 w-full bg-gradient-to-r from-teal-700 via-teal-700 to-amber-400" style={{ backgroundImage: 'linear-gradient(90deg, #0f6e5e 0%, #0f6e5e 65%, #e8a33d 65%, #e8a33d 100%)' }} />

      {/* Header */}
      <div className="relative px-5 pt-5 pb-4 text-white bg-gradient-to-br from-[#0a4a40] to-[#0f6e5e]">
        <span className="absolute top-5 right-5 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-semibold text-amber-950">
          TP {sekolah.tapel}
        </span>
        <div className="flex items-center gap-3 pr-16">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
            <GraduationCap size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-wide text-white/70">Kartu Peserta</p>
            <p className="font-display text-[17px] font-bold leading-tight">Asesmen {sekolah.namaSekolah}</p>
            <p className="text-xs text-white/80">Tahun Pelajaran {sekolah.tapel}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-[110px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <User size={44} className="text-slate-300" />
          </div>
          <div className="pt-0.5">
            <p className="text-[10.5px] tracking-wide text-slate-500">Nama Peserta</p>
            <p className="font-display text-[18px] font-bold leading-snug mb-2.5">{siswa.nama}</p>
            <div className="inline-flex items-baseline gap-1.5 rounded-[9px] border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="font-display text-[15px] font-bold text-teal-700">{siswa.ruangUjian}</span>
              <span className="text-[10.5px] text-slate-500">Ruang Ujian</span>
            </div>
          </div>
        </div>

        <div className="my-5 h-px bg-slate-200" />

        <div className="flex flex-col gap-3">
          <Baris label="No. Peserta" nilai={siswa.noPeserta} />
          <Baris label="No. Induk" nilai={siswa.noInduk} />
          <Baris label="Tanggal Lahir" nilai={siswa.tanggalLahir} />
          <Baris label="Sekolah Asal" nilai={sekolah.namaSekolah} />
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="text-[11.5px] leading-relaxed text-slate-500">
            <p className="mb-6">{sekolah.tempatTanggal}</p>
            <p className="font-semibold text-slate-900">{sekolah.kepalaSekolah}</p>
            <p className="text-[11px] text-slate-500">Kepala Sekolah</p>
          </div>
          <div className="shrink-0 rounded-[10px] border border-slate-200 bg-white p-1.5">
            <QRCodeSVG value={qrValue} size={60} />
          </div>
        </div>
      </div>

      <div
        className="h-2.5 w-full opacity-90"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, #0f6e5e 0 16px, #e8a33d 16px 32px)' }}
      />
    </div>
  )
}

function Baris({ label, nilai }) {
  return (
    <div className="grid grid-cols-[118px_1fr] items-baseline gap-2.5">
      <span className="text-[11.5px] text-slate-500">{label}</span>
      <span className="text-[13.5px] font-semibold text-slate-900">{nilai}</span>
    </div>
  )
}

export default function KartuPesertaUjian() {
  const [ruangFilter, setRuangFilter] = useState('semua')

  const daftarRuang = useMemo(
    () => ['semua', ...new Set(SISWA_CONTOH.map((s) => s.ruangUjian))],
    []
  )

  const siswaTampil = useMemo(
    () => (ruangFilter === 'semua' ? SISWA_CONTOH : SISWA_CONTOH.filter((s) => s.ruangUjian === ruangFilter)),
    [ruangFilter]
  )

  return (
    <Layout title="Kartu Peserta Ujian" subtitle="Cetak kartu peserta untuk setiap siswa, per ruang ujian.">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-cetak-kartu, #area-cetak-kartu * { visibility: visible; }
          #area-cetak-kartu { position: absolute; left: 0; top: 0; width: 100%; }
          .kartu-ujian { break-inside: avoid; }
        }
      `}</style>

      {/* Kontrol — sembunyi saat print */}
      <div className="print:hidden mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-ruang" className="text-sm text-slate-600">
            Ruang ujian:
          </label>
          <select
            id="filter-ruang"
            value={ruangFilter}
            onChange={(e) => setRuangFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {daftarRuang.map((r) => (
              <option key={r} value={r}>
                {r === 'semua' ? 'Semua ruang' : `Ruang ${r}`}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950"
        >
          <Printer size={16} /> Cetak Kartu
        </button>
      </div>

      <p className="print:hidden mb-4 text-xs text-slate-500">
        Data siswa di bawah masih contoh. Ganti <code>SISWA_CONTOH</code> di berkas ini dengan data asli (mis. hasil
        fetch dari tabel siswa), dan sesuaikan <code>IDENTITAS_SEKOLAH</code> dengan data sekolah Anda.
      </p>

      <div id="area-cetak-kartu" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 place-items-center">
        {siswaTampil.map((siswa) => (
          <KartuUjian key={siswa.noPeserta} siswa={siswa} sekolah={IDENTITAS_SEKOLAH} />
        ))}
      </div>
    </Layout>
  )
}
