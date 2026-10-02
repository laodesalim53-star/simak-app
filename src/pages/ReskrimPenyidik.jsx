import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import {
  Loader2, Plus, Search, X, Pencil, Trash2, Gavel, Users, Package, History, FileText,
  Download, ChevronLeft, ChevronRight,
} from 'lucide-react'

// Laman Reskrim - Bagian Penyidik (tenant jenis_organisasi === 'polres').
// Register perkara + pihak (tersangka/saksi/korban/ahli) + barang bukti +
// riwayat tahapan. Semua data dipisah per tenant lewat sekolah_id (RLS).
// Tabel: perkara_reskrim, pihak_perkara, barang_bukti_perkara, riwayat_perkara
// (lihat reskrim_penyidik.sql dan reskrim_penyidik_tambahan.sql).
//
// Catatan: `jenisOrganisasi` diasumsikan tersedia dari useAuth(). Sesuaikan
// nama field-nya dengan AuthContext Anda.

const STATUS = [
  { k: 'lidik', l: 'Penyelidikan', warna: 'bg-slate-100 text-slate-700' },
  { k: 'sidik', l: 'Penyidikan', warna: 'bg-blue-100 text-blue-800' },
  { k: 'tahap1', l: 'Berkas Tahap I', warna: 'bg-indigo-100 text-indigo-800' },
  { k: 'p19', l: 'P-19 (Berkas Dikembalikan)', warna: 'bg-amber-100 text-amber-800' },
  { k: 'p21', l: 'P-21 (Berkas Lengkap)', warna: 'bg-emerald-100 text-emerald-800' },
  { k: 'tahap2', l: 'Tahap II', warna: 'bg-teal-100 text-teal-800' },
  { k: 'sp3', l: 'SP3', warna: 'bg-rose-100 text-rose-800' },
  { k: 'rj', l: 'Restorative Justice', warna: 'bg-purple-100 text-purple-800' },
  { k: 'selesai', l: 'Selesai', warna: 'bg-gray-200 text-gray-700' },
]
const infoStatus = (k) => STATUS.find((s) => s.k === k) || STATUS[0]

const JENIS_PERKARA = [
  'Pencurian', 'Pencurian dengan Pemberatan', 'Penganiayaan', 'Penipuan / Penggelapan',
  'Narkotika', 'KDRT', 'Perlindungan Anak', 'Pembunuhan', 'Pengeroyokan',
  'Lakalantas', 'Perjudian', 'ITE', 'Korupsi', 'Lainnya',
]
const UNIT = ['Unit I', 'Unit II', 'Unit III', 'Unit IV', 'Unit PPA', 'Unit Tipidter', 'Unit Idik']
const JENIS_PIHAK = [
  { k: 'tersangka', l: 'Tersangka' },
  { k: 'saksi', l: 'Saksi' },
  { k: 'korban', l: 'Korban' },
  { k: 'ahli', l: 'Ahli' },
]
const STATUS_SITA = [
  ['disita', 'Disita'],
  ['dipinjam pakai', 'Dipinjam pakai'],
  ['dikembalikan', 'Dikembalikan'],
  ['dimusnahkan', 'Dimusnahkan'],
  ['diserahkan ke kejaksaan', 'Diserahkan ke Kejaksaan'],
]

const UKURAN_HALAMAN = 25
const BATAS_MUAT = 5000
const AMBANG_TAHAN = 5 // hari: penahanan dianggap hampir habis

const FORM_KOSONG = {
  nomor_lp: '', tanggal_lp: '', jenis_perkara: '', pasal: '', uraian: '',
  tempat_kejadian: '', tanggal_kejadian: '', pelapor: '', penyidik: '', nrp_penyidik: '',
  unit: '', nomor_sprindik: '', tanggal_sprindik: '', status: 'lidik',
}

const tgl = (v) =>
  v ? new Date(v + (v.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) : '-'

// Tanggal lokal (bukan UTC) supaya tidak mundur sehari di zona WIT/WITA/WIB.
const hariIni = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const sisaHari = (v) =>
  v ? Math.round((new Date(v + 'T00:00:00') - new Date(hariIni() + 'T00:00:00')) / 86400000) : null

const pesanError = (error) =>
  error?.code === '23505' ? 'Nomor LP sudah terdaftar.' : error?.message || 'Terjadi kesalahan.'

/* ------------------------------------------------------------------ */
/* Ekspor CSV                                                          */
/* ------------------------------------------------------------------ */
const KOLOM_CSV = [
  ['nomor_lp', 'Nomor LP'], ['tanggal_lp', 'Tanggal LP'], ['jenis_perkara', 'Jenis Perkara'],
  ['pasal', 'Pasal'], ['uraian', 'Uraian'], ['tempat_kejadian', 'TKP'],
  ['tanggal_kejadian', 'Tanggal Kejadian'], ['pelapor', 'Pelapor'], ['penyidik', 'Penyidik'],
  ['nrp_penyidik', 'NRP Penyidik'], ['unit', 'Unit'], ['nomor_sprindik', 'Nomor Sprindik'],
  ['tanggal_sprindik', 'Tanggal Sprindik'], ['status', 'Status'],
]

function unduhCsv(baris) {
  // Awalan ' mencegah sel diperlakukan sebagai rumus oleh Excel/Sheets.
  const esc = (v) => {
    let s = v == null ? '' : String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
    return `"${s.replace(/"/g, '""')}"`
  }
  const isi = [
    KOLOM_CSV.map(([, h]) => esc(h)).join(';'),
    ...baris.map((r) =>
      KOLOM_CSV.map(([k]) => esc(k === 'status' ? infoStatus(r.status).l : r[k])).join(';')
    ),
  ].join('\r\n')
  const blob = new Blob(['\uFEFF' + isi], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `register-perkara-${hariIni()}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/* Komponen kecil                                                      */
/* ------------------------------------------------------------------ */
function Badge({ status }) {
  const s = infoStatus(status)
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.warna}`}>{s.l}</span>
}

function BadgeTahan({ habis }) {
  const s = sisaHari(habis)
  if (s === null) return null
  const warna =
    s < 0 ? 'bg-rose-100 text-rose-800'
      : s <= AMBANG_TAHAN ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-800'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${warna}`}>
      {s < 0 ? `Lewat ${-s} hari` : s === 0 ? 'Habis hari ini' : `Sisa ${s} hari`}
    </span>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label-field">{label}</label>
      {children}
    </div>
  )
}

// `kotor` = ada isian yang belum disimpan; tutup (backdrop / X / Esc) minta konfirmasi.
function Modal({ judul, onTutup, lebar = 'max-w-3xl', kotor = false, children }) {
  const tutup = () => {
    if (kotor && !confirm('Perubahan belum disimpan. Tutup tanpa menyimpan?')) return
    onTutup()
  }

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') tutup() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto p-4" onClick={tutup}>
      <div
        className={`card w-full ${lebar} mx-auto my-6 p-5 bg-white`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="font-semibold text-lg">{judul}</h2>
          <button type="button" className="p-1 rounded hover:bg-black/5" onClick={tutup} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Form tambah / ubah perkara                                          */
/* ------------------------------------------------------------------ */
function FormPerkara({ awal, sekolahId, onSelesai, onTutup }) {
  const [form, setForm] = useState(() => {
    const dasar = { ...FORM_KOSONG }
    if (awal) for (const k of Object.keys(FORM_KOSONG)) dasar[k] = awal[k] ?? FORM_KOSONG[k]
    return dasar
  })
  const [awalJson] = useState(() => JSON.stringify(form))
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const edit = Boolean(awal?.id)
  const kotor = JSON.stringify(form) !== awalJson

  async function simpan(e) {
    e.preventDefault()
    if (saving) return
    if (!form.nomor_lp.trim()) return alert('Nomor LP wajib diisi.')
    setSaving(true)

    const payload = { sekolah_id: sekolahId, diperbarui_pada: new Date().toISOString() }
    for (const k of Object.keys(FORM_KOSONG)) payload[k] = form[k]?.toString().trim() || null
    payload.status = form.status || 'lidik'

    let perkaraId = awal?.id
    let pesanRiwayat = null

    if (edit) {
      const { error } = await supabase.from('perkara_reskrim').update(payload).eq('id', perkaraId)
      if (error) { setSaving(false); return alert('Gagal menyimpan perkara: ' + pesanError(error)) }
      if (awal.status !== payload.status) {
        const { error: eR } = await supabase.from('riwayat_perkara').insert({
          sekolah_id: sekolahId, perkara_id: perkaraId, tanggal: hariIni(),
          tahapan: infoStatus(payload.status).l, catatan: 'Diubah lewat form perkara.',
        })
        if (eR) pesanRiwayat = eR.message
      }
    } else {
      const { data, error } = await supabase.from('perkara_reskrim').insert(payload).select('id').single()
      if (error) { setSaving(false); return alert('Gagal menyimpan perkara: ' + pesanError(error)) }
      perkaraId = data.id
      const { error: eR } = await supabase.from('riwayat_perkara').insert({
        sekolah_id: sekolahId, perkara_id: perkaraId, tanggal: payload.tanggal_lp || hariIni(),
        tahapan: infoStatus(payload.status).l, catatan: 'Perkara dicatat dalam register.',
      })
      if (eR) pesanRiwayat = eR.message
    }

    setSaving(false)
    if (pesanRiwayat) alert('Perkara tersimpan, tetapi riwayat gagal dicatat: ' + pesanRiwayat)
    onSelesai()
  }

  return (
    <Modal judul={edit ? 'Ubah Perkara' : 'Tambah Perkara'} onTutup={onTutup} kotor={kotor}>
      <form onSubmit={simpan} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nomor LP" className="sm:col-span-2">
            <input className="input-field" value={form.nomor_lp} onChange={(e) => set('nomor_lp', e.target.value)}
              placeholder="LP/B/12/IX/2026/SPKT/Polres..." />
          </Field>
          <Field label="Tanggal LP">
            <input type="date" className="input-field" value={form.tanggal_lp} onChange={(e) => set('tanggal_lp', e.target.value)} />
          </Field>

          <Field label="Jenis Perkara">
            <input className="input-field" list="jenis-perkara" value={form.jenis_perkara}
              onChange={(e) => set('jenis_perkara', e.target.value)} />
            <datalist id="jenis-perkara">{JENIS_PERKARA.map((j) => <option key={j} value={j} />)}</datalist>
          </Field>
          <Field label="Pasal yang Disangkakan" className="sm:col-span-2">
            <input className="input-field" value={form.pasal} onChange={(e) => set('pasal', e.target.value)}
              placeholder="Contoh: Pasal 362 KUHP" />
          </Field>

          <Field label="Uraian Singkat Kejadian" className="sm:col-span-3">
            <textarea className="input-field" rows={3} value={form.uraian} onChange={(e) => set('uraian', e.target.value)} />
          </Field>

          <Field label="Tempat Kejadian" className="sm:col-span-2">
            <input className="input-field" value={form.tempat_kejadian} onChange={(e) => set('tempat_kejadian', e.target.value)} />
          </Field>
          <Field label="Tanggal Kejadian">
            <input type="date" className="input-field" value={form.tanggal_kejadian} onChange={(e) => set('tanggal_kejadian', e.target.value)} />
          </Field>

          <Field label="Pelapor" className="sm:col-span-3">
            <input className="input-field" value={form.pelapor} onChange={(e) => set('pelapor', e.target.value)} />
          </Field>

          <Field label="Penyidik / Penyidik Pembantu">
            <input className="input-field" value={form.penyidik} onChange={(e) => set('penyidik', e.target.value)} />
          </Field>
          <Field label="NRP Penyidik">
            <input className="input-field" value={form.nrp_penyidik} onChange={(e) => set('nrp_penyidik', e.target.value)} />
          </Field>
          <Field label="Unit">
            <select className="input-field" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
              <option value="">- pilih -</option>
              {UNIT.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>

          <Field label="Nomor Sprindik" className="sm:col-span-2">
            <input className="input-field" value={form.nomor_sprindik} onChange={(e) => set('nomor_sprindik', e.target.value)} />
          </Field>
          <Field label="Tanggal Sprindik">
            <input type="date" className="input-field" value={form.tanggal_sprindik} onChange={(e) => set('tanggal_sprindik', e.target.value)} />
          </Field>

          <Field label="Status Perkara" className="sm:col-span-3">
            <select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
            </select>
          </Field>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-secondary" onClick={onTutup}>Batal</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />} Simpan Perkara
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Tab: pihak (tersangka, saksi, korban, ahli)                         */
/* ------------------------------------------------------------------ */
const PIHAK_KOSONG = {
  jenis: 'tersangka', nama: '', umur: '', pekerjaan: '', alamat: '',
  status_penahanan: '', tgl_mulai_tahan: '', tgl_habis_tahan: '', keterangan: '',
}

function TabPihak({ perkaraId, sekolahId, daftar, muatUlang }) {
  const [form, setForm] = useState(PIHAK_KOSONG)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const tersangka = form.jenis === 'tersangka'
  const ditahan = tersangka && form.status_penahanan === 'Ditahan'

  function batal() {
    setEditId(null)
    setForm(PIHAK_KOSONG)
  }

  function mulaiUbah(d) {
    const baru = { ...PIHAK_KOSONG }
    for (const k of Object.keys(PIHAK_KOSONG)) baru[k] = d[k] ?? ''
    baru.umur = d.umur ?? ''
    setForm(baru)
    setEditId(d.id)
  }

  async function simpan(e) {
    e.preventDefault()
    if (saving) return
    if (!form.nama.trim()) return alert('Nama wajib diisi.')
    if (ditahan && form.tgl_mulai_tahan && form.tgl_habis_tahan && form.tgl_habis_tahan < form.tgl_mulai_tahan) {
      return alert('Tanggal habis penahanan tidak boleh sebelum tanggal mulai.')
    }
    setSaving(true)

    const data = {
      jenis: form.jenis,
      nama: form.nama.trim(),
      umur: form.umur !== '' ? parseInt(form.umur, 10) : null,
      pekerjaan: form.pekerjaan.trim() || null,
      alamat: form.alamat.trim() || null,
      status_penahanan: tersangka ? form.status_penahanan || null : null,
      tgl_mulai_tahan: ditahan ? form.tgl_mulai_tahan || null : null,
      tgl_habis_tahan: ditahan ? form.tgl_habis_tahan || null : null,
      keterangan: form.keterangan.trim() || null,
    }

    const { error } = editId
      ? await supabase.from('pihak_perkara').update(data).eq('id', editId)
      : await supabase.from('pihak_perkara').insert({ sekolah_id: sekolahId, perkara_id: perkaraId, ...data })

    setSaving(false)
    if (error) return alert('Gagal menyimpan data pihak: ' + error.message)
    setEditId(null)
    setForm({ ...PIHAK_KOSONG, jenis: form.jenis })
    muatUlang()
  }

  async function hapus(id) {
    if (!confirm('Hapus data ini?')) return
    const { error } = await supabase.from('pihak_perkara').delete().eq('id', id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    if (editId === id) batal()
    muatUlang()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={simpan} className="grid gap-3 sm:grid-cols-6 p-3 rounded-lg border border-ink-700/10">
        <Field label="Sebagai" className="sm:col-span-2">
          <select className="input-field" value={form.jenis} onChange={(e) => set('jenis', e.target.value)}>
            {JENIS_PIHAK.map((j) => <option key={j.k} value={j.k}>{j.l}</option>)}
          </select>
        </Field>
        <Field label="Nama" className="sm:col-span-3">
          <input className="input-field" value={form.nama} onChange={(e) => set('nama', e.target.value)} />
        </Field>
        <Field label="Umur">
          <input type="number" min="0" className="input-field" value={form.umur} onChange={(e) => set('umur', e.target.value)} />
        </Field>
        <Field label="Pekerjaan" className="sm:col-span-2">
          <input className="input-field" value={form.pekerjaan} onChange={(e) => set('pekerjaan', e.target.value)} />
        </Field>
        <Field label="Alamat" className="sm:col-span-4">
          <input className="input-field" value={form.alamat} onChange={(e) => set('alamat', e.target.value)} />
        </Field>
        {tersangka && (
          <>
            <Field label="Status Penahanan" className="sm:col-span-2">
              <select className="input-field" value={form.status_penahanan} onChange={(e) => set('status_penahanan', e.target.value)}>
                <option value="">- pilih -</option>
                <option value="Ditahan">Ditahan</option>
                <option value="Tidak ditahan">Tidak ditahan</option>
                <option value="Penangguhan">Penangguhan</option>
                <option value="DPO">DPO</option>
              </select>
            </Field>
            {ditahan ? (
              <>
                <Field label="Mulai Ditahan" className="sm:col-span-2">
                  <input type="date" className="input-field" value={form.tgl_mulai_tahan} onChange={(e) => set('tgl_mulai_tahan', e.target.value)} />
                </Field>
                <Field label="Habis Penahanan" className="sm:col-span-2">
                  <input type="date" className="input-field" value={form.tgl_habis_tahan} onChange={(e) => set('tgl_habis_tahan', e.target.value)} />
                </Field>
              </>
            ) : null}
          </>
        )}
        <Field label="Keterangan" className="sm:col-span-6">
          <input className="input-field" value={form.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
        </Field>
        <div className="sm:col-span-6 flex justify-end gap-2">
          {editId && <button type="button" className="btn-secondary" onClick={batal}>Batal</button>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : editId ? <Pencil size={16} /> : <Plus size={16} />}
            {editId ? ' Simpan' : ' Tambah'}
          </button>
        </div>
      </form>

      {JENIS_PIHAK.map((jp) => {
        const isi = daftar.filter((d) => d.jenis === jp.k)
        return (
          <div key={jp.k}>
            <p className="text-sm font-medium mb-1">{jp.l} ({isi.length})</p>
            {isi.length === 0 ? (
              <p className="text-sm text-ink-700/50 mb-2">Belum ada data {jp.l.toLowerCase()}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {isi.map((d) => (
                      <tr key={d.id} className={`border-t border-ink-700/10 align-top ${editId === d.id ? 'bg-black/[0.03]' : ''}`}>
                        <td className="py-2 pr-3">
                          <div className="font-medium">{d.nama}{d.umur != null ? `, ${d.umur} th` : ''}</div>
                          <div className="text-ink-700/60">
                            {[d.pekerjaan, d.alamat].filter(Boolean).join(' - ') || '-'}
                          </div>
                          {d.keterangan && <div className="text-ink-700/60">{d.keterangan}</div>}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="whitespace-nowrap">{d.status_penahanan || ''}</div>
                          {d.status_penahanan === 'Ditahan' && (d.tgl_mulai_tahan || d.tgl_habis_tahan) && (
                            <div className="text-xs text-ink-700/60 whitespace-nowrap">
                              {tgl(d.tgl_mulai_tahan)} s/d {tgl(d.tgl_habis_tahan)}
                            </div>
                          )}
                          {d.status_penahanan === 'Ditahan' && <BadgeTahan habis={d.tgl_habis_tahan} />}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button className="p-1 rounded hover:bg-black/5" onClick={() => mulaiUbah(d)} aria-label="Ubah">
                            <Pencil size={15} />
                          </button>
                          <button className="p-1 rounded hover:bg-black/5" onClick={() => hapus(d.id)} aria-label="Hapus">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tab: barang bukti                                                   */
/* ------------------------------------------------------------------ */
const BB_KOSONG = { nama_barang: '', jumlah: '', kondisi: '', lokasi_simpan: '', status_sita: 'disita' }

const OpsiStatusSita = () =>
  STATUS_SITA.map(([k, l]) => <option key={k} value={k}>{l}</option>)

function TabBarangBukti({ perkaraId, sekolahId, daftar, muatUlang }) {
  const [form, setForm] = useState(BB_KOSONG)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  async function tambah(e) {
    e.preventDefault()
    if (saving) return
    if (!form.nama_barang.trim()) return alert('Nama barang wajib diisi.')
    setSaving(true)
    const { error } = await supabase.from('barang_bukti_perkara').insert({
      sekolah_id: sekolahId, perkara_id: perkaraId,
      nama_barang: form.nama_barang.trim(), jumlah: form.jumlah.trim() || null,
      kondisi: form.kondisi.trim() || null, lokasi_simpan: form.lokasi_simpan.trim() || null,
      status_sita: form.status_sita,
    })
    setSaving(false)
    if (error) return alert('Gagal menambah barang bukti: ' + error.message)
    setForm(BB_KOSONG)
    muatUlang()
  }

  async function ubahStatus(id, status_sita) {
    const { error } = await supabase.from('barang_bukti_perkara').update({ status_sita }).eq('id', id)
    if (error) return alert('Gagal mengubah status: ' + error.message)
    muatUlang()
  }

  async function hapus(id) {
    if (!confirm('Hapus barang bukti ini?')) return
    const { error } = await supabase.from('barang_bukti_perkara').delete().eq('id', id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    muatUlang()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={tambah} className="grid gap-3 sm:grid-cols-6 p-3 rounded-lg border border-ink-700/10">
        <Field label="Nama Barang" className="sm:col-span-3">
          <input className="input-field" value={form.nama_barang} onChange={(e) => set('nama_barang', e.target.value)} />
        </Field>
        <Field label="Jumlah" className="sm:col-span-1">
          <input className="input-field" value={form.jumlah} onChange={(e) => set('jumlah', e.target.value)} placeholder="1 unit" />
        </Field>
        <Field label="Status" className="sm:col-span-2">
          <select className="input-field" value={form.status_sita} onChange={(e) => set('status_sita', e.target.value)}>
            <OpsiStatusSita />
          </select>
        </Field>
        <Field label="Kondisi" className="sm:col-span-3">
          <input className="input-field" value={form.kondisi} onChange={(e) => set('kondisi', e.target.value)} />
        </Field>
        <Field label="Lokasi Penyimpanan" className="sm:col-span-3">
          <input className="input-field" value={form.lokasi_simpan} onChange={(e) => set('lokasi_simpan', e.target.value)} placeholder="Contoh: Rupbasan / Gudang BB Polres" />
        </Field>
        <div className="sm:col-span-6 flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Tambah
          </button>
        </div>
      </form>

      {daftar.length === 0 ? (
        <p className="text-sm text-ink-700/50">Belum ada barang bukti untuk perkara ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-700/60">
                <th className="py-2 pr-3 font-medium">Barang</th>
                <th className="py-2 pr-3 font-medium">Kondisi / Lokasi</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {daftar.map((b) => (
                <tr key={b.id} className="border-t border-ink-700/10 align-top">
                  <td className="py-2 pr-3 font-medium">{b.nama_barang}{b.jumlah ? ` (${b.jumlah})` : ''}</td>
                  <td className="py-2 pr-3 text-ink-700/70">{[b.kondisi, b.lokasi_simpan].filter(Boolean).join(' / ') || '-'}</td>
                  <td className="py-2 pr-3">
                    <select className="input-field !py-1 text-xs" value={b.status_sita || 'disita'} onChange={(e) => ubahStatus(b.id, e.target.value)}>
                      <OpsiStatusSita />
                    </select>
                  </td>
                  <td className="py-2 text-right">
                    <button className="p-1 rounded hover:bg-black/5" onClick={() => hapus(b.id)} aria-label="Hapus">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tab: riwayat tahapan                                                */
/* ------------------------------------------------------------------ */
function TabRiwayat({ perkara, sekolahId, daftar, muatUlang, onStatusBerubah }) {
  const [status, setStatus] = useState(perkara.status)
  const [tanggal, setTanggal] = useState(hariIni())
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)

  async function catat(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)

    const tahapan = infoStatus(status).l
    const cat = catatan.trim() || null

    let error
    if (status !== perkara.status) {
      // Satu transaksi: ubah status perkara + catat riwayat (lihat reskrim_penyidik_tambahan.sql).
      ;({ error } = await supabase.rpc('ubah_status_perkara', {
        p_perkara_id: perkara.id, p_status: status, p_tanggal: tanggal, p_tahapan: tahapan, p_catatan: cat,
      }))
    } else {
      ;({ error } = await supabase.from('riwayat_perkara').insert({
        sekolah_id: sekolahId, perkara_id: perkara.id, tanggal, tahapan, catatan: cat,
      }))
    }

    setSaving(false)
    if (error) return alert('Gagal mencatat tahapan: ' + error.message)
    setCatatan('')
    muatUlang()
    onStatusBerubah()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={catat} className="grid gap-3 sm:grid-cols-6 p-3 rounded-lg border border-ink-700/10">
        <Field label="Tahapan" className="sm:col-span-3">
          <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
          </select>
        </Field>
        <Field label="Tanggal" className="sm:col-span-3">
          <input type="date" className="input-field" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </Field>
        <Field label="Catatan" className="sm:col-span-6">
          <input className="input-field" value={catatan} onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: Berkas dikirim ke JPU, SPDP No. ..." />
        </Field>
        <div className="sm:col-span-6 flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Catat Tahapan
          </button>
        </div>
      </form>

      {daftar.length === 0 ? (
        <p className="text-sm text-ink-700/50">Belum ada riwayat.</p>
      ) : (
        <ol className="border-l-2 border-ink-700/15 ml-2 space-y-3">
          {daftar.map((r) => (
            <li key={r.id} className="pl-4 relative">
              <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-ink-700/60" />
              <div className="text-sm font-medium">{r.tahapan}</div>
              <div className="text-xs text-ink-700/60">{tgl(r.tanggal)}</div>
              {r.catatan && <div className="text-sm text-ink-700/80">{r.catatan}</div>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Detail perkara                                                      */
/* ------------------------------------------------------------------ */
function DetailPerkara({ perkara, sekolahId, onTutup, onUbah, onHapus, onStatusBerubah, onPihakBerubah }) {
  const [tab, setTab] = useState('pihak')
  const [pihak, setPihak] = useState([])
  const [bb, setBb] = useState([])
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(true)

  async function muat() {
    const [a, b, c] = await Promise.all([
      supabase.from('pihak_perkara').select('*').eq('perkara_id', perkara.id).order('dibuat_pada'),
      supabase.from('barang_bukti_perkara').select('*').eq('perkara_id', perkara.id).order('dibuat_pada'),
      supabase.from('riwayat_perkara').select('*').eq('perkara_id', perkara.id)
        .order('tanggal', { ascending: false }).order('dibuat_pada', { ascending: false }),
    ])
    const err = a.error || b.error || c.error
    if (err) alert('Gagal memuat detail perkara: ' + err.message)
    setPihak(a.data || [])
    setBb(b.data || [])
    setRiwayat(c.data || [])
    setLoading(false)
  }
  useEffect(() => { muat() }, [perkara.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const muatPihak = async () => {
    await muat()
    onPihakBerubah()
  }

  const tabs = [
    { k: 'pihak', l: `Pihak (${pihak.length})`, ikon: Users },
    { k: 'bb', l: `Barang Bukti (${bb.length})`, ikon: Package },
    { k: 'riwayat', l: 'Riwayat Tahapan', ikon: History },
  ]

  const baris = [
    ['Tanggal LP', tgl(perkara.tanggal_lp)],
    ['Jenis Perkara', perkara.jenis_perkara || '-'],
    ['Pasal', perkara.pasal || '-'],
    ['Pelapor', perkara.pelapor || '-'],
    ['TKP', perkara.tempat_kejadian || '-'],
    ['Tanggal Kejadian', tgl(perkara.tanggal_kejadian)],
    ['Penyidik', [perkara.penyidik, perkara.nrp_penyidik && `NRP ${perkara.nrp_penyidik}`].filter(Boolean).join(' - ') || '-'],
    ['Unit', perkara.unit || '-'],
    ['Sprindik', [perkara.nomor_sprindik, perkara.tanggal_sprindik && tgl(perkara.tanggal_sprindik)].filter(Boolean).join(', ') || '-'],
  ]

  return (
    <Modal judul={`LP ${perkara.nomor_lp}`} onTutup={onTutup} lebar="max-w-4xl">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge status={perkara.status} />
        <div className="flex-1" />
        <button className="btn-secondary text-xs" onClick={onUbah}><Pencil size={14} /> Ubah</button>
        <button className="btn-secondary text-xs" onClick={onHapus}><Trash2 size={14} /> Hapus</button>
      </div>

      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm mb-3">
        {baris.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-32 shrink-0 text-ink-700/60">{k}</dt>
            <dd className="font-medium break-words">{v}</dd>
          </div>
        ))}
      </dl>
      {perkara.uraian && (
        <p className="text-sm bg-black/[0.03] rounded-lg p-3 mb-4 whitespace-pre-line">{perkara.uraian}</p>
      )}

      <div className="flex gap-1 border-b border-ink-700/10 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
              tab === t.k ? 'border-ink-700 font-semibold' : 'border-transparent text-ink-700/60'
            }`}
          >
            <t.ikon size={15} /> {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-6 text-center text-ink-700/50">
          <Loader2 size={18} className="animate-spin inline-block mr-2" /> Memuat...
        </div>
      ) : tab === 'pihak' ? (
        <TabPihak perkaraId={perkara.id} sekolahId={sekolahId} daftar={pihak} muatUlang={muatPihak} />
      ) : tab === 'bb' ? (
        <TabBarangBukti perkaraId={perkara.id} sekolahId={sekolahId} daftar={bb} muatUlang={muat} />
      ) : (
        <TabRiwayat perkara={perkara} sekolahId={sekolahId} daftar={riwayat} muatUlang={muat} onStatusBerubah={onStatusBerubah} />
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Halaman utama                                                       */
/* ------------------------------------------------------------------ */
export default function ReskrimPenyidik() {
  const { sekolahId, jenisOrganisasi } = useAuth()
  const [daftar, setDaftar] = useState([])
  const [tahanan, setTahanan] = useState([])
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fTahun, setFTahun] = useState('')
  const [hal, setHal] = useState(1)
  const [formBuka, setFormBuka] = useState(false)
  const [diedit, setDiedit] = useState(null)
  const [detailId, setDetailId] = useState(null)

  const bolehAkses = jenisOrganisasi === 'polres'

  async function muat() {
    if (!sekolahId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('perkara_reskrim')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('tanggal_lp', { ascending: false, nullsFirst: false })
      .order('dibuat_pada', { ascending: false })
      .limit(BATAS_MUAT)
    if (error) alert('Gagal memuat register perkara: ' + error.message)
    setDaftar(data || [])
    setLoading(false)
  }

  // Tersangka yang sedang ditahan dan punya tanggal habis penahanan.
  async function muatTahanan() {
    if (!sekolahId) return
    const { data, error } = await supabase
      .from('pihak_perkara')
      .select('id, perkara_id, tgl_habis_tahan')
      .eq('sekolah_id', sekolahId)
      .eq('jenis', 'tersangka')
      .eq('status_penahanan', 'Ditahan')
      .not('tgl_habis_tahan', 'is', null)
    if (error) { console.warn('Gagal memuat data penahanan:', error.message); return }
    setTahanan(data || [])
  }

  useEffect(() => {
    if (!bolehAkses) { setLoading(false); return }
    muat()
    muatTahanan()
  }, [sekolahId, bolehAkses]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setHal(1) }, [cari, fStatus, fTahun])

  const tahunAda = useMemo(
    () => [...new Set(daftar.map((p) => p.tanggal_lp?.slice(0, 4)).filter(Boolean))].sort().reverse(),
    [daftar]
  )

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return daftar.filter((p) => {
      if (fStatus && p.status !== fStatus) return false
      if (fTahun && p.tanggal_lp?.slice(0, 4) !== fTahun) return false
      if (!q) return true
      return [p.nomor_lp, p.jenis_perkara, p.pasal, p.pelapor, p.penyidik, p.tempat_kejadian]
        .some((v) => v?.toLowerCase().includes(q))
    })
  }, [daftar, cari, fStatus, fTahun])

  const totalHal = Math.max(1, Math.ceil(tersaring.length / UKURAN_HALAMAN))
  const halAman = Math.min(hal, totalHal)
  const tampil = tersaring.slice((halAman - 1) * UKURAN_HALAMAN, halAman * UKURAN_HALAMAN)

  const hitung = (...kunci) => daftar.filter((p) => kunci.includes(p.status)).length
  const hampirHabis = tahanan.filter((t) => {
    const s = sisaHari(t.tgl_habis_tahan)
    return s !== null && s <= AMBANG_TAHAN
  }).length

  const ringkasan = [
    { l: 'Total perkara', n: daftar.length },
    { l: 'Penyelidikan', n: hitung('lidik') },
    { l: 'Penyidikan', n: hitung('sidik') },
    { l: 'Proses berkas', n: hitung('tahap1', 'p19', 'p21', 'tahap2') },
    { l: 'Selesai / SP3 / RJ', n: hitung('selesai', 'sp3', 'rj') },
    {
      l: `Penahanan habis ≤ ${AMBANG_TAHAN} hari`, n: hampirHabis,
      peringatan: hampirHabis > 0,
    },
  ]

  const detail = daftar.find((p) => p.id === detailId) || null

  async function hapusPerkara(p) {
    if (!confirm(`Hapus perkara LP ${p.nomor_lp} beserta pihak, barang bukti, dan riwayatnya?`)) return
    const { error } = await supabase.from('perkara_reskrim').delete().eq('id', p.id)
    if (error) return alert('Gagal menghapus perkara: ' + error.message)
    setDetailId(null)
    muat()
    muatTahanan()
  }

  if (!bolehAkses) {
    return (
      <Layout title="Reskrim - Penyidik">
        <div className="card p-8 text-center text-ink-700/60">
          <Gavel size={28} className="inline-block mb-2 text-ink-700/30" />
          <p>Laman ini hanya tersedia untuk satuan Polres.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Reskrim - Penyidik" subtitle="Register perkara, pihak, barang bukti, dan tahapan penyidikan">
      <div className="space-y-5">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
          {ringkasan.map((r) => (
            <div key={r.l} className={`card p-4 ${r.peringatan ? 'bg-amber-50 border-amber-300' : ''}`}>
              <div className="text-2xl font-semibold">{r.n}</div>
              <div className="text-xs text-ink-700/60">{r.l}</div>
            </div>
          ))}
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="label-field">Cari</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
                <input
                  className="input-field !pl-9"
                  placeholder="Nomor LP, jenis, pasal, pelapor, penyidik, TKP"
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label-field">Status</label>
              <select className="input-field" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="">Semua</option>
                {STATUS.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Tahun LP</label>
              <select className="input-field" value={fTahun} onChange={(e) => setFTahun(e.target.value)}>
                <option value="">Semua</option>
                {tahunAda.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button
              className="btn-secondary"
              disabled={tersaring.length === 0}
              onClick={() => unduhCsv(tersaring)}
              title="Unduh daftar yang sedang tampil (sesuai filter) sebagai CSV"
            >
              <Download size={16} /> Ekspor CSV
            </button>
            <button className="btn-primary" onClick={() => { setDiedit(null); setFormBuka(true) }}>
              <Plus size={16} /> Tambah Perkara
            </button>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-ink-700/50">
              <Loader2 size={20} className="animate-spin inline-block mr-2" /> Memuat data...
            </div>
          ) : tersaring.length === 0 ? (
            <div className="p-10 text-center text-ink-700/60">
              <Gavel size={28} className="inline-block mb-2 text-ink-700/30" />
              <p>{daftar.length === 0 ? 'Belum ada perkara. Klik "Tambah Perkara" untuk mencatat laporan pertama.' : 'Tidak ada perkara yang cocok dengan filter.'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-700/60 bg-black/[0.03]">
                      <th className="py-2.5 px-4 font-medium">Nomor LP</th>
                      <th className="py-2.5 px-4 font-medium">Perkara</th>
                      <th className="py-2.5 px-4 font-medium">Penyidik</th>
                      <th className="py-2.5 px-4 font-medium">Status</th>
                      <th className="py-2.5 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {tampil.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-ink-700/10 hover:bg-black/[0.02] cursor-pointer align-top"
                        onClick={() => setDetailId(p.id)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium break-all">{p.nomor_lp}</div>
                          <div className="text-xs text-ink-700/60">{tgl(p.tanggal_lp)}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{p.jenis_perkara || '-'}</div>
                          <div className="text-xs text-ink-700/60">{p.pasal || ''}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{p.penyidik || '-'}</div>
                          <div className="text-xs text-ink-700/60">{p.unit || ''}</div>
                        </td>
                        <td className="py-3 px-4"><Badge status={p.status} /></td>
                        <td className="py-3 px-4 text-right">
                          <FileText size={16} className="inline-block text-ink-700/40" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-ink-700/10 text-sm">
                <span className="text-ink-700/60">
                  {tersaring.length} perkara
                  {daftar.length >= BATAS_MUAT && ` (dimuat maksimal ${BATAS_MUAT} perkara terbaru)`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-secondary text-xs"
                    disabled={halAman <= 1}
                    onClick={() => setHal(halAman - 1)}
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span>Hal. {halAman} / {totalHal}</span>
                  <button
                    className="btn-secondary text-xs"
                    disabled={halAman >= totalHal}
                    onClick={() => setHal(halAman + 1)}
                    aria-label="Halaman berikutnya"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {formBuka && (
        <FormPerkara
          awal={diedit}
          sekolahId={sekolahId}
          onTutup={() => setFormBuka(false)}
          onSelesai={() => { setFormBuka(false); muat() }}
        />
      )}

      {detail && !formBuka && (
        <DetailPerkara
          perkara={detail}
          sekolahId={sekolahId}
          onTutup={() => setDetailId(null)}
          onUbah={() => { setDiedit(detail); setFormBuka(true) }}
          onHapus={() => hapusPerkara(detail)}
          onStatusBerubah={muat}
          onPihakBerubah={muatTahanan}
        />
      )}
    </Layout>
  )
}
