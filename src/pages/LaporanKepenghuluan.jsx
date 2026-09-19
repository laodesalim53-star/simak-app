import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, FileSignature } from 'lucide-react'
import Layout from '../components/Layout'

// Ganti kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

// Ganti tujuan tombol "Kembali" sesuai menu tempat halaman ini diletakkan
const HALAMAN_KEMBALI = '/dashboard'

const PLACEHOLDER = '..............................'

// Tempat akad yang dianggap "Di KUA". Selain yang cocok dengan pola ini,
// akad dihitung "Di luar KUA". Sesuaikan kalau isian tempat akad di aplikasimu
// memakai istilah lain.
const POLA_DI_KUA = /\b(kua|balai nikah|kantor urusan agama)\b/i

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

// 'YYYY-MM' -> "September 2026"
function namaBulan(bulanISO) {
  if (!/^\d{4}-\d{2}$/.test(bulanISO || '')) return ''
  const [y, m] = bulanISO.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

// Timestamp dari database (UTC) -> 'YYYY-MM' menurut zona waktu perangkat
function bulanLokal(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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

/* ------------------------------------------------------------------ */
/*  Halaman                                                            */
/* ------------------------------------------------------------------ */

export default function LaporanKepenghuluan() {
  const { profil, sekolahId } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)

  // Data pendaftaran nikah milik kantor ini (ditarik dari tabel yang sama
  // dengan halaman Pendaftaran Nikah & Verifikasi Nikah).
  const [dataNikah, setDataNikah] = useState([])
  const [loadingNikah, setLoadingNikah] = useState(true)
  const [errorNikah, setErrorNikah] = useState('')

  // === DATA LAPORAN — DAPAT DIISI ULANG SETIAP BULAN ===
  const [bulan, setBulan] = useState(bulanIniISO())
  const [namaPenghulu, setNamaPenghulu] = useState('')
  const [nipPenghulu, setNipPenghulu] = useState('')
  const [jabatan, setJabatan] = useState('Penghulu')
  const [pangkatGolongan, setPangkatGolongan] = useState('')
  const [tanggalLaporan, setTanggalLaporan] = useState(todayISO())

  // Kegiatan yang tidak tercatat di pendaftaran nikah — diisi manual
  const [jumlahBimbingan, setJumlahBimbingan] = useState('')
  const [pesertaBimbingan, setPesertaBimbingan] = useState('')
  const [jumlahKonsultasi, setJumlahKonsultasi] = useState('')

  const [kendala, setKendala] = useState(
    'Sebagian calon pengantin terlambat melengkapi berkas persyaratan.\nLokasi akad di luar KUA cukup jauh sehingga memerlukan waktu tempuh yang lama.'
  )
  const [saran, setSaran] = useState(
    'Sosialisasi ketentuan waktu pendaftaran nikah kepada masyarakat melalui pemerintah desa/kelurahan.\nKoordinasi rutin dengan aparat desa/kelurahan dalam pemeriksaan berkas calon pengantin.'
  )

  // Profil kantor — query di-scope per kantor lewat sekolah_id, sama seperti
  // halaman laporan penyuluhan dan RKTP.
  useEffect(() => {
    if (!sekolahId) {
      setProfilKantor(null)
      return
    }
    supabase
      .from('profil_kantor')
      .select('nama_kantor, alamat, kabupaten, kecamatan, telepon, email, kepala_kua, nip_kepala_kua, tempat_ttd, logo_path, ttd_kepala_kua_path')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => setProfilKantor(data))
  }, [sekolahId])

  // Pendaftaran nikah — diambil sekali, disaring per bulan di sisi klien
  // (jumlahnya kecil dan tanggal akad tersimpan di dalam kolom JSON data_n2).
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
    // 1) Peristiwa nikah: sudah diverifikasi & tanggal akad jatuh di bulan laporan
    const peristiwa = dataNikah
      .filter((r) => r.status === 'diverifikasi')
      .filter((r) => (r.data_n2?.rencana_tanggal_akad || '').slice(0, 7) === bulan)
      .sort((a, b) => {
        const ta = `${a.data_n2?.rencana_tanggal_akad || ''} ${a.data_n2?.rencana_waktu_akad || ''}`
        const tb = `${b.data_n2?.rencana_tanggal_akad || ''} ${b.data_n2?.rencana_waktu_akad || ''}`
        return ta.localeCompare(tb)
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

  const namaEfektif = namaPenghulu || profil?.nama_lengkap || ''
  const nipEfektif = nipPenghulu || profil?.nip || ''
  const namaKantor = profilKantor?.nama_kantor || 'kantor ini'
  const periode = namaBulan(bulan)
  const tempatTtd = profilKantor?.tempat_ttd || profilKantor?.kabupaten || ''
  const tanggalLaporanFormatted = formatTanggalIndonesia(tanggalLaporan)

  const cellHead = 'border border-slate-400 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-800'
  const cell = 'border border-slate-400 px-2 py-1.5 align-top'
  const cellCenter = `${cell} text-center`

  const identitas = [
    ['Nama Penghulu', isi(namaEfektif)],
    ['NIP', isi(nipEfektif)],
    ['Jabatan', isi(jabatan)],
    ['Pangkat/Golongan', isi(pangkatGolongan)],
    ['Unit Kerja', profilKantor?.nama_kantor || PLACEHOLDER],
    ['Periode Laporan', periode || PLACEHOLDER],
  ]

  const rekapRingkas = [
    ['Pendaftaran nikah masuk', `${rekap.pendaftaranMasuk} berkas`],
    ['Berkas terverifikasi', `${rekap.diverifikasi} berkas`],
    ['Berkas ditolak / perlu perbaikan', `${rekap.ditolak} berkas`],
    ['Berkas menunggu verifikasi', `${rekap.menunggu} berkas`],
    ['Akad nikah dilaksanakan', `${rekap.peristiwa.length} peristiwa`],
    ['  • Di KUA', `${rekap.diKua} peristiwa`],
    ['  • Di luar KUA', `${rekap.luarKua} peristiwa`],
    ['Bimbingan perkawinan', jumlahBimbingan ? `${jumlahBimbingan} kegiatan${pesertaBimbingan ? `, ${pesertaBimbingan} peserta` : ''}` : PLACEHOLDER],
    ['Konsultasi/penasihatan keluarga', jumlahKonsultasi ? `${jumlahKonsultasi} layanan` : PLACEHOLDER],
  ]

  return (
    <Layout
      title="Laporan Bulanan Kepenghuluan"
      subtitle="Laporan layanan penghulu per bulan, otomatis terisi dari data pendaftaran nikah dan profil kantor."
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
            label="Nama Penghulu"
            value={namaPenghulu}
            onChange={setNamaPenghulu}
            placeholder={profil?.nama_lengkap ? `Otomatis: ${profil.nama_lengkap}` : ''}
          />
          <FieldText
            label="NIP"
            value={nipPenghulu}
            onChange={setNipPenghulu}
            placeholder={profil?.nip ? `Otomatis: ${profil.nip}` : 'Opsional'}
          />
          <FieldText label="Jabatan" value={jabatan} onChange={setJabatan} />
          <FieldText
            label="Pangkat / Golongan"
            value={pangkatGolongan}
            onChange={setPangkatGolongan}
            placeholder="Contoh: Penata Muda (III/a)"
          />
          <FieldText
            label="Jumlah Bimbingan Perkawinan (kegiatan)"
            type="number"
            min="0"
            value={jumlahBimbingan}
            onChange={setJumlahBimbingan}
          />
          <FieldText
            label="Jumlah Peserta Bimbingan (orang)"
            type="number"
            min="0"
            value={pesertaBimbingan}
            onChange={setPesertaBimbingan}
          />
          <FieldText
            label="Jumlah Konsultasi/Penasihatan Keluarga"
            type="number"
            min="0"
            value={jumlahKonsultasi}
            onChange={setJumlahKonsultasi}
          />
          <div className="hidden sm:block" />
          <FieldArea
            label="Kendala (satu baris = satu poin)"
            value={kendala}
            onChange={setKendala}
          />
          <FieldArea
            label="Saran / Tindak Lanjut (satu baris = satu poin)"
            value={saran}
            onChange={setSaran}
          />
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
            jatuh di bulan laporan. Kop surat, Kepala KUA, dan tanda tangan ditarik otomatis dari
            Profil Kantor. Bimbingan dan konsultasi diisi manual karena belum tercatat di aplikasi.
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

          {/* === JUDUL === */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <FileSignature size={20} />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-slate-900">
                Laporan Bulanan Layanan Kepenghuluan
              </h1>
              <p className="text-xs text-slate-500">Periode {periode || '-'}</p>
            </div>
          </div>

          {/* === TABEL IDENTITAS === */}
          <div className="my-5 border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {identitas.map(([label, nilai], i) => (
                  <tr key={label} className={i < identitas.length - 1 ? 'border-b border-slate-200' : ''}>
                    <td className="w-48 px-3 py-2 font-medium text-slate-600 bg-slate-50">{label}</td>
                    <td className="px-3 py-2 text-slate-800">{nilai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-slate-700">
            {/* I. PENDAHULUAN */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                I. Pendahuluan
              </h2>
              <p className="text-justify">
                Laporan ini memuat pelaksanaan layanan kepenghuluan di {namaKantor} selama bulan{' '}
                {periode || '-'}, meliputi pemeriksaan dan verifikasi berkas pendaftaran nikah,
                pelaksanaan akad nikah, bimbingan perkawinan bagi calon pengantin, serta konsultasi
                dan penasihatan keluarga. Laporan disusun sebagai bentuk pertanggungjawaban tugas
                dan bahan evaluasi pelayanan pencatatan nikah.
              </p>
            </section>

            {/* II. REKAPITULASI */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                II. Rekapitulasi Layanan
              </h2>
              <table className="lap-table w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={`${cellHead} w-10 text-center`}>No</th>
                    <th className={cellHead}>Jenis Layanan</th>
                    <th className={`${cellHead} w-56`}>Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {rekapRingkas.map(([label, nilai], i) => {
                    const subItem = label.startsWith('  •')
                    return (
                      <tr key={label}>
                        <td className={cellCenter}>{subItem ? '' : rekapRingkas.slice(0, i).filter(([l]) => !l.startsWith('  •')).length + 1}</td>
                        <td className={`${cell} ${subItem ? 'pl-6' : ''}`}>{label.replace('  • ', '')}</td>
                        <td className={cell}>{nilai}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>

            {/* III. DAFTAR PERISTIWA NIKAH */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                III. Daftar Pelaksanaan Akad Nikah
              </h2>
              <table className="lap-table w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={`${cellHead} w-8 text-center`}>No</th>
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
                      <td className={`${cell} text-center text-slate-500`} colSpan={6}>
                        Memuat data…
                      </td>
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
            </section>

            {/* IV. HASIL */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                IV. Hasil Kegiatan
              </h2>
              <p className="text-justify">
                Selama bulan {periode || '-'}, tercatat {rekap.pendaftaranMasuk} pendaftaran nikah
                yang masuk, dengan {rekap.diverifikasi} berkas terverifikasi
                {rekap.ditolak > 0 ? `, ${rekap.ditolak} berkas dikembalikan untuk diperbaiki` : ''}
                {rekap.menunggu > 0 ? `, dan ${rekap.menunggu} berkas masih menunggu verifikasi` : ''}.
                Sebanyak {rekap.peristiwa.length} akad nikah telah dilaksanakan, terdiri dari{' '}
                {rekap.diKua} akad di KUA dan {rekap.luarKua} akad di luar KUA.
                {jumlahBimbingan
                  ? ` Kegiatan bimbingan perkawinan dilaksanakan sebanyak ${jumlahBimbingan} kali${pesertaBimbingan ? ` dengan ${pesertaBimbingan} peserta` : ''}.`
                  : ''}
                {jumlahKonsultasi
                  ? ` Layanan konsultasi dan penasihatan keluarga diberikan sebanyak ${jumlahKonsultasi} kali.`
                  : ''}
              </p>
            </section>

            {/* V. KENDALA */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                V. Kendala yang Dihadapi
              </h2>
              {barisTeks(kendala).length > 0 ? (
                <ol className="list-decimal pl-5 space-y-1">
                  {barisTeks(kendala).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              ) : (
                <p>Tidak ada kendala berarti.</p>
              )}
            </section>

            {/* VI. SARAN */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                VI. Saran dan Tindak Lanjut
              </h2>
              {barisTeks(saran).length > 0 ? (
                <ol className="list-decimal pl-5 space-y-1">
                  {barisTeks(saran).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              ) : (
                <p>-</p>
              )}
            </section>

            {/* VII. PENUTUP */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                VII. Penutup
              </h2>
              <p className="text-justify">
                Demikian laporan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana
                mestinya.
              </p>
            </section>
          </div>

          {/* === TANDA TANGAN OTOMATIS === */}
          <div className="ttd-block flex justify-between mt-10 text-sm text-slate-700">
            <div className="text-center w-56">
              <p>Mengetahui,</p>
              <p>Kepala KUA Kecamatan {profilKantor?.kecamatan || '................'}</p>
              <div className="h-20 flex items-end justify-center">
                {ttdKepalaKuaUrl && (
                  <img
                    src={ttdKepalaKuaUrl}
                    alt="Tanda Tangan Kepala KUA"
                    className="max-h-20 object-contain"
                  />
                )}
              </div>
              <p className="font-semibold border-t border-slate-400 pt-1">
                ({profilKantor?.kepala_kua || PLACEHOLDER})
              </p>
              <p className="text-xs text-slate-500">
                NIP. {profilKantor?.nip_kepala_kua || PLACEHOLDER}
              </p>
            </div>
            <div className="text-center w-56">
              <p>
                {tempatTtd && tanggalLaporanFormatted
                  ? `${tempatTtd}, ${tanggalLaporanFormatted}`
                  : '\u00A0'}
              </p>
              <p>{jabatan || 'Penghulu'}</p>
              <div className="h-20" />
              <p className="font-semibold border-t border-slate-400 pt-1">
                ({namaEfektif || PLACEHOLDER})
              </p>
              <p className="text-xs text-slate-500">NIP. {nipEfektif || PLACEHOLDER}</p>
            </div>
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
