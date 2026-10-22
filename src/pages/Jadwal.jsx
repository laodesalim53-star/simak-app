import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'
import { Plus, Trash2, X, Loader2, Upload, Download, CheckCircle2, AlertCircle, Pencil, Printer } from 'lucide-react'

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu']
const emptyForm = { kelas_id: '', mata_pelajaran: '', guru_id: '', hari: 'Senin', jam_mulai: '', jam_selesai: '' }

// Regex validasi jam format HH:MM
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

// Urutkan jadwal: hari (Senin → Sabtu), lalu jam mulai
function bandingJadwal(a, b) {
  const h = HARI.indexOf(a.hari) - HARI.indexOf(b.hari)
  if (h !== 0) return h
  return (a.jam_mulai || '').localeCompare(b.jam_mulai || '')
}

// CSS khusus cetak: hanya area #area-cetak yang tercetak, hitam-putih, hemat tinta
const PRINT_CSS = `
.print-only { display: none; }
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  body * { visibility: hidden !important; }
  #area-cetak, #area-cetak * { visibility: visible !important; }
  #area-cetak { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; }
  #area-cetak .no-print { display: none !important; }
  #area-cetak .print-only { display: block !important; }
  #area-cetak .kop-surat-resmi { margin-bottom: 10px !important; }
  #area-cetak .kop-surat-resmi, #area-cetak .kop-surat-resmi * { color: #000 !important; }
  #area-cetak .judul-cetak { text-align: center; margin: 8px 0 14px; }
  #area-cetak .judul-cetak h1 { font-size: 14pt; font-weight: 700; text-transform: uppercase; text-decoration: underline; margin: 0; }
  #area-cetak .judul-cetak p { font-size: 10pt; margin: 3px 0 0; }
  #area-cetak .kartu-jadwal { box-shadow: none !important; border: none !important; padding: 0 !important; margin-bottom: 18px; break-inside: avoid; page-break-inside: avoid; }
  #area-cetak .kartu-jadwal h3 { font-size: 12pt; margin-bottom: 6px !important; }
  #area-cetak table { width: 100%; border-collapse: collapse; font-size: 11pt; }
  #area-cetak thead { display: table-header-group; }
  #area-cetak tr { break-inside: avoid; page-break-inside: avoid; }
  #area-cetak th, #area-cetak td { border: 1px solid #000 !important; padding: 5px 8px !important; color: #000 !important; background: #fff !important; }
  #area-cetak th { font-weight: 700; background: #e5e5e5 !important; }
  #area-cetak tr.baris-hari td { background: #f0f0f0 !important; font-weight: 700; }
  #area-cetak h1, #area-cetak h2, #area-cetak h3 { color: #000 !important; }
  #area-cetak .footer-cetak { margin-top: 16px; font-size: 9pt; text-align: right; }
}
`

export default function Jadwal() {
  const { profil, isAdmin, loading: authLoading } = useAuth()
  const guruIdSaya = profil?.guru_id || null

  const [data, setData] = useState([])
  const [kelasList, setKelasList] = useState([])
  const [guruList, setGuruList] = useState([])
  const [guruSaya, setGuruSaya] = useState(null) // data guru milik akun yang login (non-admin)
  const [filterKelas, setFilterKelas] = useState('')
  const [filterGuru, setFilterGuru] = useState('')
  const [tampilan, setTampilan] = useState('kelas') // 'kelas' | 'hari'
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null) // null = mode tambah, isi id = mode edit

  // --- State untuk Import Massal ---
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importRows, setImportRows] = useState([]) // hasil parse + validasi
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null) // { success, failed }

  const SELECT_JADWAL = '*, kelas(nama_kelas), guru(nama_lengkap)'

  async function loadData() {
    setLoading(true)

    // ===== Admin: semua jadwal =====
    if (isAdmin) {
      const [{ data: jadwal }, { data: kelas }, { data: guru }] = await Promise.all([
        supabase.from('jadwal').select(SELECT_JADWAL).order('hari').order('jam_mulai'),
        supabase.from('kelas').select('id, nama_kelas').order('nama_kelas'),
        supabase.from('guru').select('id, nama_lengkap').order('nama_lengkap'),
      ])
      setGuruSaya(null)
      setData(jadwal || [])
      setKelasList(kelas || [])
      setGuruList(guru || [])
      setLoading(false)
      return
    }

    // ===== Guru: hanya jadwal yang diampu sendiri =====
    if (!guruIdSaya) {
      setGuruSaya(null)
      setData([])
      setKelasList([])
      setGuruList([])
      setLoading(false)
      return
    }

    const { data: saya } = await supabase
      .from('guru')
      .select('id, nama_lengkap')
      .eq('id', guruIdSaya)
      .maybeSingle()

    setGuruSaya(saya || null)
    if (!saya) {
      setData([])
      setKelasList([])
      setGuruList([])
      setLoading(false)
      return
    }

    const { data: jadwal } = await supabase
      .from('jadwal')
      .select(SELECT_JADWAL)
      .eq('guru_id', saya.id)
      .order('hari')
      .order('jam_mulai')

    const rows = jadwal || []
    // Daftar kelas untuk filter = hanya kelas yang diampu guru ini
    const kelasUnik = new Map()
    rows.forEach((j) => {
      if (j.kelas_id && !kelasUnik.has(j.kelas_id)) {
        kelasUnik.set(j.kelas_id, { id: j.kelas_id, nama_kelas: j.kelas?.nama_kelas || '—' })
      }
    })

    setData(rows)
    setGuruList([saya])
    setKelasList([...kelasUnik.values()].sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas, 'id', { numeric: true })))
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading) return // tunggu profil selesai dimuat
    loadData()
  }, [authLoading, isAdmin, guruIdSaya])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    const payload = { ...form, kelas_id: form.kelas_id || null, guru_id: form.guru_id || null }

    const { error } = editingId
      ? await supabase.from('jadwal').update(payload).eq('id', editingId)
      : await supabase.from('jadwal').insert(payload)

    setSaving(false)
    if (!error) {
      closeFormModal()
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  function handleEdit(j) {
    if (!isAdmin) return
    setForm({
      kelas_id: j.kelas_id || '',
      mata_pelajaran: j.mata_pelajaran || '',
      guru_id: j.guru_id || '',
      hari: j.hari,
      jam_mulai: j.jam_mulai?.slice(0, 5) || '',
      jam_selesai: j.jam_selesai?.slice(0, 5) || '',
    })
    setEditingId(j.id)
    setShowForm(true)
  }

  function closeFormModal() {
    setShowForm(false)
    setForm(emptyForm)
    setEditingId(null)
  }

  async function handleDelete(id) {
    if (!isAdmin) return
    if (!confirm('Hapus jadwal ini?')) return
    const { error } = await supabase.from('jadwal').delete().eq('id', id)
    if (!error) loadData()
  }

  // ================= FILTER & PENGELOMPOKAN =================

  // Guru yang dipaksa terpilih jika bukan admin
  const filterGuruAktif = isAdmin ? filterGuru : (guruSaya?.id || '')

  const filtered = data.filter((j) =>
    (!filterKelas || j.kelas_id === filterKelas) &&
    (!filterGuruAktif || j.guru_id === filterGuruAktif)
  )

  // Kelompokkan per kelas (jadwal tiap kelas, diurutkan hari lalu jam)
  const perKelas = (() => {
    const map = new Map()
    filtered.forEach((j) => {
      const key = j.kelas_id || 'tanpa-kelas'
      if (!map.has(key)) map.set(key, { id: key, nama: j.kelas?.nama_kelas || 'Tanpa Kelas', items: [] })
      map.get(key).items.push(j)
    })
    return [...map.values()]
      .map((g) => ({ ...g, items: [...g.items].sort(bandingJadwal) }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id', { numeric: true }))
  })()

  const guruTerpilih = guruList.find((g) => g.id === filterGuruAktif)
  const kelasTerpilih = kelasList.find((k) => k.id === filterKelas)
  const tampilkanKolomGuru = !filterGuruAktif // jika sudah difilter per guru, kolom guru tidak perlu

  // Jumlah kolom tabel (untuk colSpan baris hari)
  const jumlahKolomKelas = 2 + (tampilkanKolomGuru ? 1 : 0) + (isAdmin ? 1 : 0)

  const judulCetak = guruTerpilih
    ? `Jadwal Mengajar`
    : kelasTerpilih
      ? `Jadwal Pelajaran`
      : 'Jadwal Pelajaran'

  const subJudulCetak = guruTerpilih
    ? `Guru: ${guruTerpilih.nama_lengkap}${kelasTerpilih ? ` — ${kelasTerpilih.nama_kelas}` : ''}`
    : kelasTerpilih
      ? kelasTerpilih.nama_kelas
      : ''

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  function handleCetak() {
    window.print()
  }

  // Tombol aksi baris (hanya admin)
  const sel = (j) => (
    <td className="no-print px-4 py-3 text-right whitespace-nowrap">
      <button onClick={() => handleEdit(j)} className="p-1.5 hover:bg-[#6b0f1a]/10 rounded-lg text-[#6b0f1a] mr-1"><Pencil size={14} /></button>
      <button onClick={() => handleDelete(j.id)} className="p-1.5 hover:bg-[#6b0f1a]/10 rounded-lg text-[#8f1f22]"><Trash2 size={14} /></button>
    </td>
  )

  // ================= IMPORT MASSAL =================

  function parseCSVLine(line) {
    // parser CSV sederhana yang tetap menghormati tanda kutip
    const result = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQuotes = !inQuotes; continue }
      if (c === ',' && !inQuotes) { result.push(cur.trim()); cur = ''; continue }
      cur += c
    }
    result.push(cur.trim())
    return result
  }

  function buildPreview(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
    if (lines.length === 0) { setImportRows([]); return }

    // Deteksi & lewati baris header jika ada
    let startIdx = 0
    const firstCols = parseCSVLine(lines[0]).map((c) => c.toLowerCase())
    if (firstCols.includes('kelas') && firstCols.includes('hari')) startIdx = 1

    const rows = lines.slice(startIdx).map((line, idx) => {
      const cols = parseCSVLine(line)
      const [kelasNama, mapel, guruNama, hari, jamMulai, jamSelesai] = cols
      const errors = []

      const kelasMatch = kelasList.find((k) => k.nama_kelas?.toLowerCase() === (kelasNama || '').toLowerCase())
      if (!kelasNama) errors.push('Kelas kosong')
      else if (!kelasMatch) errors.push(`Kelas "${kelasNama}" tidak ditemukan`)

      if (!mapel) errors.push('Mata pelajaran kosong')

      const guruMatch = guruNama
        ? guruList.find((g) => g.nama_lengkap?.toLowerCase() === guruNama.toLowerCase())
        : null
      if (guruNama && !guruMatch) errors.push(`Guru "${guruNama}" tidak ditemukan`)

      const hariMatch = HARI.find((h) => h.toLowerCase() === (hari || '').toLowerCase())
      if (!hari) errors.push('Hari kosong')
      else if (!hariMatch) errors.push(`Hari "${hari}" tidak valid`)

      if (!jamMulai || !TIME_RE.test(jamMulai)) errors.push('Jam mulai tidak valid (format HH:MM)')
      if (!jamSelesai || !TIME_RE.test(jamSelesai)) errors.push('Jam selesai tidak valid (format HH:MM)')

      return {
        rowNumber: startIdx + idx + 1,
        raw: { kelasNama, mapel, guruNama, hari, jamMulai, jamSelesai },
        payload: errors.length === 0 ? {
          kelas_id: kelasMatch.id,
          mata_pelajaran: mapel,
          guru_id: guruMatch ? guruMatch.id : null,
          hari: hariMatch,
          jam_mulai: jamMulai,
          jam_selesai: jamSelesai,
        } : null,
        errors,
      }
    })

    setImportRows(rows)
  }

  function handleImportTextChange(e) {
    const text = e.target.value
    setImportText(text)
    buildPreview(text)
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      setImportText(text)
      buildPreview(text)
    }
    reader.readAsText(file)
  }

  function downloadTemplate() {
    const header = 'kelas,mata_pelajaran,guru,hari,jam_mulai,jam_selesai'
    const contoh = kelasList[0]
      ? `${kelasList[0].nama_kelas},Matematika,${guruList[0]?.nama_lengkap || ''},Senin,07:00,08:30`
      : 'Kelas 1A,Matematika,Nama Guru,Senin,07:00,08:30'
    const csv = `${header}\n${contoh}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_jadwal.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportSubmit() {
    if (!isAdmin) return
    const validPayloads = importRows.filter((r) => r.errors.length === 0).map((r) => r.payload)
    if (validPayloads.length === 0) return

    setImporting(true)
    const { error } = await supabase.from('jadwal').insert(validPayloads)
    setImporting(false)

    if (error) {
      alert('Gagal mengimpor: ' + error.message)
      return
    }

    setImportResult({ success: validPayloads.length, failed: importRows.length - validPayloads.length })
    loadData()
  }

  function closeImportModal() {
    setShowImport(false)
    setImportText('')
    setImportRows([])
    setImportResult(null)
  }

  const validCount = importRows.filter((r) => r.errors.length === 0).length
  const invalidCount = importRows.length - validCount

  // ================= END IMPORT MASSAL =================

  const selectCls = 'px-3 py-2 rounded-lg border border-[#6b0f1a]/15 focus:border-[#6b0f1a] focus:ring-2 focus:ring-[#6b0f1a]/20 outline-none transition-colors bg-white'
  const tabCls = (aktif) =>
    `px-3 py-2 text-sm font-medium transition-colors ${aktif ? 'bg-[#6b0f1a] text-white' : 'bg-white text-[#6b0f1a] hover:bg-[#6b0f1a]/5'}`

  const adaFilter = isAdmin ? (filterGuru || filterKelas) : filterKelas

  return (
    <Layout
      title="Jadwal Pelajaran"
      subtitle={isAdmin ? 'Susunan jam mengajar per kelas dan per guru' : 'Jadwal mengajar Anda'}
      actions={
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-[#6b0f1a] border border-[#6b0f1a]/20 hover:bg-[#6b0f1a]/5 transition-colors" onClick={handleCetak}>
            <Printer size={16} /> Cetak
          </button>
          {isAdmin && (
            <>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-[#6b0f1a] border border-[#6b0f1a]/20 hover:bg-[#6b0f1a]/5 transition-colors" onClick={() => setShowImport(true)}>
                <Upload size={16} /> Import Massal
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#6b0f1a] text-white hover:bg-[#7d1420] transition-colors shadow-sm shadow-[#6b0f1a]/30" onClick={() => setShowForm(true)}>
                <Plus size={16} /> Tambah Jadwal
              </button>
            </>
          )}
        </div>
      }
    >
      <style>{PRINT_CSS}</style>

      <div className="min-h-screen bg-gradient-to-b from-[#fdf3f1] to-[#f7e6e3] -m-4 p-4 rounded-xl">

        {/* Filter & pilihan tampilan */}
        <div className="bg-white rounded-xl border border-[#6b0f1a]/10 shadow-sm p-4 mb-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            {isAdmin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#6b0f1a]/70">Guru</label>
                <select className={`${selectCls} min-w-[12rem]`} value={filterGuru} onChange={(e) => setFilterGuru(e.target.value)}>
                  <option value="">Semua Guru</option>
                  {guruList.map((g) => <option key={g.id} value={g.id}>{g.nama_lengkap}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#6b0f1a]/70">{isAdmin ? 'Kelas' : 'Kelas yang Diampu'}</label>
              <select className={`${selectCls} min-w-[10rem]`} value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)}>
                <option value="">{isAdmin ? 'Semua Kelas' : 'Semua Kelas Saya'}</option>
                {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#6b0f1a]/70">Tampilan</label>
              <div className="inline-flex rounded-lg border border-[#6b0f1a]/20 overflow-hidden">
                <button type="button" className={tabCls(tampilan === 'kelas')} onClick={() => setTampilan('kelas')}>Per Kelas</button>
                <button type="button" className={`${tabCls(tampilan === 'hari')} border-l border-[#6b0f1a]/20`} onClick={() => setTampilan('hari')}>Per Hari</button>
              </div>
            </div>
            {adaFilter && (
              <button type="button" className="px-3 py-2 text-sm text-[#6b0f1a] underline underline-offset-2" onClick={() => { setFilterGuru(''); setFilterKelas('') }}>
                Hapus filter
              </button>
            )}
            <button type="button" onClick={handleCetak} className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#6b0f1a] text-white hover:bg-[#7d1420] transition-colors">
              <Printer size={16} /> Cetak Jadwal
            </button>
          </div>

          {guruTerpilih && (
            <p className="text-sm text-[#3b0a0a]">
              <span className="font-semibold">{guruTerpilih.nama_lengkap}</span> mengampu{' '}
              <span className="font-semibold">{perKelas.length} kelas</span>
              {perKelas.length > 0 && <> ({perKelas.map((g) => g.nama).join(', ')})</>}
              {' '}dengan total <span className="font-semibold">{filtered.length} sesi</span> per pekan.
            </p>
          )}
        </div>

        {/* Akun guru belum terhubung ke data guru */}
        {!isAdmin && !loading && !guruSaya && (
          <div className="bg-white rounded-xl border border-[#6b0f1a]/10 shadow-sm p-5 mb-4 text-sm text-[#3b0a0a]">
            Akun Anda belum terhubung ke data guru, sehingga jadwal belum bisa ditampilkan. Hubungi admin untuk menautkan akun Anda.
          </div>
        )}

        {/* ===== AREA CETAK ===== */}
        <div id="area-cetak">
          {/* Kop surat + judul: hanya muncul saat dicetak */}
          <div className="print-only">
            <KopSurat />
            <div className="judul-cetak">
              <h1>{judulCetak}</h1>
              {subJudulCetak && <p>{subJudulCetak}</p>}
            </div>
          </div>

          {tampilan === 'kelas' ? (
            <div className="space-y-5">
              {perKelas.map((g) => (
                <div key={g.id} className="kartu-jadwal bg-white rounded-xl border border-[#6b0f1a]/10 shadow-sm p-5">
                  <h3 className="font-display text-base font-semibold mb-3 text-[#3b0a0a] flex items-center gap-2">
                    <span className="no-print w-1.5 h-5 rounded-full bg-[#d4a017]"></span>
                    {g.nama}
                    <span className="text-xs font-normal text-[#6b0f1a]/60">({g.items.length} sesi)</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#6b0f1a] text-white">
                          <th className="text-left px-4 py-2.5 rounded-l-lg font-medium">Jam</th>
                          <th className="text-left px-4 py-2.5 font-medium">Mata Pelajaran</th>
                          {tampilkanKolomGuru && <th className="text-left px-4 py-2.5 font-medium">Guru</th>}
                          {isAdmin && <th className="no-print px-4 py-2.5 rounded-r-lg"></th>}
                        </tr>
                      </thead>
                      {HARI.map((hari) => {
                        const rows = g.items.filter((j) => j.hari === hari)
                        if (rows.length === 0) return null
                        return (
                          <tbody key={hari} className="divide-y divide-[#6b0f1a]/8">
                            <tr className="baris-hari bg-[#f7e6e3]">
                              <td colSpan={jumlahKolomKelas} className="px-4 py-2 text-sm font-semibold text-[#6b0f1a]">{hari}</td>
                            </tr>
                            {rows.map((j) => (
                              <tr key={j.id} className="hover:bg-[#6b0f1a]/5 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-[#6b0f1a] whitespace-nowrap">{j.jam_mulai?.slice(0, 5)} – {j.jam_selesai?.slice(0, 5)}</td>
                                <td className="px-4 py-3 font-medium text-[#3b0a0a]">{j.mata_pelajaran}</td>
                                {tampilkanKolomGuru && <td className="px-4 py-3">{j.guru?.nama_lengkap || '—'}</td>}
                                {isAdmin && sel(j)}
                              </tr>
                            ))}
                          </tbody>
                        )
                      })}
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {HARI.map((hari) => {
                const items = [...filtered].filter((j) => j.hari === hari).sort(bandingJadwal)
                if (items.length === 0) return null
                return (
                  <div key={hari} className="kartu-jadwal bg-white rounded-xl border border-[#6b0f1a]/10 shadow-sm p-5">
                    <h3 className="font-display text-base font-semibold mb-3 text-[#3b0a0a] flex items-center gap-2">
                      <span className="no-print w-1.5 h-5 rounded-full bg-[#d4a017]"></span>
                      {hari}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#6b0f1a] text-white">
                            <th className="text-left px-4 py-2.5 rounded-l-lg font-medium">Jam</th>
                            <th className="text-left px-4 py-2.5 font-medium">Kelas</th>
                            <th className="text-left px-4 py-2.5 font-medium">Mata Pelajaran</th>
                            {tampilkanKolomGuru && <th className="text-left px-4 py-2.5 font-medium">Guru</th>}
                            {isAdmin && <th className="no-print px-4 py-2.5 rounded-r-lg"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#6b0f1a]/8">
                          {items.map((j) => (
                            <tr key={j.id} className="hover:bg-[#6b0f1a]/5 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-[#6b0f1a] whitespace-nowrap">{j.jam_mulai?.slice(0, 5)} – {j.jam_selesai?.slice(0, 5)}</td>
                              <td className="px-4 py-3">{j.kelas?.nama_kelas || '—'}</td>
                              <td className="px-4 py-3 font-medium text-[#3b0a0a]">{j.mata_pelajaran}</td>
                              {tampilkanKolomGuru && <td className="px-4 py-3">{j.guru?.nama_lengkap || '—'}</td>}
                              {isAdmin && sel(j)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!loading && filtered.length === 0 && (isAdmin || guruSaya) && (
            <p className="text-sm text-[#6b0f1a]/50">
              {adaFilter ? 'Tidak ada jadwal yang cocok dengan filter ini.' : 'Belum ada jadwal untuk ditampilkan.'}
            </p>
          )}

          <div className="print-only footer-cetak">Dicetak pada {tanggalCetak}</div>
        </div>
        {/* ===== END AREA CETAK ===== */}

        {isAdmin && showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3b0a0a]/50 backdrop-blur-sm p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative border-t-4 border-[#6b0f1a]">
              <button type="button" onClick={closeFormModal} className="absolute top-4 right-4 text-[#6b0f1a]/40 hover:text-[#6b0f1a]"><X size={20} /></button>
              <h2 className="font-display text-xl font-semibold mb-4 text-[#3b0a0a]">{editingId ? 'Edit Jadwal' : 'Tambah Jadwal'}</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#6b0f1a]/70 uppercase tracking-wide mb-1.5 block">Kelas</label>
                  <select required className="w-full px-3 py-2 rounded-lg border border-[#6b0f1a]/15 focus:border-[#6b0f1a] focus:ring-2 focus:ring-[#6b0f1a]/20 outline-none transition-colors" value={form.kelas_id} onChange={(e) => setForm({ ...form, kelas_id: e.target.value })}>
                    <option value="">Pilih kelas</option>
                    {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b0f1a]/70 uppercase tracking-wide mb-1.5 block">Mata Pelajaran</label>
                  <input required className="w-full px-3 py-2 rounded-lg border border-[#6b0f1a]/15 focus:border-[#6b0f1a] focus:ring-2 focus:ring-[#6b0f1a]/20 outline-none transition-colors" value={form.mata_pelajaran} onChange={(e) => setForm({ ...form, mata_pelajaran: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b0f1a]/70 uppercase tracking-wide mb-1.5 block">Guru Pengajar</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-[#6b0f1a]/15 focus:border-[#6b0f1a] focus:ring-2 focus:ring-[#6b0f1a]/20 outline-none transition-colors" value={form.guru_id} onChange={(e) => setForm({ ...form, guru_id: e.target.value })}>
                    <option value="">— Pilih guru —</option>
                    {guruList.map((g) => <option key={g.id} value={g.id}>{g.nama_lengkap}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b0f1a]/70 uppercase tracking-wide mb-1.5 block">Hari</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-[#6b0f1a]/15 focus:border-[#6b0f1a] focus:ring-2 focus:ring-[#6b0f1a]/20 outline-none transition-colors" value={form.hari} onChange={(e) => setForm({ ...form, hari: e.target.value })}>
                    {HARI.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#6b0f1a]/70 uppercase tracking-wide mb-1.5 block">Jam Mulai</label>
                    <input required type="time" className="w-full px-3 py-2 rounded-lg border border-[#6b0f1a]/15 focus:border-[#6b0f1a] focus:ring-2 focus:ring-[#6b0f1a]/20 outline-none transition-colors" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#6b0f1a]/70 uppercase tracking-wide mb-1.5 block">Jam Selesai</label>
                    <input required type="time" className="w-full px-3 py-2 rounded-lg border border-[#6b0f1a]/15 focus:border-[#6b0f1a] focus:ring-2 focus:ring-[#6b0f1a]/20 outline-none transition-colors" value={form.jam_selesai} onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#f7e6e3] text-[#6b0f1a] hover:bg-[#efd3ce] transition-colors" onClick={closeFormModal}>Batal</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#6b0f1a] text-white hover:bg-[#7d1420] transition-colors disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />} {editingId ? 'Update' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        )}

        {isAdmin && showImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3b0a0a]/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 relative border-t-4 border-[#6b0f1a] max-h-[90vh] overflow-y-auto">
              <button type="button" onClick={closeImportModal} className="absolute top-4 right-4 text-[#6b0f1a]/40 hover:text-[#6b0f1a]"><X size={20} /></button>
              <h2 className="font-display text-xl font-semibold mb-1 text-[#3b0a0a]">Import Jadwal Massal</h2>
              <p className="text-sm text-[#6b0f1a]/60 mb-4">Unggah file CSV atau tempel data langsung. Kolom: kelas, mata_pelajaran, guru, hari, jam_mulai, jam_selesai</p>

              {!importResult && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#f7e6e3] text-[#6b0f1a] hover:bg-[#efd3ce] transition-colors cursor-pointer">
                      <Upload size={16} /> Pilih File CSV
                      <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
                    </label>
                    <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-[#6b0f1a] border border-[#6b0f1a]/20 hover:bg-[#6b0f1a]/5 transition-colors">
                      <Download size={16} /> Unduh Template
                    </button>
                  </div>

                  <textarea
                    className="w-full h-32 px-3 py-2 rounded-lg border border-[#6b0f1a]/15 focus:border-[#6b0f1a] focus:ring-2 focus:ring-[#6b0f1a]/20 outline-none transition-colors font-mono text-xs"
                    placeholder="kelas,mata_pelajaran,guru,hari,jam_mulai,jam_selesai&#10;Kelas 1A,Matematika,Budi Santoso,Senin,07:00,08:30"
                    value={importText}
                    onChange={handleImportTextChange}
                  />

                  {importRows.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-4 mb-2 text-sm">
                        <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={14} /> {validCount} valid</span>
                        {invalidCount > 0 && <span className="inline-flex items-center gap-1 text-red-700"><AlertCircle size={14} /> {invalidCount} bermasalah</span>}
                      </div>
                      <div className="max-h-60 overflow-y-auto border border-[#6b0f1a]/10 rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[#6b0f1a] text-white">
                            <tr>
                              <th className="text-left px-3 py-2">#</th>
                              <th className="text-left px-3 py-2">Kelas</th>
                              <th className="text-left px-3 py-2">Mapel</th>
                              <th className="text-left px-3 py-2">Guru</th>
                              <th className="text-left px-3 py-2">Hari</th>
                              <th className="text-left px-3 py-2">Jam</th>
                              <th className="text-left px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#6b0f1a]/8">
                            {importRows.map((r) => (
                              <tr key={r.rowNumber} className={r.errors.length ? 'bg-red-50' : ''}>
                                <td className="px-3 py-2">{r.rowNumber}</td>
                                <td className="px-3 py-2">{r.raw.kelasNama}</td>
                                <td className="px-3 py-2">{r.raw.mapel}</td>
                                <td className="px-3 py-2">{r.raw.guruNama || '—'}</td>
                                <td className="px-3 py-2">{r.raw.hari}</td>
                                <td className="px-3 py-2">{r.raw.jamMulai}–{r.raw.jamSelesai}</td>
                                <td className="px-3 py-2">
                                  {r.errors.length === 0
                                    ? <span className="text-emerald-700">OK</span>
                                    : <span className="text-red-700">{r.errors.join('; ')}</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex justify-end gap-3">
                    <button type="button" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#f7e6e3] text-[#6b0f1a] hover:bg-[#efd3ce] transition-colors" onClick={closeImportModal}>Batal</button>
                    <button
                      type="button"
                      disabled={importing || validCount === 0}
                      onClick={handleImportSubmit}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#6b0f1a] text-white hover:bg-[#7d1420] transition-colors disabled:opacity-50"
                    >
                      {importing && <Loader2 size={16} className="animate-spin" />} Import {validCount > 0 ? `${validCount} Jadwal` : ''}
                    </button>
                  </div>
                </>
              )}

              {importResult && (
                <div className="text-center py-8">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-600 mb-3" />
                  <p className="font-medium text-[#3b0a0a]">Berhasil mengimpor {importResult.success} jadwal.</p>
                  {importResult.failed > 0 && <p className="text-sm text-red-700 mt-1">{importResult.failed} baris dilewati karena tidak valid.</p>}
                  <button type="button" onClick={closeImportModal} className="mt-5 px-4 py-2 rounded-lg text-sm font-medium bg-[#6b0f1a] text-white hover:bg-[#7d1420] transition-colors">Tutup</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
