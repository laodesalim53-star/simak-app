// src/pages/BeritaAcaraUjian.jsx
//
// Template awal berita acara pelaksanaan ujian per ruang. Field masih
// contoh — sambungkan ke data ruang/jadwal ujian yang sebenarnya, dan
// sesuaikan redaksi paragrafnya kalau format resmi sekolah Anda berbeda.

import { useState } from 'react'
import { Printer } from 'lucide-react'
import Layout from '../components/Layout'

const CONTOH = {
  namaSekolah: 'SD Negeri Waria',
  tapel: '2024/2025',
  mataPelajaran: 'Asesmen Sumatif',
  hariTanggal: 'Senin, 5 Mei 2025',
  ruangUjian: '1',
  jumlahPeserta: 24,
  jumlahHadir: 24,
  jumlahTidakHadir: 0,
  pengawas1: 'La Ode Salim, S.Pd',
  pengawas2: 'Wa Ode Rahma, S.Pd',
  catatanKejadian: 'Ujian berlangsung tertib, tidak ada kejadian khusus.',
  tempatTanggal: 'Waria, 5 Mei 2025',
}

export default function BeritaAcaraUjian() {
  const [data] = useState(CONTOH)

  return (
    <Layout title="Berita Acara Ujian" subtitle="Berita acara pelaksanaan ujian per ruang, siap cetak.">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-cetak-ba, #area-cetak-ba * { visibility: visible; }
          #area-cetak-ba { position: absolute; left: 0; top: 0; width: 100%; }
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

      <div id="area-cetak-ba" className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-[13.5px] leading-relaxed text-slate-800">
        <div className="text-center mb-6">
          <p className="font-display text-base font-bold">BERITA ACARA PELAKSANAAN UJIAN</p>
          <p>{data.namaSekolah} — Tahun Pelajaran {data.tapel}</p>
        </div>

        <p className="mb-4">
          Pada hari ini, <strong>{data.hariTanggal}</strong>, telah dilaksanakan {data.mataPelajaran} di{' '}
          <strong>Ruang {data.ruangUjian}</strong>, {data.namaSekolah}, dengan rincian sebagai berikut:
        </p>

        <table className="w-full mb-4">
          <tbody>
            <Baris label="Jumlah peserta terdaftar" nilai={data.jumlahPeserta} />
            <Baris label="Jumlah peserta hadir" nilai={data.jumlahHadir} />
            <Baris label="Jumlah peserta tidak hadir" nilai={data.jumlahTidakHadir} />
            <Baris label="Pengawas ruang" nilai={`${data.pengawas1} & ${data.pengawas2}`} />
          </tbody>
        </table>

        <p className="mb-1 font-medium">Catatan kejadian selama ujian:</p>
        <p className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3">{data.catatanKejadian}</p>

        <p className="mb-10">
          Demikian berita acara ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
        </p>

        <div className="grid grid-cols-2 gap-6 text-center">
          <div>
            <p className="mb-16">Pengawas Ruang I</p>
            <p className="font-semibold underline decoration-slate-300 underline-offset-4">{data.pengawas1}</p>
          </div>
          <div>
            <p className="mb-16">Pengawas Ruang II</p>
            <p className="font-semibold underline decoration-slate-300 underline-offset-4">{data.pengawas2}</p>
          </div>
        </div>

        <p className="mt-10 text-right">{data.tempatTanggal}</p>
      </div>
    </Layout>
  )
}

function Baris({ label, nilai }) {
  return (
    <tr>
      <td className="py-0.5 pr-3 align-top text-slate-500 w-56">{label}</td>
      <td className="py-0.5 align-top">: {nilai}</td>
    </tr>
  )
}
