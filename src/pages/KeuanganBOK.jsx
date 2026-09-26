import { useEffect, useRef, useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'
import { useAuth } from '../lib/AuthContext'
import {
  Plus, Pencil, Trash2, Search, X, Loader2, Wallet, Upload, Download,
  ClipboardList, BookOpen, Receipt, ShoppingCart, FileSignature, Printer,
} from 'lucide-react'

// Halaman "Keuangan BOK" (Bantuan Operasional Kesehatan) — KHUSUS tenant
// puskesmas. Satu halaman dengan 5 tab: Rincian Kegiatan (RKA), BKU,
// Kwitansi, Nota Belanja, SK Pengelola BOK. Pola & gaya visual disamakan
// dengan Keuangan.jsx (sekolah), tapi tabel & struktur data mengikuti
// migrasi khusus BOK (rka_bok, bku_bok, kwitansi_bok, nota_belanja_bok,
// sk_pengelola_bok — lihat migrasi-keuangan-bok.sql).
//
// Komponen BOK baku disimpan sebagai teks bebas (bukan enum) supaya admin
// bisa menyesuaikan nomenklatur mengikuti juknis BOK tahun berjalan —
// daftar di bawah ini hanya SARAN/opsi cepat di dropdown, bukan pembatas.
//
// == PERUBAHAN: HUBUNGAN DENGAN DATA PEGAWAI (pegawai_puskesmas) ==
// Tab Kwitansi dan Tab SK Pengelola sekarang bisa menautkan penerima /
// anggota tim ke data pegawai di `pegawai_puskesmas`, supaya nama & jabatan
// yang tercetak selalu konsisten dengan data pegawai terdaftar (sesuai
// tugasnya) — bukan diketik ulang manual & rawan typo/tidak sinkron.
// - kwitansi_bok: perlu kolom baru `pegawai_id uuid null references
//   pegawai_puskesmas(id)`. Nama/jabatan penerima tetap disimpan sebagai
//   teks (untuk histori, kalau pegawai kelak diubah/dihapus), tapi
//   otomatis terisi dari pegawai yang dipilih.
// - sk_pengelola_bok.susunan_tim: kolomnya jsonb, jadi tidak perlu
//   migrasi — cukup tambahkan key `pegawai_id` per anggota tim di dalam
//   JSON.
//
// == PERUBAHAN: KODE REKENING DI RKA (diisi sekali per kegiatan) ==
// rka_bok sekarang punya kolom `kode_rekening` (lihat
// migrasi-tambah-kode-rekening-rka-bok.sql). Diisi sekali per kegiatan di
// form Tambah/Ubah Rincian Kegiatan (RKA), lalu ditarik otomatis ke field
// Kode Rekening di form Transaksi BKU saat kegiatan RKA terkait dipilih —
// admin tetap bisa mengubahnya manual di BKU kalau realisasinya beda.
//
// == PERUBAHAN: AUTO-ISIAN DARI RKA DI TAB BKU ==
// Tab BKU sekarang mengambil kolom tambahan dari rka_bok (satuan,
// harga_satuan, sub_komponen, kode_rekening) dan mengelompokkan dropdown
// "Kegiatan RKA Terkait" per Komponen (optgroup). Memilih satu kegiatan
// otomatis mengisi Uraian, Jumlah (dari harga_satuan acuan RKA), dan Kode
// Rekening (dari rka_bok.kode_rekening) — admin tetap bisa mengubah
// ketiganya kalau realisasinya berbeda.
const OPSI_KOMPONEN_BOK = [
  'UKM Esensial',
  'UKM Pengembangan',
  'Manajemen BOK (Dukungan Manajemen)',
  'Dukungan Operasional UKM Tim Nusantara Sehat',
  'Pengawasan Obat dan Makanan',
  'Penyediaan Tenaga dengan Perjanjian Kerja',
]

const OPSI_SATUAN = ['OH', 'OK', 'Paket', 'Bulan', 'Orang', 'Kali', 'Unit', 'Dokumen']

function formatRupiah(angka) {
  const n = Number(angka) || 0
  return 'Rp ' + n.toLocaleString('id-ID')
}

function formatTanggal(tgl) {
  if (!tgl) return '-'
  try {
    return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return tgl
  }
}

// Konversi angka ke terbilang bahasa Indonesia, dipakai di kwitansi
// ("Sudah terima uang sejumlah ... rupiah"). Mendukung sampai triliunan.
const SATUAN_ANGKA = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan']

function terbilangSampaiSeribu(n) {
  if (n === 0) return ''
  if (n < 10) return SATUAN_ANGKA[n]
  if (n < 20) return (n === 10 ? 'sepuluh' : n === 11 ? 'sebelas' : SATUAN_ANGKA[n - 10] + ' belas')
  if (n < 100) return (SATUAN_ANGKA[Math.floor(n / 10)] + ' puluh' + (n % 10 ? ' ' + SATUAN_ANGKA[n % 10] : '')).trim()
  if (n < 200) return ('seratus' + (n % 100 ? ' ' + terbilangSampaiSeribu(n % 100) : '')).trim()
  if (n < 1000) return (SATUAN_ANGKA[Math.floor(n / 100)] + ' ratus' + (n % 100 ? ' ' + terbilangSampaiSeribu(n % 100) : '')).trim()
  return ''
}

function terbilang(angka) {
  let n = Math.floor(Number(angka) || 0)
  if (n === 0) return 'nol'
  const bagian = []
  const triliun = Math.floor(n / 1_000_000_000_000)
  n %= 1_000_000_000_000
  const miliar = Math.floor(n / 1_000_000_000)
  n %= 1_000_000_000
  const juta = Math.floor(n / 1_000_000)
  n %= 1_000_000
  const ribu = Math.floor(n / 1000)
  n %= 1000
  const sisa = n

  if (triliun) bagian.push(`${terbilangSampaiSeribu(triliun)} triliun`)
  if (miliar) bagian.push(`${terbilangSampaiSeribu(miliar)} miliar`)
  if (juta) bagian.push(`${terbilangSampaiSeribu(juta)} juta`)
  if (ribu) bagian.push(ribu === 1 ? 'seribu' : `${terbilangSampaiSeribu(ribu)} ribu`)
  if (sisa) bagian.push(terbilangSampaiSeribu(sisa))

  return bagian.join(' ').trim()
}

function kapitalKalimat(teks) {
  if (!teks) return ''
  return teks.charAt(0).toUpperCase() + teks.slice(1)
}

const TABS = [
  { key: 'rka', label: 'Rincian Kegiatan (RKA)', icon: ClipboardList },
  { key: 'bku', label: 'BKU', icon: BookOpen },
  { key: 'kwitansi', label: 'Kwitansi', icon: Receipt },
  { key: 'nota', label: 'Nota Belanja', icon: ShoppingCart },
  { key: 'sk', label: 'SK Pengelola', icon: FileSignature },
]

export default function KeuanganBOK() {
  const [tabAktif, setTabAktif] = useState('rka')

  return (
    <Layout title="Keuangan BOK" subtitle="Rincian kegiatan, BKU, kwitansi, nota belanja & SK pengelola dana BOK">
      <div className="card relative overflow-hidden p-2 mb-5">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const aktif = tabAktif === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTabAktif(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  aktif ? 'bg-emerald-600 text-white' : 'text-ink-700/70 hover:bg-emerald-600/10'
                }`}
              >
                <Icon size={15} /> {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {tabAktif === 'rka' && <TabRKA />}
      {tabAktif === 'bku' && <TabBKU />}
      {tabAktif === 'kwitansi' && <TabKwitansi />}
      {tabAktif === 'nota' && <TabNotaBelanja />}
      {tabAktif === 'sk' && <TabSKPengelola />}
    </Layout>
  )
}

// ============================================================
// TAB 1: RINCIAN KEGIATAN (RKA)
// ============================================================

const emptyFormRka = {
  tahun_anggaran: new Date().getFullYear(),
  komponen: '',
  sub_komponen: '',
  rincian_kegiatan: '',
  volume: 1,
  satuan: '',
  harga_satuan: '',
  kode_rekening: '',
  bulan_pelaksanaan: '',
  keterangan: '',
}

function TabRKA() {
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
    setForm({ ...emptyFormRka, tahun_anggaran: tahunFilter })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      ...emptyFormRka,
      ...row,
      volume: String(row.volume),
      harga_satuan: String(row.harga_satuan),
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) return
    setSaving(true)
    const volume = Number(form.volume) || 0
    const hargaSatuan = Number(form.harga_satuan) || 0
    const payload = {
      sekolah_id: sekolahId,
      tahun_anggaran: Number(form.tahun_anggaran),
      komponen: form.komponen,
      sub_komponen: form.sub_komponen || null,
      rincian_kegiatan: form.rincian_kegiatan,
      volume,
      satuan: form.satuan || null,
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

  // Ambil nilai kolom dari baris hasil parsing Excel secara fleksibel —
  // cocokkan nama header tanpa peduli besar/kecil huruf atau spasi di
  // ujung, supaya template tidak harus persis sama urutan/kapitalisasinya.
  function ambilKolom(row, ...kemungkinanNama) {
    for (const key of Object.keys(row)) {
      const bersih = key.toString().trim().toLowerCase()
      if (kemungkinanNama.some((n) => bersih === n.toLowerCase())) {
        return row[key]
      }
    }
    return ''
  }

  function bukaDialogImport() {
    setImportError('')
    fileInputRef.current?.click()
  }

  async function handleFileImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    setImportFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes('rka')) || wb.SheetNames[0]
      const sheet = wb.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      if (rows.length === 0) {
        setImportError('Sheet Excel kosong atau format tidak terbaca. Pastikan baris pertama berisi judul kolom.')
        setImportRows([])
        setShowImport(true)
        return
      }

      const hasil = rows
        .map((row, i) => {
          const volume = Number(ambilKolom(row, 'Volume', 'Vol')) || 0
          const hargaSatuan = Number(ambilKolom(row, 'Harga Satuan', 'Harga')) || 0
          const komponen = String(ambilKolom(row, 'Komponen') || '').trim()
          const rincianKegiatan = String(ambilKolom(row, 'Rincian Kegiatan', 'Kegiatan') || '').trim()
          const tahun = Number(ambilKolom(row, 'Tahun Anggaran', 'Tahun')) || tahunFilter

          return {
            _baris: i + 2, // baris 1 = judul kolom, data mulai baris 2 di Excel
            tahun_anggaran: tahun,
            komponen,
            sub_komponen: String(ambilKolom(row, 'Sub Komponen') || '').trim(),
            rincian_kegiatan: rincianKegiatan,
            volume,
            satuan: String(ambilKolom(row, 'Satuan') || '').trim(),
            harga_satuan: hargaSatuan,
            jumlah_anggaran: volume * hargaSatuan,
            kode_rekening: String(ambilKolom(row, 'Kode Rekening', 'Kode Akun') || '').trim(),
            bulan_pelaksanaan: String(ambilKolom(row, 'Bulan Pelaksanaan', 'Bulan') || '').trim(),
            keterangan: String(ambilKolom(row, 'Keterangan') || '').trim(),
            _valid: komponen !== '' && rincianKegiatan !== '' && volume > 0,
          }
        })
        // Baris yang benar-benar kosong semua (mis. sisa baris kosong di
        // template) tidak perlu ditampilkan di preview.
        .filter((r) => r.komponen !== '' || r.rincian_kegiatan !== '' || r.volume > 0 || r.harga_satuan > 0)

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
      komponen: r.komponen,
      sub_komponen: r.sub_komponen || null,
      rincian_kegiatan: r.rincian_kegiatan,
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
  // server) — berisi judul kolom yang sesuai & satu baris contoh.
  function unduhTemplate() {
    const contoh = [
      ['Tahun Anggaran', 'Komponen', 'Sub Komponen', 'Rincian Kegiatan', 'Volume', 'Satuan', 'Harga Satuan', 'Kode Rekening', 'Bulan Pelaksanaan', 'Keterangan'],
      [tahunFilter, 'UKM Esensial', 'Posyandu Balita', 'Transport petugas pendamping posyandu', 12, 'OH', 75000, '5.1.02.xx.xx', 'Januari, Februari, Maret', 'Contoh baris — hapus/ganti sebelum diisi data asli'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(contoh)
    ws['!cols'] = [{ wch: 14 }, { wch: 26 }, { wch: 20 }, { wch: 36 }, { wch: 9 }, { wch: 9 }, { wch: 15 }, { wch: 16 }, { wch: 24 }, { wch: 30 }]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, ws, 'RKA BOK')
    XLSX.writeFile(workbook, 'template-rka-bok.xlsx')
  }

  const filtered = data.filter((r) =>
    `${r.komponen} ${r.sub_komponen} ${r.rincian_kegiatan}`.toLowerCase().includes(search.toLowerCase())
  )

  const totalAnggaran = useMemo(
    () => filtered.reduce((sum, r) => sum + Number(r.jumlah_anggaran || 0), 0),
    [filtered]
  )

  // Kelompokkan per komponen untuk tampilan yang lebih mudah dibaca —
  // sesuai format RKA/POA BOK yang biasanya dikelompokkan per komponen.
  const dikelompokkan = useMemo(() => {
    const map = {}
    for (const r of filtered) {
      const key = r.komponen || '(Tanpa Komponen)'
      if (!map[key]) map[key] = []
      map[key].push(r)
    }
    return map
  }, [filtered])

  return (
    <>
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
              <ClipboardList size={18} />
            </div>
            <div className="relative max-w-xs w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input
                className="input-field pl-9"
                placeholder="Cari komponen/kegiatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input-field w-28"
              value={tahunFilter}
              onChange={(e) => setTahunFilter(Number(e.target.value))}
            >
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map((th) => (
                <option key={th} value={th}>{th}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileImport}
            />
            <button type="button" className="btn-secondary" onClick={unduhTemplate} title="Unduh contoh format Excel">
              <Download size={16} /> Template
            </button>
            <button type="button" className="btn-secondary" onClick={bukaDialogImport}>
              <Upload size={16} /> Import dari Excel
            </button>
            <button className="btn-primary" onClick={openAdd}>
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
                <th>Sub Komponen</th>
                <th>Rincian Kegiatan</th>
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
                  <td>{r.sub_komponen || '-'}</td>
                  <td className="font-medium">{r.rincian_kegiatan}</td>
                  <td>{r.volume}</td>
                  <td>{r.satuan || '-'}</td>
                  <td>{formatRupiah(r.harga_satuan)}</td>
                  <td className="font-semibold text-emerald-700">{formatRupiah(r.jumlah_anggaran)}</td>
                  <td className="font-mono text-xs">{r.kode_rekening || '-'}</td>
                  <td className="text-xs">{r.bulan_pelaksanaan || '-'}</td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(r)} className="p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-2 hover:bg-red-900/10 rounded-lg text-red-900/70">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900">
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-4">{editingId ? 'Ubah Rincian Kegiatan' : 'Tambah Rincian Kegiatan'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="eyebrow mb-1.5 block">Tahun Anggaran</label>
                <input type="number" required className="input-field" value={form.tahun_anggaran} onChange={(e) => setForm({ ...form, tahun_anggaran: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Komponen</label>
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
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Sub Komponen (opsional)</label>
                <input className="input-field" value={form.sub_komponen} onChange={(e) => setForm({ ...form, sub_komponen: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Rincian Kegiatan</label>
                <textarea required rows={2} className="input-field" value={form.rincian_kegiatan} onChange={(e) => setForm({ ...form, rincian_kegiatan: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Volume</label>
                <input type="number" min="0" step="any" required className="input-field" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Satuan</label>
                <input list="opsi-satuan-bok" className="input-field" value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} />
                <datalist id="opsi-satuan-bok">
                  {OPSI_SATUAN.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Harga Satuan (Rp)</label>
                <input type="number" min="0" required className="input-field" value={form.harga_satuan} onChange={(e) => setForm({ ...form, harga_satuan: e.target.value })} />
              </div>
              <div className="col-span-2 p-3 rounded-lg bg-emerald-600/[0.06] flex items-center justify-between">
                <span className="text-sm text-ink-700/70">Jumlah Anggaran</span>
                <span className="font-display font-semibold text-emerald-700">
                  {formatRupiah((Number(form.volume) || 0) * (Number(form.harga_satuan) || 0))}
                </span>
              </div>
              <div className="col-span-2">
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
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Bulan Pelaksanaan (opsional)</label>
                <input className="input-field" placeholder="Contoh: Januari, Maret, Juli" value={form.bulan_pelaksanaan} onChange={(e) => setForm({ ...form, bulan_pelaksanaan: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Keterangan (opsional)</label>
                <textarea rows={2} className="input-field" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==== Modal Preview Import Excel ==== */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <div className="card relative overflow-hidden w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button
              type="button"
              onClick={() => { setShowImport(false); setImportRows([]); setImportError('') }}
              className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900"
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
                </p>
                <div className="overflow-x-auto border border-ink-900/10 rounded-lg mb-4">
                  <table className="table-shell">
                    <thead>
                      <tr>
                        <th>Baris</th>
                        <th>Komponen</th>
                        <th>Rincian Kegiatan</th>
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
                          <td className="text-xs">{r._baris}</td>
                          <td>{r.komponen || '-'}</td>
                          <td className="font-medium">{r.rincian_kegiatan || '-'}</td>
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

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setShowImport(false); setImportRows([]); setImportError('') }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={importing || importRows.filter((r) => r._valid).length === 0}
                onClick={simpanImport}
                className="btn-primary"
              >
                {importing && <Loader2 size={16} className="animate-spin" />}
                Simpan {importRows.filter((r) => r._valid).length} Kegiatan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================
// TAB 2: BKU (BUKU KAS UMUM)
// ============================================================

const emptyFormBku = {
  rka_id: '',
  tanggal: new Date().toISOString().slice(0, 10),
  nomor_bukti: '',
  uraian: '',
  kode_rekening: '',
  jenis: 'pengeluaran', // 'penerimaan' | 'pengeluaran'
  jumlah: '',
}

function TabBKU() {
  const { sekolahId } = useAuth()
  const [data, setData] = useState([])
  const [rkaList, setRkaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [bulanFilter, setBulanFilter] = useState(new Date().getMonth() + 1)
  const [tahunFilter, setTahunFilter] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyFormBku)
  const [saving, setSaving] = useState(false)

  // BKU dihitung ulang saldo berjalannya (running balance) tiap kali data
  // dimuat/berubah — supaya konsisten walau ada edit/hapus baris lama.
  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)

    // Ambil kolom tambahan (satuan, harga_satuan, sub_komponen,
    // kode_rekening) supaya bisa dipakai untuk auto-isi Uraian, Jumlah &
    // Kode Rekening saat kegiatan RKA dipilih di form transaksi BKU
    // (lihat fungsi pilihRka di bawah).
    const { data: daftarRka } = await supabase
      .from('rka_bok')
      .select('id, komponen, sub_komponen, rincian_kegiatan, satuan, harga_satuan, kode_rekening')
      .eq('sekolah_id', sekolahId)
      .order('komponen')
      .order('rincian_kegiatan')
    setRkaList(daftarRka || [])

    const tanggalAwal = `${tahunFilter}-${String(bulanFilter).padStart(2, '0')}-01`
    const akhirBulan = new Date(tahunFilter, bulanFilter, 0).getDate()
    const tanggalAkhir = `${tahunFilter}-${String(bulanFilter).padStart(2, '0')}-${String(akhirBulan).padStart(2, '0')}`

    // Ambil SEMUA baris sejak awal tahun s.d. akhir bulan filter, supaya
    // saldo berjalan (running balance) tetap benar meneruskan saldo dari
    // bulan-bulan sebelumnya — bukan mulai dari 0 tiap ganti bulan filter.
    const { data: rows, error } = await supabase
      .from('bku_bok')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .gte('tanggal', `${tahunFilter}-01-01`)
      .lte('tanggal', tanggalAkhir)
      .order('tanggal')
      .order('dibuat_pada')

    if (error) {
      alert('Gagal memuat BKU: ' + error.message)
      setLoading(false)
      return
    }

    // Hitung saldo berjalan di sisi client (tidak menulis ulang ke DB tiap
    // load — hanya dipakai untuk tampilan/cetak, supaya tidak boros write).
    let saldoBerjalan = 0
    const denganSaldo = (rows || []).map((r) => {
      saldoBerjalan += Number(r.penerimaan || 0) - Number(r.pengeluaran || 0)
      return { ...r, saldo_tampilan: saldoBerjalan }
    })

    // Tampilkan hanya baris pada bulan filter, tapi saldo_tampilan sudah
    // meneruskan akumulasi dari bulan-bulan sebelumnya di tahun yang sama.
    const hanyaBulanIni = denganSaldo.filter((r) => r.tanggal >= tanggalAwal && r.tanggal <= tanggalAkhir)

    setData(hanyaBulanIni)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, bulanFilter, tahunFilter])

  // Kelompokkan daftar RKA per Komponen supaya dropdown "Kegiatan RKA
  // Terkait" mudah ditelusuri (optgroup) — mencakup semua kegiatan &
  // komponen yang ada, bukan cuma daftar datar.
  const rkaGrouped = useMemo(() => {
    const map = {}
    for (const r of rkaList) {
      const key = r.komponen || '(Tanpa Komponen)'
      if (!map[key]) map[key] = []
      map[key].push(r)
    }
    return map
  }, [rkaList])

  function openAdd() {
    setForm({ ...emptyFormBku, tanggal: `${tahunFilter}-${String(bulanFilter).padStart(2, '0')}-01` })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      rka_id: row.rka_id || '',
      tanggal: row.tanggal,
      nomor_bukti: row.nomor_bukti || '',
      uraian: row.uraian,
      kode_rekening: row.kode_rekening || '',
      jenis: Number(row.penerimaan) > 0 ? 'penerimaan' : 'pengeluaran',
      jumlah: String(Number(row.penerimaan) > 0 ? row.penerimaan : row.pengeluaran),
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  // Isi otomatis Uraian, Jumlah & Kode Rekening dari kegiatan RKA yang
  // dipilih — Uraian diambil dari rincian_kegiatan, Jumlah dari
  // harga_satuan (acuan per unit di RKA), dan Kode Rekening dari
  // rka_bok.kode_rekening (diisi sekali per kegiatan di form RKA). Admin
  // tetap bisa mengubah ketiga field ini kalau realisasi transaksinya
  // berbeda dari acuan RKA (mis. beda volume, atau kode rekening berbeda
  // untuk kasus tertentu).
  function pilihRka(rkaId) {
    const rka = rkaList.find((r) => r.id === rkaId)
    setForm((prev) => ({
      ...prev,
      rka_id: rkaId,
      uraian: rka ? rka.rincian_kegiatan : prev.uraian,
      jumlah: rka ? String(rka.harga_satuan) : prev.jumlah,
      kode_rekening: rka && rka.kode_rekening ? rka.kode_rekening : prev.kode_rekening,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) return
    setSaving(true)
    const jumlah = Number(form.jumlah) || 0
    const payload = {
      sekolah_id: sekolahId,
      rka_id: form.rka_id || null,
      tanggal: form.tanggal,
      nomor_bukti: form.nomor_bukti || null,
      uraian: form.uraian,
      kode_rekening: form.kode_rekening || null,
      penerimaan: form.jenis === 'penerimaan' ? jumlah : 0,
      pengeluaran: form.jenis === 'pengeluaran' ? jumlah : 0,
    }
    const { error } = editingId
      ? await supabase.from('bku_bok').update(payload).eq('id', editingId).eq('sekolah_id', sekolahId)
      : await supabase.from('bku_bok').insert(payload)
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus baris BKU ini?')) return
    const { error } = await supabase.from('bku_bok').delete().eq('id', id).eq('sekolah_id', sekolahId)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  const totalPenerimaan = useMemo(() => data.reduce((s, r) => s + Number(r.penerimaan || 0), 0), [data])
  const totalPengeluaran = useMemo(() => data.reduce((s, r) => s + Number(r.pengeluaran || 0), 0), [data])
  const saldoAkhir = data.length > 0 ? data[data.length - 1].saldo_tampilan : 0

  return (
    <>
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
              <BookOpen size={18} />
            </div>
            <select className="input-field w-36" value={bulanFilter} onChange={(e) => setBulanFilter(Number(e.target.value))}>
              {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((nama, i) => (
                <option key={nama} value={i + 1}>{nama}</option>
              ))}
            </select>
            <select className="input-field w-24" value={tahunFilter} onChange={(e) => setTahunFilter(Number(e.target.value))}>
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map((th) => (
                <option key={th} value={th}>{th}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Tambah Transaksi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-4">
          <p className="text-xs text-ink-700/50 mb-1">Total Penerimaan</p>
          <p className="font-display text-lg font-semibold text-emerald-700">{formatRupiah(totalPenerimaan)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-700/50 mb-1">Total Pengeluaran</p>
          <p className="font-display text-lg font-semibold text-red-800">{formatRupiah(totalPengeluaran)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-700/50 mb-1">Saldo Akhir Bulan</p>
          <p className="font-display text-lg font-semibold text-blue-700">{formatRupiah(saldoAkhir)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>No. Bukti</th>
              <th>Uraian</th>
              <th>Kode Rekening</th>
              <th>Penerimaan</th>
              <th>Pengeluaran</th>
              <th>Saldo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Memuat data...</td></tr>
            )}
            {!loading && data.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-ink-700/50">Belum ada transaksi bulan ini.</td></tr>
            )}
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-emerald-600/[0.03] transition-colors">
                <td className="whitespace-nowrap text-xs">{formatTanggal(r.tanggal)}</td>
                <td className="font-mono text-xs">{r.nomor_bukti || '-'}</td>
                <td className="font-medium">{r.uraian}</td>
                <td className="text-xs">{r.kode_rekening || '-'}</td>
                <td className="text-emerald-700">{Number(r.penerimaan) > 0 ? formatRupiah(r.penerimaan) : '-'}</td>
                <td className="text-red-800">{Number(r.pengeluaran) > 0 ? formatRupiah(r.pengeluaran) : '-'}</td>
                <td className="font-semibold">{formatRupiah(r.saldo_tampilan)}</td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(r)} className="p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="p-2 hover:bg-red-900/10 rounded-lg text-red-900/70">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900">
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-4">{editingId ? 'Ubah Transaksi BKU' : 'Tambah Transaksi BKU'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="eyebrow mb-1.5 block">Tanggal</label>
                <input type="date" required className="input-field" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">No. Bukti</label>
                <input className="input-field" value={form.nomor_bukti} onChange={(e) => setForm({ ...form, nomor_bukti: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Kegiatan RKA Terkait (opsional)</label>
                <select className="input-field" value={form.rka_id} onChange={(e) => pilihRka(e.target.value)}>
                  <option value="">— Tidak tertaut —</option>
                  {Object.entries(rkaGrouped).map(([komponen, items]) => (
                    <optgroup key={komponen} label={komponen}>
                      {items.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.rincian_kegiatan} ({formatRupiah(r.harga_satuan)}/{r.satuan || 'satuan'})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-xs text-ink-700/40 mt-1">
                  Memilih kegiatan akan mengisi Uraian, Jumlah & Kode Rekening secara otomatis (sesuai acuan RKA) — tetap bisa diubah manual.
                </p>
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Uraian</label>
                <input required className="input-field" value={form.uraian} onChange={(e) => setForm({ ...form, uraian: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Kode Rekening</label>
                <input className="input-field" value={form.kode_rekening} onChange={(e) => setForm({ ...form, kode_rekening: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Jenis</label>
                <select className="input-field" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}>
                  <option value="pengeluaran">Pengeluaran</option>
                  <option value="penerimaan">Penerimaan</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Jumlah (Rp)</label>
                <input type="number" min="0" required className="input-field" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

// ============================================================
// TAB 3: KWITANSI
// ============================================================

const emptyFormKwitansi = {
  bku_id: '',
  pegawai_id: '',
  nomor_kwitansi: '',
  tanggal: new Date().toISOString().slice(0, 10),
  sudah_terima_dari: '',
  jumlah_uang: '',
  untuk_pembayaran: '',
  potongan_pph: '',
  potongan_ppn: '',
  nama_penerima: '',
  jabatan_penerima: '',
}

function TabKwitansi() {
  const { sekolahId, profil } = useAuth()
  const [profilPuskesmas, setProfilPuskesmas] = useState(null)
  const [pegawaiList, setPegawaiList] = useState([])
  const [data, setData] = useState([])
  const [bkuList, setBkuList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyFormKwitansi)
  const [saving, setSaving] = useState(false)
  const [cetak, setCetak] = useState(null) // kwitansi yang sedang dicetak

  useEffect(() => {
    if (!sekolahId) return
    supabase
      .from('profil_puskesmas')
      .select('nama_puskesmas, kepala_puskesmas, nip_kepala_puskesmas, tempat_ttd, kabupaten')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data: p }) => setProfilPuskesmas(p))

    // Daftar pegawai aktif — dipakai untuk menautkan penerima kwitansi ke
    // data pegawai sesungguhnya (nama & jabatan otomatis sesuai tugasnya).
    supabase
      .from('pegawai_puskesmas')
      .select('id, nama_lengkap, nip, jabatan')
      .eq('sekolah_id', sekolahId)
      .eq('status', 'aktif')
      .order('nama_lengkap')
      .then(({ data: pg }) => setPegawaiList(pg || []))
  }, [sekolahId])

  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: daftarBku } = await supabase
      .from('bku_bok')
      .select('id, tanggal, uraian, pengeluaran')
      .eq('sekolah_id', sekolahId)
      .order('tanggal', { ascending: false })
    setBkuList(daftarBku || [])

    const { data: rows, error } = await supabase
      .from('kwitansi_bok')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('tanggal', { ascending: false })

    if (error) alert('Gagal memuat kwitansi: ' + error.message)
    setData(rows || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  function openAdd() {
    setForm({ ...emptyFormKwitansi, sudah_terima_dari: profilPuskesmas?.nama_puskesmas || '' })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      bku_id: row.bku_id || '',
      pegawai_id: row.pegawai_id || '',
      nomor_kwitansi: row.nomor_kwitansi || '',
      tanggal: row.tanggal,
      sudah_terima_dari: row.sudah_terima_dari || '',
      jumlah_uang: String(row.jumlah_uang),
      untuk_pembayaran: row.untuk_pembayaran,
      potongan_pph: String(row.potongan_pph || 0),
      potongan_ppn: String(row.potongan_ppn || 0),
      nama_penerima: row.nama_penerima || '',
      jabatan_penerima: row.jabatan_penerima || '',
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  // Isi otomatis Uraian & Jumlah dari transaksi BKU yang dipilih, supaya
  // tidak perlu ketik ulang manual — admin masih bisa mengubahnya.
  function pilihBku(bkuId) {
    const bku = bkuList.find((b) => b.id === bkuId)
    setForm((prev) => ({
      ...prev,
      bku_id: bkuId,
      untuk_pembayaran: bku ? bku.uraian : prev.untuk_pembayaran,
      jumlah_uang: bku ? String(bku.pengeluaran) : prev.jumlah_uang,
      tanggal: bku ? bku.tanggal : prev.tanggal,
    }))
  }

  // Isi otomatis Nama & Jabatan Penerima dari pegawai yang dipilih —
  // memastikan penerima kwitansi sesuai data pegawai & jabatan/tugasnya
  // yang tercatat di Data Pegawai, bukan ketikan manual yang bisa keliru.
  function pilihPegawaiPenerima(pegawaiId) {
    const p = pegawaiList.find((x) => x.id === pegawaiId)
    setForm((prev) => ({
      ...prev,
      pegawai_id: pegawaiId,
      nama_penerima: p ? p.nama_lengkap : prev.nama_penerima,
      jabatan_penerima: p ? p.jabatan : prev.jabatan_penerima,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) return
    setSaving(true)
    const payload = {
      sekolah_id: sekolahId,
      bku_id: form.bku_id || null,
      pegawai_id: form.pegawai_id || null,
      nomor_kwitansi: form.nomor_kwitansi || null,
      tanggal: form.tanggal,
      sudah_terima_dari: form.sudah_terima_dari || null,
      jumlah_uang: Number(form.jumlah_uang) || 0,
      untuk_pembayaran: form.untuk_pembayaran,
      potongan_pph: Number(form.potongan_pph) || 0,
      potongan_ppn: Number(form.potongan_ppn) || 0,
      nama_penerima: form.nama_penerima || null,
      jabatan_penerima: form.jabatan_penerima || null,
    }
    const { error } = editingId
      ? await supabase.from('kwitansi_bok').update(payload).eq('id', editingId).eq('sekolah_id', sekolahId)
      : await supabase.from('kwitansi_bok').insert(payload)
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus kwitansi ini?')) return
    const { error } = await supabase.from('kwitansi_bok').delete().eq('id', id).eq('sekolah_id', sekolahId)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  const filtered = data.filter((k) =>
    `${k.nomor_kwitansi} ${k.untuk_pembayaran} ${k.nama_penerima}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
              <Receipt size={18} />
            </div>
            <div className="relative max-w-xs w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input className="input-field pl-9" placeholder="Cari no. kwitansi/penerima..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Buat Kwitansi
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>No. Kwitansi</th>
              <th>Untuk Pembayaran</th>
              <th>Jumlah</th>
              <th>Penerima</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center py-8 text-ink-700/50">Memuat data...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-ink-700/50">Belum ada kwitansi.</td></tr>}
            {filtered.map((k) => (
              <tr key={k.id} className="hover:bg-emerald-600/[0.03] transition-colors">
                <td className="whitespace-nowrap text-xs">{formatTanggal(k.tanggal)}</td>
                <td className="font-mono text-xs">{k.nomor_kwitansi || '-'}</td>
                <td className="font-medium">{k.untuk_pembayaran}</td>
                <td className="font-semibold text-emerald-700">{formatRupiah(k.jumlah_uang)}</td>
                <td>
                  {k.nama_penerima || '-'}
                  {k.jabatan_penerima && <span className="block text-xs text-ink-700/50">{k.jabatan_penerima}</span>}
                </td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setCetak(k)} className="p-2 hover:bg-blue-600/10 rounded-lg text-blue-700/70" title="Cetak">
                      <Printer size={15} />
                    </button>
                    <button onClick={() => openEdit(k)} className="p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(k.id)} className="p-2 hover:bg-red-900/10 rounded-lg text-red-900/70">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900">
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-4">{editingId ? 'Ubah Kwitansi' : 'Buat Kwitansi'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Transaksi BKU Terkait (opsional)</label>
                <select className="input-field" value={form.bku_id} onChange={(e) => pilihBku(e.target.value)}>
                  <option value="">— Tidak tertaut —</option>
                  {bkuList.map((b) => (
                    <option key={b.id} value={b.id}>{formatTanggal(b.tanggal)} — {b.uraian}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Nomor Kwitansi</label>
                <input className="input-field" value={form.nomor_kwitansi} onChange={(e) => setForm({ ...form, nomor_kwitansi: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Tanggal</label>
                <input type="date" required className="input-field" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Sudah Terima Dari</label>
                <input className="input-field" value={form.sudah_terima_dari} onChange={(e) => setForm({ ...form, sudah_terima_dari: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Untuk Pembayaran</label>
                <textarea required rows={2} className="input-field" value={form.untuk_pembayaran} onChange={(e) => setForm({ ...form, untuk_pembayaran: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Jumlah Uang (Rp)</label>
                <input type="number" min="0" required className="input-field" value={form.jumlah_uang} onChange={(e) => setForm({ ...form, jumlah_uang: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Potongan PPh (Rp, opsional)</label>
                <input type="number" min="0" className="input-field" value={form.potongan_pph} onChange={(e) => setForm({ ...form, potongan_pph: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Potongan PPN (Rp, opsional)</label>
                <input type="number" min="0" className="input-field" value={form.potongan_ppn} onChange={(e) => setForm({ ...form, potongan_ppn: e.target.value })} />
              </div>

              <div className="col-span-2 pt-2 border-t border-ink-900/10">
                <label className="eyebrow mb-1.5 block text-emerald-700">Pilih Pegawai Penerima (sesuai tugasnya)</label>
                <select className="input-field" value={form.pegawai_id} onChange={(e) => pilihPegawaiPenerima(e.target.value)}>
                  <option value="">— Ketik manual (tidak tertaut ke Data Pegawai) —</option>
                  {pegawaiList.map((p) => (
                    <option key={p.id} value={p.id}>{p.nama_lengkap} — {p.jabatan || 'Tanpa jabatan'}</option>
                  ))}
                </select>
                <p className="text-xs text-ink-700/40 mt-1">
                  Memilih pegawai akan mengisi Nama & Jabatan Penerima di bawah secara otomatis dari Data Pegawai.
                </p>
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Nama Penerima</label>
                <input className="input-field" value={form.nama_penerima} onChange={(e) => setForm({ ...form, nama_penerima: e.target.value, pegawai_id: '' })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Jabatan Penerima</label>
                <input className="input-field" value={form.jabatan_penerima} onChange={(e) => setForm({ ...form, jabatan_penerima: e.target.value })} />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==== Modal Cetak Kwitansi ==== */}
      {cetak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between p-4 border-b border-ink-900/10">
              <h2 className="font-display font-semibold">Pratinjau Kwitansi</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="btn-primary !py-1.5"><Printer size={14} /> Cetak</button>
                <button onClick={() => setCetak(null)} className="p-2 hover:bg-ink-900/5 rounded-lg"><X size={18} /></button>
              </div>
            </div>

            <div className="lembar-kwitansi p-8" style={{ width: '190mm', margin: '0 auto' }}>
              <table className="w-full border-collapse border-2 border-slate-800 text-sm">
                <tbody>
                  <tr>
                    <td colSpan={4} className="border-2 border-slate-800 p-3 text-center">
                      <p className="font-display font-bold text-base uppercase">KWITANSI</p>
                      <p className="text-xs mt-0.5">No: {cetak.nomor_kwitansi || '-'}</p>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-800 p-2 w-40">Sudah terima dari</td>
                    <td className="border border-slate-800 p-2" colSpan={3}>: {cetak.sudah_terima_dari || profilPuskesmas?.nama_puskesmas || '-'}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-800 p-2">Uang sejumlah</td>
                    <td className="border border-slate-800 p-2 italic" colSpan={3}>
                      : {kapitalKalimat(terbilang(cetak.jumlah_uang))} rupiah
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-800 p-2">Untuk pembayaran</td>
                    <td className="border border-slate-800 p-2" colSpan={3}>: {cetak.untuk_pembayaran}</td>
                  </tr>
                  {(Number(cetak.potongan_pph) > 0 || Number(cetak.potongan_ppn) > 0) && (
                    <tr>
                      <td className="border border-slate-800 p-2">Potongan</td>
                      <td className="border border-slate-800 p-2" colSpan={3}>
                        : {[
                          Number(cetak.potongan_pph) > 0 && `PPh ${formatRupiah(cetak.potongan_pph)}`,
                          Number(cetak.potongan_ppn) > 0 && `PPN ${formatRupiah(cetak.potongan_ppn)}`,
                        ].filter(Boolean).join(', ')}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="border border-slate-800 p-2 text-right font-semibold">Jumlah</td>
                    <td className="border border-slate-800 p-2 font-bold">{formatRupiah(cetak.jumlah_uang)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end mt-8">
                <div className="text-center w-56">
                  <p>{profilPuskesmas?.tempat_ttd || profilPuskesmas?.kabupaten || '-'}, {formatTanggal(cetak.tanggal)}</p>
                  <p className="mt-1">Yang menerima,</p>
                  <div className="h-16" />
                  <p className="font-semibold border-t border-slate-800 pt-1">
                    {cetak.nama_penerima || '..............................'}
                  </p>
                  {cetak.jabatan_penerima && <p className="text-xs text-slate-600">{cetak.jabatan_penerima}</p>}
                </div>
              </div>

              <div className="flex justify-start mt-4">
                <div className="text-center w-56">
                  <p>Mengetahui,</p>
                  <p>Kepala Puskesmas</p>
                  <div className="h-16" />
                  <p className="font-semibold border-t border-slate-800 pt-1">
                    {profilPuskesmas?.kepala_puskesmas || '..............................'}
                  </p>
                  <p className="text-xs text-slate-600">NIP. {profilPuskesmas?.nip_kepala_puskesmas || '..............................'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          .lembar-kwitansi, .lembar-kwitansi * { visibility: visible; }
          .lembar-kwitansi {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  )
}

// ============================================================
// TAB 4: NOTA BELANJA
// ============================================================

const barisBarangKosong = { nama: '', jumlah: 1, satuan: '', harga_satuan: 0 }

const emptyFormNota = {
  bku_id: '',
  nomor_nota: '',
  tanggal: new Date().toISOString().slice(0, 10),
  nama_toko: '',
  alamat_toko: '',
  daftar_barang: [{ ...barisBarangKosong }],
}

function TabNotaBelanja() {
  const { sekolahId } = useAuth()
  const [profilPuskesmas, setProfilPuskesmas] = useState(null)
  const [data, setData] = useState([])
  const [bkuList, setBkuList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyFormNota)
  const [saving, setSaving] = useState(false)
  const [cetak, setCetak] = useState(null)

  useEffect(() => {
    if (!sekolahId) return
    supabase
      .from('profil_puskesmas')
      .select('nama_puskesmas, tempat_ttd, kabupaten')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data: p }) => setProfilPuskesmas(p))
  }, [sekolahId])

  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: daftarBku } = await supabase
      .from('bku_bok')
      .select('id, tanggal, uraian')
      .eq('sekolah_id', sekolahId)
      .order('tanggal', { ascending: false })
    setBkuList(daftarBku || [])

    const { data: rows, error } = await supabase
      .from('nota_belanja_bok')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('tanggal', { ascending: false })

    if (error) alert('Gagal memuat nota belanja: ' + error.message)
    setData(rows || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  function openAdd() {
    setForm(emptyFormNota)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      bku_id: row.bku_id || '',
      nomor_nota: row.nomor_nota || '',
      tanggal: row.tanggal,
      nama_toko: row.nama_toko || '',
      alamat_toko: row.alamat_toko || '',
      daftar_barang: (row.daftar_barang && row.daftar_barang.length > 0) ? row.daftar_barang : [{ ...barisBarangKosong }],
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  function ubahBarang(index, field, value) {
    setForm((prev) => {
      const daftar = [...prev.daftar_barang]
      daftar[index] = { ...daftar[index], [field]: value }
      return { ...prev, daftar_barang: daftar }
    })
  }

  function tambahBarisBarang() {
    setForm((prev) => ({ ...prev, daftar_barang: [...prev.daftar_barang, { ...barisBarangKosong }] }))
  }

  function hapusBarisBarang(index) {
    setForm((prev) => ({ ...prev, daftar_barang: prev.daftar_barang.filter((_, i) => i !== index) }))
  }

  const totalBelanjaForm = useMemo(
    () => form.daftar_barang.reduce((sum, b) => sum + (Number(b.jumlah) || 0) * (Number(b.harga_satuan) || 0), 0),
    [form.daftar_barang]
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) return
    setSaving(true)
    const daftarBarangBersih = form.daftar_barang
      .filter((b) => b.nama.trim() !== '')
      .map((b) => ({
        nama: b.nama,
        jumlah: Number(b.jumlah) || 0,
        satuan: b.satuan || '',
        harga_satuan: Number(b.harga_satuan) || 0,
        total: (Number(b.jumlah) || 0) * (Number(b.harga_satuan) || 0),
      }))
    const payload = {
      sekolah_id: sekolahId,
      bku_id: form.bku_id || null,
      nomor_nota: form.nomor_nota || null,
      tanggal: form.tanggal,
      nama_toko: form.nama_toko || null,
      alamat_toko: form.alamat_toko || null,
      daftar_barang: daftarBarangBersih,
      total_belanja: daftarBarangBersih.reduce((s, b) => s + b.total, 0),
    }
    const { error } = editingId
      ? await supabase.from('nota_belanja_bok').update(payload).eq('id', editingId).eq('sekolah_id', sekolahId)
      : await supabase.from('nota_belanja_bok').insert(payload)
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus nota belanja ini?')) return
    const { error } = await supabase.from('nota_belanja_bok').delete().eq('id', id).eq('sekolah_id', sekolahId)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  const filtered = data.filter((n) =>
    `${n.nomor_nota} ${n.nama_toko}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
              <ShoppingCart size={18} />
            </div>
            <div className="relative max-w-xs w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input className="input-field pl-9" placeholder="Cari no. nota/nama toko..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Buat Nota Belanja
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>No. Nota</th>
              <th>Nama Toko</th>
              <th>Jumlah Barang</th>
              <th>Total Belanja</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center py-8 text-ink-700/50">Memuat data...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-ink-700/50">Belum ada nota belanja.</td></tr>}
            {filtered.map((n) => (
              <tr key={n.id} className="hover:bg-emerald-600/[0.03] transition-colors">
                <td className="whitespace-nowrap text-xs">{formatTanggal(n.tanggal)}</td>
                <td className="font-mono text-xs">{n.nomor_nota || '-'}</td>
                <td className="font-medium">{n.nama_toko || '-'}</td>
                <td>{(n.daftar_barang || []).length} item</td>
                <td className="font-semibold text-emerald-700">{formatRupiah(n.total_belanja)}</td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setCetak(n)} className="p-2 hover:bg-blue-600/10 rounded-lg text-blue-700/70" title="Cetak">
                      <Printer size={15} />
                    </button>
                    <button onClick={() => openEdit(n)} className="p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(n.id)} className="p-2 hover:bg-red-900/10 rounded-lg text-red-900/70">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900">
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-4">{editingId ? 'Ubah Nota Belanja' : 'Buat Nota Belanja'}</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Transaksi BKU Terkait (opsional)</label>
                <select className="input-field" value={form.bku_id} onChange={(e) => setForm({ ...form, bku_id: e.target.value })}>
                  <option value="">— Tidak tertaut —</option>
                  {bkuList.map((b) => (
                    <option key={b.id} value={b.id}>{formatTanggal(b.tanggal)} — {b.uraian}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Nomor Nota</label>
                <input className="input-field" value={form.nomor_nota} onChange={(e) => setForm({ ...form, nomor_nota: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Tanggal</label>
                <input type="date" required className="input-field" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Nama Toko</label>
                <input className="input-field" value={form.nama_toko} onChange={(e) => setForm({ ...form, nama_toko: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Alamat Toko</label>
                <input className="input-field" value={form.alamat_toko} onChange={(e) => setForm({ ...form, alamat_toko: e.target.value })} />
              </div>
            </div>

            <p className="eyebrow text-emerald-700 mb-2">Daftar Barang</p>
            <div className="space-y-2 mb-2">
              {form.daftar_barang.map((b, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className="input-field col-span-4" placeholder="Nama barang" value={b.nama} onChange={(e) => ubahBarang(i, 'nama', e.target.value)} />
                  <input type="number" min="0" className="input-field col-span-2" placeholder="Jml" value={b.jumlah} onChange={(e) => ubahBarang(i, 'jumlah', e.target.value)} />
                  <input className="input-field col-span-2" placeholder="Satuan" value={b.satuan} onChange={(e) => ubahBarang(i, 'satuan', e.target.value)} />
                  <input type="number" min="0" className="input-field col-span-3" placeholder="Harga satuan" value={b.harga_satuan} onChange={(e) => ubahBarang(i, 'harga_satuan', e.target.value)} />
                  <button type="button" onClick={() => hapusBarisBarang(i)} className="col-span-1 p-2 text-red-900/60 hover:bg-red-900/10 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={tambahBarisBarang} className="btn-secondary !py-1.5 mb-4">
              <Plus size={14} /> Tambah Barang
            </button>

            <div className="p-3 rounded-lg bg-emerald-600/[0.06] flex items-center justify-between mb-4">
              <span className="text-sm text-ink-700/70">Total Belanja</span>
              <span className="font-display font-semibold text-emerald-700">{formatRupiah(totalBelanjaForm)}</span>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==== Modal Cetak Nota ==== */}
      {cetak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between p-4 border-b border-ink-900/10">
              <h2 className="font-display font-semibold">Pratinjau Nota Belanja</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="btn-primary !py-1.5"><Printer size={14} /> Cetak</button>
                <button onClick={() => setCetak(null)} className="p-2 hover:bg-ink-900/5 rounded-lg"><X size={18} /></button>
              </div>
            </div>

            <div className="lembar-nota p-8" style={{ width: '190mm', margin: '0 auto' }}>
              <div className="text-center mb-4">
                <p className="font-display font-bold text-base uppercase">NOTA BELANJA</p>
                <p className="text-xs mt-0.5">No: {cetak.nomor_nota || '-'}</p>
              </div>

              <div className="text-sm mb-3">
                <p><strong>Toko:</strong> {cetak.nama_toko || '-'}{cetak.alamat_toko && ` — ${cetak.alamat_toko}`}</p>
                <p><strong>Tanggal:</strong> {formatTanggal(cetak.tanggal)}</p>
              </div>

              <table className="w-full border-collapse border border-slate-800 text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-800 px-2 py-1 w-8">No</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Nama Barang</th>
                    <th className="border border-slate-800 px-2 py-1 w-16">Jumlah</th>
                    <th className="border border-slate-800 px-2 py-1 w-24">Harga Satuan</th>
                    <th className="border border-slate-800 px-2 py-1 w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(cetak.daftar_barang || []).map((b, i) => (
                    <tr key={i}>
                      <td className="border border-slate-800 px-2 py-1 text-center">{i + 1}</td>
                      <td className="border border-slate-800 px-2 py-1">{b.nama}</td>
                      <td className="border border-slate-800 px-2 py-1 text-center">{b.jumlah} {b.satuan}</td>
                      <td className="border border-slate-800 px-2 py-1 text-right">{formatRupiah(b.harga_satuan)}</td>
                      <td className="border border-slate-800 px-2 py-1 text-right">{formatRupiah(b.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="border border-slate-800 px-2 py-1 text-right font-semibold">Total Belanja</td>
                    <td className="border border-slate-800 px-2 py-1 text-right font-bold">{formatRupiah(cetak.total_belanja)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="flex justify-end mt-8">
                <div className="text-center w-56">
                  <p>{profilPuskesmas?.tempat_ttd || profilPuskesmas?.kabupaten || '-'}, {formatTanggal(cetak.tanggal)}</p>
                  <p className="mt-1">Penjual/Toko,</p>
                  <div className="h-16" />
                  <p className="font-semibold border-t border-slate-800 pt-1">{cetak.nama_toko || '..............................'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          .lembar-nota, .lembar-nota * { visibility: visible; }
          .lembar-nota {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  )
}

// ============================================================
// TAB 5: SK PENGELOLA BOK
// ============================================================

const barisTimKosong = { pegawai_id: '', nama: '', nip: '', jabatan_tim: '', jabatan_puskesmas: '' }

const emptyFormSk = {
  tahun_anggaran: new Date().getFullYear(),
  nomor_sk: '',
  tanggal_sk: new Date().toISOString().slice(0, 10),
  tentang: 'Penetapan Tim Pengelola Keuangan Bantuan Operasional Kesehatan (BOK)',
  dasar_hukum: '',
  susunan_tim: [{ ...barisTimKosong, jabatan_tim: 'Penanggung Jawab' }, { ...barisTimKosong, jabatan_tim: 'Bendahara' }],
}

const OPSI_JABATAN_TIM = ['Penanggung Jawab', 'Bendahara', 'Pelaksana Kegiatan', 'Anggota']

function TabSKPengelola() {
  const { sekolahId } = useAuth()
  const [profilPuskesmas, setProfilPuskesmas] = useState(null)
  const [pegawaiList, setPegawaiList] = useState([])
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyFormSk)
  const [saving, setSaving] = useState(false)
  const [cetak, setCetak] = useState(null)

  useEffect(() => {
    if (!sekolahId) return
    supabase
      .from('profil_puskesmas')
      .select('nama_puskesmas, kepala_puskesmas, nip_kepala_puskesmas, tempat_ttd, kabupaten')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data: p }) => setProfilPuskesmas(p))

    // Daftar pegawai aktif — dipakai untuk menautkan anggota tim pengelola
    // BOK ke data pegawai sesungguhnya (NIP & jabatan di puskesmas otomatis
    // sesuai tugasnya, admin tinggal memilih peran mereka dalam tim BOK).
    supabase
      .from('pegawai_puskesmas')
      .select('id, nama_lengkap, nip, jabatan')
      .eq('sekolah_id', sekolahId)
      .eq('status', 'aktif')
      .order('nama_lengkap')
      .then(({ data: pg }) => setPegawaiList(pg || []))
  }, [sekolahId])

  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('sk_pengelola_bok')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('tahun_anggaran', { ascending: false })

    if (error) alert('Gagal memuat SK: ' + error.message)
    setData(rows || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  function openAdd() {
    setForm(emptyFormSk)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      tahun_anggaran: row.tahun_anggaran,
      nomor_sk: row.nomor_sk || '',
      tanggal_sk: row.tanggal_sk || '',
      tentang: row.tentang || '',
      dasar_hukum: row.dasar_hukum || '',
      susunan_tim: (row.susunan_tim && row.susunan_tim.length > 0)
        ? row.susunan_tim.map((t) => ({ ...barisTimKosong, ...t }))
        : [{ ...barisTimKosong }],
    })
    setEditingId(row.id)
    setShowForm(true)
  }

  function ubahTim(index, field, value) {
    setForm((prev) => {
      const tim = [...prev.susunan_tim]
      tim[index] = { ...tim[index], [field]: value }
      return { ...prev, susunan_tim: tim }
    })
  }

  // Isi otomatis Nama, NIP & Jabatan di Puskesmas dari pegawai yang
  // dipilih — anggota tim BOK jadi konsisten dengan Data Pegawai. Jabatan
  // dalam Tim (Penanggung Jawab/Bendahara/dll.) tetap dipilih manual,
  // karena itu peran khusus dalam pengelolaan BOK, bukan jabatan pokoknya.
  function pilihPegawaiTim(index, pegawaiId) {
    const p = pegawaiList.find((x) => x.id === pegawaiId)
    setForm((prev) => {
      const tim = [...prev.susunan_tim]
      tim[index] = {
        ...tim[index],
        pegawai_id: pegawaiId,
        nama: p ? p.nama_lengkap : tim[index].nama,
        nip: p ? (p.nip || '') : tim[index].nip,
        jabatan_puskesmas: p ? (p.jabatan || '') : tim[index].jabatan_puskesmas,
      }
      return { ...prev, susunan_tim: tim }
    })
  }

  function tambahBarisTim() {
    setForm((prev) => ({ ...prev, susunan_tim: [...prev.susunan_tim, { ...barisTimKosong }] }))
  }

  function hapusBarisTim(index) {
    setForm((prev) => ({ ...prev, susunan_tim: prev.susunan_tim.filter((_, i) => i !== index) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) return
    setSaving(true)
    const timBersih = form.susunan_tim
      .filter((t) => t.nama.trim() !== '')
      .map((t) => ({
        pegawai_id: t.pegawai_id || null,
        nama: t.nama,
        nip: t.nip || '',
        jabatan_tim: t.jabatan_tim || '',
        jabatan_puskesmas: t.jabatan_puskesmas || '',
      }))
    const payload = {
      sekolah_id: sekolahId,
      tahun_anggaran: Number(form.tahun_anggaran),
      nomor_sk: form.nomor_sk || null,
      tanggal_sk: form.tanggal_sk || null,
      tentang: form.tentang,
      dasar_hukum: form.dasar_hukum || null,
      susunan_tim: timBersih,
    }
    const { error } = editingId
      ? await supabase.from('sk_pengelola_bok').update(payload).eq('id', editingId).eq('sekolah_id', sekolahId)
      : await supabase.from('sk_pengelola_bok').insert(payload)
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus SK ini?')) return
    const { error } = await supabase.from('sk_pengelola_bok').delete().eq('id', id).eq('sekolah_id', sekolahId)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  return (
    <>
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
              <FileSignature size={18} />
            </div>
            <p className="text-sm text-ink-700/60">SK Tim Pengelola Keuangan BOK per tahun anggaran</p>
          </div>
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Buat SK
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Tahun</th>
              <th>Nomor SK</th>
              <th>Tanggal SK</th>
              <th>Tentang</th>
              <th>Jumlah Anggota Tim</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center py-8 text-ink-700/50">Memuat data...</td></tr>}
            {!loading && data.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-ink-700/50">Belum ada SK pengelola.</td></tr>}
            {data.map((sk) => (
              <tr key={sk.id} className="hover:bg-emerald-600/[0.03] transition-colors">
                <td>{sk.tahun_anggaran}</td>
                <td className="font-mono text-xs">{sk.nomor_sk || '-'}</td>
                <td className="text-xs">{formatTanggal(sk.tanggal_sk)}</td>
                <td className="font-medium">{sk.tentang}</td>
                <td>{(sk.susunan_tim || []).length} orang</td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setCetak(sk)} className="p-2 hover:bg-blue-600/10 rounded-lg text-blue-700/70" title="Cetak">
                      <Printer size={15} />
                    </button>
                    <button onClick={() => openEdit(sk)} className="p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(sk.id)} className="p-2 hover:bg-red-900/10 rounded-lg text-red-900/70">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900">
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-4">{editingId ? 'Ubah SK Pengelola' : 'Buat SK Pengelola'}</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="eyebrow mb-1.5 block">Tahun Anggaran</label>
                <input type="number" required className="input-field" value={form.tahun_anggaran} onChange={(e) => setForm({ ...form, tahun_anggaran: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Nomor SK</label>
                <input className="input-field" value={form.nomor_sk} onChange={(e) => setForm({ ...form, nomor_sk: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Tanggal SK</label>
                <input type="date" className="input-field" value={form.tanggal_sk} onChange={(e) => setForm({ ...form, tanggal_sk: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Tentang</label>
                <input required className="input-field" value={form.tentang} onChange={(e) => setForm({ ...form, tentang: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="eyebrow mb-1.5 block">Dasar Hukum (opsional)</label>
                <textarea rows={2} className="input-field" placeholder="Contoh: Peraturan Menteri Kesehatan No. ... Tahun ..." value={form.dasar_hukum} onChange={(e) => setForm({ ...form, dasar_hukum: e.target.value })} />
              </div>
            </div>

            <p className="eyebrow text-emerald-700 mb-2">Susunan Tim</p>
            <div className="space-y-2 mb-2">
              {form.susunan_tim.map((t, i) => (
                <div key={i} className="p-3 rounded-lg bg-emerald-600/[0.04] space-y-2">
                  <select
                    className="input-field"
                    value={t.pegawai_id || ''}
                    onChange={(e) => pilihPegawaiTim(i, e.target.value)}
                  >
                    <option value="">— Pilih pegawai (opsional, sesuai tugasnya) —</option>
                    {pegawaiList.map((p) => (
                      <option key={p.id} value={p.id}>{p.nama_lengkap} — {p.jabatan || 'Tanpa jabatan'}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <input className="input-field col-span-3" placeholder="Nama" value={t.nama} onChange={(e) => ubahTim(i, 'nama', e.target.value)} />
                    <input className="input-field col-span-2" placeholder="NIP" value={t.nip} onChange={(e) => ubahTim(i, 'nip', e.target.value)} />
                    <select className="input-field col-span-3" value={t.jabatan_tim} onChange={(e) => ubahTim(i, 'jabatan_tim', e.target.value)}>
                      <option value="">Jabatan dalam Tim</option>
                      {OPSI_JABATAN_TIM.map((j) => <option key={j} value={j}>{j}</option>)}
                    </select>
                    <input className="input-field col-span-3" placeholder="Jabatan di Puskesmas" value={t.jabatan_puskesmas} onChange={(e) => ubahTim(i, 'jabatan_puskesmas', e.target.value)} />
                    <button type="button" onClick={() => hapusBarisTim(i)} className="col-span-1 p-2 text-red-900/60 hover:bg-red-900/10 rounded-lg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={tambahBarisTim} className="btn-secondary !py-1.5 mb-4">
              <Plus size={14} /> Tambah Anggota Tim
            </button>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==== Modal Cetak SK ==== */}
      {cetak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between p-4 border-b border-ink-900/10">
              <h2 className="font-display font-semibold">Pratinjau SK</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="btn-primary !py-1.5"><Printer size={14} /> Cetak</button>
                <button onClick={() => setCetak(null)} className="p-2 hover:bg-ink-900/5 rounded-lg"><X size={18} /></button>
              </div>
            </div>

            <div className="lembar-sk p-8 text-sm" style={{ width: '190mm', margin: '0 auto' }}>
              <KopSurat />

              <div className="text-center mb-4">
                <p className="font-display font-bold text-base uppercase">Surat Keputusan Kepala Puskesmas</p>
                <p className="mt-1">Nomor: {cetak.nomor_sk || '..............................'}</p>
              </div>

              <p className="text-center font-semibold uppercase mb-4">Tentang<br />{cetak.tentang}</p>

              {cetak.dasar_hukum && (
                <div className="mb-4">
                  <p className="font-semibold mb-1">Menimbang / Mengingat:</p>
                  <p className="whitespace-pre-line">{cetak.dasar_hukum}</p>
                </div>
              )}

              <p className="font-semibold mb-2">MEMUTUSKAN:</p>
              <p className="mb-3">Menetapkan susunan Tim Pengelola Keuangan Bantuan Operasional Kesehatan (BOK) Tahun Anggaran {cetak.tahun_anggaran} sebagai berikut:</p>

              <table className="w-full border-collapse border border-slate-800 mb-6">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-800 px-2 py-1 w-8">No</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Nama / NIP</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Jabatan di Puskesmas</th>
                    <th className="border border-slate-800 px-2 py-1 text-left">Jabatan dalam Tim</th>
                  </tr>
                </thead>
                <tbody>
                  {(cetak.susunan_tim || []).map((t, i) => (
                    <tr key={i}>
                      <td className="border border-slate-800 px-2 py-1 text-center">{i + 1}</td>
                      <td className="border border-slate-800 px-2 py-1">
                        {t.nama}{t.nip && <><br /><span className="text-xs text-slate-600">NIP. {t.nip}</span></>}
                      </td>
                      <td className="border border-slate-800 px-2 py-1">{t.jabatan_puskesmas || '-'}</td>
                      <td className="border border-slate-800 px-2 py-1">{t.jabatan_tim || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="text-center w-56">
                  <p>{profilPuskesmas?.tempat_ttd || profilPuskesmas?.kabupaten || '-'}, {formatTanggal(cetak.tanggal_sk)}</p>
                  <p className="mt-1">Kepala Puskesmas</p>
                  <p>{profilPuskesmas?.nama_puskesmas || '-'}</p>
                  <div className="h-16" />
                  <p className="font-semibold border-t border-slate-800 pt-1">
                    {profilPuskesmas?.kepala_puskesmas || '..............................'}
                  </p>
                  <p className="text-xs text-slate-600">NIP. {profilPuskesmas?.nip_kepala_puskesmas || '..............................'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          .lembar-sk, .lembar-sk * { visibility: visible; }
          .lembar-sk {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  )
}
