import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { useNotaTema } from '../../lib/notaTema'
import NotaPrintTemplate from '../../components/NotaPrintTemplate'
import NotaTemaPanel from '../../components/NotaTemaPanel'
import { Plus, Pencil, Trash2, Search, X, Loader2, ShoppingCart, Printer, Palette } from 'lucide-react'
import { formatRupiah, formatTanggal } from './utils'

// ============================================================
// TAB 5: NOTA BELANJA (BOK)
// Data tetap di tabel `nota_belanja_bok`. Tampilan cetak memakai
// NotaPrintTemplate (ukuran nota toko) dengan tema warna/ukuran/posisi
// yang bisa diubah (disimpan per perangkat lewat useNotaTema).
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

// Ubah baris nota_belanja_bok jadi bentuk yang dipahami NotaPrintTemplate.
// "Tuan" (pembeli) diisi nama puskesmas; "Toko" dari nama_toko.
function mapUntukCetak(n, namaPuskesmas) {
  return {
    no_nota: n.nomor_nota || '',
    tanggal: n.tanggal,
    tuan: namaPuskesmas || '',
    toko: n.nama_toko || '',
    alamat_lanjutan: n.alamat_toko || '',
    items: (n.daftar_barang || []).map((b) => ({
      banyaknya: [b.jumlah, b.satuan].filter(Boolean).join(' '),
      nama_barang: b.nama,
      harga: b.harga_satuan,
      jumlah: b.total ?? (Number(b.jumlah) || 0) * (Number(b.harga_satuan) || 0),
    })),
    jumlah_total: n.total_belanja,
  }
}

export default function TabNotaBelanja() {
  const { sekolahId } = useAuth()
  const [tema, ubahTema] = useNotaTema()
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
  const [showTema, setShowTema] = useState(false)

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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button type="button" className="btn-secondary w-full sm:w-auto justify-center" onClick={() => setShowTema((v) => !v)}>
              <Palette size={16} /> Tampilan Cetak
            </button>
            <button className="btn-primary w-full sm:w-auto justify-center" onClick={openAdd}>
              <Plus size={16} /> Buat Nota Belanja
            </button>
          </div>
        </div>
        {showTema && (
          <div className="mt-3">
            <NotaTemaPanel tema={tema} ubahTema={ubahTema} />
          </div>
        )}
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

      {/* ==== Modal Pratinjau & Cetak Nota ==== */}
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

            {/* Panel tema ikut di pratinjau supaya hasilnya langsung terlihat */}
            <div className="no-print p-3 border-b border-ink-900/10 bg-ink-900/[0.02]">
              <NotaTemaPanel tema={tema} ubahTema={ubahTema} />
            </div>

            {/* .lembar-nota = bagian yang dicetak; pos-atas / pos-bawah menentukan letaknya di A4 */}
            <div className={`lembar-nota pos-${tema.posisiV} p-4 overflow-x-auto`}>
              <NotaPrintTemplate
                pratinjau
                tema={tema}
                data={mapUntukCetak(cetak, profilPuskesmas?.nama_puskesmas)}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          .lembar-nota, .lembar-nota * { visibility: visible; }
          .lembar-nota {
            position: absolute !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .lembar-nota.pos-atas { top: 0 !important; }
          .lembar-nota.pos-tengah { top: 50% !important; transform: translateY(-50%) !important; }
          .lembar-nota.pos-bawah { top: 138mm !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  )
}
