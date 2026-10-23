// src/pages/RaporKumer.jsx
//
// Raport Kumer — halaman input nilai SEDERHANA untuk guru, satu layar saja:
//   pilih Kompetensi (Pengetahuan / Keterampilan) + Kelas + Mapel + Semester +
//   Tahun Ajaran -> isi Tugas / UTS / UAS -> Nilai Akhir, Predikat & Deskripsi
//   terisi otomatis -> Simpan.
//
// Deskripsi Capaian: ada dropdown pilihan siap pakai per jenjang (Kelas 1–6 SD
// dan Kelas 7–9 SMP) + predikat, dan tetap bisa diketik/diedit manual.
//   - Pengetahuan : pilihan dari utils/deskripsiCapaian.js
//   - Keterampilan: pilihan dari utils/deskripsiKeterampilan.js (menyesuaikan
//     jenis mapel: PJOK, Seni, Bahasa, Matematika, IPA/IPS, Agama)
// Kolom yang dikosongkan terisi otomatis menurut predikat saat disimpan.
//
// SINKRON DENGAN HALAMAN LAMA (tanpa tabel baru):
//   - Tugas/UTS/UAS disimpan ke tabel `nilai` (kompetensi 'Pengetahuan' atau
//     'Keterampilan'), jadi langsung muncul di halaman Nilai lama (tab Input / Lihat & Hapus).
//   - Nilai Akhir, Predikat & Deskripsi disimpan ke tabel `capaian_mapel`
//     (jenis 'Pengetahuan' atau 'Keterampilan'), jadi langsung muncul di Rapor lama
//     (tab Rekap Nilai, Deskripsi Capaian) dan halaman cetaknya.
//   - Sebaliknya, nilai yang sudah pernah diinput lewat halaman lama
//     otomatis tampil di sini saat halaman dibuka.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { Loader2, Save, Printer } from 'lucide-react'
import { MAPEL_IJAZAH } from '../components/IjazahPrintTemplate'
import { kanonikkanOpsiMapel, TOKEN_IPAS_GABUNGAN } from '../utils/mapelIjazahAlias'
import { JENJANG_OPTS, tebakJenjang, opsiDeskripsi } from '../utils/deskripsiCapaian'
import { opsiDeskripsiKeterampilan, deskripsiKeterampilanOtomatis } from '../utils/deskripsiKeterampilan'
import PilihDeskripsi from '../components/PilihDeskripsi'

// Dua jenis kompetensi yang bisa diinput di halaman ini.
const KOMPETENSI_OPTS = ['Pengetahuan', 'Keterampilan']

const KOLOM_NILAI = [
  { key: 'Tugas', label: 'Tugas' },
  { key: 'UTS', label: 'UTS' },
  { key: 'UAS', label: 'UAS' },
]

// Sama persis dengan Rapor.jsx & Nilai.jsx: Tugas 20% + UTS 30% + UAS 50%.
// Komponen yang kosong dilewati dan bobot sisanya dinormalisasi.
const BOBOT_JENIS_NILAI = { Tugas: 0.2, UTS: 0.3, UAS: 0.5 }

function nilaiAkhirTertimbang(perJenis) {
  let totalNilaiBerbobot = 0
  let totalBobotTerpakai = 0
  for (const [jenis, bobot] of Object.entries(BOBOT_JENIS_NILAI)) {
    const arr = perJenis[jenis]
    if (arr && arr.length > 0) {
      const rataJenis = arr.reduce((a, b) => a + b, 0) / arr.length
      totalNilaiBerbobot += rataJenis * bobot
      totalBobotTerpakai += bobot
    }
  }
  if (totalBobotTerpakai === 0) return null
  return totalNilaiBerbobot / totalBobotTerpakai
}

function predikatDariNilai(nilai) {
  if (nilai === '' || nilai === undefined || nilai === null) return null
  const n = Number(nilai)
  if (isNaN(n)) return null
  if (n >= 90) return 'A'
  if (n >= 75) return 'B'
  if (n >= 60) return 'C'
  return 'D'
}

const WARNA_PREDIKAT = {
  A: 'bg-sage-500/15 text-sage-500',
  B: 'bg-blue-500/15 text-blue-600',
  C: 'bg-amber-500/15 text-amber-600',
  D: 'bg-red-500/15 text-red-600',
}

// Deskripsi capaian otomatis menurut predikat (sama dengan template di Rapor.jsx).
// Dipakai saat kolom Deskripsi dikosongkan; guru boleh menimpanya kapan saja.
const DESKRIPSI_OTOMATIS = {
  A: (m) =>
    `Ananda menunjukkan penguasaan yang sangat baik pada mata pelajaran ${m}, mampu memahami dan menerapkan konsep dengan tepat, serta menunjukkan inisiatif dan rasa ingin tahu yang tinggi dalam pembelajaran.`,
  B: (m) =>
    `Ananda menunjukkan pemahaman yang baik pada mata pelajaran ${m}, mampu mengikuti pembelajaran dengan baik dan menyelesaikan sebagian besar tugas dengan tepat waktu.`,
  C: (m) =>
    `Ananda menunjukkan pemahaman yang cukup pada mata pelajaran ${m}. Dengan bimbingan dan latihan lebih lanjut, ananda diharapkan dapat meningkatkan pemahamannya.`,
  D: (m) =>
    `Ananda masih memerlukan bimbingan lebih lanjut pada mata pelajaran ${m} untuk dapat memahami materi secara optimal. Diperlukan perhatian dan pendampingan yang lebih intensif.`,
}

function pecahMapel(raw) {
  if (!raw) return []
  return [...new Set(raw.split(/[,/]+/).map((m) => m.trim()).filter(Boolean))]
}

function tahunAjaranOptions() {
  const now = new Date()
  const tahunMulai = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return [-1, 0, 1].map((offset) => {
    const awal = tahunMulai + offset
    return `${awal}/${awal + 1}`
  })
}

const TA_OPTS = tahunAjaranOptions()

// Label resmi mapel yang dipakai di tabel `nilai` & `capaian_mapel` untuk pilihan
// dropdown — 1 label biasa, atau 2 label (IPA & IPS) kalau yang dipilih IPAS gabungan.
function labelResmiUntukPilihan(valuePilihan) {
  if (valuePilihan === TOKEN_IPAS_GABUNGAN) {
    return [
      MAPEL_IJAZAH.find((m) => m.key === 'ipa').label,
      MAPEL_IJAZAH.find((m) => m.key === 'ips').label,
    ]
  }
  const m = MAPEL_IJAZAH.find((mp) => mp.key === valuePilihan)
  return m ? [m.label] : []
}

function hitungAkhir(r) {
  const perJenis = { Tugas: [], UTS: [], UAS: [] }
  KOLOM_NILAI.forEach((k) => {
    if (r[k.key] !== '' && !isNaN(Number(r[k.key]))) perJenis[k.key].push(Number(r[k.key]))
  })
  const a = nilaiAkhirTertimbang(perJenis)
  return a === null ? null : Math.round(a)
}

export default function RaporKumer() {
  const { profil, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [kompetensi, setKompetensi] = useState('Pengetahuan') // 'Pengetahuan' | 'Keterampilan'
  const [kelasList, setKelasList] = useState([])
  const [kelasId, setKelasId] = useState('')
  const [siswaList, setSiswaList] = useState([])
  const [mapelOpts, setMapelOpts] = useState([]) // [{value, label}]
  const [mapelTidakDikenal, setMapelTidakDikenal] = useState([])
  const [mataPelajaran, setMataPelajaran] = useState('')
  const [semester, setSemester] = useState('Ganjil')
  const [tahunAjaran, setTahunAjaran] = useState(TA_OPTS[1])
  const [jenjang, setJenjang] = useState('') // '1'..'9' untuk dropdown deskripsi

  // Tiap baris: { siswaId, nama, Tugas, UTS, UAS, deskripsi } (semua string)
  const [baris, setBaris] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pesan, setPesan] = useState(null) // { tipe: 'ok' | 'galat', teks }

  // `${siswaId}|${labelMapel}` -> id baris capaian_mapel yang sudah ada
  const capaianIdRef = useRef({})

  const adalahKeterampilan = kompetensi === 'Keterampilan'

  // ---- Kelas (guru: kelas yang dia wali-i; admin: semua kelas) ----
  useEffect(() => {
    if (profil === undefined) return
    let query = supabase.from('kelas').select('id, nama_kelas').order('nama_kelas')
    if (!isAdmin) {
      query = query.eq('wali_kelas_id', profil?.guru_id || null)
    }
    query.then(({ data }) => {
      setKelasList(data || [])
      if (data?.length) setKelasId(data[0].id)
    })
  }, [isAdmin, profil])

  // ---- Jenjang otomatis ditebak dari nama kelas (bisa diganti manual) ----
  useEffect(() => {
    const k = kelasList.find((x) => x.id === kelasId)
    setJenjang(tebakJenjang(k?.nama_kelas) || '')
  }, [kelasId, kelasList])

  // ---- Mapel: guru -> mapel di profilnya (dikanonikkan ke nama resmi ijazah,
  // sama seperti halaman Nilai); admin -> semua mapel resmi ----
  useEffect(() => {
    if (profil === undefined) return

    if (isAdmin) {
      const semua = MAPEL_IJAZAH.map((m) => ({ value: m.key, label: m.label }))
      setMapelOpts(semua)
      setMapelTidakDikenal([])
      setMataPelajaran((prev) => (semua.some((o) => o.value === prev) ? prev : semua[0]?.value || ''))
      return
    }

    if (!profil?.guru_id) {
      setMapelOpts([])
      setMapelTidakDikenal([])
      return
    }

    supabase
      .from('guru')
      .select('mata_pelajaran')
      .eq('id', profil.guru_id)
      .single()
      .then(({ data }) => {
        const { opsi, tidakDikenal } = kanonikkanOpsiMapel(pecahMapel(data?.mata_pelajaran))
        setMapelOpts(opsi)
        setMapelTidakDikenal(tidakDikenal)
        setMataPelajaran((prev) => (opsi.some((o) => o.value === prev) ? prev : opsi[0]?.value || ''))
      })
  }, [profil, isAdmin])

  // ---- Siswa aktif di kelas terpilih ----
  useEffect(() => {
    if (!kelasId) {
      setSiswaList([])
      return
    }
    supabase
      .from('siswa')
      .select('id, nama_lengkap, nis')
      .eq('kelas_id', kelasId)
      .eq('status', 'aktif')
      .order('nama_lengkap')
      .then(({ data }) => setSiswaList(data || []))
  }, [kelasId])

  // ---- Muat nilai yang sudah ada (dari halaman lama maupun dari sini) ----
  useEffect(() => {
    muatData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siswaList, mataPelajaran, semester, tahunAjaran, kompetensi])

  async function muatData() {
    const labelList = labelResmiUntukPilihan(mataPelajaran)
    const labelUtama = labelList[0]
    if (!labelUtama || siswaList.length === 0) {
      setBaris([])
      return
    }
    setLoading(true)
    setPesan(null)
    const ids = siswaList.map((s) => s.id)

    const [nilaiRes, capRes] = await Promise.all([
      supabase
        .from('nilai')
        .select('siswa_id, jenis, nilai')
        .eq('mata_pelajaran', labelUtama)
        .eq('kompetensi', kompetensi)
        .eq('semester', semester)
        .eq('tahun_ajaran', tahunAjaran)
        .in('siswa_id', ids),
      supabase
        .from('capaian_mapel')
        .select('id, siswa_id, mata_pelajaran, deskripsi_capaian')
        .in('mata_pelajaran', labelList)
        .eq('jenis', kompetensi)
        .eq('semester', semester)
        .eq('tahun_ajaran', tahunAjaran)
        .in('siswa_id', ids),
    ])

    if (nilaiRes.error || capRes.error) {
      setPesan({ tipe: 'galat', teks: 'Gagal memuat data: ' + (nilaiRes.error || capRes.error).message })
      setBaris([])
      setLoading(false)
      return
    }

    const idMap = {}
    const deskripsiMap = {}
    ;(capRes.data || []).forEach((c) => {
      idMap[`${c.siswa_id}|${c.mata_pelajaran}`] = c.id
      if (c.mata_pelajaran === labelUtama) deskripsiMap[c.siswa_id] = c.deskripsi_capaian || ''
    })
    capaianIdRef.current = idMap

    const nilaiMap = {}
    ;(nilaiRes.data || []).forEach((n) => {
      if (!nilaiMap[n.siswa_id]) nilaiMap[n.siswa_id] = {}
      nilaiMap[n.siswa_id][n.jenis] = String(n.nilai)
    })

    setBaris(
      siswaList.map((s) => ({
        siswaId: s.id,
        nama: s.nama_lengkap,
        Tugas: nilaiMap[s.id]?.Tugas ?? '',
        UTS: nilaiMap[s.id]?.UTS ?? '',
        UAS: nilaiMap[s.id]?.UAS ?? '',
        deskripsi: deskripsiMap[s.id] ?? '',
      }))
    )
    setLoading(false)
  }

  function ubahBaris(index, field, value) {
    setPesan(null)
    setBaris((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  // Enter = pindah ke baris berikutnya di kolom yang sama (input cepat ala spreadsheet)
  function enterKeBawah(e, r, c) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const next = document.querySelector(`[data-r="${r + 1}"][data-c="${c}"]`)
    if (next) {
      next.focus()
      if (next.select) next.select()
    }
  }

  async function simpan() {
    const labelList = labelResmiUntukPilihan(mataPelajaran)
    if (labelList.length === 0) return alert('Pilih mata pelajaran terlebih dahulu.')

    for (const r of baris) {
      for (const k of KOLOM_NILAI) {
        const v = r[k.key]
        if (v === '') continue
        const n = Number(v)
        if (isNaN(n) || n < 0 || n > 100) {
          return alert(`Nilai ${k.label} untuk ${r.nama} harus berupa angka 0–100.`)
        }
      }
    }

    const namaMapel = mapelOpts.find((o) => o.value === mataPelajaran)?.label || labelList[0]
    const nilaiRows = []
    const capRows = []

    baris.forEach((r) => {
      KOLOM_NILAI.forEach((k) => {
        if (r[k.key] === '') return
        // IPAS gabungan: nilai yang sama disimpan untuk kedua label (IPA & IPS)
        labelList.forEach((label) => {
          nilaiRows.push({
            siswa_id: r.siswaId,
            mata_pelajaran: label,
            jenis: k.key,
            kompetensi,
            semester,
            tahun_ajaran: tahunAjaran,
            nilai: Number(r[k.key]),
            predikat: predikatDariNilai(r[k.key]),
            diisi_oleh: profil?.guru_id || null,
          })
        })
      })

      const akhir = hitungAkhir(r)
      if (akhir !== null) {
        const predikat = predikatDariNilai(akhir)
        capRows.push({
          siswaId: r.siswaId,
          akhir,
          predikat,
          deskripsi:
            r.deskripsi.trim() ||
            (adalahKeterampilan
              ? deskripsiKeterampilanOtomatis(predikat, namaMapel, jenjang)
              : DESKRIPSI_OTOMATIS[predikat](namaMapel)),
        })
      }
    })

    if (nilaiRows.length === 0) return alert('Belum ada nilai yang diisi untuk disimpan.')

    setSaving(true)
    setPesan(null)
    const gagal = []

    // 1) Tabel `nilai` (sinkron ke halaman Nilai lama)
    const { data: dataNilai, error: errNilai } = await supabase
      .from('nilai')
      .upsert(nilaiRows, { onConflict: 'siswa_id,mata_pelajaran,jenis,kompetensi,semester,tahun_ajaran' })
      .select()

    if (errNilai) {
      gagal.push('Nilai: ' + errNilai.message)
    } else if (!dataNilai || dataNilai.length !== nilaiRows.length) {
      gagal.push(
        `Hanya ${dataNilai?.length || 0} dari ${nilaiRows.length} nilai yang tersimpan — kemungkinan kebijakan RLS pada tabel "nilai" belum mengizinkan INSERT/UPDATE.`
      )
    }

    // 2) Tabel `capaian_mapel` (sinkron ke Rapor lama) — dilewati kalau langkah 1 gagal
    if (gagal.length === 0 && capRows.length > 0) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const inserts = []
      const updates = []
      capRows.forEach((c) => {
        labelList.forEach((label) => {
          const id = capaianIdRef.current[`${c.siswaId}|${label}`]
          if (id) {
            updates.push({ id, nilai_akhir: c.akhir, predikat: c.predikat, deskripsi_capaian: c.deskripsi })
          } else {
            inserts.push({
              siswa_id: c.siswaId,
              mata_pelajaran: label,
              jenis: kompetensi,
              semester,
              tahun_ajaran: tahunAjaran,
              nilai_akhir: c.akhir,
              predikat: c.predikat,
              deskripsi_capaian: c.deskripsi,
              diisi_oleh: user?.id,
            })
          }
        })
      })

      if (inserts.length > 0) {
        const { data, error } = await supabase.from('capaian_mapel').insert(inserts).select()
        if (error) gagal.push('Rapor: ' + error.message)
        else if (!data || data.length !== inserts.length) {
          gagal.push(
            `Rapor: hanya ${data?.length || 0} dari ${inserts.length} baris baru yang tersimpan — kemungkinan kebijakan RLS pada tabel capaian_mapel belum mengizinkan INSERT.`
          )
        }
      }

      const hasilUpdate = await Promise.all(
        updates.map((u) =>
          supabase
            .from('capaian_mapel')
            .update({ nilai_akhir: u.nilai_akhir, predikat: u.predikat, deskripsi_capaian: u.deskripsi_capaian })
            .eq('id', u.id)
            .select()
        )
      )
      hasilUpdate.forEach((res) => {
        if (res.error) gagal.push('Rapor: ' + res.error.message)
        else if (!res.data || res.data.length === 0) {
          gagal.push('Rapor: sebagian baris tidak ter-update — kemungkinan kebijakan RLS pada tabel capaian_mapel belum mengizinkan UPDATE.')
        }
      })
    }

    setSaving(false)

    if (gagal.length > 0) {
      setPesan({ tipe: 'galat', teks: [...new Set(gagal)].join(' ') })
    } else {
      setPesan({
        tipe: 'ok',
        teks: `Nilai ${kompetensi} tersimpan untuk ${capRows.length} siswa — sudah masuk ke Nilai dan Rapor (${namaMapel}, Semester ${semester} ${tahunAjaran}).`,
      })
    }
    await muatData()
  }

  function bukaCetak(siswaId) {
    const params = new URLSearchParams({ siswaId, semester, tahunAjaran })
    navigate(`/rapor/cetak?${params.toString()}`)
  }

  const namaMapelTerpilih = mapelOpts.find((o) => o.value === mataPelajaran)?.label || ''

  return (
    <Layout title="Raport Kumer" subtitle="Input nilai cepat — otomatis sinkron dengan Nilai & Rapor">
      {mapelTidakDikenal.length > 0 && (
        <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Mapel berikut di profil Anda tidak dikenali sistem dan disembunyikan dari dropdown:{' '}
          <b>{mapelTidakDikenal.join(', ')}</b>. Mohon perbaiki penulisannya di halaman Data Guru.
        </div>
      )}

      {/* Pilihan kompetensi: Pengetahuan / Keterampilan */}
      <div className="flex gap-1 mb-4 border-b border-ink-950/10">
        {KOMPETENSI_OPTS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKompetensi(k)}
            disabled={saving}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              kompetensi === k
                ? 'border-brass-500 text-brass-600'
                : 'border-transparent text-ink-700/60 hover:text-ink-950'
            }`}
          >
            Nilai {k}
          </button>
        ))}
      </div>

      <div className="card p-5 mb-5 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="label-field">Kelas</label>
          <select className="input-field" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
            {kelasList.length === 0 && <option value="">Belum ada kelas</option>}
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_kelas}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Mata Pelajaran</label>
          <select
            className="input-field"
            value={mataPelajaran}
            onChange={(e) => setMataPelajaran(e.target.value)}
            disabled={mapelOpts.length === 0}
          >
            {mapelOpts.length === 0 && <option value="">Belum ada mapel dikenali di profil guru</option>}
            {mapelOpts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Semester</label>
          <select className="input-field" value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
        <div>
          <label className="label-field">Tahun Ajaran</label>
          <select className="input-field" value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)}>
            {TA_OPTS.map((ta) => (
              <option key={ta} value={ta}>
                {ta}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Jenjang (Deskripsi)</label>
          <select className="input-field" value={jenjang} onChange={(e) => setJenjang(e.target.value)}>
            <option value="">Pilih jenjang</option>
            {JENJANG_OPTS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-ink-700/50 mb-3">
        Isi Tugas, UTS, dan UAS (0–100) untuk nilai <b>{kompetensi}</b>. Nilai Akhir = Tugas 20% + UTS 30% + UAS 50%;
        komponen yang dikosongkan dilewati. Predikat terisi otomatis.{' '}
        Deskripsi bisa dipilih dari dropdown (sesuai jenjang, predikat
        {adalahKeterampilan ? ', dan jenis mapel' : ''}), diketik sendiri, atau dikosongkan agar terisi otomatis.{' '}
        Tekan Enter untuk pindah ke siswa berikutnya.
      </p>

      {pesan && (
        <div
          className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            pesan.tipe === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          {pesan.teks}
        </div>
      )}

      <div className="card p-0 overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Nama Siswa</th>
              {KOLOM_NILAI.map((k) => (
                <th key={k.key} className="w-24 text-center">
                  {k.label}
                </th>
              ))}
              <th className="w-20 text-center">Akhir</th>
              <th className="w-20 text-center">Predikat</th>
              <th className="min-w-[300px]">Deskripsi Capaian ({kompetensi})</th>
              <th className="w-12 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-ink-700/50">
                  Memuat...
                </td>
              </tr>
            )}
            {!loading && mapelOpts.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-ink-700/50">
                  Belum ada mapel dikenali di profil guru.
                </td>
              </tr>
            )}
            {!loading && mapelOpts.length > 0 && baris.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-ink-700/50">
                  Belum ada siswa aktif di kelas ini.
                </td>
              </tr>
            )}
            {!loading &&
              baris.map((r, idx) => {
                const akhir = hitungAkhir(r)
                const predikat = predikatDariNilai(akhir)
                const pilihanDeskripsi =
                  jenjang && predikat
                    ? adalahKeterampilan
                      ? opsiDeskripsiKeterampilan(jenjang, predikat, namaMapelTerpilih)
                      : opsiDeskripsi(jenjang, predikat, namaMapelTerpilih)
                    : []
                return (
                  <tr key={r.siswaId}>
                    <td className="font-medium whitespace-nowrap">{r.nama}</td>
                    {KOLOM_NILAI.map((k, c) => (
                      <td key={k.key}>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={100}
                          data-r={idx}
                          data-c={c}
                          className="input-field !py-1 text-center"
                          value={r[k.key]}
                          onChange={(e) => ubahBaris(idx, k.key, e.target.value)}
                          onKeyDown={(e) => enterKeBawah(e, idx, c)}
                        />
                      </td>
                    ))}
                    <td className="text-center font-semibold">{akhir ?? '—'}</td>
                    <td className="text-center">
                      {predikat ? (
                        <span className={`badge ${WARNA_PREDIKAT[predikat]}`}>{predikat}</span>
                      ) : (
                        <span className="text-xs text-ink-700/40">—</span>
                      )}
                    </td>
                    <td>
                      <PilihDeskripsi
                        opsi={pilihanDeskripsi}
                        jenjang={jenjang}
                        predikat={predikat}
                        onPilih={(teks) => ubahBaris(idx, 'deskripsi', teks)}
                      />
                      <textarea
                        rows={2}
                        className="input-field !py-1 text-xs"
                        placeholder={
                          akhir !== null ? 'Pilih dari dropdown, ketik sendiri, atau kosongkan (otomatis)' : ''
                        }
                        value={r.deskripsi}
                        onChange={(e) => ubahBaris(idx, 'deskripsi', e.target.value)}
                      />
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        onClick={() => bukaCetak(r.siswaId)}
                        title="Cetak rapor siswa ini"
                        className="p-1.5 rounded-lg text-ink-700/60 hover:bg-ink-950/5 transition-colors"
                      >
                        <Printer size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {baris.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={simpan} disabled={saving || loading}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Nilai {kompetensi} &amp; Rapor
          </button>
        </div>
      )}
    </Layout>
  )
}
