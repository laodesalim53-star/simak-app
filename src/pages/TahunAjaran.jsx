import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarRange, Check, Plus, Trash2, TrendingUp } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  akhiranKelas,
  angkaTingkat,
  btnPrimer,
  btnSekunder,
  inputCls,
  namaSiswa,
  nisnSiswa,
  urutKelas,
} from '../lib/akademikHelper'

// Halaman admin: (1) kelola tahun ajaran & semester, (2) wizard Kenaikan Kelas.
// Proses naik kelas memanggil RPC fn_naik_kelas (satu transaksi di database).
export default function TahunAjaran() {
  const { isAdmin, sekolahId } = useAuth()
  const [tab, setTab] = useState('tahun')
  const [daftarTA, setDaftarTA] = useState([])
  const [kelasSemua, setKelasSemua] = useState([])
  const [loading, setLoading] = useState(true)
  const [pesan, setPesan] = useState(null) // { tipe: 'ok' | 'err', teks }

  const muat = useCallback(async () => {
    if (!sekolahId) return
    setLoading(true)
    const [ta, kls] = await Promise.all([
      supabase
        .from('tahun_ajaran')
        .select('*')
        .eq('sekolah_id', sekolahId)
        .order('nama', { ascending: false })
        .order('semester', { ascending: true }),
      supabase
        .from('kelas')
        .select('id,nama_kelas,tingkat,tahun_ajaran,wali_kelas_id')
        .eq('sekolah_id', sekolahId),
    ])
    if (ta.error) setPesan({ tipe: 'err', teks: `Gagal memuat tahun ajaran: ${ta.error.message}` })
    setDaftarTA(ta.data || [])
    setKelasSemua(kls.data || [])
    setLoading(false)
  }, [sekolahId])

  useEffect(() => {
    muat()
  }, [muat])

  if (!isAdmin) {
    return (
      <Layout title="Tahun Ajaran & Kenaikan Kelas">
        <p className="text-sm text-slate-600">Halaman ini hanya untuk admin sekolah.</p>
      </Layout>
    )
  }

  return (
    <Layout
      title="Tahun Ajaran & Kenaikan Kelas"
      subtitle="Kelola tahun ajaran dan proses naik kelas / kelulusan secara massal"
    >
      <div className="mb-5 flex gap-2 border-b border-slate-200">
        {[
          ['tahun', 'Tahun Ajaran', CalendarRange],
          ['naik', 'Kenaikan Kelas', TrendingUp],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => {
              setTab(id)
              setPesan(null)
            }}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
              tab === id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {pesan && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            pesan.tipe === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {pesan.teks}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Memuat…</p>
      ) : tab === 'tahun' ? (
        <TabTahunAjaran
          sekolahId={sekolahId}
          daftarTA={daftarTA}
          muat={muat}
          setPesan={setPesan}
        />
      ) : (
        <TabKenaikan
          sekolahId={sekolahId}
          daftarTA={daftarTA}
          kelasSemua={kelasSemua}
          muat={muat}
          setPesan={setPesan}
        />
      )}
    </Layout>
  )
}

// ---------------------------------------------------------------------
function TabTahunAjaran({ sekolahId, daftarTA, muat, setPesan }) {
  const [nama, setNama] = useState('')
  const [semester, setSemester] = useState('Ganjil')
  const [mulai, setMulai] = useState('')
  const [selesai, setSelesai] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function tambah(e) {
    e.preventDefault()
    if (!/^\d{4}\/\d{4}$/.test(nama.trim())) {
      setPesan({ tipe: 'err', teks: 'Format tahun ajaran harus seperti 2026/2027.' })
      return
    }
    setSibuk(true)
    const { error } = await supabase.from('tahun_ajaran').insert({
      sekolah_id: sekolahId,
      nama: nama.trim(),
      semester,
      tanggal_mulai: mulai || null,
      tanggal_selesai: selesai || null,
    })
    setSibuk(false)
    if (error) {
      setPesan({
        tipe: 'err',
        teks: error.code === '23505' ? 'Tahun ajaran dan semester itu sudah ada.' : error.message,
      })
      return
    }
    setPesan({ tipe: 'ok', teks: `Tahun ajaran ${nama.trim()} ${semester} ditambahkan.` })
    setNama('')
    setMulai('')
    setSelesai('')
    muat()
  }

  async function jadikanAktif(row) {
    setSibuk(true)
    // nonaktifkan dulu supaya tidak melanggar indeks unik "satu aktif per sekolah"
    const a = await supabase
      .from('tahun_ajaran')
      .update({ aktif: false })
      .eq('sekolah_id', sekolahId)
      .eq('aktif', true)
    const b = a.error
      ? a
      : await supabase.from('tahun_ajaran').update({ aktif: true }).eq('id', row.id)
    setSibuk(false)
    if (b.error) {
      setPesan({ tipe: 'err', teks: b.error.message })
      return
    }
    setPesan({ tipe: 'ok', teks: `${row.nama} ${row.semester} sekarang aktif.` })
    muat()
  }

  async function hapus(row) {
    if (!window.confirm(`Hapus ${row.nama} semester ${row.semester}?`)) return
    const { error } = await supabase.from('tahun_ajaran').delete().eq('id', row.id)
    if (error) {
      setPesan({ tipe: 'err', teks: error.message })
      return
    }
    muat()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form
        onSubmit={tambah}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1"
      >
        <h3 className="font-semibold text-slate-800">Tambah Tahun Ajaran</h3>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tahun ajaran</label>
          <input
            className={inputCls}
            placeholder="2026/2027"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Semester</label>
          <select className={inputCls} value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option>Ganjil</option>
            <option>Genap</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Mulai</label>
            <input type="date" className={inputCls} value={mulai} onChange={(e) => setMulai(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Selesai</label>
            <input type="date" className={inputCls} value={selesai} onChange={(e) => setSelesai(e.target.value)} />
          </div>
        </div>
        <button type="submit" disabled={sibuk} className={`${btnPrimer} w-full`}>
          <Plus size={16} /> Tambah
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h3 className="mb-3 font-semibold text-slate-800">Daftar Tahun Ajaran</h3>
        {daftarTA.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada tahun ajaran. Tambahkan lewat formulir di samping.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {daftarTA.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">
                    {row.nama} · {row.semester}
                    {row.aktif && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Aktif
                      </span>
                    )}
                  </p>
                  {(row.tanggal_mulai || row.tanggal_selesai) && (
                    <p className="text-xs text-slate-500">
                      {row.tanggal_mulai || '?'} s/d {row.tanggal_selesai || '?'}
                    </p>
                  )}
                </div>
                {!row.aktif && (
                  <>
                    <button className={btnSekunder} disabled={sibuk} onClick={() => jadikanAktif(row)}>
                      <Check size={14} /> Jadikan aktif
                    </button>
                    <button
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      title="Hapus"
                      onClick={() => hapus(row)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
function TabKenaikan({ sekolahId, daftarTA, kelasSemua, muat, setPesan }) {
  // Nilai tahun ajaran diambil dari kelas.tahun_ajaran (itu yang dipakai halaman Kelas)
  // ditambah dari tabel tahun_ajaran.
  const opsiTA = useMemo(() => {
    const s = new Set()
    kelasSemua.forEach((k) => k.tahun_ajaran && s.add(k.tahun_ajaran))
    daftarTA.forEach((t) => s.add(t.nama))
    return [...s].sort().reverse()
  }, [kelasSemua, daftarTA])

  const [taAsal, setTaAsal] = useState('')
  const [taTujuan, setTaTujuan] = useState('')
  const [siswa, setSiswa] = useState([])
  const [tujuan, setTujuan] = useState({}) // kelasAsalId -> kelasTujuanId | 'LULUS' | ''
  const [tinggal, setTinggal] = useState(() => new Set())
  const [aktifkan, setAktifkan] = useState(true)
  const [sibuk, setSibuk] = useState(false)

  const kelasAsal = useMemo(
    () => kelasSemua.filter((k) => k.tahun_ajaran === taAsal).sort(urutKelas),
    [kelasSemua, taAsal]
  )
  const kelasTujuan = useMemo(
    () => kelasSemua.filter((k) => k.tahun_ajaran === taTujuan).sort(urutKelas),
    [kelasSemua, taTujuan]
  )

  // Cari kelas tujuan dengan tingkat tertentu, utamakan yang akhiran namanya sama (3A -> 4A)
  const cariTujuan = useCallback(
    (kelas, tingkatTarget) => {
      const kandidat = kelasTujuan.filter((k) => angkaTingkat(k.tingkat) === tingkatTarget)
      return (
        kandidat.find((k) => akhiranKelas(k.nama_kelas) === akhiranKelas(kelas.nama_kelas)) ||
        kandidat[0] ||
        null
      )
    },
    [kelasTujuan]
  )

  // Siswa aktif di kelas asal
  useEffect(() => {
    setTinggal(new Set())
    if (kelasAsal.length === 0) {
      setSiswa([])
      return
    }
    let batal = false
    supabase
      .from('siswa')
      .select('*')
      .in('kelas_id', kelasAsal.map((k) => k.id))
      .eq('status_siswa', 'aktif')
      .then(({ data, error }) => {
        if (batal) return
        if (error) setPesan({ tipe: 'err', teks: `Gagal memuat siswa: ${error.message}` })
        setSiswa(data || [])
      })
    return () => {
      batal = true
    }
  }, [kelasAsal, setPesan])

  // Tebakan awal tujuan tiap kelas: tingkat tertinggi -> lulus, lainnya -> tingkat + 1
  useEffect(() => {
    const maks = Math.max(0, ...kelasAsal.map((k) => angkaTingkat(k.tingkat) ?? 0))
    const awal = {}
    kelasAsal.forEach((k) => {
      const t = angkaTingkat(k.tingkat)
      if (t == null) {
        awal[k.id] = ''
      } else if (t === maks) {
        awal[k.id] = 'LULUS'
      } else {
        awal[k.id] = cariTujuan(k, t + 1)?.id || ''
      }
    })
    setTujuan(awal)
  }, [kelasAsal, cariTujuan])

  function toggleTinggal(id) {
    setTinggal((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  // Susun rencana + hitung masalah
  const { rencana, ringkas, masalah } = useMemo(() => {
    const rencana = []
    const masalah = []
    const ringkas = { naik: 0, tinggal: 0, lulus: 0 }
    kelasAsal.forEach((k) => {
      const siswaKelas = siswa.filter((s) => s.kelas_id === k.id)
      if (siswaKelas.length === 0) return
      const pilihan = tujuan[k.id]
      const kelasTinggal = cariTujuan(k, angkaTingkat(k.tingkat))
      siswaKelas.forEach((s) => {
        if (tinggal.has(s.id)) {
          if (!kelasTinggal) {
            masalah.push(`Kelas tujuan untuk siswa tinggal kelas di ${k.nama_kelas} belum ada.`)
            return
          }
          rencana.push({ siswa_id: s.id, aksi: 'tinggal', kelas_tujuan_id: kelasTinggal.id })
          ringkas.tinggal += 1
        } else if (pilihan === 'LULUS') {
          rencana.push({ siswa_id: s.id, aksi: 'lulus', kelas_tujuan_id: null })
          ringkas.lulus += 1
        } else if (pilihan) {
          rencana.push({ siswa_id: s.id, aksi: 'naik', kelas_tujuan_id: pilihan })
          ringkas.naik += 1
        } else {
          masalah.push(`Pilih kelas tujuan untuk ${k.nama_kelas}.`)
        }
      })
    })
    return { rencana, ringkas, masalah: [...new Set(masalah)] }
  }, [kelasAsal, siswa, tujuan, tinggal, cariTujuan])

  const siap =
    taAsal && taTujuan && taAsal !== taTujuan && rencana.length > 0 && masalah.length === 0

  async function proses() {
    const ringkasan =
      `${ringkas.naik} naik, ${ringkas.tinggal} tinggal kelas, ${ringkas.lulus} lulus.\n\n` +
      `Dari ${taAsal} ke ${taTujuan}. Proses ini mengubah kelas semua siswa tersebut sekaligus. Lanjutkan?`
    if (!window.confirm(ringkasan)) return
    setSibuk(true)
    const { data, error } = await supabase.rpc('fn_naik_kelas', {
      p_sekolah_id: sekolahId,
      p_ta_asal: taAsal,
      p_ta_tujuan: taTujuan,
      p_rencana: rencana,
      p_aktifkan: aktifkan,
    })
    setSibuk(false)
    if (error) {
      setPesan({ tipe: 'err', teks: `Proses dibatalkan, tidak ada data yang berubah: ${error.message}` })
      return
    }
    setPesan({
      tipe: 'ok',
      teks: `Selesai: ${data?.naik ?? 0} naik, ${data?.tinggal ?? 0} tinggal kelas, ${data?.lulus ?? 0} lulus${
        data?.dilewati ? `, ${data.dilewati} dilewati (tidak aktif)` : ''
      }.`,
    })
    setTaAsal('')
    muat()
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tahun ajaran asal</label>
          <input
            list="opsi-ta"
            className={inputCls}
            placeholder="2025/2026"
            value={taAsal}
            onChange={(e) => setTaAsal(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tahun ajaran tujuan</label>
          <input
            list="opsi-ta"
            className={inputCls}
            placeholder="2026/2027"
            value={taTujuan}
            onChange={(e) => setTaTujuan(e.target.value)}
          />
        </div>
        <datalist id="opsi-ta">
          {opsiTA.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      {taTujuan && kelasTujuan.length === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Belum ada kelas untuk tahun ajaran {taTujuan}. Buat dulu kelas-kelas tahun baru di{' '}
            <Link to="/kelas" className="font-semibold underline">
              halaman Kelas
            </Link>{' '}
            (dengan kolom tahun ajaran {taTujuan}), lalu kembali ke sini.
          </p>
        </div>
      )}

      {taAsal && kelasAsal.length === 0 && (
        <p className="text-sm text-slate-500">Tidak ada kelas dengan tahun ajaran {taAsal}.</p>
      )}

      {kelasAsal.map((k) => {
        const siswaKelas = siswa.filter((s) => s.kelas_id === k.id)
        return (
          <div key={k.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-slate-800">{k.nama_kelas}</h4>
                <p className="text-xs text-slate-500">{siswaKelas.length} siswa aktif</p>
              </div>
              <select
                className={`${inputCls} sm:w-64`}
                value={tujuan[k.id] ?? ''}
                onChange={(e) => setTujuan((p) => ({ ...p, [k.id]: e.target.value }))}
              >
                <option value="">— pilih tujuan —</option>
                <option value="LULUS">Lulus (jadi alumni)</option>
                {kelasTujuan.map((kt) => (
                  <option key={kt.id} value={kt.id}>
                    Naik ke {kt.nama_kelas}
                  </option>
                ))}
              </select>
            </div>
            {siswaKelas.length === 0 ? (
              <p className="text-sm text-slate-400">Tidak ada siswa aktif.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3">Nama</th>
                      <th className="py-2 pr-3">NISN</th>
                      <th className="py-2 text-right">Tinggal kelas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaKelas.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-3 text-slate-800">{namaSiswa(s)}</td>
                        <td className="py-2 pr-3 text-slate-500">{nisnSiswa(s)}</td>
                        <td className="py-2 text-right">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-amber-600"
                            checked={tinggal.has(s.id)}
                            onChange={() => toggleTinggal(s.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}

      {kelasAsal.length > 0 && (
        <div className="sticky bottom-4 flex flex-wrap items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-md">
          <div className="min-w-0 flex-1 text-sm text-slate-700">
            <p className="font-semibold">
              Pratinjau: {ringkas.naik} naik · {ringkas.tinggal} tinggal kelas · {ringkas.lulus} lulus
            </p>
            {masalah.length > 0 && <p className="text-amber-700">{masalah[0]}</p>}
            {taAsal && taTujuan && taAsal === taTujuan && (
              <p className="text-amber-700">Tahun ajaran asal dan tujuan tidak boleh sama.</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={aktifkan}
              onChange={(e) => setAktifkan(e.target.checked)}
            />
            Jadikan {taTujuan || 'tahun tujuan'} (Ganjil) aktif
          </label>
          <button className={btnPrimer} disabled={!siap || sibuk} onClick={proses}>
            <TrendingUp size={16} /> {sibuk ? 'Memproses…' : 'Proses Kenaikan Kelas'}
          </button>
        </div>
      )}
    </div>
  )
}
