import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, AlertTriangle, Save, CheckCircle2, Building2, Library, Info } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Halaman cetak "LAPORAN SEMESTER", dibuat dari format
// LAPORAN_BULANAN_-_Copy.docx. Isi dokumen aslinya ada 4 bagian:
//   1) Identitas sekolah — otomatis dari tabel profil_sekolah.
//   2) Tabel Jumlah Jam per Mata Pelajaran per Kelas/Minggu (manual)
//   3) Tabel Data Jumlah & Keadaan Gedung/Ruang Sekolah
//      -> OTOMATIS dari halaman "Kondisi Bangunan" (tabel `bangunan`)
//   4) Tabel Data Keadaan Buku-buku K13 & Kumer
//      -> OTOMATIS dari halaman "Perpustakaan" (tabel `buku`)
//
// Penyimpanan: tombol "Simpan Data" menyimpan semester, tahun pelajaran, dan
// ketiga tabel ke `laporan_semester_data` (satu baris per sekolah + semester
// + tahun pelajaran). Laporan adalah SNAPSHOT: data yang sudah disimpan tidak
// berubah sendiri kalau Bangunan/Perpustakaan diubah. Untuk memperbarui,
// klik tombol "Tarik dari Bangunan" / "Tarik dari Perpustakaan".
//
// Aturan pengisian otomatis:
//   - Laporan BARU (belum pernah disimpan untuk semester + tahun itu):
//     Gedung dan Buku langsung terisi dari sumbernya.
//   - Laporan SUDAH tersimpan: dimuat apa adanya, tidak ditimpa.
//   - Kolom "Rusak Sedang" (Gedung), "Keterangan", dan Tabel 1 tetap manual.
//
// Butuh: buku_laporan_semester.sql (kolom mapel, kurikulum, jumlah_rusak_*
// pada tabel buku) dan Perpustakaan.jsx yang sudah diperbarui.

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

// ---------- Tabel 2: Data Jumlah & Keadaan Gedung/Ruang Sekolah ----------
const RUANG_KOLOM = ['Milik', 'Bukan Milik', 'Baik', 'Rusak Berat', 'Rusak Sedang', 'Rusak Ringan']
// Kolom yang diisi otomatis dari tabel bangunan ("Rusak Sedang" tidak ada di
// halaman Kondisi Bangunan, jadi tetap manual).
const KOLOM_GEDUNG_SINKRON = ['Milik', 'Bukan Milik', 'Baik', 'Rusak Berat', 'Rusak Ringan']
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

// Pemetaan "Jenis"/"Nama" di halaman Kondisi Bangunan -> baris laporan.
// Urutan penting: aturan paling atas dicek lebih dulu (mis. "WC Guru" harus
// jadi Toilet, bukan Ruang Guru). Yang tidak cocok masuk "Lain-lain".
const POLA_RUANG = [
  [/rumah dinas.*kepala|kepala.*rumah dinas/i, 'Rumah Dinas Kepala Sekolah'],
  [/rumah dinas.*guru|guru.*rumah dinas/i, 'Rumah Dinas Guru'],
  [/rumah dinas/i, 'Lain-lain'],
  [/toilet|\bwc\b|kamar mandi/i, 'Toilet'],
  [/gudang/i, 'Gudang'],
  [/kepala/i, 'Ruang Kepala Sekolah'],
  [/tata usaha|\btu\b/i, 'Ruang Tata Usaha'],
  [/guru/i, 'Ruang Guru'],
  [/kelas|belajar/i, 'Ruang Belajar'],
  [/laborat/i, 'Ruang Laboratorium'],
  [/serbaguna|serba guna|aula/i, 'Ruang Serbaguna'],
  [/perpustakaan/i, 'Ruang Perpustakaan'],
  [/olahraga/i, 'Ruang Olahraga'],
  [/keterampilan/i, 'Ruang Keterampilan'],
  [/\buks\b|kesehatan/i, 'Ruang UKS'],
  [/pentas/i, 'Ruang Pentas'],
]
function ruangDariBangunan(row) {
  const teks = `${row.jenis || ''} ${row.nama || ''}`
  for (const [pola, ruang] of POLA_RUANG) {
    if (pola.test(teks)) return ruang
  }
  return 'Lain-lain'
}

const teksAngka = (n) => (n > 0 ? String(n) : '')

// Hitung dari baris tabel `bangunan`, lalu timpa kolom sinkron pada `dasar`.
// "Milik" = Milik sendiri, Hibah, atau status belum diisi.
// "Bukan Milik" = Pinjam pakai dan Sewa.
function terapkanGedung(dasar, rows) {
  const total = {}
  DAFTAR_RUANG.forEach((r) => {
    total[r] = { Milik: 0, 'Bukan Milik': 0, Baik: 0, 'Rusak Berat': 0, 'Rusak Ringan': 0 }
  })
  rows.forEach((row) => {
    const t = total[ruangDariBangunan(row)]
    const n = Number(row.jumlah) || 0
    const milik = !row.status_kepemilikan || ['Milik sendiri', 'Hibah'].includes(row.status_kepemilikan)
    t[milik ? 'Milik' : 'Bukan Milik'] += n
    if (row.kondisi === 'baik') t.Baik += n
    else if (row.kondisi === 'rusak_berat') t['Rusak Berat'] += n
    else if (row.kondisi === 'rusak_ringan') t['Rusak Ringan'] += n
  })
  const hasil = {}
  DAFTAR_RUANG.forEach((r) => {
    hasil[r] = { ...dasar[r] }
    KOLOM_GEDUNG_SINKRON.forEach((k) => { hasil[r][k] = teksAngka(total[r][k]) })
  })
  return hasil
}

// ---------- Tabel 3: Data Keadaan Buku-buku K13 & Kumer ----------
// "Tematik" = buku Kurikulum 2013, "Kumer" = buku Kurikulum Merdeka.
const BUKU_KOLOM = ['Tematik', 'Kumer', 'Baik', 'Rusak Berat', 'Rusak Ringan']
// Daftar ini HARUS sama dengan MAPEL_BUKU di Perpustakaan.jsx.
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

// Hitung dari baris tabel `buku`. Hanya buku yang sudah diisi mata pelajaran
// DAN kurikulumnya yang dihitung; sisanya dilaporkan lewat `tidakDihitung`.
function terapkanBuku(dasar, rows) {
  const total = {}
  DAFTAR_BUKU.forEach((b) => {
    total[b] = { Tematik: 0, Kumer: 0, Baik: 0, 'Rusak Berat': 0, 'Rusak Ringan': 0 }
  })
  let tidakDihitung = 0
  rows.forEach((r) => {
    const t = total[r.mapel]
    if (!t || !['tematik', 'kumer'].includes(r.kurikulum)) {
      tidakDihitung += 1
      return
    }
    const jumlah = Number(r.jumlah_total) || 0
    const rb = Number(r.jumlah_rusak_berat) || 0
    const rr = Number(r.jumlah_rusak_ringan) || 0
    t[r.kurikulum === 'tematik' ? 'Tematik' : 'Kumer'] += jumlah
    t['Rusak Berat'] += rb
    t['Rusak Ringan'] += rr
    t.Baik += Math.max(jumlah - rb - rr, 0)
  })
  const hasil = {}
  DAFTAR_BUKU.forEach((b) => {
    hasil[b] = { ...dasar[b] }
    BUKU_KOLOM.forEach((k) => { hasil[b][k] = teksAngka(total[b][k]) })
  })
  return { data: hasil, tidakDihitung }
}

// Gabungkan data tersimpan dengan struktur baris/kolom saat ini, supaya kalau
// daftar mata pelajaran/ruang/buku berubah, baris baru tetap muncul kosong
// dan baris yang sudah dihapus dari daftar tidak ikut terbawa.
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

  // status simpan/muat data laporan
  const [saving, setSaving] = useState(false)
  const [tersimpan, setTersimpan] = useState(false)
  const [errorSimpan, setErrorSimpan] = useState('')
  const [memuatData, setMemuatData] = useState(false)
  // pesan hasil pengisian otomatis dari Bangunan/Perpustakaan
  const [infoSinkron, setInfoSinkron] = useState('')

  const [jamPelajaran, setJamPelajaran] = useState(jamPelajaranKosong)
  const [dataGedung, setDataGedung] = useState(dataGedungKosong)
  const [dataBuku, setDataBuku] = useState(dataBukuKosong)

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

  // ---------- Pengambilan data sumber ----------
  async function ambilBangunan() {
    const { data, error } = await supabase.from('bangunan').select('*').eq('sekolah_id', sekolahId)
    if (error) {
      console.error('Gagal mengambil data bangunan:', error)
      setErrorSimpan('Gagal mengambil data Kondisi Bangunan: ' + error.message)
      return null
    }
    return data || []
  }

  async function ambilBuku() {
    const { data, error } = await supabase
      .from('buku')
      .select('mapel, kurikulum, jumlah_total, jumlah_rusak_berat, jumlah_rusak_ringan')
    if (error) {
      console.error('Gagal mengambil data buku:', error)
      setErrorSimpan(
        'Gagal mengambil data Perpustakaan: ' + error.message +
        ' (pastikan buku_laporan_semester.sql sudah dijalankan).'
      )
      return null
    }
    return data || []
  }

  function infoGedung(rows) {
    return rows.length === 0
      ? 'Data Kondisi Bangunan masih kosong, tabel Gedung tidak terisi.'
      : `Tabel Gedung terisi dari ${rows.length} data Kondisi Bangunan. "Rusak Sedang" dan "Keterangan" tetap diisi manual.`
  }
  function infoBuku(rows, tidakDihitung) {
    if (rows.length === 0) return 'Data Perpustakaan masih kosong, tabel Buku tidak terisi.'
    const hitung = rows.length - tidakDihitung
    return (
      `Tabel Buku terisi dari ${hitung} judul Perpustakaan.` +
      (tidakDihitung > 0
        ? ` ${tidakDihitung} judul tidak dihitung karena mata pelajaran/kurikulumnya belum diisi (wajar untuk buku non-pelajaran).`
        : '')
    )
  }

  // Siapkan isi laporan BARU: Tabel 1 kosong, Tabel 2 dan 3 dari sumbernya.
  async function siapkanLaporanBaru() {
    const [rb, rk] = await Promise.all([ambilBangunan(), ambilBuku()])
    const pesan = []
    let gedung = dataGedungKosong()
    let buku = dataBukuKosong()
    if (rb) {
      gedung = terapkanGedung(gedung, rb)
      pesan.push(infoGedung(rb))
    }
    if (rk) {
      const hasil = terapkanBuku(buku, rk)
      buku = hasil.data
      pesan.push(infoBuku(rk, hasil.tidakDihitung))
    }
    setJamPelajaran(jamPelajaranKosong())
    setDataGedung(gedung)
    setDataBuku(buku)
    setInfoSinkron(pesan.join(' '))
    setTersimpan(false)
  }

  // Tombol manual: perbarui Tabel 2 dari Kondisi Bangunan
  async function tarikDariBangunan() {
    if (!window.confirm('Isi ulang Tabel Gedung dari data Kondisi Bangunan? Angka di kolom Milik, Bukan Milik, Baik, Rusak Berat, dan Rusak Ringan akan diganti. "Rusak Sedang" dan "Keterangan" tidak berubah.')) return
    setMemuatData(true)
    setErrorSimpan('')
    const rows = await ambilBangunan()
    if (rows) {
      setDataGedung((prev) => terapkanGedung(prev, rows))
      setInfoSinkron(infoGedung(rows))
      setTersimpan(false)
    }
    setMemuatData(false)
  }

  // Tombol manual: perbarui Tabel 3 dari Perpustakaan
  async function tarikDariPerpustakaan() {
    if (!window.confirm('Isi ulang Tabel Buku dari data Perpustakaan? Angka di kolom Tematik, Kumer, Baik, Rusak Berat, dan Rusak Ringan akan diganti. "Keterangan" tidak berubah.')) return
    setMemuatData(true)
    setErrorSimpan('')
    const rows = await ambilBuku()
    if (rows) {
      const hasil = terapkanBuku(dataBuku, rows)
      setDataBuku(hasil.data)
      setInfoSinkron(infoBuku(rows, hasil.tidakDihitung))
      setTersimpan(false)
    }
    setMemuatData(false)
  }

  // Muat data tersimpan untuk kombinasi sekolah + semester + tahun pelajaran
  // tertentu. Dipanggil saat dropdown Semester diganti dan saat input Tahun
  // Pelajaran selesai diketik (onBlur). Kalau kombinasi itu belum pernah
  // disimpan, laporan baru disiapkan otomatis dari Bangunan + Perpustakaan.
  async function muatDataTersimpan(semesterAktif, tahunAktif) {
    if (!sekolahId || !tahunAktif.trim()) return

    setMemuatData(true)
    setErrorSimpan('')
    setInfoSinkron('')
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
      // Belum pernah disimpan untuk kombinasi ini -> laporan baru,
      // tabel diisi dari data Bangunan dan Perpustakaan terkini.
      await siapkanLaporanBaru()
    }
    setMemuatData(false)
  }

  // Saat halaman dibuka, ambil LAPORAN TERAKHIR yang tersimpan untuk sekolah
  // ini (urut dari yang paling baru disimpan). Kalau belum ada sama sekali,
  // tabel Gedung dan Buku langsung diisi dari Bangunan dan Perpustakaan.
  async function muatLaporanTerakhir() {
    if (!sekolahId) return
    setMemuatData(true)
    setErrorSimpan('')
    const { data: baris, error } = await supabase
      .from('laporan_semester_data')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Gagal memuat laporan terakhir:', error)
      setErrorSimpan('Gagal memuat data tersimpan: ' + error.message)
      setMemuatData(false)
      return
    }

    if (baris) {
      setSemester(baris.semester)
      setTahunPelajaran(baris.tahun_pelajaran)
      setJamPelajaran(gabungkanData(jamPelajaranKosong(), baris.jam_pelajaran))
      setDataGedung(gabungkanData(dataGedungKosong(), baris.data_gedung))
      setDataBuku(gabungkanData(dataBukuKosong(), baris.data_buku))
      setTersimpan(true)
    } else {
      await siapkanLaporanBaru()
    }
    setMemuatData(false)
  }

  // Dijalankan sekali saat sekolahId sudah tersedia (halaman baru dibuka).
  useEffect(() => {
    muatLaporanTerakhir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  // Simpan ketiga tabel ke Supabase
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

  // Baris "Label : nilai" dengan input untuk layar dan span untuk cetak.
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

        {/* Tombol perbarui dari sumber data */}
        <div className="no-print flex flex-wrap items-center justify-center gap-2 mt-3">
          <button
            onClick={tarikDariBangunan}
            disabled={saving || memuatData}
            className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-slate-200 disabled:opacity-60"
          >
            <Building2 size={14} /> Tarik dari Bangunan
          </button>
          <button
            onClick={tarikDariPerpustakaan}
            disabled={saving || memuatData}
            className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-slate-200 disabled:opacity-60"
          >
            <Library size={14} /> Tarik dari Perpustakaan
          </button>
        </div>

        <p className="no-print text-center text-[11px] text-slate-400 mt-2">
          Tabel Gedung dan Buku terisi otomatis dari halaman Kondisi Bangunan dan Perpustakaan. Periksa, lengkapi bagian manual, lalu klik "Simpan Data" sebelum mencetak.
          {memuatData && ' Memuat data...'}
        </p>

        {infoSinkron && (
          <div className="no-print mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
            <Info size={15} className="shrink-0 mt-0.5" />
            <span>{infoSinkron}</span>
          </div>
        )}
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
          Override untuk kasus khusus halaman ini ada di <style> di bawah. */}
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
                onChange={(e) => {
                  const semesterBaru = e.target.value
                  setSemester(semesterBaru)
                  muatDataTersimpan(semesterBaru, tahunPelajaran)
                }}
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

        {/* ===== TABEL 3: DATA KEADAAN BUKU-BUKU K13 & KUMER ===== */}
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
             supaya laporan yang lebih dari satu halaman mengalir normal
             per halaman A4. Sama seperti pola Cetak8355.jsx. */
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
           layar supaya bisa diisi manual. */
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
