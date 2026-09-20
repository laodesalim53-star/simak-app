import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, Plus, Trash2, ImagePlus } from 'lucide-react'
import Layout from '../components/Layout'
import BlokTandaTangan, { PilihModeTtd } from '../components/BlokTandaTangan'
import RingkasanAset from '../components/RingkasanAset'

// Ganti kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

// Ganti tujuan tombol "Kembali" sesuai menu tempat halaman ini diletakkan
const HALAMAN_KEMBALI = '/dashboard'

const PLACEHOLDER = '..............................'
const PH_ANGKA = '....'

// Tempat akad yang dianggap "Di KUA". Selain yang cocok dengan pola ini,
// akad dihitung "Di luar KUA". Sama dengan halaman Laporan Kepenghuluan.
const POLA_DI_KUA = /\b(kua|balai nikah|kantor urusan agama)\b/i

// Kelompok binaan (sama dengan slug di PusatKelompokBinaan.jsx dan
// DaftarHadirCetak.jsx). Dipakai untuk menghitung jumlah anggota terdaftar
// per kelompok sebagai info pendukung — BUKAN jumlah kegiatan per bulan,
// karena aplikasi belum punya log kegiatan bertanggal untuk kelompok binaan.
const KELOMPOK_BINAAN_LABEL = [
  ['majelis-taklim', 'Majelis Taklim'],
  ['lapas', 'Lapas'],
  ['rsu', 'RSU'],
  ['masyarakat', 'Masyarakat'],
]

/* ------------------------------------------------------------------ */
/*  Isi tetap & bawaan (sesuai contoh laporan Kepala KUA)              */
/* ------------------------------------------------------------------ */

const MATERI_BIMBINGAN = [
  'Persiapan kehidupan berumah tangga.',
  'Hak dan kewajiban suami dan istri.',
  'Komunikasi dalam keluarga.',
  'Pengelolaan ekonomi keluarga.',
  'Pendidikan anak.',
  'Pencegahan konflik dan kekerasan dalam rumah tangga.',
  'Pembinaan kehidupan keluarga berdasarkan nilai-nilai agama.',
]

const PEMBINAAN_KEAGAMAAN = [
  'Ceramah dan penyuluhan keagamaan.',
  'Pembinaan majelis taklim.',
  'Pembinaan remaja masjid.',
  'Pembinaan pengurus masjid.',
  'Kegiatan keagamaan di desa/kelurahan.',
  "Bimbingan membaca dan memahami Al-Qur'an.",
  'Kegiatan keagamaan lainnya.',
]

const PEMBINAAN_MASJID = [
  'Administrasi pengelolaan masjid.',
  'Pembinaan imam dan khatib.',
  'Pembinaan pengurus masjid.',
  'Kegiatan pendidikan keagamaan.',
  'Pengelolaan kegiatan sosial keagamaan.',
  'Koordinasi kegiatan keagamaan masyarakat.',
]

const KONSULTASI = [
  'Konsultasi pernikahan.',
  'Konsultasi keluarga.',
  'Konsultasi wakaf.',
  'Konsultasi kehidupan keagamaan.',
  'Konsultasi administrasi keagamaan.',
  'Konsultasi lainnya sesuai tugas dan fungsi KUA.',
]

const TUJUAN = [
  'Memberikan gambaran pelaksanaan tugas dan kegiatan KUA Kecamatan.',
  'Menyampaikan hasil pelayanan kepada masyarakat.',
  'Mengetahui capaian program kerja yang telah dilaksanakan.',
  'Menjadi bahan evaluasi terhadap pelaksanaan tugas.',
  'Meningkatkan kualitas pelayanan keagamaan kepada masyarakat.',
]

// [kunci, uraian, sasaran]
const BARIS_PENYULUH = [
  ['penyuluhan', 'Penyuluhan keagamaan', 'Masyarakat'],
  ['majelisTaklim', 'Pembinaan majelis taklim', 'Majelis Taklim'],
  ['remaja', 'Pembinaan remaja', 'Remaja'],
  ['keluarga', 'Pembinaan keluarga', 'Keluarga'],
  ['masyarakat', 'Pembinaan masyarakat', 'Masyarakat'],
  ['sosial', 'Kegiatan sosial keagamaan', 'Masyarakat'],
]

// [kunci, uraian]
const BARIS_WAKAF = [
  ['konsultasiWakaf', 'Konsultasi Wakaf'],
  ['pendaftaranWakaf', 'Pendaftaran Wakaf'],
  ['pemeriksaanDokumen', 'Pemeriksaan Dokumen'],
  ['pendampingan', 'Pendampingan Administrasi'],
]

const LAMPIRAN_AWAL = [
  { id: 1, kegiatan: 'Pelayanan Nikah', waktu: '', tempat: 'KUA', peserta: '', hasil: 'Terlaksana' },
  { id: 2, kegiatan: 'Bimbingan Perkawinan', waktu: '', tempat: '', peserta: '', hasil: 'Terlaksana' },
  { id: 3, kegiatan: 'Penyuluhan Agama', waktu: '', tempat: '', peserta: '', hasil: 'Terlaksana' },
  { id: 4, kegiatan: 'Pembinaan Masjid', waktu: '', tempat: '', peserta: '', hasil: 'Terlaksana' },
  { id: 5, kegiatan: 'Konsultasi Keagamaan', waktu: '', tempat: 'KUA', peserta: '', hasil: 'Terlaksana' },
]

const HASIL_AWAL = [
  'Pelayanan administrasi masyarakat dapat dilaksanakan sesuai ketentuan.',
  'Pelayanan dan pencatatan pernikahan berjalan tertib.',
  'Kegiatan pembinaan keagamaan masyarakat dapat terlaksana.',
  'Koordinasi dengan pemerintah kecamatan dan desa/kelurahan berjalan baik.',
  'Penyuluhan keagamaan dapat dilaksanakan sesuai program.',
  'Pelayanan konsultasi masyarakat dapat diberikan.',
  'Pembinaan terhadap lembaga dan tokoh keagamaan terus dilakukan.',
].join('\n')

const KOORDINASI_AWAL = [
  'Pemerintah Desa/Kelurahan.',
  'Penyuluh Agama.',
  'Tokoh agama.',
  'Tokoh masyarakat.',
  'Pengurus masjid.',
  'Lembaga pendidikan keagamaan.',
  'Organisasi/lembaga keagamaan.',
  'Instansi terkait lainnya.',
].join('\n')

const KENDALA_AWAL = [
  'Keterbatasan sarana dan prasarana kantor.',
  'Masih terdapat masyarakat yang belum memahami persyaratan administrasi.',
  'Keterbatasan sumber daya manusia dalam pelaksanaan beberapa kegiatan.',
  'Kondisi geografis dan jarak wilayah kerja yang cukup jauh.',
  'Keterbatasan anggaran kegiatan.',
  'Kendala jaringan internet dalam pelayanan administrasi berbasis digital.',
].join('\n')

const UPAYA_AWAL = [
  'Meningkatkan koordinasi dengan Kantor Kementerian Agama Kabupaten/Kota.',
  'Meningkatkan koordinasi dengan pemerintah kecamatan dan desa/kelurahan.',
  'Memberikan informasi yang lebih jelas kepada masyarakat mengenai persyaratan pelayanan.',
  'Mengoptimalkan sarana dan prasarana yang tersedia.',
  'Meningkatkan kemampuan dan kompetensi pegawai.',
  'Mengoptimalkan pemanfaatan teknologi informasi.',
  'Meningkatkan koordinasi dengan penyuluh agama dan tokoh masyarakat.',
].join('\n')

const RTL_AWAL = [
  'Meningkatkan kualitas pelayanan kepada masyarakat.',
  'Meningkatkan tertib administrasi.',
  'Meningkatkan pembinaan calon pengantin.',
  'Meningkatkan kegiatan penyuluhan agama.',
  'Meningkatkan pembinaan masjid dan lembaga keagamaan.',
  'Meningkatkan koordinasi dengan pemerintah daerah dan instansi terkait.',
  'Melakukan evaluasi secara berkala terhadap pelaksanaan program kerja.',
].join('\n')

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

// Nama kabupaten/kota di profil kantor bisa tersimpan dengan atau tanpa awalan.
function denganAwalanWilayah(nama) {
  if (!nama) return 'Kabupaten/Kota ..........................'
  return /^(kabupaten|kota)\s/i.test(nama) ? nama : `Kabupaten ${nama}`
}

const isi = (v) => (v && String(v).trim() ? v : PLACEHOLDER)
const barisTeks = (teks) => String(teks || '').split('\n').map((t) => t.trim()).filter(Boolean)

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

function FieldArea({ label, value, onChange, placeholder, rows = 4 }) {
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

/* ------------------------------------------------------------------ */
/*  Komponen kecil untuk lembar cetak                                  */
/* ------------------------------------------------------------------ */

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

function Sub({ huruf, judul, children }) {
  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold text-slate-900">
        {huruf ? `${huruf}. ` : ''}{judul}
      </h3>
      {children}
    </div>
  )
}

function Poin({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((t, i) => (
        <li key={`${i}-${t}`}>{t}</li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/*  Halaman                                                            */
/* ------------------------------------------------------------------ */

export default function LaporanKepalaKUA() {
  const { profil, sekolahId } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)

  // Data pendaftaran nikah milik kantor ini (tabel yang sama dengan halaman
  // Pendaftaran Nikah, Verifikasi Nikah, dan Laporan Kepenghuluan).
  const [dataNikah, setDataNikah] = useState([])
  const [loadingNikah, setLoadingNikah] = useState(true)
  const [errorNikah, setErrorNikah] = useState('')

  // Jumlah anggota terdaftar per kelompok binaan (Majelis Taklim, Lapas,
  // RSU, Masyarakat) — info pendukung, ditarik dari kelompok_binaan_anggota.
  const [jumlahAnggota, setJumlahAnggota] = useState({})
  const [loadingAnggota, setLoadingAnggota] = useState(true)

  // === DATA LAPORAN — DAPAT DIISI ULANG SETIAP BULAN ===
  const [bulan, setBulan] = useState(bulanIniISO())
  const [tanggalLaporan, setTanggalLaporan] = useState(todayISO())
  const [namaKepala, setNamaKepala] = useState('')
  const [nipKepala, setNipKepala] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [provinsi, setProvinsi] = useState('')
  const [kodePos, setKodePos] = useState('')
  const [modeTtd, setModeTtd] = useState('kepala_kua')

  // Wilayah kerja: satu baris = satu desa/kelurahan, keterangan dipisah "|"
  // Otomatis terisi dari profil_kantor.wilayah_kerja (lihat useEffect di bawah),
  // tapi tetap bisa diedit/ditambah manual di sini.
  const [wilayahKerja, setWilayahKerja] = useState('')
  const wilayahKerjaDiisiOtomatis = useRef(false)

  // Angka yang belum tercatat di aplikasi — diisi manual
  const [angka, setAngka] = useState({})
  const ubahAngka = (kunci) => (nilai) => setAngka((s) => ({ ...s, [kunci]: nilai }))
  const a = (kunci, satuan = '') => {
    const v = angka[kunci]
    const ada = v !== undefined && String(v).trim() !== ''
    return `${ada ? v : PH_ANGKA}${satuan ? ` ${satuan}` : ''}`
  }

  const [koordinasi, setKoordinasi] = useState(KOORDINASI_AWAL)
  const [hasil, setHasil] = useState(HASIL_AWAL)
  const [kendala, setKendala] = useState(KENDALA_AWAL)
  const [upaya, setUpaya] = useState(UPAYA_AWAL)
  const [rtl, setRtl] = useState(RTL_AWAL)

  // Lampiran 1 (rekap kegiatan) dan Lampiran 2 (foto)
  const [lampiran, setLampiran] = useState(LAMPIRAN_AWAL)
  const idBerikut = useRef(100)
  const ubahLampiran = (id, kolom, nilai) =>
    setLampiran((rows) => rows.map((r) => (r.id === id ? { ...r, [kolom]: nilai } : r)))
  const tambahLampiran = () =>
    setLampiran((rows) => [
      ...rows,
      { id: ++idBerikut.current, kegiatan: '', waktu: '', tempat: '', peserta: '', hasil: 'Terlaksana' },
    ])
  const hapusLampiran = (id) => setLampiran((rows) => rows.filter((r) => r.id !== id))

  const [fotos, setFotos] = useState([])
  const fotosRef = useRef([])
  fotosRef.current = fotos
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.url)), [])
  const tambahFoto = (e) => {
    const files = Array.from(e.target.files || [])
    setFotos((prev) => [
      ...prev,
      ...files.map((f) => ({ id: ++idBerikut.current, url: URL.createObjectURL(f), caption: '' })),
    ])
    e.target.value = ''
  }
  const ubahCaption = (id, caption) =>
    setFotos((prev) => prev.map((f) => (f.id === id ? { ...f, caption } : f)))
  const hapusFoto = (id) =>
    setFotos((prev) => {
      const f = prev.find((x) => x.id === id)
      if (f) URL.revokeObjectURL(f.url)
      return prev.filter((x) => x.id !== id)
    })

  // Profil kantor — di-scope per kantor lewat sekolah_id
  useEffect(() => {
    if (!sekolahId) {
      setProfilKantor(null)
      return
    }
    supabase
      .from('profil_kantor')
      .select(
        'nama_kantor, alamat, kabupaten, kecamatan, provinsi, kode_pos, wilayah_kerja, telepon, email, kepala_kua, nip_kepala_kua, kepala_kemenag, nip_kepala_kemenag, tempat_ttd, logo_path, ttd_kepala_kua_path'
      )
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => setProfilKantor(data))
  }, [sekolahId])

  // Wilayah Kerja: sekali terisi otomatis dari profil kantor (kalau ada dan
  // form belum pernah diisi manual). Setelah itu perubahan di profil kantor
  // tidak menimpa lagi apa yang sudah diketik/diedit user di sini.
  useEffect(() => {
    if (!wilayahKerjaDiisiOtomatis.current && profilKantor?.wilayah_kerja) {
      setWilayahKerja(profilKantor.wilayah_kerja)
      wilayahKerjaDiisiOtomatis.current = true
    }
  }, [profilKantor])

  // Jumlah anggota per kelompok binaan — dihitung dari kelompok_binaan_anggota
  // (sama seperti tabel yang dibaca DaftarHadirCetak.jsx / PusatKelompokBinaan.jsx).
  // Tidak difilter sekolah_id secara eksplisit, mengikuti pola query yang sudah
  // dipakai di DaftarHadirCetak.jsx (RLS Supabase yang menentukan cakupannya).
  useEffect(() => {
    let aktif = true
    setLoadingAnggota(true)
    supabase
      .from('kelompok_binaan_anggota')
      .select('kelompok')
      .then(({ data, error }) => {
        if (!aktif) return
        if (error) {
          setJumlahAnggota({})
        } else {
          const hitung = {}
          ;(data || []).forEach((row) => {
            hitung[row.kelompok] = (hitung[row.kelompok] || 0) + 1
          })
          setJumlahAnggota(hitung)
        }
        setLoadingAnggota(false)
      })
    return () => {
      aktif = false
    }
  }, [])

  // Pendaftaran nikah — diambil sekali, disaring per bulan di sisi klien.
  // Catatan: yang terbaca mengikuti RLS di Supabase. Akun admin utama melihat
  // semua data kantor; akun biasa hanya melihat pendaftarannya sendiri.
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

  // Rekap otomatis dari data pendaftaran nikah untuk bulan terpilih
  const rekap = useMemo(() => {
    // 1) Akad nikah: sudah diverifikasi & tanggal akad jatuh di bulan laporan
    const peristiwa = dataNikah
      .filter((r) => r.status === 'diverifikasi')
      .filter((r) => (r.data_n2?.rencana_tanggal_akad || '').slice(0, 7) === bulan)
      .sort((x, y) => {
        const tx = `${x.data_n2?.rencana_tanggal_akad || ''} ${x.data_n2?.rencana_waktu_akad || ''}`
        const ty = `${y.data_n2?.rencana_tanggal_akad || ''} ${y.data_n2?.rencana_waktu_akad || ''}`
        return tx.localeCompare(ty)
      })
      .map((r) => {
        const tempat = (r.data_n2?.tempat_akad || '').trim()
        let lokasi = 'Belum diisi'
        if (tempat) lokasi = POLA_DI_KUA.test(tempat) ? 'Di KUA' : 'Di luar KUA'
        return {
          id: r.id,
          tanggal: r.data_n2?.rencana_tanggal_akad || '',
          waktu: r.data_n2?.rencana_waktu_akad || '',
          suami: r.data_n1?.calon_suami?.nama_lengkap || '-',
          istri: r.data_n1?.calon_istri?.nama_lengkap || '-',
          tempat: tempat || '-',
          lokasi,
        }
      })

    // 2) Pendaftaran yang masuk pada bulan laporan (berdasarkan tanggal dibuat)
    const masuk = dataNikah.filter((r) => bulanLokal(r.dibuat_pada) === bulan)

    return {
      peristiwa,
      diKua: peristiwa.filter((p) => p.lokasi === 'Di KUA').length,
      luarKua: peristiwa.filter((p) => p.lokasi === 'Di luar KUA').length,
      belumDiisi: peristiwa.filter((p) => p.lokasi === 'Belum diisi').length,
      pendaftaranMasuk: masuk.length,
      diverifikasi: masuk.filter((r) => r.status === 'diverifikasi').length,
      ditolak: masuk.filter((r) => r.status === 'ditolak').length,
      menunggu: masuk.filter((r) => r.status === 'menunggu').length,
    }
  }, [dataNikah, bulan])

  const namaEfektif = namaKepala || profilKantor?.kepala_kua || ''
  const nipEfektif = nipKepala || profilKantor?.nip_kepala_kua || ''
  const provinsiEfektif = provinsi || profilKantor?.provinsi || ''
  const kodePosEfektif = kodePos || profilKantor?.kode_pos || ''
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

  const cellHead = 'border border-slate-400 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-800'
  const cell = 'border border-slate-400 px-2 py-1.5 align-top'
  const cellCenter = `${cell} text-center`

  const identitas = [
    ['Nama Kantor', namaKantor],
    ['Kabupaten/Kota', profilKantor?.kabupaten || PLACEHOLDER],
    ['Provinsi', isi(provinsiEfektif)],
    ['Alamat', alamatKantor || PLACEHOLDER],
    ['Kode Pos', isi(kodePosEfektif)],
    ['Kepala KUA', isi(namaEfektif)],
    ['Periode Laporan', periode || PLACEHOLDER],
  ]

  // Wilayah kerja: minimal 5 baris kosong supaya tabel tetap tampil seperti contoh
  const barisWilayah = useMemo(() => {
    const dariForm = barisTeks(wilayahKerja).map((t) => {
      const [desa, ...sisa] = t.split('|')
      return { desa: desa.trim(), ket: sisa.join('|').trim() }
    })
    const kosong = Math.max(0, 5 - dariForm.length)
    return [...dariForm, ...Array.from({ length: kosong }, () => ({ desa: '', ket: '' }))]
  }, [wilayahKerja])

  const layananNikah = [
    ['Pendaftaran Nikah', `${rekap.pendaftaranMasuk} pasangan`],
    ['Pelaksanaan Akad Nikah', `${rekap.peristiwa.length} pasangan`],
    ['Rujuk', a('rujuk', 'pasangan')],
    ['Pemeriksaan Berkas Nikah', `${rekap.diverifikasi + rekap.ditolak} berkas`],
    ['Penerbitan Buku Nikah', a('bukuNikah', 'pasang')],
    ['Legalisasi/Pengantar Dokumen', a('legalisasi', 'dokumen')],
  ]

  const daftarKoordinasi = [
    `Camat Kecamatan ${profilKantor?.kecamatan || PLACEHOLDER}`,
    ...barisTeks(koordinasi),
  ]

  const dasarPelaksanaan = [
    'Ketentuan peraturan perundang-undangan yang mengatur tugas dan fungsi Kementerian Agama.',
    'Ketentuan mengenai tugas dan fungsi Kantor Urusan Agama Kecamatan.',
    `Program kerja Kantor Kementerian Agama ${kemenagKota}.`,
    `Program kerja ${namaKantor} Tahun ${tahun || '2026'}.`,
    'Ketentuan dan kebijakan lain yang berkaitan dengan pelaksanaan tugas KUA Kecamatan.',
  ]

  return (
    <Layout
      title="Laporan Kepala KUA"
      subtitle="Laporan pelaksanaan tugas dan kegiatan Kepala KUA per bulan, otomatis terisi dari data pendaftaran nikah dan profil kantor."
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
          <FieldText
            label="Jabatan"
            value={jabatan}
            onChange={setJabatan}
            placeholder={`Otomatis: ${jabatanEfektif}`}
          />
          <FieldText
            label="Provinsi"
            value={provinsi}
            onChange={setProvinsi}
            placeholder={profilKantor?.provinsi ? `Otomatis: ${profilKantor.provinsi}` : ''}
          />
          <FieldText
            label="Kode Pos"
            value={kodePos}
            onChange={setKodePos}
            placeholder={profilKantor?.kode_pos ? `Otomatis: ${profilKantor.kode_pos}` : ''}
          />
          <div className="hidden sm:block" />
          <PilihModeTtd value={modeTtd} onChange={setModeTtd} profilKantor={profilKantor} namaPembuat={namaEfektif} nipPembuat={nipEfektif} />

          <SubJudulForm>Wilayah Kerja</SubJudulForm>
          <FieldArea
            label="Desa/Kelurahan (satu baris = satu desa; keterangan opsional setelah tanda |). Terisi otomatis dari Profil Kantor, tetap bisa diedit."
            value={wilayahKerja}
            onChange={setWilayahKerja}
            placeholder={'Contoh:\nDesa Contoh Satu | 1.200 jiwa\nDesa Contoh Dua'}
            rows={5}
          />

          <SubJudulForm>Pelayanan Nikah — diisi manual (pendaftaran, akad, dan pemeriksaan berkas sudah otomatis)</SubJudulForm>
          <FieldText label="Rujuk (pasangan)" type="number" min="0" value={angka.rujuk ?? ''} onChange={ubahAngka('rujuk')} />
          <FieldText label="Penerbitan Buku Nikah (pasang)" type="number" min="0" value={angka.bukuNikah ?? ''} onChange={ubahAngka('bukuNikah')} />
          <FieldText label="Legalisasi/Pengantar Dokumen (dokumen)" type="number" min="0" value={angka.legalisasi ?? ''} onChange={ubahAngka('legalisasi')} />

          <SubJudulForm>Bimbingan Perkawinan</SubJudulForm>
          <FieldText label="Jumlah peserta (orang/pasangan)" type="number" min="0" value={angka.pesertaBimbingan ?? ''} onChange={ubahAngka('pesertaBimbingan')} />

          <SubJudulForm>Pelaksanaan Tugas Penyuluh Agama (jumlah kegiatan)</SubJudulForm>
          {BARIS_PENYULUH.map(([kunci, uraian]) => (
            <FieldText key={kunci} label={uraian} type="number" min="0" value={angka[kunci] ?? ''} onChange={ubahAngka(kunci)} />
          ))}

          <SubJudulForm>Pelayanan Wakaf (jumlah)</SubJudulForm>
          {BARIS_WAKAF.map(([kunci, uraian]) => (
            <FieldText key={kunci} label={uraian} type="number" min="0" value={angka[kunci] ?? ''} onChange={ubahAngka(kunci)} />
          ))}

          <SubJudulForm>Uraian (satu baris = satu poin)</SubJudulForm>
          <FieldArea label="Pihak yang diajak berkoordinasi (Camat sudah otomatis)" value={koordinasi} onChange={setKoordinasi} />
          <FieldArea label="Hasil yang Dicapai" value={hasil} onChange={setHasil} />
          <FieldArea label="Kendala yang Dihadapi" value={kendala} onChange={setKendala} />
          <FieldArea label="Upaya Penyelesaian" value={upaya} onChange={setUpaya} />
          <FieldArea label="Rencana Tindak Lanjut" value={rtl} onChange={setRtl} />

          <SubJudulForm>Lampiran 1 — Rekapitulasi Kegiatan</SubJudulForm>
          <div className="sm:col-span-2 space-y-2">
            {lampiran.map((r) => (
              <div key={r.id} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end border border-slate-100 rounded-lg p-2">
                <div className="col-span-2">
                  <FieldText label="Kegiatan" value={r.kegiatan} onChange={(v) => ubahLampiran(r.id, 'kegiatan', v)} />
                </div>
                <FieldText label="Waktu" value={r.waktu} onChange={(v) => ubahLampiran(r.id, 'waktu', v)} />
                <FieldText label="Tempat" value={r.tempat} onChange={(v) => ubahLampiran(r.id, 'tempat', v)} />
                <FieldText
                  label="Peserta"
                  value={r.peserta}
                  onChange={(v) => ubahLampiran(r.id, 'peserta', v)}
                  placeholder={r.kegiatan === 'Pelayanan Nikah' ? `Otomatis: ${rekap.peristiwa.length} pasangan` : ''}
                />
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <FieldText label="Hasil" value={r.hasil} onChange={(v) => ubahLampiran(r.id, 'hasil', v)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => hapusLampiran(r.id)}
                    className="p-2 text-slate-400 hover:text-red-600"
                    aria-label="Hapus baris"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={tambahLampiran}
              className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900"
            >
              <Plus size={16} /> Tambah baris kegiatan
            </button>
          </div>

          <SubJudulForm>Lampiran 2 — Dokumentasi</SubJudulForm>
          <div className="sm:col-span-2 space-y-2">
            <label className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 cursor-pointer">
              <ImagePlus size={16} /> Tambah foto kegiatan
              <input type="file" accept="image/*" multiple onChange={tambahFoto} className="hidden" />
            </label>
            {fotos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fotos.map((f) => (
                  <div key={f.id} className="flex gap-2 items-center border border-slate-100 rounded-lg p-2">
                    <img src={f.url} alt="" className="w-16 h-16 object-cover rounded shrink-0" />
                    <input
                      value={f.caption}
                      onChange={(e) => ubahCaption(f.id, e.target.value)}
                      placeholder="Keterangan foto"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => hapusFoto(f.id)}
                      className="p-2 text-slate-400 hover:text-red-600"
                      aria-label="Hapus foto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400">
              Foto hanya dipakai untuk pratinjau dan cetak, tidak disimpan ke server. Foto hilang kalau halaman dimuat ulang.
            </p>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500 space-y-1">
          {loadingNikah && <p>Memuat data pendaftaran nikah…</p>}
          {!loadingNikah && errorNikah && (
            <p className="text-red-600">Gagal memuat data pendaftaran nikah: {errorNikah}</p>
          )}
          {!loadingNikah && !errorNikah && (
            <p>
              Data terbaca: {rekap.pendaftaranMasuk} pendaftaran masuk dan {rekap.peristiwa.length} akad
              nikah pada {periode || 'bulan terpilih'}.
              {rekap.belumDiisi > 0 &&
                ` ${rekap.belumDiisi} akad belum mengisi tempat akad sehingga tidak masuk hitungan Di KUA / Di luar KUA.`}
            </p>
          )}
          <p className="text-slate-400">
            Akad nikah dihitung dari pendaftaran berstatus <em>diverifikasi</em> yang tanggal akadnya
            jatuh di bulan laporan. Pemeriksaan berkas = berkas diverifikasi + ditolak pada bulan laporan.
            Kop surat, Kepala KUA, Provinsi, Kode Pos, Wilayah Kerja, dan tanda tangan ditarik otomatis
            dari Profil Kantor. Jumlah anggota kelompok binaan (Majelis Taklim, Lapas, RSU, Masyarakat)
            ditarik otomatis dari Pusat Kelompok Binaan sebagai info pendukung — bukan jumlah kegiatan
            per bulan, karena aplikasi belum mencatat log kegiatan bertanggal untuk kelompok binaan.
            Angka kegiatan lain yang belum tercatat di aplikasi diisi manual; yang dikosongkan tampil
            sebagai titik-titik. Kondisi Bangunan, Peralatan, dan Barang Inventaris kantor pada Lampiran 4
            ditarik otomatis dari halaman Inventaris dan Kondisi Bangunan.
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
              <p className="text-xs text-slate-600 leading-tight">
                Alamat: {alamatKantor || PLACEHOLDER}
              </p>
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
              Laporan Pelaksanaan Tugas dan Kegiatan
            </h1>
            <p className="font-display text-base font-bold uppercase text-slate-900 leading-snug">
              Kepala Kantor Urusan Agama (KUA) Kecamatan
            </p>
            <p className="font-display text-sm font-bold uppercase text-slate-900 leading-snug">
              Periode Bulan {namaBulanSaja || PLACEHOLDER} Tahun {tahun || '2026'}
            </p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-slate-700">
            {/* I. PENDAHULUAN */}
            <Bab no="I" judul="Pendahuluan">
              <Sub huruf="A" judul="Latar Belakang">
                <p className="text-justify">
                  Kantor Urusan Agama (KUA) Kecamatan merupakan unit pelaksana teknis Kementerian Agama
                  yang mempunyai tugas memberikan pelayanan dan bimbingan kepada masyarakat dalam bidang
                  keagamaan sesuai dengan ketentuan peraturan perundang-undangan.
                </p>
                <p className="text-justify">
                  Dalam rangka melaksanakan tugas tersebut, Kepala KUA Kecamatan melaksanakan fungsi
                  koordinasi, pelayanan, pembinaan, pengawasan, serta pelaporan terhadap seluruh kegiatan
                  yang dilaksanakan di wilayah kerja KUA Kecamatan.
                </p>
                <p className="text-justify">
                  Laporan ini disusun sebagai bentuk pertanggungjawaban pelaksanaan tugas Kepala KUA
                  Kecamatan selama periode {periode || PLACEHOLDER} serta sebagai bahan evaluasi untuk
                  meningkatkan kualitas pelayanan kepada masyarakat.
                </p>
              </Sub>
              <Sub huruf="B" judul="Dasar Pelaksanaan">
                <Poin items={dasarPelaksanaan} />
              </Sub>
              <Sub huruf="C" judul="Maksud dan Tujuan">
                <Poin items={TUJUAN} />
              </Sub>
            </Bab>

            {/* II. PROFIL */}
            <Bab no="II" judul="Profil KUA Kecamatan">
              <Sub huruf="A" judul="Identitas Kantor">
                <table className="lap-table w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={`${cellHead} w-48`}>Uraian</th>
                      <th className={cellHead}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {identitas.map(([label, nilai]) => (
                      <tr key={label}>
                        <td className={cell}>{label}</td>
                        <td className={cell}>{nilai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Sub>
              <Sub huruf="B" judul="Wilayah Kerja">
                <table className="lap-table w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={`${cellHead} w-10 text-center`}>No.</th>
                      <th className={cellHead}>Desa/Kelurahan</th>
                      <th className={cellHead}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barisWilayah.map((w, i) => (
                      <tr key={i}>
                        <td className={cellCenter}>{i + 1}</td>
                        <td className={cell}>{w.desa || PLACEHOLDER}</td>
                        <td className={cell}>{w.ket || PLACEHOLDER}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Sub>
              <Sub huruf="C" judul="Kelompok Binaan Terdaftar">
                <p className="text-justify text-xs text-slate-500">
                  Jumlah anggota terdaftar per kelompok binaan (data pendukung, ditarik otomatis dari
                  Pusat Kelompok Binaan — bukan jumlah kegiatan pada periode laporan ini).
                </p>
                <table className="lap-table w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={`${cellHead} w-10 text-center`}>No.</th>
                      <th className={cellHead}>Kelompok Binaan</th>
                      <th className={`${cellHead} w-32`}>Jumlah Anggota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KELOMPOK_BINAAN_LABEL.map(([slug, label], i) => (
                      <tr key={slug}>
                        <td className={cellCenter}>{i + 1}</td>
                        <td className={cell}>{label}</td>
                        <td className={cell}>
                          {loadingAnggota ? '...' : `${jumlahAnggota[slug] || 0} orang`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Sub>
            </Bab>

            {/* III. PELAKSANAAN TUGAS */}
            <Bab no="III" judul="Pelaksanaan Tugas dan Kegiatan">
              <Sub huruf="A" judul="Pelayanan Administrasi dan Pernikahan">
                <p className="text-justify">
                  Selama periode laporan, {namaKantor} telah melaksanakan pelayanan administrasi
                  pernikahan kepada masyarakat.
                  {rekap.peristiwa.length > 0 &&
                    ` Dari ${rekap.peristiwa.length} akad nikah yang dilaksanakan, ${rekap.diKua} dilaksanakan di KUA dan ${rekap.luarKua} di luar KUA.`}
                  {rekap.menunggu > 0 && ` Sebanyak ${rekap.menunggu} berkas masih menunggu verifikasi.`}
                </p>
                <table className="lap-table w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={`${cellHead} w-10 text-center`}>No.</th>
                      <th className={cellHead}>Jenis Pelayanan</th>
                      <th className={`${cellHead} w-40`}>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {layananNikah.map(([label, nilai], i) => (
                      <tr key={label}>
                        <td className={cellCenter}>{i + 1}</td>
                        <td className={cell}>{label}</td>
                        <td className={cell}>{nilai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Sub>

              <Sub huruf="B" judul="Bimbingan Perkawinan">
                <p className="text-justify">
                  {namaKantor} melaksanakan kegiatan bimbingan dan pembinaan bagi calon pengantin sebagai
                  upaya memberikan bekal pengetahuan dalam membangun keluarga yang harmonis.
                </p>
                <Poin items={MATERI_BIMBINGAN} />
                <p>Jumlah peserta yang mengikuti kegiatan sebanyak {a('pesertaBimbingan')} orang/pasangan.</p>
              </Sub>

              <Sub huruf="C" judul="Pembinaan Kehidupan Keagamaan Masyarakat">
                <p>Kegiatan pembinaan dilaksanakan melalui:</p>
                <Poin items={PEMBINAAN_KEAGAMAAN} />
              </Sub>

              <Sub huruf="D" judul="Pelaksanaan Tugas Penyuluh Agama">
                <p className="text-justify">
                  Kepala KUA melakukan koordinasi dan monitoring terhadap pelaksanaan tugas Penyuluh
                  Agama di wilayah kerja KUA.
                </p>
                <table className="lap-table w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={`${cellHead} w-10 text-center`}>No.</th>
                      <th className={cellHead}>Kegiatan</th>
                      <th className={cellHead}>Sasaran</th>
                      <th className={`${cellHead} w-24`}>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BARIS_PENYULUH.map(([kunci, uraian, sasaran], i) => (
                      <tr key={kunci}>
                        <td className={cellCenter}>{i + 1}</td>
                        <td className={cell}>{uraian}</td>
                        <td className={cell}>{sasaran}</td>
                        <td className={cell}>{a(kunci)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Sub>

              <Sub huruf="E" judul="Pembinaan Masjid dan Rumah Ibadah">
                <p className="text-justify">
                  {namaKantor} melaksanakan koordinasi dan pembinaan terhadap pengurus masjid dan rumah
                  ibadah di wilayah kerja.
                </p>
                <Poin items={PEMBINAAN_MASJID} />
              </Sub>

              <Sub huruf="F" judul="Pelayanan Wakaf">
                <p className="text-justify">
                  Pelayanan di bidang wakaf dilaksanakan melalui pemberian informasi, konsultasi, dan
                  pendampingan administrasi wakaf kepada masyarakat.
                </p>
                <table className="lap-table w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={`${cellHead} w-10 text-center`}>No.</th>
                      <th className={cellHead}>Jenis Kegiatan</th>
                      <th className={`${cellHead} w-40`}>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BARIS_WAKAF.map(([kunci, uraian], i) => (
                      <tr key={kunci}>
                        <td className={cellCenter}>{i + 1}</td>
                        <td className={cell}>{uraian}</td>
                        <td className={cell}>{a(kunci)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Sub>

              <Sub huruf="G" judul="Pelayanan Informasi dan Konsultasi Keagamaan">
                <p className="text-justify">
                  KUA memberikan pelayanan konsultasi kepada masyarakat mengenai berbagai persoalan
                  keagamaan dan keluarga, antara lain:
                </p>
                <Poin items={KONSULTASI} />
              </Sub>
            </Bab>

            {/* IV. KOORDINASI */}
            <Bab no="IV" judul="Koordinasi dan Kerja Sama">
              <Poin items={daftarKoordinasi} />
              <p className="text-justify">
                Koordinasi dilakukan untuk meningkatkan efektivitas pelayanan keagamaan dan
                menyelesaikan berbagai permasalahan yang muncul di masyarakat.
              </p>
            </Bab>

            {/* V. HASIL */}
            <Bab no="V" judul="Hasil yang Dicapai">
              {barisTeks(hasil).length > 0 ? <Poin items={barisTeks(hasil)} /> : <p>-</p>}
            </Bab>

            {/* VI. KENDALA */}
            <Bab no="VI" judul="Kendala yang Dihadapi">
              {barisTeks(kendala).length > 0 ? (
                <Poin items={barisTeks(kendala)} />
              ) : (
                <p>Tidak ada kendala berarti.</p>
              )}
            </Bab>

            {/* VII. UPAYA */}
            <Bab no="VII" judul="Upaya Penyelesaian">
              {barisTeks(upaya).length > 0 ? <Poin items={barisTeks(upaya)} /> : <p>-</p>}
            </Bab>

            {/* VIII. RTL */}
            <Bab no="VIII" judul="Rencana Tindak Lanjut">
              {barisTeks(rtl).length > 0 ? <Poin items={barisTeks(rtl)} /> : <p>-</p>}
            </Bab>

            {/* IX. PENUTUP */}
            <Bab no="IX" judul="Penutup">
              <p className="text-justify">
                Demikian laporan pelaksanaan tugas dan kegiatan Kepala {namaKantor} ini dibuat sebagai
                bentuk pertanggungjawaban atas pelaksanaan tugas selama periode {periode || PLACEHOLDER}.
              </p>
              <p className="text-justify">
                Laporan ini diharapkan dapat menjadi bahan evaluasi dan acuan dalam meningkatkan kualitas
                pelayanan keagamaan kepada masyarakat serta mendukung pelaksanaan program Kementerian
                Agama di tingkat kecamatan.
              </p>
              <p className="text-justify">Atas perhatian dan kerja sama semua pihak, disampaikan terima kasih.</p>
            </Bab>
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

          {/* === LAMPIRAN (mulai di halaman baru) === */}
          <div className="lampiran mt-10 space-y-6 text-sm leading-relaxed text-slate-700" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
            <h2 className="font-display text-[15px] font-semibold uppercase text-slate-900">Lampiran</h2>

            <Sub judul="Lampiran 1. Rekapitulasi Kegiatan">
              <table className="lap-table w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={`${cellHead} w-8 text-center`}>No.</th>
                    <th className={cellHead}>Kegiatan</th>
                    <th className={cellHead}>Waktu</th>
                    <th className={cellHead}>Tempat</th>
                    <th className={cellHead}>Peserta</th>
                    <th className={cellHead}>Hasil</th>
                  </tr>
                </thead>
                <tbody>
                  {lampiran.length === 0 ? (
                    <tr>
                      <td className={`${cell} text-center text-slate-500`} colSpan={6}>-</td>
                    </tr>
                  ) : (
                    lampiran.map((r, i) => (
                      <tr key={r.id}>
                        <td className={cellCenter}>{i + 1}</td>
                        <td className={cell}>{r.kegiatan || PLACEHOLDER}</td>
                        <td className={cell}>{r.waktu || '........'}</td>
                        <td className={cell}>{r.tempat || '........'}</td>
                        <td className={cell}>
                          {r.peserta ||
                            (r.kegiatan === 'Pelayanan Nikah' ? `${rekap.peristiwa.length} pasangan` : PH_ANGKA)}
                        </td>
                        <td className={cell}>{r.hasil || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Sub>

            <Sub judul="Lampiran 2. Dokumentasi">
              {fotos.length === 0 ? (
                <p className="text-slate-500">
                  Foto kegiatan pelayanan KUA, bimbingan perkawinan, penyuluhan agama, pembinaan
                  masyarakat, serta koordinasi dengan pemerintah dan tokoh masyarakat ditempatkan pada
                  bagian ini.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {fotos.map((f) => (
                    <figure key={f.id} className="ttd-block">
                      <img src={f.url} alt={f.caption || 'Dokumentasi kegiatan'} className="w-full h-44 object-cover border border-slate-300" />
                      {f.caption && (
                        <figcaption className="text-xs text-center text-slate-600 mt-1">{f.caption}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </Sub>

            <Sub judul="Lampiran 3. Rekapitulasi Data Pelayanan">
              <p className="text-justify">
                Daftar pelaksanaan akad nikah pada periode {periode || PLACEHOLDER}, diambil otomatis dari
                data pendaftaran nikah yang telah diverifikasi.
              </p>
              <table className="lap-table w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={`${cellHead} w-8 text-center`}>No.</th>
                    <th className={cellHead}>Tanggal / Waktu</th>
                    <th className={cellHead}>Suami</th>
                    <th className={cellHead}>Istri</th>
                    <th className={cellHead}>Tempat Akad</th>
                    <th className={cellHead}>Ket.</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingNikah ? (
                    <tr>
                      <td className={`${cell} text-center text-slate-500`} colSpan={6}>Memuat data…</td>
                    </tr>
                  ) : rekap.peristiwa.length === 0 ? (
                    <tr>
                      <td className={`${cell} text-center text-slate-500`} colSpan={6}>
                        Tidak ada akad nikah tercatat pada bulan ini.
                      </td>
                    </tr>
                  ) : (
                    rekap.peristiwa.map((p, i) => (
                      <tr key={p.id}>
                        <td className={cellCenter}>{i + 1}</td>
                        <td className={cell}>
                          {formatTanggalIndonesia(p.tanggal) || '-'}
                          {p.waktu ? `, ${p.waktu}` : ''}
                        </td>
                        <td className={`${cell} uppercase`}>{p.suami}</td>
                        <td className={`${cell} uppercase`}>{p.istri}</td>
                        <td className={cell}>{p.tempat}</td>
                        <td className={cell}>{p.lokasi}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <p className="text-xs text-slate-500">
                Data pelayanan wakaf, bimbingan perkawinan, penyuluhan agama, dan kegiatan keagamaan
                lainnya dapat dilampirkan sesuai periode laporan.
              </p>
            </Sub>

            <Sub judul="Lampiran 4. Kondisi Aset Kantor">
              <p className="text-justify text-xs text-slate-500">
                Rekap kondisi Bangunan, Peralatan, dan Barang Inventaris kantor, ditarik otomatis dari
                halaman Inventaris dan Kondisi Bangunan.
              </p>
              <RingkasanAset
                judulBangunan="Kondisi Bangunan Kantor"
                judulPeralatan="Kondisi Peralatan Kantor"
                judulInventaris="Kondisi Barang Inventaris Kantor"
              />
            </Sub>
          </div>
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
          .lembar-cetak section h2,
          .lembar-cetak h3 {
            page-break-after: avoid;
            break-after: avoid;
          }
          .lembar-cetak li {
            page-break-inside: avoid;
            break-inside: avoid;
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
