import { useEffect, useRef, useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import {
  Plus, Pencil, Trash2, Search, X, Loader2, Upload, Download,
  ClipboardList, ListChecks,
} from 'lucide-react'
import { OPSI_KOMPONEN_BOK, OPSI_SATUAN, formatRupiah } from './utils'
import {
  KATALOG_KEGIATAN_BOK,
  KATALOG_KEGIATAN_DIKELOMPOKKAN,
  kunciKatalog,
  kelompokkanKatalog,
} from './katalogKegiatan'
import {
  koefKosong,
  parseRumus,
  hitungDariKoef,
  parsePoaSheet,
  parseFlatSheet,
  buatWorkbookTemplatePoa,
} from './importPoa'

// ============================================================
// TAB 1: RINCIAN KEGIATAN (RKA / POA)
// - kode_rekening diisi sekali per kegiatan, ditarik otomatis ke BKU.
// - Katalog/Template kegiatan: lihat katalogKegiatan.js.
// - Kolom disesuaikan dengan format POA Puskesmas (file RPD):
//   Kode Kegiatan, Tujuan, Sasaran, Target, PJ, Jenis Belanja,
//   Uraian Belanja, dan Rumus Volume (mis. "3 Org x 1 Hr x 1 Desa x 1 Keg").
// - Import/Template Excel format POA: lihat importPoa.js.
// ============================================================

const emptyFormRka = {
  tahun_anggaran: new Date().getFullYear(),
  kode_kegiatan: '',
  komponen: '',
  sub_komponen: '',
  rincian_kegiatan: '',
  tujuan: '',
  sasaran: '',
  target: '',
  penanggung_jawab: '',
  jenis_belanja: '',
  uraian_belanja: '',
  koef: koefKosong(),
  volume: 1,
  satuan: '',
  harga_satuan: '',
  kode_rekening: '',
  bulan_pelaksanaan: '',
  keterangan: '',
}

export default function TabRKA() {
  const { sekolahId } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tahunFilter, setTahunFilter] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyFormRka)
  const [saving, setSaving] = useState(false)

  // == Import massal dari Excel ==
  const fileInputRef = useRef(null)
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState([])
  const [importFileName, setImportFileName] = useState('')
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)

  // == Template/Katalog Kegiatan BOK (isi cepat & massal) ==
  const [showTemplate, setShowTemplate] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateSelected, setTemplateSelected] = useState(() => new Set())
  const [templateSaving, setTemplateSaving] = useState(false)

  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('rka_bok')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .eq('tahun_anggaran', tahunFilter)
      .order('komponen')
      .order('dibuat_pada')

    if (error) alert('Gagal memuat RKA: ' + error.message)
    setData(rows || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, tahunFilter])

  function openAdd() {
    setForm({ ...emptyFormRka, koef: koefKosong(), tahun_anggaran: tahunFilter })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      ...emptyFormRka,
      ...row,
      kode_kegiatan: row.kode_kegiatan ?? '',
      tujuan: row.tujuan ?? '',
      sasaran: row.sasaran ?? '',
      target: row.target ?? '',
      penanggung_jawab: row.penanggung_jawab ?? '',
      jenis_belanja: row.jenis_belanja ?? '',
      uraian_belanja: row.uraian_belanja ?? '',
      koef: parseRumus(row.rumus_volume),
      volume: String(row.volume),
      harga_satuan: String(row.harga_satuan),
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  // Isi otomatis Komponen, Sub Komponen, Rincian Kegiatan & Satuan dari
  // katalog kegiatan BOK — Volume, Harga Satuan & Kode Rekening tetap
  // diisi manual karena nilainya spesifik per puskesmas/tahun anggaran.
  // Kolom POA (kode, tujuan, sasaran, target, PJ, jenis belanja, uraian)
  // ikut terisi bila katalog menyediakannya.
  function pilihDariKatalog(item) {
    setForm((prev) => ({
      ...prev,
      komponen: item.komponen,
      sub_komponen: item.sub_komponen || '',
      rincian_kegiatan: item.rincian_kegiatan,
      satuan: item.satuan || '',
      kode_kegiatan: item.kode_kegiatan || prev.kode_kegiatan,
      tujuan: item.tujuan || prev.tujuan,
      sasaran: item.sasaran || prev.sasaran,
      target: item.target || prev.target,
      penanggung_jawab: item.penanggung_jawab || prev.penanggung_jawab,
      jenis_belanja: item.jenis_belanja || prev.jenis_belanja,
      uraian_belanja: item.uraian_belanja || prev.uraian_belanja,
    }))
  }

  function ubahKoef(index, field, value) {
    setForm((prev) => {
      const koef = prev.koef.map((k, i) => (i === index ? { ...k, [field]: value } : k))
      const hitung = hitungDariKoef(koef)
      return hitung
        ? { ...prev, koef, volume: String(hitung.volume), satuan: hitung.satuan || prev.satuan }
        : { ...prev, koef }
    })
  }

  // Volume otomatis dari rumus (bila terisi), kalau tidak pakai input Volume manual.
  const hitungForm = useMemo(() => hitungDariKoef(form.koef), [form.koef])
  const volumeForm = hitungForm ? hitungForm.volume : Number(form.volume) || 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) return
    setSaving(true)
    const hitung = hitungDariKoef(form.koef)
    const volume = hitung ? hitung.volume : Number(form.volume) || 0
    const satuan = hitung ? (hitung.satuan || form.satuan) : form.satuan
    const hargaSatuan = Number(form.harga_satuan) || 0
    const payload = {
      sekolah_id: sekolahId,
      tahun_anggaran: Number(form.tahun_anggaran),
      kode_kegiatan: form.kode_kegiatan || null,
      komponen: form.komponen,
      sub_komponen: form.sub_komponen || null,
      rincian_kegiatan: form.rincian_kegiatan,
      tujuan: form.tujuan || null,
      sasaran: form.sasaran || null,
      target: form.target || null,
      penanggung_jawab: form.penanggung_jawab || null,
      jenis_belanja: form.jenis_belanja || null,
      uraian_belanja: form.uraian_belanja || null,
      rumus_volume: hitung ? hitung.rumus : null,
      volume,
      satuan: satuan || null,
      harga_satuan: hargaSatuan,
      jumlah_anggaran: volume * hargaSatuan,
      kode_rekening: form.kode_rekening || null,
      bulan_pelaksanaan: form.bulan_pelaksanaan || null,
      keterangan: form.keterangan || null,
      diperbarui_pada: new Date().toISOString(),
    }
    const { error } = editingId
      ? await supabase.from('rka_bok').update(payload).eq('id', editingId).eq('sekolah_id', sekolahId)
      : await supabase.from('rka_bok').insert(payload)
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus rincian kegiatan ini?')) return
    const { error } = await supabase.from('rka_bok').delete().eq('id', id).eq('sekolah_id', sekolahId)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  function bukaDialogImport() {
    setImportError('')
    fileInputRef.current?.click()
  }

  function tutupImport() {
    setShowImport(false)
    setImportRows([])
    setImportError('')
  }

  async function handleFileImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    setImportFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })

      // 1) Format POA/RPD Puskesmas — setiap sheet dianggap satu bulan.
      let hasil = []
      for (const nama of wb.SheetNames) {
        hasil.push(...parsePoaSheet(XLSX, wb.Sheets[nama], nama, tahunFilter))
      }

      // 2) Cadangan: format datar lama (satu baris judul di baris pertama).
      if (hasil.length === 0) {
        const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes('rka')) || wb.SheetNames[0]
        hasil = parseFlatSheet(XLSX, wb.Sheets[sheetName], tahunFilter)
      }

      if (hasil.length === 0) {
        setImportError(
          'Format file tidak dikenali. Gunakan format POA (judul kolom: UPAYA KESEHATAN, KEGIATAN, TUJUAN, SASARAN, TARGET, PJ, URAIAN, HARGA SATUAN) atau unduh "Template Excel" sebagai contoh.'
        )
      }
      setImportRows(hasil)
      setShowImport(true)
    } catch (err) {
      setImportError('Gagal membaca file: ' + err.message)
      setImportRows([])
      setShowImport(true)
    } finally {
      e.target.value = '' // reset supaya file yang sama bisa dipilih ulang
    }
  }

  function hapusBarisImport(index) {
    setImportRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function simpanImport() {
    if (!sekolahId) return
    const barisValid = importRows.filter((r) => r._valid)
    if (barisValid.length === 0) return
    setImporting(true)
    const payload = barisValid.map((r) => ({
      sekolah_id: sekolahId,
      tahun_anggaran: r.tahun_anggaran,
      kode_kegiatan: r.kode_kegiatan || null,
      komponen: r.komponen,
      sub_komponen: r.sub_komponen || null,
      rincian_kegiatan: r.rincian_kegiatan,
      tujuan: r.tujuan || null,
      sasaran: r.sasaran || null,
      target: r.target || null,
      penanggung_jawab: r.penanggung_jawab || null,
      jenis_belanja: r.jenis_belanja || null,
      uraian_belanja: r.uraian_belanja || null,
      rumus_volume: r.rumus_volume || null,
      volume: r.volume,
      satuan: r.satuan || null,
      harga_satuan: r.harga_satuan,
      jumlah_anggaran: r.jumlah_anggaran,
      kode_rekening: r.kode_rekening || null,
      bulan_pelaksanaan: r.bulan_pelaksanaan || null,
      keterangan: r.keterangan || null,
    }))
    const { error } = await supabase.from('rka_bok').insert(payload)
    setImporting(false)
    if (!error) {
      setShowImport(false)
      setImportRows([])
      setImportFileName('')
      loadData()
    } else {
      setImportError('Gagal menyimpan ke database: ' + error.message)
    }
  }

  // Template Excel dibuat langsung di browser (tidak perlu file statis di
  // server) — mengikuti format POA/RPD Puskesmas: judul, Upaya Kesehatan,
  // Sub Komponen, kegiatan + belanja, rumus volume, dan baris TOTAL.
  function unduhTemplate() {
    XLSX.writeFile(buatWorkbookTemplatePoa(XLSX, tahunFilter), 'template-poa-bok.xlsx')
  }

  const filtered = data.filter((r) =>
    `${r.kode_kegiatan || ''} ${r.komponen} ${r.sub_komponen} ${r.rincian_kegiatan} ${r.penanggung_jawab || ''} ${r.jenis_belanja || ''} ${r.uraian_belanja || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const totalAnggaran = useMemo(
    () => filtered.reduce((sum, r) => sum + Number(r.jumlah_anggaran || 0), 0),
    [filtered]
  )

  // Kelompokkan per komponen — sesuai format RKA/POA BOK.
  const dikelompokkan = useMemo(() => {
    const map = {}
    for (const r of filtered) {
      const key = r.komponen || '(Tanpa Komponen)'
      if (!map[key]) map[key] = []
      map[key].push(r)
    }
    return map
  }, [filtered])

  // Kunci kegiatan yang sudah tercatat di tahun yang difilter — supaya
  // katalog tidak menambahkan kegiatan yang sama dua kali.
  const kunciSudahAda = useMemo(() => {
    const set = new Set()
    for (const r of data) {
      set.add(`${r.komponen}|${r.sub_komponen || ''}|${r.rincian_kegiatan}`)
    }
    return set
  }, [data])

  function bukaTemplate() {
    // Default: centang semua kegiatan katalog yang BELUM ada di tahun ini.
    const awal = new Set(
      KATALOG_KEGIATAN_BOK.filter((item) => !kunciSudahAda.has(kunciKatalog(item))).map(kunciKatalog)
    )
    setTemplateSelected(awal)
    setTemplateSearch('')
    setShowTemplate(true)
  }

  function toggleTemplateItem(kunci) {
    setTemplateSelected((prev) => {
      const next = new Set(prev)
      if (next.has(kunci)) next.delete(kunci)
      else next.add(kunci)
      return next
    })
  }

  function toggleSemuaDalamKomponen(items, tandai) {
    setTemplateSelected((prev) => {
      const next = new Set(prev)
      for (const item of items) {
        const kunci = kunciKatalog(item)
        if (kunciSudahAda.has(kunci)) continue // yang sudah ada tidak bisa dipilih ulang
        if (tandai) next.add(kunci)
        else next.delete(kunci)
      }
      return next
    })
  }

  const katalogTerfilter = useMemo(() => {
    const q = templateSearch.trim().toLowerCase()
    if (!q) return KATALOG_KEGIATAN_BOK
    return KATALOG_KEGIATAN_BOK.filter((item) =>
      `${item.komponen} ${item.sub_komponen} ${item.rincian_kegiatan}`.toLowerCase().includes(q)
    )
  }, [templateSearch])

  const katalogDikelompokkan = useMemo(() => kelompokkanKatalog(katalogTerfilter), [katalogTerfilter])

  async function simpanTemplate() {
    if (!sekolahId) return
    const dipilih = KATALOG_KEGIATAN_BOK.filter(
      (item) => templateSelected.has(kunciKatalog(item)) && !kunciSudahAda.has(kunciKatalog(item))
    )
    if (dipilih.length === 0) return
    setTemplateSaving(true)
    const payload = dipilih.map((item) => ({
      sekolah_id: sekolahId,
      tahun_anggaran: tahunFilter,
      kode_kegiatan: item.kode_kegiatan || null,
      komponen: item.komponen,
      sub_komponen: item.sub_komponen || null,
      rincian_kegiatan: item.rincian_kegiatan,
      tujuan: item.tujuan || null,
      sasaran: item.sasaran || null,
      target: item.target || null,
      penanggung_jawab: item.penanggung_jawab || null,
      jenis_belanja: item.jenis_belanja || null,
      uraian_belanja: item.uraian_belanja || null,
      rumus_volume: null,
      volume: 1,
      satuan: item.satuan || null,
      harga_satuan: 0,
      jumlah_anggaran: 0,
      kode_rekening: null,
      bulan_pelaksanaan: null,
      keterangan: null,
    }))
    const { error } = await supabase.from('rka_bok').insert(payload)
    setTemplateSaving(false)
    if (!error) {
      setShowTemplate(false)
      loadData()
    } else {
      alert('Gagal menambahkan dari template: ' + error.message)
    }
  }

  return (
    <>
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:flex-wrap w-full sm:w-auto">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 hidden sm:flex">
              <ClipboardList size={18} />
            </div>
            <div className="relative max-w-xs w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input
                className="input-field pl-9"
                placeholder="Cari kode/komponen/kegiatan/PJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input-field w-full sm:w-28"
              value={tahunFilter}
              onChange={(e) => setTahunFilter(Number(e.target.value))}
            >
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map((th) => (
                <option key={th} value={th}>{th}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileImport}
            />
            <button type="button" className="btn-secondary w-full sm:w-auto justify-center" onClick={bukaTemplate} title="Isi cepat dari katalog kegiatan BOK umum">
              <ListChecks size={16} /> Template Kegiatan BOK
            </button>
            <button type="button" className="btn-secondary w-full sm:w-auto justify-center" onClick={unduhTemplate} title="Unduh contoh format Excel (format POA/RPD)">
              <Download size={16} /> Template Excel
            </button>
            <button type="button" className="btn-secondary w-full sm:w-auto justify-center" onClick={bukaDialogImport}>
              <Upload size={16} /> Import dari Excel
            </button>
            <button className="btn-primary w-full sm:w-auto justify-center" onClick={openAdd}>
              <Plus size={16} /> Tambah Rincian Kegiatan
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4 flex items-center justify-between">
        <span className="text-sm text-ink-700/60">Total Anggaran Tahun {tahunFilter}</span>
        <span className="font-display text-lg font-semibold text-emerald-700">{formatRupiah(totalAnggaran)}</span>
      </div>

      {loading && <p className="text-center py-8 text-ink-700/50 text-sm">Memuat data...</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-center py-8 text-ink-700/50 text-sm">Belum ada rincian kegiatan untuk tahun ini.</p>
      )}

      {!loading && Object.entries(dikelompokkan).map(([komponen, rows]) => (
        <div key={komponen} className="card overflow-x-auto mb-4">
          <div className="px-4 py-2.5 bg-emerald-600/[0.06] border-b border-emerald-600/10">
            <p className="font-display font-semibold text-sm text-emerald-800">{komponen}</p>
          </div>
          <table className="table-shell">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Sub Komponen</th>
                <th>Rincian Kegiatan</th>
                <th>Sasaran</th>
                <th>Target</th>
                <th>PJ</th>
                <th>Jenis Belanja</th>
                <th>Uraian</th>
                <th>Rumus Volume</th>
                <th>Vol</th>
                <th>Satuan</th>
                <th>Harga Satuan</th>
                <th>Jumlah</th>
                <th>Kode Rekening</th>
                <th>Bulan Pelaksanaan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-emerald-600/[0.03] transition-colors">
                  <td className="font-mono text-xs whitespace-nowrap">{r.kode_kegiatan || '-'}</td>
                  <td>{r.sub_komponen || '-'}</td>
                  <td>
                    <span className="block font-medium">{r.rincian_kegiatan}</span>
                    {r.tujuan && <span className="block text-xs text-ink-700/50 mt-0.5">Tujuan: {r.tujuan}</span>}
                  </td>
                  <td className="text-xs">{r.sasaran || '-'}</td>
                  <td className="text-xs">{r.target || '-'}</td>
                  <td className="text-xs">{r.penanggung_jawab || '-'}</td>
                  <td className="text-xs">{r.jenis_belanja || '-'}</td>
                  <td className="text-xs">{r.uraian_belanja || '-'}</td>
                  <td className="text-xs whitespace-nowrap">{r.rumus_volume || '-'}</td>
                  <td>{r.volume}</td>
                  <td>{r.satuan || '-'}</td>
                  <td>{formatRupiah(r.harga_satuan)}</td>
                  <td className="font-semibold text-emerald-700">{formatRupiah(r.jumlah_anggaran)}</td>
                  <td className="font-mono text-xs">{r.kode_rekening || '-'}</td>
                  <td className="text-xs">{r.bulan_pelaksanaan || '-'}</td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(r)} className="p-2.5 sm:p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70 touch-manipulation">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-2.5 sm:p-2 hover:bg-red-900/10 rounded-lg text-red-900/70 touch-manipulation">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-2 sm:p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900 p-1 touch-manipulation">
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-4">{editingId ? 'Ubah Rincian Kegiatan' : 'Tambah Rincian Kegiatan'}</h2>

            <div className="mb-4 p-3 rounded-lg bg-emerald-600/[0.06]">
              <label className="eyebrow mb-1.5 block text-emerald-700">Pilih dari Katalog Kegiatan BOK (opsional)</label>
              <select
                className="input-field"
                value=""
                onChange={(e) => {
                  const item = KATALOG_KEGIATAN_BOK.find((k) => kunciKatalog(k) === e.target.value)
                  if (item) pilihDariKatalog(item)
                }}
              >
                <option value="">— Ketik manual atau pilih kegiatan dari katalog —</option>
                {Object.entries(KATALOG_KEGIATAN_DIKELOMPOKKAN).map(([komponen, items]) => (
                  <optgroup key={komponen} label={komponen}>
                    {items.map((item) => (
                      <option key={kunciKatalog(item)} value={kunciKatalog(item)}>
                        {item.sub_komponen ? `${item.sub_komponen} — ` : ''}{item.rincian_kegiatan}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-ink-700/40 mt-1">
                Memilih kegiatan akan mengisi Komponen, Sub Komponen, Rincian Kegiatan & Satuan secara otomatis — Volume, Harga Satuan & Kode Rekening tetap perlu diisi manual.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="eyebrow mb-1.5 block">Tahun Anggaran</label>
                <input type="number" required className="input-field" value={form.tahun_anggaran} onChange={(e) => setForm({ ...form, tahun_anggaran: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Kode Kegiatan (opsional)</label>
                <input
                  className="input-field"
                  placeholder="Contoh: 2.3.1"
                  value={form.kode_kegiatan}
                  onChange={(e) => setForm({ ...form, kode_kegiatan: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Komponen (Upaya Kesehatan)</label>
                <input
                  required
                  list="opsi-komponen-bok"
                  className="input-field"
                  value={form.komponen}
                  onChange={(e) => setForm({ ...form, komponen: e.target.value })}
                  placeholder="Pilih atau ketik sendiri"
                />
                <datalist id="opsi-komponen-bok">
                  {OPSI_KOMPONEN_BOK.map((k) => <option key={k} value={k} />)}
                </datalist>
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Sub Komponen (opsional)</label>
                <input className="input-field" value={form.sub_komponen} onChange={(e) => setForm({ ...form, sub_komponen: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Rincian Kegiatan</label>
                <textarea required rows={2} className="input-field" value={form.rincian_kegiatan} onChange={(e) => setForm({ ...form, rincian_kegiatan: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Tujuan (opsional)</label>
                <textarea rows={2} className="input-field" value={form.tujuan} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Sasaran (opsional)</label>
                <input className="input-field" placeholder="Contoh: Masyarakat" value={form.sasaran} onChange={(e) => setForm({ ...form, sasaran: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Target (opsional)</label>
                <input className="input-field" placeholder="Contoh: Ibu Hamil" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Penanggung Jawab / PJ (opsional)</label>
                <input className="input-field" placeholder="Contoh: Bidan, Perawat, Gizi, Kapus" value={form.penanggung_jawab} onChange={(e) => setForm({ ...form, penanggung_jawab: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Jenis Belanja (opsional)</label>
                <input
                  className="input-field"
                  list="opsi-jenis-belanja"
                  placeholder="Contoh: Belanja Makan"
                  value={form.jenis_belanja}
                  onChange={(e) => setForm({ ...form, jenis_belanja: e.target.value })}
                />
                <datalist id="opsi-jenis-belanja">
                  <option value="Belanja Perjalanan Dinas Dalam Daerah" />
                  <option value="Belanja Makan" />
                  <option value="Pemberian Insentif UKM" />
                </datalist>
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Uraian Belanja (opsional)</label>
                <input className="input-field" placeholder="Contoh: - Transport Lokal" value={form.uraian_belanja} onChange={(e) => setForm({ ...form, uraian_belanja: e.target.value })} />
              </div>

              {/* Rumus volume: faktor pengali ala POA (Org x Hr x Desa x Keg) */}
              <div className="sm:col-span-2 p-3 rounded-lg bg-emerald-600/[0.06]">
                <label className="eyebrow mb-1.5 block text-emerald-700">Rumus Volume (opsional)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {form.koef.map((k, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="input-field w-16"
                        placeholder="Jml"
                        value={k.jumlah}
                        onChange={(e) => ubahKoef(i, 'jumlah', e.target.value)}
                      />
                      <input
                        className="input-field min-w-0"
                        placeholder={['Org', 'Hr', 'Desa', 'Keg'][i]}
                        value={k.satuan}
                        onChange={(e) => ubahKoef(i, 'satuan', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink-700/40 mt-1">
                  {hitungForm
                    ? `${hitungForm.rumus} = ${hitungForm.volume} (Volume & Satuan terisi otomatis)`
                    : 'Contoh: 3 Org x 1 Hr x 1 Desa x 1 Keg. Kosongkan bila Volume ingin diisi langsung.'}
                </p>
              </div>

              <div>
                <label className="eyebrow mb-1.5 block">Volume</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  disabled={!!hitungForm}
                  className="input-field disabled:opacity-60"
                  value={hitungForm ? hitungForm.volume : form.volume}
                  onChange={(e) => setForm({ ...form, volume: e.target.value })}
                />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Satuan</label>
                <input list="opsi-satuan-bok" className="input-field" value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} />
                <datalist id="opsi-satuan-bok">
                  {OPSI_SATUAN.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Harga Satuan (Rp)</label>
                <input type="number" min="0" required className="input-field" value={form.harga_satuan} onChange={(e) => setForm({ ...form, harga_satuan: e.target.value })} />
              </div>
              <div className="sm:col-span-2 p-3 rounded-lg bg-emerald-600/[0.06] flex items-center justify-between">
                <span className="text-sm text-ink-700/70">Jumlah Anggaran</span>
                <span className="font-display font-semibold text-emerald-700">
                  {formatRupiah(volumeForm * (Number(form.harga_satuan) || 0))}
                </span>
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Kode Rekening (opsional)</label>
                <input
                  className="input-field"
                  placeholder="Contoh: 5.1.02.xx.xx"
                  value={form.kode_rekening}
                  onChange={(e) => setForm({ ...form, kode_rekening: e.target.value })}
                />
                <p className="text-xs text-ink-700/40 mt-1">
                  Diisi sekali di sini — akan otomatis ditarik ke Kode Rekening saat kegiatan ini dipilih di form Transaksi BKU.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Bulan Pelaksanaan (opsional)</label>
                <input className="input-field" placeholder="Contoh: Januari, Maret, Juli" value={form.bulan_pelaksanaan} onChange={(e) => setForm({ ...form, bulan_pelaksanaan: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Keterangan (opsional)</label>
                <textarea rows={2} className="input-field" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button type="button" className="btn-secondary w-full sm:w-auto justify-center" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto justify-center">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==== Modal Preview Import Excel ==== */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-2 sm:p-4">
          <div className="card relative overflow-hidden w-full max-w-6xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button
              type="button"
              onClick={tutupImport}
              className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900 p-1 touch-manipulation"
            >
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-1">Import Rincian Kegiatan dari Excel</h2>
            {importFileName && <p className="text-xs text-ink-700/50 mb-4">File: {importFileName}</p>}

            {importError && (
              <div className="p-3 rounded-lg bg-red-900/10 text-red-900 text-sm mb-4">{importError}</div>
            )}

            {importRows.length === 0 && !importError && (
              <p className="text-sm text-ink-700/50 py-6 text-center">Belum ada data untuk ditampilkan.</p>
            )}

            {importRows.length > 0 && (
              <>
                <p className="text-sm text-ink-700/60 mb-2">
                  {importRows.filter((r) => r._valid).length} dari {importRows.length} baris siap diimpor.
                  Baris bertanda "Tidak lengkap" akan dilewati (Komponen, Rincian Kegiatan & Volume wajib diisi).
                  Total: {formatRupiah(importRows.filter((r) => r._valid).reduce((s, r) => s + r.jumlah_anggaran, 0))}
                </p>
                <div className="overflow-x-auto border border-ink-900/10 rounded-lg mb-4">
                  <table className="table-shell">
                    <thead>
                      <tr>
                        <th>Baris</th>
                        <th>Bulan</th>
                        <th>Kode</th>
                        <th>Komponen</th>
                        <th>Sub Komponen</th>
                        <th>Rincian Kegiatan</th>
                        <th>Sasaran</th>
                        <th>Target</th>
                        <th>PJ</th>
                        <th>Jenis Belanja</th>
                        <th>Uraian</th>
                        <th>Rumus Volume</th>
                        <th>Vol</th>
                        <th>Satuan</th>
                        <th>Harga Satuan</th>
                        <th>Jumlah</th>
                        <th>Kode Rekening</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((r, i) => (
                        <tr key={i} className={!r._valid ? 'bg-red-900/[0.04]' : 'hover:bg-emerald-600/[0.03]'}>
                          <td className="text-xs whitespace-nowrap">{r._sheet ? `${r._sheet} · ` : ''}{r._baris}</td>
                          <td className="text-xs">{r.bulan_pelaksanaan || '-'}</td>
                          <td className="font-mono text-xs">{r.kode_kegiatan || '-'}</td>
                          <td>{r.komponen || '-'}</td>
                          <td className="text-xs">{r.sub_komponen || '-'}</td>
                          <td className="font-medium">{r.rincian_kegiatan || '-'}</td>
                          <td className="text-xs">{r.sasaran || '-'}</td>
                          <td className="text-xs">{r.target || '-'}</td>
                          <td className="text-xs">{r.penanggung_jawab || '-'}</td>
                          <td className="text-xs">{r.jenis_belanja || '-'}</td>
                          <td className="text-xs">{r.uraian_belanja || '-'}</td>
                          <td className="text-xs whitespace-nowrap">{r.rumus_volume || '-'}</td>
                          <td>{r.volume}</td>
                          <td>{r.satuan || '-'}</td>
                          <td>{formatRupiah(r.harga_satuan)}</td>
                          <td className="font-semibold text-emerald-700">{formatRupiah(r.jumlah_anggaran)}</td>
                          <td className="font-mono text-xs">{r.kode_rekening || '-'}</td>
                          <td>
                            {r._valid
                              ? <span className="badge bg-emerald-600/15 text-emerald-700">Siap</span>
                              : <span className="badge bg-red-900/10 text-red-900">Tidak lengkap</span>}
                          </td>
                          <td>
                            <button type="button" onClick={() => hapusBarisImport(i)} className="p-1.5 hover:bg-red-900/10 rounded-lg text-red-900/60">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                className="btn-secondary w-full sm:w-auto justify-center"
                onClick={tutupImport}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={importing || importRows.filter((r) => r._valid).length === 0}
                onClick={simpanImport}
                className="btn-primary w-full sm:w-auto justify-center"
              >
                {importing && <Loader2 size={16} className="animate-spin" />}
                Simpan {importRows.filter((r) => r._valid).length} Kegiatan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==== Modal Template/Katalog Kegiatan BOK ==== */}
      {showTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-2 sm:p-4">
          <div className="card relative overflow-hidden w-full max-w-4xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button
              type="button"
              onClick={() => setShowTemplate(false)}
              className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900 p-1 touch-manipulation"
            >
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-1">Template Kegiatan BOK</h2>
            <p className="text-xs text-ink-700/50 mb-4">
              Pilih kegiatan yang berlaku di puskesmas Anda untuk Tahun Anggaran {tahunFilter}. Kegiatan terpilih akan
              ditambahkan dengan Volume = 1 &amp; Harga Satuan = Rp 0 sebagai placeholder — tinggal disunting (Volume,
              Harga Satuan, Kode Rekening, Bulan Pelaksanaan) sesuai kebutuhan riil puskesmas.
            </p>

            <div className="relative max-w-sm mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input
                className="input-field pl-9"
                placeholder="Cari kegiatan..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
              />
            </div>

            {Object.entries(katalogDikelompokkan).map(([komponen, items]) => (
              <div key={komponen} className="mb-4 border border-ink-900/10 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-emerald-600/[0.06] border-b border-emerald-600/10 flex items-center justify-between">
                  <p className="font-display font-semibold text-sm text-emerald-800">{komponen}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <button type="button" className="text-emerald-700 hover:underline p-1 touch-manipulation" onClick={() => toggleSemuaDalamKomponen(items, true)}>
                      Pilih semua
                    </button>
                    <button type="button" className="text-ink-700/50 hover:underline p-1 touch-manipulation" onClick={() => toggleSemuaDalamKomponen(items, false)}>
                      Batalkan
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-ink-900/5">
                  {items.map((item) => {
                    const kunci = kunciKatalog(item)
                    const sudahAda = kunciSudahAda.has(kunci)
                    return (
                      <label
                        key={kunci}
                        className={`flex items-start gap-3 px-3 py-2.5 sm:py-2 text-sm ${sudahAda ? 'opacity-50' : 'cursor-pointer hover:bg-emerald-600/[0.03]'}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 w-5 h-5 sm:w-4 sm:h-4"
                          disabled={sudahAda}
                          checked={sudahAda ? false : templateSelected.has(kunci)}
                          onChange={() => toggleTemplateItem(kunci)}
                        />
                        <span className="flex-1">
                          <span className="block font-medium">{item.rincian_kegiatan}</span>
                          <span className="block text-xs text-ink-700/50">
                            {item.sub_komponen ? `${item.sub_komponen} — ` : ''}Satuan: {item.satuan}
                          </span>
                        </span>
                        {sudahAda && (
                          <span className="badge bg-ink-900/10 text-ink-700/60 shrink-0">Sudah ada</span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}

            {katalogTerfilter.length === 0 && (
              <p className="text-sm text-ink-700/50 text-center py-6">Tidak ada kegiatan yang cocok dengan pencarian.</p>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-2">
              <button type="button" className="btn-secondary w-full sm:w-auto justify-center" onClick={() => setShowTemplate(false)}>Batal</button>
              <button
                type="button"
                disabled={templateSaving || templateSelected.size === 0}
                onClick={simpanTemplate}
                className="btn-primary w-full sm:w-auto justify-center"
              >
                {templateSaving && <Loader2 size={16} className="animate-spin" />}
                Tambahkan {templateSelected.size} Kegiatan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
