import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Halaman cetak "DATA KEADAAN MURID TIAP KELAS" — mengikuti format sheet
// "DATA KEADAAN MURID" pada LAPORAN_BULANAN_JULI_2023.xlsx.
//
// CATATAN PENTING soal sumber data:
// - Baris "Jumlah Akhir Dalam Bulan Ini" dihitung OTOMATIS dari data siswa
//   berstatus 'aktif' saat ini, dikelompokkan per tingkat kelas (kolom
//   `tingkat` pada tabel kelas) dan jenis kelamin.
// - Database TIDAK menyimpan riwayat mutasi bulanan (siswa masuk/keluar per
//   bulan), jadi baris "Masuk Dalam Bulan Ini" dan "Keluar Dalam Bulan Ini"
//   berupa kotak isian manual yang defaultnya 0. Nilai ini hanya untuk
//   keperluan cetak saat itu dan tidak disimpan ke database.
// - Baris "Jumlah Akhir Bulan Lalu" dihitung otomatis dari rumus:
//   Akhir Bulan Ini − Masuk + Keluar, mengikuti isian manual di atas.
//
// Urutan tingkat kelas diambil dari data kelas yang benar-benar ada di
// sekolah ini (bukan di-hardcode I–VI), supaya cocok untuk SD/SMP/SMA.
export default function LaporanKeadaanMurid() {
  const navigate = useNavigate()
  const { sekolahId: sekolahIdSaya } = useAuth()
  const [profilSekolah, setProfilSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [tingkatList, setTingkatList] = useState([]) // urutan tingkat, mis. ['I','II',...] atau ['VII','VIII','IX']
  const [akhirBulanIni, setAkhirBulanIni] = useState({}) // { [tingkat]: { L, P } }
  const [masuk, setMasuk] = useState({})
  const [keluar, setKeluar] = useState({})

  // Urutan umum angka romawi dipakai supaya kolom tingkat tampil urut,
  // bukan urutan abjad. Tingkat yang tidak dikenali ditaruh di akhir sesuai
  // abjad supaya tetap tampil (tidak hilang).
  const URUTAN_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

  function urutkanTingkat(daftar) {
    return [...daftar].sort((a, b) => {
      const ia = URUTAN_ROMAWI.indexOf(a)
      const ib = URUTAN_ROMAWI.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
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

      const [{ data: sekolah }, { data: kelas }, { data: siswa }] = await Promise.all([
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
        supabase.from('kelas').select('id, tingkat').eq('sekolah_id', sekolahId),
        supabase
          .from('siswa')
          .select('kelas_id, jenis_kelamin, status')
          .eq('sekolah_id', sekolahId)
          .eq('status', 'aktif'),
      ])

      setProfilSekolah(sekolah || null)
      if (sekolah?.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(sekolah.logo_path)
        setLogoUrl(pub?.publicUrl || '')
      } else {
        setLogoUrl('')
      }

      const daftarKelas = kelas || []
      const daftarSiswa = siswa || []

      // Peta kelas_id -> tingkat, supaya siswa bisa dikelompokkan per tingkat.
      const tingkatByKelasId = {}
      daftarKelas.forEach((k) => {
        if (k.tingkat) tingkatByKelasId[k.id] = String(k.tingkat).trim()
      })

      const tingkatUnik = urutkanTingkat(Array.from(new Set(Object.values(tingkatByKelasId))))

      const counts = {}
      tingkatUnik.forEach((t) => { counts[t] = { L: 0, P: 0 } })

      daftarSiswa.forEach((s) => {
        const t = tingkatByKelasId[s.kelas_id]
        if (!t || !counts[t]) return
        if (s.jenis_kelamin === 'L') counts[t].L += 1
        else if (s.jenis_kelamin === 'P') counts[t].P += 1
      })

      const nolAwal = {}
      tingkatUnik.forEach((t) => { nolAwal[t] = { L: 0, P: 0 } })

      setTingkatList(tingkatUnik)
      setAkhirBulanIni(counts)
      setMasuk(nolAwal)
      setKeluar(JSON.parse(JSON.stringify(nolAwal)))
      setLoading(false)
    }
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahIdSaya])

  function updateMutasi(setter, tingkat, gender, value) {
    const n = value === '' ? 0 : Number(value)
    setter((prev) => ({ ...prev, [tingkat]: { ...prev[tingkat], [gender]: Number.isFinite(n) ? n : 0 } }))
  }

  // Bulan lalu = Akhir Bulan Ini − Masuk + Keluar (dihitung ulang otomatis
  // setiap kali isian masuk/keluar berubah).
  const akhirBulanLalu = useMemo(() => {
    const hasil = {}
    tingkatList.forEach((t) => {
      const ini = akhirBulanIni[t] || { L: 0, P: 0 }
      const m = masuk[t] || { L: 0, P: 0 }
      const k = keluar[t] || { L: 0, P: 0 }
      hasil[t] = { L: ini.L - m.L + k.L, P: ini.P - m.P + k.P }
    })
    return hasil
  }, [tingkatList, akhirBulanIni, masuk, keluar])

  function totalBaris(dataBaris) {
    let L = 0, P = 0
    tingkatList.forEach((t) => {
      L += dataBaris[t]?.L || 0
      P += dataBaris[t]?.P || 0
    })
    return { L, P, TOTAL: L + P }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

  const baris = [
    { label: 'Jumlah Akhir Bulan Lalu', data: akhirBulanLalu, editable: false },
    { label: 'Masuk Dalam Bulan Ini', data: masuk, editable: true, setter: setMasuk },
    { label: 'Keluar Dalam Bulan Ini', data: keluar, editable: true, setter: setKeluar },
    { label: 'Jumlah Akhir Dalam Bulan Ini', data: akhirBulanIni, editable: false, tebal: true },
  ]

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
          Baris "Masuk"/"Keluar" bisa diisi manual sebelum dicetak. Baris lain otomatis dari data siswa aktif.
        </p>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Printer size={16} /> Cetak
        </button>
      </div>

      <div className="lembar-cetak bg-white mx-auto my-6 p-8 shadow-sm" style={{ width: '297mm', minHeight: '210mm' }}>
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

        <h1 className="text-center font-bold text-base uppercase underline mb-1">
          Data Keadaan Murid Tiap Kelas
        </h1>
        <p className="text-center text-xs mb-4">
          {profilSekolah?.nama_sekolah || 'Nama Sekolah'} — Tahun Pelajaran {profilSekolah?.tahun_ajaran || '................/................'}
        </p>

        {tingkatList.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">
            Belum ada kelas dengan data tingkat untuk sekolah ini.
          </p>
        ) : (
          <table className="w-full text-[10px] border-collapse border border-black">
            <thead>
              <tr className="text-center">
                <th rowSpan={3} className="border border-black px-1 py-1 w-6">No</th>
                <th rowSpan={3} className="border border-black px-1 py-1">Keterangan</th>
                <th colSpan={tingkatList.length * 2} className="border border-black px-1 py-1">Keadaan Murid Menurut Kelas</th>
                <th colSpan={3} className="border border-black px-1 py-1">Jumlah</th>
              </tr>
              <tr className="text-center">
                {tingkatList.map((t) => (
                  <th key={t} colSpan={2} className="border border-black px-1 py-1">{t}</th>
                ))}
                <th rowSpan={2} className="border border-black px-1 py-1 w-8">L</th>
                <th rowSpan={2} className="border border-black px-1 py-1 w-8">P</th>
                <th rowSpan={2} className="border border-black px-1 py-1 w-10">Total</th>
              </tr>
              <tr className="text-center">
                {tingkatList.map((t) => (
                  <>
                    <th key={`${t}-L`} className="border border-black px-1 py-1 w-8">L</th>
                    <th key={`${t}-P`} className="border border-black px-1 py-1 w-8">P</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {baris.map((b, i) => {
                const total = totalBaris(b.data)
                return (
                  <tr key={b.label} className={b.tebal ? 'font-semibold' : ''}>
                    <td className="border border-black px-1 py-1 text-center">{i + 1}</td>
                    <td className="border border-black px-1 py-1">{b.label}</td>
                    {tingkatList.map((t) => (
                      <>
                        <td key={`${t}-L-${b.label}`} className="border border-black px-1 py-1 text-center">
                          {b.editable ? (
                            <input
                              type="number"
                              className="sel-mutasi"
                              value={b.data[t]?.L ?? 0}
                              onChange={(e) => updateMutasi(b.setter, t, 'L', e.target.value)}
                            />
                          ) : (
                            b.data[t]?.L ?? 0
                          )}
                        </td>
                        <td key={`${t}-P-${b.label}`} className="border border-black px-1 py-1 text-center">
                          {b.editable ? (
                            <input
                              type="number"
                              className="sel-mutasi"
                              value={b.data[t]?.P ?? 0}
                              onChange={(e) => updateMutasi(b.setter, t, 'P', e.target.value)}
                            />
                          ) : (
                            b.data[t]?.P ?? 0
                          )}
                        </td>
                      </>
                    ))}
                    <td className="border border-black px-1 py-1 text-center">{total.L}</td>
                    <td className="border border-black px-1 py-1 text-center">{total.P}</td>
                    <td className="border border-black px-1 py-1 text-center">{total.TOTAL}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

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

      <style>{`
        .sel-mutasi {
          width: 32px;
          border: none;
          border-bottom: 1px dotted #94a3b8;
          text-align: center;
          font-size: 10px;
          background: transparent;
          outline: none;
          -moz-appearance: textfield;
        }
        .sel-mutasi::-webkit-outer-spin-button,
        .sel-mutasi::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .sel-mutasi:focus {
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
          .sel-mutasi {
            border-bottom: none;
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
