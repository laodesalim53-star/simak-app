import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'
import { useAuth } from '../lib/AuthContext'
import {
  Plus, Pencil, Trash2, Search, X, Loader2,
  ClipboardList, BookOpen, Receipt, ShoppingCart, FileSignature, Printer,
} from 'lucide-react'

import { formatRupiah, formatTanggal } from './bok/utils'
import TabRKA from './bok/TabRKA'
import TabBKU from './bok/TabBKU'
import TabKwitansi from './bok/TabKwitansi'
import TabKuitansiJasa from './bok/TabKuitansiJasa'

// Halaman "Keuangan BOK" (Bantuan Operasional Kesehatan) — KHUSUS tenant
// puskesmas. Satu halaman dengan 6 tab: Rincian Kegiatan (RKA), BKU,
// Kwitansi, Kuitansi Jasa, Nota Belanja, SK Pengelola BOK.
//
// File ini sudah dipecah supaya lebih ringan dibuka/diedit:
// - ./bok/utils.js            → formatRupiah, formatTanggal, terbilang, dst.
// - ./bok/katalogKegiatan.js  → katalog kegiatan BOK (dipakai TabRKA)
// - ./bok/PrintStyle.jsx      → gaya cetak bersama
// - ./bok/TabRKA.jsx          → Tab 1: Rincian Kegiatan (RKA)
// - ./bok/TabBKU.jsx          → Tab 2: BKU
// - ./bok/TabKwitansi.jsx     → Tab 3: Kwitansi
// - ./bok/TabKuitansiJasa.jsx → Tab 4: Kuitansi Jasa (transport, honor, dst.)
// Tab 5 (Nota Belanja) & Tab 6 (SK Pengelola) tetap di file ini.

const TABS = [
  { key: 'rka', label: 'Rincian Kegiatan (RKA)', icon: ClipboardList },
  { key: 'bku', label: 'BKU', icon: BookOpen },
  { key: 'kwitansi', label: 'Kwitansi', icon: Receipt },
  { key: 'kuitansi_jasa', label: 'Kuitansi Jasa', icon: Receipt },
  { key: 'nota', label: 'Nota Belanja', icon: ShoppingCart },
  { key: 'sk', label: 'SK Pengelola', icon: FileSignature },
]

export default function KeuanganBOK() {
  const [tabAktif, setTabAktif] = useState('rka')

  return (
    <Layout title="Keuangan BOK" subtitle="Rincian kegiatan, BKU, kwitansi, kuitansi jasa, nota belanja & SK pengelola dana BOK">
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
                className={`flex items-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
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
      {tabAktif === 'kuitansi_jasa' && <TabKuitansiJasa />}
      {tabAktif === 'nota' && <TabNotaBelanja />}
      {tabAktif === 'sk' && <TabSKPengelola />}
    </Layout>
  )
}

// ============================================================
// TAB 5: NOTA BELANJA
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
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:flex-wrap w-full sm:w-auto">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 hidden sm:flex">
              <ShoppingCart size={18} />
            </div>
            <div className="relative max-w-xs w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input className="input-field pl-9" placeholder="Cari no. nota/nama toko..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary w-full sm:w-auto justify-center" onClick={openAdd}>
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
                    <button onClick={() => setCetak(n)} className="p-2.5 sm:p-2 hover:bg-blue-600/10 rounded-lg text-blue-700/70 touch-manipulation" title="Cetak">
                      <Printer size={15} />
                    </button>
                    <button onClick={() => openEdit(n)} className="p-2.5 sm:p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70 touch-manipulation">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(n.id)} className="p-2.5 sm:p-2 hover:bg-red-900/10 rounded-lg text-red-900/70 touch-manipulation">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-2 sm:p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900 p-1 touch-manipulation">
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-4">{editingId ? 'Ubah Nota Belanja' : 'Buat Nota Belanja'}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="sm:col-span-2">
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
                <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center p-2 sm:p-0 rounded-lg bg-emerald-600/[0.03] sm:bg-transparent">
                  <input className="input-field col-span-2 sm:col-span-4" placeholder="Nama barang" value={b.nama} onChange={(e) => ubahBarang(i, 'nama', e.target.value)} />
                  <input type="number" min="0" className="input-field col-span-1 sm:col-span-2" placeholder="Jml" value={b.jumlah} onChange={(e) => ubahBarang(i, 'jumlah', e.target.value)} />
                  <input className="input-field col-span-1 sm:col-span-2" placeholder="Satuan" value={b.satuan} onChange={(e) => ubahBarang(i, 'satuan', e.target.value)} />
                  <input type="number" min="0" className="input-field col-span-2 sm:col-span-3" placeholder="Harga satuan" value={b.harga_satuan} onChange={(e) => ubahBarang(i, 'harga_satuan', e.target.value)} />
                  <button type="button" onClick={() => hapusBarisBarang(i)} className="col-span-2 sm:col-span-1 p-2.5 sm:p-2 text-red-900/60 hover:bg-red-900/10 rounded-lg flex items-center justify-center gap-1 touch-manipulation">
                    <Trash2 size={15} /> <span className="sm:hidden text-xs">Hapus barang</span>
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={tambahBarisBarang} className="btn-secondary !py-2 sm:!py-1.5 mb-4 w-full sm:w-auto justify-center">
              <Plus size={14} /> Tambah Barang
            </button>

            <div className="p-3 rounded-lg bg-emerald-600/[0.06] flex items-center justify-between mb-4">
              <span className="text-sm text-ink-700/70">Total Belanja</span>
              <span className="font-display font-semibold text-emerald-700">{formatRupiah(totalBelanjaForm)}</span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button type="button" className="btn-secondary w-full sm:w-auto justify-center" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto justify-center">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==== Modal Cetak Nota ==== */}
      {cetak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between p-4 border-b border-ink-900/10">
              <h2 className="font-display font-semibold">Pratinjau Nota Belanja</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="btn-primary !py-1.5"><Printer size={14} /> Cetak</button>
                <button onClick={() => setCetak(null)} className="p-2.5 sm:p-2 hover:bg-ink-900/5 rounded-lg touch-manipulation"><X size={18} /></button>
              </div>
            </div>

            <div className="lembar-nota p-4 sm:p-8" style={{ width: '190mm', maxWidth: '100%', margin: '0 auto' }}>
              <div className="text-center mb-4">
                <p className="font-display font-bold text-base uppercase">NOTA BELANJA</p>
                <p className="text-xs mt-0.5">No: {cetak.nomor_nota || '-'}</p>
              </div>

              <div className="text-sm mb-3">
                <p><strong>Toko:</strong> {cetak.nama_toko || '-'}{cetak.alamat_toko && ` — ${cetak.alamat_toko}`}</p>
                <p><strong>Tanggal:</strong> {formatTanggal(cetak.tanggal)}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-800 text-sm min-w-[480px]">
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
              </div>

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
// TAB 6: SK PENGELOLA BOK
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
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 hidden sm:flex">
              <FileSignature size={18} />
            </div>
            <p className="text-sm text-ink-700/60">SK Tim Pengelola Keuangan BOK per tahun anggaran</p>
          </div>
          <button className="btn-primary w-full sm:w-auto justify-center" onClick={openAdd}>
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
                    <button onClick={() => setCetak(sk)} className="p-2.5 sm:p-2 hover:bg-blue-600/10 rounded-lg text-blue-700/70 touch-manipulation" title="Cetak">
                      <Printer size={15} />
                    </button>
                    <button onClick={() => openEdit(sk)} className="p-2.5 sm:p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70 touch-manipulation">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(sk.id)} className="p-2.5 sm:p-2 hover:bg-red-900/10 rounded-lg text-red-900/70 touch-manipulation">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-2 sm:p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900 p-1 touch-manipulation">
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-4">{editingId ? 'Ubah SK Pengelola' : 'Buat SK Pengelola'}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Tentang</label>
                <input required className="input-field" value={form.tentang} onChange={(e) => setForm({ ...form, tentang: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
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
                  <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
                    <input className="input-field col-span-2 sm:col-span-3" placeholder="Nama" value={t.nama} onChange={(e) => ubahTim(i, 'nama', e.target.value)} />
                    <input className="input-field col-span-1 sm:col-span-2" placeholder="NIP" value={t.nip} onChange={(e) => ubahTim(i, 'nip', e.target.value)} />
                    <select className="input-field col-span-1 sm:col-span-3" value={t.jabatan_tim} onChange={(e) => ubahTim(i, 'jabatan_tim', e.target.value)}>
                      <option value="">Jabatan dalam Tim</option>
                      {OPSI_JABATAN_TIM.map((j) => <option key={j} value={j}>{j}</option>)}
                    </select>
                    <input className="input-field col-span-2 sm:col-span-3" placeholder="Jabatan di Puskesmas" value={t.jabatan_puskesmas} onChange={(e) => ubahTim(i, 'jabatan_puskesmas', e.target.value)} />
                    <button type="button" onClick={() => hapusBarisTim(i)} className="col-span-2 sm:col-span-1 p-2.5 sm:p-2 text-red-900/60 hover:bg-red-900/10 rounded-lg flex items-center justify-center gap-1 touch-manipulation">
                      <Trash2 size={15} /> <span className="sm:hidden text-xs">Hapus anggota</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={tambahBarisTim} className="btn-secondary !py-2 sm:!py-1.5 mb-4 w-full sm:w-auto justify-center">
              <Plus size={14} /> Tambah Anggota Tim
            </button>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button type="button" className="btn-secondary w-full sm:w-auto justify-center" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto justify-center">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==== Modal Cetak SK ==== */}
      {cetak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between p-4 border-b border-ink-900/10">
              <h2 className="font-display font-semibold">Pratinjau SK</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="btn-primary !py-1.5"><Printer size={14} /> Cetak</button>
                <button onClick={() => setCetak(null)} className="p-2.5 sm:p-2 hover:bg-ink-900/5 rounded-lg touch-manipulation"><X size={18} /></button>
              </div>
            </div>

            <div className="lembar-sk p-4 sm:p-8 text-sm" style={{ width: '190mm', maxWidth: '100%', margin: '0 auto' }}>
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

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-800 mb-6 min-w-[480px]">
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
              </div>

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
