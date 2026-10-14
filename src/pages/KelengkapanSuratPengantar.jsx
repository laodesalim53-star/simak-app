import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import KopSurat from '../components/KopSurat' // sesuaikan path jika KopSurat ada di folder lain

// ============================================================
// PENGATURAN — sesuaikan bila nama tabel/kolom di Supabase berbeda
// ============================================================
// Tabel daftar guru (difilter per tenant lewat kolom sekolah_id).
const TABEL_GURU = 'guru'

// Kolom-kolom yang dicoba (urut) untuk membaca data guru dari baris tabel.
function bacaGuru(g) {
  return {
    id: String(g.id),
    nama: g.nama ?? g.nama_guru ?? g.nama_lengkap ?? g.name ?? '',
    nip: g.nip ?? '',
    nuptk: g.nuptk ?? '',
  }
}

// ============================================================
// JENIS SURAT — tinggal tambah satu objek di sini untuk menambah tab baru.
//   tujuan(kab)  -> isi baris "Yth" (kab = "Kabupaten ...", boleh kosong)
//   pokok        -> teks "Pokok isi surat" di tabel
//   keterangan   -> teks kolom "Keterangan"
// ============================================================
const KE_BKD = (kab) => `Kepala Badan Kepegawaian Daerah (BKD)${kab ? `\n${kab}` : ''}`
const KE_DINAS = (kab) => `Kepala Dinas Pendidikan dan Kebudayaan${kab ? `\n${kab}` : ''}`
const TERIMA = 'Dengan hormat, kiranya dapat diterima, terima kasih.'

const JENIS_SURAT = [
  { key: 'berkala', label: 'Kenaikan Berkala', pokok: 'Usul Kenaikan Gaji Berkala.', tujuan: KE_BKD, keterangan: TERIMA },
  { key: 'pangkat', label: 'Kenaikan Pangkat', pokok: 'Usul Kenaikan Pangkat.', tujuan: KE_BKD, keterangan: TERIMA },
  { key: 'pensiun', label: 'Pensiun', pokok: 'Usul Pensiun (Batas Usia Pensiun).', tujuan: KE_BKD, keterangan: TERIMA },
  { key: 'mutasi', label: 'Mutasi / Pindah Tugas', pokok: 'Usul Mutasi / Pindah Tugas.', tujuan: KE_DINAS, keterangan: TERIMA },
  { key: 'cuti', label: 'Cuti', pokok: 'Usul Cuti.', tujuan: KE_DINAS, keterangan: TERIMA },
  { key: 'lainnya', label: 'Lainnya', pokok: '', tujuan: KE_DINAS, keterangan: TERIMA },
]

// ============================================================
// Util
// ============================================================
const KUNCI_TTD = 'surat_pengantar_ttd'

function bacaTtd() {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_TTD) || '{}') || {}
  } catch {
    return {}
  }
}

function formatKabupaten(raw) {
  if (!raw) return ''
  let s = String(raw).replace(/^\s*pemerintah\s+/i, '').trim()
  const kota = /^kota\s+/i.test(s)
  if (!kota) s = s.replace(/^(kabupaten|kab\.?)\s+/i, '').trim()
  if (!s) return ''
  if (s === s.toUpperCase()) s = s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  return kota ? s : `Kabupaten ${s}`
}

function formatTanggal(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function hariIni() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

let urutBaris = 0
function barisBaru() {
  urutBaris += 1
  return { id: urutBaris, guruId: '', manual: { nama: '', nip: '', nuptk: '' }, banyaknya: '1 Berkas' }
}

function ambilGuruBaris(baris, daftarGuru) {
  if (baris.guruId === '__manual') return baris.manual
  return daftarGuru.find((g) => g.id === baris.guruId) || null
}

// ============================================================
// Lembar surat (dipakai untuk pratinjau layar DAN salinan cetak)
// ============================================================
const sel = { border: '1px solid #000', padding: '2mm 3mm' }

function LembarSurat({ layar, jenis, nomor, tujuan, pokok, keterangan, baris, daftarGuru, tempat, tanggal, kepala, nipKepala }) {
  return (
    <div
      style={{
        width: '210mm',
        minHeight: layar ? '297mm' : undefined,
        boxSizing: 'border-box',
        padding: '15mm 20mm 22mm',
        background: '#fff',
        color: '#000',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '12pt',
        lineHeight: 1.35,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <KopSurat />

      <div style={{ textAlign: 'center', marginTop: '6mm' }}>
        <p style={{ fontWeight: 700, textDecoration: 'underline', letterSpacing: '0.02em' }}>SURAT PENGANTAR</p>
        <p style={{ fontWeight: 700 }}>Nomor: {nomor || '........ / ...... / ' + new Date().getFullYear()}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '22mm 4mm 1fr', marginTop: '10mm' }}>
        <span style={{ fontWeight: 700 }}>Yth</span>
        <span style={{ fontWeight: 700 }}>:</span>
        <span style={{ fontWeight: 700, whiteSpace: 'pre-line' }}>{tujuan}</span>
      </div>

      <p style={{ fontWeight: 700, marginTop: '6mm', marginBottom: '2mm' }}>Dengan Hormat,</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '9%' }} />
          <col style={{ width: '41%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '30%' }} />
        </colgroup>
        <thead>
          <tr style={{ textAlign: 'center', fontWeight: 700 }}>
            <th style={sel}>NO</th>
            <th style={sel}>POKOK ISI SURAT</th>
            <th style={sel}>BANYAKNYA</th>
            <th style={sel}>KETERANGAN</th>
          </tr>
        </thead>
        <tbody>
          {baris.map((b, i) => {
            const g = ambilGuruBaris(b, daftarGuru)
            return (
              <tr key={b.id} style={{ height: baris.length === 1 ? '38mm' : '24mm' }}>
                <td style={{ ...sel, textAlign: 'center', verticalAlign: 'middle', fontWeight: 700 }}>{i + 1}</td>
                <td style={{ ...sel, verticalAlign: 'top' }}>
                  <div style={{ whiteSpace: 'pre-line' }}>{pokok}</div>
                  {g && g.nama && (
                    <div style={{ fontSize: '10.5pt', lineHeight: 1.3, marginTop: '1mm' }}>
                      <div>
                        a.n. <b>{g.nama.toUpperCase()}</b>
                      </div>
                      {g.nip && <div>NIP &nbsp;&nbsp;&nbsp;&nbsp;: {g.nip}</div>}
                      {g.nuptk && <div>NUPTK : {g.nuptk}</div>}
                    </div>
                  )}
                </td>
                <td style={{ ...sel, textAlign: 'center', verticalAlign: 'middle', fontWeight: 700 }}>{b.banyaknya}</td>
                {i === 0 && (
                  <td rowSpan={baris.length} style={{ ...sel, verticalAlign: 'top', whiteSpace: 'pre-line' }}>
                    {keterangan}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '14mm', marginLeft: 'auto', width: '85mm', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '30mm 3mm 1fr' }}>
          <span>Ditetapkan di</span>
          <span>:</span>
          <span>{tempat}</span>
          <span>Pada tanggal</span>
          <span>:</span>
          <span>{formatTanggal(tanggal)}</span>
        </div>
        <p style={{ marginTop: '3mm' }}>Kepala Sekolah,</p>
        <div style={{ height: '24mm' }} />
        <p style={{ fontWeight: 700, textDecoration: 'underline' }}>{kepala || '.............................'}</p>
        <p>NIP. {nipKepala || '.............................'}</p>
      </div>
    </div>
  )
}

// ============================================================
// Halaman
// ============================================================
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function KelengkapanSuratPengantar() {
  // Ambil id sekolah dari AuthContext. Dicoba dua cara supaya aman:
  // 1) sekolahId langsung, 2) profil.sekolah_id (dipakai di App.jsx).
  const { sekolahId: sekolahIdCtx, profil } = useAuth()
  const sekolahId = sekolahIdCtx ?? profil?.sekolah_id

  const [jenisKey, setJenisKey] = useState(JENIS_SURAT[0].key)
  const jenis = JENIS_SURAT.find((j) => j.key === jenisKey) || JENIS_SURAT[0]

  const [daftarGuru, setDaftarGuru] = useState([])
  const [galatGuru, setGalatGuru] = useState('')
  const [kabupaten, setKabupaten] = useState('')
  const [kecamatan, setKecamatan] = useState('')

  const [nomor, setNomor] = useState('')
  const [tanggal, setTanggal] = useState(hariIni)
  const [baris, setBaris] = useState(() => [barisBaru()])

  // Isian teks yang boleh diubah manual; null = pakai bawaan jenis surat.
  const [tujuanKustom, setTujuanKustom] = useState(null)
  const [pokokKustom, setPokokKustom] = useState(null)
  const [keteranganKustom, setKeteranganKustom] = useState(null)

  const ttdTersimpan = useMemo(bacaTtd, [])
  const [tempatKustom, setTempatKustom] = useState(ttdTersimpan.tempat ?? null)
  const [kepala, setKepala] = useState(ttdTersimpan.kepala ?? '')
  const [nipKepala, setNipKepala] = useState(ttdTersimpan.nipKepala ?? '')

  // Daftar guru + kabupaten/kecamatan dari profil sekolah
  useEffect(() => {
    if (!sekolahId) return
    let batal = false

    supabase
      .from(TABEL_GURU)
      .select('*')
      .eq('sekolah_id', sekolahId)
      .then(({ data, error }) => {
        if (batal) return
        if (error) {
          console.error('KelengkapanSuratPengantar: gagal memuat daftar guru:', error)
          setGalatGuru(`Daftar guru gagal dimuat dari tabel "${TABEL_GURU}". Anda tetap bisa mengetik data guru manual.`)
          setDaftarGuru([])
          return
        }
        setGalatGuru('')
        setDaftarGuru(
          (data || [])
            .map(bacaGuru)
            .filter((g) => g.nama)
            .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
        )
      })

    supabase
      .from('profil_sekolah')
      .select('kabupaten, kecamatan')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => {
        if (batal || !data) return
        setKabupaten(formatKabupaten(data.kabupaten))
        setKecamatan(data.kecamatan || '')
      })

    return () => {
      batal = true
    }
  }, [sekolahId])

  // Simpan data penanda tangan agar tidak perlu diketik ulang
  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_TTD, JSON.stringify({ tempat: tempatKustom, kepala, nipKepala }))
    } catch {
      /* abaikan */
    }
  }, [tempatKustom, kepala, nipKepala])

  const tujuan = tujuanKustom ?? jenis.tujuan(kabupaten)
  const pokok = pokokKustom ?? jenis.pokok
  const keterangan = keteranganKustom ?? jenis.keterangan
  const tempat = tempatKustom ?? kecamatan

  function pilihJenis(key) {
    setJenisKey(key)
    setTujuanKustom(null)
    setPokokKustom(null)
    setKeteranganKustom(null)
  }

  function ubahBaris(id, patch) {
    setBaris((lama) => lama.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  const propsLembar = { jenis, nomor, tujuan, pokok, keterangan, baris, daftarGuru, tempat, tanggal, kepala, nipKepala }

  return (
    <div className="p-4 lg:p-6">
      <style>{`
        .sp-print-root { display: none; }
        @media print {
          @page { size: A4; margin: 0; }
          body > *:not(.sp-print-root) { display: none !important; }
          .sp-print-root { display: block !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Kelengkapan Surat Pengantar</h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Cetak
        </button>
      </div>

      {/* Tab jenis surat */}
      <div role="tablist" aria-label="Jenis surat pengantar" className="mt-4 flex flex-wrap gap-1 border-b border-slate-200">
        {JENIS_SURAT.map((j) => {
          const aktif = j.key === jenisKey
          return (
            <button
              key={j.key}
              type="button"
              role="tab"
              aria-selected={aktif}
              onClick={() => pilihJenis(j.key)}
              className={`-mb-px rounded-t-md border px-4 py-2 text-sm font-medium transition-colors ${
                aktif
                  ? 'border-slate-200 border-b-white bg-white text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {j.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Form */}
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nomor surat">
              <input className={inputCls} value={nomor} onChange={(e) => setNomor(e.target.value)} placeholder="038 / 19 / 2026" />
            </Field>
            <Field label="Tanggal surat">
              <input type="date" className={inputCls} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </Field>
          </div>

          <Field label="Tujuan surat (Yth)">
            <textarea rows={2} className={inputCls} value={tujuan} onChange={(e) => setTujuanKustom(e.target.value)} />
          </Field>

          <Field label="Pokok isi surat">
            <textarea
              rows={2}
              className={inputCls}
              value={pokok}
              onChange={(e) => setPokokKustom(e.target.value)}
              placeholder="Tuliskan pokok isi surat"
            />
          </Field>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Guru</p>
            {galatGuru && <p className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-800">{galatGuru}</p>}
            <div className="space-y-3">
              {baris.map((b, i) => (
                <div key={b.id} className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Baris {i + 1}</span>
                    {baris.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setBaris((lama) => lama.filter((x) => x.id !== b.id))}
                        className="text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <select className={inputCls} value={b.guruId} onChange={(e) => ubahBaris(b.id, { guruId: e.target.value })}>
                    <option value="">— Pilih guru —</option>
                    {daftarGuru.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama}
                        {g.nip ? ` (${g.nip})` : ''}
                      </option>
                    ))}
                    <option value="__manual">Ketik manual…</option>
                  </select>

                  {b.guruId === '__manual' && (
                    <div className="space-y-2">
                      <input
                        className={inputCls}
                        placeholder="Nama lengkap"
                        value={b.manual.nama}
                        onChange={(e) => ubahBaris(b.id, { manual: { ...b.manual, nama: e.target.value } })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className={inputCls}
                          placeholder="NIP"
                          value={b.manual.nip}
                          onChange={(e) => ubahBaris(b.id, { manual: { ...b.manual, nip: e.target.value } })}
                        />
                        <input
                          className={inputCls}
                          placeholder="NUPTK"
                          value={b.manual.nuptk}
                          onChange={(e) => ubahBaris(b.id, { manual: { ...b.manual, nuptk: e.target.value } })}
                        />
                      </div>
                    </div>
                  )}

                  <Field label="Banyaknya">
                    <input className={inputCls} value={b.banyaknya} onChange={(e) => ubahBaris(b.id, { banyaknya: e.target.value })} />
                  </Field>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setBaris((lama) => [...lama, barisBaru()])}
              className="mt-2 text-sm font-medium text-blue-700 hover:underline"
            >
              + Tambah baris guru
            </button>
          </div>

          <Field label="Keterangan">
            <textarea rows={3} className={inputCls} value={keterangan} onChange={(e) => setKeteranganKustom(e.target.value)} />
          </Field>

          <div className="space-y-3 border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Penanda tangan</p>
            <Field label="Ditetapkan di">
              <input className={inputCls} value={tempat} onChange={(e) => setTempatKustom(e.target.value)} />
            </Field>
            <Field label="Nama Kepala Sekolah">
              <input className={inputCls} value={kepala} onChange={(e) => setKepala(e.target.value)} placeholder="Nama, gelar" />
            </Field>
            <Field label="NIP Kepala Sekolah">
              <input className={inputCls} value={nipKepala} onChange={(e) => setNipKepala(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Pratinjau */}
        <div className="overflow-auto rounded-lg bg-slate-200 p-4">
          <div className="mx-auto w-fit shadow-lg">
            <LembarSurat layar {...propsLembar} />
          </div>
        </div>
      </div>

      {/* Salinan khusus cetak, di luar #root supaya halaman lain tidak ikut tercetak */}
      {createPortal(
        <div className="sp-print-root">
          <LembarSurat {...propsLembar} />
        </div>,
        document.body
      )}
    </div>
  )
}
