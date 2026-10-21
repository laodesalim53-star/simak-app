import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import KopSurat from './KopSurat'

function tanggalIndo(d = new Date()) {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Isi halaman cetak Silabus. Dirender ke jendela cetak terpisah (lihat handleCetak di Silabus.jsx),
// jadi tidak terpengaruh aturan cetak Layout.
export default function SilabusCetak({ items, kelas, waliId, onCetak, onTutup }) {
  const { sekolahId } = useAuth()
  const [sekolah, setSekolah] = useState(null)
  const [wali, setWali] = useState(null)

  useEffect(() => {
    if (!sekolahId) return
    supabase
      .from('profil_sekolah')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => setSekolah(data))
  }, [sekolahId])

  useEffect(() => {
    const id = waliId || kelas?.wali_kelas_id
    if (!id) return
    supabase
      .from('guru')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setWali(data))
  }, [waliId, kelas?.wali_kelas_id])

  // Kelompokkan per tahun ajaran + semester (urutan sesuai data yang dimuat)
  const grup = new Map()
  for (const it of items) {
    const kunci = `${it.tahun_ajaran}|${it.semester}`
    if (!grup.has(kunci)) grup.set(kunci, [])
    grup.get(kunci).push(it)
  }

  // CATATAN: nama kolom di profil_sekolah untuk kepala sekolah bisa berbeda di
  // database Anda. Sesuaikan dua baris di bawah ini kalau kosong saat dicetak.
  const namaKepsek = sekolah?.nama_kepala_sekolah || sekolah?.kepala_sekolah || ''
  const nipKepsek = sekolah?.nip_kepala_sekolah || sekolah?.nip_kepala || ''
  const namaWali = wali?.nama_lengkap || ''
  const nipWali = wali?.nip || ''
  // "PEMERINTAH KABUPATEN KEPULAUAN ARU" -> "Kepulauan Aru"
  const kota = (sekolah?.kabupaten || '')
    .replace(/^pemerintah\s+/i, '')
    .replace(/^kabupaten\s+/i, '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="bg-white text-slate-900" style={{ fontFamily: 'serif' }}>
      <style>{`
        @page { size: A4 landscape; margin: 12mm; }
        body { background: #fff; margin: 0; }
        .tabel-silabus { border-collapse: collapse; width: 100%; }
        .tabel-silabus th, .tabel-silabus td { border: 1px solid #0f172a; padding: 4px 6px; vertical-align: top; font-size: 10.5px; line-height: 1.35; }
        .tabel-silabus th { background: #e2e8f0; text-align: center; }
        .tabel-silabus tr { page-break-inside: avoid; }
        .tabel-silabus thead { display: table-header-group; }
        .blok-ttd { page-break-inside: avoid; }
        @media print {
          .no-print { display: none !important; }
          html, body { visibility: visible !important; display: block !important; height: auto !important; overflow: visible !important; background: #fff !important; }
          body * { visibility: visible !important; }
        }
      `}</style>

      {/* Bilah alat: tidak ikut tercetak */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5" style={{ fontFamily: 'sans-serif' }}>
        <p className="text-sm text-slate-600">Pratinjau cetak · A4 lanskap</p>
        <div className="flex gap-2">
          <button type="button" onClick={onCetak} className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white">
            Cetak
          </button>
          <button type="button" onClick={onTutup} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600">
            Tutup
          </button>
        </div>
      </div>

      <div className="px-8 py-6">
        <KopSurat />

        <h1 className="text-center text-[15px] font-bold uppercase underline">Silabus Pembelajaran</h1>

        <table className="mt-3 text-[12px]">
          <tbody>
            <tr>
              <td className="pr-3">Satuan Pendidikan</td>
              <td className="pr-2">:</td>
              <td>{sekolah?.nama_sekolah || '-'}</td>
            </tr>
            <tr>
              <td className="pr-3">Kelas</td>
              <td className="pr-2">:</td>
              <td>{kelas?.nama_kelas || '-'}</td>
            </tr>
          </tbody>
        </table>

        {[...grup.entries()].map(([kunci, daftar]) => {
          const [ta, smt] = kunci.split('|')
          return (
            <div key={kunci} className="mt-4">
              <p className="mb-1 text-[12px] font-bold">
                Semester {smt} · Tahun Ajaran {ta}
              </p>
              <table className="tabel-silabus">
                <thead>
                  <tr>
                    <th style={{ width: '3%' }}>No</th>
                    <th style={{ width: '12%' }}>Mata Pelajaran</th>
                    <th style={{ width: '20%' }}>Capaian Pembelajaran</th>
                    <th style={{ width: '20%' }}>Tujuan Pembelajaran</th>
                    <th style={{ width: '15%' }}>Materi Pokok</th>
                    <th style={{ width: '8%' }}>Alokasi Waktu</th>
                    <th style={{ width: '11%' }}>Penilaian</th>
                    <th style={{ width: '11%' }}>Sumber Belajar</th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((it, i) => (
                    <tr key={it.id}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{it.mata_pelajaran}</td>
                      <td style={{ whiteSpace: 'pre-line' }}>{it.capaian_pembelajaran || '-'}</td>
                      <td style={{ whiteSpace: 'pre-line' }}>{it.tujuan_pembelajaran || '-'}</td>
                      <td style={{ whiteSpace: 'pre-line' }}>{it.materi_pokok || '-'}</td>
                      <td>{it.alokasi_waktu || '-'}</td>
                      <td>{it.penilaian || '-'}</td>
                      <td>{it.sumber_belajar || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        <div className="blok-ttd mt-8 grid grid-cols-2 gap-8 text-[12px]">
          <div className="text-center">
            <p>&nbsp;</p>
            <p>Mengetahui,</p>
            <p>Kepala Sekolah</p>
            <div style={{ height: '64px' }} />
            <p className="font-bold underline">{namaKepsek || '..............................'}</p>
            {nipKepsek && <p>NIP. {nipKepsek}</p>}
          </div>
          <div className="text-center">
            <p>
              {kota ? `${kota}, ` : ''}
              {tanggalIndo()}
            </p>
            <p>Wali Kelas {kelas?.nama_kelas || ''}</p>
            <p>&nbsp;</p>
            <div style={{ height: '64px' }} />
            <p className="font-bold underline">{namaWali || '..............................'}</p>
            {nipWali && <p>NIP. {nipWali}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
