import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Plus, Printer, RefreshCw, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// ─────────────────────────────────────────────────────────────────────────────
// SK Beban Mengajar — halaman anak dari GudangSK (route: /gudang-sk/beban-mengajar)
//
// Data diimpor otomatis (pola sama dengan LaporanKepangkatanGuru.jsx dan Kelas.jsx):
//   • profil_sekolah → kop, alamat, kepala sekolah, NIP kepala sekolah, logo
//   • guru (status aktif) → nama, NIP, tugas tambahan
//   • kelas → wali kelas tiap guru (kolom wali_kelas_id)
//
// Aturan baris Lampiran:
//   1. Kepala Sekolah SELALU di baris paling atas, jam = jam default (24),
//      diisi sebagai tugas tambahan.
//   2. Guru lain diurutkan golongan tertinggi dulu, lalu abjad — sama seperti
//      laporan kepangkatan/nominatif.
//   3. Setiap guru otomatis diberi jam default (24 jam / minggu). Kalau guru itu
//      wali kelas di menu Kelas, kolom Kelas terisi nama kelasnya dan Mata
//      Pelajaran terisi "Guru Kelas".
// Semua isian tetap bisa diubah manual setelah diimpor.
// ─────────────────────────────────────────────────────────────────────────────

const JAM_DEFAULT = '24'

let penghitungId = 0
const barisBaru = () => ({
  id: ++penghitungId,
  nama: '',
  nip: '',
  mapel: '',
  kelas: '',
  jam: '',
  tambahan: '',
  ket: '',
})

function tahunPelajaranSekarang() {
  const t = new Date()
  const y = t.getFullYear()
  return t.getMonth() + 1 >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

function isoHariIni() {
  const t = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`
}

function formatTanggal(iso) {
  if (!iso) return '…………'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const pecahBaris = (teks) =>
  teks
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

const isi = (v, pengganti = '…………') => (v && String(v).trim() ? v : pengganti)

// {tahun} diganti otomatis dengan isi kolom "Tahun pelajaran" saat dokumen dirender,
// jadi mengubah tahun pelajaran ikut mengubah teks Menimbang/Mengingat.
const MENIMBANG_AWAL = [
  'bahwa untuk kelancaran pelaksanaan kegiatan belajar mengajar pada Tahun Pelajaran {tahun}, perlu dilakukan pembagian tugas mengajar guru;',
  'bahwa guru yang namanya tercantum dalam Lampiran Keputusan ini dinilai memenuhi syarat dan mampu melaksanakan tugas tersebut;',
  'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala Sekolah tentang Pembagian Tugas Mengajar Guru.',
].join('\n')

// Dasar hukum bawaan — SESUAIKAN dengan aturan yang berlaku di lembaga Anda
// (misalnya madrasah di bawah Kemenag memakai dasar hukum yang berbeda).
const MENGINGAT_AWAL = [
  'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
  'Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen;',
  'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan, sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 4 Tahun 2022;',
  'Peraturan Menteri Pendidikan dan Kebudayaan Nomor 15 Tahun 2018 tentang Pemenuhan Beban Kerja Guru, Kepala Sekolah, dan Pengawas Sekolah;',
  'Kalender pendidikan dan struktur kurikulum sekolah Tahun Pelajaran {tahun}.',
].join('\n')

// ─── Impor data ──────────────────────────────────────────────────────────────
// Deteksi & urutan disalin dari LaporanKepangkatanGuru.jsx supaya konsisten.
function isKepalaSekolah(g) {
  const jabatan = `${g.tugas_tambahan || ''} ${g.jenis_ptk || ''}`.toLowerCase()
  return jabatan.includes('kepala sekolah')
}

function peringkatGolongan(teks) {
  if (!teks) return 0
  const cocok = teks.toUpperCase().match(/(IX|VIII|VII|VI|IV|III|II|I|V)[\s./-]?([A-D])?/)
  if (!cocok) return 0
  const romawi = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 }
  const huruf = cocok[2] ? cocok[2].charCodeAt(0) - 64 : 0
  return (romawi[cocok[1]] || 0) * 10 + huruf
}

function urutkanGuru(daftar) {
  return [...daftar].sort((a, b) => {
    const aKS = isKepalaSekolah(a) ? 0 : 1
    const bKS = isKepalaSekolah(b) ? 0 : 1
    if (aKS !== bKS) return aKS - bKS
    const selisih = peringkatGolongan(b.pangkat_golongan) - peringkatGolongan(a.pangkat_golongan)
    if (selisih !== 0) return selisih
    return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '')
  })
}

function formatKabupaten(teks) {
  if (!teks) return ''
  return teks
    .replace(/^PEMERINTAH\s+KABUPATEN\s+/i, '')
    .replace(/^KABUPATEN\s+/i, '')
    .trim()
}

async function ambilDataSekolah(sekolahId) {
  const [rs, rg, rk] = await Promise.all([
    supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
    supabase
      .from('guru')
      .select('id, nip, nama_lengkap, pangkat_golongan, tugas_tambahan, jenis_ptk, status')
      .eq('sekolah_id', sekolahId)
      .eq('status', 'aktif'),
    supabase
      .from('kelas')
      .select('id, nama_kelas, tingkat, wali_kelas_id')
      .eq('sekolah_id', sekolahId)
      .order('nama_kelas'),
  ])

  const galat = rs.error || rg.error || rk.error
  if (galat) throw galat

  let logoUrl = ''
  if (rs.data?.logo_path) {
    const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(rs.data.logo_path)
    logoUrl = pub?.publicUrl || ''
  }

  return { profil: rs.data || null, guru: rg.data || [], kelas: rk.data || [], logoUrl }
}

function susunBaris(guru, kelas, profil, jam) {
  // Peta: id guru → daftar nama kelas yang dia walikan
  const kelasPerGuru = {}
  kelas.forEach((k) => {
    if (!k.wali_kelas_id) return
    if (!kelasPerGuru[k.wali_kelas_id]) kelasPerGuru[k.wali_kelas_id] = []
    kelasPerGuru[k.wali_kelas_id].push(k.nama_kelas)
  })

  const baris = urutkanGuru(guru).map((g) => {
    if (isKepalaSekolah(g)) {
      return {
        ...barisBaru(),
        nama: g.nama_lengkap || '',
        nip: g.nip || '',
        mapel: 'Kepala Sekolah',
        kelas: '-',
        jam: String(jam),
        tambahan: 'Tugas tambahan Kepala Sekolah',
      }
    }
    const kls = kelasPerGuru[g.id] || []
    return {
      ...barisBaru(),
      nama: g.nama_lengkap || '',
      nip: g.nip || '',
      mapel: kls.length ? 'Guru Kelas' : '',
      kelas: kls.join(', '),
      jam: String(jam),
      tambahan: g.tugas_tambahan || '',
    }
  })

  // Kepala sekolah belum ada di Data Guru → tetap ditaruh paling atas dari Profil Sekolah.
  if (!guru.some(isKepalaSekolah) && profil?.kepala_sekolah) {
    baris.unshift({
      ...barisBaru(),
      nama: profil.kepala_sekolah,
      nip: profil.nip_kepala_sekolah || '',
      mapel: 'Kepala Sekolah',
      kelas: '-',
      jam: String(jam),
      tambahan: 'Tugas tambahan Kepala Sekolah',
    })
  }

  return baris.length ? baris : [barisBaru(), barisBaru(), barisBaru()]
}

// ─── CSS dokumen + cetak ─────────────────────────────────────────────────────
// Saat cetak, semua anak langsung <body> disembunyikan kecuali portal dokumen.
// Cara ini tahan terhadap Layout yang punya sidebar / tinggi layar tetap, yang
// biasanya membuat hasil cetak terpotong di halaman pertama.
const CSS = `
.area-cetak-portal { display: none; }

.kertas {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto 16px;
  padding: 20mm 22mm;
  background: #fff;
  color: #000;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18), 0 8px 24px rgba(15, 23, 42, 0.08);
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.45;
  box-sizing: border-box;
}
.kertas p { margin: 0; }

.sk-kop { display: flex; align-items: center; gap: 12px; border-bottom: 3px double #000; padding-bottom: 6px; margin-bottom: 14px; }
.sk-kop-logo { width: 20mm; height: 20mm; object-fit: contain; flex: none; }
.sk-kop-teks { flex: 1; text-align: center; }
.sk-kop-atas { font-size: 12pt; font-weight: 700; text-transform: uppercase; }
.sk-kop-nama { font-size: 15pt; font-weight: 700; text-transform: uppercase; line-height: 1.25; }
.sk-kop-alamat { font-size: 10.5pt; }

.sk-judul { text-align: center; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
.sk-judul .tentang { margin: 4px 0; }

.sk-def { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
.sk-def td { vertical-align: top; padding: 0 0 4px; }
.sk-def td.k { width: 30mm; }
.sk-def td.t { width: 5mm; }
.sk-def tr { page-break-inside: avoid; }

.sk-item { display: flex; }
.sk-item .no { width: 8mm; flex: none; }
.sk-item .isi { text-align: justify; }
.sk-justify { text-align: justify; }

.sk-tengah { text-align: center; font-weight: 700; text-transform: uppercase; margin: 10px 0; }

.sk-ttd { margin-left: 52%; margin-top: 18px; page-break-inside: avoid; }
.sk-ttd table { border-collapse: collapse; }
.sk-ttd td { padding: 0 6px 0 0; vertical-align: top; }
.sk-ttd .ruang { height: 20mm; }

.sk-meta { border-collapse: collapse; margin-left: 50%; margin-bottom: 14px; font-size: 11pt; }
.sk-meta td { vertical-align: top; padding: 0 6px 0 0; }

.sk-tabel { width: 100%; border-collapse: collapse; font-size: 11pt; }
.sk-tabel th, .sk-tabel td { border: 1px solid #000; padding: 5px 6px; vertical-align: top; }
.sk-tabel th { text-align: center; font-weight: 700; vertical-align: middle; }
.sk-tabel thead { display: table-header-group; }
.sk-tabel tr { page-break-inside: avoid; }
.sk-tabel td.c { text-align: center; }
.sk-tabel .nip { font-size: 10pt; }

@media print {
  @page { size: A4; margin: 18mm 20mm; }
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body > *:not(.area-cetak-portal) { display: none !important; }
  .area-cetak-portal { display: block !important; }
  .kertas {
    width: auto;
    min-height: 0;
    margin: 0;
    padding: 0;
    box-shadow: none;
  }
  .kertas:not(:last-child) { page-break-after: always; }
}
`

// ─── Dokumen (dipakai untuk pratinjau layar DAN portal cetak) ────────────────
function Daftar({ items, gaya }) {
  return items.map((teks, i) => (
    <div key={i} className="sk-item">
      <span className="no">{gaya === 'huruf' ? `${String.fromCharCode(97 + i)}.` : `${i + 1}.`}</span>
      <span className="isi">{teks}</span>
    </div>
  ))
}

function BlokTTD({ sk, sekolah }) {
  return (
    <div className="sk-ttd">
      <table>
        <tbody>
          <tr>
            <td>Ditetapkan di</td>
            <td>: {isi(sk.tempat)}</td>
          </tr>
          <tr>
            <td>Pada tanggal</td>
            <td>: {formatTanggal(sk.tanggal)}</td>
          </tr>
        </tbody>
      </table>
      <p style={{ marginTop: 6 }}>Kepala {isi(sekolah.nama, 'Sekolah')},</p>
      <div className="ruang" />
      <p>
        <strong>
          <u>{isi(sekolah.kepala, 'Nama Kepala Sekolah')}</u>
        </strong>
      </p>
      <p>NIP. {isi(sekolah.nipKepala)}</p>
    </div>
  )
}

function DokumenSK({ sk, sekolah, baris, menimbang, mengingat }) {
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tp = isi(sk.tahunPelajaran)
  const gantiTahun = (teks) => teks.replace(/\{tahun\}/g, tp)
  const total = baris.reduce((a, r) => a + (parseFloat(String(r.jam).replace(',', '.')) || 0), 0)
  const totalTeks = Number.isInteger(total) ? String(total) : total.toFixed(1)
  const judulPanjang = `Pembagian Tugas Mengajar Guru pada ${namaSekolah} Tahun Pelajaran ${tp}`
  const barisKop = pecahBaris(sekolah.kopAtas || '')

  const diktum = [
    ['KESATU', `Menugaskan guru yang namanya tercantum dalam Lampiran Keputusan ini untuk melaksanakan tugas mengajar pada ${namaSekolah} Tahun Pelajaran ${tp} sesuai dengan mata pelajaran, kelas, dan jumlah jam pelajaran sebagaimana tercantum dalam Lampiran.`],
    ['KEDUA', `Beban kerja guru sebagaimana dimaksud pada diktum KESATU paling sedikit ${isi(sk.minimalJam, '24')} (jam tatap muka) per minggu, termasuk tugas tambahan yang diakui sebagai ekuivalen jam mengajar.`],
    ['KETIGA', 'Dalam melaksanakan tugasnya, guru wajib merencanakan, melaksanakan, dan menilai pembelajaran, membimbing peserta didik, serta melaporkan pelaksanaan tugasnya kepada Kepala Sekolah.'],
    ['KEEMPAT', `Segala biaya yang timbul akibat ditetapkannya Keputusan ini dibebankan pada ${isi(sk.sumberDana, 'anggaran sekolah')}.`],
    ['KELIMA', 'Keputusan ini mulai berlaku pada tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.'],
  ]

  return (
    <>
      {/* ── Halaman 1: Keputusan ── */}
      <div className="kertas">
        <div className="sk-kop">
          {sekolah.logoUrl && <img src={sekolah.logoUrl} alt="Logo sekolah" className="sk-kop-logo" />}
          <div className="sk-kop-teks">
            {barisKop.map((teks, i) => (
              <div key={i} className="sk-kop-atas">
                {teks}
              </div>
            ))}
            <div className="sk-kop-nama">{namaSekolah}</div>
            {sekolah.npsn && <div className="sk-kop-alamat">NPSN: {sekolah.npsn}</div>}
            {sekolah.alamat && <div className="sk-kop-alamat">{sekolah.alamat}</div>}
          </div>
        </div>

        <div className="sk-judul">
          <p>Keputusan Kepala {namaSekolah}</p>
          <p>Nomor: {isi(sk.nomor)}</p>
          <p className="tentang">Tentang</p>
          <p>{judulPanjang}</p>
        </div>

        <p className="sk-tengah" style={{ marginTop: 4 }}>
          Kepala {namaSekolah},
        </p>

        <table className="sk-def">
          <tbody>
            <tr>
              <td className="k">Menimbang</td>
              <td className="t">:</td>
              <td>
                <Daftar items={pecahBaris(menimbang).map(gantiTahun)} gaya="huruf" />
              </td>
            </tr>
            <tr>
              <td className="k">Mengingat</td>
              <td className="t">:</td>
              <td>
                <Daftar items={pecahBaris(mengingat).map(gantiTahun)} gaya="angka" />
              </td>
            </tr>
          </tbody>
        </table>

        <p className="sk-tengah">Memutuskan:</p>

        <table className="sk-def">
          <tbody>
            <tr>
              <td className="k">Menetapkan</td>
              <td className="t">:</td>
              <td className="sk-justify">
                KEPUTUSAN KEPALA {namaSekolah.toUpperCase()} TENTANG {judulPanjang.toUpperCase()}.
              </td>
            </tr>
            {diktum.map(([label, teks]) => (
              <tr key={label}>
                <td className="k">{label}</td>
                <td className="t">:</td>
                <td className="sk-justify">{teks}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <BlokTTD sk={sk} sekolah={sekolah} />
      </div>

      {/* ── Halaman 2: Lampiran ── */}
      <div className="kertas">
        <table className="sk-meta">
          <tbody>
            <tr>
              <td>LAMPIRAN</td>
              <td>: Keputusan Kepala {namaSekolah}</td>
            </tr>
            <tr>
              <td>NOMOR</td>
              <td>: {isi(sk.nomor)}</td>
            </tr>
            <tr>
              <td>TANGGAL</td>
              <td>: {formatTanggal(sk.tanggal)}</td>
            </tr>
          </tbody>
        </table>

        <div className="sk-judul">
          <p>Pembagian Tugas Mengajar Guru</p>
          <p>Tahun Pelajaran {tp}</p>
        </div>

        <table className="sk-tabel">
          <thead>
            <tr>
              <th style={{ width: '8mm' }}>No</th>
              <th>Nama / NIP</th>
              <th>Mata Pelajaran / Tugas</th>
              <th style={{ width: '16mm' }}>Kelas</th>
              <th style={{ width: '16mm' }}>Jam / Minggu</th>
              <th>Tugas Tambahan</th>
              <th>Ket.</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((r, i) => (
              <tr key={r.id}>
                <td className="c">{i + 1}</td>
                <td>
                  {r.nama || '\u00A0'}
                  {r.nip && (
                    <>
                      <br />
                      <span className="nip">NIP. {r.nip}</span>
                    </>
                  )}
                </td>
                <td>{r.mapel}</td>
                <td className="c">{r.kelas}</td>
                <td className="c">{r.jam}</td>
                <td>{r.tambahan}</td>
                <td>{r.ket}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>
                Jumlah jam
              </td>
              <td className="c" style={{ fontWeight: 700 }}>
                {totalTeks}
              </td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>

        <BlokTTD sk={sk} sekolah={sekolah} />
      </div>
    </>
  )
}

// ─── Komponen formulir kecil (di luar komponen utama agar input tidak
// kehilangan fokus setiap kali state berubah) ────────────────────────────────
const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300'

function Field({ label, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  )
}

function Bagian({ judul, keterangan, aksi, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-sm sm:text-[15px] font-semibold text-slate-900">{judul}</h3>
          {keterangan && <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5">{keterangan}</p>}
        </div>
        {aksi}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

// ─── Halaman ─────────────────────────────────────────────────────────────────
export default function SKBebanMengajar() {
  const { sekolahId } = useAuth()
  const tpAwal = tahunPelajaranSekarang()

  const [sekolah, setSekolah] = useState({
    kopAtas: '',
    nama: '',
    npsn: '',
    alamat: '',
    kepala: '',
    nipKepala: '',
    logoUrl: '',
  })
  const [sk, setSk] = useState({
    nomor: '',
    tahunPelajaran: tpAwal,
    tempat: '',
    tanggal: isoHariIni(),
    minimalJam: JAM_DEFAULT,
    sumberDana: 'Dana BOS dan sumber lain yang sah',
  })
  const [menimbang, setMenimbang] = useState(MENIMBANG_AWAL)
  const [mengingat, setMengingat] = useState(MENGINGAT_AWAL)
  const [baris, setBaris] = useState(() => [barisBaru(), barisBaru(), barisBaru()])

  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [ringkas, setRingkas] = useState('')

  // Ambil Profil Sekolah + Guru + Kelas, lalu isi kop dan daftar Lampiran.
  async function muatDariData(jam) {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const { profil, guru, kelas, logoUrl } = await ambilDataSekolah(sekolahId)
      const kepsekGuru = guru.find(isKepalaSekolah)
      const kab = formatKabupaten(profil?.kabupaten)

      setSekolah({
        kopAtas: [kab ? `Pemerintah Kabupaten ${kab}` : '', profil?.dinas_pendidikan || 'Dinas Pendidikan']
          .filter(Boolean)
          .join('\n'),
        nama: profil?.nama_sekolah || '',
        npsn: profil?.npsn || '',
        alamat:
          [profil?.alamat, profil?.kecamatan, profil?.kabupaten, profil?.provinsi].filter(Boolean).join(', ') +
          (profil?.kode_pos ? ` ${profil.kode_pos}` : ''),
        kepala: profil?.kepala_sekolah || kepsekGuru?.nama_lengkap || '',
        nipKepala: profil?.nip_kepala_sekolah || kepsekGuru?.nip || '',
        logoUrl,
      })

      // Hanya tempat_ttd — kolom kecamatan berisi teks kop lengkap ("KECAMATAN ..."),
      // kurang pantas dipakai sebagai "Ditetapkan di".
      const tempatBaru = profil?.tempat_ttd || ''
      if (tempatBaru) setSk((s) => ({ ...s, tempat: s.tempat || tempatBaru }))

      setBaris(susunBaris(guru, kelas, profil, jam))
      setRingkas(`${guru.length} guru aktif dan ${kelas.length} kelas terbaca.`)
    } catch (e) {
      console.error('Gagal memuat data SK Beban Mengajar:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    muatDariData(JAM_DEFAULT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  function imporUlang() {
    const yakin = window.confirm(
      'Ganti seluruh daftar guru di Lampiran dengan data terbaru dari Data Guru dan Kelas? Perubahan manual pada daftar akan hilang.'
    )
    if (yakin) muatDariData(sk.minimalJam || JAM_DEFAULT)
  }

  const ubahSekolah = (k) => (e) => setSekolah((s) => ({ ...s, [k]: e.target.value }))
  const ubahSk = (k) => (e) => setSk((s) => ({ ...s, [k]: e.target.value }))
  const ubahBaris = (id, k, v) =>
    setBaris((list) => list.map((r) => (r.id === id ? { ...r, [k]: v } : r)))
  const tambahBaris = () => setBaris((list) => [...list, barisBaru()])
  const hapusBaris = (id) => setBaris((list) => (list.length > 1 ? list.filter((r) => r.id !== id) : list))

  const dokumen = (
    <DokumenSK sk={sk} sekolah={sekolah} baris={baris} menimbang={menimbang} mengingat={mengingat} />
  )

  return (
    <Layout
      title="SK Beban Mengajar"
      subtitle="Data sekolah, guru, dan wali kelas diambil otomatis. Periksa isiannya, lalu cetak. Dokumen terdiri dari Keputusan dan Lampiran."
    >
      <style>{CSS}</style>

      <div>
        <Link
          to="/gudang-sk"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
        >
          <ArrowLeft size={15} /> Kembali ke Gudang SK
        </Link>

        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah, guru, dan kelas…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data belum bisa dibaca ({galat}). Isian di bawah bisa diisi manual, atau coba impor ulang.
          </div>
        )}
        {!memuat && !galat && ringkas && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {ringkas} Kepala Sekolah ditaruh di baris pertama Lampiran.
          </div>
        )}

        <Bagian judul="Data SK" keterangan="Nomor, tahun pelajaran, dan tempat/tanggal penetapan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Nomor SK">
              <input className={inputCls} value={sk.nomor} onChange={ubahSk('nomor')} placeholder="mis. 001/SK/2026" />
            </Field>
            <Field label="Tahun pelajaran">
              <input className={inputCls} value={sk.tahunPelajaran} onChange={ubahSk('tahunPelajaran')} placeholder="2026/2027" />
            </Field>
            <Field label="Jam tatap muka / minggu (per guru)">
              <input className={inputCls} value={sk.minimalJam} onChange={ubahSk('minimalJam')} inputMode="numeric" />
            </Field>
            <Field label="Ditetapkan di">
              <input className={inputCls} value={sk.tempat} onChange={ubahSk('tempat')} placeholder="Nama kota/kabupaten" />
            </Field>
            <Field label="Pada tanggal">
              <input type="date" className={inputCls} value={sk.tanggal} onChange={ubahSk('tanggal')} />
            </Field>
            <Field label="Sumber biaya">
              <input className={inputCls} value={sk.sumberDana} onChange={ubahSk('sumberDana')} />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Kop dan pejabat penandatangan"
          keterangan="Diambil dari Profil Sekolah. Tampil di kop surat dan blok tanda tangan."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Baris atas kop (satu baris per garis)" className="sm:col-span-2">
              <textarea className={inputCls} rows={2} value={sekolah.kopAtas} onChange={ubahSekolah('kopAtas')} />
            </Field>
            <Field label="Nama sekolah">
              <input className={inputCls} value={sekolah.nama} onChange={ubahSekolah('nama')} />
            </Field>
            <Field label="NPSN">
              <input className={inputCls} value={sekolah.npsn} onChange={ubahSekolah('npsn')} inputMode="numeric" />
            </Field>
            <Field label="Alamat" className="sm:col-span-2">
              <input className={inputCls} value={sekolah.alamat} onChange={ubahSekolah('alamat')} />
            </Field>
            <Field label="Nama kepala sekolah">
              <input className={inputCls} value={sekolah.kepala} onChange={ubahSekolah('kepala')} />
            </Field>
            <Field label="NIP kepala sekolah">
              <input className={inputCls} value={sekolah.nipKepala} onChange={ubahSekolah('nipKepala')} inputMode="numeric" />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Menimbang dan Mengingat"
          keterangan="Satu poin per baris. {tahun} otomatis diganti tahun pelajaran. Dasar hukum bawaan hanya contoh umum: cek dan sesuaikan dengan aturan yang berlaku di lembaga Anda."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Field label="Menimbang (a, b, c, …)">
              <textarea className={inputCls} rows={8} value={menimbang} onChange={(e) => setMenimbang(e.target.value)} />
            </Field>
            <Field label="Mengingat (1, 2, 3, …)">
              <textarea className={inputCls} rows={8} value={mengingat} onChange={(e) => setMengingat(e.target.value)} />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Daftar guru (Lampiran)"
          keterangan="Terisi dari Data Guru dan Kelas: kepala sekolah di atas, guru lain otomatis sesuai jam per guru. Jumlah jam dihitung otomatis."
          aksi={
            <button
              type="button"
              onClick={imporUlang}
              disabled={memuat || !sekolahId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={13} className={memuat ? 'animate-spin' : ''} /> Impor ulang dari Data Guru
            </button>
          }
        >
          <div className="space-y-3">
            {baris.map((r, i) => (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Guru {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => hapusBaris(r.id)}
                    disabled={baris.length === 1}
                    aria-label={`Hapus baris guru ${i + 1}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <Field label="Nama guru" className="col-span-2 sm:col-span-3">
                    <input className={inputCls} value={r.nama} onChange={(e) => ubahBaris(r.id, 'nama', e.target.value)} />
                  </Field>
                  <Field label="NIP" className="col-span-2 sm:col-span-3">
                    <input className={inputCls} value={r.nip} onChange={(e) => ubahBaris(r.id, 'nip', e.target.value)} inputMode="numeric" />
                  </Field>
                  <Field label="Mata pelajaran / tugas" className="col-span-2 sm:col-span-3">
                    <input className={inputCls} value={r.mapel} onChange={(e) => ubahBaris(r.id, 'mapel', e.target.value)} placeholder="mis. Matematika, atau Guru Kelas" />
                  </Field>
                  <Field label="Kelas">
                    <input className={inputCls} value={r.kelas} onChange={(e) => ubahBaris(r.id, 'kelas', e.target.value)} />
                  </Field>
                  <Field label="Jam / minggu">
                    <input className={inputCls} value={r.jam} onChange={(e) => ubahBaris(r.id, 'jam', e.target.value)} inputMode="decimal" />
                  </Field>
                  <Field label="Tugas tambahan" className="col-span-2 sm:col-span-3">
                    <input className={inputCls} value={r.tambahan} onChange={(e) => ubahBaris(r.id, 'tambahan', e.target.value)} placeholder="mis. Wali Kelas VI" />
                  </Field>
                  <Field label="Keterangan" className="col-span-2 sm:col-span-3">
                    <input className={inputCls} value={r.ket} onChange={(e) => ubahBaris(r.id, 'ket', e.target.value)} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={tambahBaris}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-700"
          >
            <Plus size={15} /> Tambah guru
          </button>
        </Bagian>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p className="font-display text-sm sm:text-[15px] font-semibold text-slate-900">Pratinjau</p>
            <p className="text-xs text-slate-500">Saat mencetak, matikan opsi "Header dan footer" di dialog cetak agar bersih.</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            <Printer size={16} /> Cetak / Simpan PDF
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl bg-slate-200/70 p-3 sm:p-6">{dokumen}</div>
      </div>

      {/* Salinan dokumen khusus cetak — lihat komentar di CSS */}
      {createPortal(<div className="area-cetak-portal">{dokumen}</div>, document.body)}
    </Layout>
  )
}
