import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function LaporanKeadaanMurid() {
  const navigate = useNavigate()
  const { sekolahId: sekolahIdSaya } = useAuth()

  const [tab, setTab] = useState('keadaan') // 'keadaan' | 'usia' | 'agama' | 'kewarganegaraan'

  const [profilSekolah, setProfilSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)

  const [kelasList, setKelasList] = useState([])
  const [daftarSiswa, setDaftarSiswa] = useState([])
  const [tingkatList, setTingkatList] = useState([])
  const [rombelPerTingkat, setRombelPerTingkat] = useState({})

  const [masuk, setMasuk] = useState({})
  const [kelasarray, setKeluar] = useState({})

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
  const KATEGORI_KEWARGANEGARAAN = ['WNI asli', 'WNI Keturunan', 'WNA']
  const KATEGORI_AGAMA = ['Krist. Protestan', 'Krist. Katolik', 'Islam', 'Hindu', 'Budha', 'Konghucu', 'Lain-lain']

  // Normalisasi Tingkat agar Angka (1, 2, 3) dan Romawi (I, II, III) saling sinkron
  function normalisasiTingkat(val) {
    if (!val && val !== 0) return ''
    const str = String(val).trim().toUpperCase()
    const mapAngkaKeRomawi = { '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10', '11': '11', '12': '12' }
    return mapAngkaKeRomawi[str] || str
  }

  function normalisasiJK(nilai) {
    if (!nilai) return null
    const v = String(nilai).trim().toUpperCase()
    if (v === 'L' || v.startsWith('LAKI') || v === 'PRIA') return 'L'
    if (v === 'P' || v.startsWith('PER') || v === 'WANITA') return 'P'
    return null
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
    const hariIni = new Date()
    let usia = hariIni.getFullYear() - lahir.getFullYear()
    const m = hariIni.getMonth() - lahir.getMonth()
    if (m < 0 || (m === 0 && hariIni.getDate() < lahir.getDate())) {
      usia -= 1
    }
    return usia
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
        supabase.from('kelas').select('id, tingkat, nama_kelas').eq('sekolah_id', sekolahId),
        supabase
          .from('siswa')
          .select('id, kelas_id, jenis_kelamin, kewarganegaraan, agama, tanggal_lahir, status')
          .eq('sekolah_id', sekolahId),
      ])

      setProfilSekolah(sekolah || null)
      if (sekolah?.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(sekolah.logo_path)
        setLogoUrl(pub?.publicUrl || '')
      }

      const daftarKelas = kelas || []
      
      // Ambil tingkat unik
      const setTingkat = new Set()
      daftarKelas.forEach((k) => {
        const t = normalisasiTingkat(k.tingkat)
        if (t) setTingkat.add(t)
      })

      let urutTingkat = Array.from(setTingkat).sort((a, b) => {
        const na = parseInt(a, 10)
        const nb = parseInt(b, 10)
        if (!isNaN(na) && !isNaN(nb)) return na - nb
        return a.localeCompare(b)
      })

      // Jika kelas tidak memiliki tingkat di DB, buat standar 1-6
      if (urutTingkat.length === 0) urutTingkat = ['1', '2', '3', '4', '5', '6']

      const rombel = {}
      urutTingkat.forEach((t) => { rombel[t] = 0 })
      daftarKelas.forEach((k) => {
        const t = normalisasiTingkat(k.tingkat)
        if (t && rombel[t] !== undefined) rombel[t] += 1
      })

      const initMasuk = {}
      const initKeluar = {}
      urutTingkat.forEach((t) => {
        initMasuk[t] = { L: 0, P: 0 }
        initKeluar[t] = { L: 0, P: 0 }
      })

      setKelasList(daftarKelas)
      setDaftarSiswa(siswa || [])
      setTingkatList(urutTingkat)
      setRombelPerTingkat(rombel)
      setMasuk(initMasuk)
      setKeluar(initKeluar)
      setLoading(false)
    }
    muat()
  }, [sekolahIdSaya])

  // Mapping ID Kelas -> Tingkat
  const tingkatByKelasId = useMemo(() => {
    const peta = {}
    kelasList.forEach((k) => {
      const t = normalisasiTingkat(k.tingkat)
      if (t) peta[k.id] = t
    })
    return peta
  }, [kelasList])

  // Ambil Siswa Aktif (Toleran jika status di DB NULL, 'Aktif', atau 'aktif')
  const siswaAktif = useMemo(() => {
    return daftarSiswa.filter((s) => {
      if (!s.status) return true // Anggap aktif jika status kosong
      const st = String(s.status).toLowerCase().trim()
      return st === 'aktif' || st === 'aktif ' || st === ''
    })
  }, [daftarSiswa])

  // Hitung Keadaan Murid
  const akhirBulanIni = useMemo(() => {
    const counts = {}
    tingkatList.forEach((t) => { counts[t] = { L: 0, P: 0 } })
    siswaAktif.forEach((s) => {
      const t = tingkatByKelasId[s.kelas_id]
      if (!t || counts[t] === undefined) return
      const jk = normalisasiJK(s.jenis_kelamin)
      if (jk === 'L') counts[t].L += 1
      else if (jk === 'P') counts[t].P += 1
    })
    return counts
  }, [tingkatList, tingkatByKelasId, siswaAktif])

  const akhirBulanLalu = useMemo(() => {
    const hasil = {}
    tingkatList.forEach((t) => {
      const ini = akhirBulanIni[t] || { L: 0, P: 0 }
      const m = masuk[t] || { L: 0, P: 0 }
      const k = kelasarray[t] || { L: 0, P: 0 }
      hasil[t] = { L: ini.L - m.L + k.L, P: ini.P - m.P + k.P }
    })
    return hasil
  }, [tingkatList, akhirBulanIni, masuk, kelasarray])

  function updateMutasi(setter, tingkat, gender, value) {
    const n = value === '' ? 0 : Number(value)
    setter((prev) => ({ ...prev, [tingkat]: { ...prev[tingkat], [gender]: Number.isFinite(n) ? n : 0 } }))
  }

  const barisKeadaan = [
    { label: 'Jumlah Akhir Bulan Lalu', data: akhirBulanLalu, editable: false },
    { label: 'Masuk Dalam Bulan Ini', data: masuk, editable: true, setter: setMasuk },
    { label: 'Keluar Dalam Bulan Ini', data: kelasarray, editable: true, setter: setKeluar },
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

  // Hitung Usia
  const usiaKolom = useMemo(() => {
    const usiaSiswa = siswaAktif
      .map((s) => hitungUsia(s.tanggal_lahir))
      .filter((u) => u !== null && u >= 0 && u <= 25)
    let usiaMin = usiaSiswa.length ? Math.min(...usiaSiswa) : 6
    let usiaMax = usiaSiswa.length ? Math.max(...usiaSiswa) : 14
    if (usiaMax - usiaMin < 1) { usiaMin = 6; usiaMax = 14 }
    const kolom = []
    for (let u = usiaMin; u <= usiaMax; u += 1) kolom.push(u)
    return kolom
  }, [siswaAktif])

  const dataUsia = useMemo(() => {
    const data = {}
    tingkatList.forEach((t) => {
      data[t] = {}
      usiaKolom.forEach((u) => { data[t][u] = { L: 0, P: 0 } })
    })
    siswaAktif.forEach((s) => {
      const t = tingkatByKelasId[s.kelas_id]
      if (!t || !data[t]) return
      const usia = hitungUsia(s.tanggal_lahir)
      if (usia === null || data[t][usia] === undefined) return
      const jk = normalisasiJK(s.jenis_kelamin)
      if (jk === 'L') data[t][usia].L += 1
      else if (jk === 'P') data[t][usia].P += 1
    })
    return data
  }, [tingkatList, tingkatByKelasId, siswaAktif, usiaKolom])

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
  }, [tingkatList, dataUsia, usiaKolom])

  // Hitung Agama
  const dataAgama = useMemo(() => {
    const data = {}
    tingkatList.forEach((t) => {
      data[t] = {}
      KATEGORI_AGAMA.forEach((kat) => { data[t][kat] = { L: 0, P: 0 } })
    })
    siswaAktif.forEach((s) => {
      const t = tingkatByKelasId[s.kelas_id]
      if (!t || !data[t]) return
      const kat = normalisasiAgama(s.agama)
      const jk = normalisasiJK(s.jenis_kelamin)
      if (jk === 'L') data[t][kat].L += 1
      else if (jk === 'P') data[t][kat].P += 1
    })
    return data
  }, [tingkatList, tingkatByKelasId, siswaAktif])

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
  }, [tingkatList, dataAgama])

  const totalKeseluruhanAgama = useMemo(() => {
    let L = 0, P = 0
    tingkatList.forEach((t) => {
      const total = totalBarisTingkatAgama(t)
      L += total.L
      P += total.P
    })
    return { L, P, TOTAL: L + P }
  }, [tingkatList, dataAgama])

  // Hitung Kewarganegaraan
  const dataKewarganegaraan = useMemo(() => {
    const data = {}
    KATEGORI_KEWARGANEGARAAN.forEach((kat) => {
      data[kat] = {}
      tingkatList.forEach((t) => { data[kat][t] = { L: 0, P: 0 } })
    })
    siswaAktif.forEach((s) => {
      const t = tingkatByKelasId[s.kelas_id]
      if (!t) return
      const kat = normalisasiKewarganegaraan(s.kewarganegaraan)
      if (!data[kat] || !data[kat][t]) return
      const jk = normalisasiJK(s.jenis_kelamin)
      if (jk === 'L') data[kat][t].L += 1
      else if (jk === 'P') data[kat][t].P += 1
    })
    return data
  }, [tingkatList, tingkatByKelasId, siswaAktif])

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
  }, [tingkatList, dataKewarganegaraan])

  const totalKeseluruhanKewarganegaraan = useMemo(() => {
    let L = 0, P = 0
    tingkatList.forEach((t) => {
      L += totalPerTingkatKewarganegaraan[t]?.L || 0
      P += totalPerTingkatKewarganegaraan[t]?.P || 0
    })
    return { L, P, TOTAL: L + P }
  }, [tingkatList, totalPerTingkatKewarganegaraan])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="animate-spin text-slate-500" size={32} />
      </div>
    )
  }

  const KopSurat = () => (
    <div className="flex items-center gap-4 border-b-4 border-black pb-3 mb-4">
      {logoUrl && <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain shrink-0" />}
      <div className="text-center flex-1">
        <p className="text-xs font-medium uppercase">
          {profilSekolah?.dinas_pendidikan || 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
        </p>
        <p className="text-base font-bold uppercase">{profilSekolah?.nama_sekolah || 'SD NEGERI WARIA'}</p>
        <p className="text-[10px]">
          {[profilSekolah?.alamat, profilSekolah?.kecamatan, profilSekolah?.kabupaten, profilSekolah?.provinsi]
            .filter(Boolean)
            .join(', ')}
          {profilSekolah?.kode_pos ? ` ${profilSekolah.kode_pos}` : ''}
        </p>
      </div>
    </div>
  )

  const TandaTangan = () => (
    <div className="flex justify-end mt-8">
      <div className="text-center text-[10px] w-60">
        <p>
          {profilSekolah?.tempat_ttd || profilSekolah?.kecamatan || 'Waria'},{' '}
          {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
        <p className="mt-1">Mengetahui,</p>
        <p>Kepala Sekolah</p>
        <div className="h-14" />
        <p className="font-semibold underline">{profilSekolah?.kepala_sekolah || '............................'}</p>
        <p>NIP. {profilSekolah?.nip_kepala_sekolah || '............................'}</p>
      </div>
    </div>
  )

  function kelasBagian(kunciTab) {
    return `laporan-section ${tab === kunciTab ? 'block' : 'hidden print:hidden'}`
  }

  const tengah = Math.ceil(tingkatList.length / 2)
  const kolomKiri = tingkatList.slice(0, tengah)
  const kolomKanan = tingkatList.slice(tengah)

  return (
    <div className="min-h-screen bg-slate-100">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .only-print { display: inline !important; }
          .sel-mutasi { display: none !important; }
          body { background: white; }
          .lembar-cetak { shadow: none; margin: 0; width: 100% !important; padding: 0 !important; }
          .page-break-before-print { page-break-before: always; }
        }
        @media screen {
          .only-print { display: none; }
          .sel-mutasi { width: 35px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px; }
        }
      `}</style>

      {/* Toolbar Navigation */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
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
            <Printer size={16} /> Cetak Laporan
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {URUTAN_TAB.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-xs font-medium px-4 py-1.5 rounded-full border ${
                tab === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {TAB_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Lembar Cetak A4 Landscape */}
      <div className="lembar-cetak bg-white mx-auto my-6 p-8 shadow-sm" style={{ width: '297mm' }}>
        <KopSurat />

        {/* ===== TAB: KEADAAN MURID ===== */}
        <div className={kelasBagian('keadaan')}>
          <h1 className="text-center font-bold text-sm uppercase mb-1">{TAB_JUDUL.keadaan}</h1>
          <p className="text-center text-[10px] mb-4">
            Semester Ganjil/Genap Tahun Pelajaran ................./................
          </p>

          <div className="grid grid-cols-2 gap-x-8 text-[11px] mb-4 max-w-2xl mx-auto">
            <div>
              {kolomKiri.map((t) => (
                <p key={t} className="flex">
                  <span className="w-36 shrink-0">Rom. Belajar Kelas {t}</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>{rombelPerTingkat[t] ?? 0} Kelas</span>
                </p>
              ))}
            </div>
            <div>
              {kolomKanan.map((t) => (
                <p key={t} className="flex">
                  <span className="w-36 shrink-0">Rom. Belajar Kelas {t}</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>{rombelPerTingkat[t] ?? 0} Kelas</span>
                </p>
              ))}
            </div>
          </div>

          <table className="w-full text-[10px] border-collapse border border-black">
            <thead>
              <tr className="text-center bg-slate-50">
                <th rowSpan={3} className="border border-black px-1 py-1">Keterangan</th>
                <th colSpan={tingkatList.length * 2} className="border border-black px-1 py-1">Murid Kelas</th>
                <th colSpan={3} className="border border-black px-1 py-1">Jumlah</th>
              </tr>
              <tr className="text-center bg-slate-50">
                {tingkatList.map((t) => (
                  <th key={t} colSpan={2} className="border border-black px-1 py-1">{t}</th>
                ))}
                <th rowSpan={2} className="border border-black px-1 py-1 w-8">L</th>
                <th rowSpan={2} className="border border-black px-1 py-1 w-8">P</th>
                <th rowSpan={2} className="border border-black px-1 py-1 w-10">Total</th>
              </tr>
              <tr className="text-center bg-slate-50">
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
                  <tr key={b.label} className={b.tebal ? 'font-bold bg-slate-50' : ''}>
                    <td className="border border-black px-2 py-1">{b.label}</td>
                    {tingkatList.map((t) => (
                      <Fragment key={t}>
                        <td className="border border-black px-1 py-1 text-center">
                          {b.editable ? (
                            <input
                              type="number"
                              className="sel-mutasi no-print"
                              value={b.data[t]?.L || 0}
                              onChange={(e) => updateMutasi(b.setter, t, 'L', e.target.value)}
                            />
                          ) : null}
                          <span className={b.editable ? 'only-print' : ''}>{b.data[t]?.L || 0}</span>
                        </td>
                        <td className="border border-black px-1 py-1 text-center">
                          {b.editable ? (
                            <input
                              type="number"
                              className="sel-mutasi no-print"
                              value={b.data[t]?.P || 0}
                              onChange={(e) => updateMutasi(b.setter, t, 'P', e.target.value)}
                            />
                          ) : null}
                          <span className={b.editable ? 'only-print' : ''}>{b.data[t]?.P || 0}</span>
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
          <TandaTangan />
        </div>

        {/* ===== TAB: USIA ===== */}
        <div className={`${kelasBagian('usia')} page-break-before-print`}>
          <h1 className="text-center font-bold text-sm uppercase mb-6">{TAB_JUDUL.usia}</h1>
          <table className="w-full text-[10px] border-collapse border border-black">
            <thead>
              <tr className="text-center bg-slate-50">
                <th rowSpan={3} className="border border-black px-1 py-1">Kelas</th>
                <th colSpan={usiaKolom.length * 2} className="border border-black px-1 py-1">Usia</th>
                <th colSpan={3} className="border border-black px-1 py-1">Jumlah</th>
              </tr>
              <tr className="text-center bg-slate-50">
                {usiaKolom.map((u) => (
                  <th key={u} colSpan={2} className="border border-black px-1 py-1">{u} thn</th>
                ))}
                <th rowSpan={2} className="border border-black px-1 py-1 w-8">L</th>
                <th rowSpan={2} className="border border-black px-1 py-1 w-8">P</th>
                <th rowSpan={2} className="border border-black px-1 py-1 w-10">Total</th>
              </tr>
              <tr className="text-center bg-slate-50">
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
                    <td className="border border-black px-1 py-1 text-center font-medium">{t}</td>
                    {usiaKolom.map((u) => (
                      <Fragment key={u}>
                        <td className="border border-black px-1 py-1 text-center">
                          {dataUsia[t]?.[u]?.L || 0}
                        </td>
                        <td className="border border-black px-1 py-1 text-center">
                          {dataUsia[t]?.[u]?.P || 0}
                        </td>
                      </Fragment>
                    ))}
                    <td className="border border-black px-1 py-1 text-center font-semibold">{total.L}</td>
                    <td className="border border-black px-1 py-1 text-center font-semibold">{total.P}</td>
                    <td className="border border-black px-1 py-1 text-center font-bold bg-slate-50">{total.TOTAL}</td>
                  </tr>
                )
              })}
              <tr className="font-bold bg-slate-50">
                <td className="border border-black px-1 py-1 text-center">Jumlah</td>
                {usiaKolom.map((u) => (
                  <Fragment key={u}>
                    <td className="border border-black px-1 py-1 text-center">{totalKolomUsia[u]?.L || 0}</td>
                    <td className="border border-black px-1 py-1 text-center">{totalKolomUsia[u]?.P || 0}</td>
                  </Fragment>
                ))}
                <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanUsia.L}</td>
                <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanUsia.P}</td>
                <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanUsia.TOTAL}</td>
              </tr>
            </tbody>
          </table>
          <TandaTangan />
        </div>

        {/* ===== TAB: AGAMA ===== */}
        <div className={`${kelasBagian('agama')} page-break-before-print`}>
          <h1 className="text-center font-bold text-sm uppercase mb-6">{TAB_JUDUL.agama}</h1>
          <table className="w-full text-[10px] border-collapse border border-black">
            <thead>
              <tr className="text-center bg-slate-50">
                <th rowSpan={3} className="border border-black px-1 py-1">Kelas</th>
                <th colSpan={KATEGORI_AGAMA.length * 2} className="border border-black px-1 py-1">Agama</th>
                <th colSpan={3} className="border border-black px-1 py-1">Jumlah</th>
              </tr>
              <tr className="text-center bg-slate-50">
                {KATEGORI_AGAMA.map((kat) => (
                  <th key={kat} colSpan={2} className="border border-black px-1 py-1">{kat}</th>
                ))}
                <th rowSpan={2} className="border border-black px-1 py-1 w-8">L</th>
                <th rowSpan={2} className="border border-black px-1 py-1 w-8">P</th>
                <th rowSpan={2} className="border border-black px-1 py-1 w-10">Total</th>
              </tr>
              <tr className="text-center bg-slate-50">
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
                    <td className="border border-black px-1 py-1 text-center font-medium">{t}</td>
                    {KATEGORI_AGAMA.map((kat) => (
                      <Fragment key={kat}>
                        <td className="border border-black px-1 py-1 text-center">
                          {dataAgama[t]?.[kat]?.L || 0}
                        </td>
                        <td className="border border-black px-1 py-1 text-center">
                          {dataAgama[t]?.[kat]?.P || 0}
                        </td>
                      </Fragment>
                    ))}
                    <td className="border border-black px-1 py-1 text-center font-semibold">{total.L}</td>
                    <td className="border border-black px-1 py-1 text-center font-semibold">{total.P}</td>
                    <td className="border border-black px-1 py-1 text-center font-bold bg-slate-50">{total.TOTAL}</td>
                  </tr>
                )
              })}
              <tr className="font-bold bg-slate-50">
                <td className="border border-black px-1 py-1 text-center">Jumlah</td>
                {KATEGORI_AGAMA.map((kat) => (
                  <Fragment key={kat}>
                    <td className="border border-black px-1 py-1 text-center">{totalKolomAgama[kat]?.L || 0}</td>
                    <td className="border border-black px-1 py-1 text-center">{totalKolomAgama[kat]?.P || 0}</td>
                  </Fragment>
                ))}
                <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanAgama.L}</td>
                <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanAgama.P}</td>
                <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanAgama.TOTAL}</td>
              </tr>
            </tbody>
          </table>
          <TandaTangan />
        </div>

        {/* ===== TAB: KEWARGANEGARAAN ===== */}
        <div className={`${kelasBagian('kewarganegaraan')} page-break-before-print`}>
          <h1 className="text-center font-bold text-sm uppercase mb-6">{TAB_JUDUL.kewarganegaraan}</h1>
          <table className="w-full text-[10px] border-collapse border border-black">
            <thead>
              <tr className="text-center bg-slate-50">
                <th rowSpan={3} className="border border-black px-1 py-1">Kewarganegaraan</th>
                <th colSpan={tingkatList.length * 2} className="border border-black px-1 py-1">Murid Kelas</th>
                <th colSpan={3} className="border border-black px-1 py-1">Jumlah</th>
              </tr>
              <tr className="text-center bg-slate-50">
                {tingkatList.map((t) => (
                  <th key={t} colSpan={2} className="border border-black px-1 py-1">{t}</th>
                ))}
                <th rowSpan={2} className="border border-black px-1 py-1 w-8">L</th>
                <th rowSpan={2} className="border border-black px-1 py-1 w-8">P</th>
                <th rowSpan={2} className="border border-black px-1 py-1 w-10">Total</th>
              </tr>
              <tr className="text-center bg-slate-50">
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
                let totalL = 0
                let totalP = 0
                tingkatList.forEach((t) => {
                  totalL += dataKewarganegaraan[kat]?.[t]?.L || 0
                  totalP += dataKewarganegaraan[kat]?.[t]?.P || 0
                })
                return (
                  <tr key={kat}>
                    <td className="border border-black px-2 py-1 font-medium">{kat}</td>
                    {tingkatList.map((t) => (
                      <Fragment key={t}>
                        <td className="border border-black px-1 py-1 text-center">
                          {dataKewarganegaraan[kat]?.[t]?.L || 0}
                        </td>
                        <td className="border border-black px-1 py-1 text-center">
                          {dataKewarganegaraan[kat]?.[t]?.P || 0}
                        </td>
                      </Fragment>
                    ))}
                    <td className="border border-black px-1 py-1 text-center font-semibold">{totalL}</td>
                    <td className="border border-black px-1 py-1 text-center font-semibold">{totalP}</td>
                    <td className="border border-black px-1 py-1 text-center font-bold bg-slate-50">{totalL + totalP}</td>
                  </tr>
                )
              })}
              <tr className="font-bold bg-slate-50">
                <td className="border border-black px-2 py-1">Jumlah</td>
                {tingkatList.map((t) => (
                  <Fragment key={t}>
                    <td className="border border-black px-1 py-1 text-center">
                      {totalPerTingkatKewarganegaraan[t]?.L || 0}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {totalPerTingkatKewarganegaraan[t]?.P || 0}
                    </td>
                  </Fragment>
                ))}
                <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanKewarganegaraan.L}</td>
                <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanKewarganegaraan.P}</td>
                <td className="border border-black px-1 py-1 text-center">{totalKeseluruhanKewarganegaraan.TOTAL}</td>
              </tr>
            </tbody>
          </table>
          <TandaTangan />
        </div>
      </div>
    </div>
  )
}
