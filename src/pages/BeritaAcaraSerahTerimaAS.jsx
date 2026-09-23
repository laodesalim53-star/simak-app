// src/pages/BeritaAcaraSerahTerimaAS.jsx
//
// Berita acara serah terima hasil pekerjaan AS (Asesmen Sumatif / ujian lain),
// mengikuti format kop surat resmi: Pemerintah Kabupaten > Dinas Pendidikan >
// Nama Sekolah > Kecamatan, lalu badan surat pihak pertama/pihak kedua dan
// saksi-saksi. Pola data & komponen mengikuti BeritaAcaraUjian.jsx yang sudah
// ada (CetakSK, ambilProfilSekolah, ambilGuruDanKelas, useAuth).
//
// CATATAN:
// - Field kop surat (kabupaten, dinas, kecamatan) dan alamat kantor otomatis
//   diisi dari tabel profil_sekolah (kolom kabupaten, dinas_pendidikan,
//   kecamatan, alamat) begitu halaman dibuka. Tetap bisa diubah manual di
//   form; perubahan manual TIDAK menimpa isian yang sudah diketik.
// - Logo kop: logo kabupaten (kiri) dan logo sekolah (kanan) diambil otomatis
//   dari profil_sekolah (kolom logo_kabupaten_path & logo_path, bucket storage
//   'profil-sekolah'). Kalau belum diunggah di Profil Sekolah, sisi itu kosong.
// - Bagian saksi-saksi pada dokumen contoh dibiarkan kosong (diisi tangan),
//   jadi di sini saksi boleh dipilih dari data guru ATAU dibiarkan kosong.
// - sekolahId diambil dari useAuth().sekolahId, dan kalau tidak tersedia
//   memakai useAuth().profil.sekolah_id (dua-duanya dicoba supaya aman).

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Printer } from 'lucide-react'
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

// --- Terbilang tahun (Indonesia), mis. 2025 -> "dua ribu dua puluh lima" ---
const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']

function angkaKeKata(n) {
  if (n < 12) return SATUAN[n]
  if (n < 20) return `${angkaKeKata(n - 10)} belas`
  if (n < 100) return `${angkaKeKata(Math.floor(n / 10))} puluh${n % 10 ? ' ' + angkaKeKata(n % 10) : ''}`
  if (n < 200) return `seratus${n % 100 ? ' ' + angkaKeKata(n % 100) : ''}`
  if (n < 1000) return `${angkaKeKata(Math.floor(n / 100))} ratus${n % 100 ? ' ' + angkaKeKata(n % 100) : ''}`
  if (n < 2000) return `seribu${n % 1000 ? ' ' + angkaKeKata(n % 1000) : ''}`
  return `${angkaKeKata(Math.floor(n / 1000))} ribu${n % 1000 ? ' ' + angkaKeKata(n % 1000) : ''}`
}

// Uraikan ISO date jadi bagian-bagian sesuai kalimat baku berita acara.
function uraikanTanggal(iso) {
  if (!iso) return { hari: '…………', tanggal: '……', bulan: '…………', tahunKata: '……………………' }
  const d = new Date(`${iso}T00:00:00`)
  const hari = d.toLocaleDateString('id-ID', { weekday: 'long' })
  const bulan = d.toLocaleDateString('id-ID', { month: 'long' })
  return {
    hari,
    tanggal: String(d.getDate()),
    bulan,
    tahunKata: angkaKeKata(d.getFullYear()),
  }
}

// Path file di bucket 'profil-sekolah' -> URL publik (kosong kalau tidak ada).
function urlLogo(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('profil-sekolah').getPublicUrl(path)
  return data?.publicUrl || ''
}

export default function BeritaAcaraSerahTerimaAS() {
  // Aman untuk dua bentuk AuthContext: ada `sekolahId` langsung, atau hanya
  // lewat profil.sekolah_id (seperti di ProfilSekolah.jsx).
  const { sekolahId: sekolahIdCtx, profil } = useAuth()
  const sekolahId = sekolahIdCtx || profil?.sekolah_id

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [tempatSekolah, setTempatSekolah] = useState('')
  const [guru, setGuru] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [logoSekolahUrl, setLogoSekolahUrl] = useState('')
  const [logoKabupatenUrl, setLogoKabupatenUrl] = useState('')

  const [form, setForm] = useState({
    namaPekerjaan: 'Asesmen Sumatif',
    tanggal: isoHariIni(),
    tempat: '',
    kabupaten: '',
    dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    kecamatan: '',
    alamatKantor: '',
    pihak1Id: '',
    pihak1Jabatan: 'Guru',
    pihak2Id: '',
    pihak2Jabatan: 'Guru',
    keperluan: '',
    saksi1Id: '',
    saksi2Id: '',
  })

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
      setTempatSekolah(ps.tempat)
      setGuru(urutkanGuru(gk.guru))
      setForm((f) => ({
        ...f,
        tempat: f.tempat || ps.tempat || '',
        kabupaten: f.kabupaten || prof.kabupaten || '',
        dinas: prof.dinas_pendidikan || f.dinas,
        kecamatan: f.kecamatan || prof.kecamatan || '',
        alamatKantor: f.alamatKantor || prof.alamat || '',
      }))
    } catch (e) {
      console.error('Gagal memuat data Berita Acara Serah Terima AS:', e)
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

  // Pihak 2 tidak boleh sama dengan pihak 1, begitu juga saksi 1 & 2.
  const pilihanPihak2 = useMemo(() => guru.filter((g) => g.id !== form.pihak1Id), [guru, form.pihak1Id])
  const pilihanPihak1 = useMemo(() => guru.filter((g) => g.id !== form.pihak2Id), [guru, form.pihak2Id])
  const pilihanSaksi2 = useMemo(() => guru.filter((g) => g.id !== form.saksi1Id), [guru, form.saksi1Id])
  const pilihanSaksi1 = useMemo(() => guru.filter((g) => g.id !== form.saksi2Id), [guru, form.saksi2Id])

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tapel = tahunPelajaranSekarang()
  const { hari, tanggal, bulan, tahunKata } = uraikanTanggal(form.tanggal)

  const pihak1 = guruPerId[form.pihak1Id]
  const pihak2 = guruPerId[form.pihak2Id]
  const saksi1 = guruPerId[form.saksi1Id]
  const saksi2 = guruPerId[form.saksi2Id]

  return (
    <Layout title="Berita Acara Serah Terima AS" subtitle="Serah terima hasil pekerjaan asesmen antar-guru, siap cetak.">
      <style>{`
        @page { size: A4; margin: 12mm 16mm; }
        @media print {
          body * { visibility: hidden; }
          #area-cetak-btas, #area-cetak-btas * { visibility: visible; }
          #area-cetak-btas {
            position: absolute; left: 0; top: 0; width: 100%;
            border: 0 !important; border-radius: 0 !important; padding: 0 !important;
            max-width: none !important; margin: 0 !important;
            font-family: 'Times New Roman', Times, serif;
            color: #000 !important;
          }
          #area-cetak-btas .garis-nama { text-decoration-color: #000 !important; }
          #area-cetak-btas .ttd-blok { page-break-inside: avoid; }
          #area-cetak-btas .kop-surat { border-bottom-color: #000 !important; }
          #area-cetak-btas * { color: #000 !important; }

          /* === MODE SATU HALAMAN === */
          /* Ukuran huruf cetak: turunkan ke 10.5pt / 10pt kalau isi masih meluber. */
          #area-cetak-btas { font-size: 11pt !important; line-height: 1.35 !important; break-inside: avoid; }
          #area-cetak-btas .kop-surat { padding-bottom: 6px !important; margin-bottom: 12px !important; }
          #area-cetak-btas .kop-logo { width: 64px !important; height: 64px !important; }
          #area-cetak-btas .judul-blok { margin-bottom: 12px !important; }
          #area-cetak-btas .isi-blok { margin-bottom: 8px !important; }
          #area-cetak-btas .ttd-jarak { margin-bottom: 44px !important; }
          #area-cetak-btas .ttd-grid { margin-bottom: 14px !important; }
          #area-cetak-btas .saksi-ttd { height: 36px !important; }
        }
        /* Kunci gambar kop supaya tidak kebawa aturan CSS global (position:fixed dll). */
        #area-cetak-btas .kop-logo img {
          position: static !important; float: none !important;
          display: block; max-width: 100%; max-height: 100%; object-fit: contain;
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
            <Field label="Nama pekerjaan / kegiatan yang diserahkan">
              <input className={inputCls} value={form.namaPekerjaan} onChange={ubah('namaPekerjaan')} />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Waktu & tempat">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tanggal">
              <input type="date" className={inputCls} value={form.tanggal} onChange={ubah('tanggal')} />
            </Field>
            <Field label="Tempat">
              <input className={inputCls} value={form.tempat} onChange={ubah('tempat')} />
            </Field>
            <Field label="Alamat kantor (kedua pihak)">
              <input className={inputCls} value={form.alamatKantor} onChange={ubah('alamatKantor')} />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Pihak pertama (menyerahkan)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nama">
              <select className={inputCls} value={form.pihak1Id} onChange={ubah('pihak1Id')}>
                <option value="">— pilih guru —</option>
                {pilihanPihak1.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
            <Field label="Jabatan">
              <input className={inputCls} value={form.pihak1Jabatan} onChange={ubah('pihak1Jabatan')} />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Pihak kedua (menerima)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nama">
              <select className={inputCls} value={form.pihak2Id} onChange={ubah('pihak2Id')}>
                <option value="">— pilih guru —</option>
                {pilihanPihak2.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
            <Field label="Jabatan">
              <input className={inputCls} value={form.pihak2Jabatan} onChange={ubah('pihak2Jabatan')} />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Keperluan" keterangan='Diisi mengikuti kalimat "…untuk di ………… (sesuai keperluan, seperti disimpan, digandakan dll)".'>
          <Field label="Untuk di …">
            <input className={inputCls} value={form.keperluan} onChange={ubah('keperluan')} placeholder="mis. disimpan sebagai arsip sekolah" />
          </Field>
        </Bagian>

        <Bagian judul="Saksi-saksi" keterangan="Boleh dikosongkan bila akan diisi tangan saat penandatanganan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Saksi 1">
              <select className={inputCls} value={form.saksi1Id} onChange={ubah('saksi1Id')}>
                <option value="">— kosongkan —</option>
                {pilihanSaksi1.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
            <Field label="Saksi 2">
              <select className={inputCls} value={form.saksi2Id} onChange={ubah('saksi2Id')}>
                <option value="">— kosongkan —</option>
                {pilihanSaksi2.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
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

      <div id="area-cetak-btas" className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-[13.5px] leading-relaxed text-slate-800">
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
          <p className="font-display text-base font-bold uppercase">Berita Acara</p>
          <p className="font-bold uppercase">Serah Terima Hasil Pekerjaan {form.namaPekerjaan}</p>
          <p>Tahun Pelajaran {tapel}</p>
        </div>

        <p className="isi-blok mb-4">
          Pada hari ini <strong>{hari}</strong>, Tanggal <strong>{tanggal}</strong> Bulan{' '}
          <strong>{bulan}</strong> Tahun <strong>{tahunKata}</strong> bertempat di{' '}
          <strong>{isi(form.tempat, '…………')}</strong>, telah dilakukan serah terima hasil pekerjaan{' '}
          {form.namaPekerjaan} oleh:
        </p>

        <div className="isi-blok mb-3">
          <table className="w-full">
            <tbody>
              <Baris label="1. Nama" nilai={isi(pihak1?.nama_lengkap)} />
              <Baris label="NIP" nilai={isi(pihak1?.nip)} />
              <Baris label="Jabatan" nilai={isi(form.pihak1Jabatan)} />
              <Baris label="Alamat Kantor" nilai={isi(form.alamatKantor)} />
            </tbody>
          </table>
          <p className="mt-1 ml-4">Selanjutnya disebut <strong>PIHAK PERTAMA</strong></p>
        </div>

        <div className="isi-blok mb-4">
          <table className="w-full">
            <tbody>
              <Baris label="2. Nama" nilai={isi(pihak2?.nama_lengkap)} />
              <Baris label="NIP" nilai={isi(pihak2?.nip)} />
              <Baris label="Jabatan" nilai={isi(form.pihak2Jabatan)} />
              <Baris label="Alamat Kantor" nilai={isi(form.alamatKantor)} />
            </tbody>
          </table>
          <p className="mt-1 ml-4">Selanjutnya disebut <strong>PIHAK KEDUA</strong></p>
        </div>

        <p className="mb-1 font-medium">Dengan ketentuan bahwa:</p>
        <ol className="isi-blok list-decimal ml-5 mb-6 space-y-1">
          <li>Pihak pertama menyerahkan kepada pihak kedua hasil pekerjaan {form.namaPekerjaan} sebagai rincian terlampir.</li>
          <li>
            Pihak kedua menerima hasil pekerjaan {form.namaPekerjaan} tersebut dengan penuh rasa tanggung jawab, untuk di{' '}
            {isi(form.keperluan, '…………')} (sesuai keperluan, seperti disimpan, digandakan dll).
          </li>
        </ol>

        <div className="ttd-blok">
          <div className="ttd-grid grid grid-cols-2 gap-6 text-center mb-8">
            <div>
              <p>PIHAK KEDUA</p>
              <p className="ttd-jarak mb-16">Yang menerima</p>
              <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
                {isi(pihak2?.nama_lengkap, '…………')}
              </p>
              <p>NIP. {isi(pihak2?.nip, '…………')}</p>
            </div>
            <div>
              <p>PIHAK PERTAMA</p>
              <p className="ttd-jarak mb-16">Yang Menyerahkan</p>
              <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
                {isi(pihak1?.nama_lengkap, '…………')}
              </p>
              <p>NIP. {isi(pihak1?.nip, '…………')}</p>
            </div>
          </div>

          <p className="text-center font-medium mb-4">SAKSI-SAKSI</p>
          <div className="grid grid-cols-2 gap-8">
            <BlokSaksi nomor={1} saksi={saksi1} />
            <BlokSaksi nomor={2} saksi={saksi2} />
          </div>
        </div>
      </div>
    </Layout>
  )
}

// Satu blok saksi: tiga kolom tetap (label | titik dua | isi) dan rata kiri,
// jadi teks panjang membungkus di kolom isi saja dan tidak menggeser baris lain.
function BlokSaksi({ nomor, saksi }) {
  return (
    <table className="w-full table-fixed text-left">
      <colgroup>
        <col style={{ width: '104px' }} />
        <col style={{ width: '12px' }} />
        <col />
      </colgroup>
      <tbody>
        <tr>
          <td className="py-1 align-top">{nomor}. Tanda Tangan</td>
          <td className="py-1 align-top">:</td>
          <td className="py-1 align-top">
            {/* ruang untuk tanda tangan tangan */}
            <div className="saksi-ttd h-12 border-b border-dotted border-slate-400" />
          </td>
        </tr>
        <tr>
          <td className="py-0.5 align-top">Nama</td>
          <td className="py-0.5 align-top">:</td>
          <td className="py-0.5 align-top break-words">{isi(saksi?.nama_lengkap, '')}</td>
        </tr>
        <tr>
          <td className="py-0.5 align-top">NIP</td>
          <td className="py-0.5 align-top">:</td>
          <td className="py-0.5 align-top break-words">{isi(saksi?.nip, '')}</td>
        </tr>
      </tbody>
    </table>
  )
}

function Baris({ label, nilai }) {
  return (
    <tr>
      <td className="py-0.5 pr-3 align-top text-slate-500 w-40">{label}</td>
      <td className="py-0.5 align-top">: {nilai}</td>
    </tr>
  )
}
