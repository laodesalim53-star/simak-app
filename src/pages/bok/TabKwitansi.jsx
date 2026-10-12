import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { Plus, Pencil, Trash2, Search, X, Loader2, Receipt, Printer } from 'lucide-react'
import { formatRupiah, formatTanggal } from './utils'
import KuitansiPrintTemplate from '../../lib/KuitansiPrintTemplate'
import PilihanTampilanCetak from '../../components/PilihanTampilanCetak'
import { muatTemaKuitansi, simpanTemaKuitansi, PRESET_WARNA_KUITANSI } from '../../lib/kuitansiTema'

// ============================================================
// TAB 3: KWITANSI
// Penerima bisa ditautkan ke pegawai_puskesmas (kolom kwitansi_bok.pegawai_id).
// Nama/jabatan tetap disimpan sebagai teks untuk histori.
// Cetak memakai KuitansiPrintTemplate (sama dengan halaman Kwitansi
// "Tanpa Watermark"). Ubah TANPA_WATERMARK ke false untuk versi berbintang.
// ============================================================

const TANPA_WATERMARK = true

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

export default function TabKwitansi() {
  const { sekolahId } = useAuth()
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
  const [tema, setTema] = useState(() => muatTemaKuitansi())

  function ubahTema(temaBaru) {
    setTema(temaBaru)
    simpanTemaKuitansi(temaBaru)
  }

  // Cetak langsung: template dirender (class print-only), lalu window.print().
  useEffect(() => {
    if (!cetak) return
    const t = setTimeout(() => {
      window.print()
      setCetak(null)
    }, 150)
    return () => clearTimeout(t)
  }, [cetak])

  // Petakan baris kwitansi_bok ke bentuk yang dibaca KuitansiPrintTemplate.
  function dataUntukCetak(k) {
    const potongan = [
      Number(k.potongan_pph) > 0 && `PPh ${formatRupiah(k.potongan_pph)}`,
      Number(k.potongan_ppn) > 0 && `PPN ${formatRupiah(k.potongan_ppn)}`,
    ].filter(Boolean)
    return {
      no_bukti: k.nomor_kwitansi || '',
      tanggal: k.tanggal,
      diterima_dari: k.sudah_terima_dari || profilPuskesmas?.nama_puskesmas || '',
      jumlah_total: k.jumlah_uang,
      untuk_pembayaran: k.untuk_pembayaran,
      jabatan_disetujui: 'Kepala Puskesmas',
      disetujui_oleh: profilPuskesmas?.kepala_puskesmas || '',
      nip_disetujui: profilPuskesmas?.nip_kepala_puskesmas || '',
      nama_penerima: k.nama_penerima || '',
      alamat_penerima: profilPuskesmas?.tempat_ttd || profilPuskesmas?.kabupaten || '',
      catatan: potongan.length ? `Potongan ${potongan.join(', ')}` : '',
    }
  }

  useEffect(() => {
    if (!sekolahId) return
    supabase
      .from('profil_puskesmas')
      .select('nama_puskesmas, kepala_puskesmas, nip_kepala_puskesmas, tempat_ttd, kabupaten')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data: p }) => setProfilPuskesmas(p))

    // Daftar pegawai aktif — untuk menautkan penerima ke Data Pegawai.
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

  // Isi otomatis Uraian & Jumlah dari transaksi BKU yang dipilih.
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

  // Isi otomatis Nama & Jabatan Penerima dari pegawai yang dipilih.
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
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:flex-wrap w-full sm:w-auto">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 hidden sm:flex">
              <Receipt size={18} />
            </div>
            <div className="relative max-w-xs w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input className="input-field pl-9" placeholder="Cari no. kwitansi/penerima..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary w-full sm:w-auto justify-center" onClick={openAdd}>
            <Plus size={16} /> Buat Kwitansi
          </button>
        </div>
      </div>

      <details className="card p-4 mb-4 no-print">
        <summary className="cursor-pointer text-sm font-medium">Tampilan Cetak (warna & tata letak)</summary>
        <div className="mt-3">
          <PilihanTampilanCetak value={tema} onChange={ubahTema} presetWarna={PRESET_WARNA_KUITANSI} />
        </div>
      </details>

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
                    <button onClick={() => setCetak(k)} className="p-2.5 sm:p-2 hover:bg-blue-600/10 rounded-lg text-blue-700/70 touch-manipulation" title="Cetak">
                      <Printer size={15} />
                    </button>
                    <button onClick={() => openEdit(k)} className="p-2.5 sm:p-2 hover:bg-emerald-600/10 rounded-lg text-emerald-700/70 touch-manipulation">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(k.id)} className="p-2.5 sm:p-2 hover:bg-red-900/10 rounded-lg text-red-900/70 touch-manipulation">
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
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900 p-1 touch-manipulation">
              <X size={20} />
            </button>
            <h2 className="font-display text-xl font-semibold mb-4">{editingId ? 'Ubah Kwitansi' : 'Buat Kwitansi'}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
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
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Sudah Terima Dari</label>
                <input className="input-field" value={form.sudah_terima_dari} onChange={(e) => setForm({ ...form, sudah_terima_dari: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Untuk Pembayaran</label>
                <textarea required rows={2} className="input-field" value={form.untuk_pembayaran} onChange={(e) => setForm({ ...form, untuk_pembayaran: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
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

              <div className="sm:col-span-2 pt-2 border-t border-ink-900/10">
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

            <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button type="button" className="btn-secondary w-full sm:w-auto justify-center" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto justify-center">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Template cetak dirender di luar elemen "no-print" supaya ikut tercetak. */}
      {cetak && (
        <KuitansiPrintTemplate
          data={dataUntukCetak(cetak)}
          tanpaWatermark={TANPA_WATERMARK}
          tema={tema}
        />
      )}
    </>
  )
}
