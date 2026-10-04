// src/pages/LaporanAsesmenSekolah.jsx
//
// Laporan Asesmen Sekolah (Kelas 6) dalam SATU halaman dengan 4 tab, satu tab
// per lembar sesuai file LAPORAN_ASESMEN_KELAS_6_2025:
//   Lembar 1 - Statistik nilai (tertinggi / terendah / rata-rata, tulis & praktik)
//   Lembar 2 - Klasifikasi nilai (jumlah peserta per rentang nilai)
//   Lembar 3 - Peserta terdaftar, hadir, lulus & tidak lulus (L / P / Jml)
//   Lembar 4 - Laporan sekolah penyelenggara (kehadiran + masalah & saran)
//
// Pola mengikuti DaftarHadirSiswaUjian.jsx:
// - Kop surat, logo kabupaten/sekolah dari profil_sekolah, useAuth,
//   ambilProfilSekolah, CSS cetak satu-halaman (#area-cetak-laporan).
// - Jumlah peserta (dan L/P) bisa diisi otomatis dari tabel `siswa` Kelas 6
//   yang sudah punya no_peserta_ujian (tombol "Isi dari data siswa").
// - Tanggal & mata pelajaran Lembar 4 bisa diambil dari Jadwal Pengawas Ruang.
// - Nilai (tertinggi/terendah/rata-rata, klasifikasi, lulus) diketik langsung
//   di tabel pratinjau; kolom jumlah/total dihitung otomatis.
//
// CATATAN:
// - Kolom `jenis_kelamin` di tabel siswa dicoba dibaca terpisah. Kalau nama
//   kolomnya berbeda / tidak ada, jumlah L/P tidak terisi otomatis (isi manual),
//   tapi halaman tetap jalan.
// - Nama & NIP Kepala Sekolah dicoba diisi dari data sekolah (beberapa nama
//   properti dicoba); tetap bisa diubah manual di form.
// - Cetak: tombol Cetak mencetak tab yang sedang aktif; centang "Cetak semua
//   lembar" untuk mencetak keempatnya (satu lembar per halaman).

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Printer, Wand2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { muatJadwalPengawas, ratakanSesiJadwal } from '../lib/jadwalPengawasStore'
import Layout from '../components/Layout'
import {
  BagianSK as Bagian,
  FieldSK as Field,
  SEKOLAH_KOSONG,
  ambilProfilSekolah,
  inputSK as inputCls,
  isi,
  isoHariIni,
  tahunPelajaranSekarang,
} from '../components/CetakSK'

// --- Dipinjam dari KartuPesertaUjian.jsx / DaftarHadirSiswaUjian.jsx ---

function isKelas6(namaKelas) {
  const nama = (namaKelas || '').trim().toUpperCase()
  if (!nama) return false
  if (/^6\b/.test(nama)) return true
  if (/KELAS\s*6\b/.test(nama)) return true
  if (/^VI([^I]|$)/.test(nama)) return true
  if (/KELAS\s*VI([^I]|$)/.test(nama)) return true
  return false
}

function sudahTerdaftarPeserta(siswa) {
  const nilai = siswa?.no_peserta_ujian
  return nilai !== null && nilai !== undefined && String(nilai).trim() !== ''
}

function urlLogo(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('profil-sekolah').getPublicUrl(path)
  return data?.publicUrl || ''
}

function labelTanggal(iso) {
  if (!iso) return '…'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function tanggalPanjang(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function hariTanggalPanjang(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  const hari = d.toLocaleDateString('id-ID', { weekday: 'long' })
  return `${hari}, ${tanggalPanjang(iso)}`
}

// Angka dari isian teks ("12", "75,5") -> number; kosong/bukan angka -> 0.
function num(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isNaN(n) ? 0 : n
}

// Jumlah dari beberapa isian; kalau semuanya kosong, kembalikan ''.
function jumlah(...vals) {
  if (vals.every((v) => String(v ?? '').trim() === '')) return ''
  return String(vals.reduce((a, v) => a + num(v), 0))
}

// --- Data bawaan ---

const MAPEL = [
  'Pend. Agama & BK',
  'Pend. Pancasila & Kewarganegaraan',
  'Bahasa Indonesia',
  'Matematika',
  'IPA',
  'IPS',
  'Bahasa Inggris*)',
  'Pend. Jasmani Olahraga & Kesehatan',
  'Seni Budaya*)',
  'Prakarya*)',
]

const KLASIFIKASI = ['0 – 49,99', '50,00 – 59,99', '60,00 – 69,99', '70,00 – 79,99', '80,00 – 89,99', '90,00 – 100']

const TAB = [
  { id: 'nilai', label: 'Lembar 1', sub: 'Statistik Nilai' },
  { id: 'klasifikasi', label: 'Lembar 2', sub: 'Klasifikasi Nilai' },
  { id: 'kelulusan', label: 'Lembar 3', sub: 'Kelulusan' },
  { id: 'penyelenggara', label: 'Lembar 4', sub: 'Penyelenggara' },
]

const barisNilai = () =>
  MAPEL.map(() => ({ jml: '', tTinggi: '', tRendah: '', tRata: '', pTinggi: '', pRendah: '', pRata: '', ket: '' }))
const barisKlasifikasi = () => MAPEL.map(() => ({ k: KLASIFIKASI.map(() => ''), ket: '' }))
const barisKelulusan = () =>
  MAPEL.map(() => ({ tdL: '', tdP: '', hdL: '', hdP: '', lL: '', lP: '', tlL: '', tlP: '', ket: '' }))
const barisPenyelenggara = () => ({
  penyelenggara: { terdaftar: '', mengikuti: '', hadir: '', tidakHadir: '-', nomor: '-' },
  bergabung: { terdaftar: '-', mengikuti: '-', hadir: '-', tidakHadir: '-', nomor: '-' },
  masalah: [
    { m: '-', l: '-', u: '-' },
    { m: '-', l: '-', u: '-' },
    { m: '-', l: '-', u: '-' },
  ],
})

export default function LaporanAsesmenSekolah() {
  const { sekolahId: sekolahIdCtx, profil } = useAuth()
  const sekolahId = sekolahIdCtx || profil?.sekolah_id

  const [tabAktif, setTabAktif] = useState('nilai')
  const [cetakSemua, setCetakSemua] = useState(false)

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [logoSekolahUrl, setLogoSekolahUrl] = useState('')
  const [logoKabupatenUrl, setLogoKabupatenUrl] = useState('')

  // Peserta Kelas 6 yang sudah punya No. Peserta (untuk isi otomatis jumlah).
  const [peserta, setPeserta] = useState([])
  const [memuatSiswa, setMemuatSiswa] = useState(true)
  const [galatSiswa, setGalatSiswa] = useState('')
  const [infoIsi, setInfoIsi] = useState('')

  // Jadwal pengawas (hanya untuk mengambil tanggal & mapel Lembar 4).
  const [sesiJadwal, setSesiJadwal] = useState([])
  const [sesiTerpilih, setSesiTerpilih] = useState('')
  const sudahOtomatis = useRef(false)

  const [form, setForm] = useState({
    kabupaten: '',
    dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    kecamatan: '',
    alamat: '',
    rayon: '',
    subRayon: '',
    tapel: tahunPelajaranSekarang(),
    tempat: '',
    tanggalLaporan: isoHariIni(),
    kepalaNama: '',
    kepalaNip: '',
    telepon: '',
    tanggalUjian: isoHariIni(),
    mapelUjian: '',
  })

  const [nilai, setNilai] = useState(barisNilai)
  const [klas, setKlas] = useState(barisKlasifikasi)
  const [lulus, setLulus] = useState(barisKelulusan)
  const [pen, setPen] = useState(barisPenyelenggara)

  async function muat() {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, profRes] = await Promise.all([
        ambilProfilSekolah(sekolahId),
        supabase
          .from('profil_sekolah')
          .select('kabupaten, dinas_pendidikan, kecamatan, alamat, logo_path, logo_kabupaten_path')
          .eq('sekolah_id', sekolahId)
          .maybeSingle(),
      ])
      const prof = profRes?.data || {}
      const s = ps.sekolah || {}
      setLogoSekolahUrl(urlLogo(prof.logo_path))
      setLogoKabupatenUrl(urlLogo(prof.logo_kabupaten_path))
      setSekolah(s)
      setForm((f) => ({
        ...f,
        kabupaten: f.kabupaten || prof.kabupaten || '',
        dinas: prof.dinas_pendidikan || f.dinas,
        kecamatan: f.kecamatan || prof.kecamatan || '',
        alamat: f.alamat || prof.alamat || '',
        // Nama properti kepala sekolah belum pasti; beberapa kemungkinan dicoba.
        kepalaNama:
          f.kepalaNama || s.kepala_sekolah || s.nama_kepala_sekolah || s.kepala || s.nama_kepsek || '',
        kepalaNip: f.kepalaNip || s.nip_kepala_sekolah || s.nip_kepala || s.nip_kepsek || s.nip_kepala_sekolah || '',
      }))
    } catch (e) {
      console.error('Gagal memuat data Laporan Asesmen:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  async function muatSiswa() {
    if (!sekolahId) {
      setMemuatSiswa(false)
      return
    }
    setMemuatSiswa(true)
    setGalatSiswa('')
    try {
      const { data, error } = await supabase
        .from('siswa')
        .select('id, no_peserta_ujian, kelas(nama_kelas)')
        .eq('sekolah_id', sekolahId)

      if (error) throw error

      // Jenis kelamin dibaca terpisah: kalau kolomnya tidak ada, tidak merusak daftar.
      let jkPerId = {}
      try {
        const { data: jk, error: errJk } = await supabase
          .from('siswa')
          .select('id, jenis_kelamin')
          .eq('sekolah_id', sekolahId)
        if (!errJk) (jk || []).forEach((r) => { jkPerId[r.id] = String(r.jenis_kelamin || '').trim().toUpperCase() })
      } catch {
        jkPerId = {}
      }

      const hasil = (data || [])
        .filter((s) => isKelas6(s.kelas?.nama_kelas))
        .filter(sudahTerdaftarPeserta)
        .map((s) => {
          const j = jkPerId[s.id] || ''
          return { id: s.id, jk: j.startsWith('L') ? 'L' : j.startsWith('P') ? 'P' : '' }
        })
      setPeserta(hasil)
    } catch (e) {
      console.error('Gagal memuat peserta untuk Laporan Asesmen:', e)
      setGalatSiswa(e?.message || 'Data siswa tidak dapat dibaca.')
      setPeserta([])
    } finally {
      setMemuatSiswa(false)
    }
  }

  useEffect(() => {
    muat()
    muatSiswa()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  // Jadwal pengawas -> sumber tanggal & mapel Lembar 4.
  useEffect(() => {
    let batal = false
    sudahOtomatis.current = false
    if (!sekolahId) return undefined
    ;(async () => {
      const t = await muatJadwalPengawas(sekolahId)
      if (!batal) setSesiJadwal(ratakanSesiJadwal(t))
    })()
    return () => { batal = true }
  }, [sekolahId])

  function terapkanSesi(s, { timpa }) {
    setForm((f) => ({
      ...f,
      tanggalUjian: s.tanggal || f.tanggalUjian,
      mapelUjian: timpa ? s.mapel || '' : f.mapelUjian || s.mapel || '',
    }))
  }

  useEffect(() => {
    if (sudahOtomatis.current || sesiJadwal.length === 0) return
    sudahOtomatis.current = true
    const hariIni = isoHariIni()
    const pilih =
      sesiJadwal.find((s) => s.tanggal === hariIni) ||
      sesiJadwal.find((s) => s.tanggal >= hariIni) ||
      sesiJadwal[0]
    setSesiTerpilih(pilih.key)
    terapkanSesi(pilih, { timpa: false })
  }, [sesiJadwal])

  const pilihSesi = (e) => {
    const key = e.target.value
    setSesiTerpilih(key)
    const s = sesiJadwal.find((x) => x.key === key)
    if (s) terapkanSesi(s, { timpa: true })
  }

  const ubah = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // --- Pengubah sel tabel ---
  const setSel = (setter, idx, key) => (e) => {
    const v = e.target.value
    setter((arr) => arr.map((r, i) => (i === idx ? { ...r, [key]: v } : r)))
  }
  const setKlasSel = (idx, kidx) => (e) => {
    const v = e.target.value
    setKlas((arr) =>
      arr.map((r, i) => (i === idx ? { ...r, k: r.k.map((x, j) => (j === kidx ? v : x)) } : r))
    )
  }
  const setPenBaris = (baris, key) => (e) => {
    const v = e.target.value
    setPen((p) => ({ ...p, [baris]: { ...p[baris], [key]: v } }))
  }
  const setMasalah = (idx, key) => (e) => {
    const v = e.target.value
    setPen((p) => ({
      ...p,
      masalah: p.masalah.map((r, i) => (i === idx ? { ...r, [key]: v } : r)),
    }))
  }

  // --- Isi otomatis dari data siswa ---
  const totalPeserta = peserta.length
  const totalL = peserta.filter((p) => p.jk === 'L').length
  const totalP = peserta.filter((p) => p.jk === 'P').length
  const adaJk = totalL + totalP > 0

  function isiDariSiswa() {
    if (totalPeserta === 0) {
      setInfoIsi('Belum ada siswa Kelas 6 yang punya No. Peserta Ujian.')
      return
    }
    const t = String(totalPeserta)
    setNilai((arr) => arr.map((r) => ({ ...r, jml: t })))
    setPen((p) => ({ ...p, penyelenggara: { ...p.penyelenggara, terdaftar: t, mengikuti: t, hadir: t } }))
    if (adaJk) {
      setLulus((arr) =>
        arr.map((r) => ({ ...r, tdL: String(totalL), tdP: String(totalP), hdL: String(totalL), hdP: String(totalP) }))
      )
      setInfoIsi(`Terisi: ${totalPeserta} peserta (L ${totalL}, P ${totalP}). Periksa lagi, lalu lengkapi nilainya.`)
    } else {
      setInfoIsi(
        `Terisi: ${totalPeserta} peserta. Jumlah L/P belum terbaca dari data siswa, isi manual di Lembar 3.`
      )
    }
  }

  // --- Total yang dihitung otomatis ---
  const jmlKlasPerBaris = useMemo(
    () =>
      klas.map((r, i) => {
        const s = jumlah(...r.k)
        return s !== '' && s !== '0' ? s : nilai[i].jml
      }),
    [klas, nilai]
  )
  const totalKlasPerKolom = KLASIFIKASI.map((_, j) => jumlah(...klas.map((r) => r.k[j])))
  const totalKlasSemua = jumlah(...jmlKlasPerBaris)

  const totalPen = {
    terdaftar: jumlah(pen.penyelenggara.terdaftar, pen.bergabung.terdaftar),
    mengikuti: jumlah(pen.penyelenggara.mengikuti, pen.bergabung.mengikuti),
    hadir: jumlah(pen.penyelenggara.hadir, pen.bergabung.hadir),
    tidakHadir: jumlah(pen.penyelenggara.tidakHadir, pen.bergabung.tidakHadir),
  }

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tglTtd = `${isi(form.tempat, '…………')}, ${isi(tanggalPanjang(form.tanggalLaporan), '…………')}`

  // --- Potongan tampilan yang dipakai berulang di tiap lembar ---
  const kop = (
    <div className="kop-surat flex items-center gap-3 border-b-2 border-slate-800 pb-3 mb-4">
      <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
        {logoKabupatenUrl && (
          <img src={logoKabupatenUrl} alt="Logo kabupaten" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}
      </div>
      <div className="flex-1 text-center">
        {form.kabupaten && <p className="font-bold uppercase tracking-wide">{form.kabupaten}</p>}
        {form.dinas && <p className="font-bold uppercase tracking-wide">{form.dinas}</p>}
        <p className="font-bold uppercase tracking-wide text-base">{namaSekolah}</p>
        {form.kecamatan && <p className="font-bold uppercase tracking-wide">Kecamatan {form.kecamatan.replace(/^kecamatan\s+/i, '')}</p>}
        {form.alamat && <p className="italic text-[12px]">{form.alamat}</p>}
      </div>
      <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
        {logoSekolahUrl && (
          <img src={logoSekolahUrl} alt="Logo sekolah" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}
      </div>
    </div>
  )

  const judul = (
    <div className="judul-blok text-center mb-4">
      <p className="font-display text-base font-bold">Laporan Asesmen Sekolah</p>
      <p className="font-bold">Tahun Pelajaran {isi(form.tapel, '…………')}</p>
    </div>
  )

  const ttd = (
    <div className="ttd-blok mt-6 flex justify-end">
      <div className="w-64 text-center">
        <p>{tglTtd}</p>
        <p className="mb-14">Kepala Sekolah</p>
        <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
          {isi(form.kepalaNama, '…………')}
        </p>
        <p>NIP. {isi(form.kepalaNip, '…………')}</p>
      </div>
    </div>
  )

  const identitas = (opsi = {}) => (
    <div className="info-blok mb-3 space-y-0.5">
      <Baris label="Nama Sekolah" nilai={namaSekolah} />
      <Baris label="Alamat" nilai={isi(form.alamat, '…………')} />
      <Baris label="Kecamatan" nilai={isi(form.kecamatan, '…………')} />
      {opsi.rayon && (
        <Baris label="Rayon / Sub Rayon" nilai={`${form.rayon || '…………'} / ${form.subRayon || '…………'}`} />
      )}
      {opsi.kabupaten && <Baris label="Kabupaten" nilai={isi(form.kabupaten, '…………')} />}
    </div>
  )

  const kelasLembar = (id) => `lembar ${tabAktif === id ? 'aktif' : ''}`

  return (
    <Layout
      title="Laporan Asesmen Sekolah"
      subtitle="Empat lembar laporan asesmen Kelas 6 dalam satu halaman — pilih tab untuk berpindah lembar, siap cetak."
    >
      <style>{`
        @page { size: A4; margin: 12mm 14mm; }
        #area-cetak-laporan .lembar { display: none; }
        #area-cetak-laporan .lembar.aktif { display: block; }
        #area-cetak-laporan .sel-input {
          width: 100%; background: transparent; border: 0; outline: 0;
          text-align: center; padding: 2px 2px; font: inherit; min-width: 0;
        }
        #area-cetak-laporan .sel-input:hover { background: #f8fafc; }
        #area-cetak-laporan .sel-input:focus { background: #eff6ff; }
        #area-cetak-laporan .sel-kiri { text-align: left; }
        #area-cetak-laporan .kop-logo img {
          position: static !important; float: none !important;
          display: block; max-width: 100%; max-height: 100%; object-fit: contain;
        }
        @media print {
          body * { visibility: hidden; }
          #area-cetak-laporan, #area-cetak-laporan * { visibility: visible; }
          #area-cetak-laporan {
            position: absolute; left: 0; top: 0; width: 100%;
            border: 0 !important; border-radius: 0 !important; padding: 0 !important;
            max-width: none !important; margin: 0 !important;
            font-family: 'Times New Roman', Times, serif;
            color: #000 !important;
          }
          #area-cetak-laporan.cetak-semua .lembar { display: block; page-break-after: always; break-after: page; }
          #area-cetak-laporan.cetak-semua .lembar:last-child { page-break-after: auto; break-after: auto; }
          #area-cetak-laporan .kop-surat { border-bottom-color: #000 !important; }
          #area-cetak-laporan .ttd-blok { page-break-inside: avoid; }
          #area-cetak-laporan * { color: #000 !important; }
          #area-cetak-laporan table { border-color: #000 !important; }
          #area-cetak-laporan th, #area-cetak-laporan td { border-color: #000 !important; }
          #area-cetak-laporan .sel-input::placeholder { color: transparent !important; }
          #area-cetak-laporan .sel-input:hover, #area-cetak-laporan .sel-input:focus { background: transparent; }

          /* === MODE SATU HALAMAN PER LEMBAR === */
          #area-cetak-laporan { font-size: 10.5pt !important; line-height: 1.3 !important; }
          #area-cetak-laporan .kop-surat { padding-bottom: 6px !important; margin-bottom: 8px !important; }
          #area-cetak-laporan .kop-logo { width: 60px !important; height: 60px !important; }
          #area-cetak-laporan .judul-blok { margin-bottom: 8px !important; }
          #area-cetak-laporan .info-blok { margin-bottom: 6px !important; }
          #area-cetak-laporan td, #area-cetak-laporan th { padding: 1px 3px !important; }
        }
      `}</style>

      <div className="no-print max-w-4xl mx-auto mb-5">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data belum bisa dibaca ({galat}).
          </div>
        )}
        {!memuatSiswa && galatSiswa && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data siswa belum bisa dibaca ({galatSiswa}). Jumlah peserta bisa diisi manual di tabel.
          </div>
        )}

        <Bagian judul="Identitas & kop surat" keterangan="Terisi otomatis dari Profil Sekolah; bisa diubah di sini. Berlaku untuk keempat lembar.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Pemerintah Kabupaten/Kota">
              <input className={inputCls} value={form.kabupaten} onChange={ubah('kabupaten')} placeholder="KABUPATEN …" />
            </Field>
            <Field label="Dinas">
              <input className={inputCls} value={form.dinas} onChange={ubah('dinas')} />
            </Field>
            <Field label="Kecamatan">
              <input className={inputCls} value={form.kecamatan} onChange={ubah('kecamatan')} placeholder="mis. Aru Utara Timur Batuley" />
            </Field>
            <Field label="Alamat sekolah">
              <input className={inputCls} value={form.alamat} onChange={ubah('alamat')} placeholder="Jl. …, Desa …" />
            </Field>
            <Field label="Rayon">
              <input className={inputCls} value={form.rayon} onChange={ubah('rayon')} />
            </Field>
            <Field label="Sub Rayon">
              <input className={inputCls} value={form.subRayon} onChange={ubah('subRayon')} />
            </Field>
            <Field label="Tahun pelajaran">
              <input className={inputCls} value={form.tapel} onChange={ubah('tapel')} placeholder="2025/2026" />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Tanda tangan" keterangan="Tempat, tanggal laporan, dan Kepala Sekolah di bagian bawah tiap lembar.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tempat">
              <input className={inputCls} value={form.tempat} onChange={ubah('tempat')} placeholder="mis. Waria" />
            </Field>
            <Field label="Tanggal laporan">
              <input type="date" className={inputCls} value={form.tanggalLaporan} onChange={ubah('tanggalLaporan')} />
            </Field>
            <Field label="Nama Kepala Sekolah">
              <input className={inputCls} value={form.kepalaNama} onChange={ubah('kepalaNama')} />
            </Field>
            <Field label="NIP Kepala Sekolah">
              <input className={inputCls} value={form.kepalaNip} onChange={ubah('kepalaNip')} />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Isi otomatis jumlah peserta"
          keterangan={
            memuatSiswa
              ? 'Memuat data siswa…'
              : `Ditemukan ${totalPeserta} peserta Kelas 6 ber-No. Peserta${adaJk ? ` (L ${totalL}, P ${totalP})` : ''}. Mengisi kolom jumlah peserta di Lembar 1, 3, dan 4.`
          }
        >
          <button
            type="button"
            onClick={isiDariSiswa}
            disabled={memuatSiswa}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Wand2 size={14} /> Isi dari data siswa
          </button>
          {infoIsi && <p className="mt-2 text-sm text-slate-600">{infoIsi}</p>}
        </Bagian>

        {tabAktif === 'penyelenggara' && (
          <Bagian
            judul="Pelaksanaan (Lembar 4)"
            keterangan="Tanggal & mata pelajaran bisa diambil dari Jadwal Pengawas Ruang, atau diketik manual."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field label="Ambil dari jadwal pengawas">
                  {sesiJadwal.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
                      Belum ada jadwal pengawas tersimpan. Isi dulu di halaman Jadwal Pengawas Ruang.
                    </p>
                  ) : (
                    <select className={inputCls} value={sesiTerpilih} onChange={pilihSesi}>
                      <option value="">— pilih sesi —</option>
                      {sesiJadwal.map((s) => (
                        <option key={s.key} value={s.key}>
                          {labelTanggal(s.tanggal)} • {s.waktu || '…'} • {s.mapel || '(mapel belum diisi)'}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
              <Field label="Hari / tanggal">
                <input type="date" className={inputCls} value={form.tanggalUjian} onChange={ubah('tanggalUjian')} />
              </Field>
              <Field label="Mata pelajaran">
                <input className={inputCls} value={form.mapelUjian} onChange={ubah('mapelUjian')} placeholder="mis. IPA" />
              </Field>
              <Field label="No. Telepon / HP">
                <input className={inputCls} value={form.telepon} onChange={ubah('telepon')} />
              </Field>
            </div>
          </Bagian>
        )}

        {/* Tab per lembar */}
        <div role="tablist" className="mt-2 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TAB.map((t) => {
            const aktif = tabAktif === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={aktif}
                onClick={() => setTabAktif(t.id)}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  aktif
                    ? 'border-blue-900 bg-blue-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className={`block text-xs ${aktif ? 'text-blue-200' : 'text-slate-500'}`}>{t.sub}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={cetakSemua} onChange={(e) => setCetakSemua(e.target.checked)} />
            Cetak semua lembar sekaligus
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950"
          >
            <Printer size={16} /> {cetakSemua ? 'Cetak 4 lembar' : `Cetak ${TAB.find((t) => t.id === tabAktif)?.label}`}
          </button>
        </div>
      </div>

      <div
        id="area-cetak-laporan"
        className={`mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-[13px] leading-relaxed text-slate-800 ${
          cetakSemua ? 'cetak-semua' : ''
        }`}
      >
        {/* ===================== LEMBAR 1: STATISTIK NILAI ===================== */}
        <section className={kelasLembar('nilai')}>
          {kop}
          {judul}
          <p className="mb-2">Jumlah peserta menurut klasifikasi nilai setiap mata pelajaran.</p>
          {identitas({ rayon: true })}

          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <Th rowSpan={2} className="w-8">No</Th>
                <Th rowSpan={2}>Mata Pelajaran</Th>
                <Th rowSpan={2} className="w-14">Jumlah Peserta</Th>
                <Th colSpan={3}>Nilai Tertulis</Th>
                <Th colSpan={3}>Nilai Praktik</Th>
                <Th rowSpan={2} className="w-14">Ket</Th>
              </tr>
              <tr>
                {['Tertinggi', 'Terendah', 'Rata-rata', 'Tertinggi', 'Terendah', 'Rata-rata'].map((h, i) => (
                  <Th key={i} className="w-14 text-[11px]">{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAPEL.map((m, i) => (
                <tr key={m}>
                  <Td className="text-center">{i + 1}</Td>
                  <Td>{m}</Td>
                  {['jml', 'tTinggi', 'tRendah', 'tRata', 'pTinggi', 'pRendah', 'pRata', 'ket'].map((k) => (
                    <Td key={k} className="p-0">
                      <input className="sel-input" value={nilai[i][k]} onChange={setSel(setNilai, i, k)} />
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[12px] italic">*) Mata pelajaran jenjang SD</p>
          {ttd}
        </section>

        {/* ===================== LEMBAR 2: KLASIFIKASI NILAI ===================== */}
        <section className={kelasLembar('klasifikasi')}>
          {kop}
          {judul}
          <p className="mb-2">Jumlah peserta menurut klasifikasi nilai setiap mata pelajaran.</p>
          {identitas({ rayon: true })}

          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <Th rowSpan={2} className="w-8">No</Th>
                <Th rowSpan={2}>Mata Pelajaran</Th>
                <Th colSpan={KLASIFIKASI.length}>Jumlah Peserta menurut Klasifikasi Nilai</Th>
                <Th rowSpan={2} className="w-16">Jumlah Peserta Seluruhnya</Th>
                <Th rowSpan={2} className="w-14">Ket</Th>
              </tr>
              <tr>
                {KLASIFIKASI.map((h) => (
                  <Th key={h} className="w-14 text-[10.5px]">{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAPEL.map((m, i) => (
                <tr key={m}>
                  <Td className="text-center">{i + 1}</Td>
                  <Td>{m}</Td>
                  {KLASIFIKASI.map((_, j) => (
                    <Td key={j} className="p-0">
                      <input className="sel-input" value={klas[i].k[j]} onChange={setKlasSel(i, j)} />
                    </Td>
                  ))}
                  <Td className="text-center">{jmlKlasPerBaris[i]}</Td>
                  <Td className="p-0">
                    <input className="sel-input" value={klas[i].ket} onChange={setSel(setKlas, i, 'ket')} />
                  </Td>
                </tr>
              ))}
              <tr>
                <Td colSpan={2} className="text-center font-semibold">Jumlah</Td>
                {totalKlasPerKolom.map((t, j) => (
                  <Td key={j} className="text-center font-semibold">{t}</Td>
                ))}
                <Td className="text-center font-semibold">{totalKlasSemua}</Td>
                <Td />
              </tr>
            </tbody>
          </table>

          <div className="mt-2 text-[12px]">
            <p className="font-bold">Catatan :</p>
            <p className="italic">*) Mata pelajaran jenjang SD</p>
            <p className="italic">Kolom "Jumlah Peserta Seluruhnya" otomatis dijumlahkan dari klasifikasi; bila klasifikasi masih kosong, memakai jumlah peserta di Lembar 1.</p>
          </div>
          {ttd}
        </section>

        {/* ===================== LEMBAR 3: KELULUSAN ===================== */}
        <section className={kelasLembar('kelulusan')}>
          {kop}
          {judul}
          {identitas({ kabupaten: true })}

          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr>
                <Th rowSpan={2} className="w-8">No</Th>
                <Th rowSpan={2}>Mata Pelajaran</Th>
                <Th colSpan={3}>Peserta Terdaftar</Th>
                <Th colSpan={3}>Peserta Hadir</Th>
                <Th colSpan={3}>Lulus</Th>
                <Th colSpan={3}>Tidak Lulus</Th>
                <Th rowSpan={2} className="w-12">Ket</Th>
              </tr>
              <tr>
                {[0, 1, 2, 3].flatMap((g) => ['L', 'P', 'Jml']).map((h, i) => (
                  <Th key={i} className="w-9">{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAPEL.map((m, i) => {
                const r = lulus[i]
                const sel = (k) => (
                  <Td key={k} className="p-0">
                    <input className="sel-input" value={r[k]} onChange={setSel(setLulus, i, k)} />
                  </Td>
                )
                return (
                  <tr key={m}>
                    <Td className="text-center">{i + 1}</Td>
                    <Td>{m}</Td>
                    {sel('tdL')}{sel('tdP')}
                    <Td className="text-center">{jumlah(r.tdL, r.tdP)}</Td>
                    {sel('hdL')}{sel('hdP')}
                    <Td className="text-center">{jumlah(r.hdL, r.hdP)}</Td>
                    {sel('lL')}{sel('lP')}
                    <Td className="text-center">{jumlah(r.lL, r.lP)}</Td>
                    {sel('tlL')}{sel('tlP')}
                    <Td className="text-center">{jumlah(r.tlL, r.tlP)}</Td>
                    {sel('ket')}
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="mt-2 text-[12px]">
            <p className="font-bold">Keterangan :</p>
            <p className="italic">*) Mata pelajaran jenjang SD</p>
            <p className="italic">Laporan ini disampaikan ke Penyelenggara, Tingkat Sub Rayon, Tingkat Rayon dan Tingkat Kabupaten.</p>
          </div>
          {ttd}
        </section>

        {/* ===================== LEMBAR 4: PENYELENGGARA ===================== */}
        <section className={kelasLembar('penyelenggara')}>
          {kop}
          {judul}
          <div className="info-blok mb-3 space-y-0.5">
            <Baris label="Nama Sekolah Penyelenggara" nilai={namaSekolah} lebar="w-56" />
            <Baris label="Alamat" nilai={isi(form.alamat, '…………')} lebar="w-56" />
            <Baris label="No. Telepon / HP" nilai={isi(form.telepon, '…………')} lebar="w-56" />
            <Baris label="Hari / Tanggal" nilai={isi(hariTanggalPanjang(form.tanggalUjian), '…………')} lebar="w-56" />
            <Baris label="Mata Pelajaran" nilai={isi(form.mapelUjian, '…………')} lebar="w-56" />
          </div>

          <p className="mb-1">
            Laporan sekolah penyelenggara bergabung: peserta terdaftar, peserta yang mengikuti, peserta yang hadir
            dan peserta tidak hadir.
          </p>
          <table className="w-full border-collapse text-[12px] mb-4">
            <thead>
              <tr>
                <Th className="w-8">No</Th>
                <Th className="w-28">Status</Th>
                <Th>Jumlah Peserta Terdaftar</Th>
                <Th>Jumlah Peserta Mengikuti</Th>
                <Th>Jumlah Peserta Yang Hadir</Th>
                <Th>Peserta Tidak Hadir</Th>
                <Th>Nomor Peserta Tidak Hadir</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ['penyelenggara', 'Penyelenggara'],
                ['bergabung', 'Bergabung'],
              ].map(([kunci, label], i) => (
                <tr key={kunci}>
                  <Td className="text-center">{i + 1}</Td>
                  <Td>{label}</Td>
                  {['terdaftar', 'mengikuti', 'hadir', 'tidakHadir', 'nomor'].map((k) => (
                    <Td key={k} className="p-0">
                      <input className="sel-input" value={pen[kunci][k]} onChange={setPenBaris(kunci, k)} />
                    </Td>
                  ))}
                </tr>
              ))}
              <tr>
                <Td />
                <Td className="font-semibold">Jumlah</Td>
                <Td className="text-center font-semibold">{isi(totalPen.terdaftar, '-')}</Td>
                <Td className="text-center font-semibold">{isi(totalPen.mengikuti, '-')}</Td>
                <Td className="text-center font-semibold">{isi(totalPen.hadir, '-')}</Td>
                <Td className="text-center font-semibold">{isi(totalPen.tidakHadir, '-')}</Td>
                <Td className="text-center">-</Td>
              </tr>
            </tbody>
          </table>

          <p className="mb-1">
            Laporan permasalahan, pemecahan dan usul/saran dalam pelaksanaan Asesmen Sekolah Tahun Pelajaran{' '}
            {isi(form.tapel, '…………')}.
          </p>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <Th className="w-8">No</Th>
                <Th className="w-28">Status</Th>
                <Th>Masalah yang dihadapi</Th>
                <Th>Langkah-langkah pemecahan</Th>
                <Th>Usul/Saran Tindak Lanjut</Th>
              </tr>
            </thead>
            <tbody>
              {['Pelaksanaan', 'Materi Soal', 'Lain-lain'].map((label, i) => (
                <tr key={label}>
                  <Td className="text-center">{i + 1}</Td>
                  <Td>{label}</Td>
                  {['m', 'l', 'u'].map((k) => (
                    <Td key={k} className="p-0">
                      <input className="sel-input" value={pen.masalah[i][k]} onChange={setMasalah(i, k)} />
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-2 text-[12px] italic">Laporan ini disampaikan ke Penyelenggara Tingkat Sub Rayon.</p>
          {ttd}
        </section>
      </div>
    </Layout>
  )
}

function Baris({ label, nilai, lebar = 'w-40' }) {
  return (
    <p className="flex">
      <span className={`${lebar} shrink-0`}>{label}</span>
      <span>: {nilai}</span>
    </p>
  )
}
function Th({ children, className = '', ...rest }) {
  return (
    <th className={`border border-slate-300 px-1 py-1 text-center font-semibold ${className}`} {...rest}>
      {children}
    </th>
  )
}
function Td({ children, className = '', ...rest }) {
  return (
    <td className={`border border-slate-300 px-1.5 py-1 ${className}`} {...rest}>
      {children}
    </td>
  )
}
