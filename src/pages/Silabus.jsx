import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { CP_DEFAULT, cariCpDefault } from '../lib/cpDefault'
import PilihanCepat from '../components/PilihanCepat'
import SilabusCetak from '../components/SilabusCetak'
import { ALOKASI_WAKTU, PENILAIAN, SUMBER_BELAJAR, cariMateriDefault } from '../lib/pilihanSilabus'
import {
  Save, Loader2, BookOpenText, Trash2, Pencil, ChevronDown, ChevronUp, Printer, X,
} from 'lucide-react'

const SEMESTER_OPTIONS = ['Ganjil', 'Genap']

function tahunAjaranSekarang() {
  const d = new Date()
  const y = d.getFullYear()
  return d.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

const FORM_KOSONG = {
  mata_pelajaran: '',
  semester: 'Ganjil',
  tahun_ajaran: tahunAjaranSekarang(),
  capaian_pembelajaran: '',
  tujuan_pembelajaran: '',
  materi_pokok: '',
  alokasi_waktu: '',
  penilaian: '',
  sumber_belajar: '',
}

export default function Silabus() {
  const { profil, isAdmin } = useAuth()

  const [kelasList, setKelasList] = useState([])
  const [loadingKelas, setLoadingKelas] = useState(true)
  const [kelasTerpilih, setKelasTerpilih] = useState(null)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const [form, setForm] = useState(FORM_KOSONG)
  const [editId, setEditId] = useState(null)
  const [menyimpan, setMenyimpan] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [cetak, setCetak] = useState(null) // { win, el } jendela cetak

  // Kelas: guru -> kelas yang diampu (wali_kelas_id), admin -> semua kelas
  useEffect(() => {
    async function loadKelas() {
      setLoadingKelas(true)
      let q = supabase.from('kelas').select('id, nama_kelas, wali_kelas_id').order('nama_kelas')
      if (!isAdmin) {
        if (!profil?.guru_id) {
          setKelasList([])
          setLoadingKelas(false)
          return
        }
        q = q.eq('wali_kelas_id', profil.guru_id)
      }
      const { data } = await q
      setKelasList(data || [])
      if (data && data.length > 0) setKelasTerpilih((prev) => prev || data[0])
      setLoadingKelas(false)
    }
    loadKelas()
  }, [profil, isAdmin])

  async function load(kelasId) {
    if (!kelasId) {
      setItems([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('silabus')
      .select('*')
      .eq('kelas_id', kelasId)
      .order('tahun_ajaran', { ascending: false })
      .order('semester')
      .order('mata_pelajaran')
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load(kelasTerpilih?.id)
    batalEdit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasTerpilih?.id])

  function batalEdit() {
    setEditId(null)
    setForm({ ...FORM_KOSONG, tahun_ajaran: tahunAjaranSekarang() })
  }

  function mulaiEdit(item) {
    setEditId(item.id)
    setForm({
      mata_pelajaran: item.mata_pelajaran || '',
      semester: item.semester || 'Ganjil',
      tahun_ajaran: item.tahun_ajaran || tahunAjaranSekarang(),
      capaian_pembelajaran: item.capaian_pembelajaran || '',
      tujuan_pembelajaran: item.tujuan_pembelajaran || '',
      materi_pokok: item.materi_pokok || '',
      alokasi_waktu: item.alokasi_waktu || '',
      penilaian: item.penilaian || '',
      sumber_belajar: item.sumber_belajar || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Isi CP & TP otomatis dari draf per fase. force=false: hanya jika kedua kolom masih kosong.
  function isiOtomatis(mapel, force = false) {
    const isi = cariCpDefault(mapel, kelasTerpilih?.nama_kelas)
    if (!isi) return false
    setForm((f) => {
      if (!force && (f.capaian_pembelajaran.trim() || f.tujuan_pembelajaran.trim())) return f
      return { ...f, capaian_pembelajaran: isi.capaian, tujuan_pembelajaran: isi.tujuan }
    })
    return true
  }

  // Cetak di jendela terpisah supaya tidak terpengaruh aturan cetak Layout.
  function handleCetak() {
    if (!kelasTerpilih || items.length === 0) return
    if (cetak?.win && !cetak.win.closed) cetak.win.close()

    const w = window.open('', '_blank', 'width=1100,height=800')
    if (!w) {
      alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.')
      return
    }
    w.document.title = `Silabus ${kelasTerpilih.nama_kelas}`

    // Salin stylesheet aplikasi (Tailwind dll) ke jendela cetak, TANPA aturan
    // @media print milik aplikasi (aturan itu menyembunyikan isi halaman -> cetakan kosong).
    const css = []
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule.type === CSSRule.MEDIA_RULE && /print/i.test(rule.media.mediaText)) continue
          css.push(rule.cssText)
        }
      } catch {
        // stylesheet lintas-origin (mis. Google Fonts): muat lewat <link>
        if (sheet.href) {
          const l = w.document.createElement('link')
          l.rel = 'stylesheet'
          l.href = sheet.href
          w.document.head.appendChild(l)
        }
      }
    }
    const st = w.document.createElement('style')
    st.textContent = css.join('\n')
    w.document.head.appendChild(st)

    const el = w.document.createElement('div')
    w.document.body.appendChild(el)
    w.addEventListener('pagehide', () => setCetak(null))
    setCetak({ win: w, el })
  }

  function tutupCetak() {
    if (cetak?.win && !cetak.win.closed) cetak.win.close()
    setCetak(null)
  }

  async function handleSimpan(e) {
    e.preventDefault()
    if (!kelasTerpilih || !form.mata_pelajaran.trim()) return

    setMenyimpan(true)
    const payload = {
      kelas_id: kelasTerpilih.id,
      guru_id: profil?.guru_id || null,
      mata_pelajaran: form.mata_pelajaran.trim(),
      semester: form.semester,
      tahun_ajaran: form.tahun_ajaran.trim(),
      capaian_pembelajaran: form.capaian_pembelajaran.trim() || null,
      tujuan_pembelajaran: form.tujuan_pembelajaran.trim() || null,
      materi_pokok: form.materi_pokok.trim() || null,
      alokasi_waktu: form.alokasi_waktu.trim() || null,
      penilaian: form.penilaian.trim() || null,
      sumber_belajar: form.sumber_belajar.trim() || null,
    }

    let error
    if (editId) {
      // jangan menimpa guru_id pembuat saat diedit
      const { guru_id, ...updatePayload } = payload
      ;({ error } = await supabase.from('silabus').update(updatePayload).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('silabus').insert(payload))
    }
    setMenyimpan(false)

    if (error) {
      alert('Gagal menyimpan silabus: ' + error.message)
      return
    }
    batalEdit()
    await load(kelasTerpilih.id)
  }

  async function handleHapus(item) {
    const ok = window.confirm(
      `Hapus silabus "${item.mata_pelajaran}" (${item.semester} ${item.tahun_ajaran})? Tindakan ini tidak bisa dibatalkan.`
    )
    if (!ok) return
    setDeletingId(item.id)
    const { error } = await supabase.from('silabus').delete().eq('id', item.id)
    setDeletingId(null)
    if (error) {
      alert('Gagal menghapus silabus: ' + error.message)
      return
    }
    if (editId === item.id) batalEdit()
    await load(kelasTerpilih.id)
  }

  const bolehKelola = isAdmin || !!profil?.guru_id

  return (
    <Layout
      title="Silabus"
      subtitle={isAdmin ? 'Lihat dan kelola silabus semua kelas' : 'Susun dan kelola silabus untuk kelas yang Anda ampu'}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-950 to-[#22315B] p-6 mb-6 print:hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <BookOpenText size={20} className="text-paper" />
          </div>
          <div>
            <p className="font-display font-semibold text-lg text-paper">Silabus</p>
            <p className="text-sm text-paper/70 mt-0.5">
              {kelasTerpilih ? `Kelas ${kelasTerpilih.nama_kelas} · ${items.length} silabus` : 'Pilih kelas untuk mulai'}
            </p>
          </div>
        </div>
        <BookOpenText size={120} className="absolute -right-4 -bottom-6 text-white/5 rotate-12" />
      </div>

      {loadingKelas ? (
        <p className="text-sm text-ink-700/50">Memuat data kelas...</p>
      ) : kelasList.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-ink-700/60">
            Anda belum tercatat sebagai wali kelas di kelas manapun, jadi belum ada kelas yang bisa diisi silabusnya.
          </p>
        </div>
      ) : (
        <>
          {/* Pilih kelas */}
          <div className="flex items-center gap-3 mb-6 flex-wrap print:hidden">
            <label className="label-field !mb-0">Kelas</label>
            {kelasList.length > 1 ? (
              <select
                className="input-field w-auto"
                value={kelasTerpilih?.id || ''}
                onChange={(e) => setKelasTerpilih(kelasList.find((k) => k.id === e.target.value) || null)}
              >
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium text-ink-900">{kelasList[0].nama_kelas}</span>
            )}
          </div>

          {/* Form */}
          {bolehKelola && (
            <form onSubmit={handleSimpan} className="card p-6 space-y-3 mb-6 print:hidden">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <h3 className="font-display text-lg font-semibold">
                  {editId ? 'Edit Silabus' : 'Tambah Silabus'}
                </h3>
                {editId && (
                  <button type="button" onClick={batalEdit} className="flex items-center gap-1 text-xs text-ink-700/60 hover:text-ink-900">
                    <X size={14} /> Batal edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label-field">Mata Pelajaran</label>
                  <input
                    className="input-field w-full"
                    type="text"
                    placeholder="mis. Matematika"
                    list="daftar-mapel"
                    value={form.mata_pelajaran}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm({ ...form, mata_pelajaran: v })
                      if (!editId) isiOtomatis(v)
                    }}
                    required
                  />
                  <datalist id="daftar-mapel">
                    {Object.keys(CP_DEFAULT).map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="label-field">Semester</label>
                  <select
                    className="input-field w-full"
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  >
                    {SEMESTER_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">Tahun Ajaran</label>
                  <input
                    className="input-field w-full"
                    type="text"
                    placeholder="2026/2027"
                    value={form.tahun_ajaran}
                    onChange={(e) => setForm({ ...form, tahun_ajaran: e.target.value })}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="label-field">Capaian Pembelajaran (opsional)</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isiOtomatis(form.mata_pelajaran, true)) {
                          alert('Draf otomatis tidak tersedia. Pilih mata pelajaran dari daftar dan pastikan nama kelas memuat angka 1-6 atau I-VI.')
                        }
                      }}
                      className="text-xs font-medium text-brass-600 hover:underline"
                    >
                      Isi CP &amp; Tujuan otomatis
                    </button>
                  </div>
                  <textarea
                    className="input-field w-full"
                    rows={3}
                    value={form.capaian_pembelajaran}
                    onChange={(e) => setForm({ ...form, capaian_pembelajaran: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-field">Tujuan Pembelajaran (opsional)</label>
                  <textarea
                    className="input-field w-full"
                    rows={3}
                    value={form.tujuan_pembelajaran}
                    onChange={(e) => setForm({ ...form, tujuan_pembelajaran: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-field">Materi Pokok (opsional)</label>
                  <textarea
                    className="input-field w-full"
                    rows={3}
                    value={form.materi_pokok}
                    onChange={(e) => setForm({ ...form, materi_pokok: e.target.value })}
                  />
                  <PilihanCepat
                    pilihan={cariMateriDefault(form.mata_pelajaran, kelasTerpilih?.nama_kelas)}
                    nilai={form.materi_pokok}
                    onChange={(v) => setForm({ ...form, materi_pokok: v })}
                    pemisah={'\n'}
                    kosongPesan="Pilih mata pelajaran dari daftar agar saran materi pokok muncul."
                  />
                </div>
                <div>
                  <label className="label-field">Alokasi Waktu (opsional)</label>
                  <input
                    className="input-field w-full"
                    type="text"
                    placeholder="mis. 5 x 35 menit / minggu"
                    value={form.alokasi_waktu}
                    onChange={(e) => setForm({ ...form, alokasi_waktu: e.target.value })}
                  />
                  <PilihanCepat
                    mode="single"
                    pilihan={ALOKASI_WAKTU}
                    nilai={form.alokasi_waktu}
                    onChange={(v) => setForm({ ...form, alokasi_waktu: v })}
                  />
                </div>
                <div>
                  <label className="label-field">Penilaian (opsional)</label>
                  <input
                    className="input-field w-full"
                    type="text"
                    placeholder="mis. Tes tulis, praktik, portofolio"
                    value={form.penilaian}
                    onChange={(e) => setForm({ ...form, penilaian: e.target.value })}
                  />
                  <PilihanCepat
                    pilihan={PENILAIAN}
                    nilai={form.penilaian}
                    onChange={(v) => setForm({ ...form, penilaian: v })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-field">Sumber Belajar (opsional)</label>
                  <input
                    className="input-field w-full"
                    type="text"
                    placeholder="mis. Buku siswa, buku guru, lingkungan sekitar"
                    value={form.sumber_belajar}
                    onChange={(e) => setForm({ ...form, sumber_belajar: e.target.value })}
                  />
                  <PilihanCepat
                    pilihan={SUMBER_BELAJAR}
                    nilai={form.sumber_belajar}
                    onChange={(v) => setForm({ ...form, sumber_belajar: v })}
                  />
                </div>
              </div>

              <button type="submit" disabled={menyimpan || !kelasTerpilih} className="btn-primary">
                {menyimpan ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {menyimpan ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Simpan Silabus'}
              </button>
            </form>
          )}

          {/* Daftar */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-display text-lg font-semibold">
                Daftar Silabus{kelasTerpilih ? ` Kelas ${kelasTerpilih.nama_kelas}` : ''}
              </h3>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleCetak}
                  className="flex items-center gap-1.5 text-xs font-medium text-ink-700/60 hover:text-ink-900 print:hidden"
                >
                  <Printer size={14} /> Cetak
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-sm text-ink-700/50">Memuat...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-ink-700/50">Belum ada silabus untuk kelas ini.</p>
            ) : (
              <ul className="divide-y divide-ink-900/[0.06]">
                {items.map((item) => {
                  const expanded = expandedId === item.id
                  const bolehEditItem = isAdmin || item.guru_id === profil?.guru_id
                  const detail = [
                    ['Capaian Pembelajaran', item.capaian_pembelajaran],
                    ['Tujuan Pembelajaran', item.tujuan_pembelajaran],
                    ['Materi Pokok', item.materi_pokok],
                    ['Alokasi Waktu', item.alokasi_waktu],
                    ['Penilaian', item.penilaian],
                    ['Sumber Belajar', item.sumber_belajar],
                  ].filter(([, v]) => v)

                  return (
                    <li key={item.id} className="py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : item.id)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-ink-900">{item.mata_pelajaran}</span>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-ink-900/[0.06] text-ink-700/60">
                              {item.semester} · {item.tahun_ajaran}
                            </span>
                            {expanded ? <ChevronUp size={13} className="text-ink-700/40 print:hidden" /> : <ChevronDown size={13} className="text-ink-700/40 print:hidden" />}
                          </div>
                        </button>

                        {bolehEditItem && (
                          <div className="flex items-center gap-1 shrink-0 print:hidden">
                            <button
                              type="button"
                              onClick={() => mulaiEdit(item)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-700/50 hover:bg-ink-900/[0.06]"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHapus(item)}
                              disabled={deletingId === item.id}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 disabled:opacity-50"
                              title="Hapus"
                            >
                              {deletingId === item.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            </button>
                          </div>
                        )}
                      </div>

                      {(expanded || false) && (
                        <div className="mt-3 rounded-lg bg-ink-900/[0.03] p-3 space-y-2">
                          {detail.length === 0 ? (
                            <p className="text-xs text-ink-700/50">Belum ada rincian.</p>
                          ) : (
                            detail.map(([label, val]) => (
                              <div key={label}>
                                <p className="text-[11px] font-medium text-ink-700/50">{label}</p>
                                <p className="text-xs text-ink-700/80 whitespace-pre-line">{val}</p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {cetak &&
        createPortal(
          <SilabusCetak
            items={items}
            kelas={kelasTerpilih}
            waliId={kelasTerpilih?.wali_kelas_id || (!isAdmin ? profil?.guru_id : null)}
            onCetak={() => cetak.win.print()}
            onTutup={tutupCetak}
          />,
          cetak.el
        )}
    </Layout>
  )
}
