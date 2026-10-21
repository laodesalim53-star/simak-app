import { useEffect, useMemo, useState } from 'react'
import { Download, Printer, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { buatRppDocxFile, buatRppHtml, CSS_CETAK_RPP } from '../../lib/rppDokumen'
import {
  DIMENSI,
  MODEL,
  ALOKASI,
  MEDIA,
  SUMBER,
  ASESMEN,
  faseDariKelas,
  capaianDari,
  kegiatanDariModel,
} from '../../data/rppRekomendasi'

const KUNCI_DRAFT = 'simak_draft_susun_rpp'
const LOGO_BUCKET_SEKOLAH = 'profil-sekolah'

// Path/URL di database -> URL publik (sama seperti KopSurat.jsx)
function urlLogo(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return supabase.storage.from(LOGO_BUCKET_SEKOLAH).getPublicUrl(path).data.publicUrl
}

// Unduh logo -> { data, type, w, h, dataUrl } (dipakai untuk Word dan cetak PDF)
async function ambilLogo(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    const type =
      buf[0] === 0x89 && buf[1] === 0x50 ? 'png' : buf[0] === 0xff && buf[1] === 0xd8 ? 'jpg' : buf[0] === 0x47 && buf[1] === 0x49 ? 'gif' : null
    if (!type) return null // format lain (mis. SVG/WebP) dilewati
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
      /* pakai ukuran bawaan */
    }
    let bin = ''
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000))
    return { data: buf, type, w, h, dataUrl: `data:${mime};base64,${btoa(bin)}` }
  } catch {
    return null
  }
}

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
  pakaiKop: true,
}

function bacaDraft() {
  try {
    const raw = localStorage.getItem(KUNCI_DRAFT)
    return raw ? { ...KOSONG, ...JSON.parse(raw) } : { ...KOSONG, tanggal: hariIni() }
  } catch {
    return { ...KOSONG, tanggal: hariIni() }
  }
}

const kosong = (s) => !String(s || '').trim()

// Dropdown kecil "Rekomendasi": memilih satu opsi akan mengisi kolom terkait
function Rekom({ opsi, onPilih, teks = 'Rekomendasi' }) {
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

function Field({ label, children, full, rekom }) {
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

// awal   : data kiriman dari halaman Silabus (location.state.dariSilabus), boleh kosong
// profil : profil pengguna dari useAuth (dipakai untuk mengisi nama penyusun)
export default function SusunRppTab({ awal, profil }) {
  const { sekolahId } = useAuth()
  const [d, setD] = useState(bacaDraft)
  const [busy, setBusy] = useState(false)
  const [kop, setKop] = useState(null)

  // Data untuk dokumen: kop hanya disertakan kalau dicentang dan datanya ada
  const dataDokumen = () => ({ ...d, kop: d.pakaiKop ? kop : null })

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

  // Kepala sekolah, NIP kepsek, dan nama sekolah dari profil_sekolah;
  // NIP penyusun dari tabel guru. Hanya mengisi kolom yang masih kosong.
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

      // Kota untuk tanda tangan: nama kabupaten tanpa awalan "Kabupaten"/"Kab."
      const kota = (sk?.kabupaten || '').replace(/^\s*(kabupaten|kab\.?|kota)\s+/i, '').trim()

      setD((p) => ({
        ...p,
        kepsek: p.kepsek || sk?.kepala_sekolah || '',
        nipKepsek: p.nipKepsek || sk?.nip_kepala_sekolah || '',
        satuan: p.satuan || sk?.nama_sekolah || '',
        kota: p.kota || kota,
        nipPenyusun: p.nipPenyusun || nipGuru,
      }))

      // Kop surat: logo kabupaten di kiri + logo sekolah di kanan (sama seperti KopSurat.jsx)
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

  // Fase otomatis dari kelas (kalau fase masih kosong)
  useEffect(() => {
    setD((p) => {
      if (p.fase || !p.kelas) return p
      const f = faseDariKelas(p.kelas)
      return f ? { ...p, fase: f } : p
    })
  }, [d.kelas])

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

  // ---------- Pengisi rekomendasi ----------
  // Tambahkan teks ke kolom (tidak menimpa; tidak menambah kalau sudah ada)
  function tambah(k, teks, pemisah = '\n') {
    setD((p) => {
      if (kosong(p[k])) return { ...p, [k]: teks }
      if (p[k].includes(teks)) return p
      return { ...p, [k]: p[k].trimEnd() + pemisah + teks }
    })
  }

  // Pilih model: isi model, profil (kalau kosong), dan kegiatan (kalau kosong atau timpa=true)
  function pilihModel(label, timpa = false) {
    const keg = kegiatanDariModel(label, d.materi)
    if (!keg) return
    setD((p) => {
      const kegKosong = kosong(p.pendahuluan) && kosong(p.inti) && kosong(p.penutup)
      return {
        ...p,
        model: label,
        profil: p.profil.length ? p.profil : keg.profil,
        ...(kegKosong || timpa
          ? { pendahuluan: keg.pendahuluan, inti: keg.inti, penutup: keg.penutup }
          : {}),
      }
    })
  }

  // Isi semua kolom yang masih kosong sekaligus
  function isiOtomatis() {
    const label = d.model || MODEL[0].label
    const keg = kegiatanDariModel(label, d.materi)
    setD((p) => ({
      ...p,
      fase: p.fase || faseDariKelas(p.kelas),
      alokasi: p.alokasi || ALOKASI[0],
      capaian: p.capaian || capaianDari(p.materi, p.fase || faseDariKelas(p.kelas)),
      model: p.model || label,
      profil: p.profil.length ? p.profil : keg.profil,
      media: p.media || 'Papan tulis, Slide presentasi (PowerPoint), Lembar Kerja Peserta Didik (LKPD)',
      sumber: p.sumber || 'Buku Siswa Kurikulum Merdeka (Kemendikbudristek), Buku Guru Kurikulum Merdeka, Lingkungan sekitar sekolah',
      pendahuluan: kosong(p.pendahuluan) ? keg.pendahuluan : p.pendahuluan,
      inti: kosong(p.inti) ? keg.inti : p.inti,
      penutup: kosong(p.penutup) ? keg.penutup : p.penutup,
      asesmen: kosong(p.asesmen) ? ASESMEN[0].isi : p.asesmen,
    }))
  }

  function toggleDimensi(nama) {
    setD((p) => ({
      ...p,
      profil: p.profil.includes(nama) ? p.profil.filter((x) => x !== nama) : [...p.profil, nama],
    }))
  }

  async function unduhWord() {
    setBusy(true)
    try {
      const file = await buatRppDocxFile(dataDokumen(), namaFile)
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
        `<style>${CSS_CETAK_RPP}</style></head><body>${buatRppHtml(dataDokumen())}</body></html>`
    )
    w.document.close()
    w.focus()
    // Tunggu logo selesai dimuat sebelum membuka dialog cetak
    const tunggu = Promise.all(
      [...w.document.images].map((im) =>
        im.complete ? null : new Promise((r) => { im.onload = im.onerror = r })
      )
    )
    Promise.race([tunggu, new Promise((r) => setTimeout(r, 2500))]).then(() => setTimeout(() => w.print(), 200))
  }

  function ulang() {
    if (!confirm('Kosongkan semua isian RPP?')) return
    setD({ ...KOSONG, tanggal: hariIni(), penyusun: profil?.nama_lengkap || profil?.nama || '' })
  }

  const area = (k, label, rows = 4, rekom = null) => (
    <Field label={label} full rekom={rekom}>
      <textarea className="input-field" rows={rows} value={d[k]} onChange={set(k)} />
    </Field>
  )

  const modelDipilih = MODEL.some((x) => x.label === d.model)

  return (
    <div className="space-y-6">
      {awal && (
        <div className="rounded-xl bg-sage-500/10 px-3 py-2.5 text-xs text-sage-500 font-medium">
          Data diisi dari Silabus {awal.mata_pelajaran}. Lengkapi bagian yang masih kosong.
        </div>
      )}

      {/* Isi otomatis semua kolom kosong */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-700/70 max-w-xl">
          Klik <strong>Isi Otomatis</strong> untuk melengkapi semua kolom yang masih kosong (fase, alokasi, capaian,
          model, kegiatan, media, sumber, asesmen). Isian yang sudah Anda tulis tidak ditimpa. Atau pilih
          <strong> ✨ Rekomendasi</strong> di setiap kolom satu per satu.
        </p>
        <button
          type="button"
          onClick={isiOtomatis}
          disabled={!siap}
          className="btn-primary shrink-0 disabled:opacity-50"
        >
          <Sparkles size={16} /> Isi Otomatis
        </button>
      </div>

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
          <Field
            label="Fase (mis. A, B, C)"
            rekom={
              d.kelas && faseDariKelas(d.kelas) ? (
                <button
                  type="button"
                  className="text-[11px] rounded-md bg-sage-500/10 text-sage-500 font-medium px-1.5 py-0.5"
                  onClick={() => setD((p) => ({ ...p, fase: faseDariKelas(p.kelas) }))}
                >
                  ✨ Dari kelas ({faseDariKelas(d.kelas)})
                </button>
              ) : null
            }
          >
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
          <Field
            label="Alokasi Waktu"
            rekom={<Rekom opsi={ALOKASI} onPilih={(o) => setD((p) => ({ ...p, alokasi: o }))} />}
          >
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
          {area(
            'capaian',
            'B. Capaian Pembelajaran',
            4,
            <button
              type="button"
              disabled={!d.materi.trim()}
              className="text-[11px] rounded-md bg-sage-500/10 text-sage-500 font-medium px-1.5 py-0.5 disabled:opacity-40"
              onClick={() => setD((p) => ({ ...p, capaian: capaianDari(p.materi, p.fase || faseDariKelas(p.kelas)) }))}
            >
              ✨ Rumuskan dari materi
            </button>
          )}
          {area('tujuan', 'C. Tujuan Pembelajaran')}

          <Field
            label="D. Dimensi Profil Pelajar"
            full
            rekom={
              <button
                type="button"
                className="text-[11px] rounded-md bg-sage-500/10 text-sage-500 font-medium px-1.5 py-0.5"
                onClick={() =>
                  setD((p) => ({
                    ...p,
                    profil: (kegiatanDariModel(p.model || MODEL[0].label, p.materi) || MODEL[0]).profil,
                  }))
                }
              >
                ✨ Sesuai model
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {DIMENSI.map((p) => (
                <label key={p} className="flex items-start gap-2 text-xs text-ink-700">
                  <input type="checkbox" checked={d.profil.includes(p)} onChange={() => toggleDimensi(p)} className="mt-0.5" />
                  {p}
                </label>
              ))}
            </div>
          </Field>

          <Field
            label="E. Model / Metode Pembelajaran"
            full
            rekom={<Rekom opsi={MODEL.map((x) => x.label)} onPilih={(label) => pilihModel(label)} teks="Pilih model" />}
          >
            <textarea className="input-field" rows={2} value={d.model} onChange={set('model')} />
          </Field>

          <Field
            label="F. Media"
            rekom={<Rekom opsi={MEDIA} onPilih={(o) => tambah('media', o, ', ')} teks="Tambah media" />}
          >
            <input className="input-field" value={d.media} onChange={set('media')} />
          </Field>
          <Field
            label="F. Sumber Belajar"
            rekom={<Rekom opsi={SUMBER} onPilih={(o) => tambah('sumber', o, ', ')} teks="Tambah sumber" />}
          >
            <input className="input-field" value={d.sumber} onChange={set('sumber')} />
          </Field>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="font-display text-lg font-semibold">G. Kegiatan Pembelajaran</h3>
          {modelDipilih && (
            <button
              type="button"
              className="text-[11px] rounded-md bg-sage-500/10 text-sage-500 font-medium px-2 py-1"
              onClick={() => pilihModel(d.model, true)}
            >
              ✨ Isi ulang kegiatan sesuai model
            </button>
          )}
        </div>
        <p className="text-[11px] text-ink-700/40 mb-3">
          Satu baris = satu langkah kegiatan. Pilih model di bagian E agar kegiatan terisi otomatis.
        </p>
        <div className="grid grid-cols-1 gap-3">
          {area('pendahuluan', 'Pendahuluan', 4)}
          {area('inti', 'Kegiatan Inti', 6)}
          {area('penutup', 'Penutup', 4)}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold mb-3">H. Asesmen & Pengesahan</h3>
        <label className="flex items-start gap-2 text-xs text-ink-700 mb-3 rounded-xl bg-ink-900/[0.04] px-3 py-2">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={d.pakaiKop}
            disabled={!kop}
            onChange={(e) => setD((p) => ({ ...p, pakaiKop: e.target.checked }))}
          />
          <span>
            Sertakan kop surat
            {kop ? (
              <span className="text-ink-700/50"> — {kop.nama}{kop.kiri ? '' : ' (logo belum diatur di Profil Sekolah)'}</span>
            ) : (
              <span className="text-ink-700/50"> — data Profil Sekolah belum termuat atau belum diisi</span>
            )}
          </span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {area(
            'asesmen',
            'Asesmen / Penilaian',
            4,
            <Rekom opsi={ASESMEN} onPilih={(o) => tambah('asesmen', o.isi)} teks="Tambah asesmen" />
          )}
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
