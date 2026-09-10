import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Halaman cetak GABUNGAN untuk 4 laporan murid, karena hanya
// LaporanKeadaanMurid.jsx yang terdaftar di App.jsx:
//   1) Daftar Keadaan Murid Tiap Kelas   (tab: 'keadaan')
//   2) Daftar Perincian Murid Menurut Usia             (tab: 'usia')
//   3) Daftar Perincian Murid Menurut Agama            (tab: 'agama')
//   4) Daftar Perincian Murid Menurut Kewarganegaraan (tab: 'kewarganegaraan')
//
// Data sekolah/kelas/siswa diambil SEKALI saja (query gabungan), lalu
// masing-masing tab menghitung tampilannya sendiri dari data yang sama.
// Berpindah tab tidak memuat ulang data dari Supabase, dan tidak
// mereset isian manual "Masuk/Keluar Dalam Bulan Ini" pada tab Keadaan
// Murid.
//
// PENCETAKAN: mengikuti format dokumen referensi (DAFTAR_RINCIAN_SISWA),
// yaitu keempat laporan dicetak SEKALIGUS dan berurutan dalam satu berkas
// (Keadaan Murid → Usia → Agama → Kewarganegaraan), masing-masing dengan
// judulnya sendiri, bukan hanya tab yang sedang aktif di layar. Di layar,
// tab tetap berfungsi seperti biasa untuk melihat/mengisi data per laporan
// (termasuk isian Masuk/Keluar Dalam Bulan Ini); saat window.print()
// dipanggil, CSS @media print menampilkan semua bagian sekaligus.
export default function LaporanKeadaanMurid() {
  const navigate = useNavigate()
  const { sekolahId: sekolahIdSaya } = useAuth()

  const [tab, setTab] = useState('keadaan') // 'keadaan' | 'usia' | 'agama' | 'kewarganegaraan'

  const [profilSekolah, setProfilSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  // PERBAIKAN: sebelumnya error dari Supabase diabaikan begitu saja, jadi
  // kalau salah satu query gagal (mis. kolom yang di-select belum ada di
  // tabel), halaman ini diam-diam menampilkan SEMUA laporan bernilai 0
  // tanpa petunjuk apa pun kenapa. Sekarang errornya ditangkap dan
  // ditampilkan sebagai banner supaya langsung ketahuan.
  const [errorMuat, setErrorMuat] = useState('')

  const [kelasList, setKelasList] = useState([])
  const [siswaList, setSiswaList] = useState([])
  const [tingkatList, setTingkatList] = useState([])

  // --- khusus tab "keadaan" ---
  const [rombelPerTingkat, setRombelPerTingkat] = useState({})
  const [masuk, setMasuk] = useState({})
  const [keluar, setKeluar] = useState({})

  const URUTAN_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  const KATEGORI_KEWARGANEGARAAN = ['WNI asli', 'WNI Keturunan', 'WNA']
  const KATEGORI_AGAMA = ['Krist. Protestan', 'Krist. Katolik', 'Islam', 'Hindu', 'Budha', 'Konghucu', 'Lain-lain']
  // Label kolom untuk siswa yang tanggal lahirnya kosong/tidak valid, supaya
  // mereka tetap terhitung di tabel Usia (dulu diam-diam dibuang, sehingga
  // totalnya bisa lebih kecil dari total di tab Keadaan Murid).
  const KOLOM_USIA_TIDAK_DIKETAHUI = 'Tidak diketahui'

  // Urutan sesuai dokumen referensi: Keadaan → Usia → Agama → Kewarganegaraan
  const TAB_LABEL = {
    keadaan: 'Keadaan Murid',
    usia: 'Usia',
    agama: 'Agama',
    kewarganegaraan: 'Kewarganegaraan',
  }
  const TAB_JUDUL = {
    keadaan: 'Daftar Keadaan Murid Tiap Kelas',
    usia: 'Daftar Perincian Murid Menurut Usia',
    agama: 'Daftar Perincian Murid Menurut Agama',
    kewarganegaraan: 'Daftar Perincian Murid Menurut Kewarganegaraan',
  }
  const URUTAN_TAB = ['keadaan', 'usia', 'agama', 'kewarganegaraan']

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

  function normalisasiKewarganegaraan(nilai) {
    const v = (nilai || '').toString().trim().toLowerCase()
    if (!v) return 'WNI asli'
    if (v.includes('keturunan')) return 'WNI Keturunan'
    if (v.includes('wna') || v.includes('asing')) return 'WNA'
    return 'WNI asli'
  }

  function normalisasiAgama(nilai) {
    const v = (nilai || '').toString().trim().toLowerCase()
    if (!v) return 'Lain-lain'
    if (v.includes('islam')) return 'Islam'
    if (v.includes('protestan') || v === 'kristen' || v === 'nasrani') return 'Krist. Protestan'
    if (v.includes('katol')) return 'Krist. Katolik'
    if (v.includes('hindu')) return 'Hindu'
    if (v.includes('budd') || v.includes('budh')) return 'Budha'
    if (v.includes('khonghucu') || v.includes('konghucu')) return 'Konghucu'
    return 'Lain-lain'
  }

  function hitungUsia(tanggalLahir) {
    if (!tanggalLahir) return null
    const lahir = new Date(tanggalLahir)
    if (Number.isNaN(lahir.getTime())) return null
    const referensi = new Date()
    let usia = referensi.getFullYear() - lahir.getFullYear()
    const belumUlangTahun =
      referensi.getMonth() < lahir.getMonth() ||
      (referensi.getMonth() === lahir.getMonth() && referensi.getDate() < lahir.getDate())
    if (belumUlangTahun) usia -= 1
    return usia
  }

  useEffect(() => {
    async function muat() {
      setLoading(true)
      setErrorMuat('')
      const sekolahId = sekolahIdSaya
      if (!sekolahId) {
        setLoading(false)
        return
      }

      const [
        { data: sekolah, error: sekolahError },
        { data: kelas, error: kelasError },
        { data: siswa, error: siswaError },
      ] = await Promise.all([
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
        supabase.from('kelas').select('id, tingkat').eq('sekolah_id', sekolahId),
        supabase
          .from('siswa')
          .select('kelas_id, jenis_kelamin, status, kewarganegaraan, agama, tanggal_lahir')
          .eq('sekolah_id', sekolahId)
          .eq('status', 'aktif'),
      ])

      // PERBAIKAN: errornya sekarang dicatat DAN ditampilkan, bukan diam-diam
      // ditelan. Sebelumnya kalau query siswa gagal (mis. kolom yang
      // di-select belum ada di tabel), `siswa` bernilai null, lalu jatuh ke
      // `[]` di bawah — hasilnya semua laporan tampil 0 tanpa keterangan.
      if (sekolahError) console.error('Gagal memuat profil sekolah:', sekolahError)
      if (kelasError) console.error('Gagal memuat data kelas:', kelasError)
      if (siswaError) console.error('Gagal memuat data siswa:', siswaError)

      const pesanError = [
        sekolahError ? 'profil sekolah' : null,
        kelasError ? 'data kelas' : null,
        siswaError ? 'data siswa' : null,
      ].filter(Boolean)
      if (pesanError.length > 0) {
        const detailAsli = siswaError?.message || kelasError?.message || sekolahError?.message || ''
        setErrorMuat(
          `Gagal memuat ${pesanError.join(', ')} dari database, sehingga angka di laporan ini bisa 0/kosong. ` +
          `Coba muat ulang halaman; kalau masih gagal, periksa console browser (F12).` +
          (detailAsli ? ` Detail: ${detailAsli}` : '')
        )
      }

      setProfilSekolah(sekolah || null)
      if (sekolah?.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(sekolah.logo_path)
        setLogoUrl(pub?.publicUrl || '')
      } else {
        setLogoUrl('')
      }

      const daftarKelas = kelas || []
      const daftarSiswa = siswa || []

      const tingkatByKelasId = {}
      daftarKelas.forEach((k) => {
        if (k.tingkat) tingkatByKelasId[k.id] = String(k.tingkat).trim()
      })
      const tingkatUnik = urutkanTingkat(Array.from(new Set(Object.values(tingkatByKelasId))))

      // Rombongan belajar per tingkat (dipakai tab "Keadaan Murid")
      const rombel = {}
      tingkatUnik.forEach((t) => { rombel[t] = 0 })
      daftarKelas.forEach((k) => {
        const t = k.tingkat ? String(k.tingkat).trim() : null
        if (t && rombel[t] !== undefined) rombel[t] += 1
      })

      const nolAwal = {}
      tingkatUnik.forEach((t) => { nolAwal[t] = { L: 0, P: 0 } })

      setKelasList(daftarKelas)
      setSiswaList(daftarSiswa)
      setTingkatList(tingkatUnik)
      setRombelPerTingkat(rombel)
      setMasuk(nolAwal)
      setKeluar(JSON.parse(JSON.stringify(nolAwal)))
      setLoading(false)
    }
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahIdSaya])

  // Peta kelas_id -> tingkat, dipakai oleh semua tab.
  const tingkatByKelasId = useMemo(() => {
    const peta = {}
    kelasList.forEach((k) => {
      if (k.tingkat) peta[k.id] = String(k.tingkat).trim()
    })
    return peta
  }, [kelasList])

  // Siswa yang kelas_id-nya kosong atau tidak cocok dengan kelas manapun di
  // atas tidak akan pernah muncul di laporan manapun (Keadaan/Usia/Agama/
  // Kewarganegaraan semuanya dikelompokkan per tingkat kelas). Dihitung di
  // sini supaya bisa diberi tahu ke admin, bukan cuma bikin total "kelihatan"
  // tidak sinkron dengan jumlah siswa aktif yang sebenarnya.
  const jumlahSiswaTanpaTingkat = useMemo(
    () => siswaList.filter((s) => !tingkatByKelasId[s.kelas_id]).length,
    [siswaList, tingkatByKelasId]
  )

  // ---------- Data tab "Keadaan Murid" ----------
  const akhirBulanIni = useMemo(() => {
    const counts = {}
    tingkatList.forEach((t) => { counts[t] = { L: 0, P: 0 } })
    siswaList.forEach((s) => {
      const t = tingkatByKelasId[s.kelas_id]
      if (!t || !counts[t]) return
      if (s.jenis_kelamin === 'L') counts[t].L += 1
      else if (s.jenis_kelamin === 'P') counts[t].P += 1
    })
    return counts
  }, [tingkatList, tingkatByKelasId, siswaList])

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

  function updateMutasi(setter, tingkat, gender, value) {
    const n = value === '' ? 0 : Number(value)
    setter((prev) => ({ ...prev, [tingkat]: { ...prev[tingkat], [gender]: Number.isFinite(n) ? n : 0 } }))
  }

  const barisKeadaan = [
    { label: 'Jumlah Akhir Bulan Lalu', data: akhirBulanLalu, editable: false },
    { label: 'Masuk Dalam Bulan Ini', data: masuk, editable: true, setter: setMasuk },
    { label: 'Keluar Dalam Bulan Ini', data: keluar, editable: true, setter: setKeluar },
    { label: 'Jumlah Akhir Dalam Bulan Ini', data: akhirBulanIni, editable: false, tebal: true },
  ]

  function totalBaris(dataBaris) {
    let L = 0, P = 0
    tingkatList.forEach((t) => {
      L += dataBaris[t]?.L || 0
      P += dataBaris[t]?.P || 0
    })
    return { L, P, TOTAL: L + P }
  }

  const tengah = Math.ceil(tingkatList.length / 2)
  const kolomKiri = tingkatList.slice(0, tengah)
  const kolomKanan = tingkatList.slice(tengah)

  // ---------- Data tab "Kewarganegaraan" ----------
  const dataKewarganegaraan = useMemo(() => {
    const data = {}
    KATEGORI_KEWARGANEGARAAN.forEach((kat) => {
      data[kat] = {}
      tingkatList.forEach((t) => { data[kat][t] = { L: 0, P: 0 } })
    })
    siswaList.forEach((s) => {
      const t = tingkatByKelasId[s.kelas_id]
      if (!t) return
      const kat = normalisasiKewarganegaraan(s.kewarganegaraan)
      if (!data[kat] || !data[kat][t]) return
      if (s.jenis_kelamin === 'L') data[kat][t].L += 1
      else if (s.jenis_kelamin === 'P') data[kat][t].P += 1
    })
    return data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkatList, tingkatByKelasId, siswaList])

  const totalPerTingkatKewarganegaraan = useMemo(() => {
    const hasil = {}
    tingkatList.forEach((t) => {
      let L = 0, P = 0
      KATEGORI_KEWARGANEGARAAN.forEach((kat) => {
        L += dataKewarganegaraan[kat]?.[t]?.L || 0
        P += dataKewarganegaraan[kat]?.[t]?.P || 0
      })
      hasil[t] = { L, P }
    })
    return hasil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkatList, dataKewarganegaraan])

  const totalKeseluruhanKewarganegaraan = useMemo(() => {
    let L = 0, P = 0
    tingkatList.forEach((t) => {
      L += totalPerTingkatKewarganegaraan[t]?.L || 0
      P += totalPerTingkatKewarganegaraan[t]?.P || 0
    })
    return { L, P, TOTAL: L + P }
  }, [tingkatList, totalPerTingkatKewarganegaraan])

  // ---------- Data tab "Agama" ----------
  const dataAgama = useMemo(() => {
    const data = {}
    tingkatList.forEach((t) => {
      data[t] = {}
      KATEGORI_AGAMA.forEach((kat) => { data[t][kat] = { L: 0, P: 0 } })
    })
    siswaList.forEach((s) => {
      const t = tingkatByKelasId[s.kelas_id]
      if (!t || !data[t]) return
      const kat = normalisasiAgama(s.agama)
      if (s.jenis_kelamin === 'L') data[t][kat].L += 1
      else if (s.jenis_kelamin === 'P') data[t][kat].P += 1
    })
    return data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkatList, tingkatByKelasId, siswaList])

  function totalBarisTingkatAgama(t) {
    let L = 0, P = 0
    KATEGORI_AGAMA.forEach((kat) => {
      L += dataAgama[t]?.[kat]?.L || 0
      P += dataAgama[t]?.[kat]?.P || 0
    })
    return { L, P, TOTAL: L + P }
  }

  const totalKolomAgama = useMemo(() => {
    const hasil = {}
    KATEGORI_AGAMA.forEach((kat) => {
      let L = 0, P = 0
      tingkatList.forEach((t) => {
        L += dataAgama[t]?.[kat]?.L || 0
        P += dataAgama[t]?.[kat]?.P || 0
      })
      hasil[kat] = { L, P }
    })
    return hasil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkatList, dataAgama])

  const totalKeseluruhanAgama = useMemo(() => {
    let L = 0, P = 0
    tingkatList.forEach((t) => {
      const total = totalBarisTingkatAgama(t)
      L += total.L
      P += total.P
    })
    return { L, P, TOTAL: L + P }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkatList, dataAgama])

  // ---------- Data tab "Usia" ----------
  // PERBAIKAN: kolom usia sebelumnya HANYA dibuat dari rentang usia yang
  // valid (0-25 tahun) berdasarkan siswa yang tanggal lahirnya terisi.
  // Siswa dengan tanggal_lahir kosong/tidak valid tidak masuk kolom manapun
  // -> "hilang" dari tabel ini, sehingga totalnya lebih kecil dari total di
  // tab Keadaan Murid. Sekarang mereka masuk ke kolom "Tidak diketahui" di
  // ujung tabel supaya totalnya selalu sinkron dengan jumlah siswa aktif.
  const usiaKolom = useMemo(() => {
    const usiaSiswa = siswaList
      .map((s) => hitungUsia(s.tanggal_lahir))
      .filter((u) => u !== null && u >= 0 && u <= 25)
    let usiaMin = usiaSiswa.length ? Math.min(...usiaSiswa) : 6
    let usiaMax = usiaSiswa.length ? Math.max(...usiaSiswa) : 14
    if (usiaMax - usiaMin < 1) { usiaMin = Math.min(usiaMin, 6); usiaMax = Math.max(usiaMax, 14) }
    const kolom = []
    for (let u = usiaMin; u <= usiaMax; u += 1) kolom.push(u)
    const adaTanpaUsia = siswaList.some((s) => {
      const u = hitungUsia(s.tanggal_lahir)
      return u === null || u < 0 || u > 25
    })
    if (adaTanpaUsia) kolom.push(KOLOM_USIA_TIDAK_DIKETAHUI)
    return kolom
  }, [siswaList])

  const dataUsia = useMemo(() => {
    const data = {}
    tingkatList.forEach((t) => {
      data[t] = {}
      usiaKolom.forEach((u) => { data[t][u] = { L: 0, P: 0 } })
    })
    siswaList.forEach((s) => {
      const t = tingkatByKelasId[s.kelas_id]
      if (!t || !data[t]) return
      const usiaHitung = hitungUsia(s.tanggal_lahir)
      const usia = data[t][usiaHitung] ? usiaHitung : KOLOM_USIA_TIDAK_DIKETAHUI
      if (!data[t][usia]) return
      if (s.jenis_kelamin === 'L') data[t][usia].L += 1
      else if (s.jenis_kelamin === 'P') data[t][usia].P += 1
    })
    return data
  }, [tingkatList, tingkatByKelasId, siswaList, usiaKolom])

  function totalBarisTingkatUsia(t) {
    let L = 0, P = 0
    usiaKolom.forEach((u) => {
      L += dataUsia[t]?.[u]?.L || 0
      P += dataUsia[t]?.[u]?.P || 0
    })
    return { L, P, TOTAL: L + P }
  }

  const totalKolomUsia = useMemo(() => {
    const hasil = {}
    usiaKolom.forEach((u) => {
      let L = 0, P = 0
      tingkatList.forEach((t) => {
        L += dataUsia[t]?.[u]?.L || 0
        P += dataUsia[t]?.[u]?.P || 0
      })
      hasil[u] = { L, P }
    })
    return hasil
  }, [usiaKolom, tingkatList, dataUsia])

  const totalKeseluruhanUsia = useMemo(() => {
    let L = 0, P = 0
    tingkatList.forEach((t) => {
      const total = totalBarisTingkatUsia(t)
      L += total.L
      P += total.P
    })
    return { L, P, TOTAL: L + P }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkatList, dataUsia, usiaKolom])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

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
        <p className="mt-1">Mengetahui,</p>
        <p>Kepala Sekolah</p>
        <div className="h-16" />
        <p className="font-semibold underline">{profilSekolah?.kepala_sekolah || '............................'}</p>
        <p>NIP. {profilSekolah?.nip_kepala_sekolah || '............................'}</p>
      </div>
    </div>
  )

  // Tiap bagian laporan sekarang membawa judulnya sendiri (bukan satu judul
  // tunggal di luar), karena saat cetak keempatnya tampil berurutan seperti
  // pada dokumen referensi. className "laporan-section" + "tab-aktif"/
  // "tab-nonaktif" mengatur mana yang tampil di LAYAR (hanya tab terpilih),
  // sedangkan aturan @media print di bawah menampilkan SEMUA bagian saat
  // dicetak, tanpa memengaruhi cara komponen ini dipanggil dari luar.
  function kelasBagian(kunciTab) {
    return `laporan-section ${tab === kunciTab ? 'tab-aktif' : 'tab-nonaktif'}`
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar — hilang saat dicetak */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
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
            <Printer size={16} /> Cetak Semua Laporan
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {URUTAN_TAB.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                tab === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {TAB_LABEL[key]}
            </button>
          ))}
        </div>
        <p className="no-print text-center text-[11px] text-slate-400 mt-2">
          Saat dicetak, keempat laporan (Keadaan Murid, Usia, Agama, Kewarganegaraan) akan tercetak sekaligus berurutan.
        </p>

        {errorMuat && (
          <div className="no-print mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{errorMuat}</span>
          </div>
        )}
        {!errorMuat && !loading && jumlahSiswaTanpaTingkat > 0 && (
          <div className="no-print mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              {jumlahSiswaTanpaTingkat} siswa aktif belum punya kelas (atau kelasnya belum diisi "tingkat"), jadi tidak
              terhitung di laporan ini. Perbaiki lewat menu Data Siswa / Kelas.
            </span>
          </div>
        )}
      </div>

      <div className="lembar-cetak bg-white mx-auto my-6 p-8 shadow-sm" style={{ width: '297mm' }}>
        <KopSurat />

        {tingkatList.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">
            Belum ada kelas dengan data tingkat untuk sekolah ini.
          </p>
        ) : (
          <>
            {/* ===== BAGIAN: KEADAAN MURID ===== */}
            <div className={kelasBagian('keadaan')}>
              <h1 className="text-center font-bold text-base uppercase mb-6">{TAB_JUDUL.keadaan}</h1>

              <div className="grid grid-cols-2 gap-x-8 text-xs mb-5 max-w-3xl mx-auto">
                <div>
                  {kolomKiri.map((t) => (
                    <p key={t} className="flex">
                      <span className="w-40 shrink-0">Rom. Belajar Kelas {t}</span>
                      <span className="w-4 shrink-0">:</span>
                      <span>{rombelPerTingkat[t] ?? 0} Kelas</span>
                    </p>
                  ))}
                </div>
                <div>
                  {kolomKanan.map((t) => (
                    <p key={t} className="flex">
                      <span className="w-40 shrink-0">Rom. Belajar Kelas {t}</span>
                      <span className="w-4 shrink-0">:</span>
                      <span>{rombelPerTingkat[t] ?? 0} Kelas</span>
                    </p>
                  ))}
                </div>
              </div>

              <table className="w-full text-[10px] border-collapse border border-black">
                <thead>
                  <tr className="text-center">
                    <th rowSpan={3} className="border border-black px-1 py-1">Keterangan</th>
                    <th colSpan={tingkatList.length * 2} className="border border-black px-1 py-1">Murid Kelas</th>
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
                      <Fragment key={t}>
                        <th className="border border-black px-1 py-1 w-8">L</th>
                        <th className="border border-black px-1 py-1 w-8">P</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {barisKeadaan.map((b) => {
                    const total = totalBaris(b.data)
                    return (
                      <tr key={b.label} className={b.tebal ? 'font-semibold' : ''}>
                        <td className="border border-black px-1 py-1">{b.label}</td>
                        {tingkatList.map((t) => (
                          <Fragment key={t}>
                            <td className="border border-black px-1 py-1 text-center">
                              {b.editable ? (
                                <input
                                  type="number"
                                  className="sel-mutasi no-print"
                                  value={b.data[t]?.L ?? 0}
                                  onChange={(e) => updateMutasi(b.setter, t, 'L', e.target.value)}
                                />
                              ) : null}
                              <span className={b.editable ? 'only-print' : ''}>{b.data[t]?.L ?? 0}</span>
                            </td>
                            <td className="border border-black px-1 py-1 text-center">
                              {b.editable ? (
                                <input
                                  type="number"
                                  className="sel-mutasi no-print"
                                  value={b.data[t]?.P ?? 0}
                                  onChange={(e) => updateMutasi(b.setter, t, 'P', e.target.value)}
                                />
                              ) : null}
                              <span className={b.editable ? 'only-print' : ''}>{b.data[t]?.P ?? 0}</span>
                            </td>
                          </Fragment>
                        ))}
                        <td className="border border-black px-1 py-1 text-center">{total.L}</td>
                        <td className="border border-black px-1 py-1 text-center">{total.P}</td>
                        <td className="border border-black px-1 py-1 text-center">{total.TOTAL}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ===== BAGIAN: USIA ===== */}
            <div className={`${kelasBagian('usia')} page-break-before-print`}>
              <h1 className="text-center font-bold text-base uppercase mb-6 mt-8">{TAB_JUDUL.usia}</h1>
              <table className="w-full text-[10px] border-collapse border border-black">
                <thead>
                  <tr className="text-center">
                    <th rowSpan={3} className="border border-black px-1 py-1">Kelas</th>
                    <th colSpan={usiaKolom.length * 2} className="border border-black px-1 py-1">Usia</th>
                    <th colSpan={3} className="border border-black px-1 py-1">Jumlah</th>
                  </tr>
                  <tr className="text-center">
                    {usiaKolom.map((u) => (
                      <th key={u} colSpan={2} className="border border-black px-1 py-1">
                        {u === KOLOM_USIA_TIDAK_DIKETAHUI ? u : `${u} thn`}
                      </th>
                    ))}
                    <th rowSpan={2} className="border border-black px-1 py-1 w-8">L</th>
                    <th rowSpan={2} className="border border-black px-1 py-1 w-8">P</th>
                    <th rowSpan={2} className="border border-black px-1 py-1 w-10">Total</th>
                  </tr>
                  <tr className="text-center">
                    {usiaKolom.map((u) => (
                      <Fragment key={u}>
                        <th className="border border-black px-1 py-1 w-8">L</th>
                        <th className="border border-black px-1 py-1 w-8">P</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tingkatList.map((t) => {
                    const total = totalBarisTingkatUsia(t)
                    return (
                      <tr key={t}>
                        <td className="border border-black px-1 py-1 text-center">{t}</td>
                        {usiaKolom.map((u) => (
                          <Fragment key={u}>
                            <td className="border border-black px-1 py-1 text-center">
                              {dataUsia[t]?.[u]?.L || ''}
                            </td>
                            <td className="border border-black px-1 py-1 text-center">
                              {dataUsia[t]?.[u]?.P || ''}
                            </td>
                          </Fragment>
                        ))}
                        <td className="border border-black px-1 py-1 text-center">{total.L}</td>
                        <td className="border border-black px-1 py-1 text-center">{total.P}</td>
                        <td className="border border-black px-1 py-1 text-center">{total.TOTAL}</td>
                      </tr>
                    )
                  })}
                  <tr className="font-semibold">
                    <td className="border border-black px-1 py-1 text-center">Jumlah</td>
                    {usiaKolom.map((u) => (
                      <Fragment key={u}>
                        <td className="border border-black px-1 py-1 text-center">{totalKolomUsia[u]?.L || ''}</td>
                        <td className="border border-black px-1 py-1 text-center">{totalKolomUsia[u]?.P || ''}</td>
                      </Fragment>
                    ))}
                    <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanUsia.L}</td>
                    <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanUsia.P}</td>
                    <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanUsia.TOTAL}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ===== BAGIAN: AGAMA ===== */}
            <div className={`${kelasBagian('agama')} page-break-before-print`}>
              <h1 className="text-center font-bold text-base uppercase mb-6 mt-8">{TAB_JUDUL.agama}</h1>
              <table className="w-full text-[10px] border-collapse border border-black">
                <thead>
                  <tr className="text-center">
                    <th rowSpan={3} className="border border-black px-1 py-1">Kelas</th>
                    <th colSpan={KATEGORI_AGAMA.length * 2} className="border border-black px-1 py-1">Agama</th>
                    <th colSpan={3} className="border border-black px-1 py-1">Jumlah</th>
                  </tr>
                  <tr className="text-center">
                    {KATEGORI_AGAMA.map((kat) => (
                      <th key={kat} colSpan={2} className="border border-black px-1 py-1">{kat}</th>
                    ))}
                    <th rowSpan={2} className="border border-black px-1 py-1 w-8">L</th>
                    <th rowSpan={2} className="border border-black px-1 py-1 w-8">P</th>
                    <th rowSpan={2} className="border border-black px-1 py-1 w-10">Total</th>
                  </tr>
                  <tr className="text-center">
                    {KATEGORI_AGAMA.map((kat) => (
                      <Fragment key={kat}>
                        <th className="border border-black px-1 py-1 w-8">L</th>
                        <th className="border border-black px-1 py-1 w-8">P</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tingkatList.map((t) => {
                    const total = totalBarisTingkatAgama(t)
                    return (
                      <tr key={t}>
                        <td className="border border-black px-1 py-1 text-center">{t}</td>
                        {KATEGORI_AGAMA.map((kat) => (
                          <Fragment key={kat}>
                            <td className="border border-black px-1 py-1 text-center">
                              {dataAgama[t]?.[kat]?.L || ''}
                            </td>
                            <td className="border border-black px-1 py-1 text-center">
                              {dataAgama[t]?.[kat]?.P || ''}
                            </td>
                          </Fragment>
                        ))}
                        <td className="border border-black px-1 py-1 text-center">{total.L}</td>
                        <td className="border border-black px-1 py-1 text-center">{total.P}</td>
                        <td className="border border-black px-1 py-1 text-center">{total.TOTAL}</td>
                      </tr>
                    )
                  })}
                  <tr className="font-semibold">
                    <td className="border border-black px-1 py-1 text-center">Jumlah</td>
                    {KATEGORI_AGAMA.map((kat) => (
                      <Fragment key={kat}>
                        <td className="border border-black px-1 py-1 text-center">{totalKolomAgama[kat]?.L || ''}</td>
                        <td className="border border-black px-1 py-1 text-center">{totalKolomAgama[kat]?.P || ''}</td>
                      </Fragment>
                    ))}
                    <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanAgama.L}</td>
                    <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanAgama.P}</td>
                    <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanAgama.TOTAL}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ===== BAGIAN: KEWARGANEGARAAN ===== */}
            <div className={`${kelasBagian('kewarganegaraan')} page-break-before-print`}>
              <h1 className="text-center font-bold text-base uppercase mb-6 mt-8">{TAB_JUDUL.kewarganegaraan}</h1>
              <table className="w-full text-[10px] border-collapse border border-black">
                <thead>
                  <tr className="text-center">
                    <th rowSpan={3} className="border border-black px-1 py-1">Kewarganegaraan</th>
                    <th colSpan={tingkatList.length * 2} className="border border-black px-1 py-1">Murid Kelas</th>
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
                      <Fragment key={t}>
                        <th className="border border-black px-1 py-1 w-8">L</th>
                        <th className="border border-black px-1 py-1 w-8">P</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {KATEGORI_KEWARGANEGARAAN.map((kat) => {
                    const total = totalBaris(dataKewarganegaraan[kat] || {})
                    return (
                      <tr key={kat}>
                        <td className="border border-black px-1 py-1">{kat}</td>
                        {tingkatList.map((t) => (
                          <Fragment key={t}>
                            <td className="border border-black px-1 py-1 text-center">
                              {dataKewarganegaraan[kat]?.[t]?.L || ''}
                            </td>
                            <td className="border border-black px-1 py-1 text-center">
                              {dataKewarganegaraan[kat]?.[t]?.P || ''}
                            </td>
                          </Fragment>
                        ))}
                        <td className="border border-black px-1 py-1 text-center">{total.L}</td>
                        <td className="border border-black px-1 py-1 text-center">{total.P}</td>
                        <td className="border border-black px-1 py-1 text-center">{total.TOTAL}</td>
                      </tr>
                    )
                  })}
                  <tr className="font-semibold">
                    <td className="border border-black px-1 py-1">Jumlah</td>
                    {tingkatList.map((t) => (
                      <Fragment key={t}>
                        <td className="border border-black px-1 py-1 text-center">
                          {totalPerTingkatKewarganegaraan[t]?.L || ''}
                        </td>
                        <td className="border border-black px-1 py-1 text-center">
                          {totalPerTingkatKewarganegaraan[t]?.P || ''}
                        </td>
                      </Fragment>
                    ))}
                    <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanKewarganegaraan.L}</td>
                    <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanKewarganegaraan.P}</td>
                    <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanKewarganegaraan.TOTAL}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        <TandaTangan />
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

        /* Di layar: hanya bagian tab aktif yang tampil; input isian
           terlihat, angka statis (untuk versi cetak) disembunyikan. */
        .laporan-section.tab-nonaktif { display: none; }
        .only-print { display: none; }

        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .sel-mutasi { display: none !important; }
          .only-print { display: inline !important; }

          /* Saat dicetak: SEMUA bagian laporan tampil berurutan, sesuai
             dokumen referensi (Keadaan → Usia → Agama → Kewarganegaraan),
             bukan hanya tab yang sedang aktif di layar. */
          .laporan-section.tab-nonaktif { display: block !important; }
          .page-break-before-print { break-before: page; page-break-before: always; }
        }
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
      `}</style>
    </div>
  )
}
