import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import * as XLSX from 'xlsx'
import { Printer, FileSpreadsheet, Loader2 } from 'lucide-react'

// Laman "Daftar Hadir Kantor" — versi kantor dari tampilan grid kalender
// di src/pages/LaporanBulanan.jsx (jenis='presensi_guru', tampilanGuru=
// 'daftar_hadir'), tapi dibuat sebagai file BERDIRI SENDIRI (tidak
// mengimpor/mengubah LaporanBulanan.jsx, daftarHadirUtils.js, atau
// exportUtils.js) sesuai permintaan: hanya tampil di laman kantor,
// tidak tampil/mempengaruhi laman sekolah.
//
// Mengikuti pola varian "kantor" yang sudah ada di aplikasi ini
// (LaporanNominatifPegawai.jsx dkk): label tanda tangan pakai "PIMPINAN",
// tanpa konsep Semester/Tahun Pelajaran, tanpa NUPTK.
//
// Sumber data: tabel pegawai_kantor + presensi_pegawai_kantor
// (lihat migrasi-presensi-pegawai-kantor.sql).

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function jumlahHariDalamBulan(tahun, bulan) {
  return new Date(tahun, bulan, 0).getDate()
}

function apakahHariMinggu(tahun, bulan, tgl) {
  return new Date(tahun, bulan - 1, tgl).getDay() === 0
}

function kodeSel(status) {
  if (status === 'sakit') return 'S'
  if (status === 'izin') return 'I'
  if (status === 'alpa') return 'TK'
  return '' // hadir, atau belum diisi
}

function rentangBulan(tahun, bulan) {
  const awal = `${tahun}-${String(bulan).padStart(2, '0')}-01`
  const akhirDate = new Date(tahun, bulan, 0)
  const akhir = `${tahun}-${String(bulan).padStart(2, '0')}-${String(akhirDate.getDate()).padStart(2, '0')}`
  return { awal, akhir }
}

function susunDaftarHadirKantor(daftarPegawai, daftarPresensi, tahun, bulan) {
  const totalHari = jumlahHariDalamBulan(tahun, bulan)
  const baris = daftarPegawai.map((p, idx) => {
    const statusHarian = Array.from({ length: totalHari }, () => null)
    let sakit = 0
    let izin = 0
    let tanpaKeterangan = 0
    for (const row of daftarPresensi) {
      if (row.pegawai_kantor_id !== p.id) continue
      const tgl = Number(String(row.tanggal).slice(8, 10))
      if (tgl < 1 || tgl > totalHari) continue
      statusHarian[tgl - 1] = row.status
      if (row.status === 'sakit') sakit++
      else if (row.status === 'izin') izin++
      else if (row.status === 'alpa') tanpaKeterangan++
    }
    return {
      id: p.id,
      no: idx + 1,
      nama: p.nama_lengkap,
      nip: p.nip || '-',
      jabatan: p.jabatan || '-',
      statusHarian,
      sakit,
      izin,
      tanpaKeterangan,
      jumlahTidakHadir: sakit + izin + tanpaKeterangan,
    }
  })
  return { baris, totalHari }
}

export default function DaftarHadirKantor() {
  const { sekolahId } = useAuth()
  const now = new Date()
  const [tahun, setTahun] = useState(now.getFullYear())
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(false)
  const [daftarHadir, setDaftarHadir] = useState(null) // { baris, totalHari }
  const [tanggalLibur, setTanggalLibur] = useState('')
  const [hariLiburDB, setHariLiburDB] = useState(new Set())
  const [profilSekolah, setProfilSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [ttdUrl, setTtdUrl] = useState('')

  useEffect(() => {
    if (!sekolahId) return
    supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle().then(({ data }) => {
      setProfilSekolah(data || {})
      if (data?.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(data.logo_path)
        setLogoUrl(pub.publicUrl)
      } else {
        setLogoUrl('')
      }
      if (data?.ttd_kepala_sekolah_path) {
        const { data: pubTtd } = supabase.storage.from('profil-sekolah').getPublicUrl(data.ttd_kepala_sekolah_path)
        setTtdUrl(pubTtd.publicUrl)
      } else {
        setTtdUrl('')
      }
    })
  }, [sekolahId])

  async function muatLaporan() {
    if (!sekolahId) return
    setLoading(true)
    const { awal, akhir } = rentangBulan(tahun, bulan)

    const { data: pegawai, error: errPegawai } = await supabase
      .from('pegawai_kantor')
      .select('id, nip, nama_lengkap, jabatan')
      .eq('sekolah_id', sekolahId)
      .eq('status', 'aktif')
      .order('nama_lengkap')

    if (errPegawai) {
      alert('Gagal memuat data pegawai: ' + errPegawai.message)
      setLoading(false)
      return
    }

    const { data: presensi, error: errPresensi } = await supabase
      .from('presensi_pegawai_kantor')
      .select('pegawai_kantor_id, tanggal, status')
      .eq('sekolah_id', sekolahId)
      .gte('tanggal', awal)
      .lte('tanggal', akhir)

    if (errPresensi) {
      alert('Gagal memuat presensi: ' + errPresensi.message)
    }

    setDaftarHadir(susunDaftarHadirKantor(pegawai || [], presensi || [], tahun, bulan))

    const { data: libur } = await supabase
      .from('hari_libur')
      .select('tanggal')
      .gte('tanggal', awal)
      .lte('tanggal', akhir)
    setHariLiburDB(new Set((libur || []).map((r) => Number(r.tanggal.slice(8, 10)))))

    setLoading(false)
  }

  useEffect(() => {
    muatLaporan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  const hariLiburManual = new Set(
    tanggalLibur.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
  )
  const isHariLibur = (tgl) =>
    apakahHariMinggu(tahun, bulan, tgl) || hariLiburDB.has(tgl) || hariLiburManual.has(tgl)

  function handleCetak() {
    window.print()
  }

  function handleExportExcel() {
    if (!daftarHadir) return
    const totalHari = daftarHadir.totalHari
    const rows = daftarHadir.baris.map((b) => {
      const row = { No: b.no, 'Nama Pegawai': b.nama, NIP: b.nip, Jabatan: b.jabatan }
      for (let t = 1; t <= totalHari; t++) row[t] = isHariLibur(t) ? '' : kodeSel(b.statusHarian[t - 1])
      row['S'] = b.sakit
      row['I'] = b.izin
      row['TK'] = b.tanpaKeterangan
      row['JML'] = b.jumlahTidakHadir
      return row
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Hadir Kantor')
    XLSX.writeFile(wb, `daftar-hadir-kantor-${tahun}-${bulan}.xlsx`)
  }

  const totalHari = daftarHadir?.totalHari || 0

  return (
    <Layout title="Daftar Hadir Kantor" subtitle="Format kertas absensi bulanan pegawai kantor">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-cetak-kantor, #area-cetak-kantor * { visibility: visible; }
          #area-cetak-kantor { position: absolute; top: 0; left: 0; width: 100%; }
          .sembunyikan-saat-cetak { display: none !important; }
          @page { size: landscape; margin: 10mm; }
        }
        .tabel-hadir-kantor { border-collapse: collapse; width: 100%; font-size: 10px; }
        .tabel-hadir-kantor th, .tabel-hadir-kantor td { border: 1px solid #333; text-align: center; padding: 2px; }
        .tabel-hadir-kantor td.nama { text-align: left; white-space: nowrap; }
        .kolom-libur-kantor {
          background: #e11d2e;
          color: #fff;
          font-weight: 600;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
        .kop-sekolah-kantor { display: flex; align-items: center; justify-content: center; gap: 12px; }
        .kop-sekolah-kantor img { width: 56px; height: 56px; object-fit: contain; flex-shrink: 0; }
        .ttd-elektronik-kantor { height: 64px; object-fit: contain; }
      `}</style>

      <div className="card p-5 mb-5 sembunyikan-saat-cetak">
        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <label className="label-field">Bulan</label>
            <select className="input-field" value={bulan} onChange={(e) => setBulan(Number(e.target.value))}>
              {NAMA_BULAN.map((nama, i) => (
                <option key={nama} value={i + 1}>{nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Tahun</label>
            <input type="number" className="input-field" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <label className="label-field">Libur mendadak tambahan (pisah koma)</label>
            <input
              type="text"
              className="input-field"
              placeholder="contoh: 16,21"
              value={tanggalLibur}
              onChange={(e) => setTanggalLibur(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={muatLaporan} disabled={loading}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            Tampilkan Laporan
          </button>
          <button className="btn-secondary" onClick={handleCetak} disabled={!daftarHadir}>
            <Printer size={16} /> Cetak / Simpan PDF
          </button>
          <button className="btn-secondary" onClick={handleExportExcel} disabled={!daftarHadir}>
            <FileSpreadsheet size={16} /> Unduh Excel
          </button>
        </div>
      </div>

      <div id="area-cetak-kantor" className="card p-6">
        {loading && <p className="text-center py-8 text-ink-700/50 text-sm">Memuat data...</p>}

        {!loading && daftarHadir && daftarHadir.baris.length === 0 && (
          <p className="text-center py-8 text-ink-700/50 text-sm">Belum ada pegawai kantor aktif.</p>
        )}

        {!loading && daftarHadir && daftarHadir.baris.length > 0 && (
          <div>
            <div className="kop-sekolah-kantor mb-3">
              {logoUrl && <img src={logoUrl} alt="Logo" />}
              <div className="text-center">
                <p className="font-semibold uppercase">{profilSekolah?.dinas_pendidikan}</p>
                <p className="uppercase">{profilSekolah?.kabupaten}</p>
                <p className="font-semibold uppercase">{profilSekolah?.nama_sekolah}</p>
                <p className="uppercase">{profilSekolah?.kecamatan}</p>
                <p className="text-xs">{profilSekolah?.alamat}</p>
              </div>
            </div>
            <p className="text-sm font-medium mb-1">DAFTAR HADIR PEGAWAI KANTOR — BULAN: {NAMA_BULAN[bulan - 1].toUpperCase()} {tahun}</p>

            <table className="tabel-hadir-kantor">
              <thead>
                <tr>
                  <th rowSpan={2}>NO</th>
                  <th rowSpan={2}>NAMA/NIP</th>
                  <th rowSpan={2}>JABATAN</th>
                  <th colSpan={totalHari}>TANGGAL</th>
                  <th colSpan={4}>TIDAK HADIR</th>
                </tr>
                <tr>
                  {Array.from({ length: totalHari }, (_, i) => i + 1).map((tgl) => (
                    <th key={tgl} className={isHariLibur(tgl) ? 'kolom-libur-kantor' : ''}>{tgl}</th>
                  ))}
                  <th>S</th>
                  <th>I</th>
                  <th>TK</th>
                  <th>JML</th>
                </tr>
              </thead>
              <tbody>
                {daftarHadir.baris.map((b) => (
                  <tr key={b.id}>
                    <td>{b.no}</td>
                    <td className="nama">{b.nama}<br /><span style={{ fontWeight: 400 }}>NIP. {b.nip}</span></td>
                    <td>{b.jabatan}</td>
                    {b.statusHarian.map((status, i) => {
                      const tgl = i + 1
                      return (
                        <td key={tgl} className={isHariLibur(tgl) ? 'kolom-libur-kantor' : ''}>
                          {isHariLibur(tgl) ? '' : kodeSel(status)}
                        </td>
                      )
                    })}
                    <td>{b.sakit || ''}</td>
                    <td>{b.izin || ''}</td>
                    <td>{b.tanpaKeterangan || ''}</td>
                    <td>{b.jumlahTidakHadir || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-8 text-sm" style={{ textAlign: 'right' }}>
              <p>{profilSekolah?.tempat_ttd || '(isi Nama Tempat di Profil Sekolah)'}, {jumlahHariDalamBulan(tahun, bulan)} {NAMA_BULAN[bulan - 1].toUpperCase()} {tahun}</p>
              <p>PIMPINAN</p>
              <div style={{ height: 64, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                {ttdUrl && <img src={ttdUrl} alt="Tanda tangan pimpinan" className="ttd-elektronik-kantor" />}
              </div>
              <p style={{ fontWeight: 600 }}>{profilSekolah?.kepala_sekolah || '________________'}</p>
              <p>NIP. {profilSekolah?.nip_kepala_sekolah || '-'}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
