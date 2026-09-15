import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Printer } from 'lucide-react'
import Layout from '../components/Layout'

// Ganti 'logo' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// Kolom tabel `presensi_pegawai_kantor` — disamakan dengan PresensiKantor.jsx
const KOLOM_RELASI_PEGAWAI = 'pegawai_kantor_id' // FK ke pegawai_kantor.id
const KOLOM_TANGGAL = 'tanggal'                  // date
const KOLOM_STATUS = 'status'                    // text: hadir / izin / sakit / alpa

// Singkatan status yang ditampilkan di kolom tanggal
const SINGKATAN_STATUS = {
  hadir: 'H',
  izin: 'I',
  sakit: 'S',
  alpa: 'A',
  cuti: 'C',
  dinas: 'D',
}

function formatTanggalIndonesia(date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function DaftarHadirPegawai() {
  const { profil, sekolahId } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)
  const [pegawaiList, setPegawaiList] = useState([])
  const [presensiMap, setPresensiMap] = useState({})
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1) // 1-12
  const [tahun, setTahun] = useState(now.getFullYear())

  const jumlahHari = useMemo(() => new Date(tahun, bulan, 0).getDate(), [tahun, bulan])
  const daftarHari = useMemo(
    () => Array.from({ length: jumlahHari }, (_, i) => i + 1),
    [jumlahHari]
  )

  useEffect(() => {
    supabase
      .from('profil_kantor')
      .select('nama_kantor, alamat, kabupaten, kecamatan, telepon, email, kepala_kua, nip_kepala_kua, tempat_ttd, logo_path, ttd_kepala_kua_path')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setProfilKantor(data))
  }, [])

  useEffect(() => {
    async function muatData() {
      if (!sekolahId) {
        setPegawaiList([])
        setPresensiMap({})
        setLoading(false)
        return
      }
      setLoading(true)

      const { data: pegawai } = await supabase
        .from('pegawai_kantor')
        .select('id, nama_lengkap, jabatan, nip')
        .eq('sekolah_id', sekolahId)
        .eq('status', 'aktif')
        .order('nama_lengkap', { ascending: true })

      const daftarPegawai = pegawai || []
      setPegawaiList(daftarPegawai)

      const tanggalAwal = `${tahun}-${String(bulan).padStart(2, '0')}-01`
      const tanggalAkhir = `${tahun}-${String(bulan).padStart(2, '0')}-${String(jumlahHari).padStart(2, '0')}`

      const { data: presensi, error } = await supabase
        .from('presensi_pegawai_kantor')
        .select(`${KOLOM_RELASI_PEGAWAI}, ${KOLOM_TANGGAL}, ${KOLOM_STATUS}`)
        .eq('sekolah_id', sekolahId)
        .gte(KOLOM_TANGGAL, tanggalAwal)
        .lte(KOLOM_TANGGAL, tanggalAkhir)

      if (error) {
        console.error('Gagal memuat presensi — cek nama kolom di presensi_pegawai_kantor:', error)
      }

      // Susun jadi map: { [pegawai_id]: { [tanggal]: 'H' | 'I' | 'S' | 'A' | ... } }
      const map = {}
      for (const baris of presensi || []) {
        const idPegawai = baris[KOLOM_RELASI_PEGAWAI]
        const tgl = new Date(baris[KOLOM_TANGGAL]).getDate()
        const statusMentah = String(baris[KOLOM_STATUS] || '').toLowerCase()
        const singkatan = SINGKATAN_STATUS[statusMentah] || statusMentah.charAt(0).toUpperCase() || '-'

        if (!map[idPegawai]) map[idPegawai] = {}
        map[idPegawai][tgl] = singkatan
      }
      setPresensiMap(map)

      setLoading(false)
    }

    muatData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulan, tahun, jumlahHari, sekolahId])

  const logoUrl = profilKantor?.logo_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.logo_path).data.publicUrl
    : null

  const ttdKepalaKuaUrl = profilKantor?.ttd_kepala_kua_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.ttd_kepala_kua_path).data.publicUrl
    : null

  const tempatTtd = profilKantor?.tempat_ttd || profilKantor?.kabupaten || ''
  const tanggalCetak = formatTanggalIndonesia(new Date())

  // Hitung rekap per pegawai (total H/I/S/A dalam sebulan)
  function hitungRekap(idPegawai) {
    const dataBulan = presensiMap[idPegawai] || {}
    const nilai = Object.values(dataBulan)
    return {
      hadir: nilai.filter((v) => v === 'H').length,
      izin: nilai.filter((v) => v === 'I').length,
      sakit: nilai.filter((v) => v === 'S').length,
      alpa: nilai.filter((v) => v === 'A').length,
    }
  }

  return (
    <Layout
      title="Daftar Hadir Pegawai"
      subtitle="Rekap kehadiran pegawai per bulan, otomatis dari data pegawai, siap cetak."
    >
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <select
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {NAMA_BULAN.map((nama, i) => (
              <option key={nama} value={i + 1}>{nama}</option>
            ))}
          </select>
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i).map((th) => (
              <option key={th} value={th}>{th}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Printer size={16} /> Cetak Daftar Hadir
        </button>
      </div>

      {loading ? (
        <p className="no-print text-sm text-slate-500">Memuat data...</p>
      ) : (
        <div
          className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 mx-auto"
          style={{ width: '297mm' }}
        >
          {/* === KOP SURAT OTOMATIS === */}
          <div className="kop-surat flex items-center gap-4 border-b-2 border-slate-800 pb-3 mb-6">
            {logoUrl && (
              <img src={logoUrl} alt="Logo Instansi" className="w-16 h-16 object-contain shrink-0" />
            )}
            <div className="text-center flex-1">
              <p className="font-display text-base font-bold uppercase text-slate-900 leading-tight">
                {profilKantor?.nama_kantor || 'Nama Kantor Belum Diatur'}
              </p>
              <p className="text-xs text-slate-600 leading-tight">
                {[profilKantor?.alamat, profilKantor?.kecamatan, profilKantor?.kabupaten]
                  .filter(Boolean)
                  .join(', ')}
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

          <div className="text-center mb-5">
            <h1 className="font-display text-base font-bold uppercase text-slate-900 underline">
              Rekapitulasi Daftar Hadir Pegawai
            </h1>
            <p className="text-sm text-slate-700 mt-0.5">
              Bulan {NAMA_BULAN[bulan - 1]} {tahun}
            </p>
          </div>

          <table className="w-full border-collapse text-[9px] sm:text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 px-1 py-1 w-6">No</th>
                <th className="border border-slate-400 px-2 py-1 text-left w-40">Nama / NIP</th>
                <th className="border border-slate-400 px-2 py-1 text-left w-32">Jabatan</th>
                {daftarHari.map((hari) => (
                  <th key={hari} className="border border-slate-400 px-0.5 py-1 w-4">{hari}</th>
                ))}
                <th className="border border-slate-400 px-1 py-1 w-6">H</th>
                <th className="border border-slate-400 px-1 py-1 w-6">I</th>
                <th className="border border-slate-400 px-1 py-1 w-6">S</th>
                <th className="border border-slate-400 px-1 py-1 w-6">A</th>
              </tr>
            </thead>
            <tbody>
              {pegawaiList.map((pegawai, i) => {
                const rekap = hitungRekap(pegawai.id)
                const dataBulanIni = presensiMap[pegawai.id] || {}
                return (
                  <tr key={pegawai.id}>
                    <td className="border border-slate-300 text-center py-1">{i + 1}</td>
                    <td className="border border-slate-300 px-2 py-1">
                      <div className="font-medium text-slate-800">{pegawai.nama_lengkap}</div>
                      <div className="text-slate-500">{pegawai.nip}</div>
                    </td>
                    <td className="border border-slate-300 px-2 py-1">{pegawai.jabatan}</td>
                    {daftarHari.map((hari) => (
                      <td key={hari} className="border border-slate-300 text-center">
                        {dataBulanIni[hari] || ''}
                      </td>
                    ))}
                    <td className="border border-slate-300 text-center">{rekap.hadir}</td>
                    <td className="border border-slate-300 text-center">{rekap.izin}</td>
                    <td className="border border-slate-300 text-center">{rekap.sakit}</td>
                    <td className="border border-slate-300 text-center">{rekap.alpa}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <p className="text-[9px] text-slate-500 mt-2">
            Keterangan: H = Hadir, I = Izin, S = Sakit, A = Alpa/Tanpa Keterangan
          </p>

          {/* === TANDA TANGAN OTOMATIS DARI PROFIL KANTOR === */}
          <div className="ttd-block flex justify-between mt-10 text-sm text-slate-700">
            <div className="text-center w-48">
              <p>Mengetahui,</p>
              <p>Kepala KUA</p>
              <div className="h-20 flex items-end justify-center">
                {ttdKepalaKuaUrl && (
                  <img src={ttdKepalaKuaUrl} alt="Tanda Tangan Kepala KUA" className="max-h-20 object-contain" />
                )}
              </div>
              <p className="font-semibold border-t border-slate-400 pt-1">
                ({profilKantor?.kepala_kua || '..............................'})
              </p>
              <p className="text-xs text-slate-500">
                NIP. {profilKantor?.nip_kepala_kua || '..............................'}
              </p>
            </div>
            <div className="text-center w-48">
              <p>{tempatTtd ? `${tempatTtd}, ${tanggalCetak}` : '\u00A0'}</p>
              <p>Dibuat oleh</p>
              <div className="h-20" />
              <p className="font-semibold border-t border-slate-400 pt-1">
                ({profil?.nama_lengkap || '..............................'})
              </p>
              <p className="text-xs text-slate-500">
                NIP. {profil?.nip || '..............................'}
              </p>
            </div>
          </div>
        </div>
      )}

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
            overflow-x: auto;
          }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            width: 297mm !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .ttd-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
      `}</style>
    </Layout>
  )
}
