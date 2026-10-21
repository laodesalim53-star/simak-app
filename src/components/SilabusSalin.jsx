import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { Copy, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

// "2026/2027" -> "2027/2028"
function tahunBerikutnya(ta) {
  const m = String(ta || '').match(/^(\d{4})\s*\/\s*(\d{4})$/)
  return m ? `${Number(m[1]) + 1}/${Number(m[2]) + 1}` : ''
}

// Salin silabus dari satu semester/tahun ajaran ke semester/tahun ajaran lain,
// supaya guru tidak mengetik ulang. Yang sudah ada di tujuan tidak ditimpa.
export default function SilabusSalin({ kelas, items, onSelesai }) {
  const { isAdmin } = useAuth()
  const [terbuka, setTerbuka] = useState(false)
  const [sumber, setSumber] = useState('')
  const [semesterTujuan, setSemesterTujuan] = useState('Genap')
  const [taTujuan, setTaTujuan] = useState('')
  const [cakupan, setCakupan] = useState('kelas') // 'kelas' | 'semua' (admin)
  const [berjalan, setBerjalan] = useState(false)
  const [hasil, setHasil] = useState(null)

  // Pilihan sumber = kombinasi tahun ajaran + semester yang sudah ada di kelas ini
  const opsiSumber = useMemo(() => {
    const set = new Map()
    for (const it of items) {
      const k = `${it.tahun_ajaran}|${it.semester}`
      if (!set.has(k)) set.set(k, { k, ta: it.tahun_ajaran, smt: it.semester })
    }
    return [...set.values()]
  }, [items])

  useEffect(() => {
    if (opsiSumber.length > 0 && !opsiSumber.find((o) => o.k === sumber)) {
      setSumber(opsiSumber[0].k)
    }
    if (opsiSumber.length === 0) setSumber('')
  }, [opsiSumber, sumber])

  // Saran tujuan otomatis: Ganjil -> Genap (tahun sama), Genap -> Ganjil (tahun berikutnya)
  useEffect(() => {
    if (!sumber) return
    const [ta, smt] = sumber.split('|')
    if (smt === 'Ganjil') {
      setSemesterTujuan('Genap')
      setTaTujuan(ta)
    } else {
      setSemesterTujuan('Ganjil')
      setTaTujuan(tahunBerikutnya(ta))
    }
  }, [sumber])

  async function handleSalin() {
    if (!sumber || !kelas || !taTujuan.trim()) return
    const [taSumber, smtSumber] = sumber.split('|')
    if (taSumber === taTujuan.trim() && smtSumber === semesterTujuan) {
      alert('Sumber dan tujuan tidak boleh sama.')
      return
    }
    const semua = isAdmin && cakupan === 'semua'
    const ok = window.confirm(
      `Salin silabus ${semua ? 'SEMUA KELAS' : `kelas ${kelas.nama_kelas}`} dari ${smtSumber} ${taSumber} ke ${semesterTujuan} ${taTujuan.trim()}?\n` +
        'Silabus yang sudah ada di tujuan tidak ditimpa.'
    )
    if (!ok) return

    setBerjalan(true)
    setHasil(null)

    let qSumber = supabase.from('silabus').select('*').eq('semester', smtSumber).eq('tahun_ajaran', taSumber)
    let qTujuan = supabase
      .from('silabus')
      .select('kelas_id, mata_pelajaran')
      .eq('semester', semesterTujuan)
      .eq('tahun_ajaran', taTujuan.trim())
    if (!semua) {
      qSumber = qSumber.eq('kelas_id', kelas.id)
      qTujuan = qTujuan.eq('kelas_id', kelas.id)
    }

    const [{ data: dataSumber, error: e1 }, { data: dataTujuan, error: e2 }] = await Promise.all([qSumber, qTujuan])
    if (e1 || e2) {
      setBerjalan(false)
      setHasil({ error: 'Gagal membaca data: ' + (e1 || e2).message })
      return
    }

    const sudahAda = new Set((dataTujuan || []).map((r) => `${r.kelas_id}|${r.mata_pelajaran}`))
    const baris = (dataSumber || [])
      .filter((r) => !sudahAda.has(`${r.kelas_id}|${r.mata_pelajaran}`))
      .map((r) => ({
        kelas_id: r.kelas_id,
        guru_id: r.guru_id,
        mata_pelajaran: r.mata_pelajaran,
        semester: semesterTujuan,
        tahun_ajaran: taTujuan.trim(),
        capaian_pembelajaran: r.capaian_pembelajaran,
        tujuan_pembelajaran: r.tujuan_pembelajaran,
        materi_pokok: r.materi_pokok,
        alokasi_waktu: r.alokasi_waktu,
        penilaian: r.penilaian,
        sumber_belajar: r.sumber_belajar,
      }))

    let disalin = 0
    for (let i = 0; i < baris.length; i += 100) {
      const { error } = await supabase.from('silabus').insert(baris.slice(i, i + 100))
      if (error) {
        setBerjalan(false)
        setHasil({ error: `Berhenti setelah ${disalin} baris: ${error.message}` })
        if (disalin > 0) onSelesai?.()
        return
      }
      disalin += Math.min(100, baris.length - i)
    }

    setBerjalan(false)
    setHasil({ disalin, dilewati: (dataSumber || []).length - baris.length })
    onSelesai?.()
  }

  if (!kelas) return null

  return (
    <div className="card p-6 mb-6 print:hidden">
      <button type="button" onClick={() => setTerbuka(!terbuka)} className="w-full flex items-center justify-between text-left">
        <span className="flex items-center gap-2 font-display text-lg font-semibold">
          <Copy size={18} /> Salin dari Semester Lalu
        </span>
        {terbuka ? <ChevronUp size={16} className="text-ink-700/50" /> : <ChevronDown size={16} className="text-ink-700/50" />}
      </button>

      {terbuka && (
        <div className="mt-4 space-y-4">
          {opsiSumber.length === 0 ? (
            <p className="text-sm text-ink-700/60">Belum ada silabus di kelas ini yang bisa disalin.</p>
          ) : (
            <>
              <p className="text-sm text-ink-700/60">
                Menyalin seluruh isi silabus (mata pelajaran, CP, tujuan, materi, penilaian, dst) ke semester atau tahun ajaran baru, lalu guru tinggal menyesuaikan.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label-field">Salin dari</label>
                  <select className="input-field w-full" value={sumber} onChange={(e) => setSumber(e.target.value)}>
                    {opsiSumber.map((o) => (
                      <option key={o.k} value={o.k}>
                        {o.smt} · {o.ta}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">Ke semester</label>
                  <select className="input-field w-full" value={semesterTujuan} onChange={(e) => setSemesterTujuan(e.target.value)}>
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Tahun ajaran tujuan</label>
                  <input className="input-field w-full" type="text" value={taTujuan} onChange={(e) => setTaTujuan(e.target.value)} placeholder="2026/2027" />
                </div>
              </div>

              {isAdmin && (
                <div className="flex flex-wrap gap-4 text-sm text-ink-900">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={cakupan === 'kelas'} onChange={() => setCakupan('kelas')} />
                    Kelas {kelas.nama_kelas} saja
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={cakupan === 'semua'} onChange={() => setCakupan('semua')} />
                    Semua kelas
                  </label>
                </div>
              )}

              <button type="button" onClick={handleSalin} disabled={berjalan || !sumber || !taTujuan.trim()} className="btn-primary">
                {berjalan ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                {berjalan ? 'Menyalin...' : 'Salin Silabus'}
              </button>

              {hasil?.error && <p className="text-sm text-red-600">{hasil.error}</p>}
              {hasil && !hasil.error && (
                <p className="text-sm text-sage-500">
                  Selesai: {hasil.disalin} silabus disalin
                  {hasil.dilewati > 0 ? `, ${hasil.dilewati} sudah ada di tujuan dan dilewati` : ''}.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
