import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Halaman cetak "DAFTAR NOMINATIF PEGAWAI" — versi KANTOR dari
// LaporanNominatifGuru.jsx. Bedanya:
// - Sumber data dari tabel `pegawai_kantor` (bukan `guru`).
// - Judul tidak menyebut "Guru" sama sekali.
// - Tidak ada input/label Semester & Tahun Pelajaran (konsep akademik,
//   tidak relevan untuk kantor).
// - Kolom NUPTK dihapus: NUPTK hanya relevan untuk guru, tidak dipakai
//   oleh pegawai kantor.
// Pola cetak lainnya (window.print() + CSS @media print) mengikuti
// persis LaporanNominatifGuru.jsx.
//
// CATATAN ASUMSI: kop surat & data instansi diasumsikan tetap memakai
// tabel `profil_sekolah` yang sama (relasi lewat sekolah_id), hanya
// label "Kepala Sekolah" pada blok tanda tangan diganti "Pimpinan"
// supaya tidak rancu untuk instansi non-sekolah. Kalau tabel/kolom
// profil kantor kamu ternyata berbeda, kabari saya untuk disesuaikan.
export default function LaporanNominatifPegawai() {
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

      const [{ data: kantor }, { data: pegawai }] = await Promise.all([
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
        supabase
          .from('pegawai_kantor')
          .select(
            'id, nip, nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, pangkat_golongan, status_kepegawaian, jenis_ptk, pendidikan_terakhir, tugas_tambahan, jabatan, agama, sk_pengangkatan, tmt_pengangkatan, status'
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

      setDaftarPegawai(urutkanPegawai(pegawai || []))
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

  function hitungMasaKerja(tmt) {
    if (!tmt) return { tahun: '—', bulan: '—' }
    const mulai = new Date(tmt)
    const sekarang = new Date()
    let tahun = sekarang.getFullYear() - mulai.getFullYear()
    let bulan = sekarang.getMonth() - mulai.getMonth()
    if (bulan < 0) {
      tahun -= 1
      bulan += 12
    }
    return { tahun, bulan }
  }

  function tandaiStatus(statusText, target) {
    const t = (statusText || '').toLowerCase()
    if (target === 'pns') return t.includes('pns') ? 'v' : '-'
    if (target === 'pppk') return t.includes('pppk') || t.includes('kontrak') ? 'v' : '-'
    if (target === 'gty' || target === 'honor') return t.includes('gty') || t.includes('honor') ? 'v' : '-'
    return '-'
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

      <div className="lembar-cetak print-only bg-white mx-auto my-6 p-8 shadow-sm" style={{ width: '297mm', minHeight: '210mm' }}>
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
              {[profilKantor?.alamat, profilKantor?.kecamatan, profilKantor?.kabupaten, profilKantor?.provinsi]
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
          Daftar Nominatif Pegawai
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
              <th rowSpan={2} className="border border-black px-1 py-1">Nama</th>
              <th rowSpan={2} className="border border-black px-1 py-1">NIP</th>
              <th colSpan={2} className="border border-black px-1 py-1">L/P</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Tempat, Tgl Lahir</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Pangkat/Gol</th>
              <th colSpan={3} className="border border-black px-1 py-1">Status Kepegawaian</th>
              <th rowSpan={2} className="border border-black px-1 py-1">SK Pengangkatan</th>
              <th rowSpan={2} className="border border-black px-1 py-1">TMT</th>
              <th colSpan={2} className="border border-black px-1 py-1">Masa Kerja</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Pendidikan Terakhir</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Jabatan</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Agama</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Ket</th>
            </tr>
            <tr className="text-center">
              <th className="border border-black px-1 py-1 w-5">L</th>
              <th className="border border-black px-1 py-1 w-5">P</th>
              <th className="border border-black px-1 py-1 w-6">PNS</th>
              <th className="border border-black px-1 py-1 w-6">PPPK</th>
              <th className="border border-black px-1 py-1 w-6">GTY</th>
              <th className="border border-black px-1 py-1 w-8">Thn</th>
              <th className="border border-black px-1 py-1 w-8">Bln</th>
            </tr>
          </thead>
          <tbody>
            {daftarPegawai.length === 0 ? (
              <tr>
                <td colSpan={18} className="border border-black text-center py-4 text-slate-400">
                  Belum ada data pegawai untuk instansi ini.
                </td>
              </tr>
            ) : (
              daftarPegawai.map((p, i) => {
                const masaKerja = hitungMasaKerja(p.tmt_pengangkatan)
                const lp = (p.jenis_kelamin || '').toLowerCase()
                return (
                  <tr key={p.id}>
                    <td className="border border-black px-1 py-1 text-center">{i + 1}</td>
                    <td className="border border-black px-1 py-1">{p.nama_lengkap || '—'}</td>
                    <td className="border border-black px-1 py-1">{p.nip || '—'}</td>
                    <td className="border border-black px-1 py-1 text-center">{lp === 'l' || lp === 'laki-laki' ? 'v' : ''}</td>
                    <td className="border border-black px-1 py-1 text-center">{lp === 'p' || lp === 'perempuan' ? 'v' : ''}</td>
                    <td className="border border-black px-1 py-1">
                      {p.tempat_lahir || '—'}, {formatTanggal(p.tanggal_lahir)}
                    </td>
                    <td className="border border-black px-1 py-1">{p.pangkat_golongan || '—'}</td>
                    <td className="border border-black px-1 py-1 text-center">{tandaiStatus(p.status_kepegawaian, 'pns')}</td>
                    <td className="border border-black px-1 py-1 text-center">{tandaiStatus(p.status_kepegawaian, 'pppk')}</td>
                    <td className="border border-black px-1 py-1 text-center">{tandaiStatus(p.status_kepegawaian, 'gty')}</td>
                    <td className="border border-black px-1 py-1">{p.sk_pengangkatan || '—'}</td>
                    <td className="border border-black px-1 py-1">{formatTanggal(p.tmt_pengangkatan)}</td>
                    <td className="border border-black px-1 py-1 text-center">{masaKerja.tahun}</td>
                    <td className="border border-black px-1 py-1 text-center">{masaKerja.bulan}</td>
                    <td className="border border-black px-1 py-1">{p.pendidikan_terakhir || '—'}</td>
                    <td className="border border-black px-1 py-1">{p.jabatan || p.tugas_tambahan || p.jenis_ptk || '—'}</td>
                    <td className="border border-black px-1 py-1">{p.agama || '—'}</td>
                    <td className="border border-black px-1 py-1"></td>
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
            margin: 0 !important;
            width: 100% !important;
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
