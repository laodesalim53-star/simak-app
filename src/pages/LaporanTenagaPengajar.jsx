import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Halaman cetak "DATA RINCIAN TENAGA PENGAJAR" — mengikuti format sheet
// "DATA RINCIAN TENAGA PENGAJAR" pada LAPORAN_BULANAN_JULI_2023.xlsx.
//
// CATATAN PENTING soal sumber data:
// - Kolom NO, NAMA GURU/PEGAWAI diambil OTOMATIS dari tabel `guru`.
// - Kolom KELAS diisi otomatis kalau guru tsb menjadi wali kelas (dicocokkan
//   lewat kelas.wali_kelas_id), kalau tidak ada wali kelas maka dikosongkan
//   dan bisa diisi manual.
// - Kolom jam mengajar per bidang studi, jumlah jam, wajib/kelebihan/
//   kekurangan, dan absen (S/I/A) TIDAK ADA di database (tidak ada tabel
//   beban-mengajar), jadi kolom-kolom itu berupa kotak isian (input) yang
//   bisa diketik langsung di layar sebelum menekan tombol Cetak. Nilai yang
//   diketik TIDAK disimpan ke database — hanya untuk keperluan cetak saat itu.
//
// Struktur file ini mengikuti pola LaporanBiodataGuru.jsx (kop surat, sumber
// data, tombol cetak) supaya konsisten dengan laporan lain.
export default function LaporanTenagaPengajar() {
  const navigate = useNavigate()
  const { sekolahId: sekolahIdSaya } = useAuth()
  const [profilSekolah, setProfilSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  // Kolom bidang studi manual — disederhanakan dari sheet asli (kolom Agama
  // digabung jadi satu, bukan dipecah Islam/Kristen/Katolik) supaya tabel
  // tetap rapi dan mudah diketik.
  const KOLOM_MAPEL = [
    { key: 'ppkn', label: 'PPKN' },
    { key: 'agama', label: 'AGAMA' },
    { key: 'bhs_indo', label: 'BHS. INDO' },
    { key: 'ipa', label: 'IPA/SAINS' },
    { key: 'ips', label: 'IPS' },
    { key: 'matematika', label: 'MTK' },
    { key: 'kertakes', label: 'KERTAKES' },
    { key: 'mulok', label: 'MULOK' },
    { key: 'penjaskes', label: 'PENJASKES' },
    { key: 'peng_diri', label: 'PENG. DIRI' },
    { key: 'lainnya', label: '...........' },
  ]

  useEffect(() => {
    async function muat() {
      setLoading(true)
      const sekolahId = sekolahIdSaya
      if (!sekolahId) {
        setLoading(false)
        return
      }

      const [{ data: sekolah }, { data: guru }, { data: kelas }] = await Promise.all([
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
        supabase
          .from('guru')
          .select('id, nama_lengkap, status_kepegawaian, status')
          .eq('sekolah_id', sekolahId)
          .order('nama_lengkap'),
        supabase
          .from('kelas')
          .select('id, nama_kelas, wali_kelas_id')
          .eq('sekolah_id', sekolahId),
      ])

      setProfilSekolah(sekolah || null)
      if (sekolah?.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(sekolah.logo_path)
        setLogoUrl(pub?.publicUrl || '')
      } else {
        setLogoUrl('')
      }

      const daftarGuru = guru || []
      const daftarKelas = kelas || []

      const rowsAwal = daftarGuru.map((g) => {
        const kelasWali = daftarKelas.find((k) => k.wali_kelas_id === g.id)
        const isiAwal = { kelas: kelasWali ? kelasWali.nama_kelas : '', jumlah: '', wajib: '', kelebihan: '', kekurangan: '', absen_s: '', absen_i: '', absen_a: '', absen_jumlah: '', ket: '' }
        KOLOM_MAPEL.forEach((m) => { isiAwal[m.key] = '' })
        return { id: g.id, nama_lengkap: g.nama_lengkap, ...isiAwal }
      })

      setRows(rowsAwal)
      setLoading(false)
    }
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahIdSaya])

  function updateCell(id, key, value) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  }

  // Sel isian kecil dipakai berulang untuk kolom-kolom manual di tabel.
  function SelIsian({ value, onChange, width = 34 }) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sel-isian"
        style={{ width }}
      />
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
        <p className="no-print text-xs text-slate-400 max-w-md text-center hidden sm:block">
          Isi kolom bidang studi &amp; jam mengajar langsung di tabel sebelum menekan Cetak. Isian ini tidak disimpan.
        </p>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Printer size={16} /> Cetak
        </button>
      </div>

      <div className="lembar-cetak bg-white mx-auto my-6 p-8 shadow-sm" style={{ width: '330mm', minHeight: '210mm' }}>
        {/* Kop Surat */}
        <div className="flex items-center gap-4 border-b-4 border-black pb-3 mb-4">
          {logoUrl && <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain shrink-0" />}
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
          </div>
        </div>

        <h1 className="text-center font-bold text-base uppercase underline mb-4">
          Data Rincian Tenaga Pengajar
        </h1>

        <table className="w-full text-[9px] border-collapse border border-black">
          <thead>
            <tr className="text-center">
              <th rowSpan={2} className="border border-black px-1 py-1">No</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Nama Guru/Pegawai</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Kelas</th>
              <th colSpan={KOLOM_MAPEL.length} className="border border-black px-1 py-1">Mengajar Bidang Studi (jam/minggu)</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Jumlah</th>
              <th colSpan={3} className="border border-black px-1 py-1">Jam Mengajar</th>
              <th colSpan={4} className="border border-black px-1 py-1">Absen</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Ket</th>
            </tr>
            <tr className="text-center">
              {KOLOM_MAPEL.map((m) => (
                <th key={m.key} className="border border-black px-1 py-1">{m.label}</th>
              ))}
              <th className="border border-black px-1 py-1">Wajib</th>
              <th className="border border-black px-1 py-1">Lebih</th>
              <th className="border border-black px-1 py-1">Kurang</th>
              <th className="border border-black px-1 py-1">S</th>
              <th className="border border-black px-1 py-1">I</th>
              <th className="border border-black px-1 py-1">A</th>
              <th className="border border-black px-1 py-1">Jml</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={KOLOM_MAPEL.length + 9} className="border border-black text-center py-4 text-slate-400">
                  Belum ada data guru untuk sekolah ini.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="border border-black px-1 py-1 text-center">{i + 1}</td>
                  <td className="border border-black px-1 py-1 whitespace-nowrap">{r.nama_lengkap}</td>
                  <td className="border border-black px-1 py-1">
                    <SelIsian value={r.kelas} onChange={(v) => updateCell(r.id, 'kelas', v)} width={44} />
                  </td>
                  {KOLOM_MAPEL.map((m) => (
                    <td key={m.key} className="border border-black px-0.5 py-1">
                      <SelIsian value={r[m.key]} onChange={(v) => updateCell(r.id, m.key, v)} width={28} />
                    </td>
                  ))}
                  <td className="border border-black px-0.5 py-1">
                    <SelIsian value={r.jumlah} onChange={(v) => updateCell(r.id, 'jumlah', v)} width={28} />
                  </td>
                  <td className="border border-black px-0.5 py-1">
                    <SelIsian value={r.wajib} onChange={(v) => updateCell(r.id, 'wajib', v)} width={26} />
                  </td>
                  <td className="border border-black px-0.5 py-1">
                    <SelIsian value={r.kelebihan} onChange={(v) => updateCell(r.id, 'kelebihan', v)} width={26} />
                  </td>
                  <td className="border border-black px-0.5 py-1">
                    <SelIsian value={r.kekurangan} onChange={(v) => updateCell(r.id, 'kekurangan', v)} width={26} />
                  </td>
                  <td className="border border-black px-0.5 py-1">
                    <SelIsian value={r.absen_s} onChange={(v) => updateCell(r.id, 'absen_s', v)} width={20} />
                  </td>
                  <td className="border border-black px-0.5 py-1">
                    <SelIsian value={r.absen_i} onChange={(v) => updateCell(r.id, 'absen_i', v)} width={20} />
                  </td>
                  <td className="border border-black px-0.5 py-1">
                    <SelIsian value={r.absen_a} onChange={(v) => updateCell(r.id, 'absen_a', v)} width={20} />
                  </td>
                  <td className="border border-black px-0.5 py-1">
                    <SelIsian value={r.absen_jumlah} onChange={(v) => updateCell(r.id, 'absen_jumlah', v)} width={20} />
                  </td>
                  <td className="border border-black px-0.5 py-1">
                    <SelIsian value={r.ket} onChange={(v) => updateCell(r.id, 'ket', v)} width={40} />
                  </td>
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

      {/* CSS cetak — A4 landscape (tabelnya lebar, banyak kolom) */}
      <style>{`
        .sel-isian {
          border: none;
          border-bottom: 1px dotted #94a3b8;
          text-align: center;
          font-size: 9px;
          background: transparent;
          outline: none;
          padding: 1px 2px;
        }
        .sel-isian:focus {
          border-bottom: 1px solid #2563eb;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .sel-isian {
            border-bottom: none;
          }
        }
        @page {
          size: A3 landscape;
          margin: 12mm;
        }
      `}</style>
    </div>
  )
}
