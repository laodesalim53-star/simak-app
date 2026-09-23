// src/pages/BeritaAcaraUjian.jsx
//
// Berita acara pelaksanaan ujian per ruang. Ruang ujian = kelas VI (dari
// ambilGuruDanKelas), pengawas = guru aktif (dari ambilGuruDanKelas), nama
// sekolah & tempat = ambilProfilSekolah. Jumlah peserta & catatan kejadian
// tetap manual karena aplikasi belum punya tabel peserta/siswa.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Printer } from 'lucide-react'
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

// Sesuaikan kalau format `tingkat` di tabel kelas Anda berbeda (mis. "Kelas 6").
function isKelasEnam(k) {
  const t = String(k?.tingkat ?? '').trim().toUpperCase()
  return t === '6' || t === 'VI'
}

export default function BeritaAcaraUjian() {
  const { sekolahId } = useAuth()

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [tempatSekolah, setTempatSekolah] = useState('')
  const [guru, setGuru] = useState([])
  const [kelasEnam, setKelasEnam] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')

  const [form, setForm] = useState({
    mataPelajaran: 'Asesmen Sumatif',
    tanggal: isoHariIni(),
    ruangId: '',
    jumlahPeserta: '',
    jumlahHadir: '',
    jumlahTidakHadir: '',
    pengawas1Id: '',
    pengawas2Id: '',
    catatanKejadian: 'Ujian berlangsung tertib, tidak ada kejadian khusus.',
  })

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
      setTempatSekolah(ps.tempat)
      setGuru(urutkanGuru(gk.guru))
      const enam = gk.kelas.filter(isKelasEnam)
      setKelasEnam(enam)
      setForm((f) => ({ ...f, ruangId: f.ruangId || enam[0]?.id || '' }))
    } catch (e) {
      console.error('Gagal memuat data Berita Acara Ujian:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  const ubah = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const guruPerId = useMemo(() => {
    const m = {}
    guru.forEach((g) => { m[g.id] = g })
    return m
  }, [guru])

  const ruang = useMemo(() => kelasEnam.find((k) => k.id === form.ruangId), [kelasEnam, form.ruangId])

  // Guru wali kelas ruang ini tidak ditampilkan sebagai pengawas ruang itu sendiri.
  const pilihanPengawas = useMemo(
    () => guru.filter((g) => !ruang || g.id !== ruang.wali_kelas_id),
    [guru, ruang]
  )

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tapel = tahunPelajaranSekarang()
  const namaRuang = ruang?.nama_kelas || '…………'
  const pengawas1 = guruPerId[form.pengawas1Id]?.nama_lengkap || '…………'
  const pengawas2 = guruPerId[form.pengawas2Id]?.nama_lengkap || '…………'
  const hariTanggal = formatTanggalSK(form.tanggal)
  const tempatTanggal = `${isi(tempatSekolah, '…………')}, ${hariTanggal}`

  return (
    <Layout title="Berita Acara Ujian" subtitle="Berita acara pelaksanaan ujian per ruang, siap cetak.">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-cetak-ba, #area-cetak-ba * { visibility: visible; }
          #area-cetak-ba { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="no-print max-w-2xl mx-auto mb-5">
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

        <Bagian judul="Ruang & mata pelajaran">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Ruang ujian (kelas VI)">
              <select className={inputCls} value={form.ruangId} onChange={ubah('ruangId')}>
                {kelasEnam.length === 0 && <option value="">— tidak ada kelas VI —</option>}
                {kelasEnam.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                ))}
              </select>
            </Field>
            <Field label="Mata pelajaran / kegiatan">
              <input className={inputCls} value={form.mataPelajaran} onChange={ubah('mataPelajaran')} />
            </Field>
            <Field label="Tanggal">
              <input type="date" className={inputCls} value={form.tanggal} onChange={ubah('tanggal')} />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Jumlah peserta">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Terdaftar">
              <input className={inputCls} inputMode="numeric" value={form.jumlahPeserta} onChange={ubah('jumlahPeserta')} />
            </Field>
            <Field label="Hadir">
              <input className={inputCls} inputMode="numeric" value={form.jumlahHadir} onChange={ubah('jumlahHadir')} />
            </Field>
            <Field label="Tidak hadir">
              <input className={inputCls} inputMode="numeric" value={form.jumlahTidakHadir} onChange={ubah('jumlahTidakHadir')} />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Pengawas ruang" keterangan="Guru wali kelas ruang ini tidak ditampilkan (pengawasan silang).">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Pengawas I">
              <select className={inputCls} value={form.pengawas1Id} onChange={ubah('pengawas1Id')}>
                <option value="">— pilih guru —</option>
                {pilihanPengawas.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
            <Field label="Pengawas II">
              <select className={inputCls} value={form.pengawas2Id} onChange={ubah('pengawas2Id')}>
                <option value="">— pilih guru —</option>
                {pilihanPengawas.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Catatan kejadian">
          <Field label="Catatan selama ujian">
            <textarea className={inputCls} rows={3} value={form.catatanKejadian} onChange={ubah('catatanKejadian')} />
          </Field>
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

      <div id="area-cetak-ba" className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-[13.5px] leading-relaxed text-slate-800">
        <div className="text-center mb-6">
          <p className="font-display text-base font-bold">BERITA ACARA PELAKSANAAN UJIAN</p>
          <p>{namaSekolah} — Tahun Pelajaran {tapel}</p>
        </div>

        <p className="mb-4">
          Pada hari ini, <strong>{hariTanggal}</strong>, telah dilaksanakan {isi(form.mataPelajaran)} di{' '}
          <strong>Ruang {namaRuang}</strong>, {namaSekolah}, dengan rincian sebagai berikut:
        </p>

        <table className="w-full mb-4">
          <tbody>
            <Baris label="Jumlah peserta terdaftar" nilai={isi(form.jumlahPeserta)} />
            <Baris label="Jumlah peserta hadir" nilai={isi(form.jumlahHadir)} />
            <Baris label="Jumlah peserta tidak hadir" nilai={isi(form.jumlahTidakHadir)} />
            <Baris label="Pengawas ruang" nilai={`${pengawas1} & ${pengawas2}`} />
          </tbody>
        </table>

        <p className="mb-1 font-medium">Catatan kejadian selama ujian:</p>
        <p className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3">{isi(form.catatanKejadian)}</p>

        <p className="mb-10">
          Demikian berita acara ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
        </p>

        <div className="grid grid-cols-2 gap-6 text-center">
          <div>
            <p className="mb-16">Pengawas Ruang I</p>
            <p className="font-semibold underline decoration-slate-300 underline-offset-4">{pengawas1}</p>
          </div>
          <div>
            <p className="mb-16">Pengawas Ruang II</p>
            <p className="font-semibold underline decoration-slate-300 underline-offset-4">{pengawas2}</p>
          </div>
        </div>

        <p className="mt-10 text-right">{tempatTanggal}</p>
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
