import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Halaman cetak "DATA PENDIDIKAN GURU / PEGAWAI" — mengikuti sheet
// "DATA PENDIDIKAN GURU" pada LAPORAN_BULANAN_JULI_2023.xlsx: No, Nama,
// Pendidikan/Ijazah Terakhir (Nama Lembaga Pendidikan, Jenjang, Fakultas,
// Jurusan, Tahun), Penataran yang Pernah Diikuti, Mulai Kerja Di Sini.
//
// "Jenjang" memakai kolom guru.pendidikan_terakhir yang sudah ada.
// "Mulai Kerja Di Sini" memakai kolom guru.tmt_pengangkatan yang sudah ada
// (ditampilkan sebagai tanggal biasa, bukan format angka ddmmyyyy seperti
// di file Excel lama). Kolom lain butuh migration_riwayat_pendidikan_guru.sql.
//
// Struktur file ini mengikuti pola LaporanNominatifGuru.jsx /
// LaporanBiodataGuru.jsx — termasuk mode print print-only dan panel input
// manual Semester & Tahun Pelajaran. Akses: admin, admin_utama,
// kepala_sekolah, superadmin (lewat ProtectedRoute adminOnly di App.jsx).
//
// UPDATE POLA PRINT: ditambahkan override @media screen untuk `display`
// (mengikuti pola LaporanSemester.jsx), karena override `position: static`
// yang sudah ada sebelumnya saja tidak cukup — kalau aturan global
// index.css menyembunyikan .print-only lewat display:none di layar,
// position:static tidak menolong elemen itu tampil.
export default function LaporanPendidikanGuru() {
  const navigate = useNavigate()
  const { sekolahId: sekolahIdSaya } = useAuth()
  const [profilSekolah, setProfilSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [daftarGuru, setDaftarGuru] = useState([])
  const [loading, setLoading] = useState(true)

  // Input manual Semester & Tahun Pelajaran — ditampilkan di panel
  // (no-print) di atas lembar cetak, lalu disisipkan ke teks judul
  // lembar cetak. Jika tahun dikosongkan, teks tetap fallback ke
  // titik-titik seperti format aslinya. Pola sama seperti
  // LaporanBiodataGuru.jsx.
  const [semester, setSemester] = useState('Ganjil')
  const [tahunAwal, setTahunAwal] = useState('')
  const [tahunAkhir, setTahunAkhir] = useState('')

  // Urutan prioritas status kepegawaian untuk pengurutan tabel: PNS paling
  // atas, lalu PPPK/Kontrak, lalu GTY/Honor, sisanya di akhir.
  function prioritasStatus(statusText) {
    const t = (statusText || '').toLowerCase()
    if (t.includes('pns')) return 1
    if (t.includes('pppk') || t.includes('kontrak')) return 2
    if (t.includes('gty') || t.includes('honor')) return 3
    return 4
  }

  // Kepala Sekolah selalu ditempatkan paling atas, terlepas dari status
  // kepegawaiannya — dideteksi dari kolom tugas_tambahan / jenis_ptk.
  function isKepalaSekolah(g) {
    const jabatan = `${g.tugas_tambahan || ''} ${g.jenis_ptk || ''}`.toLowerCase()
    return jabatan.includes('kepala sekolah')
  }

  function urutkanGuru(daftar) {
    return [...daftar].sort((a, b) => {
      const aKS = isKepalaSekolah(a) ? 0 : 1
      const bKS = isKepalaSekolah(b) ? 0 : 1
      if (aKS !== bKS) return aKS - bKS

      const prioA = prioritasStatus(a.status_kepegawaian)
      const prioB = prioritasStatus(b.status_kepegawaian)
      if (prioA !== prioB) return prioA - prioB

      return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '')
    })
  }

  useEffect(() => {
    async function muat() {
      setLoading(true)
      const sekolahId = sekolahIdSaya

      if (!sekolahId) {
        setLoading(false)
        return
      }

      const [{ data: sekolah }, { data: guru }] = await Promise.all([
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
        supabase
          .from('guru')
          .select(
            'id, nama_lengkap, pendidikan_terakhir, nama_lembaga_pendidikan, fakultas, jurusan, tahun_lulus, penataran_diklat, tmt_pengangkatan, tugas_tambahan, jenis_ptk, status_kepegawaian, status'
          )
          .eq('sekolah_id', sekolahId),
      ])

      setProfilSekolah(sekolah || null)

      if (sekolah?.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(sekolah.logo_path)
        setLogoUrl(pub?.publicUrl || '')
      } else {
        setLogoUrl('')
      }

      setDaftarGuru(urutkanGuru(guru || []))
      setLoading(false)
    }
    muat()
  }, [sekolahIdSaya])

  function formatTanggal(tgl) {
    if (!tgl) return '—'
    return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  // Membuang awalan "PEMERINTAH KABUPATEN" / "KABUPATEN" pada nilai supaya
  // tidak dobel dengan label "Kabupaten" yang sudah ada di depannya
  // (mis. field profilSekolah.kabupaten berisi "PEMERINTAH KABUPATEN
  // KEPULAUAN ARU", padahal labelnya sudah "Kabupaten"). Data mentah di
  // profilSekolah TIDAK diubah — cuma cara menampilkannya di baris ini.
  // Dipakai juga di kop surat (Pemerintah Kabupaten ...) supaya nama
  // kabupatennya tidak dobel walau data mentahnya sudah mengandung
  // prefix "Pemerintah Kabupaten"/"Kabupaten". Pola sama seperti
  // LaporanKepangkatanGuru.jsx / LaporanNominatifGuru.jsx.
  function formatKabupaten(teks) {
    if (!teks) return '—'
    return (
      teks
        .replace(/^PEMERINTAH\s+KABUPATEN\s+/i, '')
        .replace(/^KABUPATEN\s+/i, '')
        .trim() || '—'
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar — hilang saat dicetak */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Printer size={16} /> Cetak
        </button>
      </div>

      {/* Panel input Semester & Tahun Pelajaran — hilang saat print.
          Nilainya dipakai untuk mengisi teks "Semester .../Tahun
          Pelajaran ..." di lembar cetak di bawah. Pola sama seperti
          LaporanBiodataGuru.jsx. */}
      <div className="no-print max-w-md mx-auto mt-4 bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="font-medium text-slate-600">Semester</label>
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1"
        >
          <option value="Ganjil">Ganjil</option>
          <option value="Genap">Genap</option>
        </select>

        <label className="font-medium text-slate-600">Tahun Pelajaran</label>
        <input
          type="text"
          value={tahunAwal}
          onChange={(e) => setTahunAwal(e.target.value)}
          placeholder="2024"
          className="border border-slate-300 rounded px-2 py-1 w-20"
        />
        <span>/</span>
        <input
          type="text"
          value={tahunAkhir}
          onChange={(e) => setTahunAkhir(e.target.value)}
          placeholder="2025"
          className="border border-slate-300 rounded px-2 py-1 w-20"
        />
      </div>

      {/* PENTING: class "print-only" ditambahkan di sini. CSS global
          (index.css) menyembunyikan SEMUA elemen saat print kecuali yang
          berkelas print-only (body * { visibility: hidden } lalu
          .print-only, .print-only * { visibility: visible }). Tanpa class
          ini, div lembar cetak ikut tersembunyi dan hasil print jadi
          kosong total. Pola sama seperti Cetak8355.jsx / LaporanBiodataGuru.jsx
          yang sudah terbukti berhasil. */}
      <div className="lembar-cetak print-only bg-white mx-auto my-6 p-8 shadow-sm" style={{ width: '297mm', minHeight: '210mm' }}>
        {/* Kop Surat — urutan resmi: Pemerintah Kabupaten / Dinas
            Pendidikan / Nama Sekolah / Alamat. Nama kabupaten dilewatkan
            lewat formatKabupaten() supaya tidak dobel kalau data mentahnya
            sudah mengandung prefix "Pemerintah Kabupaten"/"Kabupaten". */}
        <div className="flex items-center gap-4 border-b-4 border-black pb-3 mb-4">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain shrink-0" />
          )}
          <div className="text-center flex-1">
            <p className="text-sm font-medium uppercase">
              Pemerintah Kabupaten {formatKabupaten(profilSekolah?.kabupaten)}
            </p>
            <p className="text-sm font-medium
