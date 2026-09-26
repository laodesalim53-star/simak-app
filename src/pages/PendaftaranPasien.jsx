import { useEffect, useState } from 'react'
import { Camera, Loader2, PenLine, RotateCcw, Sparkles, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient' // sesuaikan path
import SudutEditor from '../components/SudutEditor'
import { siapkanFoto, suntingSudutFoto } from '../lib/kameraPdf'
import { muatOpenCv, opencvSudahSiap } from '../lib/opencvLoader'
import { buatWorkerOcr, ocrCanvas, scanDenganAI } from '../lib/alatPdf'

const KOSONG = {
  nik: '',
  nama: '',
  tempat_lahir: '',
  tanggal_lahir: '',
  jenis_kelamin: '',
  alamat: '',
  no_hp: '',
  golongan_darah: '',
}

// Foto aktif: hasil potong otomatis/sunting manual, atau foto asli bila deteksi gagal
// (pola sama seperti versiAktif() di AlatPDF.jsx)
function versiAktif(f) {
  return f.pakaiPotong && f.potong ? f.potong : f.asli
}

async function blobKeCanvas(blob) {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d').drawImage(bitmap, 0, 0)
  bitmap.close?.()
  return canvas
}

// Parser sederhana untuk baris-baris umum di KTP Indonesia. Hasilnya heuristik —
// selalu dipakai sebagai isian awal yang WAJIB dicek ulang oleh petugas, bukan
// pengganti verifikasi manual dengan wajah pasien.
function ambilNilai(baris, ...label) {
  const re = new RegExp(`^(?:${label.join('|')})\\s*[:\\-]?\\s*(.+)$`, 'i')
  for (const b of baris) {
    const m = b.match(re)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return ''
}

function tanggalKeIso(teks) {
  const m = teks.match(/(\d{1,2})[\s./-](\d{1,2})[\s./-](\d{4})/)
  if (!m) return ''
  const [, d, bln, y] = m
  return `${y}-${bln.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseTeksKtp(teks) {
  const baris = teks.split('\n').map((b) => b.trim()).filter(Boolean)

  const nikMentah = ambilNilai(baris, 'NIK')
  const nik = nikMentah.replace(/\D/g, '').slice(0, 16)

  const nama = ambilNilai(baris, 'Nama')

  const tempatTgl = ambilNilai(baris, 'Tempat\\s*/?\\s*Tgl\\s*Lahir', 'Tempat/Tgl Lahir')
  let tempat_lahir = ''
  let tanggal_lahir = ''
  if (tempatTgl) {
    const [tempat, ...sisa] = tempatTgl.split(',')
    tempat_lahir = tempat?.trim() || ''
    tanggal_lahir = tanggalKeIso(sisa.join(',')) || tanggalKeIso(tempatTgl)
  }

  const jkBaris = ambilNilai(baris, 'Jenis\\s*Kelamin')
  let jenis_kelamin = ''
  if (/laki/i.test(jkBaris)) jenis_kelamin = 'L'
  else if (/perempuan/i.test(jkBaris)) jenis_kelamin = 'P'

  const golDarahBaris = jkBaris || baris.find((b) => /gol\.?\s*darah/i.test(b)) || ''
  const golMatch = golDarahBaris.match(/gol\.?\s*darah\s*[:\-]?\s*(A|B|AB|O)\b/i)
  const golongan_darah = golMatch ? golMatch[1].toUpperCase() : ''

  const alamat = ambilNilai(baris, 'Alamat')

  return { nik, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, golongan_darah, alamat }
}

export default function PendaftaranPasien({ profil, onTersimpan }) {
  const [form, setForm] = useState(KOSONG)
  const [foto, setFoto] = useState(null) // { asli, potong, sudut, pakaiPotong } | null
  const [potongOtomatis, setPotongOtomatis] = useState(true)
  const [muatCv, setMuatCv] = useState(!opencvSudahSiap())
  const [bacaFoto, setBacaFoto] = useState(false)
  const [suntingSudut, setSuntingSudut] = useState(false)
  const [menyimpanSudut, setMenyimpanSudut] = useState(false)
  const [bacaOtomatis, setBacaOtomatis] = useState(false)
  const [pakaiAiScan, setPakaiAiScan] = useState(false)
  const [konfirmasiCocok, setKonfirmasiCocok] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [pesan, setPesan] = useState(null)

  useEffect(() => {
    if (opencvSudahSiap()) {
      setMuatCv(false)
      return
    }
    let batal = false
    muatOpenCv().catch(() => {}).finally(() => { if (!batal) setMuatCv(false) })
    return () => { batal = true }
  }, [])

  const ubahField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  function bebaskanUrl(f) {
    if (!f) return
    URL.revokeObjectURL(f.asli.url)
    if (f.potong) URL.revokeObjectURL(f.potong.url)
  }

  async function handleAmbilFoto(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setPesan(null)
    setBacaFoto(true)
    try {
      const { asli, potong, sudut } = await siapkanFoto(f, { potongOtomatis })
      bebaskanUrl(foto)
      setFoto({
        asli: { ...asli, url: URL.createObjectURL(asli.blob) },
        potong: potong ? { ...potong, url: URL.createObjectURL(potong.blob) } : null,
        sudut,
        pakaiPotong: !!potong,
      })
      setKonfirmasiCocok(false)
    } catch (err) {
      setPesan({ tipe: 'error', teks: err?.message || 'Gagal membaca foto KTP.' })
    } finally {
      setBacaFoto(false)
    }
  }

  function ulangFoto() {
    bebaskanUrl(foto)
    setFoto(null)
    setKonfirmasiCocok(false)
  }

  function alihPotong() {
    setFoto((f) => (f?.potong ? { ...f, pakaiPotong: !f.pakaiPotong } : f))
  }

  async function terapkanSudutBaru(titikBaru) {
    if (!foto) return
    setMenyimpanSudut(true)
    try {
      const potongBaru = await suntingSudutFoto(foto.asli.blob, titikBaru)
      if (foto.potong) URL.revokeObjectURL(foto.potong.url)
      setFoto((f) => ({
        ...f,
        potong: { ...potongBaru, url: URL.createObjectURL(potongBaru.blob) },
        sudut: titikBaru,
        pakaiPotong: true,
      }))
      setSuntingSudut(false)
    } catch (err) {
      setPesan({ tipe: 'error', teks: err?.message || 'Gagal menerapkan sudut yang disunting.' })
    } finally {
      setMenyimpanSudut(false)
    }
  }

  // Baca NIK/Nama/dll otomatis dari foto KTP untuk mengisi form — bukan pengganti
  // verifikasi manual. Default pakai OCR di perangkat (Tesseract), karena KTP memuat
  // data pribadi sensitif dan sebaiknya tidak dikirim ke server AI kecuali disetujui.
  async function bacaOtomatisDariFoto() {
    if (!foto) return
    setBacaOtomatis(true)
    setPesan(null)
    try {
      const canvas = await blobKeCanvas(versiAktif(foto).blob)
      let teks = ''
      if (pakaiAiScan) {
        teks = await scanDenganAI(canvas, 'ind')
      } else {
        const worker = await buatWorkerOcr('ind', () => {})
        try {
          const hasil = await ocrCanvas(worker, canvas, { denganPosisi: false })
          teks = hasil.teks
        } finally {
          await worker.terminate()
        }
      }
      const hasilParse = parseTeksKtp(teks)
      setForm((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(hasilParse).filter(([, v]) => v)) }))
      setPesan({
        tipe: 'info',
        teks: 'Data terisi otomatis dari foto. Periksa dan koreksi setiap kolom sebelum menyimpan.',
      })
    } catch (err) {
      setPesan({ tipe: 'error', teks: err?.message || 'Gagal membaca teks dari foto.' })
    } finally {
      setBacaOtomatis(false)
    }
  }

  async function simpanPasien(e) {
    e.preventDefault()
    setPesan(null)

    if (!form.nik || form.nik.length !== 16) {
      setPesan({ tipe: 'error', teks: 'NIK harus 16 digit sesuai KTP.' })
      return
    }
    if (!foto) {
      setPesan({ tipe: 'error', teks: 'Ambil foto KTP dulu sebagai bukti verifikasi.' })
      return
    }
    if (!konfirmasiCocok) {
      setPesan({ tipe: 'error', teks: 'Centang konfirmasi bahwa foto KTP sudah dicocokkan dengan wajah pasien.' })
      return
    }

    setMenyimpan(true)
    try {
      const blobUnggah = versiAktif(foto).blob
      const ext = blobUnggah.type === 'image/png' ? 'png' : 'jpg'
      const namaFile = `${profil.puskesmas_id}/${form.nik}-${Date.now()}.${ext}`

      const { error: errUpload } = await supabase.storage
        .from('ktp-pasien')
        .upload(namaFile, blobUnggah, { contentType: blobUnggah.type || 'image/jpeg' })
      if (errUpload) throw errUpload

      const { error: errInsert } = await supabase.from('pasien').insert({
        ...form,
        puskesmas_id: profil.puskesmas_id,
        foto_ktp_url: namaFile,
        foto_ktp_verified: true,
        foto_ktp_verified_by: profil.id,
        foto_ktp_verified_at: new Date().toISOString(),
        created_by: profil.id,
      })
      if (errInsert) throw errInsert

      setPesan({ tipe: 'sukses', teks: 'Pasien berhasil didaftarkan.' })
      setForm(KOSONG)
      ulangFoto()
      onTersimpan?.()
    } catch (err) {
      const teks = err.message?.includes('duplicate')
        ? 'NIK ini sudah terdaftar di puskesmas ini.'
        : 'Gagal menyimpan data pasien. Coba lagi.'
      setPesan({ tipe: 'error', teks })
    } finally {
      setMenyimpan(false)
    }
  }

  const kunci = bacaFoto || bacaOtomatis || menyimpan

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-4 text-base font-semibold text-slate-800">Pendaftaran Pasien Baru</h2>

      <div className="mb-5 space-y-3 rounded-lg border bg-white p-4">
        <p className="text-sm text-slate-600">
          Foto KTP pasien. Tepi kartu dipotong otomatis lalu bisa dikoreksi manual, sama seperti
          fitur scan dokumen — cocokkan hasil foto dengan wajah pasien secara langsung.
        </p>

        {muatCv && (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 size={12} className="animate-spin" />
            Menyiapkan mesin pemindai untuk deteksi tepi kartu otomatis...
          </p>
        )}

        {!foto && (
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 ${kunci ? 'pointer-events-none opacity-50' : ''}`}>
            <Camera size={16} />
            Buka Kamera untuk Foto KTP
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleAmbilFoto}
              className="hidden"
              disabled={kunci}
            />
          </label>
        )}

        {bacaFoto && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Memproses foto...
          </p>
        )}

        {foto && (
          <div className="space-y-3">
            <div className="relative inline-block rounded-lg border">
              <img src={versiAktif(foto).url} alt="Foto KTP" className="h-40 w-64 rounded-lg object-contain" />
              <button
                type="button"
                onClick={ulangFoto}
                disabled={kunci}
                aria-label="Hapus foto"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white disabled:opacity-40"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900">
                <RotateCcw size={14} />
                Ambil ulang
                <input type="file" accept="image/*" capture="environment" onChange={handleAmbilFoto} className="hidden" disabled={kunci} />
              </label>
              <button
                type="button"
                onClick={() => setSuntingSudut(true)}
                disabled={kunci}
                className="inline-flex items-center gap-1.5 font-medium text-sky-700 hover:text-sky-900 disabled:opacity-40"
              >
                <PenLine size={14} />
                Sunting sudut
              </button>
              {foto.potong && (
                <button
                  type="button"
                  onClick={alihPotong}
                  disabled={kunci}
                  className={`font-medium disabled:opacity-40 ${foto.pakaiPotong ? 'text-emerald-700' : 'text-slate-600'}`}
                >
                  {foto.pakaiPotong ? 'Dipotong otomatis (pakai foto asli?)' : 'Foto asli (potong otomatis?)'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              <button
                type="button"
                onClick={bacaOtomatisDariFoto}
                disabled={kunci}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                {bacaOtomatis ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {bacaOtomatis ? 'Membaca...' : 'Isi otomatis dari foto'}
              </button>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={pakaiAiScan}
                  onChange={(e) => setPakaiAiScan(e.target.checked)}
                  disabled={kunci}
                />
                Pakai AI Scan (lebih akurat, tapi foto KTP dikirim ke server AI — hindari kalau tidak perlu)
              </label>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={simpanPasien} className="space-y-3 rounded-lg border bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">NIK (16 digit)</label>
          <input value={form.nik} onChange={ubahField('nik')} maxLength={16} inputMode="numeric" className="w-full rounded border px-3 py-2 text-sm" required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nama Lengkap</label>
          <input value={form.nama} onChange={ubahField('nama')} className="w-full rounded border px-3 py-2 text-sm" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tempat Lahir</label>
            <input value={form.tempat_lahir} onChange={ubahField('tempat_lahir')} className="w-full rounded border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tanggal Lahir</label>
            <input type="date" value={form.tanggal_lahir} onChange={ubahField('tanggal_lahir')} className="w-full rounded border px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Jenis Kelamin</label>
            <select value={form.jenis_kelamin} onChange={ubahField('jenis_kelamin')} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">Pilih</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Golongan Darah</label>
            <input value={form.golongan_darah} onChange={ubahField('golongan_darah')} className="w-full rounded border px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Alamat</label>
          <textarea value={form.alamat} onChange={ubahField('alamat')} rows={2} className="w-full rounded border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">No. HP</label>
          <input value={form.no_hp} onChange={ubahField('no_hp')} className="w-full rounded border px-3 py-2 text-sm" />
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={konfirmasiCocok} onChange={(e) => setKonfirmasiCocok(e.target.checked)} />
          Saya sudah mencocokkan foto KTP ini dengan wajah pasien secara langsung.
        </label>

        {pesan && (
          <p className={`text-sm ${pesan.tipe === 'error' ? 'text-red-600' : pesan.tipe === 'info' ? 'text-sky-700' : 'text-emerald-700'}`}>
            {pesan.teks}
          </p>
        )}

        <button type="submit" disabled={menyimpan} className="w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
          {menyimpan ? 'Menyimpan...' : 'Simpan Pasien'}
        </button>
      </form>

      {suntingSudut && foto && (
        <SudutEditor
          url={foto.asli.url}
          lebarAsli={foto.asli.w}
          tinggiAsli={foto.asli.h}
          sudutAwal={foto.sudut}
          onTerapkan={terapkanSudutBaru}
          onBatal={() => setSuntingSudut(false)}
        />
      )}
      {menyimpanSudut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 text-sm text-slate-800">
            <Loader2 size={18} className="animate-spin" />
            Menerapkan sudut baru...
          </div>
        </div>
      )}
    </div>
  )
}
