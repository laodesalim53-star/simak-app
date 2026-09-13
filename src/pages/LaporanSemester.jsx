import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, AlertTriangle, Save, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Halaman cetak "LAPORAN SEMESTER", dibuat dari format
// LAPORAN_BULANAN_-_Copy.docx. Isi dokumen aslinya ada 4 bagian:
//   1) Identitas sekolah (semester, NSS/NPSN, nama sekolah, status,
//      alamat, tahun berdiri, badan/yayasan pendiri, tanah, gedung)
//      — dokumen aslinya menulis "ADA DI PROFILE SEKOLAH", jadi bagian
//      ini diambil otomatis dari tabel profil_sekolah (SAMA seperti
//      KopSurat di LaporanKeadaanMurid.jsx / LaporanNominatifGuru.jsx).
//   2) Tabel Jumlah Jam per Mata Pelajaran per Kelas/Minggu
//   3) Tabel Data Jumlah & Keadaan Gedung/Ruang Sekolah
//   4) Tabel Data Keadaan Buku-buku KTSP & K-13
//
// TAMBAHAN: Tabel 2-4 dulunya cuma state lokal (hilang kalau halaman
// direfresh). Sekarang ada tombol "Simpan Data" yang menyimpan Semester,
// Tahun Pelajaran, dan ketiga tabel itu ke tabel `laporan_semester_data`
// di Supabase (satu baris per kombinasi sekolah + semester + tahun
// pelajaran, lewat upsert). Saat semester/tahun pelajaran diisi/diubah,
// data yang sudah pernah disimpan untuk kombinasi itu otomatis dimuat
// kembali ke layar.
//
// PENTING — sesuaikan nama kolom di bawah:
// Nama kolom profil_sekolah untuk NSS/NPSN, status sekolah, tahun
// berdiri, badan/yayasan pendiri, data tanah, dan status gedung BELUM
// dikonfirmasi skemanya (tidak terlihat di LaporanKeadaanMurid.jsx).
// Field-field itu diberi nama tebakan di bawah (lihat komentar
// "SESUAIKAN") — kalau nama kolom di tabel profil_sekolah Anda berbeda,
// tinggal ganti di satu tempat ini saja.
export default function LaporanSemester() {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()

  const [profilSekolah, setProfilSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMuat, setErrorMuat] = useState('')

  // --- identitas laporan (tidak ada di profil_sekolah, diisi manual) ---
  const [semester, setSemester] = useState('Ganjil') // 'Ganjil' | 'Genap'
  const [tahunPelajaran, setTahunPelajaran] = useState('')

  // TAMBAHAN: status simpan/muat data laporan (tabel jam/gedung/buku)
  const [saving, setSaving] = useState(false)
  const [tersimpan, setTersimpan] = useState(false)
  const [errorSimpan, setErrorSimpan] = useState('')
  const [memuatData, setMemuatData] = useState(false)

  useEffect(() => {
    async function muat() {
      setLoading(true)
      setErrorMuat('')
      if (!sekolahId) {
        setLoading(false)
        return
      }

      const { data: sekolah, error: sekolahError } = await supabase
        .from('profil_sekolah')
        .select('*')
        .eq('sekolah_id', sekolahId)
        .maybeSingle()

      if (sekolahError) {
        console.error('Gagal memuat profil sekolah:', sekolahError)
        setErrorMuat(
          `Gagal memuat profil sekolah dari database, sehingga identitas sekolah di laporan ini bisa kosong. ` +
          `Coba muat ulang halaman; kalau masih gagal, periksa console browser (F12). Detail: ${sekolahError.message || ''}`
        )
      }

      setProfilSekolah(sekolah || null)
      if (sekolah?.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(sekolah.logo_path)
        setLogoUrl(pub?.publicUrl || '')
      } else {
        setLogoUrl('')
      }

      setLoading(false)
    }
    muat()
  }, [sekolahId])

  // ---------- Tabel 1: Jumlah Jam per Mata Pelajaran per Kelas/Minggu ----------
  const KELAS_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI']
  const MATA_PELAJARAN = [
    'PPKn',
    'Pend. Agama',
    'Bhs. Indonesia',
    'IPA',
    'IPS',
    'Matematika',
    'SBK',
    'Mulok',
    'PJOK',
    'Pengembangan Diri',
  ]
  function jamPelajaranKosong() {
    const awal = {}
    MATA_PELAJARAN.forEach((mp) => {
      awal[mp] = {}
      KELAS_ROMAWI.forEach((k) => { awal[mp][k] = '' })
    })
    return awal
  }
  const [jamPelajaran, setJamPelajaran] = useState(jamPelajaranKosong)

  // ---------- Tabel 2: Data Jumlah & Keadaan Gedung/Ruang Sekolah ----------
  const RUANG_KOLOM = ['Milik', 'Bukan Milik', 'Baik', 'Rusak Berat', 'Rusak Sedang', 'Rusak Ringan']
  const DAFTAR_RUANG = [
    'Ruang Belajar',
    'Ruang Laboratorium',
    'Ruang Serbaguna',
    'Ruang Perpustakaan',
    'Ruang Kepala Sekolah',
    'Ruang Guru',
    'Ruang Tata Usaha',
    'Ruang Olahraga',
    'Ruang Keterampilan',
    'Ruang UKS',
    'Ruang Pentas',
    'Gudang',
    'Toilet',
    'Rumah Dinas Kepala Sekolah',
    'Rumah Dinas Guru',
    'Lain-lain',
  ]
  function dataGedungKosong() {
    const awal = {}
    DAFTAR_RUANG.forEach((r) => {
      awal[r] = { keterangan: '' }
      RUANG_KOLOM.forEach((k) => { awal[r][k] = '' })
    })
    return awal
  }
  const [dataGedung, setDataGedung] = useState(dataGedungKosong)

  // ---------- Tabel 3: Data Keadaan Buku-buku K13 & Kumer ----------
  // TAMBAHAN: kolom "Jumlah" tunggal diganti jadi dua kolom terpisah
  // (Tematik untuk buku Kurikulum 2013, Kumer untuk buku Kurikulum
  // Merdeka) supaya jumlah buku per kurikulum tercatat rapi di kolom,
  // tidak lagi ditulis manual di kolom Keterangan.
  const BUKU_KOLOM = ['Tematik', 'Kumer', 'Baik', 'Rusak Berat', 'Rusak Ringan']
  const DAFTAR_BUKU = [
    'PPKn',
    'Pendidikan Agama',
    'Bhs. Indonesia',
    'IPA',
    'IPS',
    'Bhs. Inggris',
    'Matematika',
    'SBK',
    'Mulok',
    'Penjaskes',
  ]
  function dataBukuKosong() {
    const awal = {}
    DAFTAR_BUKU.forEach((b) => {
      awal[b] = { keterangan: '' }
      BUKU_KOLOM.forEach((k) => { awal[b][k] = '' })
    })
    return awal
  }
  const [dataBuku, setDataBuku] = useState(dataBukuKosong)

  // Updater generik untuk ketiga tabel (baris -> kolom -> nilai)
  function buatUpdater(setter) {
    return function updateSel(baris, kolom, nilai) {
      setTersimpan(false)
      setter((prev) => ({ ...prev, [baris]: { ...prev[baris], [kolom]: nilai } }))
    }
  }
  const updateJam = buatUpdater(setJamPelajaran)
  const updateGedung = buatUpdater(setDataGedung)
  const updateBuku = buatUpdater(setDataBuku)

  // TAMBAHAN: gabungkan data tersimpan dengan struktur baris/kolom saat ini,
  // supaya kalau daftar mata pelajaran/ruang/buku berubah di kemudian hari,
  // baris baru tetap muncul kosong (tidak hilang / error) dan baris yang
  // sudah dihapus dari daftar tidak ikut terbawa.
  function gabungkanData(kosong, tersimpanDb) {
    if (!tersimpanDb) return kosong
    const hasil = { ...kosong }
    Object.keys(hasil).forEach((baris) => {
      if (tersimpanDb[baris]) {
        hasil[baris] = { ...hasil[baris], ...tersimpanDb[baris] }
      }
    })
    return hasil
  }

  // TAMBAHAN: muat data tersimpan untuk kombinasi sekolah + semester +
  // tahun pelajaran saat ini. Dipanggil otomatis saat semester/tahun
  // pelajaran berubah (lewat useEffect di bawah).
  async function muatDataTersimpan(semesterAktif, tahunAktif) {
    if (!sekolahId || !tahunAktif.trim()) return

    setMemuatData(true)
    setErrorSimpan('')
    const { data: baris, error } = await supabase
      .from('laporan_semester_data')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .eq('semester', semesterAktif)
      .eq('tahun_pelajaran', tahunAktif.trim())
      .maybeSingle()

    if (error) {
      console.error('Gagal memuat data laporan semester:', error)
      setErrorSimpan('Gagal memuat data tersimpan: ' + error.message)
      setMemuatData(false)
      return
    }

    if (baris) {
      setJamPelajaran(gabungkanData(jamPelajaranKosong(), baris.jam_pelajaran))
      setDataGedung(gabungkanData(dataGedungKosong(), baris.data_gedung))
      setDataBuku(gabungkanData(dataBukuKosong(), baris.data_buku))
      setTersimpan(true)
    } else {
      // Belum pernah disimpan untuk kombinasi ini -> tabel dikosongkan
      // supaya tidak tertukar dengan data semester/tahun pelajaran lain.
      setJamPelajaran(jamPelajaranKosong())
      setDataGedung(dataGedungKosong())
      setDataBuku(dataBukuKosong())
      setTersimpan(false)
    }
    setMemuatData(false)
  }

  // TAMBAHAN: auto-muat saat semester berubah atau saat tahun pelajaran
  // selesai diketik (onBlur), bukan setiap ketikan, supaya tidak query
  // berkali-kali per huruf.
  useEffect(() => {
    if (sekolahId) muatDataTersimpan(semester, tahunPelajaran)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, semester])

  // TAMBAHAN: simpan ketiga tabel ke Supabase
  async function handleSimpan() {
    if (!sekolahId) {
      alert('Sekolah aktif belum dipilih.')
      return
    }
    if (!tahunPelajaran.trim()) {
      alert('Isi Tahun Pelajaran terlebih dahulu sebelum menyimpan.')
      return
    }

    setSaving(true)
    setErrorSimpan('')
    const payload = {
      sekolah_id: sekolahId,
      semester,
      tahun_pelajaran: tahunPelajaran.trim(),
      jam_pelajaran: jamPelajaran,
      data_gedung: dataGedung,
      data_buku: dataBuku,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('laporan_semester_data')
      .upsert(payload, { onConflict: 'sekolah_id,semester,tahun_pelajaran' })

    setSaving(false)
    if (error) {
      console.error('Gagal menyimpan data laporan semester:', error)
      setErrorSimpan('Gagal menyimpan: ' + error.message)
      alert('Gagal menyimpan: ' + error.message)
    } else {
      setTersimpan(true)
      setTimeout(() => setTersimpan(false), 3000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

  // Sama seperti LaporanKeadaanMurid.jsx / LaporanNominatifGuru.jsx
  const KopSurat = () => (
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
  )

  const TandaTangan = () => (
    <div className="flex justify-end mt-10">
      <div className="text-center text-xs w-64">
        <p>
          {profilSekolah?.tempat_ttd || profilSekolah?.kecamatan || '............'},{' '}
          {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
        <p className="mt-1">Kepala Sekolah</p>
        <div className="h-16" />
        <p className="font-semibold underline">{profilSekolah?.kepala_sekolah || '............................'}</p>
        <p>NIP. {profilSekolah?.nip_kepala_sekolah || '............................'}</p>
      </div>
    </div>
  )

  // Baris "Label : nilai" dengan input untuk layar dan span untuk cetak,
  // dipakai untuk identitas yang bukan dari profil_sekolah (semester) dan
  // untuk field profil_sekolah yang nama kolomnya belum pasti (SESUAIKAN).
  const BarisIdentitas = ({ label, value, onChange, onBlur, editable = true }) => (
    <p className="flex text-xs mb-1">
      <span className="w-52 shrink-0">{label}</span>
      <span className="w-4 shrink-0">:</span>
      {editable ? (
        <>
          <input
            type="text"
            className="no-print border-b border-dotted border-slate-400 outline-none flex-1 text-xs"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
          <span className="only-print">{value}</span>
        </>
      ) : (
        <span>{value}</span>
      )}
    </p>
  )

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar — hilang saat dicetak */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <div className="flex items-center gap-2">
            {/* TAMBAHAN: tombol Simpan Data */}
            <button
              onClick={handleSimpan}
              disabled={saving || memuatData}
              className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : tersimpan ? (
                <CheckCircle2 size={16} />
              ) : (
                <Save size={16} />
              )}
              {tersimpan ? 'Tersimpan' : 'Simpan Data'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Printer size={16} /> Cetak Laporan
            </button>
          </div>
        </div>
        <p className="no-print text-center text-[11px] text-slate-400 mt-2">
          Isi semester, tahun pelajaran, dan ketiga tabel di bawah, lalu klik "Simpan Data" sebelum mencetak.
          {memuatData && ' Memuat data tersimpan...'}
        </p>

        {errorMuat && (
          <div className="no-print mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{errorMuat}</span>
          </div>
        )}
        {errorSimpan && (
          <div className="no-print mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{errorSimpan}</span>
          </div>
        )}
      </div>

      {/* CATATAN: class "print-only" dipertahankan (dibutuhkan supaya
          elemen ini TETAP terlihat saat print, karena aturan global di
          index.css: body* disembunyikan saat print KECUALI .print-only).
          Override untuk kasus khusus halaman ini ada di <style> di bawah
          (selector .lembar-cetak.print-only, lebih spesifik dari .print-only
          saja) supaya tidak ikut disembunyikan di LAYAR oleh aturan global
          `@media screen { .print-only { display: none } }` — aturan itu
          didesain untuk PrintTemplate terpisah (Kuitansi/Nota) yang memang
          tidak pernah tampil di layar, beda kebutuhan dengan halaman ini. */}
      <div className="lembar-cetak print-only bg-white mx-auto my-6 p-8 shadow-sm" style={{ width: '210mm' }}>
        <KopSurat />

        <h1 className="text-center font-bold text-base uppercase mb-4">Laporan Semester</h1>

        <div className="grid grid-cols-2 gap-x-8 mb-6 max-w-3xl mx-auto">
          <div>
            <BarisIdentitas label="Semester" value={semester} onChange={setSemester} editable={false} />
            {/* Dropdown terpisah supaya bisa dipilih di layar; hasilnya tetap ikut baris di atas saat cetak */}
            <div className="no-print -mt-1 mb-2">
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="text-xs border border-slate-300 rounded px-2 py-1"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
            <BarisIdentitas
              label="Tahun Pelajaran"
              value={tahunPelajaran}
              onChange={setTahunPelajaran}
              onBlur={() => muatDataTersimpan(semester, tahunPelajaran)}
            />
            {/* SESUAIKAN: ganti profilSekolah?.nss / npsn kalau nama kolomnya berbeda */}
            <BarisIdentitas
              label="NSS / NPSN"
              value={profilSekolah?.nss || profilSekolah?.npsn || ''}
              onChange={() => {}}
              editable={false}
            />
            <BarisIdentitas label="Nama Sekolah" value={profilSekolah?.nama_sekolah || ''} onChange={() => {}} editable={false} />
            {/* SESUAIKAN: ganti profilSekolah?.status_sekolah kalau berbeda */}
            <BarisIdentitas label="Status" value={profilSekolah?.status_sekolah || ''} onChange={() => {}} editable={false} />
          </div>
          <div>
            <BarisIdentitas
              label="Alamat"
              value={[profilSekolah?.alamat, profilSekolah?.kecamatan].filter(Boolean).join(', ')}
              onChange={() => {}}
              editable={false}
            />
            {/* SESUAIKAN: nama kolom tahun berdiri & badan/yayasan pendiri */}
            <BarisIdentitas label="Didirikan Tahun" value={profilSekolah?.tahun_berdiri || ''} onChange={() => {}} editable={false} />
            <BarisIdentitas label="Badan / Yayasan Pendiri" value={profilSekolah?.yayasan || ''} onChange={() => {}} editable={false} />
            {/* SESUAIKAN: nama kolom status gedung */}
            <BarisIdentitas label="Gedung" value={profilSekolah?.status_gedung || 'Permanen'} onChange={() => {}} editable={false} />
          </div>
        </div>

        {/* ===== TABEL 1: JUMLAH JAM PER MATA PELAJARAN PER KELAS/MINGGU ===== */}
        <h2 className="text-center font-bold text-sm uppercase mb-3">
          Daftar Jumlah Jam per Mata Pelajaran per Kelas/Minggu
        </h2>
        <table className="w-full text-[10px] border-collapse border border-black mb-8">
          <thead>
            <tr className="text-center">
              <th rowSpan={2} className="border border-black px-1 py-1 w-8">No.</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Mata Pelajaran</th>
              <th colSpan={KELAS_ROMAWI.length} className="border border-black px-1 py-1">
                Jam Pelajaran per Kelas / Minggu
              </th>
            </tr>
            <tr className="text-center">
              {KELAS_ROMAWI.map((k) => (
                <th key={k} className="border border-black px-1 py-1 w-10">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATA_PELAJARAN.map((mp, i) => (
              <tr key={mp}>
                <td className="border border-black px-1 py-1 text-center">{i + 1}.</td>
                <td className="border border-black px-1 py-1">{mp}</td>
                {KELAS_ROMAWI.map((k) => (
                  <td key={k} className="border border-black px-1 py-1 text-center">
                    <input
                      type="text"
                      className="sel-cetak no-print"
                      value={jamPelajaran[mp][k]}
                      onChange={(e) => updateJam(mp, k, e.target.value)}
                    />
                    <span className="only-print">{jamPelajaran[mp][k]}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* ===== TABEL 2: DATA JUMLAH & KEADAAN GEDUNG/RUANG SEKOLAH ===== */}
        <h2 className="text-center font-bold text-sm uppercase mb-3 page-break-before-print">
          Data Jumlah dan Keadaan Gedung / Ruang Sekolah
        </h2>
        <table className="w-full text-[10px] border-collapse border border-black mb-8">
          <thead>
            <tr className="text-center">
              <th rowSpan={2} className="border border-black px-1 py-1">Keterangan Gedung / Ruang</th>
              <th colSpan={2} className="border border-black px-1 py-1">Jumlah</th>
              <th colSpan={4} className="border border-black px-1 py-1">Keadaan</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Keterangan</th>
            </tr>
            <tr className="text-center">
              <th className="border border-black px-1 py-1 w-14">Milik</th>
              <th className="border border-black px-1 py-1 w-16">Bukan Milik</th>
              <th className="border border-black px-1 py-1 w-14">Baik</th>
              <th className="border border-black px-1 py-1 w-16">Rusak Berat</th>
              <th className="border border-black px-1 py-1 w-16">Rusak Sedang</th>
              <th className="border border-black px-1 py-1 w-16">Rusak Ringan</th>
            </tr>
          </thead>
          <tbody>
            {DAFTAR_RUANG.map((ruang) => (
              <tr key={ruang}>
                <td className="border border-black px-1 py-1">{ruang}</td>
                {RUANG_KOLOM.map((kolom) => (
                  <td key={kolom} className="border border-black px-1 py-1 text-center">
                    <input
                      type="text"
                      className="sel-cetak no-print"
                      value={dataGedung[ruang][kolom]}
                      onChange={(e) => updateGedung(ruang, kolom, e.target.value)}
                    />
                    <span className="only-print">{dataGedung[ruang][kolom]}</span>
                  </td>
                ))}
                <td className="border border-black px-1 py-1 text-center">
                  <input
                    type="text"
                    className="sel-cetak no-print"
                    value={dataGedung[ruang].keterangan}
                    onChange={(e) => updateGedung(ruang, 'keterangan', e.target.value)}
                  />
                  <span className="only-print">{dataGedung[ruang].keterangan}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ===== TABEL 3: DATA KEADAAN BUKU-BUKU KTSP & K-13 ===== */}
        <h2 className="text-center font-bold text-sm uppercase mb-3 page-break-before-print">
          Data Keadaan Buku-buku K13 dan Kumer
        </h2>
        <table className="w-full text-[10px] border-collapse border border-black">
          <thead>
            <tr className="text-center">
              <th rowSpan={2} className="border border-black px-1 py-1 w-8">No.</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Buku Mata Pelajaran</th>
              <th colSpan={2} className="border border-black px-1 py-1">Jumlah</th>
              <th colSpan={3} className="border border-black px-1 py-1">Keadaan</th>
              <th rowSpan={2} className="border border-black px-1 py-1">Keterangan</th>
            </tr>
            <tr className="text-center">
              <th className="border border-black px-1 py-1 w-12">Tematik</th>
              <th className="border border-black px-1 py-1 w-12">Kumer</th>
              <th className="border border-black px-1 py-1 w-14">Baik</th>
              <th className="border border-black px-1 py-1 w-16">Rusak Berat</th>
              <th className="border border-black px-1 py-1 w-16">Rusak Ringan</th>
            </tr>
          </thead>
          <tbody>
            {DAFTAR_BUKU.map((buku, i) => (
              <tr key={buku}>
                <td className="border border-black px-1 py-1 text-center">{i + 1}.</td>
                <td className="border border-black px-1 py-1">{buku}</td>
                {BUKU_KOLOM.map((kolom) => (
                  <td key={kolom} className="border border-black px-1 py-1 text-center">
                    <input
                      type="text"
                      className="sel-cetak no-print"
                      value={dataBuku[buku][kolom]}
                      onChange={(e) => updateBuku(buku, kolom, e.target.value)}
                    />
                    <span className="only-print">{dataBuku[buku][kolom]}</span>
                  </td>
                ))}
                <td className="border border-black px-1 py-1 text-center">
                  <input
                    type="text"
                    className="sel-cetak no-print"
                    value={dataBuku[buku].keterangan}
                    onChange={(e) => updateBuku(buku, 'keterangan', e.target.value)}
                  />
                  <span className="only-print">{dataBuku[buku].keterangan}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[10px] mt-2">*) Coret yang tidak perlu</p>

        <TandaTangan />
      </div>

      <style>{`
        .sel-cetak {
          width: 100%;
          border: none;
          border-bottom: 1px dotted #94a3b8;
          text-align: center;
          font-size: 10px;
          background: transparent;
          outline: none;
        }
        .sel-cetak:focus {
          border-bottom: 1px solid #2563eb;
        }
        .only-print { display: none; }

        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .only-print { display: inline !important; }
          .page-break-before-print { break-before: page; page-break-before: always; }

          /* Override posisi "fixed" bawaan .print-only (dari index.css)
             supaya laporan yang lebih dari satu halaman (page-break di
             atas) mengalir normal per halaman A4, bukan menumpuk di satu
             titik fixed. Sama seperti pola Cetak8355.jsx. */
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
           (index.css) — di halaman ini kertas laporan MEMANG harus tampil di
           layar supaya bisa diisi manual, bukan template tersembunyi seperti
           Kuitansi/Nota. Selector 2-class ini lebih spesifik daripada
           ".print-only" saja, jadi menang tanpa perlu ubah index.css. */
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
