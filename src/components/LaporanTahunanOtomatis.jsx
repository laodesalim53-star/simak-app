// src/components/LaporanTahunanOtomatis.jsx
// Komponen tambahan untuk LaporanTahunan.jsx:
//   1) useKeadaanSekolah  -> ambil kelas + siswa aktif + guru aktif SEKALI, hitung semua rekap
//   2) TabelKeadaanMurid  -> pengganti tabel Bagian C (per tingkat, pakai kelas_id -> tingkat)
//   3) RekapGuru          -> rekap guru/tendik (jenis PTK, golongan, status NIP) + rasio
//   4) PanelOtomatis      -> panel (tidak ikut tercetak): cek kelengkapan data + tombol "Isi draf otomatis"
//   5) buatNarasi         -> draf Pendahuluan / Kendala / Tindak Lanjut dari data nyata
//
// Pola query SAMA dengan LaporanKeadaanMurid.jsx (siswa.kelas_id -> kelas.tingkat, status 'aktif'),
// jadi angkanya akan sinkron dengan laporan Keadaan Murid dan tidak perlu tabel baru.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { Th, Td } from './AdministrasiKepsekKomponen'

const URUTAN_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

const urutkanTingkat = (daftar) =>
  [...daftar].sort((a, b) => {
    const ia = URUTAN_ROMAWI.indexOf(a)
    const ib = URUTAN_ROMAWI.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b, 'id', { numeric: true })
  })

const adalahKepsek = (g) =>
  `${g.tugas_tambahan || ''} ${g.jenis_ptk || ''}`.toLowerCase().includes('kepala sekolah')

// "III/c" -> "III", "IV/a" -> "IV", kosong -> "Belum diisi"
function kelompokGolongan(teks) {
  if (!teks) return 'Belum diisi'
  const m = String(teks).toUpperCase().match(/(VIII|VII|VI|IX|IV|III|II|I|V)/)
  return m ? `Gol. ${m[1]}` : 'Belum diisi'
}

// Kategori & normalisasi sama dengan LaporanKeadaanMurid.jsx supaya angkanya sinkron.
const KATEGORI_AGAMA = ['Krist. Protestan', 'Krist. Katolik', 'Islam', 'Hindu', 'Budha', 'Konghucu', 'Lain-lain']
const KATEGORI_WN = ['WNI asli', 'WNI Keturunan', 'WNA']
const USIA_TIDAK_DIKETAHUI = 'Tidak diketahui'

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

function normalisasiWN(nilai) {
  const v = (nilai || '').toString().trim().toLowerCase()
  if (!v) return 'WNI asli'
  if (v.includes('keturunan')) return 'WNI Keturunan'
  if (v.includes('wna') || v.includes('asing')) return 'WNA'
  return 'WNI asli'
}

function hitungUsia(tanggalLahir) {
  if (!tanggalLahir) return null
  const lahir = new Date(tanggalLahir)
  if (Number.isNaN(lahir.getTime())) return null
  const now = new Date()
  let usia = now.getFullYear() - lahir.getFullYear()
  if (now.getMonth() < lahir.getMonth() || (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate())) usia -= 1
  return usia
}

const tambah = (peta, kunci, jk) => {
  peta[kunci] = peta[kunci] || { L: 0, P: 0 }
  peta[kunci][jk] += 1
}

const rp = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

// ---------------------------------------------------------------------------
// 1) Hook data
// ---------------------------------------------------------------------------
export function useKeadaanSekolah(sekolahId) {
  const [mentah, setMentah] = useState({ kelas: [], siswa: [], guru: [] })
  const [memuat, setMemuat] = useState(false)
  const [error, setError] = useState('')

  const muat = useCallback(async () => {
    if (!sekolahId) return
    setMemuat(true)
    setError('')
    const [k, s, g] = await Promise.all([
      supabase.from('kelas').select('id, tingkat').eq('sekolah_id', sekolahId),
      supabase.from('siswa').select('kelas_id, jenis_kelamin, status, agama, kewarganegaraan, tanggal_lahir').eq('sekolah_id', sekolahId).eq('status', 'aktif'),
      supabase
        .from('guru')
        .select('id, nip, nama_lengkap, pangkat_golongan, tugas_tambahan, jenis_ptk, status')
        .eq('sekolah_id', sekolahId)
        .eq('status', 'aktif'),
    ])
    const gagal = [k.error && 'kelas', s.error && 'siswa', g.error && 'guru'].filter(Boolean)
    if (gagal.length) {
      console.error('LaporanTahunan gagal memuat:', k.error || s.error || g.error)
      setError(`Gagal memuat data ${gagal.join(', ')}: ${(k.error || s.error || g.error).message}`)
    }
    setMentah({ kelas: k.data || [], siswa: s.data || [], guru: g.data || [] })
    setMemuat(false)
  }, [sekolahId])

  useEffect(() => { muat() }, [muat])

  const hasil = useMemo(() => {
    const { kelas, siswa, guru } = mentah

    // --- Murid per tingkat ---
    const tingkatById = {}
    kelas.forEach((k) => { if (k.tingkat) tingkatById[k.id] = String(k.tingkat).trim() })
    const daftarTingkat = urutkanTingkat(Array.from(new Set(Object.values(tingkatById))))
    const perTingkat = {}
    daftarTingkat.forEach((t) => { perTingkat[t] = { tingkat: t, rombel: 0, L: 0, P: 0 } })
    kelas.forEach((k) => {
      const t = k.tingkat ? String(k.tingkat).trim() : null
      if (t && perTingkat[t]) perTingkat[t].rombel += 1
    })
    let tanpaTingkat = 0
    const agamaPeta = {}
    const wnPeta = {}
    const usiaPeta = {}
    siswa.forEach((s) => {
      const t = tingkatById[s.kelas_id]
      if (!t) { tanpaTingkat += 1; return }
      const jk = String(s.jenis_kelamin || '').trim().toUpperCase()[0]
      if (jk === 'L') perTingkat[t].L += 1
      else if (jk === 'P') perTingkat[t].P += 1
      // Rekap demografi: set siswa yang sama dengan tabel per tingkat, jadi totalnya selalu cocok.
      if (jk === 'L' || jk === 'P') {
        tambah(agamaPeta, normalisasiAgama(s.agama), jk)
        tambah(wnPeta, normalisasiWN(s.kewarganegaraan), jk)
        const u = hitungUsia(s.tanggal_lahir)
        tambah(usiaPeta, u === null || u < 0 || u > 25 ? USIA_TIDAK_DIKETAHUI : u, jk)
      }
    })
    const barisTingkat = daftarTingkat.map((t) => perTingkat[t])
    const totalL = barisTingkat.reduce((a, r) => a + r.L, 0)
    const totalP = barisTingkat.reduce((a, r) => a + r.P, 0)
    const totalRombel = barisTingkat.reduce((a, r) => a + r.rombel, 0)

    // --- Guru & tendik ---
    const jenisPtk = {}
    const golongan = {}
    let berNip = 0
    let kepsek = 0
    guru.forEach((g) => {
      const j = (g.jenis_ptk || '').trim() || 'Belum diisi'
      jenisPtk[j] = (jenisPtk[j] || 0) + 1
      const gol = kelompokGolongan(g.pangkat_golongan)
      golongan[gol] = (golongan[gol] || 0) + 1
      if (String(g.nip || '').replace(/\D/g, '').length >= 10) berNip += 1
      if (adalahKepsek(g)) kepsek += 1
    })
    const totalGuru = guru.length

    return {
      barisTingkat,
      totalL,
      totalP,
      totalSiswa: totalL + totalP,
      totalRombel,
      siswaTanpaTingkat: tanpaTingkat,
      agama: KATEGORI_AGAMA.map((k) => ({ label: k, ...(agamaPeta[k] || { L: 0, P: 0 }) })),
      kewarganegaraan: KATEGORI_WN.map((k) => ({ label: k, ...(wnPeta[k] || { L: 0, P: 0 }) })),
      usia: [
        ...Object.keys(usiaPeta)
          .filter((k) => k !== USIA_TIDAK_DIKETAHUI)
          .map(Number)
          .sort((a, b) => a - b)
          .map((u) => ({ label: `${u} tahun`, ...usiaPeta[u] })),
        ...(usiaPeta[USIA_TIDAK_DIKETAHUI] ? [{ label: USIA_TIDAK_DIKETAHUI, ...usiaPeta[USIA_TIDAK_DIKETAHUI] }] : []),
      ],
      totalSiswaAktif: siswa.length,
      guru: {
        total: totalGuru,
        kepsek,
        berNip,
        tanpaNip: totalGuru - berNip,
        jenisPtk: Object.entries(jenisPtk).sort((a, b) => b[1] - a[1]),
        golongan: Object.entries(golongan).sort((a, b) => a[0].localeCompare(b[0], 'id', { numeric: true })),
      },
      rasioMuridPerGuru: totalGuru ? (totalL + totalP) / totalGuru : null,
      rasioMuridPerRombel: totalRombel ? (totalL + totalP) / totalRombel : null,
    }
  }, [mentah])

  return { ...hasil, memuat, error, muat }
}

// ---------------------------------------------------------------------------
// 2) Tabel keadaan murid (Bagian C)
// ---------------------------------------------------------------------------
export function TabelKeadaanMurid({ ks }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th className="w-8">No</Th>
            <Th>Kelas / Tingkat</Th>
            <Th className="w-24">Rombel</Th>
            <Th className="w-24">Laki-laki</Th>
            <Th className="w-24">Perempuan</Th>
            <Th className="w-24">Jumlah</Th>
          </tr>
        </thead>
        <tbody>
          {ks.barisTingkat.length === 0 && (
            <tr>
              <Td className="text-center" colSpan={6}>
                {ks.memuat ? 'Memuat…' : 'Belum ada kelas dengan data tingkat.'}
              </Td>
            </tr>
          )}
          {ks.barisTingkat.map((r, i) => (
            <tr key={r.tingkat}>
              <Td className="text-center">{i + 1}</Td>
              <Td>Kelas {r.tingkat}</Td>
              <Td className="text-center">{r.rombel}</Td>
              <Td className="text-center">{r.L}</Td>
              <Td className="text-center">{r.P}</Td>
              <Td className="text-center">{r.L + r.P}</Td>
            </tr>
          ))}
          <tr className="font-bold">
            <Td className="text-center" colSpan={2}>Total</Td>
            <Td className="text-center">{ks.totalRombel}</Td>
            <Td className="text-center">{ks.totalL}</Td>
            <Td className="text-center">{ks.totalP}</Td>
            <Td className="text-center">{ks.totalSiswa}</Td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3) Rekap guru / tendik
// ---------------------------------------------------------------------------
export function RekapGuru({ ks }) {
  const g = ks.guru
  return (
    <div className="mt-3 space-y-2">
      <p>
        Jumlah guru dan tenaga kependidikan aktif: <b>{g.total}</b> orang
        {g.total > 0 && <> (<b>{g.berNip}</b> ber-NIP, <b>{g.tanpaNip}</b> tanpa NIP)</>}.
        {ks.rasioMuridPerGuru != null && <> Rasio peserta didik terhadap guru/tendik <b>{ks.rasioMuridPerGuru.toFixed(1)} : 1</b>.</>}
        {ks.rasioMuridPerRombel != null && <> Rata-rata <b>{ks.rasioMuridPerRombel.toFixed(1)}</b> peserta didik per rombongan belajar.</>}
      </p>
      {g.total > 0 && (
        <div className="grid gap-3 sm:grid-cols-2" style={{ breakInside: 'avoid' }}>
          <table className="w-full border-collapse">
            <thead><tr><Th>Jenis PTK</Th><Th className="w-20">Jumlah</Th></tr></thead>
            <tbody>
              {g.jenisPtk.map(([k, v]) => (
                <tr key={k}><Td>{k}</Td><Td className="text-center">{v}</Td></tr>
              ))}
            </tbody>
          </table>
          <table className="w-full border-collapse">
            <thead><tr><Th>Pangkat / Golongan</Th><Th className="w-20">Jumlah</Th></tr></thead>
            <tbody>
              {g.golongan.map(([k, v]) => (
                <tr key={k}><Td>{k}</Td><Td className="text-center">{v}</Td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3b) Rekap usia, agama, kewarganegaraan + grafik batang (SVG, ikut tercetak)
// ---------------------------------------------------------------------------
function GrafikBatang({ judul, data }) {
  if (!data.length) return null
  const tBar = 14
  const kiri = 120
  const lebar = 520
  const gap = 10
  const atas = 22
  const tinggi = atas + data.length * (tBar * 2 + gap)
  const maks = Math.max(1, ...data.map((d) => Math.max(d.L, d.P)))
  const skala = (v) => (v / maks) * (lebar - kiri - 40)
  return (
    <figure className="mt-2" style={{ breakInside: 'avoid' }}>
      <figcaption className="mb-1 text-xs font-semibold">{judul}</figcaption>
      <svg viewBox={`0 0 ${lebar} ${tinggi}`} className="w-full max-w-xl" role="img" aria-label={judul}>
        <rect x={kiri} y={2} width={10} height={10} fill="#1e3a8a" />
        <text x={kiri + 14} y={11} fontSize="10" fill="#0f172a">Laki-laki</text>
        <rect x={kiri + 80} y={2} width={10} height={10} fill="#db2777" />
        <text x={kiri + 94} y={11} fontSize="10" fill="#0f172a">Perempuan</text>
        {data.map((d, i) => {
          const y = atas + i * (tBar * 2 + gap)
          return (
            <g key={d.label}>
              <text x={kiri - 6} y={y + tBar + 4} textAnchor="end" fontSize="11" fill="#0f172a">{d.label}</text>
              <rect x={kiri} y={y} width={skala(d.L)} height={tBar} fill="#1e3a8a" />
              <text x={kiri + skala(d.L) + 4} y={y + tBar - 3} fontSize="10" fill="#0f172a">{d.L}</text>
              <rect x={kiri} y={y + tBar} width={skala(d.P)} height={tBar} fill="#db2777" />
              <text x={kiri + skala(d.P) + 4} y={y + tBar * 2 - 3} fontSize="10" fill="#0f172a">{d.P}</text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

function TabelRekap({ kolom, baris }) {
  const L = baris.reduce((a, r) => a + r.L, 0)
  const P = baris.reduce((a, r) => a + r.P, 0)
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr><Th className="w-8">No</Th><Th>{kolom}</Th><Th className="w-24">Laki-laki</Th><Th className="w-24">Perempuan</Th><Th className="w-24">Jumlah</Th></tr>
      </thead>
      <tbody>
        {baris.map((r, i) => (
          <tr key={r.label}>
            <Td className="text-center">{i + 1}</Td><Td>{r.label}</Td>
            <Td className="text-center">{r.L}</Td><Td className="text-center">{r.P}</Td><Td className="text-center">{r.L + r.P}</Td>
          </tr>
        ))}
        <tr className="font-bold">
          <Td className="text-center" colSpan={2}>Total</Td>
          <Td className="text-center">{L}</Td><Td className="text-center">{P}</Td><Td className="text-center">{L + P}</Td>
        </tr>
      </tbody>
    </table>
  )
}

export function RekapDemografi({ ks, grafik = true }) {
  if (ks.totalSiswa === 0) return null
  const blok = [
    { judul: 'Peserta Didik Menurut Usia', kolom: 'Usia', data: ks.usia },
    { judul: 'Peserta Didik Menurut Agama', kolom: 'Agama', data: ks.agama },
    { judul: 'Peserta Didik Menurut Kewarganegaraan', kolom: 'Kewarganegaraan', data: ks.kewarganegaraan },
  ]
  return (
    <div className="mt-4 space-y-4">
      {blok.map((b, i) => (
        <div key={b.judul} style={{ breakInside: 'avoid' }}>
          <p className="mb-1 font-semibold">{i + 1}. {b.judul}</p>
          <TabelRekap kolom={b.kolom} baris={b.data} />
          {grafik && <GrafikBatang judul={`Grafik ${b.judul}`} data={b.data.filter((d) => d.L + d.P > 0)} />}
        </div>
      ))}
      {ks.usia.some((u) => u.label === USIA_TIDAK_DIKETAHUI) && (
        <p className="no-print text-xs text-amber-700">
          Sebagian siswa belum punya tanggal lahir yang valid, jadi masuk kolom "Tidak diketahui". Lengkapi di Data Siswa.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 5) Pembuat draf narasi (hanya dari data nyata; tidak mengarang capaian/prestasi)
// ---------------------------------------------------------------------------
export function buatNarasi({ ks, tahun, namaSekolah, tahunAjaran, angka = {}, uang = {}, bk = {}, selisih }) {
  const nama = namaSekolah || 'sekolah'
  const ta = tahunAjaran ? ` (Tahun Ajaran ${tahunAjaran})` : ''

  const pendahuluan =
    `Laporan ini disusun sebagai bentuk pertanggungjawaban Kepala Sekolah atas pelaksanaan tugas dan pengelolaan ${nama} selama tahun ${tahun}${ta}. ` +
    `Pada tahun ini sekolah melayani ${ks.totalSiswa} peserta didik (${ks.totalL} laki-laki dan ${ks.totalP} perempuan) ` +
    `dalam ${ks.totalRombel} rombongan belajar, dengan dukungan ${ks.guru.total} guru dan tenaga kependidikan. ` +
    `Laporan mencakup visi dan misi, keadaan peserta didik dan pendidik, pelaksanaan tugas kepala sekolah, rekap administrasi, keuangan, ` +
    `capaian program, kendala, serta rencana tindak lanjut untuk tahun berikutnya.`

  const kendala = []
  if (ks.siswaTanpaTingkat > 0) kendala.push(`Pendataan peserta didik belum sepenuhnya rapi: ${ks.siswaTanpaTingkat} peserta didik aktif belum terhubung ke kelas.`)
  if (ks.guru.tanpaNip > 0 && ks.guru.total > 0) kendala.push(`Sebanyak ${ks.guru.tanpaNip} dari ${ks.guru.total} guru dan tenaga kependidikan belum ber-NIP, sehingga pemenuhan kebutuhan pendidik masih bergantung pada tenaga non-ASN.`)
  if (ks.rasioMuridPerGuru != null && ks.rasioMuridPerGuru > 28) kendala.push(`Rasio peserta didik terhadap guru/tendik masih tinggi (${ks.rasioMuridPerGuru.toFixed(1)} : 1).`)
  if (selisih != null && selisih < 0) kendala.push(`Penerimaan dana tahun ${tahun} berada di bawah anggaran sebesar ${rp(Math.abs(selisih))}, sehingga sebagian program perlu disesuaikan.`)
  if (bk.jurnal === 0) kendala.push('Pencatatan jurnal kegiatan harian kepala sekolah belum dilakukan secara rutin.')
  kendala.push('[Tambahkan kendala lain sesuai kondisi sekolah, mis. sarana prasarana, kehadiran, atau partisipasi orang tua.]')

  const tl = []
  if (ks.siswaTanpaTingkat > 0) tl.push('Melengkapi dan merapikan data peserta didik (kelas, tingkat, jenis kelamin) pada awal tahun berikutnya.')
  if (ks.guru.tanpaNip > 0) tl.push('Mengusulkan formasi dan pengembangan kompetensi bagi guru dan tenaga kependidikan yang belum ber-NIP.')
  tl.push(`Meningkatkan pembinaan guru dan tenaga kependidikan${bk.pembinaan ? ` (tahun ${tahun} tercatat ${bk.pembinaan} kali)` : ''} secara terjadwal.`)
  if (selisih != null && selisih < 0) tl.push('Menyusun RKAS tahun berikutnya dengan memperhitungkan realisasi penerimaan dana.')
  tl.push('Memperkuat tertib administrasi (surat, inventaris, notulen) dan memantau program dalam rapat evaluasi berkala.')

  return {
    pendahuluan,
    kendala: kendala.map((t, i) => `${i + 1}. ${t}`).join('\n'),
    tindak_lanjut: tl.map((t, i) => `${i + 1}. ${t}`).join('\n'),
  }
}

// ---------------------------------------------------------------------------
// 4) Panel otomatis (no-print)
// ---------------------------------------------------------------------------
export function PanelOtomatis({ ks, tahun, namaSekolah, vm, angka, uang, bk, narasi, selisih, onTerapkan }) {
  const [timpa, setTimpa] = useState(false)

  const cek = [
    { ok: !!(vm?.visi || vm?.misi?.length), teks: 'Visi, misi, dan tujuan sudah diisi' },
    { ok: ks.totalSiswa > 0, teks: `Data peserta didik terbaca (${ks.totalSiswa} siswa aktif)` },
    { ok: ks.siswaTanpaTingkat === 0, teks: ks.siswaTanpaTingkat ? `${ks.siswaTanpaTingkat} siswa aktif belum punya kelas/tingkat` : 'Semua siswa aktif terhubung ke kelas' },
    { ok: ks.guru.total > 0, teks: `Data guru terbaca (${ks.guru.total} orang)` },
    { ok: uang?.anggaran != null && uang?.penerimaan != null, teks: 'Data keuangan ARKAS tersedia' },
    { ok: (bk?.jurnal || 0) > 0, teks: 'Jurnal Buku Kerja Kepala Sekolah sudah terisi' },
  ]

  const terapkan = () => {
    const draf = buatNarasi({ ks, tahun, namaSekolah, tahunAjaran: vm?.tahun_ajaran || bk?.tahunAjaran, angka, uang, bk, selisih })
    const hasil = { ...narasi }
    Object.entries(draf).forEach(([k, v]) => {
      if (timpa || !String(narasi?.[k] || '').trim()) hasil[k] = v
    })
    onTerapkan(hasil)
  }

  return (
    <div className="no-print mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-slate-700">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-blue-900">Pengisian otomatis · Tahun {tahun}</p>
        <label className="ml-auto flex items-center gap-1">
          <input type="checkbox" checked={timpa} onChange={(e) => setTimpa(e.target.checked)} />
          Timpa isian yang sudah ada
        </label>
        <button
          type="button"
          onClick={terapkan}
          disabled={ks.memuat || ks.totalSiswa + ks.guru.total === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-950 disabled:opacity-50"
        >
          <Sparkles size={14} /> Isi draf otomatis
        </button>
      </div>

      {ks.error && <p className="mb-2 rounded bg-red-50 p-2 text-red-700">{ks.error}</p>}

      <ul className="grid gap-1 sm:grid-cols-2">
        {cek.map((c) => (
          <li key={c.teks} className={`flex items-start gap-1.5 ${c.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
            {c.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
            {c.teks}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-500">
        Draf hanya memakai angka dari database. Bagian Capaian Program dan Prestasi (G) sengaja tidak diisi otomatis; tulis sendiri agar akurat.
        Periksa dan sunting draf sebelum dicetak.
      </p>
    </div>
  )
}
