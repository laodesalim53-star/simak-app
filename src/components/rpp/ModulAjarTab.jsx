import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { siapkanDariSilabus } from '../../lib/dariSilabus'
import { Download, Search, Upload, Loader2, Eye, Trash2, BookOpen } from 'lucide-react'
import PreviewModal from './PreviewModal'
import { getSignedUrl, downloadRppFile } from './rppStorage'

// Fase Kurikulum Merdeka
const FASE_OPTIONS = [
  { value: 'A', label: 'Fase A (Kelas 1–2)' },
  { value: 'B', label: 'Fase B (Kelas 3–4)' },
  { value: 'C', label: 'Fase C (Kelas 5–6)' },
  { value: 'D', label: 'Fase D (Kelas 7–9)' },
  { value: 'E', label: 'Fase E (Kelas 10)' },
  { value: 'F', label: 'Fase F (Kelas 11–12)' },
]

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 }

// Tebak fase dari teks kelas: "4", "Kelas 6", "VII A", "X / 10", "XI IPA"
function faseDariKelas(kelas) {
  const s = String(kelas || '').trim().toUpperCase()
  if (!s) return ''
  const digit = s.match(/\d+/)
  const n = digit ? parseInt(digit[0], 10) : ROMAN[s.split(/[\s/\-.]/)[0]]
  if (!n) return ''
  if (n <= 2) return 'A'
  if (n <= 4) return 'B'
  if (n <= 6) return 'C'
  if (n <= 9) return 'D'
  if (n === 10) return 'E'
  if (n <= 12) return 'F'
  return ''
}

const EMPTY_FORM = {
  judul: '',
  mata_pelajaran: '',
  kelas: '',
  fase: '',
  semester: 'Ganjil',
  tahun_ajaran: '',
  file: null,
}

export default function ModulAjarTab() {
  const { isAdmin, profil, session } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [faseManual, setFaseManual] = useState(false)
  const [query, setQuery] = useState('')
  const [filterFase, setFilterFase] = useState('')
  const [preview, setPreview] = useState(null)

  // ---- Data kiriman dari halaman Silabus (tombol "Modul Ajar") ----
  const location = useLocation()
  const dariSilabus = location.state?.dariSilabus
  const [silabusDipakai, setSilabusDipakai] = useState(false)

  useEffect(() => {
    if (!dariSilabus || silabusDipakai) return
    const d = siapkanDariSilabus(dariSilabus)
    setForm((f) => ({
      ...f,
      judul: d.judulModul,
      mata_pelajaran: d.mata_pelajaran,
      kelas: d.kelas,
      fase: faseDariKelas(d.kelas),
      semester: d.semester,
      tahun_ajaran: d.tahun_ajaran,
    }))
    setSilabusDipakai(true)
  }, [dariSilabus, silabusDipakai])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('modul_ajar')
      .select('*')
      .order('dibuat_pada', { ascending: false })
    if (error) alert('Gagal memuat Modul Ajar: ' + error.message)
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function handleKelasChange(value) {
    setForm((f) => ({
      ...f,
      kelas: value,
      // Fase ikut terisi otomatis selama belum diubah manual
      fase: faseManual ? f.fase : faseDariKelas(value),
    }))
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!form.file || !form.judul) return
    setUploading(true)

    const ext = form.file.name.split('.').pop()
    // Prefix "arsip/" dipakai supaya kebijakan storage bucket rpp-files yang sudah ada
    // untuk Arsip RPP otomatis berlaku juga (tidak perlu policy storage baru).
    const path = `arsip/modul-ajar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage.from('rpp-files').upload(path, form.file)
    if (uploadError) {
      alert('Gagal upload file: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { error: insertError } = await supabase.from('modul_ajar').insert({
      judul: form.judul,
      mata_pelajaran: form.mata_pelajaran,
      kelas: form.kelas,
      fase: form.fase,
      semester: form.semester,
      tahun_ajaran: form.tahun_ajaran,
      diupload_oleh: session?.user?.id,
      nama_pengupload: profil?.nama_lengkap || session?.user?.email,
      file_path: path,
      file_nama: form.file.name,
      file_type: form.file.type,
    })

    if (insertError) {
      alert('Gagal simpan data Modul Ajar: ' + insertError.message)
      // Rapikan file yatim kalau metadata gagal tersimpan
      await supabase.storage.from('rpp-files').remove([path])
    } else {
      setForm(EMPTY_FORM)
      setFaseManual(false)
      await load()
    }
    setUploading(false)
  }

  async function handlePreview(path, fileName) {
    try {
      const url = await getSignedUrl(path)
      setPreview({ url, fileName })
    } catch (err) {
      alert('Gagal membuka pratinjau: ' + err.message)
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Hapus Modul Ajar "${item.judul}"?`)) return
    const { error } = await supabase.from('modul_ajar').delete().eq('id', item.id)
    if (error) {
      alert('Gagal menghapus: ' + error.message)
      return
    }
    await supabase.storage.from('rpp-files').remove([item.file_path])
    await load()
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return items.filter((item) => {
      if (filterFase && item.fase !== filterFase) return false
      if (!q) return true
      return (
        item.judul?.toLowerCase().includes(q) ||
        item.mata_pelajaran?.toLowerCase().includes(q) ||
        item.nama_pengupload?.toLowerCase().includes(q) ||
        item.kelas?.toLowerCase().includes(q)
      )
    })
  }, [items, query, filterFase])

  return (
    <>
      <form onSubmit={handleUpload} className="card p-6 mb-6 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={18} className="text-ink-700/60" />
          <h3 className="font-display text-lg font-semibold">Upload Modul Ajar</h3>
        </div>
        <p className="text-xs text-ink-700/50 -mt-1 mb-2">
          Simpan Modul Ajar (Kurikulum Merdeka) langsung ke arsip, tanpa perlu persetujuan admin. Bisa diisi guru
          maupun admin.
        </p>

        {/* Rujukan dari Silabus (muncul kalau dibuka lewat tombol "Modul Ajar" di halaman Silabus) */}
        {silabusDipakai && dariSilabus && (
          <div className="rounded-xl bg-sage-500/10 px-3 py-2.5 text-xs text-ink-700 space-y-1">
            <p className="font-medium text-sage-500">Data diisi dari Silabus {dariSilabus.mata_pelajaran}</p>
            {dariSilabus.capaian_pembelajaran && (
              <p className="whitespace-pre-line">
                <strong>Capaian:</strong> {dariSilabus.capaian_pembelajaran}
              </p>
            )}
            {dariSilabus.tujuan_pembelajaran && (
              <p className="whitespace-pre-line">
                <strong>Tujuan:</strong> {dariSilabus.tujuan_pembelajaran}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="input-field sm:col-span-2"
            placeholder="Judul Modul Ajar (mis. Modul Ajar Pecahan Kelas 4)"
            value={form.judul}
            onChange={(e) => setForm({ ...form, judul: e.target.value })}
            required
          />
          <input
            className="input-field"
            placeholder="Mata Pelajaran"
            value={form.mata_pelajaran}
            onChange={(e) => setForm({ ...form, mata_pelajaran: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Kelas (mis. 4 atau VII A)"
            value={form.kelas}
            onChange={(e) => handleKelasChange(e.target.value)}
          />
          <div>
            <select
              className="input-field"
              value={form.fase}
              onChange={(e) => {
                setFaseManual(true)
                setForm({ ...form, fase: e.target.value })
              }}
            >
              <option value="">Pilih Fase</option>
              {FASE_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-ink-700/40 mt-1">Terisi otomatis dari kelas, bisa diubah.</p>
          </div>
          <select
            className="input-field"
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
          >
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
          <input
            className="input-field"
            placeholder="Tahun Ajaran (mis. 2026/2027)"
            value={form.tahun_ajaran}
            onChange={(e) => setForm({ ...form, tahun_ajaran: e.target.value })}
          />
          <input
            className="input-field"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
            required
          />
        </div>
        <button type="submit" disabled={uploading} className="btn-primary">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Mengunggah...' : 'Upload Modul Ajar'}
        </button>
      </form>

      <div className="card p-4 mb-6 grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
          <input
            className="input-field !pl-9"
            placeholder="Cari judul, mata pelajaran, pengunggah, atau kelas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="input-field" value={filterFase} onChange={(e) => setFilterFase(e.target.value)}>
          <option value="">Semua Fase</option>
          {FASE_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              Fase {f.value}
            </option>
          ))}
        </select>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold mb-4">Daftar Modul Ajar</h3>
        {loading ? (
          <p className="text-sm text-ink-700/50">Memuat...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-ink-700/50">
            {items.length === 0 ? 'Belum ada Modul Ajar diupload.' : 'Tidak ada Modul Ajar yang cocok.'}
          </p>
        ) : (
          <ul className="divide-y divide-ink-900/[0.06]">
            {filtered.map((item) => (
              <li key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.fase && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-brass-400/15 text-brass-600">
                        Fase {item.fase}
                      </span>
                    )}
                    <span className="text-sm font-medium text-ink-900 truncate">{item.judul}</span>
                  </div>
                  <p className="text-xs text-ink-700/50 mt-1">
                    {item.nama_pengupload} · {item.mata_pelajaran} · Kelas {item.kelas} · {item.semester}{' '}
                    {item.tahun_ajaran}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePreview(item.file_path, item.file_nama)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-700 hover:bg-ink-900/[0.05]"
                  >
                    <Eye size={14} /> Lihat
                  </button>
                  <button
                    onClick={() => downloadRppFile(item.file_path, item.file_nama)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-700 hover:bg-ink-900/[0.05]"
                  >
                    <Download size={14} /> Unduh
                  </button>
                  {(isAdmin || item.diupload_oleh === session?.user?.id) && (
                    <button
                      onClick={() => handleDelete(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {preview && (
        <PreviewModal url={preview.url} fileName={preview.fileName} onClose={() => setPreview(null)} />
      )}
    </>
  )
}
