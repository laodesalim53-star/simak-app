import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Halaman cetak "DATA KEPANGKATAN GURU/PEGAWAI" — kolektif semua guru di
// satu sekolah sekaligus. Mengikuti pola LaporanBiodataGuru.jsx (kop surat,
// toolbar no-print, panel input Semester/Tahun Pelajaran, lembar-cetak
// print-only A4 landscape, blok tanda tangan).
//
// Urutan baris tabel:
// 1. Kepala Sekolah SELALU paling atas, terlepas dari golongannya.
// 2. Sisanya diurutkan berdasarkan tingkat Pangkat/Golongan, dari yang
//    TERTINGGI ke yang TERENDAH (mis. IV lebih atas dari III, III/D lebih
//    atas dari III/A) — mengikuti pola "yang lebih senior tampil lebih
//    atas" seperti di Daftar Nominatif.
// 3. Guru yang golongannya SAMA diurutkan berdasarkan abjad nama (A-Z).
//
// CATATAN: kalau ternyata urutan yang diinginkan sekolah justru golongan
// terendah dulu (I sebelum IV), tinggal balik tanda pengurangan di
// bandingkanGolongan() — cukup 1 baris (lihat komentar di dalamnya).
export default function LaporanKepangkatanGuru() {
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

  // Kepala Sekolah dideteksi dari kolom tugas_tambahan / jenis_ptk, sama
  // seperti pola yang sudah dipakai di LaporanNominatifGuru.jsx.
  function isKepalaSekolah(g) {
    const jabatan = `${g.tugas_tambahan || ''} ${g.jenis_ptk || ''}`.toLowerCase()
    return jabatan.includes('kepala sekolah')
  }

  // Mengubah teks pangkat/golongan bebas (mis. "Penata Muda / III-b",
  // "Pengatur / IIC", "penata muda /II-d", "Golongan IX (Ahli Pertama)")
  // menjadi 1 angka peringkat yang bisa dibandingkan.
  // Angka romawi (I..IX) jadi puluhan, huruf sub-golongan (a-d) jadi satuan.
  function peringkatGolongan(teks) {
    if (!teks) return 0
    const t = teks.toUpperCase()

    // Urutan alternasi SENGAJA dari romawi terpanjang ke terpendek, supaya
    // "VIII" tidak salah kebaca sebagai "II" duluan, dst.
    const cocok = t.match(/(IX|VIII|VII|VI|IV|III|II|I|V)[\s./-]?([A-D])?/)
    if (!cocok) return 0

    const angkaRomawi = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 }
    const nilaiRomawi = angkaRomawi[cocok[1]] || 0
    const nilaiHuruf = cocok[2] ? cocok[2].charCodeAt(0) - 64 : 0 // A=1, B=2, C=3, D=4

    return nilaiRomawi * 10 + nilaiHuruf
  }

  function bandingkanGolongan(a, b) {
    const golA = peringkatGolongan(a.pangkat_golongan)
    const golB = peringkatGolongan(b.pangkat_golongan)
    // Golongan tertinggi lebih dulu (descending). Untuk membalik jadi
    // terendah dulu (ascending), tinggal tukar golA dan golB di baris ini.
    return golB - golA
  }

  function urutkanGuru(daftar) {
    return [...daftar].sort((a, b) => {
      const aKS = isKepalaSekolah(a) ? 0 : 1
      const bKS = isKepalaSekolah(b) ? 0 : 1
      if (aKS !== bKS) return aKS - bKS

      const bandingGol = bandingkanGolongan(a, b)
      if (bandingGol !== 0) return bandingGol

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
            'id, nip, nama_lengkap, pangkat_golongan, karpeg, sk_cpns, tanggal_cpns, sk_pengangkatan, tmt_pengangkatan, lembaga_pengangkatan, tmt_pns, tugas_tambahan, jenis_ptk, status'
          )
          .eq('sekolah_id', sekolahId)
          .eq('status', 'aktif'),
      ])

      setProfilSekolah(sekolah || null)

      // logo_path adalah path di Supabase Storage, bukan URL lengkap — harus
      // dikonversi lewat getPublicUrl() dulu, sama seperti pola di
      // LaporanNominatifGuru.jsx / LaporanBulanan.jsx (bucket 'profil-sekolah').
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
        {/* Kop Surat */}
        <div className="flex items-center gap-4 border-b-4 border-black pb-3 mb-4">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain shrink-0" />
          )}
          <div className="text-center flex-1">
            <p className="text-sm font-medium uppercase">
              {profilSekolah?.dinas_pendidikan || 'PEMERINTAH DAERAH'}
            </p>
            <p className="text-lg font-bold uppercase">{profilSekolah?.nama_sekolah || 'Nama Sekolah'}</p>
            <p className="text-xs">
              {[profilSekolah?.alamat, profilSekolah?.kecamatan, profilSekolah?.kabupaten, profilSekolah?.provinsi]
                .filter(Boolean)
                .join(', ')}
              {profilSekolah?.kode_pos ? ` ${profilSekolah.kode_pos}` : ''}
            </p>
            {(profilSekolah?.telepon || profilSekolah?.email || profilSekolah?.website) && (
              <p className="text-xs">
                {[profilSekolah?.telepon, profilSekolah?.email, profilSekolah?.website].filter(Boolean).join(' | ')}
              </p>
            )}
          </div>
        </div>

        <h1 className="text-center font-bold text-base uppercase underline mb-1">
          Data Kepangkatan Guru/Pegawai
        </h1>
        <p className="text-center text-xs mb-4">
          Semester {semester} Tahun Pelajaran {tahunAwal || '................'}/{tahunAkhir || '................'}
        </p>

        <div className="text-xs mb-4 grid grid-cols-[120px_1fr] gap-y-0.5 max-w-xs">
          <span>Sekolah</span>
          <span>: {profilSekolah?.nama_sekolah || '—'}</span>
          <span>Kecamatan</span>
          <span>: {profilSekolah?.kecamatan || '—'}</span>
          <span>Kabupaten</span>
          <span>: {profilSekolah?.kabupaten || '—'}</span>
        </div>

        <table className="w-full text-[10px] border-collapse border border-black">
          <thead>
            <tr className="text-center">
              <th className="border border-black px-1 py-1 w-6">No</th>
              <th className="border border-black px-1 py-1">Nama Lengkap</th>
              <th className="border border-black px-1 py-1">NIP</th>
              <th className="border border-black px-1 py-1">Pangkat/Gol.</th>
              <th className="border border-black px-1 py-1">Karpeg</th>
              <th className="border border-black px-1 py-1">SK CPNS</th>
              <th className="border border-black px-1 py-1">Tgl CPNS</th>
              <th className="border border-black px-1 py-1">SK Pengangkatan</th>
              <th className="border border-black px-1 py-1">TMT Pengangkatan</th>
              <th className="border border-black px-1 py-1">Lembaga Pengangkatan</th>
              <th className="border border-black px-1 py-1">TMT PNS</th>
            </tr>
          </thead>
          <tbody>
            {daftarGuru.length === 0 ? (
              <tr>
                <td colSpan={11} className="border border-black text-center py-4 text-slate-400">
                  Belum ada data guru untuk sekolah ini.
                </td>
              </tr>
            ) : (
              daftarGuru.map((g, i) => (
                <tr key={g.id}>
                  <td className="border border-black px-1 py-1 text-center">{i + 1}</td>
                  <td className="border border-black px-1 py-1">{g.nama_lengkap || '—'}</td>
                  <td className="border border-black px-1 py-1">{g.nip || '—'}</td>
                  <td className="border border-black px-1 py-1">{g.pangkat_golongan || '—'}</td>
                  <td className="border border-black px-1 py-1">{g.karpeg || '—'}</td>
                  <td className="border border-black px-1 py-1">{g.sk_cpns || '—'}</td>
                  <td className="border border-black px-1 py-1">{formatTanggal(g.tanggal_cpns)}</td>
                  <td className="border border-black px-1 py-1">{g.sk_pengangkatan || '—'}</td>
                  <td className="border border-black px-1 py-1">{formatTanggal(g.tmt_pengangkatan)}</td>
                  <td className="border border-black px-1 py-1">{g.lembaga_pengangkatan || '—'}</td>
                  <td className="border border-black px-1 py-1">{formatTanggal(g.tmt_pns)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Blok tanda tangan kepala sekolah */}
        <div className="flex justify-end mt-10">
          <div className="text-center text-xs w-64">
            <p>
              {profilSekolah?.tempat_ttd || profilSekolah?.kecamatan || '............'},{' '}
              {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className="mt-1">Mengetahui,</p>
            <p>Kepala Sekolah</p>
            <div className="h-16" />
            <p className="font-semibold underline">{profilSekolah?.kepala_sekolah || '............................'}</p>
            <p>NIP. {profilSekolah?.nip_kepala_sekolah || '............................'}</p>
          </div>
        </div>
      </div>

      {/* CSS cetak — A4 landscape (tabel ini lebar, 11 kolom). Blok
          "position: static" override mengikuti pola LaporanBiodataGuru.jsx
          supaya kalau daftar guru panjang (lebih dari 1 halaman), isinya
          mengalir normal mengikuti page-break bawaan browser, bukan
          terpotong atau menumpuk di satu titik fixed. */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }

          /* CSS global (index.css) punya aturan:
               body * { visibility: hidden; }
               .print-only, .print-only * { visibility: visible; }
             yang tadinya dibuat khusus untuk Kuitansi/Nota (1 lembar) dan
             kemungkinan memberi .print-only posisi "fixed" secara default.
             Di sini di-override jadi "static" supaya kalau daftar guru
             panjang (lebih dari 1 halaman A4), isinya tetap mengalir
             normal mengikuti page-break bawaan browser, bukan terpotong
             atau menumpuk di satu titik fixed. Pola sama seperti
             Cetak8355.jsx / LaporanBiodataGuru.jsx yang sudah terbukti berhasil. */
          .lembar-cetak.print-only {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
      `}</style>
    </div>
  )
}
