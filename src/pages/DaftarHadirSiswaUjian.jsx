// src/pages/DaftarHadirSiswaUjian.jsx
//
// Daftar hadir peserta ujian per ruang, mengikuti format kop surat resmi:
// Pemerintah Kabupaten > Dinas Pendidikan > Nama Sekolah > Kecamatan.
// Pola data & komponen mengikuti BeritaAcaraSerahTerimaAS.jsx yang sudah ada
// (CetakSK, ambilProfilSekolah, ambilGuruDanKelas, useAuth).
//
// CATATAN:
// - Field kop surat (kabupaten, dinas, kecamatan) dan alamat kantor otomatis
//   diisi dari tabel profil_sekolah (kolom kabupaten, dinas_pendidikan,
//   kecamatan, alamat) begitu halaman dibuka. Tetap bisa diubah manual di
//   form; perubahan manual TIDAK menimpa isian yang sudah diketik.
// - Logo kop: logo kabupaten (kiri) dan logo sekolah (kanan) diambil otomatis
//   dari profil_sekolah (kolom logo_kabupaten_path & logo_path, bucket
//   storage 'profil-sekolah'). Kalau belum diunggah di Profil Sekolah, sisi
//   itu kosong.
// - Pengawas I & II dipilih dari data guru (opsional, boleh dikosongkan dan
//   diisi tangan saat pelaksanaan), mengikuti pola pihak1/pihak2 pada berita
//   acara.
// - Daftar peserta diisi manual: bisa ditambah/dihapus baris satu-satu, atau
//   ditempel sekaligus lewat "Isi cepat" (format: No Peserta;Nama, satu
//   baris per peserta).
// - sekolahId diambil dari useAuth().sekolahId, dan kalau tidak tersedia
//   memakai useAuth().profil.sekolah_id (dua-duanya dicoba supaya aman).

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Printer, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import {
  BagianSK as Bagian,
  FieldSK as Field,
  SEKOLAH_KOSONG,
  ambilGuruDanKelas,
  ambilProfilSekolah,
  inputSK as inputCls,
  isi,
  isoHariIni,
  tahunPelajaranSekarang,
  urutkanGuru,
} from '../components/CetakSK'

const JUMLAH_BARIS_AWAL = 20

function barisKosong(n) {
  return Array.from({ length: n }, () => ({ noPeserta: '', nama: '' }))
}

// Path file di bucket 'profil-sekolah' -> URL publik (kosong kalau tidak ada).
function urlLogo(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('profil-sekolah').getPublicUrl(path)
  return data?.publicUrl || ''
}

export default function DaftarHadirSiswaUjian() {
  // Aman untuk dua bentuk AuthContext: ada `sekolahId` langsung, atau hanya
  // lewat profil.sekolah_id (seperti di ProfilSekolah.jsx).
  const { sekolahId: sekolahIdCtx, profil } = useAuth()
  const sekolahId = sekolahIdCtx || profil?.sekolah_id

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [guru, setGuru] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [logoSekolahUrl, setLogoSekolahUrl] = useState('')
  const [logoKabupatenUrl, setLogoKabupatenUrl] = useState('')

  const [form, setForm] = useState({
    kabupaten: '',
    dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    kecamatan: '',
    jenisUjian: 'Ujian Tulis / Praktek',
    tanggal: isoHariIni(),
    pukulMulai: '',
    pukulSelesai: '',
    mataPelajaran: '',
    ruang: '1 (Satu)',
    pengawas1Id: '',
    pengawas2Id: '',
  })

  const [siswa, setSiswa] = useState(barisKosong(JUMLAH_BARIS_AWAL))
  const [tempelCepat, setTempelCepat] = useState('')

  async function muat() {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, gk, profRes] = await Promise.all([
        ambilProfilSekolah(sekolahId),
        ambilGuruDanKelas(sekolahId),
        supabase
          .from('profil_sekolah')
          .select('kabupaten, dinas_pendidikan, kecamatan, alamat, logo_path, logo_kabupaten_path')
          .eq('sekolah_id', sekolahId)
          .maybeSingle(),
      ])
      const prof = profRes?.data || {}
      setLogoSekolahUrl(urlLogo(prof.logo_path))
      setLogoKabupatenUrl(urlLogo(prof.logo_kabupaten_path))
      setSekolah(ps.sekolah)
      setGuru(urutkanGuru(gk.guru))
      setForm((f) => ({
        ...f,
        kabupaten: f.kabupaten || prof.kabupaten || '',
        dinas: prof.dinas_pendidikan || f.dinas,
        kecamatan: f.kecamatan || prof.kecamatan || '',
      }))
    } catch (e) {
      console.error('Gagal memuat data Daftar Hadir Siswa:', e)
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

  // Pengawas II tidak boleh sama dengan Pengawas I, dan sebaliknya.
  const pilihanPengawas2 = useMemo(() => guru.filter((g) => g.id !== form.pengawas1Id), [guru, form.pengawas1Id])
  const pilihanPengawas1 = useMemo(() => guru.filter((g) => g.id !== form.pengawas2Id), [guru, form.pengawas2Id])

  const pengawas1 = guruPerId[form.pengawas1Id]
  const pengawas2 = guruPerId[form.pengawas2Id]

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tapel = tahunPelajaranSekarang()

  const hariTanggal = useMemo(() => {
    if (!form.tanggal) return ''
    const d = new Date(`${form.tanggal}T00:00:00`)
    const hari = d.toLocaleDateString('id-ID', { weekday: 'long' })
    const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    return `${hari}, ${tgl}`
  }, [form.tanggal])

  const pukul = form.pukulMulai && form.pukulSelesai
    ? `${form.pukulMulai} - ${form.pukulSelesai} WIT`
    : ''

  // --- Kelola baris peserta ---
  const ubahSiswa = (idx, k) => (e) => {
    const nilai = e.target.value
    setSiswa((arr) => arr.map((s, i) => (i === idx ? { ...s, [k]: nilai } : s)))
  }
  const tambahBaris = () => setSiswa((arr) => [...arr, { noPeserta: '', nama: '' }])
  const hapusBaris = (idx) => setSiswa((arr) => arr.filter((_, i) => i !== idx))

  function terapkanTempelCepat() {
    const baris = tempelCepat
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean)
      .map((b) => {
        const [noPeserta, ...sisa] = b.split(';')
        return { noPeserta: (noPeserta || '').trim(), nama: sisa.join(';').trim() }
      })
    if (baris.length) {
      setSiswa(baris)
      setTempelCepat('')
    }
  }

  return (
    <Layout title="Daftar Hadir Peserta Ujian" subtitle="Daftar hadir peserta ujian per ruang, siap cetak.">
      <style>{`
        @page { size: A4; margin: 12mm 16mm; }
        @media print {
          body * { visibility: hidden; }
          #area-cetak-hadir, #area-cetak-hadir * { visibility: visible; }
          #area-cetak-hadir {
            position: absolute; left: 0; top: 0; width: 100%;
            border: 0 !important; border-radius: 0 !important; padding: 0 !important;
            max-width: none !important; margin: 0 !important;
            font-family: 'Times New Roman', Times, serif;
            color: #000 !important;
          }
          #area-cetak-hadir .kop-surat { border-bottom-color: #000 !important; }
          #area-cetak-hadir .ttd-blok { page-break-inside: avoid; }
          #area-cetak-hadir * { color: #000 !important; }
          #area-cetak-hadir table { border-color: #000 !important; }
          #area-cetak-hadir th, #area-cetak-hadir td { border-color: #000 !important; }

          /* === MODE SATU HALAMAN === */
          /* Ukuran huruf cetak: turunkan lagi kalau isi masih meluber. */
          #area-cetak-hadir { font-size: 10.5pt !important; line-height: 1.3 !important; break-inside: avoid; }
          #area-cetak-hadir .kop-surat { padding-bottom: 6px !important; margin-bottom: 10px !important; }
          #area-cetak-hadir .kop-logo { width: 60px !important; height: 60px !important; }
          #area-cetak-hadir .judul-blok { margin-bottom: 10px !important; }
          #area-cetak-hadir .info-blok { margin-bottom: 8px !important; }
          #area-cetak-hadir td, #area-cetak-hadir th { padding: 2px 6px !important; }
        }
        /* Kunci gambar kop supaya tidak kebawa aturan CSS global (position:fixed dll). */
        #area-cetak-hadir .kop-logo img {
          position: static !important; float: none !important;
          display: block; max-width: 100%; max-height: 100%; object-fit: contain;
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

        <Bagian judul="Kop surat" keterangan="Terisi otomatis dari Profil Sekolah; bisa diubah di sini, kosongkan yang tidak perlu ditampilkan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Pemerintah Kabupaten/Kota">
              <input className={inputCls} value={form.kabupaten} onChange={ubah('kabupaten')} placeholder="PEMERINTAH KABUPATEN …" />
            </Field>
            <Field label="Dinas">
              <input className={inputCls} value={form.dinas} onChange={ubah('dinas')} />
            </Field>
            <Field label="Kecamatan">
              <input className={inputCls} value={form.kecamatan} onChange={ubah('kecamatan')} placeholder="KECAMATAN …" />
            </Field>
            <Field label="Jenis ujian">
              <input className={inputCls} value={form.jenisUjian} onChange={ubah('jenisUjian')} placeholder="Ujian Tulis / Praktek" />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Waktu & pelaksanaan">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tanggal">
              <input type="date" className={inputCls} value={form.tanggal} onChange={ubah('tanggal')} />
            </Field>
            <Field label="Mata pelajaran">
              <input className={inputCls} value={form.mataPelajaran} onChange={ubah('mataPelajaran')} placeholder="mis. Ilmu Pengetahuan Sosial" />
            </Field>
            <Field label="Pukul mulai">
              <input type="time" className={inputCls} value={form.pukulMulai} onChange={ubah('pukulMulai')} />
            </Field>
            <Field label="Pukul selesai">
              <input type="time" className={inputCls} value={form.pukulSelesai} onChange={ubah('pukulSelesai')} />
            </Field>
            <Field label="Ruang">
              <input className={inputCls} value={form.ruang} onChange={ubah('ruang')} placeholder="mis. 1 (Satu)" />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Pengawas ruang" keterangan="Boleh dikosongkan bila akan diisi tangan saat pelaksanaan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Pengawas I">
              <select className={inputCls} value={form.pengawas1Id} onChange={ubah('pengawas1Id')}>
                <option value="">— pilih guru —</option>
                {pilihanPengawas1.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
            <Field label="Pengawas II">
              <select className={inputCls} value={form.pengawas2Id} onChange={ubah('pengawas2Id')}>
                <option value="">— pilih guru —</option>
                {pilihanPengawas2.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Daftar peserta" keterangan="Tambah/hapus baris satu-satu, atau tempel sekaligus (format: No Peserta;Nama, satu baris per peserta).">
          <div className="mb-3">
            <textarea
              className={`${inputCls} min-h-[80px]`}
              value={tempelCepat}
              onChange={(e) => setTempelCepat(e.target.value)}
              placeholder={'09-0038-0001-8;Abdul Rahman Djutay\n09-0038-0002-7;Marda Surey'}
            />
            <button
              type="button"
              onClick={terapkanTempelCepat}
              className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Terapkan tempelan ke daftar
            </button>
          </div>

          <div className="space-y-2">
            {siswa.map((s, idx) => (
              <div key={idx} className="grid grid-cols-[2.5rem_1fr_2fr_auto] items-center gap-2">
                <span className="text-sm text-slate-500 text-center">{idx + 1}</span>
                <input
                  className={inputCls}
                  value={s.noPeserta}
                  onChange={ubahSiswa(idx, 'noPeserta')}
                  placeholder="No. Peserta"
                />
                <input
                  className={inputCls}
                  value={s.nama}
                  onChange={ubahSiswa(idx, 'nama')}
                  placeholder="Nama peserta"
                />
                <button
                  type="button"
                  onClick={() => hapusBaris(idx)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Hapus baris"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={tambahBaris}
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={14} /> Tambah baris
          </button>
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

      <div id="area-cetak-hadir" className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-[13px] leading-relaxed text-slate-800">
        <div className="kop-surat flex items-center gap-3 border-b-2 border-slate-800 pb-3 mb-6">
          {/* Logo kiri: kabupaten. Kotak tetap ada walau kosong supaya teks tetap di tengah. */}
          <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
            {logoKabupatenUrl && (
              <img
                src={logoKabupatenUrl}
                alt="Logo kabupaten"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
          </div>
          <div className="flex-1 text-center">
            {form.kabupaten && <p className="font-bold uppercase tracking-wide">{form.kabupaten}</p>}
            {form.dinas && <p className="font-bold uppercase tracking-wide">{form.dinas}</p>}
            <p className="font-bold uppercase tracking-wide text-base">{namaSekolah}</p>
            {form.kecamatan && <p className="font-bold uppercase tracking-wide">{form.kecamatan}</p>}
          </div>
          {/* Logo kanan: sekolah. */}
          <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
            {logoSekolahUrl && (
              <img
                src={logoSekolahUrl}
                alt="Logo sekolah"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
          </div>
        </div>

        <div className="judul-blok text-center mb-6">
          <p className="font-display text-base font-bold uppercase">Daftar Hadir Peserta</p>
          <p className="font-bold uppercase">{form.jenisUjian} Tahun Pelajaran {tapel}</p>
        </div>

        <div className="info-blok grid grid-cols-2 gap-x-8 gap-y-1 mb-4">
          <p>Hari / Tanggal : <strong>{isi(hariTanggal, '…………')}</strong></p>
          <p>Mata Pelajaran : <strong>{isi(form.mataPelajaran, '…………')}</strong></p>
          <p>Pukul : <strong>{isi(pukul, '…………')}</strong></p>
          <p>Ruang : <strong>{isi(form.ruang, '…………')}</strong></p>
        </div>

        <table className="w-full border-collapse mb-6">
          <thead>
            <tr>
              <Th className="w-10">No</Th>
              <Th className="w-40">No Peserta Ujian</Th>
              <Th>Nama Peserta</Th>
              <Th className="w-32">Tanda Tangan</Th>
            </tr>
          </thead>
          <tbody>
            {siswa.map((s, i) => (
              <tr key={i}>
                <Td className="text-center">{i + 1}</Td>
                <Td>{isi(s.noPeserta, '')}</Td>
                <Td>{isi(s.nama, '')}</Td>
                <Td className="text-center text-slate-400">{i + 1}.</Td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-8 text-[12.5px]">
          <p className="mb-1 font-medium">Catatan :</p>
          <ol className="list-decimal ml-5 space-y-0.5">
            <li>Pengawas ruang menuliskan Nomor dan Nama Peserta dengan lengkap.</li>
            <li>Pengawas ruang menyilang Nama Peserta yang tidak hadir.</li>
          </ol>
        </div>

        <div className="ttd-blok grid grid-cols-2 gap-8 text-center">
          <div>
            <p className="font-medium mb-10">Pengawas I</p>
            <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
              {isi(pengawas1?.nama_lengkap, '…………')}
            </p>
            <p>NIP. {isi(pengawas1?.nip, '…………')}</p>
          </div>
          <div>
            <p className="font-medium mb-10">Pengawas II</p>
            <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
              {isi(pengawas2?.nama_lengkap, '…………')}
            </p>
            <p>NIP. {isi(pengawas2?.nip, '…………')}</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function Th({ children, className = '' }) {
  return <th className={`border border-slate-300 px-2 py-1.5 text-left font-semibold ${className}`}>{children}</th>
}
function Td({ children, className = '' }) {
  return <td className={`border border-slate-300 px-2 py-1.5 ${className}`}>{children}</td>
}
