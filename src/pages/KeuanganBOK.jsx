import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import {
  Plus, Pencil, Trash2, Search, X, Loader2, Wallet,
  ClipboardList, BookOpen, Receipt, ShoppingCart, FileSignature,
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
      {tabAktif === 'kwitansi' && (
        <p className="text-center py-10 text-ink-700/50 text-sm">Tab Kwitansi menyusul.</p>
      )}
      {tabAktif === 'nota' && (
        <p className="text-center py-10 text-ink-700/50 text-sm">Tab Nota Belanja menyusul.</p>
      )}
      {tabAktif === 'sk' && (
        <p className="text-center py-10 text-ink-700/50 text-sm">Tab SK Pengelola menyusul.</p>
      )}
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
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Tambah Rincian Kegiatan
          </button>
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

    const { data: daftarRka } = await supabase
      .from('rka_bok')
      .select('id, rincian_kegiatan, komponen')
      .eq('sekolah_id', sekolahId)
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
                <select className="input-field" value={form.rka_id} onChange={(e) => setForm({ ...form, rka_id: e.target.value })}>
                  <option value="">— Tidak tertaut —</option>
                  {rkaList.map((r) => (
                    <option key={r.id} value={r.id}>{r.komponen} — {r.rincian_kegiatan}</option>
                  ))}
                </select>
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
