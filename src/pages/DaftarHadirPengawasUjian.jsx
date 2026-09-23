// src/pages/DaftarHadirPengawasUjian.jsx
//
// Daftar hadir pengawas ruang ujian. Ruang = kelas VI, pengawas = guru aktif
// (keduanya dari ambilGuruDanKelas); jam jaga tetap manual.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Printer, Trash2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import {
  BagianSK as Bagian,
  FieldSK as Field,
  SEKOLAH_KOSONG,
  ambilGuruDanKelas,
  ambilProfilSekolah,
  formatTanggalSK,
  inputSK as inputCls,
  isi,
  isoHariIni,
  tahunPelajaranSekarang,
  urutkanGuru,
} from './CetakSK'

function isKelasEnam(k) {
  const t = String(k?.tingkat ?? '').trim().toUpperCase()
  return t === '6' || t === 'VI'
}

const idBaru = () => Math.random().toString(36).slice(2, 9)
const barisBaru = () => ({ id: idBaru(), guruId: '', kelasId: '', jamJaga: '08.00 – 10.00' })

export default function DaftarHadirPengawasUjian() {
  const { sekolahId } = useAuth()

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [guru, setGuru] = useState([])
  const [kelasEnam, setKelasEnam] = useState([])
  const [tanggal, setTanggal] = useState(isoHariIni())
  const [baris, setBaris] = useState([barisBaru()])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')

  async function muat() {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, gk] = await Promise.all([ambilProfilSekolah(sekolahId), ambilGuruDanKelas(sekolahId)])
      setSekolah(ps.sekolah)
      setGuru(urutkanGuru(gk.guru))
      const enam = gk.kelas.filter(isKelasEnam)
      setKelasEnam(enam)
      setBaris((d) => d.map((b) => ({ ...b, kelasId: b.kelasId || enam[0]?.id || '' })))
    } catch (e) {
      console.error('Gagal memuat data Daftar Hadir Pengawas:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  const kelasPerId = useMemo(() => {
    const m = {}
    kelasEnam.forEach((k) => { m[k.id] = k })
    return m
  }, [kelasEnam])

  const guruPerId = useMemo(() => {
    const m = {}
    guru.forEach((g) => { m[g.id] = g })
    return m
  }, [guru])

  const ubahBaris = (id, k, v) => setBaris((d) => d.map((b) => (b.id === id ? { ...b, [k]: v } : b)))
  const tambahBaris = () => setBaris((d) => [...d, barisBaru()])
  const hapusBaris = (id) => setBaris((d) => d.filter((b) => b.id !== id))

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tapel = tahunPelajaranSekarang()
  const hariTanggal = formatTanggalSK(tanggal)

  return (
    <Layout title="Daftar Hadir Pengawas" subtitle="Daftar hadir pengawas ruang ujian, siap cetak.">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-cetak-pengawas, #area-cetak-pengawas * { visibility: visible; }
          #area-cetak-pengawas { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="no-print max-w-3xl mx-auto mb-5">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah dan guru…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data belum bisa dibaca ({galat}).
          </div>
        )}

        <Bagian judul="Tanggal">
          <Field label="Hari, tanggal ujian" className="sm:max-w-xs">
            <input type="date" className={inputCls} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </Field>
        </Bagian>

        <Bagian
          judul="Pengawas per ruang"
          keterangan="Pilih guru dan ruang (kelas VI); wali kelas ruang yang sama disembunyikan dari pilihannya sendiri."
          aksi={
            <button
              type="button"
              onClick={tambahBaris}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
            >
              <Plus size={13} /> Tambah baris
            </button>
          }
        >
          <div className="space-y-3">
            {baris.map((b, i) => {
              const ruangTerpilih = kelasPerId[b.kelasId]
              const pilihanGuru = guru.filter((g) => !ruangTerpilih || g.id !== ruangTerpilih.wali_kelas_id)
              return (
                <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Nomor {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => hapusBaris(b.id)}
                      aria-label={`Hapus nomor ${i + 1}`}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Ruang">
                      <select className={inputCls} value={b.kelasId} onChange={(e) => ubahBaris(b.id, 'kelasId', e.target.value)}>
                        {kelasEnam.map((k) => (
                          <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Nama pengawas">
                      <select className={inputCls} value={b.guruId} onChange={(e) => ubahBaris(b.id, 'guruId', e.target.value)}>
                        <option value="">— pilih guru —</option>
                        {pilihanGuru.map((g) => (
                          <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Jam jaga">
                      <input className={inputCls} value={b.jamJaga} onChange={(e) => ubahBaris(b.id, 'jamJaga', e.target.value)} />
                    </Field>
                  </div>
                </div>
              )
            })}
          </div>
        </Bagian>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950"
          >
            <Printer size={16} /> Cetak
          </button>
        </div>
      </div>

      <div id="area-cetak-pengawas" className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-center mb-6 text-[13.5px]">
          <p className="font-display text-base font-bold">DAFTAR HADIR PENGAWAS UJIAN</p>
          <p>{namaSekolah} — Tahun Pelajaran {tapel}</p>
          <p>{hariTanggal}</p>
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
            {baris.map((b, i) => (
              <tr key={b.id}>
                <Td className="text-center">{i + 1}</Td>
                <Td>{isi(guruPerId[b.guruId]?.nama_lengkap)}</Td>
                <Td className="text-center">{isi(kelasPerId[b.kelasId]?.nama_kelas)}</Td>
                <Td className="text-center">{isi(b.jamJaga)}</Td>
                <Td>&nbsp;</Td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 flex justify-end text-[13px]">
          <div className="text-center">
            <p className="mb-16">Kepala Sekolah</p>
            <p className="font-semibold underline decoration-slate-300 underline-offset-4">({isi(sekolah.kepala, '________________________')})</p>
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
