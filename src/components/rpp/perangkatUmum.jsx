import { useEffect, useState } from 'react'
import { Download, Printer, Loader2 } from 'lucide-react'
import { Packer } from 'docx'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'

// Bagian bersama untuk tab LKPD, Kisi-Kisi, dan Evaluasi.
// Letakkan di: src/components/rpp/perangkatUmum.jsx

const KUNCI_RPP = 'simak_draft_susun_rpp'
const LOGO_BUCKET_SEKOLAH = 'profil-sekolah'

export const hariIni = () =>
  new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

export const kosong = (s) => !String(s || '').trim()

// ---------- Logo & kop (sama seperti KopSurat.jsx / SusunRppTab) ----------
function urlLogo(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return supabase.storage.from(LOGO_BUCKET_SEKOLAH).getPublicUrl(path).data.publicUrl
}

async function ambilLogo(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    const type =
      buf[0] === 0x89 && buf[1] === 0x50 ? 'png' : buf[0] === 0xff && buf[1] === 0xd8 ? 'jpg' : buf[0] === 0x47 && buf[1] === 0x49 ? 'gif' : null
    if (!type) return null
    const mime = type === 'jpg' ? 'image/jpeg' : `image/${type}`
    let w = 70
    let h = 70
    try {
      const bmp = await createImageBitmap(new Blob([buf], { type: mime }))
      const skala = Math.min(70 / bmp.width, 70 / bmp.height)
      w = Math.round(bmp.width * skala)
      h = Math.round(bmp.height * skala)
      bmp.close?.()
    } catch {
      /* ukuran bawaan */
    }
    let bin = ''
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000))
    return { data: buf, type, w, h, dataUrl: `data:${mime};base64,${btoa(bin)}` }
  } catch {
    return null
  }
}

// ---------- Data dasar: diambil dari draft Susun RPP, lalu dilengkapi dari profil ----------
function bacaDasarRpp() {
  let r = {}
  try {
    r = JSON.parse(localStorage.getItem(KUNCI_RPP) || '{}')
  } catch {
    r = {}
  }
  return {
    satuan: r.satuan || '',
    mapel: r.mapel || '',
    kelas: r.kelas || '',
    semester: r.semester || 'Ganjil',
    tahunAjaran: r.tahunAjaran || '',
    materi: r.materi || '',
    tujuan: r.tujuan || '',
    penyusun: r.penyusun || '',
    nipPenyusun: r.nipPenyusun || '',
    kepsek: r.kepsek || '',
    nipKepsek: r.nipKepsek || '',
    kota: r.kota || '',
    tanggal: hariIni(),
  }
}

export function useDasar() {
  const { sekolahId, profil } = useAuth()
  const [dasar, setDasar] = useState(bacaDasarRpp)
  const [kop, setKop] = useState(null)
  const [pakaiKop, setPakaiKop] = useState(true)

  useEffect(() => {
    let batal = false
    async function ambil() {
      let q = supabase.from('profil_sekolah').select('*')
      if (sekolahId) q = q.eq('sekolah_id', sekolahId)
      const { data: sk } = await q.limit(1).maybeSingle()

      let nipGuru = ''
      if (profil?.guru_id) {
        const { data: g } = await supabase.from('guru').select('*').eq('id', profil.guru_id).maybeSingle()
        nipGuru = g?.nip || ''
      }
      if (batal) return

      const kota = (sk?.kabupaten || '').replace(/^\s*(kabupaten|kab\.?|kota)\s+/i, '').trim()
      setDasar((p) => ({
        ...p,
        satuan: p.satuan || sk?.nama_sekolah || '',
        kepsek: p.kepsek || sk?.kepala_sekolah || '',
        nipKepsek: p.nipKepsek || sk?.nip_kepala_sekolah || '',
        kota: p.kota || kota,
        penyusun: p.penyusun || profil?.nama_lengkap || profil?.nama || '',
        nipPenyusun: p.nipPenyusun || nipGuru,
      }))

      if (sk?.nama_sekolah) {
        const [logoSekolah, logoKab] = await Promise.all([
          ambilLogo(urlLogo(sk.logo_path)),
          ambilLogo(urlLogo(sk.logo_kabupaten_path)),
        ])
        if (batal) return
        setKop({
          dinas: sk.dinas_pendidikan || '',
          kabupaten: sk.kabupaten || '',
          nama: sk.nama_sekolah,
          kecamatan: sk.kecamatan || '',
          alamat: sk.alamat || '',
          kontak: [sk.email && `Email: ${sk.email}`, sk.telepon && `Telp/HP: ${sk.telepon}`].filter(Boolean).join('  |  '),
          kiri: logoKab || logoSekolah,
          kanan: logoKab ? logoSekolah : null,
        })
      }
    }
    ambil().catch(() => {})
    return () => {
      batal = true
    }
  }, [profil?.guru_id, sekolahId])

  return {
    dasar,
    setDasar,
    kop,
    pakaiKop,
    setPakaiKop,
    // data siap dipakai pembuat dokumen
    dokumenDasar: () => ({ ...dasar, kop: pakaiKop ? kop : null }),
  }
}

// ---------- Draft isian tiap tab (tersimpan di perangkat) ----------
export function useDraft(kunci, awal) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(kunci)
      return raw ? { ...awal, ...JSON.parse(raw) } : awal
    } catch {
      return awal
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(kunci, JSON.stringify(v))
    } catch {
      /* abaikan */
    }
  }, [kunci, v])
  return [v, setV]
}

// ---------- Komponen tampilan ----------
export function Rekom({ opsi, onPilih, teks = 'Rekomendasi' }) {
  return (
    <select
      className="text-[11px] rounded-md bg-sage-500/10 text-sage-500 font-medium px-1.5 py-0.5 border-0 max-w-[60%] cursor-pointer"
      value=""
      onChange={(e) => {
        if (e.target.value === '') return
        onPilih(opsi[Number(e.target.value)])
      }}
    >
      <option value="">✨ {teks}</option>
      {opsi.map((o, i) => (
        <option key={i} value={i}>
          {typeof o === 'string' ? o : o.label}
        </option>
      ))}
    </select>
  )
}

export function Field({ label, children, full, rekom }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-ink-700/70">{label}</span>
        {rekom}
      </div>
      {children}
    </div>
  )
}

// Kartu identitas dokumen (terisi dari draft Susun RPP dan Profil Sekolah)
export function IdentitasDasar({ h }) {
  const { dasar, setDasar, kop, pakaiKop, setPakaiKop } = h
  const set = (k) => (e) => setDasar((p) => ({ ...p, [k]: e.target.value }))
  return (
    <details className="card p-6" open={kosong(dasar.mapel) || kosong(dasar.materi)}>
      <summary className="font-display text-lg font-semibold cursor-pointer">Identitas Dokumen</summary>
      <p className="text-[11px] text-ink-700/40 mt-1 mb-3">
        Terisi otomatis dari draft tab Susun RPP dan Profil Sekolah. Ubah di sini bila perlu.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Satuan Pendidikan">
          <input className="input-field" value={dasar.satuan} onChange={set('satuan')} />
        </Field>
        <Field label="Mata Pelajaran">
          <input className="input-field" value={dasar.mapel} onChange={set('mapel')} />
        </Field>
        <Field label="Kelas">
          <input className="input-field" value={dasar.kelas} onChange={set('kelas')} />
        </Field>
        <Field label="Semester">
          <select className="input-field" value={dasar.semester} onChange={set('semester')}>
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </Field>
        <Field label="Tahun Ajaran">
          <input className="input-field" placeholder="2026/2027" value={dasar.tahunAjaran} onChange={set('tahunAjaran')} />
        </Field>
        <Field label="Materi Pokok">
          <input className="input-field" value={dasar.materi} onChange={set('materi')} />
        </Field>
        <Field label="Tujuan Pembelajaran (satu baris satu tujuan)" full>
          <textarea className="input-field" rows={3} value={dasar.tujuan} onChange={set('tujuan')} />
        </Field>
        <Field label="Nama Penyusun (Guru)">
          <input className="input-field" value={dasar.penyusun} onChange={set('penyusun')} />
        </Field>
        <Field label="NIP Penyusun">
          <input className="input-field" value={dasar.nipPenyusun} onChange={set('nipPenyusun')} />
        </Field>
        <Field label="Nama Kepala Sekolah">
          <input className="input-field" value={dasar.kepsek} onChange={set('kepsek')} />
        </Field>
        <Field label="NIP Kepala Sekolah">
          <input className="input-field" value={dasar.nipKepsek} onChange={set('nipKepsek')} />
        </Field>
        <Field label="Kota">
          <input className="input-field" value={dasar.kota} onChange={set('kota')} />
        </Field>
        <Field label="Tanggal">
          <input className="input-field" value={dasar.tanggal} onChange={set('tanggal')} />
        </Field>
      </div>
      <label className="flex items-start gap-2 text-xs text-ink-700 mt-3 rounded-xl bg-ink-900/[0.04] px-3 py-2">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={pakaiKop}
          disabled={!kop}
          onChange={(e) => setPakaiKop(e.target.checked)}
        />
        <span>
          Sertakan kop surat
          <span className="text-ink-700/50">
            {kop ? ` — ${kop.nama}` : ' — data Profil Sekolah belum termuat atau belum diisi'}
          </span>
        </span>
      </label>
    </details>
  )
}

// ---------- Keluaran: Word dan cetak PDF ----------
export async function unduhDocx(doc, namaFile) {
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function cetakHtml(html, css, judul) {
  const w = window.open('', '_blank')
  if (!w) {
    alert('Pop-up diblokir browser. Izinkan pop-up lalu coba lagi.')
    return
  }
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${judul}</title><style>${css}</style></head><body>${html}</body></html>`
  )
  w.document.close()
  w.focus()
  const tunggu = Promise.all(
    [...w.document.images].map((im) => (im.complete ? null : new Promise((r) => { im.onload = im.onerror = r })))
  )
  Promise.race([tunggu, new Promise((r) => setTimeout(r, 2500))]).then(() => setTimeout(() => w.print(), 200))
}

export const namaBerkas = (awalan, mapel, materi) =>
  `${awalan}_${(mapel || 'Mapel').replace(/\s+/g, '_')}_${(materi || 'Materi').slice(0, 30).replace(/[^\w]+/g, '_')}.docx`

export function TombolOutput({ siap, onWord, onPdf, onKosongkan, pesan }) {
  const [busy, setBusy] = useState(false)
  async function word() {
    setBusy(true)
    try {
      await onWord()
    } catch (err) {
      alert('Gagal membuat file Word: ' + err.message)
    }
    setBusy(false)
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={word} disabled={!siap || busy} className="btn-primary">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Unduh Word
      </button>
      <button
        type="button"
        onClick={onPdf}
        disabled={!siap}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-ink-700 bg-ink-900/[0.05] disabled:opacity-50"
      >
        <Printer size={16} /> Cetak / Simpan PDF
      </button>
      {onKosongkan && (
        <button type="button" onClick={onKosongkan} className="text-xs text-ink-700/50 px-2">
          Kosongkan
        </button>
      )}
      {!siap && <span className="text-xs text-ink-700/40">{pesan || 'Isi Mata Pelajaran dan Materi Pokok dulu.'}</span>}
    </div>
  )
}
