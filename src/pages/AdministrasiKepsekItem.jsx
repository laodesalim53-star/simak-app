import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Search, Pencil, Trash2, Printer, X, Download, FileText } from 'lucide-react'
import Layout from '../components/Layout'
// SESUAIKAN dua impor ini dengan lokasi di repo Anda:
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { CONFIG } from '../lib/administrasiKepsekConfig'
// Template isi KOSP jenjang SD (file kosp-sd.js diletakkan di folder yang sama dengan file ini)
import { KOSP_SD } from './kosp-sd'

const TABEL = 'administrasi_kepsek'

const tgl = (v) => (v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const tampil = (fld, v) => {
  if (v === undefined || v === null || v === '') return '-'
  if (fld.t === 'date') return tgl(v)
  if (fld.t === 'rp') return 'Rp ' + Number(v).toLocaleString('id-ID')
  return String(v)
}

// Teks panjang (textarea) dipotong 4 baris di layar, tetapi tampil penuh saat cetak.
const gayaPotong = {
  whiteSpace: 'pre-line',
  display: '-webkit-box',
  WebkitLineClamp: 4,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

export default function AdministrasiKepsekItem() {
  const { slug } = useParams()
  const cfg = CONFIG[slug]
  const { sekolahId } = useAuth()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null) // { id?, tanggal, data }
  const [saving, setSaving] = useState(false)
  const [guruList, setGuruList] = useState([])
  const [profil, setProfil] = useState(null)
  const [importing, setImporting] = useState(false)
  const [memuatKosp, setMemuatKosp] = useState(false)

  const kolom = useMemo(() => (cfg ? cfg.fields.filter((x) => x.tab) : []), [cfg])

  const muat = useCallback(async () => {
    if (!sekolahId || !cfg) return
    setLoading(true)
    setErr('')
    const { data, error } = await supabase
      .from(TABEL).select('*')
      .eq('sekolah_id', sekolahId).eq('jenis', slug)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setErr(error.message)
    else setRows(data || [])
    setLoading(false)
  }, [sekolahId, slug, cfg])

  useEffect(() => { setQ(''); setForm(null); muat() }, [muat])

  useEffect(() => {
    if (!sekolahId || !cfg) return
    if (cfg.fields.some((x) => x.t === 'guru')) {
      supabase.from('guru').select('nama').eq('sekolah_id', sekolahId).order('nama')
        .then(({ data }) => setGuruList((data || []).map((g) => g.nama).filter(Boolean)))
    }
    // Data kop cetak; abaikan jika kolom berbeda.
    supabase.from('profil_sekolah').select('*').eq('id', sekolahId).maybeSingle()
      .then(({ data }) => setProfil(data || null))
  }, [sekolahId, cfg])

  const tersaring = useMemo(() => {
    const kata = q.trim().toLowerCase()
    if (!kata) return rows
    return rows.filter((r) => JSON.stringify(r.data).toLowerCase().includes(kata))
  }, [rows, q])

  if (!cfg) {
    return (
      <Layout title="Administrasi Kepala Sekolah">
        <p className="text-sm text-slate-600">Halaman tidak ditemukan.</p>
        <Link to="/administrasi-kepsek" className="text-blue-600 text-sm underline">Kembali</Link>
      </Layout>
    )
  }

  const bukaBaru = () => setForm({ tanggal: new Date().toISOString().slice(0, 10), data: {} })
  const bukaEdit = (r) => setForm({ id: r.id, tanggal: r.tanggal || '', data: { ...r.data } })
  const setField = (k, v) => setForm((p) => ({ ...p, data: { ...p.data, [k]: v } }))

  const simpan = async (e) => {
    e.preventDefault()
    const kurang = cfg.fields.find((x) => x.req && !String(form.data[x.k] ?? '').trim())
    if (kurang) return alert(`${kurang.l} wajib diisi.`)
    setSaving(true)
    const payload = { sekolah_id: sekolahId, jenis: slug, tanggal: form.tanggal || null, data: form.data }
    const { error } = form.id
      ? await supabase.from(TABEL).update(payload).eq('id', form.id)
      : await supabase.from(TABEL).insert(payload)
    setSaving(false)
    if (error) return alert('Gagal menyimpan: ' + error.message)
    setForm(null)
    muat()
  }

  const hapus = async (r) => {
    if (!window.confirm('Hapus catatan ini?')) return
    const { error } = await supabase.from(TABEL).delete().eq('id', r.id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    muat()
  }

  const imporSiswa = async () => {
    const { tabel, peta, tanggal } = cfg.impor
    setImporting(true)
    const { data: siswa, error } = await supabase.from(tabel).select('*').eq('sekolah_id', sekolahId)
    if (error) { setImporting(false); return alert('Gagal membaca data siswa: ' + error.message) }
    const ada = new Set(rows.map((r) => `${r.data.nama}|${r.data.nis || ''}`))
    const baru = (siswa || [])
      .map((s) => {
        const data = { status: 'Aktif' }
        Object.entries(peta).forEach(([k, kol]) => { if (s[kol] != null) data[k] = s[kol] })
        return { sekolah_id: sekolahId, jenis: slug, tanggal: s[tanggal] || null, data }
      })
      .filter((x) => x.data.nama && !ada.has(`${x.data.nama}|${x.data.nis || ''}`))
    if (baru.length === 0) { setImporting(false); return alert('Tidak ada siswa baru untuk diimpor.') }
    const { error: e2 } = await supabase.from(TABEL).insert(baru)
    setImporting(false)
    if (e2) return alert('Gagal impor: ' + e2.message)
    alert(`${baru.length} siswa berhasil diimpor.`)
    muat()
  }

  // Muat template KOSP SD. Bagian yang sudah ada (bagian + tahun ajaran sama) dilewati,
  // jadi aman jika tombol tertekan lebih dari sekali.
  const muatTemplateKosp = async () => {
    const baru = KOSP_SD.filter(
      (d) => !rows.some((r) => r.data?.bagian === d.bagian && r.data?.tahun_ajaran === d.tahun_ajaran)
    )
    if (baru.length === 0) return alert('Semua bagian template KOSP SD sudah ada.')
    if (!window.confirm(`Muat ${baru.length} bagian template KOSP SD ke halaman ini?`)) return
    setMemuatKosp(true)
    const tanggal = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from(TABEL).insert(
      baru.map((d) => ({ sekolah_id: sekolahId, jenis: slug, tanggal, data: { ...d } }))
    )
    setMemuatKosp(false)
    if (error) return alert('Gagal memuat template: ' + error.message)
    alert(`${baru.length} bagian KOSP SD berhasil dimuat. Lengkapi bagian [dalam kurung siku] lalu ubah status ke Final.`)
    muat()
  }

  const inputCls = 'w-full px-3 py-2.5 text-base sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400'
  const namaSekolah = profil?.nama_sekolah || profil?.nama || ''
  const tombol = 'inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors'

  return (
    <Layout title={cfg.judul} subtitle={cfg.ket}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cetak-area, #cetak-area * { visibility: visible; }
          #cetak-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: A4 landscape; margin: 12mm; }
        }
      `}</style>

      <Link to="/administrasi-kepsek" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ArrowLeft size={15} /> Administrasi Kepala Sekolah
      </Link>

      {/* Bilah aksi: menumpuk di HP, sebaris di layar lebar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="relative sm:flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari catatan"
            aria-label="Cari catatan" className={`${inputCls} pl-9`} />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 sm:ml-auto">
          {cfg.impor && (
            <button onClick={imporSiswa} disabled={importing}
              className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 col-span-2 sm:col-span-1`}>
              <Download size={16} /> {importing ? 'Mengimpor...' : 'Impor dari Data Siswa'}
            </button>
          )}
          {slug === 'kosp' && (
            <button onClick={muatTemplateKosp} disabled={memuatKosp || loading}
              className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 col-span-2 sm:col-span-1`}>
              <FileText size={16} /> {memuatKosp ? 'Memuat...' : 'Muat Template KOSP SD'}
            </button>
          )}
          <button onClick={() => window.print()} disabled={rows.length === 0}
            className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40`}>
            <Printer size={16} /> Cetak
          </button>
          <button onClick={bukaBaru} className={`${tombol} bg-blue-700 text-white hover:bg-blue-800`}>
            <Plus size={16} /> Tambah
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Gagal memuat data: {err}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Memuat data...</p>
      ) : tersaring.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          {rows.length === 0 ? `Belum ada catatan. Tekan "Tambah" untuk mengisi ${cfg.judul}.` : `Tidak ada catatan yang cocok dengan "${q}".`}
        </div>
      ) : (
        <>
          {/* Tabel (layar >= md) */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-3 py-2.5 w-10">No</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">{cfg.tanggalLabel}</th>
                  {kolom.map((c) => <th key={c.k} className="px-3 py-2.5">{c.l}</th>)}
                  <th className="px-3 py-2.5 w-24" />
                </tr>
              </thead>
              <tbody>
                {tersaring.map((r, i) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2.5">{i + 1}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{tgl(r.tanggal) || '-'}</td>
                    {kolom.map((c) => (
                      <td key={c.k} className="px-3 py-2.5 max-w-xs break-words">
                        {c.t === 'textarea'
                          ? <div style={gayaPotong}>{tampil(c, r.data[c.k])}</div>
                          : tampil(c, r.data[c.k])}
                      </td>
                    ))}
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => bukaEdit(r)} aria-label="Ubah" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil size={15} /></button>
                        <button onClick={() => hapus(r)} aria-label="Hapus" className="p-2 rounded-lg hover:bg-rose-50 text-rose-600"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu (HP & tablet kecil) */}
          <div className="md:hidden space-y-3">
            {tersaring.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm break-words">{tampil(kolom[0], r.data[kolom[0].k])}</p>
                    <p className="text-xs text-slate-500">{tgl(r.tanggal) || '-'}</p>
                  </div>
                  <div className="flex shrink-0">
                    <button onClick={() => bukaEdit(r)} aria-label="Ubah" className="p-2.5 rounded-lg text-slate-600 active:bg-slate-100"><Pencil size={16} /></button>
                    <button onClick={() => hapus(r)} aria-label="Hapus" className="p-2.5 rounded-lg text-rose-600 active:bg-rose-50"><Trash2 size={16} /></button>
                  </div>
                </div>
                <dl className="space-y-1">
                  {kolom.slice(1).map((c) => (
                    r.data[c.k] ? (
                      <div key={c.k} className="flex gap-2 text-xs">
                        <dt className="w-24 shrink-0 text-slate-500">{c.l}</dt>
                        <dd className="min-w-0 break-words text-slate-800">
                          {c.t === 'textarea'
                            ? <div style={gayaPotong}>{tampil(c, r.data[c.k])}</div>
                            : tampil(c, r.data[c.k])}
                        </dd>
                      </div>
                    ) : null
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal form: lembar bawah penuh di HP, dialog di layar lebar */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setForm(null)}>
          <form onSubmit={simpan} onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="font-display font-semibold text-slate-900">{form.id ? 'Ubah' : 'Tambah'} {cfg.judul}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Tutup" className="p-2 -mr-2 text-slate-500"><X size={18} /></button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-slate-600">{cfg.tanggalLabel}</span>
                <input type="date" value={form.tanggal} onChange={(e) => setForm((p) => ({ ...p, tanggal: e.target.value }))} className={`${inputCls} mt-1`} />
              </label>
              {cfg.fields.map((fld) => {
                const v = form.data[fld.k] ?? ''
                const lebar = fld.t === 'textarea' ? 'sm:col-span-2' : ''
                return (
                  <label key={fld.k} className={`block text-sm ${lebar}`}>
                    <span className="text-slate-600">{fld.l}{fld.req && <span className="text-rose-500"> *</span>}</span>
                    {fld.t === 'textarea' ? (
                      <textarea rows={String(v).length > 300 ? 14 : 3} value={v} onChange={(e) => setField(fld.k, e.target.value)} className={`${inputCls} mt-1`} />
                    ) : fld.t === 'select' || fld.t === 'guru' ? (
                      <select value={v} onChange={(e) => setField(fld.k, e.target.value)} className={`${inputCls} mt-1`}>
                        <option value="">Pilih...</option>
                        {(fld.t === 'guru' ? guruList : fld.o).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={fld.t === 'rp' ? 'number' : fld.t}
                        inputMode={fld.t === 'number' || fld.t === 'rp' ? 'numeric' : undefined}
                        value={v} onChange={(e) => setField(fld.k, e.target.value)} className={`${inputCls} mt-1`} />
                    )}
                  </label>
                )
              })}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <button type="button" onClick={() => setForm(null)} className={`${tombol} border border-slate-200 text-slate-700`}>Batal</button>
              <button type="submit" disabled={saving} className={`${tombol} bg-blue-700 text-white disabled:opacity-60`}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Area cetak (hanya tampil saat print) */}
      <div id="cetak-area" className="hidden" style={{ color: '#000', fontSize: '11pt' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          {namaSekolah && <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{namaSekolah}</div>}
          <div style={{ fontWeight: 700, fontSize: '13pt' }}>{cfg.judul.toUpperCase()}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr>
              {['No', cfg.tanggalLabel, ...kolom.map((c) => c.l)].map((h) => (
                <th key={h} style={{ border: '1px solid #000', padding: '4px 6px', background: '#eee' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tersaring.map((r, i) => (
              <tr key={r.id}>
                <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{tgl(r.tanggal)}</td>
                {kolom.map((c) => (
                  <td key={c.k} style={{ border: '1px solid #000', padding: '4px 6px', verticalAlign: 'top', whiteSpace: 'pre-line' }}>{tampil(c, r.data[c.k])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 28, marginLeft: '65%', textAlign: 'center', pageBreakInside: 'avoid' }}>
          <div>Kepala Sekolah</div>
          <div style={{ height: 64 }} />
          <div style={{ fontWeight: 700, textDecoration: 'underline' }}>{profil?.kepala_sekolah || '........................'}</div>
        </div>
      </div>
    </Layout>
  )
}
