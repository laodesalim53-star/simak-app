import { useEffect, useMemo, useState } from 'react'
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Download,
  Loader2,
  FilePlus,
  FolderOpen,
  Link2,
  CalendarRange,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { TAHUN_AJARAN, JML_HBE } from '../../lib/kalenderPendidikan'
import {
  JENIS,
  faseDariKelas,
  hitungMinggu,
  kapasitasMinggu,
  kapasitasSemester,
  jumlahMingguEfektif,
  distribusiPromes,
  barisKosong,
  normalisasiBaris,
  jumlahJp,
} from '../../lib/perangkatAjar'
import { panggilAiPerangkat } from '../../lib/aiPerangkat'

const FORM_AWAL = {
  mata_pelajaran: '',
  kelas: '',
  fase: '',
  tahun_ajaran: TAHUN_AJARAN || '',
  semester: 'Ganjil',
  jp_per_minggu: 4,
  hari_per_minggu: 5,
}

// Satu komponen untuk tiga tab: <PerangkatAjarTab jenis="atp" | "prota" | "promes" />
export default function PerangkatAjarTab({ jenis }) {
  const { profil } = useAuth()
  const info = JENIS[jenis]

  const [form, setForm] = useState(FORM_AWAL)
  const [cp, setCp] = useState('')
  const [rows, setRows] = useState([])
  const [docId, setDocId] = useState(null)
  const [tersimpan, setTersimpan] = useState([])
  const [overrides, setOverrides] = useState({})
  const [profilSekolah, setProfilSekolah] = useState(null)
  const [namaGuru, setNamaGuru] = useState('')
  const [busy, setBusy] = useState('')
  const [pesan, setPesan] = useState(null) // { tipe: 'ok' | 'err' | 'info', teks }

  const hari = Number(form.hari_per_minggu) || 5
  const jpMinggu = Math.max(1, Number(form.jp_per_minggu) || 1)

  // ---- Muat data pendukung ----
  async function muatTersimpan() {
    const { data } = await supabase
      .from('perangkat_ajar')
      .select('id, mata_pelajaran, kelas, tahun_ajaran, semester, diubah_pada')
      .eq('jenis', jenis)
      .order('diubah_pada', { ascending: false })
    setTersimpan(data || [])
  }

  useEffect(() => {
    muatTersimpan()
    supabase
      .from('kalender_overrides')
      .select('*')
      .then(({ data, error }) => {
        if (error) return
        const map = {}
        ;(data || []).forEach((r) => {
          map[r.tanggal] = { kode: r.kode, keterangan: r.keterangan }
        })
        setOverrides(map)
      })
    supabase
      .from('profil_sekolah')
      .select('nama_sekolah, alamat, kabupaten, kepala_sekolah, tempat_ttd')
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (!error) setProfilSekolah(data)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!profil?.guru_id) return
    supabase
      .from('guru')
      .select('nama_lengkap')
      .eq('id', profil.guru_id)
      .single()
      .then(({ data, error }) => {
        if (!error) setNamaGuru(data?.nama_lengkap || '')
      })
  }, [profil?.guru_id])

  // ---- Hitungan kalender ----
  const bulanGanjil = useMemo(() => hitungMinggu('Ganjil', overrides, hari), [overrides, hari])
  const bulanGenap = useMemo(() => hitungMinggu('Genap', overrides, hari), [overrides, hari])
  const bulanSem = form.semester === 'Genap' ? bulanGenap : bulanGanjil
  const kapasitas = useMemo(
    () => ({
      Ganjil: kapasitasSemester(bulanGanjil, jpMinggu, hari),
      Genap: kapasitasSemester(bulanGenap, jpMinggu, hari),
    }),
    [bulanGanjil, bulanGenap, jpMinggu, hari]
  )

  // ---- Pembantu UI ----
  const tampil = (tipe, teks) => setPesan({ tipe, teks })

  function ubahForm(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function ubahBaris(i, patch) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function tambahBaris() {
    setRows((rs) => [...rs, barisKosong(jenis, form.semester)])
  }

  function hapusBaris(i) {
    setRows((rs) => rs.filter((_, idx) => idx !== i))
  }

  function pindah(i, arah) {
    setRows((rs) => {
      const j = i + arah
      if (j < 0 || j >= rs.length) return rs
      const salin = [...rs]
      ;[salin[i], salin[j]] = [salin[j], salin[i]]
      return salin
    })
  }

  function butuhIdentitas() {
    if (!form.mata_pelajaran.trim() || !form.kelas.trim() || !form.tahun_ajaran.trim()) {
      tampil('err', 'Isi Mata Pelajaran, Kelas, dan Tahun Ajaran dulu.')
      return false
    }
    return true
  }

  function barukan() {
    setDocId(null)
    setCp('')
    setRows([])
    setPesan(null)
  }

  // ---- Sebar Promes ----
  function sebarOtomatis(sumber = rows) {
    const hasil = distribusiPromes(sumber, bulanSem, jpMinggu, hari)
    setRows(hasil.rows)
    if (hasil.melebihi) {
      tampil(
        'err',
        'Total JP melebihi minggu efektif semester ini. Kurangi JP materi, naikkan JP per minggu, atau cek Kalender Pendidikan.'
      )
    } else {
      tampil('ok', 'JP sudah disebar ke minggu-minggu efektif. Klik sel untuk menggeser manual.')
    }
  }

  function toggleMinggu(i, key) {
    setRows((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r
        const ada = (r.minggu || []).includes(key)
        return { ...r, minggu: ada ? r.minggu.filter((k) => k !== key) : [...(r.minggu || []), key] }
      })
    )
  }

  // ---- AI ----
  async function buatDenganAi() {
    if (!butuhIdentitas()) return
    if (rows.length > 0 && !window.confirm('Isi tabel saat ini akan diganti hasil AI. Lanjutkan?')) return
    setBusy('ai')
    setPesan(null)
    try {
      const hasil = await panggilAiPerangkat({
        jenis,
        mapel: form.mata_pelajaran.trim(),
        kelas: form.kelas.trim(),
        fase: form.fase,
        tahun_ajaran: form.tahun_ajaran.trim(),
        kapasitas,
      })
      setRows(normalisasiBaris(jenis, hasil.rows))
      if (jenis === 'atp' && hasil.cp) setCp(hasil.cp)
      tampil('ok', 'Draf AI siap. Periksa dan edit dulu sebelum disimpan.')
    } catch (err) {
      tampil('err', err.message)
    }
    setBusy('')
  }

  // ---- Ambil dari dokumen sebelumnya (ATP -> Prota -> Promes) ----
  async function ambilDariSumber() {
    if (!butuhIdentitas()) return
    const sumber = jenis === 'prota' ? 'atp' : 'prota'
    setBusy('ambil')
    setPesan(null)
    const { data, error } = await supabase
      .from('perangkat_ajar')
      .select('isi')
      .eq('jenis', sumber)
      .eq('mata_pelajaran', form.mata_pelajaran.trim())
      .eq('kelas', form.kelas.trim())
      .eq('tahun_ajaran', form.tahun_ajaran.trim())
      .order('diubah_pada', { ascending: false })
      .limit(1)
    setBusy('')

    if (error) return tampil('err', 'Gagal mengambil data: ' + error.message)
    const isi = data?.[0]?.isi
    if (!isi?.rows?.length) {
      return tampil(
        'err',
        `Belum ada ${JENIS[sumber].label} tersimpan untuk mapel, kelas, dan tahun ajaran ini. Simpan dulu di tab ${JENIS[sumber].label}, dan pastikan penulisan mapel/kelas sama persis.`
      )
    }

    if (jenis === 'prota') {
      setRows(
        isi.rows.map((r) => ({
          semester: r.semester === 'Genap' ? 'Genap' : 'Ganjil',
          materi: r.materi || r.tujuan || '',
          jp: Number(r.jp) || 0,
        }))
      )
      tampil('ok', 'Prota diambil dari ATP. Silakan sesuaikan.')
    } else {
      const turunan = isi.rows
        .filter((r) => r.semester === form.semester)
        .map((r) => ({ materi: r.materi || '', jp: Number(r.jp) || 0, minggu: [] }))
      if (turunan.length === 0) {
        return tampil('err', `Prota tidak punya materi untuk semester ${form.semester}.`)
      }
      sebarOtomatis(turunan)
    }
  }

  // ---- Simpan / buka / hapus ----
  async function simpan() {
    if (!butuhIdentitas()) return
    if (rows.length === 0) return tampil('err', 'Tabel masih kosong.')
    setBusy('simpan')
    const payload = {
      jenis,
      guru_id: profil?.guru_id != null ? String(profil.guru_id) : null,
      sekolah_id: profil?.sekolah_id != null ? String(profil.sekolah_id) : null,
      mata_pelajaran: form.mata_pelajaran.trim(),
      kelas: form.kelas.trim(),
      fase: form.fase || null,
      tahun_ajaran: form.tahun_ajaran.trim(),
      semester: jenis === 'promes' ? form.semester : null,
      isi: {
        cp: jenis === 'atp' ? cp : undefined,
        rows,
        jp_per_minggu: jpMinggu,
        hari_per_minggu: hari,
      },
      diubah_pada: new Date().toISOString(),
    }

    let error
    if (docId) {
      ;({ error } = await supabase.from('perangkat_ajar').update(payload).eq('id', docId))
    } else {
      const res = await supabase.from('perangkat_ajar').insert(payload).select('id').single()
      error = res.error
      if (!error) setDocId(res.data.id)
    }
    setBusy('')
    if (error) return tampil('err', 'Gagal menyimpan: ' + error.message)
    tampil('ok', 'Tersimpan.')
    muatTersimpan()
  }

  async function buka(id) {
    const { data, error } = await supabase.from('perangkat_ajar').select('*').eq('id', id).single()
    if (error) return tampil('err', 'Gagal membuka: ' + error.message)
    setDocId(data.id)
    setForm({
      mata_pelajaran: data.mata_pelajaran,
      kelas: data.kelas,
      fase: data.fase || '',
      tahun_ajaran: data.tahun_ajaran,
      semester: data.semester || 'Ganjil',
      jp_per_minggu: data.isi?.jp_per_minggu || 4,
      hari_per_minggu: data.isi?.hari_per_minggu || 5,
    })
    setCp(data.isi?.cp || '')
    setRows(data.isi?.rows || [])
    setPesan(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function hapus(item) {
    if (!window.confirm(`Hapus ${info.label} ${item.mata_pelajaran} Kelas ${item.kelas}?`)) return
    const { error } = await supabase.from('perangkat_ajar').delete().eq('id', item.id)
    if (error) return tampil('err', 'Gagal menghapus: ' + error.message)
    if (item.id === docId) barukan()
    muatTersimpan()
  }

  async function unduh() {
    if (!butuhIdentitas()) return
    if (rows.length === 0) return tampil('err', 'Tabel masih kosong.')
    setBusy('unduh')
    try {
      const { unduhPerangkatDocx } = await import('../../lib/generatePerangkatDocx')
      await unduhPerangkatDocx({ jenis, form, cp, rows, bulanData: bulanSem, profilSekolah, namaGuru })
    } catch (err) {
      tampil('err', 'Gagal membuat file: ' + err.message)
    }
    setBusy('')
  }

  // ---- Ringkasan JP ----
  const totalGanjil = jenis === 'promes' ? 0 : jumlahJp(rows, 'Ganjil')
  const totalGenap = jenis === 'promes' ? 0 : jumlahJp(rows, 'Genap')
  const totalPromes = jenis === 'promes' ? jumlahJp(rows) : 0

  const ringkasan =
    jenis === 'promes'
      ? [
          {
            label: `Semester ${form.semester}`,
            terpakai: totalPromes,
            kapasitas: kapasitas[form.semester],
          },
        ]
      : [
          { label: 'Ganjil', terpakai: totalGanjil, kapasitas: kapasitas.Ganjil },
          { label: 'Genap', terpakai: totalGenap, kapasitas: kapasitas.Genap },
        ]

  const pesanKelas = {
    ok: 'bg-sage-500/10 text-sage-500',
    err: 'bg-red-100 text-red-600',
    info: 'bg-ink-900/[0.05] text-ink-700',
  }

  const tombol =
    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-700 hover:bg-ink-900/[0.05] disabled:opacity-50'

  return (
    <>
      {/* ---------- Identitas dan pengaturan ---------- */}
      <div className="card p-6 mb-6 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-display text-lg font-semibold">{info.judul}</h3>
            <p className="text-xs text-ink-700/50 mt-1">
              {jenis === 'atp' && 'Susun tujuan pembelajaran dan kriteria ketercapaiannya. Ini jadi dasar Prota.'}
              {jenis === 'prota' && 'Bagi materi dan alokasi JP per semester. Bisa diambil dari ATP yang sudah disimpan.'}
              {jenis === 'promes' &&
                'Sebar materi Prota ke minggu efektif, dihitung otomatis dari Kalender Pendidikan.'}
            </p>
          </div>
          {docId && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-sage-500/15 text-sage-500">
              Dokumen tersimpan
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            className="input-field"
            placeholder="Mata Pelajaran"
            value={form.mata_pelajaran}
            onChange={(e) => ubahForm({ mata_pelajaran: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Kelas (mis. 6 atau VI)"
            value={form.kelas}
            onChange={(e) => ubahForm({ kelas: e.target.value, fase: faseDariKelas(e.target.value) || form.fase })}
          />
          <select className="input-field" value={form.fase} onChange={(e) => ubahForm({ fase: e.target.value })}>
            <option value="">Fase (otomatis dari kelas)</option>
            {['A', 'B', 'C', 'D', 'E', 'F'].map((f) => (
              <option key={f} value={f}>
                Fase {f}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Tahun Ajaran (mis. 2026/2027)"
            value={form.tahun_ajaran}
            onChange={(e) => ubahForm({ tahun_ajaran: e.target.value })}
          />
          {jenis === 'promes' && (
            <select
              className="input-field"
              value={form.semester}
              onChange={(e) => {
                ubahForm({ semester: e.target.value })
                setRows((rs) => rs.map((r) => ({ ...r, minggu: [] })))
              }}
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          )}
          <label className="text-xs text-ink-700/60 flex items-center gap-2">
            JP per minggu
            <input
              className="input-field !py-1.5 w-20"
              type="number"
              min="1"
              max="20"
              value={form.jp_per_minggu}
              onChange={(e) => ubahForm({ jp_per_minggu: e.target.value })}
            />
          </label>
          <label className="text-xs text-ink-700/60 flex items-center gap-2">
            Hari belajar/minggu
            <select
              className="input-field !py-1.5 w-20"
              value={form.hari_per_minggu}
              onChange={(e) => ubahForm({ hari_per_minggu: e.target.value })}
            >
              <option value={5}>5</option>
              <option value={6}>6</option>
            </select>
          </label>
        </div>

        {/* Ringkasan kapasitas dari kalender */}
        <div className="rounded-xl bg-ink-900/[0.04] px-3 py-2.5 text-xs text-ink-700 flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="flex items-center gap-1.5 font-medium">
            <CalendarRange size={14} /> Dari Kalender Pendidikan:
          </span>
          {['Ganjil', 'Genap'].map((s) => (
            <span key={s}>
              {s}: {jumlahMingguEfektif(s === 'Ganjil' ? bulanGanjil : bulanGenap)} minggu efektif ·{' '}
              <strong>{kapasitas[s]} JP</strong>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {jenis !== 'promes' && (
            <button
              type="button"
              onClick={buatDenganAi}
              disabled={busy !== ''}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30 disabled:opacity-50"
            >
              {busy === 'ai' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Buat dengan AI
            </button>
          )}
          {jenis !== 'atp' && (
            <button type="button" onClick={ambilDariSumber} disabled={busy !== ''} className={tombol}>
              {busy === 'ambil' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              {jenis === 'prota' ? 'Ambil dari ATP' : 'Ambil dari Prota'}
            </button>
          )}
          {jenis === 'promes' && (
            <button type="button" onClick={() => sebarOtomatis()} disabled={rows.length === 0} className={tombol}>
              <CalendarRange size={14} /> Sebar otomatis
            </button>
          )}
          <button type="button" onClick={barukan} className={tombol}>
            <FilePlus size={14} /> Baru
          </button>
        </div>

        {pesan && <p className={`text-xs rounded-lg px-3 py-2 ${pesanKelas[pesan.tipe]}`}>{pesan.teks}</p>}
      </div>

      {/* ---------- Tabel isi ---------- */}
      <div className="card p-6 mb-6">
        {jenis === 'atp' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-ink-700/60 mb-1">Capaian Pembelajaran (CP)</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Tuliskan atau tempel Capaian Pembelajaran fase ini"
              value={cp}
              onChange={(e) => setCp(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-2">
            {ringkasan.map((r) => {
              const lebih = r.terpakai > r.kapasitas
              return (
                <span
                  key={r.label}
                  className={`text-[11px] font-medium px-2 py-1 rounded-md ${
                    lebih ? 'bg-red-100 text-red-600' : 'bg-sage-500/15 text-sage-500'
                  }`}
                >
                  {r.label}: {r.terpakai} / {r.kapasitas} JP{lebih ? ' (melebihi)' : ''}
                </span>
              )
            })}
          </div>
          <button type="button" onClick={tambahBaris} className={tombol}>
            <Plus size={14} /> Tambah baris
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-ink-700/50">
            Belum ada isi.{' '}
            {jenis === 'promes'
              ? 'Klik "Ambil dari Prota" atau tambah baris manual.'
              : 'Klik "Buat dengan AI", ambil dari dokumen sebelumnya, atau tambah baris manual.'}
          </p>
        ) : jenis === 'promes' ? (
          <TabelPromes
            rows={rows}
            bulanData={bulanSem}
            jpMinggu={jpMinggu}
            hari={hari}
            ubahBaris={ubahBaris}
            hapusBaris={hapusBaris}
            pindah={pindah}
            toggleMinggu={toggleMinggu}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[860px]">
              <thead>
                <tr className="text-left text-ink-700/60">
                  <th className="py-2 pr-2 w-8">No</th>
                  {jenis === 'atp' && <th className="py-2 pr-2 w-36">Elemen</th>}
                  {jenis === 'atp' && <th className="py-2 pr-2">Tujuan Pembelajaran</th>}
                  <th className="py-2 pr-2">Materi{jenis === 'prota' ? ' / Tema' : ''}</th>
                  {jenis === 'atp' && <th className="py-2 pr-2">KKTP</th>}
                  <th className="py-2 pr-2 w-16">JP</th>
                  <th className="py-2 pr-2 w-24">Semester</th>
                  <th className="py-2 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/[0.06]">
                {rows.map((r, i) => (
                  <tr key={i} className="align-top">
                    <td className="py-2 pr-2 text-ink-700/50">{i + 1}</td>
                    {jenis === 'atp' && (
                      <td className="py-2 pr-2">
                        <input
                          className="input-field !py-1.5 !text-xs"
                          value={r.elemen}
                          onChange={(e) => ubahBaris(i, { elemen: e.target.value })}
                        />
                      </td>
                    )}
                    {jenis === 'atp' && (
                      <td className="py-2 pr-2">
                        <textarea
                          className="input-field !py-1.5 !text-xs"
                          rows={3}
                          value={r.tujuan}
                          onChange={(e) => ubahBaris(i, { tujuan: e.target.value })}
                        />
                      </td>
                    )}
                    <td className="py-2 pr-2">
                      <textarea
                        className="input-field !py-1.5 !text-xs"
                        rows={jenis === 'atp' ? 3 : 2}
                        value={r.materi}
                        onChange={(e) => ubahBaris(i, { materi: e.target.value })}
                      />
                    </td>
                    {jenis === 'atp' && (
                      <td className="py-2 pr-2">
                        <textarea
                          className="input-field !py-1.5 !text-xs"
                          rows={3}
                          value={r.kktp}
                          onChange={(e) => ubahBaris(i, { kktp: e.target.value })}
                        />
                      </td>
                    )}
                    <td className="py-2 pr-2">
                      <input
                        className="input-field !py-1.5 !text-xs"
                        type="number"
                        min="0"
                        value={r.jp}
                        onChange={(e) => ubahBaris(i, { jp: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        className="input-field !py-1.5 !text-xs"
                        value={r.semester}
                        onChange={(e) => ubahBaris(i, { semester: e.target.value })}
                      >
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                      </select>
                    </td>
                    <td className="py-2">
                      <AksiBaris i={i} total={rows.length} pindah={pindah} hapusBaris={hapusBaris} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-5">
          <button type="button" onClick={simpan} disabled={busy !== ''} className="btn-primary">
            {busy === 'simpan' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {docId ? 'Simpan perubahan' : 'Simpan'}
          </button>
          <button type="button" onClick={unduh} disabled={busy !== ''} className={tombol + ' border border-ink-900/10'}>
            {busy === 'unduh' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Unduh .docx
          </button>
        </div>
      </div>

      {/* ---------- Daftar tersimpan ---------- */}
      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold mb-4">{info.label} Tersimpan</h3>
        {tersimpan.length === 0 ? (
          <p className="text-sm text-ink-700/50">Belum ada yang disimpan.</p>
        ) : (
          <ul className="divide-y divide-ink-900/[0.06]">
            {tersimpan.map((t) => (
              <li key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">
                    {t.mata_pelajaran} · Kelas {t.kelas}
                  </p>
                  <p className="text-xs text-ink-700/50 mt-0.5">
                    {t.tahun_ajaran}
                    {t.semester ? ` · ${t.semester}` : ''} · diubah{' '}
                    {new Date(t.diubah_pada).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => buka(t.id)} className={tombol}>
                    <FolderOpen size={14} /> Buka
                  </button>
                  <button
                    type="button"
                    onClick={() => hapus(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function AksiBaris({ i, total, pindah, hapusBaris }) {
  const kecil = 'p-1 rounded text-ink-700/50 hover:text-ink-900 disabled:opacity-30'
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={kecil} disabled={i === 0} onClick={() => pindah(i, -1)} title="Naik">
        <ArrowUp size={14} />
      </button>
      <button type="button" className={kecil} disabled={i === total - 1} onClick={() => pindah(i, 1)} title="Turun">
        <ArrowDown size={14} />
      </button>
      <button type="button" className="p-1 rounded text-red-500 hover:text-red-700" onClick={() => hapusBaris(i)} title="Hapus">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function TabelPromes({ rows, bulanData, jpMinggu, hari, ubahBaris, hapusBaris, pindah, toggleMinggu }) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="text-ink-700/70">
              <th rowSpan={2} className="py-2 pr-2 w-8 text-left align-bottom">
                No
              </th>
              <th rowSpan={2} className="py-2 pr-2 min-w-[220px] text-left align-bottom">
                Materi / Tema
              </th>
              <th rowSpan={2} className="py-2 pr-2 w-16 text-left align-bottom">
                JP
              </th>
              {bulanData.map((bd) => (
                <th key={bd.bulan.key} colSpan={5} className="px-1 pb-1 text-center font-semibold border-l border-ink-900/10">
                  {bd.bulan.nama} {bd.bulan.tahun}
                </th>
              ))}
              <th rowSpan={2} className="w-24" />
            </tr>
            <tr className="text-ink-700/50">
              {bulanData.map((bd) =>
                bd.minggu.map((m, idx) => (
                  <th
                    key={m.key}
                    className={`w-7 min-w-[28px] text-center font-normal ${idx === 0 ? 'border-l border-ink-900/10' : ''}`}
                  >
                    {m.no}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-ink-900/[0.06] align-middle">
                <td className="py-1.5 pr-2 text-ink-700/50">{i + 1}</td>
                <td className="py-1.5 pr-2">
                  <input
                    className="input-field !py-1.5 !text-xs"
                    value={r.materi}
                    onChange={(e) => ubahBaris(i, { materi: e.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    className="input-field !py-1.5 !text-xs"
                    type="number"
                    min="0"
                    value={r.jp}
                    onChange={(e) => ubahBaris(i, { jp: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </td>
                {bulanData.map((bd) =>
                  bd.minggu.map((m, idx) => {
                    const aktif = (r.minggu || []).includes(m.key)
                    const bisa = kapasitasMinggu(m, jpMinggu, hari) > 0
                    const batas = idx === 0 ? 'border-l border-ink-900/10' : ''
                    if (!m.ada) return <td key={m.key} className={`bg-ink-900/[0.03] ${batas}`} />
                    if (!bisa) {
                      return (
                        <td
                          key={m.key}
                          className={`bg-red-100/70 ${batas}`}
                          title={m.alasan.join(', ') || 'Tidak ada hari efektif'}
                        />
                      )
                    }
                    return (
                      <td key={m.key} className={`p-0.5 ${batas}`}>
                        <button
                          type="button"
                          onClick={() => toggleMinggu(i, m.key)}
                          className={`w-6 h-6 rounded text-[11px] font-bold ${
                            aktif ? 'bg-sage-500 text-white' : 'bg-ink-900/[0.04] hover:bg-ink-900/[0.1]'
                          }`}
                          title={`Minggu ${m.no} · ${m.hariEfektif} hari efektif`}
                        >
                          {aktif ? '✓' : ''}
                        </button>
                      </td>
                    )
                  })
                )}
                <td className="py-1.5 pl-2">
                  <AksiBaris i={i} total={rows.length} pindah={pindah} hapusBaris={hapusBaris} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-ink-700/50 mt-3">
        Sel merah muda = tidak ada hari efektif (libur/kegiatan sekolah); arahkan kursor untuk melihat alasannya. Klik sel
        hijau/abu-abu untuk menandai atau mencabut minggu pembelajaran.
      </p>

      <details className="mt-3 text-[11px] text-ink-700/60">
        <summary className="cursor-pointer select-none">Cek hari efektif per bulan (hitungan Promes vs kalender)</summary>
        <ul className="mt-2 space-y-0.5">
          {bulanData.map((bd) => {
            const hitung = bd.minggu.reduce((t, m) => t + m.hariEfektif, 0)
            return (
              <li key={bd.bulan.key}>
                {bd.bulan.nama} {bd.bulan.tahun}: dihitung {hitung} hari · kalender (HBE) {JML_HBE?.[bd.bulan.key] ?? '-'} hari
              </li>
            )
          })}
        </ul>
        <p className="mt-1">
          Kalau angkanya berbeda jauh, cek Kalender Pendidikan atau pilihan "Hari belajar/minggu" (5 atau 6).
        </p>
      </details>
    </>
  )
}
