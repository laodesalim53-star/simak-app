import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { Wand2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { CP_DEFAULT } from '../lib/cpDefault'

// Daftar mata pelajaran SD per fase (Kurikulum Merdeka).
// Fase A = kelas 1-2, Fase B = kelas 3-4, Fase C = kelas 5-6.
// IPAS baru ada mulai Fase B. Ubah daftar ini sesuai kebutuhan sekolah.
const MAPEL = [
  { nama: 'Pendidikan Agama dan Budi Pekerti', fase: ['A', 'B', 'C'], default: true },
  { nama: 'Pendidikan Pancasila', fase: ['A', 'B', 'C'], default: true },
  { nama: 'Bahasa Indonesia', fase: ['A', 'B', 'C'], default: true },
  { nama: 'Matematika', fase: ['A', 'B', 'C'], default: true },
  { nama: 'IPAS', fase: ['B', 'C'], default: true },
  { nama: 'PJOK', fase: ['A', 'B', 'C'], default: true },
  { nama: 'Seni dan Budaya', fase: ['A', 'B', 'C'], default: true },
  { nama: 'Bahasa Inggris', fase: ['A', 'B', 'C'], default: false },
  { nama: 'Muatan Lokal', fase: ['A', 'B', 'C'], default: true },
]

const ROMAWI = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }

// Ambil angka tingkat kelas dari nama kelas: "Kelas 4A", "4", "IV", "VI B".
function tingkatDariNama(nama) {
  if (!nama) return null
  const angka = String(nama).match(/\d+/)
  if (angka) {
    const n = Number(angka[0])
    return n >= 1 && n <= 6 ? n : null
  }
  const romawi = String(nama).toUpperCase().match(/\b(VI|IV|V|III|II|I)\b/)
  return romawi ? ROMAWI[romawi[1]] : null
}

function faseDariTingkat(t) {
  if (!t) return null
  if (t <= 2) return 'A'
  if (t <= 4) return 'B'
  return 'C'
}

function tahunAjaranSekarang() {
  const d = new Date()
  const y = d.getFullYear()
  return d.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

export default function SilabusOtomatis({ onSelesai }) {
  const { profil, isAdmin } = useAuth()
  const [terbuka, setTerbuka] = useState(false)
  const [kelasList, setKelasList] = useState([])
  const [semester, setSemester] = useState('Ganjil')
  const [tahunAjaran, setTahunAjaran] = useState(tahunAjaranSekarang())
  const [terpilih, setTerpilih] = useState(() =>
    Object.fromEntries(MAPEL.map((m) => [m.nama, m.default]))
  )
  const [isiKonten, setIsiKonten] = useState(true)
  const [berjalan, setBerjalan] = useState(false)
  const [hasil, setHasil] = useState(null)

  // Admin: semua kelas yang punya wali kelas. Guru: hanya kelas yang diampu.
  useEffect(() => {
    async function loadKelas() {
      let q = supabase.from('kelas').select('id, nama_kelas, wali_kelas_id').order('nama_kelas')
      if (!isAdmin) {
        if (!profil?.guru_id) return
        q = q.eq('wali_kelas_id', profil.guru_id)
      }
      const { data } = await q
      setKelasList(data || [])
    }
    loadKelas()
  }, [profil, isAdmin])

  const kelasValid = useMemo(
    () => kelasList.filter((k) => faseDariTingkat(tingkatDariNama(k.nama_kelas))),
    [kelasList]
  )
  const kelasTakDikenal = kelasList.length - kelasValid.length

  async function handleGenerate() {
    const mapelDipilih = MAPEL.filter((m) => terpilih[m.nama])
    if (kelasValid.length === 0 || mapelDipilih.length === 0) return

    const ok = window.confirm(
      `Buat silabus kosong otomatis untuk ${kelasValid.length} kelas, semester ${semester} ${tahunAjaran}?\n` +
        (isiKonten
        ? 'Silabus yang sudah ada tidak digandakan. Silabus yang masih kosong akan dilengkapi, yang sudah berisi tidak ditimpa.'
        : 'Silabus yang sudah ada tidak akan ditimpa atau digandakan.')
    )
    if (!ok) return

    setBerjalan(true)
    setHasil(null)

    // Cek yang sudah ada supaya tidak dobel.
    const { data: ada, error: errAda } = await supabase
      .from('silabus')
      .select('id, kelas_id, mata_pelajaran, capaian_pembelajaran, tujuan_pembelajaran')
      .in('kelas_id', kelasValid.map((k) => k.id))
      .eq('semester', semester)
      .eq('tahun_ajaran', tahunAjaran.trim())

    if (errAda) {
      setBerjalan(false)
      setHasil({ error: 'Gagal memeriksa data yang ada: ' + errAda.message })
      return
    }
    const sudahAda = new Set((ada || []).map((r) => `${r.kelas_id}|${r.mata_pelajaran}`))

    // Silabus yang sudah ada tapi capaian & tujuannya masih kosong -> boleh dilengkapi
    const kosongMap = new Map()
    for (const r of ada || []) {
      if (!r.capaian_pembelajaran && !r.tujuan_pembelajaran) {
        kosongMap.set(`${r.kelas_id}|${r.mata_pelajaran}`, r.id)
      }
    }

    const baris = []
    const perbarui = []
    for (const k of kelasValid) {
      const fase = faseDariTingkat(tingkatDariNama(k.nama_kelas))
      for (const m of mapelDipilih) {
        if (!m.fase.includes(fase)) continue
        const kunci = `${k.id}|${m.nama}`
        const isi = isiKonten ? CP_DEFAULT[m.nama]?.[fase] : null

        if (sudahAda.has(kunci)) {
          if (isi && kosongMap.has(kunci)) {
            perbarui.push({
              id: kosongMap.get(kunci),
              capaian_pembelajaran: isi.capaian,
              tujuan_pembelajaran: isi.tujuan,
            })
          }
          continue
        }
        baris.push({
          kelas_id: k.id,
          // guru_id = wali kelas, jadi tiap guru otomatis bisa mengedit silabus kelasnya
          guru_id: k.wali_kelas_id || null,
          mata_pelajaran: m.nama,
          semester,
          tahun_ajaran: tahunAjaran.trim(),
          capaian_pembelajaran: isi?.capaian || null,
          tujuan_pembelajaran: isi?.tujuan || null,
        })
      }
    }

    let dibuat = 0
    for (let i = 0; i < baris.length; i += 100) {
      const potongan = baris.slice(i, i + 100)
      const { error } = await supabase.from('silabus').insert(potongan)
      if (error) {
        setBerjalan(false)
        setHasil({ error: `Berhenti setelah ${dibuat} baris: ${error.message}`, dibuat })
        if (dibuat > 0) onSelesai?.()
        return
      }
      dibuat += potongan.length
    }

    let diperbarui = 0
    for (let i = 0; i < perbarui.length; i += 20) {
      const hasilUpdate = await Promise.all(
        perbarui.slice(i, i + 20).map(({ id, ...isi }) =>
          supabase.from('silabus').update(isi).eq('id', id)
        )
      )
      diperbarui += hasilUpdate.filter((r) => !r.error).length
    }

    setBerjalan(false)
    setHasil({ dibuat, diperbarui, dilewati: sudahAda.size - diperbarui })
    onSelesai?.()
  }

  if (kelasList.length === 0) return null

  return (
    <div className="card p-6 mb-6 print:hidden">
      <button
        type="button"
        onClick={() => setTerbuka(!terbuka)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 font-display text-lg font-semibold">
          <Wand2 size={18} /> Buat Silabus Otomatis
        </span>
        {terbuka ? <ChevronUp size={16} className="text-ink-700/50" /> : <ChevronDown size={16} className="text-ink-700/50" />}
      </button>

      {terbuka && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-ink-700/60">
            {isAdmin
              ? 'Membuat kerangka silabus (mata pelajaran, semester, tahun ajaran) untuk semua kelas sekaligus. Setiap guru tinggal melengkapi isinya.'
              : 'Membuat kerangka silabus untuk kelas yang Anda ampu, tinggal melengkapi isinya.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-field">Semester</label>
              <select className="input-field w-full" value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
            <div>
              <label className="label-field">Tahun Ajaran</label>
              <input
                className="input-field w-full"
                type="text"
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label-field">Mata pelajaran yang dibuat</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {MAPEL.map((m) => (
                <label key={m.nama} className="flex items-center gap-2 text-sm text-ink-900">
                  <input
                    type="checkbox"
                    checked={!!terpilih[m.nama]}
                    onChange={(e) => setTerpilih({ ...terpilih, [m.nama]: e.target.checked })}
                  />
                  <span>
                    {m.nama}
                    {m.fase.length < 3 || m.nama === 'IPAS' ? (
                      <span className="text-[11px] text-ink-700/40"> (Fase {m.fase.join('/')})</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-ink-900">
            <input
              type="checkbox"
              className="mt-1"
              checked={isiKonten}
              onChange={(e) => setIsiKonten(e.target.checked)}
            />
            <span>
              Isi Capaian Pembelajaran &amp; Tujuan Pembelajaran otomatis
              <span className="block text-[11px] text-ink-700/50">
                Berupa draf ringkasan per fase. Guru tetap perlu memeriksa dan menyesuaikannya dengan CP resmi.
              </span>
            </span>
          </label>

          <p className="text-xs text-ink-700/50">
            {kelasValid.length} kelas akan diproses.
            {kelasTakDikenal > 0 &&
              ` ${kelasTakDikenal} kelas dilewati karena tingkatnya tidak terbaca dari nama kelas (harus mengandung angka 1-6 atau I-VI).`}
          </p>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={berjalan || kelasValid.length === 0}
            className="btn-primary"
          >
            {berjalan ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {berjalan ? 'Membuat...' : 'Buat Silabus Otomatis'}
          </button>

          {hasil?.error && <p className="text-sm text-red-600">{hasil.error}</p>}
          {hasil && !hasil.error && (
            <p className="text-sm text-sage-500">
              Selesai: {hasil.dibuat} silabus baru dibuat
              {hasil.diperbarui > 0 ? `, ${hasil.diperbarui} silabus kosong dilengkapi` : ''}
              {hasil.dilewati > 0 ? `, ${hasil.dilewati} sudah berisi dan dilewati` : ''}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
