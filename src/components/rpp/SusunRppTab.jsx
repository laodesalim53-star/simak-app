import { useEffect, useMemo, useState } from 'react'
import { Download, Printer, Loader2, RotateCcw } from 'lucide-react'
import { buatRppDocxFile, buatRppHtml, CSS_CETAK_RPP } from '../../lib/rppDokumen'

const DIMENSI = [
  'Beriman, bertakwa kepada Tuhan Yang Maha Esa, dan berakhlak mulia',
  'Berkebinekaan global',
  'Bergotong royong',
  'Mandiri',
  'Bernalar kritis',
  'Kreatif',
]

const KUNCI_DRAFT = 'simak_draft_susun_rpp'

const hariIni = () =>
  new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

const KOSONG = {
  satuan: '',
  mapel: '',
  kelas: '',
  fase: '',
  semester: 'Ganjil',
  tahunAjaran: '',
  alokasi: '',
  materi: '',
  penyusun: '',
  nipPenyusun: '',
  kepsek: '',
  nipKepsek: '',
  kota: '',
  tanggal: hariIni(),
  capaian: '',
  tujuan: '',
  profil: [],
  model: '',
  media: '',
  sumber: '',
  pendahuluan: '',
  inti: '',
  penutup: '',
  asesmen: '',
}

function bacaDraft() {
  try {
    const raw = localStorage.getItem(KUNCI_DRAFT)
    return raw ? { ...KOSONG, ...JSON.parse(raw) } : KOSONG
  } catch {
    return KOSONG
  }
}

function Field({ label, children, full }) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-ink-700/70 mb-1 block">{label}</span>
      {children}
    </label>
  )
}

// awal   : data kiriman dari halaman Silabus (location.state.dariSilabus), boleh kosong
// profil : profil pengguna dari useAuth (dipakai untuk mengisi nama penyusun)
export default function SusunRppTab({ awal, profil }) {
  const [d, setD] = useState(bacaDraft)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setD((p) => ({ ...p, [k]: e.target.value }))

  // Isi otomatis dari Silabus
  useEffect(() => {
    if (!awal) return
    setD((p) => ({
      ...p,
      mapel: awal.mata_pelajaran || p.mapel,
      kelas: awal.kelas || p.kelas,
      fase: awal.fase || p.fase,
      semester: awal.semester || p.semester,
      tahunAjaran: awal.tahun_ajaran || p.tahunAjaran,
      alokasi: awal.alokasi_waktu || p.alokasi,
      materi: awal.materi_pokok || p.materi,
      capaian: awal.capaian_pembelajaran || p.capaian,
      tujuan: awal.tujuan_pembelajaran || p.tujuan,
    }))
  }, [awal])

  // Nama penyusun dari akun yang login (hanya kalau masih kosong)
  useEffect(() => {
    const nama = profil?.nama_lengkap || profil?.nama || ''
    if (nama) setD((p) => (p.penyusun ? p : { ...p, penyusun: nama }))
  }, [profil])

  // Simpan draft otomatis di perangkat supaya tidak hilang kalau halaman tertutup
  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_DRAFT, JSON.stringify(d))
    } catch {
      /* abaikan */
    }
  }, [d])

  const siap = useMemo(() => d.mapel.trim() && d.materi.trim(), [d.mapel, d.materi])
  const namaFile = `RPP_${(d.mapel || 'Mapel').replace(/\s+/g, '_')}_${(d.materi || 'Materi')
    .slice(0, 30)
    .replace(/[^\w]+/g, '_')}.docx`

  function toggleDimensi(nama) {
    setD((p) => ({
      ...p,
      profil: p.profil.includes(nama) ? p.profil.filter((x) => x !== nama) : [...p.profil, nama],
    }))
  }

  async function unduhWord() {
    setBusy(true)
    try {
      const file = await buatRppDocxFile(d, namaFile)
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = namaFile
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      alert('Gagal membuat file Word: ' + err.message)
    }
    setBusy(false)
  }

  function cetakPdf() {
    const w = window.open('', '_blank')
    if (!w) {
      alert('Pop-up diblokir browser. Izinkan pop-up lalu coba lagi.')
      return
    }
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>RPP ${d.mapel}</title>` +
        `<style>${CSS_CETAK_RPP}</style></head><body>${buatRppHtml(d)}</body></html>`
    )
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  function ulang() {
    if (!confirm('Kosongkan semua isian RPP?')) return
    setD({ ...KOSONG, tanggal: hariIni(), penyusun: profil?.nama_lengkap || profil?.nama || '' })
  }

  const area = (k, label, rows = 4, full = true) => (
    <Field label={label} full={full}>
      <textarea className="input-field" rows={rows} value={d[k]} onChange={set(k)} />
    </Field>
  )

  return (
    <div className="space-y-6">
      {awal && (
        <div className="rounded-xl bg-sage-500/10 px-3 py-2.5 text-xs text-sage-500 font-medium">
          Data diisi dari Silabus {awal.mata_pelajaran}. Lengkapi bagian yang masih kosong.
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold mb-3">A. Identitas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Satuan Pendidikan">
            <input className="input-field" value={d.satuan} onChange={set('satuan')} />
          </Field>
          <Field label="Mata Pelajaran">
            <input className="input-field" value={d.mapel} onChange={set('mapel')} />
          </Field>
          <Field label="Kelas">
            <input className="input-field" value={d.kelas} onChange={set('kelas')} />
          </Field>
          <Field label="Fase (mis. A, B, C)">
            <input className="input-field" value={d.fase} onChange={set('fase')} />
          </Field>
          <Field label="Semester">
            <select className="input-field" value={d.semester} onChange={set('semester')}>
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </Field>
          <Field label="Tahun Ajaran">
            <input className="input-field" placeholder="2026/2027" value={d.tahunAjaran} onChange={set('tahunAjaran')} />
          </Field>
          <Field label="Alokasi Waktu">
            <input className="input-field" placeholder="2 x 35 menit" value={d.alokasi} onChange={set('alokasi')} />
          </Field>
          <Field label="Materi Pokok">
            <input className="input-field" value={d.materi} onChange={set('materi')} />
          </Field>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold mb-3">B–F. Rancangan Pembelajaran</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {area('capaian', 'B. Capaian Pembelajaran')}
          {area('tujuan', 'C. Tujuan Pembelajaran')}
          <Field label="D. Dimensi Profil Pelajar" full>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {DIMENSI.map((p) => (
                <label key={p} className="flex items-start gap-2 text-xs text-ink-700">
                  <input type="checkbox" checked={d.profil.includes(p)} onChange={() => toggleDimensi(p)} className="mt-0.5" />
                  {p}
                </label>
              ))}
            </div>
          </Field>
          {area('model', 'E. Model / Metode Pembelajaran', 2)}
          <Field label="F. Media">
            <input className="input-field" value={d.media} onChange={set('media')} />
          </Field>
          <Field label="F. Sumber Belajar">
            <input className="input-field" value={d.sumber} onChange={set('sumber')} />
          </Field>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold mb-1">G. Kegiatan Pembelajaran</h3>
        <p className="text-[11px] text-ink-700/40 mb-3">Satu baris = satu langkah kegiatan.</p>
        <div className="grid grid-cols-1 gap-3">
          {area('pendahuluan', 'Pendahuluan', 4)}
          {area('inti', 'Kegiatan Inti', 6)}
          {area('penutup', 'Penutup', 4)}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold mb-3">H. Asesmen & Pengesahan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {area('asesmen', 'Asesmen / Penilaian', 4)}
          <Field label="Nama Penyusun (Guru)">
            <input className="input-field" value={d.penyusun} onChange={set('penyusun')} />
          </Field>
          <Field label="NIP Penyusun">
            <input className="input-field" value={d.nipPenyusun} onChange={set('nipPenyusun')} />
          </Field>
          <Field label="Nama Kepala Sekolah">
            <input className="input-field" value={d.kepsek} onChange={set('kepsek')} />
          </Field>
          <Field label="NIP Kepala Sekolah">
            <input className="input-field" value={d.nipKepsek} onChange={set('nipKepsek')} />
          </Field>
          <Field label="Kota">
            <input className="input-field" value={d.kota} onChange={set('kota')} />
          </Field>
          <Field label="Tanggal">
            <input className="input-field" value={d.tanggal} onChange={set('tanggal')} />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={unduhWord} disabled={!siap || busy} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Unduh Word
        </button>
        <button
          type="button"
          onClick={cetakPdf}
          disabled={!siap}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-ink-700 bg-ink-900/[0.05] disabled:opacity-50"
        >
          <Printer size={16} /> Cetak / Simpan PDF
        </button>
        <button type="button" onClick={ulang} className="flex items-center gap-1.5 text-xs text-ink-700/50 px-2">
          <RotateCcw size={14} /> Kosongkan
        </button>
        {!siap && <span className="text-xs text-ink-700/40">Isi Mata Pelajaran dan Materi Pokok dulu.</span>}
      </div>
    </div>
  )
}
