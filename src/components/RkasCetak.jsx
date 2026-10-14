import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X, Loader2, Pencil, Save, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

/**
 * RkasCetak — Kertas Kerja Rencana Kegiatan dan Anggaran Sekolah (RKAS)
 * Tampilan cetak A4 landscape: kop identitas, A. Penerimaan, B. Belanja
 * dengan alokasi per sumber dana (Belanja Operasi / Belanja Modal).
 *
 * Sumber data:
 *   - arkas_anggaran   (baris belanja + kolom alok_*)
 *   - arkas_penerimaan (bagian A)
 *   - profil_sekolah   (npsn, nama_sekolah, alamat, kabupaten, provinsi)
 *
 * Pakai di Keuangan.jsx:
 *   {showRkas && <RkasCetak tahun={tahun} onClose={() => setShowRkas(false)} />}
 *
 * Komponen <LisensiCetak /> di App.jsx tetap aktif otomatis saat window.print().
 */

const SUMBER = [
  { key: 'reguler', label: 'BOSP REGULER' },
  { key: 'daerah', label: 'BOSP DAERAH' },
  { key: 'afirmasi', label: 'AFIRMASI' },
  { key: 'kinerja', label: 'KINERJA' },
  { key: 'silpa', label: 'SiLPA' },
  { key: 'lainnya', label: 'BOSP LAINNYA' },
]

const KOLOM_ALOKASI = SUMBER.flatMap((s) => [`alok_${s.key}_operasi`, `alok_${s.key}_modal`])

const PENERIMAAN_DEFAULT = [
  { kode: '4.3.1.00.', uraian: 'SiLPA BOSP Reguler', tanda: '**' },
  { kode: '4.3.1.01.', uraian: 'BOSP Reguler', tanda: '' },
  { kode: '4.3.1.03.', uraian: 'BOSP Daerah', tanda: '**' },
  { kode: '4.3.1.12.', uraian: 'BOSP Kinerja', tanda: '**' },
  { kode: '4.3.1.34.', uraian: 'SiLPA BOSP Afirmasi', tanda: '**' },
  { kode: '4.3.1.35.', uraian: 'SiLPA BOSP Kinerja', tanda: '**' },
  { kode: '4.3.1.61.', uraian: 'BOSP Afirmasi', tanda: '**' },
  { kode: '4.3.1.99.', uraian: 'Lainnya', tanda: '**' },
]

const WARNA = {
  standar: '#f4cccc',
  kegiatan: '#d9f2d0',
  sub: '#fdfbd0',
  item: '#ffffff',
}

const num = (v) => Number(v) || 0
const fmt = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num(n))

const CSS_CETAK = `
  @media print {
    @page { size: A4 landscape; margin: 8mm; }
    #root { display: none !important; }
    html, body { background: #fff !important; }
    #rkas-portal { position: static !important; background: #fff !important; overflow: visible !important; padding: 0 !important; }
    #rkas-portal .rkas-noprint { display: none !important; }
    #rkas-portal .rkas-sheet { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: none !important; }
    #rkas-portal table { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #rkas-portal thead { display: table-header-group; }
    #rkas-portal tr { break-inside: avoid; page-break-inside: avoid; }
    #rkas-portal .rkas-ttd { break-inside: avoid; page-break-inside: avoid; }
  }
  .rkas-sheet { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 8pt; }
  .rkas-sheet table { border-collapse: collapse; width: 100%; }
  .rkas-sheet td, .rkas-sheet th { border: 1px solid #000; padding: 1px 3px; }
  .rkas-sheet .num { text-align: right; white-space: nowrap; }
  .rkas-sheet .ctr { text-align: center; }
  .rkas-sheet .belanja th { font-size: 7pt; }
  .rkas-sheet .belanja td { font-size: 7pt; }
  .rkas-identitas td { border: none !important; padding: 1px 4px 1px 0 !important; font-size: 8.5pt; }
`

export default function RkasCetak({ tahun, onClose }) {
  const { profil } = useAuth()
  const sekolahId = profil?.sekolah_id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [penRows, setPenRows] = useState([])
  const [sekolah, setSekolah] = useState({})

  const [editPen, setEditPen] = useState(false)
  const [formPen, setFormPen] = useState({})
  const [savingPen, setSavingPen] = useState(false)

  // Tanda tangan: tanggal default hari ini (bisa diubah di toolbar)
  const hariIni = new Date()
  const [tanggalTtd, setTanggalTtd] = useState(
    `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}-${String(hariIni.getDate()).padStart(2, '0')}`
  )
  const [editTtd, setEditTtd] = useState(false)
  const [formTtd, setFormTtd] = useState({})
  const [savingTtd, setSavingTtd] = useState(false)

  async function muat() {
    setLoading(true)
    setError('')
    try {
      // Penerimaan dipisah per sekolah (sekolah_id akun yang login)
      let qPen = supabase.from('arkas_penerimaan').select('*').eq('tahun_anggaran', String(tahun))
      if (sekolahId) qPen = qPen.eq('sekolah_id', sekolahId)

      const [rA, rP] = await Promise.all([
        supabase.from('arkas_anggaran').select('*').eq('tahun_anggaran', String(tahun)).order('no_urut', { ascending: true }),
        qPen.order('no_urut', { ascending: true }),
      ])
      if (rA.error) throw rA.error
      setRows(rA.data || [])
      // Tabel penerimaan belum dibuat/diperbarui → tetap tampilkan, nilai 0
      setPenRows(rP.error ? [] : rP.data || [])
      if (rP.error) setError('Tabel arkas_penerimaan belum sesuai. Jalankan rkas_migrasi.sql versi terbaru di Supabase.')

      let q = supabase.from('profil_sekolah').select('*')
      if (sekolahId) q = q.eq('sekolah_id', sekolahId)
      let { data: prof, error: eProf } = await q.limit(1).maybeSingle()
      if (eProf) {
        const r2 = await supabase.from('profil_sekolah').select('*').limit(1).maybeSingle()
        prof = r2.data
      }
      setSekolah(prof || {})
    } catch (e) {
      setError('Gagal memuat data: ' + (e.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun, sekolahId])

  // ---- Penerimaan (bagian A) ----
  const penerimaan = useMemo(() => {
    const hasil = PENERIMAAN_DEFAULT.map((d) => {
      const f = penRows.find((p) => p.kode === d.kode)
      return {
        kode: d.kode,
        uraian: f?.uraian || d.uraian,
        tanda: f ? f.tanda || '' : d.tanda,
        jumlah: num(f?.jumlah),
      }
    })
    penRows
      .filter((p) => !PENERIMAAN_DEFAULT.some((d) => d.kode === p.kode))
      .forEach((p) => hasil.push({ kode: p.kode, uraian: p.uraian, tanda: p.tanda || '', jumlah: num(p.jumlah) }))
    return hasil
  }, [penRows])

  const totalPenerimaan = penerimaan.reduce((a, b) => a + b.jumlah, 0)

  function bukaEditPen() {
    const f = {}
    penerimaan.forEach((p) => { f[p.kode] = p.jumlah ? String(p.jumlah) : '' })
    setFormPen(f)
    setEditPen(true)
  }

  async function simpanPen() {
    setSavingPen(true)
    const payload = penerimaan.map((p, i) => ({
      sekolah_id: sekolahId || null,
      tahun_anggaran: String(tahun),
      kode: p.kode,
      uraian: p.uraian,
      tanda: p.tanda || null,
      jumlah: num(String(formPen[p.kode] ?? '').replace(/\./g, '').replace(',', '.')),
      no_urut: i + 1,
    }))
    const { error: err } = await supabase.from('arkas_penerimaan').upsert(payload, { onConflict: 'sekolah_id,tahun_anggaran,kode' })
    setSavingPen(false)
    if (err) {
      alert('Gagal menyimpan penerimaan: ' + err.message)
      return
    }
    setEditPen(false)
    muat()
  }

  // ---- Penandatangan (default dari profil_sekolah sesuai sekolah_id) ----
  const ttd = {
    komite: sekolah.komite_nama || '',
    kepsek: sekolah.kepala_sekolah || '',
    nipKepsek: sekolah.nip_kepala_sekolah || '',
    bendahara: sekolah.bendahara_nama || '',
    nipBendahara: sekolah.bendahara_nip || '',
    tempat: sekolah.tempat_ttd || '',
  }

  const tanggalTtdTeks = useMemo(() => {
    if (!tanggalTtd) return ''
    const d = new Date(`${tanggalTtd}T00:00:00`)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  }, [tanggalTtd])

  function bukaEditTtd() {
    setFormTtd({
      tempat: ttd.tempat,
      komite: ttd.komite,
      kepsek: ttd.kepsek,
      nipKepsek: ttd.nipKepsek,
      bendahara: ttd.bendahara,
      nipBendahara: ttd.nipBendahara,
    })
    setEditTtd(true)
  }

  async function simpanTtd() {
    const kosongJadiNull = (v) => (v && String(v).trim() ? String(v).trim() : null)
    const payload = {
      tempat_ttd: kosongJadiNull(formTtd.tempat),
      komite_nama: kosongJadiNull(formTtd.komite),
      kepala_sekolah: kosongJadiNull(formTtd.kepsek),
      nip_kepala_sekolah: kosongJadiNull(formTtd.nipKepsek),
      bendahara_nama: kosongJadiNull(formTtd.bendahara),
      bendahara_nip: kosongJadiNull(formTtd.nipBendahara),
    }
    let q = supabase.from('profil_sekolah').update(payload)
    if (sekolah.id !== undefined && sekolah.id !== null) q = q.eq('id', sekolah.id)
    else if (sekolah.sekolah_id) q = q.eq('sekolah_id', sekolah.sekolah_id)
    else {
      alert('Profil sekolah tidak ditemukan, isi dulu lewat halaman Profil Sekolah.')
      return
    }
    setSavingTtd(true)
    const { data, error: err } = await q.select('*')
    setSavingTtd(false)
    if (err) {
      alert('Gagal menyimpan penandatangan: ' + err.message)
      return
    }
    if (!data || data.length === 0) {
      alert('Tidak ada baris yang berubah. Kemungkinan izin akses (RLS) di tabel profil_sekolah memblokir akun ini.')
      return
    }
    setEditTtd(false)
    muat()
  }

  // ---- Belanja (bagian B) ----
  const { baris, total } = useMemo(() => {
    const items = rows.filter((r) => r.is_item)
    const jumlahkan = (daftar, k) => daftar.reduce((a, b) => a + num(b[k]), 0)

    const hasil = rows.map((r, i) => {
      const kode = (r.kode_kegiatan || '').trim()
      const depth = kode ? kode.split('.').filter(Boolean).length : 0
      const tipe = r.is_item ? 'item' : depth <= 1 ? 'standar' : depth === 2 ? 'kegiatan' : 'sub'

      // Baris induk yang jumlahnya kosong → dijumlahkan dari rincian di bawahnya
      const turunan = !r.is_item && kode ? items.filter((it) => (it.kode_kegiatan || '').trim().startsWith(kode)) : []
      const ambil = (k) => num(r[k]) || (turunan.length ? jumlahkan(turunan, k) : 0)

      const alok = {}
      KOLOM_ALOKASI.forEach((k) => { alok[k] = ambil(k) })
      return {
        id: r.id ?? i,
        no: i + 1,
        tipe,
        kode_rekening: r.kode_rekening || '',
        kode_kegiatan: r.kode_kegiatan || '',
        uraian: r.uraian || '',
        jumlah: ambil('jumlah'),
        alok,
      }
    })

    const tot = { jumlah: jumlahkan(items, 'jumlah'), alok: {} }
    KOLOM_ALOKASI.forEach((k) => { tot.alok[k] = jumlahkan(items, k) })
    return { baris: hasil, total: tot }
  }, [rows])

  const identitas = [
    ['NPSN', sekolah.npsn],
    ['Nama Sekolah', sekolah.nama_sekolah],
    ['Alamat', sekolah.alamat],
    ['Kabupaten', sekolah.kabupaten],
    ['Provinsi', sekolah.provinsi],
  ]
  const identitasKurang = !sekolah.npsn || !sekolah.provinsi

  const konten = (
    <div
      id="rkas-portal"
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#e5e7eb', overflow: 'auto', padding: 16 }}
    >
      <style>{CSS_CETAK}</style>

      {/* Toolbar (tidak ikut tercetak) */}
      <div className="rkas-noprint" style={{ maxWidth: 1180, margin: '0 auto 12px' }}>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={() => window.print()} disabled={loading}>
            <Printer size={16} /> Cetak
          </button>
          <button className="btn-secondary" onClick={bukaEditPen} disabled={loading}>
            <Pencil size={16} /> Ubah Penerimaan
          </button>
          <button className="btn-secondary" onClick={bukaEditTtd} disabled={loading}>
            <Pencil size={16} /> Ubah Penandatangan
          </button>
          <label className="flex items-center gap-1 text-sm">
            Tanggal TTD
            <input
              type="date"
              className="input-field"
              value={tanggalTtd}
              onChange={(e) => setTanggalTtd(e.target.value)}
            />
          </label>
          <button className="btn-secondary" onClick={onClose}>
            <X size={16} /> Tutup
          </button>
          <span className="text-xs text-ink-700/60">
            Pilih ukuran A4 landscape, skala 100%, dan aktifkan "Background graphics" di dialog cetak.
          </span>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-white rounded-lg p-2 mt-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        {!loading && identitasKurang && (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-2 mt-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            NPSN atau Provinsi belum terisi di profil_sekolah (lihat rkas_migrasi.sql bagian 3).
          </div>
        )}

        {editTtd && (
          <div className="bg-white rounded-lg shadow p-4 mt-3">
            <p className="text-sm font-medium mb-1">Penandatangan RKAS</p>
            <p className="text-xs text-ink-700/60 mb-2">
              Tersimpan di Profil Sekolah milik sekolah ini, jadi otomatis dipakai setiap kali cetak.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                ['tempat', 'Tempat tanda tangan'],
                ['komite', 'Ketua Komite Sekolah'],
                ['kepsek', 'Kepala Sekolah'],
                ['nipKepsek', 'NIP Kepala Sekolah'],
                ['bendahara', 'Bendahara Sekolah'],
                ['nipBendahara', 'NIP Bendahara'],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <span className="w-40 shrink-0">{label}</span>
                  <input
                    className="input-field"
                    value={formTtd[k] ?? ''}
                    onChange={(e) => setFormTtd({ ...formTtd, [k]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button className="btn-secondary" onClick={() => setEditTtd(false)}>Batal</button>
              <button className="btn-primary" onClick={simpanTtd} disabled={savingTtd}>
                {savingTtd ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan
              </button>
            </div>
          </div>
        )}

        {editPen && (
          <div className="bg-white rounded-lg shadow p-4 mt-3">
            <p className="text-sm font-medium mb-2">Ubah Penerimaan Tahun Anggaran {tahun}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {penerimaan.map((p) => (
                <label key={p.kode} className="flex items-center gap-2 text-sm">
                  <span className="w-48 shrink-0">{p.kode} {p.uraian}</span>
                  <input
                    className="input-field"
                    inputMode="numeric"
                    placeholder="0"
                    value={formPen[p.kode] ?? ''}
                    onChange={(e) => setFormPen({ ...formPen, [p.kode]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button className="btn-secondary" onClick={() => setEditPen(false)}>Batal</button>
              <button className="btn-primary" onClick={simpanPen} disabled={savingPen}>
                {savingPen ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lembar RKAS */}
      <div
        className="rkas-sheet"
        style={{ background: '#fff', maxWidth: 1180, margin: '0 auto', padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,.2)' }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Memuat data...</div>
        ) : (
          <>
            <div className="ctr" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: '11pt' }}>KERTAS KERJA RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS)</div>
              <div style={{ fontWeight: 700, fontSize: '9pt' }}>TAHUN ANGGARAN : {tahun}</div>
            </div>

            <table className="rkas-identitas" style={{ width: 'auto', marginBottom: 14 }}>
              <tbody>
                {identitas.map(([label, nilai]) => (
                  <tr key={label}>
                    <td style={{ width: 90 }}>{label}</td>
                    <td style={{ width: 12 }}>:</td>
                    <td>{nilai || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* A. PENERIMAAN */}
            <div style={{ fontWeight: 700, fontSize: '8.5pt' }}>A. PENERIMAAN</div>
            <div style={{ fontWeight: 700, fontSize: '8.5pt', margin: '4px 0' }}>Sumber Dana :</div>
            <table style={{ width: '55%', marginBottom: 2 }}>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>No. Kode</th>
                  <th>Penerimaan</th>
                  <th style={{ width: 120 }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {penerimaan.map((p) => (
                  <tr key={p.kode}>
                    <td className="ctr">{p.kode}</td>
                    <td>{p.uraian}{p.tanda ? ` ${p.tanda}` : ''}</td>
                    <td className="num">{fmt(p.jumlah)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={2}>Total Penerimaan</td>
                  <td className="num">{fmt(totalPenerimaan)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '7pt', marginBottom: 12 }}>
              * belum pengesahan, ** belum aktivasi anggaran, ~ penerimaan dan belanja tidak sesuai
            </div>

            {/* B. BELANJA */}
            <div style={{ fontWeight: 700, fontSize: '8.5pt', marginBottom: 4 }}>B. BELANJA</div>
            <table className="belanja">
              <thead>
                <tr>
                  <th rowSpan={3} style={{ width: 24 }}>No.<br />Urut</th>
                  <th rowSpan={3} style={{ width: 82 }}>Kode Rekening</th>
                  <th rowSpan={3} style={{ width: 52 }}>Kode<br />Kegiatan</th>
                  <th rowSpan={3}>Uraian Kegiatan</th>
                  <th rowSpan={3} style={{ width: 62 }}>Jumlah</th>
                  <th colSpan={12}>Sumber Dana dan Alokasi Anggaran</th>
                </tr>
                <tr>
                  {SUMBER.map((s) => (
                    <th key={s.key} colSpan={2}>{s.label}</th>
                  ))}
                </tr>
                <tr>
                  {SUMBER.flatMap((s) => [
                    <th key={`${s.key}o`} style={{ fontSize: '6pt', width: 46 }}>Belanja<br />Operasi</th>,
                    <th key={`${s.key}m`} style={{ fontSize: '6pt', width: 46 }}>Belanja<br />Modal</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {baris.length === 0 && (
                  <tr>
                    <td colSpan={17} className="ctr" style={{ padding: 14 }}>
                      Belum ada data ARKAS tahun anggaran {tahun}.
                    </td>
                  </tr>
                )}
                {baris.map((b) => {
                  const induk = b.tipe !== 'item'
                  return (
                    <tr key={b.id} style={{ background: WARNA[b.tipe], fontWeight: induk ? 700 : 400 }}>
                      <td className="ctr">{b.no}</td>
                      <td>{b.kode_rekening}</td>
                      <td>{b.kode_kegiatan}</td>
                      <td style={{ fontStyle: induk ? 'normal' : 'italic' }}>{b.uraian}</td>
                      <td className="num">{fmt(b.jumlah)}</td>
                      {KOLOM_ALOKASI.map((k) => (
                        <td key={k} className="num">{fmt(b.alok[k])}</td>
                      ))}
                    </tr>
                  )
                })}
                {baris.length > 0 && (
                  <tr style={{ fontWeight: 700, background: '#f3f4f6' }}>
                    <td colSpan={4}>Total Belanja</td>
                    <td className="num">{fmt(total.jumlah)}</td>
                    {KOLOM_ALOKASI.map((k) => (
                      <td key={k} className="num">{fmt(total.alok[k])}</td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>

            {/* Tanda tangan: Komite | Kepala Sekolah | Bendahara */}
            <div className="rkas-ttd" style={{ display: 'flex', marginTop: 22, fontSize: '8.5pt' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 14 }} />
                <div style={{ fontWeight: 700 }}>Komite Sekolah</div>
                <div style={{ height: 56 }} />
                <div style={{ display: 'inline-block', minWidth: '70%', borderBottom: '1px solid #000', fontWeight: 700 }}>
                  {ttd.komite || ' '}
                </div>
              </div>

              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 14 }} />
                <div style={{ fontWeight: 700 }}>Kepala Sekolah</div>
                <div style={{ height: 56 }} />
                <div style={{ display: 'inline-block', minWidth: '55%', borderBottom: '1px solid #000', fontWeight: 700 }}>
                  {ttd.kepsek || ' '}
                </div>
                <div>NIP: {ttd.nipKepsek || '-'}</div>
              </div>

              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 14 }}>
                  {[ttd.tempat, tanggalTtdTeks].filter(Boolean).join(', ')}
                </div>
                <div style={{ fontWeight: 700 }}>Bendahara Sekolah</div>
                <div style={{ height: 56 }} />
                <div style={{ display: 'inline-block', minWidth: '55%', borderBottom: '1px solid #000', fontWeight: 700 }}>
                  {ttd.bendahara || ' '}
                </div>
                <div>NIP: {ttd.nipBendahara || '-'}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(konten, document.body)
}
