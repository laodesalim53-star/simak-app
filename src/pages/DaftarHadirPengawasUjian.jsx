// src/pages/DaftarHadirPengawasUjian.jsx
//
// Template daftar hadir pengawas ruang ujian. Ganti `PENGAWAS_CONTOH`
// dengan data pengawas & jadwal jaga asli (bisa disambungkan ke data
// yang sama dengan SK Pengawas Asesmen Sekolah).

import { useState } from 'react'
import { Printer } from 'lucide-react'
import Layout from '../components/Layout'

const IDENTITAS = {
  namaSekolah: 'SD Negeri Waria',
  tapel: '2024/2025',
  hariTanggal: 'Senin, 5 Mei 2025',
}

const PENGAWAS_CONTOH = [
  { nama: 'La Ode Salim, S.Pd', ruang: '1', jamJaga: '08.00 – 10.00' },
  { nama: 'Wa Ode Rahma, S.Pd', ruang: '2', jamJaga: '08.00 – 10.00' },
]

export default function DaftarHadirPengawasUjian() {
  const [pengawas] = useState(PENGAWAS_CONTOH)

  return (
    <Layout title="Daftar Hadir Pengawas" subtitle="Daftar hadir pengawas ruang ujian, siap cetak.">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-cetak-pengawas, #area-cetak-pengawas * { visibility: visible; }
          #area-cetak-pengawas { position: absolute; left: 0; top: 0; width: 100%; }
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

      <div id="area-cetak-pengawas" className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-center mb-6 text-[13.5px]">
          <p className="font-display text-base font-bold">DAFTAR HADIR PENGAWAS UJIAN</p>
          <p>{IDENTITAS.namaSekolah} — Tahun Pelajaran {IDENTITAS.tapel}</p>
          <p>{IDENTITAS.hariTanggal}</p>
        </div>

        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-slate-50">
              <Th className="w-10">No</Th>
              <Th>Nama Pengawas</Th>
              <Th className="w-24">Ruang</Th>
              <Th className="w-32">Jam Jaga</Th>
              <Th className="w-28">Tanda Tangan</Th>
            </tr>
          </thead>
          <tbody>
            {pengawas.map((p, i) => (
              <tr key={p.nama}>
                <Td className="text-center">{i + 1}</Td>
                <Td>{p.nama}</Td>
                <Td className="text-center">{p.ruang}</Td>
                <Td className="text-center">{p.jamJaga}</Td>
                <Td>&nbsp;</Td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 flex justify-end text-[13px]">
          <div className="text-center">
            <p className="mb-16">Kepala Sekolah</p>
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
