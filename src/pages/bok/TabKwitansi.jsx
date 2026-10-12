import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { Plus, Pencil, Trash2, Search, X, Loader2, Receipt, Printer, Star } from 'lucide-react'
import { formatRupiah, formatTanggal } from './utils'
import KuitansiPrintTemplate from '../../lib/KuitansiPrintTemplate'
import PilihanTampilanCetak from '../../components/PilihanTampilanCetak'
import {
  muatTemaKuitansi,
  simpanTemaKuitansi,
  bangunPaletKuitansi,
  PRESET_WARNA_KUITANSI,
} from '../../lib/kuitansiTema'

// ============================================================
// TAB 3: KWITANSI
// Penerima bisa ditautkan ke pegawai_puskesmas (kolom kwitansi_bok.pegawai_id).
// Nama/jabatan tetap disimpan sebagai teks untuk histori.
// Daftar pegawai & profil puskesmas dimuat saat tab dibuka (loadReferensi),
// lalu dipakai untuk: dropdown penerima, isian otomatis Kepala Puskesmas
// & Bendahara, dan data cetak.
// Warna tema kwitansi (kuitansiTema) ikut mewarnai aksen form dan dipakai
// template cetak. Setiap baris punya dua tombol cetak: Polos (tanpa bintang)
// dan Berbintang (watermark bintang). Keduanya memakai tema yang sama.
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
  alamat_penerima: '',
  lembar: 'I/II/III/IV/V',
  mata_anggaran: '',
  tahun_anggaran: String(new Date().getFullYear()),
  disetujui_oleh: '',
  nip_disetujui: '',
  dibayar_oleh: '',
  nip_dibayar: '',
  catatan: '',
}

// Bendahara dikenali dari jabatan pegawai (mengandung kata "bendahara").
function cariBendahara(daftar) {
  return (daftar || []).find((p) => (p.jabatan || '').toLowerCase().includes('bendahara'))
}

// Kepala Puskesmas dikenali dari jabatan "kepala puskesmas" (cadangan bila
// profil puskesmas belum diisi).
function cariKepala(daftar) {
  return (daftar || []).find((p) => (p.jabatan || '').toLowerCase().includes('kepala puskesmas'))
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
  const [cetak, setCetak] = useState(null) // { row, berbintang } kwitansi yang sedang dicetak
  const [tema, setTema] = useState(() => muatTemaKuitansi())

  // Warna aksen dari tema kwitansi yang dipilih.
  const palet = bangunPaletKuitansi(tema)

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

  // Nilai bawaan penandatangan: profil puskesmas dulu, lalu data pegawai.
  function bawaanTtd() {
    const kepala = cariKepala(pegawaiList)
    const bendahara = cariBendahara(pegawaiList)
    return {
      disetujui_oleh: profilPuskesmas?.kepala_puskesmas || kepala?.nama_lengkap || '',
      nip_disetujui: profilPuskesmas?.nip_kepala_puskesmas || kepala?.nip || '',
      dibayar_oleh: bendahara?.nama_lengkap || '',
      nip_dibayar: bendahara?.nip || '',
      alamat_penerima: profilPuskesmas?.tempat_ttd || profilPuskesmas?.kabupaten || '',
    }
  }

  // Petakan baris kwitansi_bok ke bentuk yang dibaca KuitansiPrintTemplate.
  function dataUntukCetak(k) {
    const potongan = [
      Number(k.potongan_pph) > 0 && `PPh ${formatRupiah(k.potongan_pph)}`,
      Number(k.potongan_ppn) > 0 && `PPN ${formatRupiah(k.potongan_ppn)}`,
    ].filter(Boolean)
    const bawaan = bawaanTtd()
    const pegawaiTertaut = k.pegawai_id ? pegawaiList.find((p) => p.id === k.pegawai_id) : null
    return {
      no_bukti: k.nomor_kwitansi || '',
      lembar: k.lembar || 'I/II/III/IV/V',
      mata_anggaran: k.mata_anggaran || '',
      tahun_anggaran: k.tahun_anggaran || String(new Date(k.tanggal).getFullYear()),
      tanggal: k.tanggal,
      diterima_dari: k.sudah_terima_dari || profilPuskesmas?.nama_puskesmas || '',
      jumlah_total: k.jumlah_uang,
      untuk_pembayaran: k.untuk_pembayaran,
      jabatan_disetujui: 'Kepala Puskesmas',
      disetujui_oleh: k.disetujui_oleh || bawaan.disetujui_oleh,
      nip_disetujui: k.nip_disetujui || bawaan.nip_disetujui,
      dibayar_oleh: k.dibayar_oleh || bawaan.dibayar_oleh,
      nip_dibayar: k.nip_dibayar || bawaan.nip_dibayar,
      nama_penerima: k.nama_penerima || pegawaiTertaut?.nama_lengkap || '',
      alamat_penerima: k.alamat_penerima || bawaan.alamat_penerima,
      catatan: [k.catatan, potongan.length ? `Potongan ${potongan.join(', ')}` : ''].filter(Boolean).join('. '),
    }
  }

  // Data pendukung: daftar pegawai & profil puskesmas.
  async function loadReferensi() {
    if (!sekolahId) {
      setPegawaiList([])
      setProfilPuskesmas(null)
      return
    }
    const [resPegawai, resProfil] = await Promise.all([
      supabase.from('pegawai_puskesmas').select('*').eq('sekolah_id', sekolahId).order('nama_lengkap', { ascending: true }),
      supabase.from('profil_puskesmas').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
    ])
    if (resPegawai.error) console.error('Gagal memuat data pegawai:', resPegawai.error.message)
    if (resProfil.error) console.error('Gagal memuat profil puskesmas:', resProfil.error.message)
    setPegawaiList(resPegawai.data || [])
    setProfilPuskesmas(resProfil.data || null)
  }

  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: daftarBku } = await supabase
      .from('bku_bok')
      .select('*')
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
    loadReferensi()
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  function openAdd() {
    setForm({
      ...emptyFormKwitansi,
      tahun_anggaran: String(new Date().getFullYear()),
      sudah_terima_dari: profilPuskesmas?.nama_puskesmas || '',
      ...bawaanTtd(),
    })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(row) {
    const bawaan = bawaanTtd()
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
      alamat_penerima: row.alamat_penerima || bawaan.alamat_penerima,
      lembar: row.lembar || 'I/II/III/IV/V',
      mata_anggaran: row.mata_anggaran || '',
      tahun_anggaran: row.tahun_anggaran || String(new Date().getFullYear()),
      disetujui_oleh: row.disetujui_oleh || bawaan.disetujui_oleh,
      nip_disetujui: row.nip_disetujui || bawaan.nip_disetujui,
      dibayar_oleh: row.dibayar_oleh || bawaan.dibayar_oleh,
      nip_dibayar: row.nip_dibayar || bawaan.nip_dibayar,
      catatan: row.catatan || '',
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
      nomor_kwitansi: bku?.no_bukti || prev.nomor_kwitansi,
      mata_anggaran: bku?.kode_rekening || prev.mata_anggaran,
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
      jabatan_penerima: p ? p.jabatan || '' : prev.jabatan_penerima,
    }))
  }

  // Isi otomatis Nama & NIP penandatangan dari Data Pegawai.
  function pilihPenandatangan(kolomNama, kolomNip, pegawaiId) {
    const p = pegawaiList.find((x) => x.id === pegawaiId)
    if (!p) return
    setForm((prev) => ({ ...prev, [kolomNama]: p.nama_lengkap, [kolomNip]: p.nip || '' }))
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
      alamat_penerima: form.alamat_penerima || null,
      lembar: form.lembar || null,
      mata_anggaran: form.mata_anggaran || null,
      tahun_anggaran: form.tahun_anggaran || null,
      disetujui_oleh: form.disetujui_oleh || null,
      nip_disetujui: form.nip_disetujui || null,
      dibayar_oleh: form.dibayar_oleh || null,
      nip_dibayar: form.nip_dibayar || null,
      catatan: form.catatan || null,
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
        <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full border border-ink-900/20"
            style={{ backgroundColor: palet.line }}
            aria-hidden="true"
          />
          Tampilan Cetak (warna & tata letak)
        </summary>
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
                    <button onClick={() => setCetak({ row: k, berbintang: false })} className="p-2.5 sm:p-2 hover:bg-blue-600/10 rounded-lg text-blue-700/70 touch-manipulation" title="Cetak polos (tanpa bintang)">
                      <Printer size={15} />
                    </button>
                    <button onClick={() => setCetak({ row: k, berbintang: true })} className="p-2.5 sm:p-2 hover:bg-amber-500/10 rounded-lg text-amber-600/80 touch-manipulation" title="Cetak berbintang (watermark)">
                      <Star size={15} />
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
            {/* Garis aksen mengikuti warna Tampilan Cetak yang dipilih */}
            <span className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: palet.line }} />
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
                <label className="eyebrow mb-1.5 block">No. Bukti / Nomor Kwitansi</label>
                <input className="input-field" value={form.nomor_kwitansi} onChange={(e) => setForm({ ...form, nomor_kwitansi: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Tanggal</label>
                <input type="date" required className="input-field" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Lembar</label>
                <input className="input-field" value={form.lembar} onChange={(e) => setForm({ ...form, lembar: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Tahun Anggaran</label>
                <input className="input-field" value={form.tahun_anggaran} onChange={(e) => setForm({ ...form, tahun_anggaran: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Mata Anggaran</label>
                <input className="input-field" placeholder="Contoh: 5.1.02.01.01.0055" value={form.mata_anggaran} onChange={(e) => setForm({ ...form, mata_anggaran: e.target.value })} />
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

              {/* Penandatangan: bisa dipilih cepat dari Data Pegawai, tetap bisa diketik manual */}
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Pilih Penyetuju dari Data Pegawai (opsional)</label>
                <select
                  className="input-field"
                  value=""
                  onChange={(e) => pilihPenandatangan('disetujui_oleh', 'nip_disetujui', e.target.value)}
                >
                  <option value="">— Pilih untuk mengisi Setuju Dibayar & NIP —</option>
                  {pegawaiList.map((p) => (
                    <option key={p.id} value={p.id}>{p.nama_lengkap} — {p.jabatan || 'Tanpa jabatan'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Setuju Dibayar (Kepala Puskesmas)</label>
                <input className="input-field" value={form.disetujui_oleh} onChange={(e) => setForm({ ...form, disetujui_oleh: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">NIP Penyetuju</label>
                <input className="input-field" value={form.nip_disetujui} onChange={(e) => setForm({ ...form, nip_disetujui: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Pilih Pemegang Kas dari Data Pegawai (opsional)</label>
                <select
                  className="input-field"
                  value=""
                  onChange={(e) => pilihPenandatangan('dibayar_oleh', 'nip_dibayar', e.target.value)}
                >
                  <option value="">— Pilih untuk mengisi Lunas Dibayar & NIP —</option>
                  {pegawaiList.map((p) => (
                    <option key={p.id} value={p.id}>{p.nama_lengkap} — {p.jabatan || 'Tanpa jabatan'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Lunas Dibayar (Pemegang Kas)</label>
                <input className="input-field" value={form.dibayar_oleh} onChange={(e) => setForm({ ...form, dibayar_oleh: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">NIP Pemegang Kas</label>
                <input className="input-field" value={form.nip_dibayar} onChange={(e) => setForm({ ...form, nip_dibayar: e.target.value })} />
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
                  {pegawaiList.length === 0
                    ? 'Belum ada Data Pegawai untuk akun ini. Isi dulu di menu Data Pegawai, atau ketik manual di bawah.'
                    : 'Memilih pegawai akan mengisi Nama & Jabatan Penerima di bawah secara otomatis dari Data Pegawai.'}
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
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Alamat Penerima / Kota Tanda Tangan</label>
                <input className="input-field" value={form.alamat_penerima} onChange={(e) => setForm({ ...form, alamat_penerima: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow mb-1.5 block">Catatan (opsional)</label>
                <input className="input-field" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
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
          data={dataUntukCetak(cetak.row)}
          tanpaWatermark={!cetak.berbintang}
          tema={tema}
        />
      )}
    </>
  )
}
