// src/pages/DaftarHadirSiswaUjian.jsx
//
// Template daftar hadir peserta ujian per ruang. Ganti `SISWA_CONTOH`
// dengan data siswa asli per ruang ujian.

import { useState } from 'react'
import { Printer } from 'lucide-react'
import Layout from '../components/Layout'

const IDENTITAS = {
  namaSekolah: 'SD Negeri Waria',
  tapel: '2024/2025',
  mataPelajaran: 'Asesmen Sumatif',
  hariTanggal: 'Senin, 5 Mei 2025',
  ruangUjian: '1',
}

const SISWA_CONTOH = [
  { noPeserta: '09-0039-0001-8', nama: 'Abdul Rahman Djutay' },
  { noPeserta: '09-0039-0002-6', nama: 'Siti Aminah' },
  { noPeserta: '09-0039-0003-4', nama: 'Muhammad Fajar' },
]

export default function DaftarHadirSiswaUjian() {
  const [siswa] = useState(SISWA_CONTOH)

  return (
    <Layout title="Daftar Hadir Siswa" subtitle="Daftar hadir peserta ujian per ruang, siap cetak.">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-cetak-hadir, #area-cetak-hadir * { visibility: visible; }
          #area-cetak-hadir { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="print:hidden mb-5 flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950"
        >
          <Printer size={16} /> Cetak
        </button>
      </div>

      <div id="area-cetak-hadir" className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-center mb-6 text-[13.5px]">
          <p className="font-display text-base font-bold">DAFTAR HADIR PESERTA UJIAN</p>
          <p>{IDENTITAS.namaSekolah} — Tahun Pelajaran {IDENTITAS.tapel}</p>
          <p>{IDENTITAS.mataPelajaran} · {IDENTITAS.hariTanggal} · Ruang {IDENTITAS.ruangUjian}</p>
        </div>

        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-slate-50">
              <Th className="w-10">No</Th>
              <Th className="w-36">No. Peserta</Th>
              <Th>Nama Peserta</Th>
              <Th className="w-28">Tanda Tangan</Th>
            </tr>
          </thead>
          <tbody>
            {siswa.map((s, i) => (
              <tr key={s.noPeserta}>
                <Td className="text-center">{i + 1}</Td>
                <Td>{s.noPeserta}</Td>
                <Td>{s.nama}</Td>
                <Td>&nbsp;</Td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 flex justify-end text-[13px]">
          <div className="text-center">
            <p className="mb-16">Pengawas Ruang</p>
            <p className="font-semibold underline decoration-slate-300 underline-offset-4">(________________________)</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function Th({ children, className = '' }) {
  return <th className={`border border-slate-200 px-2 py-2 text-left font-semibold ${className}`}>{children}</th>
}
function Td({ children, className = '' }) {
  return <td className={`border border-slate-200 px-2 py-2 ${className}`}>{children}</td>
}
