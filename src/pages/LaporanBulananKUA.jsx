import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import BlokTandaTangan, { PilihModeTtd } from '../components/BlokTandaTangan'

// Ganti kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

// Ganti tujuan tombol "Kembali" sesuai menu tempat halaman ini diletakkan
const HALAMAN_KEMBALI = '/dashboard'

const PLACEHOLDER = '..............................'
const PH_ANGKA = '....'

// Tempat akad yang dianggap "Di KUA". Sama dengan halaman Laporan Kepala KUA.
const POLA_DI_KUA = /\b(kua|balai nikah|kantor urusan agama)\b/i

/* ------------------------------------------------------------------ */
/*  Isi tetap & bawaan (sesuai contoh Format Laporan Bulanan KUA)      */
/* ------------------------------------------------------------------ */

const PEGAWAI_AWAL = [
  { id: 1, nama: '', pangkat: '', jabatan: 'Kepala KUA', status: 'ASN', ket: 'Aktif' },
  { id: 2, nama: '', pangkat: '', jabatan: 'Penghulu', status: 'ASN', ket: 'Aktif' },
  { id: 3, nama: '', pangkat: '', jabatan: 'Penyuluh Agama', status: 'ASN', ket: 'Aktif' },
  { id: 4, nama: '', pangkat: '', jabatan: 'JFU/JFT', status: 'ASN', ket: 'Aktif' },
  { id: 5, nama: '', pangkat: '', jabatan: 'Tenaga Pendukung', status: 'Non-ASN', ket: 'Aktif' },
]

const KEHADIRAN_AWAL = [1, 2, 3, 4].map((id) => ({
  id, nama: '', hadir: '', sakit: '', izin: '', cuti: '', dinasLuar: '', alpa: '',
}))

const PENGHULU_AWAL = [1, 2].map((id) => ({
  id, nama: '', nip: '', pangkat: '', pelayanan: '', ket: '',
}))

const PENYULUH_AWAL = [1, 2, 3].map((id) => ({
  id, nama: '', status: 'ASN', wilayah: '', jumlahKegiatan: '', ket: '',
}))

const MASJID_AWAL = [1, 2, 3].map((id) => ({ id, desa: '', masjid: '', musala: '' }))

const MAJELIS_AWAL = [1, 2].map((id) => ({
  id, desa: '', jumlahMajelis: '', jumlahKegiatan: '', ket: '',
}))

const KEGIATAN_AWAL = [1, 2, 3].map((id) => ({
  id, tanggal: '', kegiatan: '', pelaksana: '', tempat: '', ket: '',
}))

const MASALAH_AWAL = [1, 2, 3].map((id) => ({ id, permasalahan: '', upaya: '', ket: '' }))

const SARANA_ITEMS = [
  'Meja kerja', 'Kursi', 'Komputer/Laptop', 'Printer', 'Lemari arsip', 'AC/Kipas Angin', 'Kendaraan dinas',
]
const SARANA_AWAL = SARANA_ITEMS.map((nama) => ({
  nama, jumlah: '', baik: '', rusakRingan: '', rusakBerat: '',
}))

const GEDUNG_ITEMS = [
  'Ruang Kepala KUA', 'Ruang pelayanan', 'Ruang arsip', 'Ruang kerja pegawai',
  'Toilet', 'Halaman kantor', 'Papan nama kantor',
]
const GEDUNG_AWAL = GEDUNG_ITEMS.map((uraian) => ({ uraian, kondisi: 'Baik', ket: '' }))

const ARSIP_ITEMS = [
  'Arsip pernikahan', 'Arsip wakaf', 'Arsip kepegawaian',
  'Arsip surat masuk', 'Arsip surat keluar', 'Arsip administrasi kantor',
]
const ARSIP_AWAL = ARSIP_ITEMS.map((jenis) => ({ jenis, keadaan: 'Baik', ket: '' }))

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

// 'YYYY-MM-DD' dibaca sebagai tanggal lokal supaya tidak bergeser sehari.
function formatTanggalIndonesia(dateInput) {
  if (!dateInput) return ''
  let date
  if (dateInput instanceof Date) {
    date = dateInput
  } else if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-').map(Number)
    date = new Date(y, m - 1, d)
  } else {
    date = new Date(dateInput)
  }
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function bulanIniISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function todayISO() {
  const d = new Date()
  return `${bulanIniISO()}-${String(d.getDate()).padStart(2, '0')}`
}

// 'YYYY-MM' -> { bulan: 'September', tahun: '2026' }
function pecahBulan(bulanISO) {
  if (!/^\d{4}-\d{2}$/.test(bulanISO || '')) return { bulan: '', tahun: '' }
  const [y, m] = bulanISO.split('-').map(Number)
  return {
    bulan: new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long' }),
    tahun: String(y),
  }
}

// Timestamp dari database (UTC) -> 'YYYY-MM' menurut zona waktu perangkat
function bulanLokal(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// 'YYYY-MM' -> 'YYYY-MM-01' bulan berikutnya. Dipakai sebagai batas atas
// (exclusive) saat memfilter kolom tanggal/timestamp supaya tidak meleset
// akibat bulan 28/30 hari atau komponen jam pada timestamp.
function bulanBerikutnyaISO(bulanISO) {
  if (!/^\d{4}-\d{2}$/.test(bulanISO || '')) return ''
  const [y, m] = bulanISO.split('-').map(Number)
  const y2 = m === 12 ? y + 1 : y
  const m2 = m === 12 ? 1 : m + 1
  return `${y2}-${String(m2).padStart(2, '0')}-01`
}

// Nama kabupaten/kota di profil kantor bisa tersimpan dengan atau tanpa awalan.
function denganAwalanWilayah(nama) {
  if (!nama) return 'Kabupaten/Kota ..........................'
  return /^(kabupaten|kota)\s/i.test(nama) ? nama : `Kabupaten ${nama}`
}

// status_kepegawaian di tabel pegawai_kantor adalah teks bebas (mis. "PNS",
// "PPPK", "Honorer") — dipetakan ke tiga kategori baku yang dipakai Bab II
// Rekapitulasi Pegawai (ASN / PPPK / Non-ASN).
function kategoriKepegawaian(teks) {
  const t = (teks || '').toLowerCase()
  if (t.includes('pppk')) return 'PPPK'
  if (t.includes('pns') || t.includes('asn')) return 'ASN'
  return 'Non-ASN'
}

// Pencocokan jabatan untuk Bab IV (Penghulu) & Bab V (Penyuluh Agama).
const punyaJabatan = (p, kata) => (p.jabatan || '').toLowerCase().includes(kata)

const isi = (v) => (v && String(v).trim() ? v : PLACEHOLDER)
const angkaTampil = (v) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : PH_ANGKA)
const jumlahkan = (arr, kunci) =>
  arr.reduce((total, r) => total + (Number(r[kunci]) || 0), 0)

// Hitung baris yang benar-benar terisi namanya — dipakai Bab XVI supaya baris
// kosong bawaan tidak ikut dihitung sebagai orang.
const jumlahTerisi = (rows) => rows.filter((r) => (r.nama || '').trim()).length

/* ------------------------------------------------------------------ */
/*  Hook kecil untuk tabel dengan baris yang bisa ditambah/dihapus     */
/* ------------------------------------------------------------------ */

function useDaftarBaris(awal, kolomBaru) {
  const [rows, setRows] = useState(awal)
  const idRef = useRef(1000)
  // Sekali admin menyentuh tabel ini, isian otomatis berhenti menimpanya.
  const disentuh = useRef(false)

  const tambah = () => {
    disentuh.current = true
    setRows((r) => [...r, { id: ++idRef.current, ...kolomBaru }])
  }
  const ubah = (id, kolom, nilai) => {
    disentuh.current = true
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [kolom]: nilai } : x)))
  }
  const hapus = (id) => {
    disentuh.current = true
    setRows((r) => r.filter((x) => x.id !== id))
  }

  // Dipakai oleh efek auto-isi. Menerima array baris, atau fungsi
  // (barisSebelumnya) => barisBaru kalau perlu mempertahankan isian manual
  // pada kolom yang tidak punya sumber otomatis (mis. Cuti & Dinas Luar).
  const isiOtomatis = (barisBaruAtauFn) => {
    if (disentuh.current) return
    setRows((sebelumnya) => {
      const hasil =
        typeof barisBaruAtauFn === 'function' ? barisBaruAtauFn(sebelumnya) : barisBaruAtauFn
      return hasil && hasil.length > 0 ? hasil : awal
    })
  }

  return { rows, setRows, tambah, ubah, hapus, isiOtomatis }
}

/* ------------------------------------------------------------------ */
/*  Komponen kecil untuk form                                          */
/* ------------------------------------------------------------------ */

const inputClass =
  'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500'

function FieldText({ label, value, onChange, placeholder, type = 'text', ...rest }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
        {...rest}
      />
    </div>
  )
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function FieldArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="sm:col-span-2">
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  )
}

function SubJudulForm({ children }) {
  return <h3 className="sm:col-span-2 text-xs font-semibold text-slate-800 pt-2 border-t border-slate-100">{children}</h3>
}

// Editor baris generik: dipakai untuk semua tabel yang barisnya bisa ditambah/dihapus.
function TabelEditorForm({ kolom, rows, ubah, tambah, hapus, labelTambah }) {
  return (
    <div className="sm:col-span-2 space-y-2">
      {rows.map((r) => (
        <div
          key={r.id}
          className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end border border-slate-100 rounded-lg p-2"
        >
          {kolom.map((k) => (
            <div key={k.key} className={k.lebar || ''}>
              <FieldText
                label={k.label}
                value={r[k.key]}
                onChange={(v) => ubah(r.id, k.key, v)}
                type={k.type || 'text'}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => hapus(r.id)}
            className="p-2 self-center text-slate-400 hover:text-red-600"
            aria-label="Hapus baris"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={tambah}
        className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900"
      >
        <Plus size={16} /> {labelTambah}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Komponen kecil untuk lembar cetak                                  */
/* ------------------------------------------------------------------ */

const cellHead = 'border border-slate-400 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-800'
const cell = 'border border-slate-400 px-2 py-1.5 align-top'
const cellCenter = `${cell} text-center`

function Bab({ no, judul, children }) {
  return (
    <section>
      <h2 className="font-display text-[15px] font-semibold uppercase text-slate-900 mb-2">
        {no}. {judul}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

// Tabel cetak generik: header (array teks) + baris (array of array teks) + footer opsional (array teks).
function TabelCetak({ header, baris, kosong = '-', footer }) {
  return (
    <table className="lap-table w-full text-xs border-collapse">
      <thead>
        <tr>
          {header.map((h, i) => (
            <th key={i} className={i === 0 ? `${cellHead} w-10 text-center` : cellHead}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {baris.length === 0 ? (
          <tr>
            <td className={`${cell} text-center text-slate-500`} colSpan={header.length}>{kosong}</td>
          </tr>
        ) : (
          baris.map((row, i) => (
            <tr key={i}>
              {row.map((val, j) => (
                <td key={j} className={j === 0 ? cellCenter : cell}>{val || PLACEHOLDER}</td>
              ))}
            </tr>
          ))
        )}
        {footer && (
          <tr>
            {footer.map((val, j) => (
              <td key={j} className={j === 0 ? `${cellHead} text-center` : cellHead}>{val}</td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  )
}

/* ------------------------------------------------------------------ */
/*  Halaman                                                            */
/* ------------------------------------------------------------------ */

export default function LaporanBulananKUA() {
  // AuthContext memakai nama field `sekolahId` (warisan aplikasi sekolah).
  // Di aplikasi KUA nilainya adalah id kantor yang sedang login.
  const { sekolahId } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)
  const [errorProfil, setErrorProfil] = useState('')

  // Data pendaftaran nikah milik kantor ini (tabel yang sama dengan halaman
  // Pendaftaran Nikah, Verifikasi Nikah, dan Laporan Kepala KUA) — dipakai
  // untuk mengisi otomatis Bab VI. Keadaan Pernikahan.
  const [dataNikah, setDataNikah] = useState([])
  const [loadingNikah, setLoadingNikah] = useState(true)
  const [errorNikah, setErrorNikah] = useState('')

  // === DATA LAPORAN — DAPAT DIISI ULANG SETIAP BULAN ===
  const [bulan, setBulan] = useState(bulanIniISO())
  const [tanggalLaporan, setTanggalLaporan] = useState(todayISO())
  const [namaKepala, setNamaKepala] = useState('')
  const [nipKepala, setNipKepala] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [provinsi, setProvinsi] = useState('')
  // 'otomatis': dikenali dari nama/NIP pembuat. Kalau kosong, pembuat dianggap
  // Kepala KUA (nama diambil dari Profil Kantor) sehingga "Mengetahui" = Kepala Kemenag.
  const [modeTtd, setModeTtd] = useState('otomatis')

  /* ---------------------------------------------------------------- */
  /*  SUMBER DATA OTOMATIS — ditarik dari halaman lain yang sudah ada  */
  /*  di aplikasi ini, supaya admin tidak perlu mengisi ulang manual.  */
  /* ---------------------------------------------------------------- */

  // Bab I, II, IV & V: daftar pegawai kantor aktif (halaman "Data Pegawai").
  const [pegawaiKantor, setPegawaiKantor] = useState([])
  useEffect(() => {
    if (!sekolahId) {
      setPegawaiKantor([])
      return
    }
    supabase
      .from('pegawai_kantor')
      .select('id, nama_lengkap, nip, jenis_kelamin, pangkat_golongan, jabatan, status_kepegawaian')
      .eq('sekolah_id', sekolahId)
      .eq('status', 'aktif')
      .order('nama_lengkap')
      .then(({ data, error }) => {
        if (error) console.error('pegawai_kantor:', error)
        setPegawaiKantor(data || [])
      })
  }, [sekolahId])

  // Bab III: presensi pegawai kantor pada bulan terpilih (halaman "Presensi
  // Pegawai"). Status yang dicatat sistem hanya hadir/izin/sakit/alpa — kolom
  // Cuti & Dinas Luar di Bab III tidak punya sumber otomatis, tetap manual.
  const [presensiBulan, setPresensiBulan] = useState([])
  useEffect(() => {
    const batasAtas = bulanBerikutnyaISO(bulan)
    if (!sekolahId || !bulan || !batasAtas) {
      setPresensiBulan([])
      return
    }
    supabase
      .from('presensi_pegawai_kantor')
      .select('pegawai_kantor_id, status')
      .eq('sekolah_id', sekolahId)
      .gte('tanggal', `${bulan}-01`)
      .lt('tanggal', batasAtas)
      .then(({ data, error }) => {
        if (error) console.error('presensi_pegawai_kantor:', error)
        setPresensiBulan(data || [])
      })
  }, [sekolahId, bulan])

  // Bab IX: anggota kelompok binaan "Majelis Taklim" (halaman Pusat Kelompok
  // Binaan), dikelompokkan per desa. Jumlah majelis = banyaknya nama
  // kelompok berbeda di desa itu. Jumlah kegiatan tidak dicatat di sana,
  // jadi tetap diisi manual.
  // Catatan: tabel ini TIDAK punya kolom kantor (datanya global, dipakai
  // bersama semua kantor) — jangan tambahkan filter sekolah_id di sini.
  const [majelisData, setMajelisData] = useState([])
  useEffect(() => {
    supabase
      .from('kelompok_binaan_anggota')
      .select('desa, nama_kelompok')
      .eq('kelompok', 'majelis-taklim')
      .then(({ data, error }) => {
        if (error) console.error('kelompok_binaan_anggota:', error)
        setMajelisData(data || [])
      })
  }, [])

  // Bab X: surat masuk & keluar pada bulan terpilih (halaman "Surat Masuk &
  // Keluar"). Tabel ini cuma membedakan masuk/keluar — jenis surat lain
  // (surat tugas, surat keterangan, rekomendasi) tidak dibedakan di sana,
  // jadi tetap diisi manual.
  // Batas atas memakai awal bulan berikutnya (exclusive) — JANGAN pakai
  // `${bulan}-31`, karena bulan 30 hari (mis. September) membuat query gagal.
  const [suratBulan, setSuratBulan] = useState([])
  const [errorSurat, setErrorSurat] = useState('')
  useEffect(() => {
    const batasAtas = bulanBerikutnyaISO(bulan)
    if (!sekolahId || !bulan || !batasAtas) {
      setSuratBulan([])
      setErrorSurat('')
      return
    }
    supabase
      .from('surat')
      .select('jenis, tanggal')
      .eq('sekolah_id', sekolahId)
      .gte('tanggal', `${bulan}-01`)
      .lt('tanggal', batasAtas)
      .then(({ data, error }) => {
        if (error) console.error('surat:', error)
        setErrorSurat(error ? error.message : '')
        setSuratBulan(data || [])
      })
  }, [sekolahId, bulan])

  // Bab XIV: kegiatan pada bulan terpilih (halaman "Agenda Kantor").
  const [agendaBulan, setAgendaBulan] = useState([])
  useEffect(() => {
    const batasAtas = bulanBerikutnyaISO(bulan)
    if (!sekolahId || !bulan || !batasAtas) {
      setAgendaBulan([])
      return
    }
    supabase
      .from('agenda')
      .select('id, judul, tanggal_mulai, lokasi, penanggung_jawab')
      .eq('sekolah_id', sekolahId)
      .gte('tanggal_mulai', `${bulan}-01`)
      .lt('tanggal_mulai', batasAtas)
      .order('tanggal_mulai')
      .then(({ data, error }) => {
        if (error) console.error('agenda:', error)
        setAgendaBulan(data || [])
      })
  }, [sekolahId, bulan])

  // Rekap Bab II (jumlah L/P per kategori ASN/PPPK/Non-ASN) dihitung dari
  // pegawaiKantor — dipakai sebagai NILAI OTOMATIS, admin tetap bisa
  // menimpanya lewat field manual di bawah (lihat `otomatis` & aNum()).
  const rekapPegawaiOtomatis = useMemo(() => {
    const hitung = { ASN: { L: 0, P: 0 }, PPPK: { L: 0, P: 0 }, 'Non-ASN': { L: 0, P: 0 } }
    for (const p of pegawaiKantor) {
      const kategori = kategoriKepegawaian(p.status_kepegawaian)
      const jk = p.jenis_kelamin === 'P' ? 'P' : 'L'
      hitung[kategori][jk] += 1
    }
    return hitung
  }, [pegawaiKantor])

  // Bab X: surat masuk & keluar bulan terpilih. Pencocokan dibuat longgar
  // supaya tetap terbaca kalau isi kolom `jenis` ditulis "Surat Masuk"/"MASUK".
  const jumlahSuratMasukOtomatis = useMemo(
    () => suratBulan.filter((s) => (s.jenis || '').toLowerCase().includes('masuk')).length,
    [suratBulan]
  )
  const jumlahSuratKeluarOtomatis = useMemo(
    () => suratBulan.filter((s) => (s.jenis || '').toLowerCase().includes('keluar')).length,
    [suratBulan]
  )

  // Peta kunci-angka -> nilai otomatis. Dipakai oleh a()/aNum() di bawah
  // sebagai nilai bawaan setiap kali field angka yang bersangkutan masih
  // kosong — begitu admin mengisi manual, nilai manual itu yang menang
  // (pola yang sama seperti namaEfektif/nipEfektif untuk Kepala KUA).
  const otomatis = useMemo(
    () => ({
      rekapAsnL: rekapPegawaiOtomatis.ASN.L,
      rekapAsnP: rekapPegawaiOtomatis.ASN.P,
      rekapPppkL: rekapPegawaiOtomatis.PPPK.L,
      rekapPppkP: rekapPegawaiOtomatis.PPPK.P,
      rekapNonAsnL: rekapPegawaiOtomatis['Non-ASN'].L,
      rekapNonAsnP: rekapPegawaiOtomatis['Non-ASN'].P,
      suratMasuk: jumlahSuratMasukOtomatis,
      suratKeluar: jumlahSuratKeluarOtomatis,
    }),
    [rekapPegawaiOtomatis, jumlahSuratMasukOtomatis, jumlahSuratKeluarOtomatis]
  )

  // Angka yang belum tercatat di aplikasi — diisi manual. Untuk kunci yang
  // ada di `otomatis` (lihat atas), nilai otomatis dipakai selama field
  // manualnya masih kosong.
  const [angka, setAngka] = useState({})
  const ubahAngka = (kunci) => (nilai) => setAngka((s) => ({ ...s, [kunci]: nilai }))
  const nilaiAngka = (kunci) => {
    const manual = angka[kunci]
    return manual !== undefined && manual !== '' ? manual : otomatis[kunci]
  }
  const a = (kunci) => angkaTampil(nilaiAngka(kunci))
  const aNum = (kunci) => Number(nilaiAngka(kunci)) || 0

  const [kondisiKantorUmum, setKondisiKantorUmum] = useState('Baik')
  const [keteranganLain, setKeteranganLain] = useState('')

  // I. Keadaan Pegawai
  const pegawai = useDaftarBaris(PEGAWAI_AWAL, {
    nama: '', pangkat: '', jabatan: '', status: 'ASN', ket: 'Aktif',
  })

  // III. Keadaan Kehadiran Pegawai
  const kehadiran = useDaftarBaris(KEHADIRAN_AWAL, {
    nama: '', hadir: '', sakit: '', izin: '', cuti: '', dinasLuar: '', alpa: '',
  })

  // IV. Keadaan Penghulu
  const penghulu = useDaftarBaris(PENGHULU_AWAL, {
    nama: '', nip: '', pangkat: '', pelayanan: '', ket: '',
  })

  // V. Keadaan Penyuluh Agama
  const penyuluh = useDaftarBaris(PENYULUH_AWAL, {
    nama: '', status: 'ASN', wilayah: '', jumlahKegiatan: '', ket: '',
  })

  // VIII. Keadaan Masjid dan Musala
  const masjid = useDaftarBaris(MASJID_AWAL, { desa: '', masjid: '', musala: '' })

  // IX. Keadaan Majelis Taklim
  const majelis = useDaftarBaris(MAJELIS_AWAL, {
    desa: '', jumlahMajelis: '', jumlahKegiatan: '', ket: '',
  })

  // XIV. Kegiatan/Kunjungan Dinas
  const kegiatanDinas = useDaftarBaris(KEGIATAN_AWAL, {
    tanggal: '', kegiatan: '', pelaksana: '', tempat: '', ket: '',
  })

  // XV. Permasalahan dan Tindak Lanjut
  const masalah = useDaftarBaris(MASALAH_AWAL, { permasalahan: '', upaya: '', ket: '' })

  // XI. Sarana dan Prasarana — daftar tetap, hanya angka yang diisi
  const [sarana, setSarana] = useState(SARANA_AWAL)
  const ubahSarana = (i, kolom, nilai) =>
    setSarana((rows) => rows.map((r, idx) => (idx === i ? { ...r, [kolom]: nilai } : r)))
  const tambahSarana = () =>
    setSarana((rows) => [...rows, { nama: '', jumlah: '', baik: '', rusakRingan: '', rusakBerat: '' }])
  const hapusSarana = (i) => setSarana((rows) => rows.filter((_, idx) => idx !== i))

  // XII. Keadaan Gedung/Kantor — daftar tetap, kondisi + keterangan
  const [gedung, setGedung] = useState(GEDUNG_AWAL)
  const ubahGedung = (i, kolom, nilai) =>
    setGedung((rows) => rows.map((r, idx) => (idx === i ? { ...r, [kolom]: nilai } : r)))

  // XIII. Keadaan Arsip — daftar tetap, keadaan + keterangan
  const [arsip, setArsip] = useState(ARSIP_AWAL)
  const ubahArsip = (i, kolom, nilai) =>
    setArsip((rows) => rows.map((r, idx) => (idx === i ? { ...r, [kolom]: nilai } : r)))

  /* ---------------------------------------------------------------- */
  /*  ISI OTOMATIS — begitu data sumber datang, isi tabel Bab terkait. */
  /*  isiOtomatis() berhenti menimpa begitu admin menyentuh tabel yang */
  /*  bersangkutan, jadi editan manual tidak hilang saat ganti bulan.  */
  /* ---------------------------------------------------------------- */

  // Bab I: daftar pegawai dari pegawaiKantor.
  useEffect(() => {
    pegawai.isiOtomatis(
      pegawaiKantor.map((p) => ({
        id: p.id,
        nama: p.nip ? `${p.nama_lengkap} / ${p.nip}` : p.nama_lengkap,
        pangkat: p.pangkat_golongan || '',
        jabatan: p.jabatan || '',
        status: kategoriKepegawaian(p.status_kepegawaian),
        ket: 'Aktif',
      }))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pegawaiKantor])

  // Bab III: rekap kehadiran per pegawai untuk bulan terpilih. Kolom Cuti &
  // Dinas Luar tidak punya sumber otomatis — nilai yang sudah diketik admin
  // dipertahankan saat data presensi dimuat ulang.
  useEffect(() => {
    kehadiran.isiOtomatis((sebelumnya) => {
      const lama = new Map(sebelumnya.map((r) => [r.id, r]))
      return pegawaiKantor.map((p) => {
        const milikSaya = presensiBulan.filter((r) => r.pegawai_kantor_id === p.id)
        const hitung = (status) => milikSaya.filter((r) => r.status === status).length
        return {
          id: p.id,
          nama: p.nama_lengkap,
          hadir: hitung('hadir'),
          sakit: hitung('sakit'),
          izin: hitung('izin'),
          cuti: lama.get(p.id)?.cuti ?? '',
          dinasLuar: lama.get(p.id)?.dinasLuar ?? '',
          alpa: hitung('alpa'),
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pegawaiKantor, presensiBulan])

  // Bab IV: penghulu — disaring dari Data Pegawai berdasarkan jabatan.
  // Jumlah pelayanan nikah per penghulu belum tercatat, jadi tetap manual.
  useEffect(() => {
    penghulu.isiOtomatis((sebelumnya) => {
      const lama = new Map(sebelumnya.map((r) => [r.id, r]))
      return pegawaiKantor
        .filter((p) => punyaJabatan(p, 'penghulu'))
        .map((p) => ({
          id: p.id,
          nama: p.nama_lengkap,
          nip: p.nip || '',
          pangkat: p.pangkat_golongan || '',
          pelayanan: lama.get(p.id)?.pelayanan ?? '',
          ket: lama.get(p.id)?.ket ?? '',
        }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pegawaiKantor])

  // Bab V: penyuluh agama — disaring dari Data Pegawai berdasarkan jabatan.
  // Wilayah binaan & jumlah kegiatan belum tercatat, jadi tetap manual.
  useEffect(() => {
    penyuluh.isiOtomatis((sebelumnya) => {
      const lama = new Map(sebelumnya.map((r) => [r.id, r]))
      return pegawaiKantor
        .filter((p) => punyaJabatan(p, 'penyuluh'))
        .map((p) => ({
          id: p.id,
          nama: p.nama_lengkap,
          status: kategoriKepegawaian(p.status_kepegawaian),
          wilayah: lama.get(p.id)?.wilayah ?? '',
          jumlahKegiatan: lama.get(p.id)?.jumlahKegiatan ?? '',
          ket: lama.get(p.id)?.ket ?? '',
        }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pegawaiKantor])

  // Bab IX: jumlah majelis taklim per desa dari data kelompok binaan.
  useEffect(() => {
    const petaDesa = {}
    for (const row of majelisData) {
      const desa = (row.desa || '').trim() || 'Belum diisi'
      if (!petaDesa[desa]) petaDesa[desa] = new Set()
      if (row.nama_kelompok) petaDesa[desa].add(row.nama_kelompok.trim())
    }
    majelis.isiOtomatis((sebelumnya) => {
      const lama = new Map(sebelumnya.map((r) => [r.id, r]))
      return Object.entries(petaDesa).map(([desa, namaKelompokSet]) => ({
        id: desa,
        desa,
        jumlahMajelis: namaKelompokSet.size,
        jumlahKegiatan: lama.get(desa)?.jumlahKegiatan ?? '', // manual
        ket: lama.get(desa)?.ket ?? '',
      }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [majelisData])

  // Bab XIV: kegiatan/kunjungan dinas dari Agenda Kantor bulan terpilih.
  useEffect(() => {
    kegiatanDinas.isiOtomatis(
      agendaBulan.map((row) => ({
        id: row.id,
        tanggal: (row.tanggal_mulai || '').slice(0, 10),
        kegiatan: row.judul || '',
        pelaksana: row.penanggung_jawab || '',
        tempat: row.lokasi || '',
        ket: '',
      }))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaBulan])

  // Profil kantor — di-scope per kantor lewat sekolah_id.
  // Memakai select('*') supaya satu kolom yang belum ada di tabel tidak membuat
  // seluruh query gagal (dan seluruh kop/tanda tangan jadi titik-titik).
  useEffect(() => {
    if (!sekolahId) {
      setProfilKantor(null)
      return
    }
    supabase
      .from('profil_kantor')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('profil_kantor:', error)
        setErrorProfil(error ? error.message : '')
        setProfilKantor(data)
      })
  }, [sekolahId])

  // Pendaftaran nikah — diambil sekali, disaring per bulan di sisi klien.
  useEffect(() => {
    if (!sekolahId) {
      setDataNikah([])
      setLoadingNikah(false)
      return
    }
    let aktif = true
    setLoadingNikah(true)
    setErrorNikah('')
    supabase
      .from('pendaftaran_nikah')
      .select('id, status, data_n1, data_n2, dibuat_pada, diverifikasi_pada')
      .eq('sekolah_id', sekolahId)
      .neq('status', 'draft')
      .order('dibuat_pada', { ascending: true })
      .then(({ data, error }) => {
        if (!aktif) return
        if (error) {
          setErrorNikah(error.message)
          setDataNikah([])
        } else {
          setDataNikah(data || [])
        }
        setLoadingNikah(false)
      })
    return () => {
      aktif = false
    }
  }, [sekolahId])

  const logoUrl = profilKantor?.logo_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.logo_path).data.publicUrl
    : null

  const ttdKepalaKuaUrl = profilKantor?.ttd_kepala_kua_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.ttd_kepala_kua_path).data.publicUrl
    : null

  // Rekap otomatis dari data pendaftaran nikah untuk bulan terpilih (sama
  // dengan logika di halaman Laporan Kepala KUA)
  const rekapNikah = useMemo(() => {
    const peristiwa = dataNikah
      .filter((r) => r.status === 'diverifikasi')
      .filter((r) => (r.data_n2?.rencana_tanggal_akad || '').slice(0, 7) === bulan)
      .map((r) => {
        const tempat = (r.data_n2?.tempat_akad || '').trim()
        let lokasi = 'Belum diisi'
        if (tempat) lokasi = POLA_DI_KUA.test(tempat) ? 'Di KUA' : 'Di luar KUA'
        return { id: r.id, lokasi }
      })
    return {
      peristiwa,
      diKua: peristiwa.filter((p) => p.lokasi === 'Di KUA').length,
      luarKua: peristiwa.filter((p) => p.lokasi === 'Di luar KUA').length,
    }
  }, [dataNikah, bulan])

  const namaEfektif = namaKepala || profilKantor?.kepala_kua || ''
  const nipEfektif = nipKepala || profilKantor?.nip_kepala_kua || ''
  const provinsiEfektif = provinsi || profilKantor?.provinsi || ''
  const namaKantor = profilKantor?.nama_kantor || 'KUA Kecamatan ..........................'
  const jabatanEfektif = jabatan || `Kepala ${profilKantor?.nama_kantor || 'KUA Kecamatan'}`
  const kemenagKota = denganAwalanWilayah(profilKantor?.kabupaten)
  const { bulan: namaBulanSaja, tahun } = pecahBulan(bulan)
  const periode = namaBulanSaja ? `${namaBulanSaja} ${tahun}` : ''
  const tempatTtd = profilKantor?.tempat_ttd || profilKantor?.kabupaten || ''
  const tanggalLaporanFormatted = formatTanggalIndonesia(tanggalLaporan)
  const alamatKantor = [profilKantor?.alamat, profilKantor?.kecamatan, profilKantor?.kabupaten]
    .filter(Boolean)
    .join(', ')

  // Total baris untuk tabel-tabel rekap
  const totalMasjid = jumlahkan(masjid.rows, 'masjid')
  const totalMusala = jumlahkan(masjid.rows, 'musala')
  const totalMajelis = jumlahkan(majelis.rows, 'jumlahMajelis')

  const rekapPegawaiRows = [
    ['ASN', aNum('rekapAsnL'), aNum('rekapAsnP')],
    ['PPPK', aNum('rekapPppkL'), aNum('rekapPppkP')],
    ['Non-ASN', aNum('rekapNonAsnL'), aNum('rekapNonAsnP')],
  ]
  const totalL = rekapPegawaiRows.reduce((t, r) => t + r[1], 0)
  const totalP = rekapPegawaiRows.reduce((t, r) => t + r[2], 0)

  const pernikahanRows = [
    ['Nikah di KUA', rekapNikah.diKua],
    ['Nikah di luar KUA', rekapNikah.luarKua],
    ['Jumlah seluruh peristiwa nikah', rekapNikah.peristiwa.length],
    ['Rujuk', a('rujuk')],
    ['Rekomendasi nikah', a('rekomendasiNikah')],
    ['Duplikat buku nikah', a('duplikatBukuNikah')],
    ['Konsultasi pernikahan', a('konsultasiNikah')],
  ]

  const wakafRows = [
    ['Akta Ikrar Wakaf', a('wakafAktaIkrar')],
    ['Pendaftaran wakaf', a('wakafPendaftaran')],
    ['Sertifikat tanah wakaf', a('wakafSertifikat')],
    ['Tanah wakaf', a('wakafTanah')],
    ['Konsultasi wakaf', a('wakafKonsultasi')],
  ]

  const suratRows = [
    ['Surat masuk', a('suratMasuk')],
    ['Surat keluar', a('suratKeluar')],
    ['Surat tugas', a('suratTugas')],
    ['Surat keterangan', a('suratKeterangan')],
    ['Rekomendasi', a('suratRekomendasi')],
  ]

  const rekapBulananRows = [
    ['Jumlah pegawai', `${jumlahTerisi(pegawai.rows)} orang`],
    ['Jumlah penghulu', `${jumlahTerisi(penghulu.rows)} orang`],
    ['Jumlah penyuluh', `${jumlahTerisi(penyuluh.rows)} orang`],
    ['Jumlah peristiwa nikah', rekapNikah.peristiwa.length],
    ['Jumlah wakaf', a('wakafPendaftaran')],
    ['Jumlah masjid', totalMasjid],
    ['Jumlah musala', totalMusala],
    ['Jumlah majelis taklim', totalMajelis],
    ['Surat masuk', a('suratMasuk')],
    ['Surat keluar', a('suratKeluar')],
    ['Kondisi kantor', kondisiKantorUmum],
    ['Keterangan lainnya', isi(keteranganLain)],
  ]

  return (
    <Layout
      title="Laporan Bulanan KUA"
      subtitle="Laporan bulanan keadaan pegawai dan administrasi KUA Kecamatan, sebagian otomatis terisi dari data pendaftaran nikah, data pegawai, presensi, kelompok binaan, surat, agenda, dan profil kantor."
    >
      <div className="no-print flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5">
        <Link
          to={HALAMAN_KEMBALI}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Kembali
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
        >
          <Printer size={16} /> Cetak Laporan
        </button>
      </div>

      {/* === FORM DATA LAPORAN — TIDAK IKUT TERCETAK === */}
      <div className="no-print bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 mb-5">
        <h2 className="font-display text-sm font-semibold text-slate-900 mb-3">Data Laporan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldText label="Bulan Laporan" type="month" value={bulan} onChange={setBulan} />
          <FieldText label="Tanggal Laporan" type="date" value={tanggalLaporan} onChange={setTanggalLaporan} />
          <FieldText
            label="Nama Kepala KUA"
            value={namaKepala}
            onChange={setNamaKepala}
            placeholder={profilKantor?.kepala_kua ? `Otomatis: ${profilKantor.kepala_kua}` : ''}
          />
          <FieldText
            label="NIP"
            value={nipKepala}
            onChange={setNipKepala}
            placeholder={profilKantor?.nip_kepala_kua ? `Otomatis: ${profilKantor.nip_kepala_kua}` : 'Opsional'}
          />
          <FieldText label="Jabatan" value={jabatan} onChange={setJabatan} placeholder={`Otomatis: ${jabatanEfektif}`} />
          <FieldText
            label="Provinsi"
            value={provinsi}
            onChange={setProvinsi}
            placeholder={profilKantor?.provinsi ? `Otomatis: ${profilKantor.provinsi}` : ''}
          />
          <div className="hidden sm:block" />
          <PilihModeTtd value={modeTtd} onChange={setModeTtd} profilKantor={profilKantor} namaPembuat={namaEfektif} nipPembuat={nipEfektif} />

          <SubJudulForm>I. Keadaan Pegawai — otomatis dari Data Pegawai</SubJudulForm>
          <TabelEditorForm
            labelTambah="Tambah pegawai"
            rows={pegawai.rows}
            ubah={pegawai.ubah}
            tambah={pegawai.tambah}
            hapus={pegawai.hapus}
            kolom={[
              { key: 'nama', label: 'Nama/NIP', lebar: 'col-span-2 sm:col-span-2' },
              { key: 'pangkat', label: 'Pangkat/Gol.' },
              { key: 'jabatan', label: 'Jabatan' },
              { key: 'status', label: 'Status (ASN/Non-ASN)' },
              { key: 'ket', label: 'Ket.' },
            ]}
          />

          <SubJudulForm>II. Rekapitulasi Pegawai (jumlah orang) — otomatis dari Data Pegawai</SubJudulForm>
          <FieldText label="ASN — Laki-laki" type="number" min="0" value={angka.rekapAsnL ?? ''} onChange={ubahAngka('rekapAsnL')} placeholder={`Otomatis: ${otomatis.rekapAsnL}`} />
          <FieldText label="ASN — Perempuan" type="number" min="0" value={angka.rekapAsnP ?? ''} onChange={ubahAngka('rekapAsnP')} placeholder={`Otomatis: ${otomatis.rekapAsnP}`} />
          <FieldText label="PPPK — Laki-laki" type="number" min="0" value={angka.rekapPppkL ?? ''} onChange={ubahAngka('rekapPppkL')} placeholder={`Otomatis: ${otomatis.rekapPppkL}`} />
          <FieldText label="PPPK — Perempuan" type="number" min="0" value={angka.rekapPppkP ?? ''} onChange={ubahAngka('rekapPppkP')} placeholder={`Otomatis: ${otomatis.rekapPppkP}`} />
          <FieldText label="Non-ASN — Laki-laki" type="number" min="0" value={angka.rekapNonAsnL ?? ''} onChange={ubahAngka('rekapNonAsnL')} placeholder={`Otomatis: ${otomatis.rekapNonAsnL}`} />
          <FieldText label="Non-ASN — Perempuan" type="number" min="0" value={angka.rekapNonAsnP ?? ''} onChange={ubahAngka('rekapNonAsnP')} placeholder={`Otomatis: ${otomatis.rekapNonAsnP}`} />

          <SubJudulForm>III. Keadaan Kehadiran Pegawai — hadir/sakit/izin/alpa otomatis dari Presensi Pegawai; cuti & dinas luar manual</SubJudulForm>
          <TabelEditorForm
            labelTambah="Tambah baris kehadiran"
            rows={kehadiran.rows}
            ubah={kehadiran.ubah}
            tambah={kehadiran.tambah}
            hapus={kehadiran.hapus}
            kolom={[
              { key: 'nama', label: 'Nama Pegawai', lebar: 'col-span-2 sm:col-span-2' },
              { key: 'hadir', label: 'Hadir', type: 'number' },
              { key: 'sakit', label: 'Sakit', type: 'number' },
              { key: 'izin', label: 'Izin', type: 'number' },
              { key: 'cuti', label: 'Cuti', type: 'number' },
              { key: 'dinasLuar', label: 'Dinas Luar', type: 'number' },
              { key: 'alpa', label: 'Alpa', type: 'number' },
            ]}
          />

          <SubJudulForm>IV. Keadaan Penghulu — otomatis dari Data Pegawai (jabatan mengandung "penghulu"); pelayanan nikah manual</SubJudulForm>
          <TabelEditorForm
            labelTambah="Tambah penghulu"
            rows={penghulu.rows}
            ubah={penghulu.ubah}
            tambah={penghulu.tambah}
            hapus={penghulu.hapus}
            kolom={[
              { key: 'nama', label: 'Nama Penghulu', lebar: 'col-span-2' },
              { key: 'nip', label: 'NIP' },
              { key: 'pangkat', label: 'Pangkat/Gol.' },
              { key: 'pelayanan', label: 'Pelayanan Nikah', type: 'number' },
              { key: 'ket', label: 'Ket.' },
            ]}
          />

          <SubJudulForm>V. Keadaan Penyuluh Agama — otomatis dari Data Pegawai (jabatan mengandung "penyuluh"); wilayah & kegiatan manual</SubJudulForm>
          <TabelEditorForm
            labelTambah="Tambah penyuluh"
            rows={penyuluh.rows}
            ubah={penyuluh.ubah}
            tambah={penyuluh.tambah}
            hapus={penyuluh.hapus}
            kolom={[
              { key: 'nama', label: 'Nama Penyuluh', lebar: 'col-span-2' },
              { key: 'status', label: 'Status (ASN/Non-ASN)' },
              { key: 'wilayah', label: 'Wilayah Binaan' },
              { key: 'jumlahKegiatan', label: 'Jumlah Kegiatan', type: 'number' },
              { key: 'ket', label: 'Ket.' },
            ]}
          />

          <SubJudulForm>VI. Keadaan Pernikahan — diisi manual (nikah di/luar KUA sudah otomatis)</SubJudulForm>
          <FieldText label="Rujuk" type="number" min="0" value={angka.rujuk ?? ''} onChange={ubahAngka('rujuk')} />
          <FieldText label="Rekomendasi nikah" type="number" min="0" value={angka.rekomendasiNikah ?? ''} onChange={ubahAngka('rekomendasiNikah')} />
          <FieldText label="Duplikat buku nikah" type="number" min="0" value={angka.duplikatBukuNikah ?? ''} onChange={ubahAngka('duplikatBukuNikah')} />
          <FieldText label="Konsultasi pernikahan" type="number" min="0" value={angka.konsultasiNikah ?? ''} onChange={ubahAngka('konsultasiNikah')} />

          <SubJudulForm>VII. Keadaan Wakaf</SubJudulForm>
          <FieldText label="Akta Ikrar Wakaf" type="number" min="0" value={angka.wakafAktaIkrar ?? ''} onChange={ubahAngka('wakafAktaIkrar')} />
          <FieldText label="Pendaftaran wakaf" type="number" min="0" value={angka.wakafPendaftaran ?? ''} onChange={ubahAngka('wakafPendaftaran')} />
          <FieldText label="Sertifikat tanah wakaf" type="number" min="0" value={angka.wakafSertifikat ?? ''} onChange={ubahAngka('wakafSertifikat')} />
          <FieldText label="Tanah wakaf" type="number" min="0" value={angka.wakafTanah ?? ''} onChange={ubahAngka('wakafTanah')} />
          <FieldText label="Konsultasi wakaf" type="number" min="0" value={angka.wakafKonsultasi ?? ''} onChange={ubahAngka('wakafKonsultasi')} />

          <SubJudulForm>VIII. Keadaan Masjid dan Musala</SubJudulForm>
          <TabelEditorForm
            labelTambah="Tambah desa/kelurahan"
            rows={masjid.rows}
            ubah={masjid.ubah}
            tambah={masjid.tambah}
            hapus={masjid.hapus}
            kolom={[
              { key: 'desa', label: 'Desa/Kelurahan', lebar: 'col-span-2 sm:col-span-3' },
              { key: 'masjid', label: 'Masjid', type: 'number' },
              { key: 'musala', label: 'Musala', type: 'number' },
            ]}
          />

          <SubJudulForm>IX. Keadaan Majelis Taklim — jumlah majelis otomatis dari Kelompok Binaan; jumlah kegiatan manual</SubJudulForm>
          <TabelEditorForm
            labelTambah="Tambah desa/kelurahan"
            rows={majelis.rows}
            ubah={majelis.ubah}
            tambah={majelis.tambah}
            hapus={majelis.hapus}
            kolom={[
              { key: 'desa', label: 'Desa/Kelurahan', lebar: 'col-span-2' },
              { key: 'jumlahMajelis', label: 'Jumlah Majelis Taklim', type: 'number' },
              { key: 'jumlahKegiatan', label: 'Jumlah Kegiatan', type: 'number' },
              { key: 'ket', label: 'Ket.' },
            ]}
          />

          <SubJudulForm>X. Administrasi Surat — surat masuk/keluar otomatis dari Surat Masuk & Keluar</SubJudulForm>
          <FieldText label="Surat masuk" type="number" min="0" value={angka.suratMasuk ?? ''} onChange={ubahAngka('suratMasuk')} placeholder={`Otomatis: ${otomatis.suratMasuk}`} />
          <FieldText label="Surat keluar" type="number" min="0" value={angka.suratKeluar ?? ''} onChange={ubahAngka('suratKeluar')} placeholder={`Otomatis: ${otomatis.suratKeluar}`} />
          <FieldText label="Surat tugas" type="number" min="0" value={angka.suratTugas ?? ''} onChange={ubahAngka('suratTugas')} />
          <FieldText label="Surat keterangan" type="number" min="0" value={angka.suratKeterangan ?? ''} onChange={ubahAngka('suratKeterangan')} />
          <FieldText label="Rekomendasi" type="number" min="0" value={angka.suratRekomendasi ?? ''} onChange={ubahAngka('suratRekomendasi')} />

          <SubJudulForm>XI. Sarana dan Prasarana</SubJudulForm>
          <div className="sm:col-span-2 space-y-2">
            {sarana.map((r, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end border border-slate-100 rounded-lg p-2">
                <div className="col-span-2">
                  <FieldText label="Jenis Barang" value={r.nama} onChange={(v) => ubahSarana(i, 'nama', v)} />
                </div>
                <FieldText label="Jumlah" type="number" min="0" value={r.jumlah} onChange={(v) => ubahSarana(i, 'jumlah', v)} />
                <FieldText label="Baik" type="number" min="0" value={r.baik} onChange={(v) => ubahSarana(i, 'baik', v)} />
                <FieldText label="Rusak Ringan" type="number" min="0" value={r.rusakRingan} onChange={(v) => ubahSarana(i, 'rusakRingan', v)} />
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <FieldText label="Rusak Berat" type="number" min="0" value={r.rusakBerat} onChange={(v) => ubahSarana(i, 'rusakBerat', v)} />
                  </div>
                  <button type="button" onClick={() => hapusSarana(i)} className="p-2 text-slate-400 hover:text-red-600" aria-label="Hapus baris">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={tambahSarana} className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900">
              <Plus size={16} /> Tambah barang
            </button>
          </div>

          <SubJudulForm>XII. Keadaan Gedung/Kantor</SubJudulForm>
          <div className="sm:col-span-2 space-y-2">
            {gedung.map((r, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end border border-slate-100 rounded-lg p-2">
                <div className="col-span-2 sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Uraian</label>
                  <p className="text-sm text-slate-800 px-3 py-2">{r.uraian}</p>
                </div>
                <FieldSelect label="Kondisi" value={r.kondisi} onChange={(v) => ubahGedung(i, 'kondisi', v)} options={['Baik', 'Rusak']} />
                <div className="col-span-2">
                  <FieldText label="Keterangan" value={r.ket} onChange={(v) => ubahGedung(i, 'ket', v)} />
                </div>
              </div>
            ))}
          </div>

          <SubJudulForm>XIII. Keadaan Arsip</SubJudulForm>
          <div className="sm:col-span-2 space-y-2">
            {arsip.map((r, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end border border-slate-100 rounded-lg p-2">
                <div className="col-span-2 sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Jenis Arsip</label>
                  <p className="text-sm text-slate-800 px-3 py-2">{r.jenis}</p>
                </div>
                <FieldSelect label="Keadaan" value={r.keadaan} onChange={(v) => ubahArsip(i, 'keadaan', v)} options={['Baik', 'Cukup']} />
                <div className="col-span-2">
                  <FieldText label="Keterangan" value={r.ket} onChange={(v) => ubahArsip(i, 'ket', v)} />
                </div>
              </div>
            ))}
          </div>

          <SubJudulForm>XIV. Kegiatan/Kunjungan Dinas — otomatis dari Agenda Kantor</SubJudulForm>
          <TabelEditorForm
            labelTambah="Tambah kegiatan"
            rows={kegiatanDinas.rows}
            ubah={kegiatanDinas.ubah}
            tambah={kegiatanDinas.tambah}
            hapus={kegiatanDinas.hapus}
            kolom={[
              { key: 'tanggal', label: 'Tanggal', type: 'date' },
              { key: 'kegiatan', label: 'Kegiatan', lebar: 'col-span-2' },
              { key: 'pelaksana', label: 'Pelaksana' },
              { key: 'tempat', label: 'Tempat' },
              { key: 'ket', label: 'Ket.' },
            ]}
          />

          <SubJudulForm>XV. Permasalahan dan Tindak Lanjut</SubJudulForm>
          <TabelEditorForm
            labelTambah="Tambah baris"
            rows={masalah.rows}
            ubah={masalah.ubah}
            tambah={masalah.tambah}
            hapus={masalah.hapus}
            kolom={[
              { key: 'permasalahan', label: 'Permasalahan', lebar: 'col-span-2 sm:col-span-2' },
              { key: 'upaya', label: 'Upaya/Tindak Lanjut', lebar: 'col-span-2 sm:col-span-2' },
              { key: 'ket', label: 'Ket.' },
            ]}
          />

          <SubJudulForm>XVI. Rekapitulasi Keadaan Bulanan</SubJudulForm>
          <FieldSelect label="Kondisi kantor" value={kondisiKantorUmum} onChange={setKondisiKantorUmum} options={['Baik', 'Cukup', 'Rusak']} />
          <FieldText label="Keterangan lainnya" value={keteranganLain} onChange={setKeteranganLain} />
        </div>

        <div className="mt-3 text-xs text-slate-500 space-y-1">
          {errorProfil && (
            <p className="text-red-600">Gagal memuat Profil Kantor: {errorProfil}</p>
          )}
          {errorSurat && (
            <p className="text-red-600">Gagal memuat data surat: {errorSurat}</p>
          )}
          {loadingNikah && <p>Memuat data pendaftaran nikah…</p>}
          {!loadingNikah && errorNikah && (
            <p className="text-red-600">Gagal memuat data pendaftaran nikah: {errorNikah}</p>
          )}
          {!loadingNikah && !errorNikah && (
            <p>
              Data terbaca otomatis: {rekapNikah.peristiwa.length} akad nikah pada {periode || 'bulan terpilih'}
              ({rekapNikah.diKua} di KUA, {rekapNikah.luarKua} di luar KUA).
            </p>
          )}
          <p>
            Juga terbaca otomatis: {pegawaiKantor.length} pegawai aktif, {jumlahSuratMasukOtomatis} surat masuk &
            {' '}{jumlahSuratKeluarOtomatis} surat keluar, {agendaBulan.length} kegiatan agenda pada {periode || 'bulan terpilih'}.
          </p>
          <p className="text-slate-400">
            Kop surat, Kepala KUA, dan tanda tangan ditarik otomatis dari Profil Kantor. Field bertanda
            "Otomatis: ..." sudah terisi sendiri dari data yang ada — kosongkan untuk memakainya, atau isi manual
            untuk menimpanya. Tabel yang terisi otomatis berhenti diperbarui begitu kamu mengeditnya, jadi hasil
            ketikanmu tidak hilang saat ganti bulan. Angka yang belum tercatat di aplikasi tetap diisi manual;
            yang dikosongkan tampil sebagai titik-titik.
          </p>
        </div>
      </div>

      {/* === PRATINJAU CETAK === */}
      <div className="print:overflow-visible overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-4">
        <div
          className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 mx-auto"
          style={{ width: '210mm', maxWidth: 'none' }}
        >
          {/* === KOP SURAT OTOMATIS === */}
          <div className="kop-surat flex items-center gap-4 border-b-2 border-slate-800 pb-3 mb-6">
            {logoUrl && (
              <img src={logoUrl} alt="Logo Instansi" className="w-16 h-16 object-contain shrink-0" />
            )}
            <div className="text-center flex-1">
              <p className="font-display text-sm font-bold uppercase text-slate-900 leading-tight">
                Kementerian Agama Republik Indonesia
              </p>
              <p className="font-display text-sm font-bold uppercase text-slate-900 leading-tight">
                Kantor Kementerian Agama {kemenagKota}
              </p>
              <p className="font-display text-base font-bold uppercase text-slate-900 leading-tight">
                {profilKantor?.nama_kantor || 'Nama Kantor Belum Diatur'}
              </p>
              <p className="text-xs text-slate-600 leading-tight">Alamat: {alamatKantor || PLACEHOLDER}</p>
              {(profilKantor?.telepon || profilKantor?.email) && (
                <p className="text-xs text-slate-600 leading-tight">
                  {[profilKantor?.telepon && `Telp. ${profilKantor.telepon}`, profilKantor?.email]
                    .filter(Boolean)
                    .join(' | ')}
                </p>
              )}
            </div>
          </div>

          {/* === JUDUL === */}
          <div className="text-center mb-6">
            <h1 className="font-display text-base font-bold uppercase text-slate-900 leading-snug">
              Laporan Bulanan
            </h1>
            <p className="font-display text-base font-bold uppercase text-slate-900 leading-snug">
              Keadaan Pegawai dan Administrasi
            </p>
            <p className="font-display text-base font-bold uppercase text-slate-900 leading-snug">
              Kantor Urusan Agama (KUA)
            </p>
            <p className="font-display text-sm font-bold uppercase text-slate-900 leading-snug mt-2">
              {namaKantor}
            </p>
            <p className="text-sm text-slate-700">
              Bulan {namaBulanSaja || PLACEHOLDER} Tahun {tahun || '2026'}
            </p>
            <p className="text-sm text-slate-700">
              Kabupaten/Kota: {profilKantor?.kabupaten || PLACEHOLDER} &nbsp;|&nbsp; Provinsi: {isi(provinsiEfektif)}
            </p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-slate-700">
            <Bab no="I" judul="Keadaan Pegawai">
              <TabelCetak
                header={['No', 'Nama/NIP', 'Pangkat/Gol.', 'Jabatan', 'Status', 'Ket.']}
                baris={pegawai.rows.map((r, i) => [i + 1, r.nama, r.pangkat, r.jabatan, r.status, r.ket])}
              />
            </Bab>

            <Bab no="II" judul="Rekapitulasi Pegawai">
              <TabelCetak
                header={['No', 'Uraian', 'Laki-laki', 'Perempuan', 'Jumlah']}
                baris={rekapPegawaiRows.map((r, i) => [i + 1, r[0], r[1], r[2], r[1] + r[2]])}
                footer={['', 'JUMLAH', totalL, totalP, totalL + totalP]}
              />
            </Bab>

            <Bab no="III" judul="Keadaan Kehadiran Pegawai">
              <TabelCetak
                header={['No', 'Nama Pegawai', 'Hadir', 'Sakit', 'Izin', 'Cuti', 'Dinas Luar', 'Alpa']}
                baris={kehadiran.rows.map((r, i) => [
                  i + 1, r.nama, angkaTampil(r.hadir), angkaTampil(r.sakit), angkaTampil(r.izin),
                  angkaTampil(r.cuti), angkaTampil(r.dinasLuar), angkaTampil(r.alpa),
                ])}
              />
            </Bab>

            <Bab no="IV" judul="Keadaan Penghulu">
              <TabelCetak
                header={['No', 'Nama Penghulu', 'NIP', 'Pangkat/Gol.', 'Pelayanan Nikah', 'Ket.']}
                baris={penghulu.rows.map((r, i) => [i + 1, r.nama, r.nip, r.pangkat, angkaTampil(r.pelayanan), r.ket])}
              />
            </Bab>

            <Bab no="V" judul="Keadaan Penyuluh Agama">
              <TabelCetak
                header={['No', 'Nama Penyuluh', 'Status', 'Wilayah Binaan', 'Jumlah Kegiatan', 'Ket.']}
                baris={penyuluh.rows.map((r, i) => [i + 1, r.nama, r.status, r.wilayah, angkaTampil(r.jumlahKegiatan), r.ket])}
              />
            </Bab>

            <Bab no="VI" judul="Keadaan Pernikahan">
              <TabelCetak
                header={['No', 'Uraian', 'Jumlah']}
                baris={pernikahanRows.map((r, i) => [i + 1, r[0], r[1]])}
              />
            </Bab>

            <Bab no="VII" judul="Keadaan Wakaf">
              <TabelCetak
                header={['No', 'Uraian', 'Jumlah']}
                baris={wakafRows.map((r, i) => [i + 1, r[0], r[1]])}
              />
            </Bab>

            <Bab no="VIII" judul="Keadaan Masjid dan Musala">
              <TabelCetak
                header={['No', 'Desa/Kelurahan', 'Masjid', 'Musala', 'Jumlah']}
                baris={masjid.rows.map((r, i) => [
                  i + 1, r.desa, angkaTampil(r.masjid), angkaTampil(r.musala),
                  (Number(r.masjid) || 0) + (Number(r.musala) || 0),
                ])}
                footer={['', 'JUMLAH', totalMasjid, totalMusala, totalMasjid + totalMusala]}
              />
            </Bab>

            <Bab no="IX" judul="Keadaan Majelis Taklim">
              <TabelCetak
                header={['No', 'Desa/Kelurahan', 'Jumlah Majelis Taklim', 'Jumlah Kegiatan', 'Ket.']}
                baris={majelis.rows.map((r, i) => [i + 1, r.desa, angkaTampil(r.jumlahMajelis), angkaTampil(r.jumlahKegiatan), r.ket])}
                footer={['', 'JUMLAH', totalMajelis, jumlahkan(majelis.rows, 'jumlahKegiatan'), '']}
              />
            </Bab>

            <Bab no="X" judul="Administrasi Surat">
              <TabelCetak
                header={['No', 'Jenis Surat', 'Jumlah']}
                baris={suratRows.map((r, i) => [i + 1, r[0], r[1]])}
              />
            </Bab>

            <Bab no="XI" judul="Sarana dan Prasarana">
              <TabelCetak
                header={['No', 'Jenis Barang', 'Jumlah', 'Baik', 'Rusak Ringan', 'Rusak Berat']}
                baris={sarana.map((r, i) => [
                  i + 1, r.nama, angkaTampil(r.jumlah), angkaTampil(r.baik), angkaTampil(r.rusakRingan), angkaTampil(r.rusakBerat),
                ])}
              />
            </Bab>

            <Bab no="XII" judul="Keadaan Gedung/Kantor">
              <TabelCetak
                header={['No', 'Uraian', 'Kondisi', 'Keterangan']}
                baris={gedung.map((r, i) => [i + 1, r.uraian, r.kondisi, r.ket])}
              />
            </Bab>

            <Bab no="XIII" judul="Keadaan Arsip">
              <TabelCetak
                header={['No', 'Jenis Arsip', 'Keadaan', 'Keterangan']}
                baris={arsip.map((r, i) => [i + 1, r.jenis, r.keadaan, r.ket])}
              />
            </Bab>

            <Bab no="XIV" judul="Kegiatan/Kunjungan Dinas">
              <TabelCetak
                header={['No', 'Tanggal', 'Kegiatan', 'Pelaksana', 'Tempat', 'Ket.']}
                baris={kegiatanDinas.rows.map((r, i) => [
                  i + 1, formatTanggalIndonesia(r.tanggal) || '........', r.kegiatan, r.pelaksana, r.tempat, r.ket,
                ])}
              />
            </Bab>

            <Bab no="XV" judul="Permasalahan dan Tindak Lanjut">
              <TabelCetak
                header={['No', 'Permasalahan', 'Upaya/Tindak Lanjut', 'Ket.']}
                baris={masalah.rows.map((r, i) => [i + 1, r.permasalahan, r.upaya, r.ket])}
              />
            </Bab>

            <Bab no="XVI" judul="Rekapitulasi Keadaan Bulanan">
              <TabelCetak
                header={['No', 'Uraian', 'Jumlah/Keterangan']}
                baris={rekapBulananRows.map((r, i) => [i + 1, r[0], r[1]])}
              />
            </Bab>

            {/* PENUTUP */}
            <section>
              <h2 className="font-display text-[15px] font-semibold uppercase text-slate-900 mb-2">Penutup</h2>
              <p className="text-justify">
                Demikian laporan bulanan keadaan pegawai dan administrasi {namaKantor} bulan{' '}
                {namaBulanSaja || PLACEHOLDER} tahun {tahun || '2026'} dibuat sebagai bahan laporan, evaluasi,
                dan dokumentasi.
              </p>
            </section>
          </div>

          {/* === TANDA TANGAN OTOMATIS === */}
          <BlokTandaTangan
            profilKantor={profilKantor}
            ttdKepalaKuaUrl={ttdKepalaKuaUrl}
            mode={modeTtd}
            namaPembuat={namaEfektif}
            nipPembuat={nipEfektif}
            jabatanPembuat={jabatanEfektif}
            labelNipPembuat="NIP."
            tempatTanggal={tempatTtd && tanggalLaporanFormatted ? `${tempatTtd}, ${tanggalLaporanFormatted}` : ''}
          />
        </div>
      </div>

      <style>{`
        .lembar-cetak.print-only {
          position: static !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        @media screen {
          .lembar-cetak.print-only {
            display: block !important;
          }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .lap-table {
            page-break-inside: auto;
          }
          .lap-table thead {
            display: table-header-group;
          }
          .lap-table tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .lembar-cetak section h2 {
            page-break-after: avoid;
            break-after: avoid;
          }
          .ttd-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        @page {
          size: A4;
          margin: 15mm;
        }
      `}</style>
    </Layout>
  )
}
