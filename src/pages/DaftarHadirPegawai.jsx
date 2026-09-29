import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Printer, Pencil } from 'lucide-react'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// =====================================================================
// KONFIGURASI PER TENANT
// Halaman ini dipakai bersama oleh tenant KANTOR (KUA) dan SEKOLAH.
// Semua yang berbeda antar tenant dikumpulkan di sini. Kalau nama
// tabel/kolom di database-mu berbeda, cukup ubah di blok ini saja.
//
// Setiap `petakanProfil` mengubah baris profil mentah menjadi bentuk
// seragam: { namaUnit, kecamatan, kabupaten, tempatTtd, kepala,
// nipKepala, ttdPath, jabatanKepala, barisJabatanPerorangan }
// =====================================================================
const KONFIG = {
  kantor: {
    judulHalaman: 'Daftar Hadir Pegawai',
    subjudul: 'Rekap kehadiran pegawai per bulan, otomatis dari data pegawai, siap cetak.',
    istilahPegawai: 'Pegawai',
    bucket: 'profil-kantor',

    tabelPegawai: 'pegawai_kantor',
    selectPegawai: 'id, nama_lengkap, jabatan, nip',
    urutPegawai: 'nama_lengkap',
    filterAktif: { kolom: 'status', nilai: 'aktif' },
    filterSekolahPegawai: true,
    petakanPegawai: (p) => p,

    tabelPresensi: 'presensi_pegawai_kantor',
    kolomRelasi: 'pegawai_kantor_id', // FK ke tabelPegawai.id
    filterSekolahPresensi: true,

    // Mode Perorangan: Sabtu ikut dianggap libur (format manual KUA)
    sabtuLibur: true,

    profil: {
      tabel: 'profil_kantor',
      select:
        'nama_kantor, alamat, kabupaten, kecamatan, telepon, email, kepala_kua, nip_kepala_kua, tempat_ttd, logo_path, ttd_kepala_kua_path',
    },
    petakanProfil: (d) => ({
      namaUnit: d.nama_kantor || (d.kecamatan ? `KUA Kec. ${d.kecamatan}` : '-'),
      kecamatan: d.kecamatan,
      kabupaten: d.kabupaten,
      tempatTtd: d.tempat_ttd,
      kepala: d.kepala_kua,
      nipKepala: d.nip_kepala_kua,
      ttdPath: d.ttd_kepala_kua_path,
      jabatanKepala: 'Kepala KUA',
      barisJabatanPerorangan: [
        'Kepala Kantor Urusan Agama',
        `Kecamatan ${d.kecamatan || '..............................'}`,
      ],
    }),
  },

  // ------------------------------------------------------------------
  // SEKOLAH — tabel/kolom dicocokkan dengan LaporanDaftarHadirGuru.jsx
  // (guru, presensi_guru, profil_sekolah, bucket profil-sekolah).
  // ------------------------------------------------------------------
  sekolah: {
    judulHalaman: 'Daftar Hadir Guru & Tenaga Kependidikan',
    subjudul: 'Rekap kehadiran guru dan tenaga kependidikan per bulan, siap cetak.',
    istilahPegawai: 'Guru & Tenaga Kependidikan',
    bucket: 'profil-sekolah',

    tabelPegawai: 'guru',
    selectPegawai: 'id, nip, nama_lengkap, mata_pelajaran',
    urutPegawai: 'nama_lengkap',
    filterAktif: { kolom: 'status', nilai: 'aktif' },
    // Difilter per sekolah; kalau tabel guru ternyata tidak punya kolom
    // sekolah_id, query otomatis diulang tanpa filter (mengandalkan RLS).
    filterSekolahPegawai: true,
    // Kolom "Jabatan" di tabel diisi mata pelajaran (guru belum tentu punya kolom jabatan)
    petakanPegawai: (p) => ({ ...p, jabatan: p.mata_pelajaran || 'Guru' }),

    tabelPresensi: 'presensi_guru',
    kolomRelasi: 'guru_id', // FK ke guru.id
    // Sama seperti LaporanDaftarHadirGuru: presensi dibaca lewat guru_id saja
    filterSekolahPresensi: false,

    // Sekolah umumnya masuk Senin–Sabtu atau Senin–Jumat; ubah sesuai kebijakan
    sabtuLibur: false,

    profil: {
      tabel: 'profil_sekolah',
      select:
        'nama_sekolah, dinas_pendidikan, alamat, kabupaten, kecamatan, kepala_sekolah, nip_kepala_sekolah, tempat_ttd, ttd_kepala_sekolah_path',
    },
    petakanProfil: (d) => ({
      namaUnit: d.nama_sekolah || '-',
      kecamatan: d.kecamatan,
      kabupaten: d.kabupaten,
      tempatTtd: d.tempat_ttd,
      kepala: d.kepala_sekolah,
      nipKepala: d.nip_kepala_sekolah,
      ttdPath: d.ttd_kepala_sekolah_path,
      jabatanKepala: 'Kepala Sekolah',
      barisJabatanPerorangan: [
        'Kepala Sekolah',
        d.nama_sekolah || '..............................',
      ],
    }),
  },
}

// Kolom tabel presensi (sama untuk semua tenant, disamakan dengan PresensiKantor.jsx)
const KOLOM_TANGGAL = 'tanggal'            // date
const KOLOM_STATUS = 'status'              // text: hadir / izin / sakit / alpa
const KOLOM_KETERANGAN = 'keterangan'      // text, opsional
const KOLOM_JAM_MASUK = 'jam_masuk'        // time/text, opsional — kolom "Kedatangan"
const KOLOM_JAM_PULANG = 'jam_pulang'      // time/text, opsional — kolom "Kepulangan"

// Tabel hari libur — DIASUMSIKAN nama tabelnya `hari_libur` dengan kolom
// `tanggal` (date), sama seperti yang dipakai menu "Hari Libur" di sidebar.
const TABEL_HARI_LIBUR = 'hari_libur'
const KOLOM_TANGGAL_LIBUR = 'tanggal'

// Singkatan status yang ditampilkan di kolom tanggal (mode Kolektif)
const SINGKATAN_STATUS = {
  hadir: 'H',
  izin: 'I',
  sakit: 'S',
  alpa: 'A',
  cuti: 'C',
  dinas: 'D',
}

// Daftar opsi status untuk form edit
const OPSI_STATUS = [
  { value: 'hadir', label: 'Hadir' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'alpa', label: 'Alpa' },
  { value: 'cuti', label: 'Cuti' },
  { value: 'dinas', label: 'Dinas' },
]

const FORM_EDIT_KOSONG = { status: 'hadir', keterangan: '', jamMasuk: '', jamPulang: '' }

function formatTanggalIndonesia(date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function kapital(teks) {
  if (!teks) return ''
  return teks.charAt(0).toUpperCase() + teks.slice(1)
}

// "08:30:00" atau "2025-07-01T08:30:00" -> "08:30"
function formatJam(nilai) {
  if (!nilai) return ''
  const teks = String(nilai)
  const cocok = teks.match(/(\d{1,2}):(\d{2})/)
  if (!cocok) return teks
  return `${cocok[1].padStart(2, '0')}:${cocok[2]}`
}

export default function DaftarHadirPegawai() {
  const { profil, sekolahId, isKantor } = useAuth()

  // Pilih konfigurasi sesuai jenis tenant (kantor / sekolah)
  const jenis = isKantor ? 'kantor' : 'sekolah'
  const K = KONFIG[jenis]

  const [profilMentah, setProfilMentah] = useState(null)
  const [pegawaiList, setPegawaiList] = useState([])
  const [presensiMap, setPresensiMap] = useState({})
  const [tanggalLibur, setTanggalLibur] = useState(new Set()) // angka tanggal (1-31) yang libur bulan ini
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1) // 1-12
  const [tahun, setTahun] = useState(now.getFullYear())

  // Mode cetak: 'kolektif' (semua pegawai, 1 tabel lebar) atau 'perorangan'
  // (1 pegawai, format Daftar Hadir Manual: kedatangan & kepulangan + ttd)
  const [mode, setMode] = useState('kolektif')
  const [pegawaiTerpilihId, setPegawaiTerpilihId] = useState('')

  // ==== State untuk fitur edit presensi ====
  // modalEdit: { pegawaiId, hari } saat form edit terbuka, null saat tertutup
  const [modalEdit, setModalEdit] = useState(null)
  const [formEdit, setFormEdit] = useState(FORM_EDIT_KOSONG)
  const [menyimpan, setMenyimpan] = useState(false)

  const jumlahHari = useMemo(() => new Date(tahun, bulan, 0).getDate(), [tahun, bulan])
  const daftarHari = useMemo(
    () => Array.from({ length: jumlahHari }, (_, i) => i + 1),
    [jumlahHari]
  )

  function hariKe(hari) {
    return new Date(tahun, bulan - 1, hari).getDay() // 0 = Minggu, 6 = Sabtu
  }

  function apakahMinggu(hari) {
    return hariKe(hari) === 0
  }

  // Dipakai mode Kolektif: Minggu + hari libur
  function apakahLibur(hari) {
    return apakahMinggu(hari) || tanggalLibur.has(hari)
  }

  // Dipakai mode Perorangan (Sabtu ikut libur hanya jika K.sabtuLibur = true)
  function labelLibur(hari) {
    const h = hariKe(hari)
    if (h === 0) return 'AHAD'
    if (h === 6 && K.sabtuLibur) return 'SABTU'
    if (tanggalLibur.has(hari)) return 'LIBUR'
    return null
  }

  // Profil unit (kantor/sekolah), di-scope per tenant lewat sekolah_id
  useEffect(() => {
    if (!sekolahId) {
      setProfilMentah(null)
      return
    }
    supabase
      .from(K.profil.tabel)
      .select(K.profil.select)
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error(`Gagal memuat ${K.profil.tabel} — cek nama tabel/kolom di KONFIG.${jenis}.profil:`, error)
        }
        setProfilMentah(data || null)
      })
  }, [sekolahId, jenis]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function muatData() {
      if (!sekolahId) {
        setPegawaiList([])
        setPresensiMap({})
        setLoading(false)
        return
      }
      setLoading(true)
      setPegawaiTerpilihId('')

      const bangunKueriPegawai = (pakaiFilterSekolah) => {
        let q = supabase.from(K.tabelPegawai).select(K.selectPegawai)
        if (pakaiFilterSekolah) q = q.eq('sekolah_id', sekolahId)
        if (K.filterAktif) q = q.eq(K.filterAktif.kolom, K.filterAktif.nilai)
        return q.order(K.urutPegawai, { ascending: true })
      }
      let { data: pegawai, error: errorPegawai } = await bangunKueriPegawai(K.filterSekolahPegawai)
      if (errorPegawai && K.filterSekolahPegawai) {
        console.warn(`Filter sekolah_id di ${K.tabelPegawai} gagal — mengulang tanpa filter:`, errorPegawai.message)
        ;({ data: pegawai, error: errorPegawai } = await bangunKueriPegawai(false))
      }
      if (errorPegawai) {
        console.error(`Gagal memuat ${K.tabelPegawai} — cek KONFIG.${jenis}:`, errorPegawai)
      }

      const daftarPegawai = (pegawai || []).map(K.petakanPegawai)
      setPegawaiList(daftarPegawai)

      const tanggalAwal = `${tahun}-${String(bulan).padStart(2, '0')}-01`
      const tanggalAkhir = `${tahun}-${String(bulan).padStart(2, '0')}-${String(jumlahHari).padStart(2, '0')}`

      // Coba ambil lengkap dengan jam masuk/pulang & keterangan. Kalau salah
      // satu kolom tidak ada di tabel, query diulang bertahap supaya halaman
      // tetap jalan (kolom yang hilang cuma tampil kosong).
      const ambilPresensi = (kolom) => {
        let q = supabase.from(K.tabelPresensi).select(kolom)
        if (K.filterSekolahPresensi) q = q.eq('sekolah_id', sekolahId)
        return q.gte(KOLOM_TANGGAL, tanggalAwal).lte(KOLOM_TANGGAL, tanggalAkhir)
      }

      const kolomDasar = `${K.kolomRelasi}, ${KOLOM_TANGGAL}, ${KOLOM_STATUS}`
      let { data: presensi, error } = await ambilPresensi(
        `${kolomDasar}, ${KOLOM_KETERANGAN}, ${KOLOM_JAM_MASUK}, ${KOLOM_JAM_PULANG}`
      )

      if (error) {
        console.warn('Kolom jam_masuk/jam_pulang tidak ada — mencoba tanpa kolom jam:', error.message)
        const tanpaJam = await ambilPresensi(`${kolomDasar}, ${KOLOM_KETERANGAN}`)
        presensi = tanpaJam.data
        if (tanpaJam.error) {
          console.warn('Kolom keterangan juga tidak ada — memakai kolom dasar saja:', tanpaJam.error.message)
          const dasar = await ambilPresensi(kolomDasar)
          presensi = dasar.data
          if (dasar.error) {
            console.error(`Gagal memuat presensi — cek nama kolom di ${K.tabelPresensi}:`, dasar.error)
          }
        }
      }

      // Susun jadi map: { [pegawai_id]: { [tanggal]: { ... } } }
      const map = {}
      for (const baris of presensi || []) {
        const idPegawai = baris[K.kolomRelasi]
        const tgl = new Date(baris[KOLOM_TANGGAL]).getDate()
        const statusMentah = String(baris[KOLOM_STATUS] || '').toLowerCase()
        const singkatan = SINGKATAN_STATUS[statusMentah] || statusMentah.charAt(0).toUpperCase() || '-'

        if (!map[idPegawai]) map[idPegawai] = {}
        map[idPegawai][tgl] = {
          singkatan,
          statusRaw: baris[KOLOM_STATUS] || '',
          keterangan: baris[KOLOM_KETERANGAN] || '',
          jamMasuk: formatJam(baris[KOLOM_JAM_MASUK]),
          jamPulang: formatJam(baris[KOLOM_JAM_PULANG]),
        }
      }
      setPresensiMap(map)

      // Ambil daftar hari libur bulan ini (di luar Sabtu/Minggu yang
      // otomatis dihitung dari tanggal).
      try {
        const { data: libur, error: errorLibur } = await supabase
          .from(TABEL_HARI_LIBUR)
          .select(KOLOM_TANGGAL_LIBUR)
          .gte(KOLOM_TANGGAL_LIBUR, tanggalAwal)
          .lte(KOLOM_TANGGAL_LIBUR, tanggalAkhir)

        if (errorLibur) {
          console.error('Gagal memuat hari libur — cek nama tabel/kolom TABEL_HARI_LIBUR:', errorLibur)
          setTanggalLibur(new Set())
        } else {
          const set = new Set((libur || []).map((b) => new Date(b[KOLOM_TANGGAL_LIBUR]).getDate()))
          setTanggalLibur(set)
        }
      } catch (e) {
        console.error('Gagal memuat hari libur:', e)
        setTanggalLibur(new Set())
      }

      setLoading(false)
    }

    muatData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulan, tahun, jumlahHari, sekolahId, jenis])

  useEffect(() => {
    if (!pegawaiTerpilihId && pegawaiList.length > 0) {
      setPegawaiTerpilihId(String(pegawaiList[0].id))
    }
  }, [pegawaiList, pegawaiTerpilihId])

  // Profil yang sudah diseragamkan (sama bentuknya untuk kantor & sekolah)
  const P = useMemo(() => (profilMentah ? K.petakanProfil(profilMentah) : null), [profilMentah, K])

  const ttdKepalaUrl = P?.ttdPath
    ? supabase.storage.from(K.bucket).getPublicUrl(P.ttdPath).data.publicUrl
    : null

  const jabatanKepala = P?.jabatanKepala || K.petakanProfil({}).jabatanKepala
  const tempatTtd = P?.tempatTtd || P?.kabupaten || ''
  const tanggalCetak = formatTanggalIndonesia(new Date())
  // Daftar hadir manual ditandatangani per akhir bulan berjalan
  const tanggalAkhirBulan = formatTanggalIndonesia(new Date(tahun, bulan - 1, jumlahHari))

  const unitKerja = P?.namaUnit || '-'
  const barisJabatanPerorangan = P?.barisJabatanPerorangan || K.petakanProfil({}).barisJabatanPerorangan

  function hitungRekap(idPegawai) {
    const dataBulan = presensiMap[idPegawai] || {}
    const nilai = Object.values(dataBulan).map((v) => v.singkatan)
    return {
      hadir: nilai.filter((v) => v === 'H').length,
      izin: nilai.filter((v) => v === 'I').length,
      sakit: nilai.filter((v) => v === 'S').length,
      alpa: nilai.filter((v) => v === 'A').length,
    }
  }

  const pegawaiTerpilih = pegawaiList.find((p) => String(p.id) === String(pegawaiTerpilihId)) || null
  const dataBulanPegawaiTerpilih = pegawaiTerpilih ? presensiMap[pegawaiTerpilih.id] || {} : {}

  // ==== Fungsi-fungsi fitur edit presensi ====

  function bukaEditPresensi(pegawaiId, hari) {
    const data = presensiMap[pegawaiId]?.[hari]
    setFormEdit({
      status: data?.statusRaw || 'hadir',
      keterangan: data?.keterangan || '',
      jamMasuk: data?.jamMasuk || '',
      jamPulang: data?.jamPulang || '',
    })
    setModalEdit({ pegawaiId, hari })
  }

  function tutupEditPresensi() {
    if (menyimpan) return
    setModalEdit(null)
    setFormEdit(FORM_EDIT_KOSONG)
  }

  function perbaruiPresensiLokal(pegawaiId, hari, dataBaru) {
    setPresensiMap((prev) => {
      const salinan = { ...prev }
      const dataPegawai = { ...(salinan[pegawaiId] || {}) }
      if (dataBaru === null) {
        delete dataPegawai[hari]
      } else {
        dataPegawai[hari] = dataBaru
      }
      salinan[pegawaiId] = dataPegawai
      return salinan
    })
  }

  async function simpanPresensi(e) {
    e.preventDefault()
    if (!modalEdit) return
    setMenyimpan(true)
    try {
      const { pegawaiId, hari } = modalEdit
      const tanggalStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(hari).padStart(2, '0')}`

      // Cek dulu apakah baris presensi untuk pegawai+tanggal ini sudah ada,
      // supaya kita tahu harus update atau insert (tanpa bergantung pada
      // constraint unique yang mungkin belum ada di tabel).
      const { data: existing, error: errorCek } = await supabase
        .from(K.tabelPresensi)
        .select('id')
        .eq(K.kolomRelasi, pegawaiId)
        .eq(KOLOM_TANGGAL, tanggalStr)
        .maybeSingle()

      if (errorCek) throw errorCek

      const payload = {
        [KOLOM_STATUS]: formEdit.status,
        [KOLOM_KETERANGAN]: formEdit.keterangan || null,
        [KOLOM_JAM_MASUK]: formEdit.jamMasuk || null,
        [KOLOM_JAM_PULANG]: formEdit.jamPulang || null,
      }

      let error
      if (existing) {
        ;({ error } = await supabase
          .from(K.tabelPresensi)
          .update(payload)
          .eq('id', existing.id))
      } else {
        ;({ error } = await supabase
          .from(K.tabelPresensi)
          .insert({
            [K.kolomRelasi]: pegawaiId,
            [KOLOM_TANGGAL]: tanggalStr,
            sekolah_id: sekolahId,
            ...payload,
          }))
      }

      if (error) throw error

      perbaruiPresensiLokal(pegawaiId, hari, {
        singkatan: SINGKATAN_STATUS[formEdit.status] || formEdit.status.charAt(0).toUpperCase(),
        statusRaw: formEdit.status,
        keterangan: formEdit.keterangan || '',
        jamMasuk: formEdit.jamMasuk || '',
        jamPulang: formEdit.jamPulang || '',
      })

      tutupEditPresensi()
    } catch (err) {
      console.error('Gagal menyimpan presensi:', err)
      alert('Gagal menyimpan presensi: ' + (err.message || 'terjadi kesalahan'))
    } finally {
      setMenyimpan(false)
    }
  }

  async function hapusPresensi() {
    if (!modalEdit) return
    if (!window.confirm('Hapus data presensi tanggal ini?')) return
    setMenyimpan(true)
    try {
      const { pegawaiId, hari } = modalEdit
      const tanggalStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(hari).padStart(2, '0')}`

      const { error } = await supabase
        .from(K.tabelPresensi)
        .delete()
        .eq(K.kolomRelasi, pegawaiId)
        .eq(KOLOM_TANGGAL, tanggalStr)

      if (error) throw error

      perbaruiPresensiLokal(pegawaiId, hari, null)
      tutupEditPresensi()
    } catch (err) {
      console.error('Gagal menghapus presensi:', err)
      alert('Gagal menghapus presensi: ' + (err.message || 'terjadi kesalahan'))
    } finally {
      setMenyimpan(false)
    }
  }

  const pegawaiModalEdit = modalEdit
    ? pegawaiList.find((p) => p.id === modalEdit.pegawaiId)
    : null

  return (
    <Layout title={K.judulHalaman} subtitle={K.subjudul}>
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
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

          <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('kolektif')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'kolektif' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Kolektif
            </button>
            <button
              type="button"
              onClick={() => setMode('perorangan')}
              className={`px-3 py-2 text-sm font-medium transition-colors border-l border-slate-300 ${
                mode === 'perorangan' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Perorangan
            </button>
          </div>

          {mode === 'perorangan' && (
            <select
              value={pegawaiTerpilihId}
              onChange={(e) => setPegawaiTerpilihId(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm max-w-[220px]"
            >
              {pegawaiList.map((p) => (
                <option key={p.id} value={p.id}>{p.nama_lengkap}</option>
              ))}
            </select>
          )}

          <span className="text-xs text-slate-400 hidden sm:inline">Klik sel tanggal untuk edit presensi</span>
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
      ) : mode === 'kolektif' ? (
        <div
          className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 mx-auto"
          style={{ width: '297mm' }}
        >
          <KopSurat />

          <div className="text-center mb-5">
            <h1 className="font-display text-base font-bold uppercase text-slate-900 underline">
              Rekapitulasi Daftar Hadir {K.istilahPegawai}
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
                  <th
                    key={hari}
                    className={`border border-slate-400 px-0.5 py-1 w-4 ${apakahLibur(hari) ? 'text-red-600' : ''}`}
                  >
                    {hari}
                  </th>
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
                      <td
                        key={hari}
                        onClick={() => bukaEditPresensi(pegawai.id, hari)}
                        title="Klik untuk edit presensi"
                        className={`no-print-cursor border border-slate-300 text-center cursor-pointer hover:bg-teal-50 ${apakahLibur(hari) ? 'text-red-600' : ''}`}
                      >
                        {dataBulanIni[hari]?.singkatan || ''}
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
            Keterangan: H = Hadir, I = Izin, S = Sakit, A = Alpa/Tanpa Keterangan.
            <span className="text-red-600"> Angka tanggal merah</span> = hari Minggu/libur.
          </p>

          <div className="ttd-block flex justify-between mt-10 text-sm text-slate-700">
            <div className="text-center w-48">
              <p>Mengetahui,</p>
              <p>{jabatanKepala}</p>
              <div className="h-20 flex items-end justify-center">
                {ttdKepalaUrl && (
                  <img src={ttdKepalaUrl} alt={`Tanda Tangan ${jabatanKepala}`} className="max-h-20 object-contain" />
                )}
              </div>
              <p className="font-semibold border-t border-slate-400 pt-1">
                ({P?.kepala || '..............................'})
              </p>
              <p className="text-xs text-slate-500">
                NIP. {P?.nipKepala || '..............................'}
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
      ) : (
        // === MODE PERORANGAN: format Daftar Hadir Manual (A4 potret) ===
        <div
          className="lembar-cetak lembar-perorangan print-only bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 mx-auto"
          style={{ width: '190mm' }}
        >
          <KopSurat />

          <div className="text-center mb-3">
            <h1 className="font-display text-sm font-bold uppercase text-slate-900 tracking-wide">
              Daftar Hadir Manual
            </h1>
          </div>

          {pegawaiTerpilih ? (
            <>
              <table className="text-[11px] text-slate-800 mb-2">
                <tbody>
                  <tr>
                    <td className="w-24 align-top py-[1px] uppercase">Nama</td>
                    <td className="w-3 align-top pr-2 py-[1px]">:</td>
                    <td className="align-top py-[1px] font-medium">{pegawaiTerpilih.nama_lengkap}</td>
                  </tr>
                  <tr>
                    <td className="align-top py-[1px] uppercase">NIP</td>
                    <td className="align-top pr-2 py-[1px]">:</td>
                    <td className="align-top py-[1px]">{pegawaiTerpilih.nip || '-'}</td>
                  </tr>
                  <tr>
                    <td className="align-top py-[1px] uppercase">Unit Kerja</td>
                    <td className="align-top pr-2 py-[1px]">:</td>
                    <td className="align-top py-[1px]">{unitKerja}</td>
                  </tr>
                  <tr>
                    <td className="align-top py-[1px] uppercase">Bulan</td>
                    <td className="align-top pr-2 py-[1px]">:</td>
                    <td className="align-top py-[1px]">
                      {NAMA_BULAN[bulan - 1]} {tahun}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse text-[10px] table-fixed">
                <thead>
                  <tr className="bg-slate-100 text-center">
                    <th rowSpan={2} className="border border-slate-500 px-1 py-1 w-7 align-middle">No</th>
                    <th rowSpan={2} className="border border-slate-500 px-1 py-1 w-[70px] align-middle">
                      Tanggal
                    </th>
                    <th colSpan={2} className="border border-slate-500 px-1 py-1">Kedatangan</th>
                    <th colSpan={2} className="border border-slate-500 px-1 py-1">Kepulangan</th>
                    <th rowSpan={2} className="border border-slate-500 px-1 py-1 w-14 align-middle">Ket</th>
                  </tr>
                  <tr className="bg-slate-100 text-center">
                    <th className="border border-slate-500 px-1 py-0.5 w-12">Jam</th>
                    <th className="border border-slate-500 px-1 py-0.5">Tanda Tangan</th>
                    <th className="border border-slate-500 px-1 py-0.5 w-12">Jam</th>
                    <th className="border border-slate-500 px-1 py-0.5">Tanda Tangan</th>
                  </tr>
                </thead>
                <tbody>
                  {daftarHari.map((hari) => {
                    const tanggalStr = `${String(hari).padStart(2, '0')}-${String(bulan).padStart(2, '0')}-${tahun}`
                    const libur = labelLibur(hari)
                    const dataHari = dataBulanPegawaiTerpilih[hari]

                    if (libur) {
                      return (
                        <tr
                          key={hari}
                          onClick={() => bukaEditPresensi(pegawaiTerpilih.id, hari)}
                          title="Klik untuk edit presensi"
                          className="no-print-cursor text-red-600 font-semibold cursor-pointer hover:bg-teal-50"
                        >
                          <td className="border border-slate-400 text-center h-[19px]">{hari}</td>
                          <td className="border border-slate-400 text-center whitespace-nowrap">
                            {tanggalStr}
                          </td>
                          <td colSpan={5} className="border border-slate-400 text-center tracking-wide">
                            {libur}
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr
                        key={hari}
                        onClick={() => bukaEditPresensi(pegawaiTerpilih.id, hari)}
                        title="Klik untuk edit presensi"
                        className="no-print-cursor cursor-pointer hover:bg-teal-50"
                      >
                        <td className="border border-slate-400 text-center h-[19px]">{hari}</td>
                        <td className="border border-slate-400 text-center whitespace-nowrap">
                          {tanggalStr}
                        </td>
                        <td className="border border-slate-400 text-center">{dataHari?.jamMasuk || ''}</td>
                        <td className="border border-slate-400" />
                        <td className="border border-slate-400 text-center">{dataHari?.jamPulang || ''}</td>
                        <td className="border border-slate-400" />
                        <td className="border border-slate-400 text-center text-[9px] truncate">
                          {dataHari?.keterangan ||
                            (dataHari && dataHari.singkatan !== 'H' ? kapital(dataHari.statusRaw) : '')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Tanda tangan pimpinan di sisi kanan, seperti contoh manual */}
              <div className="ttd-block flex justify-end mt-4 text-[11px] text-slate-800">
                <div className="w-64 text-left">
                  <p>{tempatTtd ? `${tempatTtd}, ${tanggalAkhirBulan}` : tanggalAkhirBulan}</p>
                  {barisJabatanPerorangan.map((baris, i) => (
                    <p key={i}>{baris}</p>
                  ))}
                  <div className="h-14 flex items-end">
                    {ttdKepalaUrl && (
                      <img src={ttdKepalaUrl} alt={`Tanda Tangan ${jabatanKepala}`} className="max-h-14 object-contain" />
                    )}
                  </div>
                  <p className="font-semibold">
                    {P?.kepala || '..............................'}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    NIP. {P?.nipKepala || '..............................'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="no-print text-sm text-slate-500">Belum ada pegawai untuk dipilih.</p>
          )}
        </div>
      )}

      {/* ==== Modal Edit Presensi ==== */}
      {modalEdit && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <Pencil size={16} className="text-teal-600" />
              <h2 className="font-semibold text-slate-800">Edit Presensi</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              {pegawaiModalEdit?.nama_lengkap} — {modalEdit.hari} {NAMA_BULAN[bulan - 1]} {tahun}
            </p>

            <form onSubmit={simpanPresensi} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select
                  value={formEdit.status}
                  onChange={(e) => setFormEdit((f) => ({ ...f, status: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  {OPSI_STATUS.map((opsi) => (
                    <option key={opsi.value} value={opsi.value}>{opsi.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Jam Masuk</label>
                  <input
                    type="time"
                    value={formEdit.jamMasuk}
                    onChange={(e) => setFormEdit((f) => ({ ...f, jamMasuk: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Jam Pulang</label>
                  <input
                    type="time"
                    value={formEdit.jamPulang}
                    onChange={(e) => setFormEdit((f) => ({ ...f, jamPulang: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={formEdit.keterangan}
                  onChange={(e) => setFormEdit((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="opsional"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={hapusPresensi}
                  disabled={menyimpan}
                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Hapus
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={tutupEditPresensi}
                    disabled={menyimpan}
                    className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={menyimpan}
                    className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {menyimpan ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </form>
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
          /* Mode Perorangan pakai kertas A4 potret. Padding & margin
             dipangkas supaya tabel 1 bulan + tanda tangan muat 1 lembar. */
          .lembar-perorangan {
            page: perorangan;
            width: 190mm !important;
            padding: 4mm 6mm !important;
            border-radius: 0 !important;
          }
          .lembar-perorangan table { page-break-inside: auto; }
          .lembar-perorangan tr { page-break-inside: avoid; }
          .ttd-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .no-print-cursor {
            cursor: default !important;
          }
        }
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @page perorangan {
          size: A4 portrait;
          margin: 6mm;
        }
      `}</style>
    </Layout>
  )
}
