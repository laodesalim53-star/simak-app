import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Halaman cetak "BIODATA PEGAWAI" — versi KANTOR dari LaporanBiodataGuru.jsx.
// Bedanya:
// - Judul tidak menyebut "Guru" sama sekali ("Biodata Pegawai").
// - Panel & label Semester / Tahun Pelajaran (konsep akademik) DIHAPUS
//   total — tidak ada state semester/tahunAwal/tahunAkhir, tidak ada
//   panel input, dan tidak ada baris keterangan semester di kop cetak.
// - Label "Kepala Sekolah" pada blok tanda tangan diganti "Pimpinan".
//
// FIX (halaman kosong untuk tenant sekolah): sama seperti
// LaporanNominatifPegawai.jsx — "Biodata Pegawai" harus menampilkan SEMUA
// pegawai suatu instansi. Untuk tenant kantor (mis. KUA) pegawainya ada
// di tabel `pegawai_kantor`. Untuk tenant sekolah, pegawainya (guru) ada
// di tabel `guru`. Tidak ada kolom penanda "jenis instansi" di
// profil_sekolah, jadi query KEDUA tabel berdasarkan sekolah_id yang
// sama lalu digabung. Kolom alamat (alamat_jalan, rt, rw, nama_dusun,
// desa_kelurahan, kecamatan, kode_pos) sudah dicek ADA juga di tabel
// `guru` (skema sama persis dengan `pegawai_kantor`), jadi tidak perlu
// migration tambahan. Kolom `jabatan` tidak ada di `guru`, dipetakan
// dari `tugas_tambahan || jenis_ptk || 'Guru'`.
export default function LaporanBiodataPegawai() {
  const navigate = useNavigate()
  const { sekolahId: sekolahIdSaya } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [daftarPegawai, setDaftarPegawai] = useState([])
  const [loading, setLoading] = useState(true)

  function prioritasStatus(statusText) {
    const t = (statusText || '').toLowerCase()
    if (t.includes('pns')) return 1
    if (t.includes('pppk') || t.includes('kontrak')) return 2
    if (t.includes('gty') || t.includes('honor')) return 3
    return 4
  }

  function isPimpinan(p) {
    const jabatan = `${p.tugas_tambahan || ''} ${p.jenis_ptk || ''} ${p.jabatan || ''}`.toLowerCase()
    return jabatan.includes('kepala') || jabatan.includes('pimpinan')
  }

  function urutkanPegawai(daftar) {
    return [...daftar].sort((a, b) => {
      const aPim = isPimpinan(a) ? 0 : 1
      const bPim = isPimpinan(b) ? 0 : 1
      if (aPim !== bPim) return aPim - bPim

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

      const [{ data: kantor }, { data: pegawaiKantor }, { data: guru }] = await Promise.all([
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
        supabase
          .from('pegawai_kantor')
          .select(
            'id, nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, status_kepegawaian, jenis_ptk, tugas_tambahan, jabatan, alamat_jalan, rt, rw, nama_dusun, desa_kelurahan, kecamatan, kode_pos, status'
          )
          .eq('sekolah_id', sekolahId),
        supabase
          .from('guru')
          .select(
            'id, nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, status_kepegawaian, jenis_ptk, tugas_tambahan, alamat_jalan, rt, rw, nama_dusun, desa_kelurahan, kecamatan, kode_pos, status'
          )
          .eq('sekolah_id', sekolahId),
      ])

      setProfilKantor(kantor || null)

      if (kantor?.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(kantor.logo_path)
        setLogoUrl(pub?.publicUrl || '')
      } else {
        setLogoUrl('')
      }

      // `guru` tidak punya kolom `jabatan` — dipetakan dari
      // tugas_tambahan/jenis_ptk, fallback "Guru".
      const guruSebagaiPegawai = (guru || []).map((g) => ({
        ...g,
        jabatan: g.tugas_tambahan || g.jenis_ptk || 'Guru',
      }))

      const gabungan = [...(pegawaiKantor || []), ...guruSebagaiPegawai]
      setDaftarPegawai(urutkanPegawai(gabungan))
      setLoading(false)
    }
    muat()
  }, [sekolahIdSaya])

  function formatTanggal(tgl) {
    if (!tgl) return '—'
    return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  function formatKabupaten(teks) {
    if (!teks) return '—'
    return (
      teks
        .replace(/^PEMERINTAH\s+KABUPATEN\s+/i, '')
        .replace(/^KABUPATEN\s+/i, '')
        .trim() || '—'
    )
  }

  function alamatLengkap(p) {
    return (
      [p.alamat_jalan, p.rt && `RT ${p.rt}`, p.rw && `RW ${p.rw}`, p.nama_dusun, p.desa_kelurahan, p.kecamatan, p.kode_pos]
        .filter(Boolean)
        .join(', ') || '—'
    )
  }

  function kolomPns(p) {
    return (p.status_kepegawaian || '').toLowerCase().includes('pns') ? 'PNS' : ''
  }
  function kolomPs(p) {
    const t = (p.status_kepegawaian || '').toLowerCase()
    if (t.includes('pns')) return '-'
    return p.status_kepegawaian || '-'
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

      <div className="lembar-cetak print-only bg-white mx-auto my-6 p-8 shadow-sm" style={{ width: '210mm', minHeight: '297mm' }}>
        <div className="flex items-center gap-4 border-b-4 border-black pb-3 mb-4">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain shrink-0" />
          )}
          <div className="text-center flex-1">
            <p className="text-sm font-medium uppercase">
              Pemerintah Kabupaten {formatKabupaten(profilKantor?.kabupaten)}
            </p>
            <p className="text-sm font-medium uppercase">
              {profilKantor?.dinas_pendidikan || profilKantor?.instansi_induk || ''}
            </p>
            <p className="text-lg font-bold uppercase">{profilKantor?.nama_sekolah || 'Nama Instansi'}</p>
            <p className="text-xs">
              {[
                profilKantor?.alamat,
                profilKantor?.kecamatan,
                profilKantor?.kabupaten ? `Kabupaten ${formatKabupaten(profilKantor.kabupaten)}` : null,
                profilKantor?.provinsi,
              ]
                .filter(Boolean)
                .join(', ')}
              {profilKantor?.kode_pos ? ` ${profilKantor.kode_pos}` : ''}
            </p>
            {(profilKantor?.telepon || profilKantor?.email || profilKantor?.website) && (
              <p className="text-xs">
                {[profilKantor?.telepon, profilKantor?.email, profilKantor?.website].filter(Boolean).join(' | ')}
              </p>
            )}
          </div>
        </div>

        <h1 className="text-center font-bold text-base uppercase underline mb-4">
          Biodata Pegawai
        </h1>

        <div className="text-xs mb-4 grid grid-cols-[120px_1fr] gap-y-0.5 max-w-xs">
          <span>Instansi</span>
          <span>: {profilKantor?.nama_sekolah || '—'}</span>
          <span>Kecamatan</span>
          <span>: {profilKantor?.kecamatan || '—'}</span>
          <span>Kabupaten</span>
          <span>: {formatKabupaten(profilKantor?.kabupaten)}</span>
        </div>

        <table className="w-full text-[10px] border-collapse border border-black">
          <thead>
            <tr className="text-center">
              <th rowSpan={2} className="border border-black px-1 py-1 w-6">No</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Nama Pegawai</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Tempat, Tanggal Lahir</th>
              <th colSpan={2} className="border border-black px-1 py-1">L/P</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Agama</th>
              <th colSpan={2} className="border border-black px-1 py-1">Status Pegawai</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Jabatan</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Alamat</th>
            </tr>
            <tr className="text-center">
              <th className="border border-black px-1 py-1 w-5">L</th>
              <th className="border border-black px-1 py-1 w-5">P</th>
              <th className="border border-black px-1 py-1 w-8">PNS</th>
              <th className="border border-black px-1 py-1 w-8">PS</th>
            </tr>
          </thead>
          <tbody>
            {daftarPegawai.length === 0 ? (
              <tr>
                <td colSpan={10} className="border border-black text-center py-4 text-slate-400">
                  Belum ada data pegawai untuk instansi ini.
                </td>
              </tr>
            ) : (
              daftarPegawai.map((p, i) => {
                const lp = (p.jenis_kelamin || '').toLowerCase()
                return (
                  <tr key={p.id}>
                    <td className="border border-black px-1 py-1 text-center">{i + 1}</td>
                    <td className="border border-black px-1 py-1">{p.nama_lengkap || '—'}</td>
                    <td className="border border-black px-1 py-1">
                      {p.tempat_lahir || '—'}, {formatTanggal(p.tanggal_lahir)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">{lp === 'l' || lp === 'laki-laki' ? 'v' : ''}</td>
                    <td className="border border-black px-1 py-1 text-center">{lp === 'p' || lp === 'perempuan' ? 'v' : ''}</td>
                    <td className="border border-black px-1 py-1">{p.agama || '—'}</td>
                    <td className="border border-black px-1 py-1 text-center">{kolomPns(p)}</td>
                    <td className="border border-black px-1 py-1 text-center">{kolomPs(p)}</td>
                    <td className="border border-black px-1 py-1">{p.jabatan || p.tugas_tambahan || p.jenis_ptk || '—'}</td>
                    <td className="border border-black px-1 py-1">{alamatLengkap(p)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="flex justify-end mt-10">
          <div className="text-center text-xs w-64">
            <p>
              {profilKantor?.tempat_ttd || profilKantor?.kecamatan || '............'},{' '}
              {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className="mt-1">Mengetahui,</p>
            <p>Pimpinan</p>
            <div className="h-16" />
            <p className="font-semibold underline">{profilKantor?.kepala_sekolah || '............................'}</p>
            <p>NIP. {profilKantor?.nip_kepala_sekolah || '............................'}</p>
          </div>
        </div>
      </div>

      {/* CSS cetak — A4 portrait, sesuai jumlah kolom Biodata yang lebih
          sedikit dibanding Daftar Nominatif (yang perlu landscape). */}
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
             Di sini di-override jadi "static" supaya kalau daftar pegawai
             panjang (lebih dari 1 halaman A4), isinya tetap mengalir
             normal mengikuti page-break bawaan browser, bukan terpotong
             atau menumpuk di satu titik fixed. Pola sama seperti
             Cetak8355.jsx yang sudah terbukti berhasil. */
          .lembar-cetak.print-only {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }

        /* Override aturan global "@media screen { .print-only { display: none } }"
           (index.css) — override position di dalam @media print di atas
           saja TIDAK CUKUP kalau aturan global menyembunyikan .print-only
           lewat display:none saat @media screen; elemen display:none
           tetap tidak terlihat di layar meski posisinya static. Ditambahkan
           di sini, mengikuti pola LaporanSemester.jsx. */
        @media screen {
          .lembar-cetak.print-only {
            display: block !important;
          }
        }
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
      `}</style>
    </div>
  )
}
