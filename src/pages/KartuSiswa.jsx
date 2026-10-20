import { useEffect, useState } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { Camera, Loader2, IdCard, Library, Download, Eye, X } from 'lucide-react'

const CARD_W = 242 // ~85.6mm dalam points
const CARD_H = 153 // ~54mm dalam points
const MARGIN = 30
const GAP = 14
const COLS = 2
const ROWS = 4

// Ruang desain kartu: semua koordinat di bawah dalam satuan 697 x 440
// (rasio sama dengan kartu ID). Pratinjau (SVG) dan PDF memakai daftar
// elemen yang SAMA, jadi hasil cetak identik dengan yang tampil di layar.
const DW = 697
const DH = 440
const S = CARD_W / DW // skala desain -> points PDF

// Ganti dengan domain Vercel Anda yang sebenarnya
const BASE_URL = 'https://domain-anda.vercel.app'

const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function formatTanggalIndo(dateLike) {
  if (!dateLike) return '-'
  const d = new Date(dateLike)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`
}

function formatTTL(siswa) {
  const tempat = siswa.tempat_lahir || '-'
  const tanggal = siswa.tanggal_lahir ? formatTanggalIndo(siswa.tanggal_lahir) : '-'
  return `${tempat}, ${tanggal}`
}

function formatJK(v) {
  if (!v) return '-'
  const s = String(v).trim().toLowerCase()
  if (s === 'l' || s.startsWith('laki')) return 'Laki-laki'
  if (s === 'p' || s.startsWith('perempuan')) return 'Perempuan'
  return v
}

// Warna per jenis kartu — layout sama, warna berbeda.
const TEMA_KARTU = {
  pelajar: {
    label: 'KARTU PELAJAR',
    header: '#287a2c', // hijau
    judul: '#f6e27a', // kuning nama sekolah
    teks: '#1a2a6c', // biru dongker
    tab: '#a8d672', // hijau muda di pojok kiri bawah
  },
  perpustakaan: {
    label: 'KARTU PERPUSTAKAAN',
    header: '#7a1515',
    judul: '#f3d98a',
    teks: '#4f1717',
    tab: '#e2a8a8',
  },
}

function hex(h) {
  const n = parseInt(h.slice(1), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

function roundRectPath(x, y, w, h, r) {
  return `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`
}

// Kecilkan font sampai muat; kalau masih kurang, potong dengan "…"
function fitText(text, maxW, size, minSize, bold, measure) {
  let s = size
  while (s > minSize && measure(text, s, bold) > maxW) s -= 1
  let out = text
  while (out.length > 3 && measure(out, s, bold) > maxW) out = out.slice(0, -2) + '…'
  return { text: out, size: s }
}

function wrapLines(text, maxW, size, maxLines, measure) {
  const words = String(text || '-').split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (measure(test, size, false) <= maxW || !cur) cur = test
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines)
    let last = keep[maxLines - 1]
    while (last.length > 3 && measure(last + '…', size, false) > maxW) last = last.slice(0, -1)
    keep[maxLines - 1] = last + '…'
    return keep
  }
  return lines
}

// Susun semua elemen kartu (path, lingkaran, teks, gambar) dalam ruang 697x440.
function bangunKartu({ siswa, jenis, profilSekolah, tanggalTerbit, ada, measure }) {
  const t = TEMA_KARTU[jenis]
  const el = []
  const namaSekolah = profilSekolah?.nama_sekolah || 'SD NEGERI WARIA'
  const alamatSekolah = profilSekolah?.alamat || ''
  const namaKepsek = profilSekolah?.nama_kepala_sekolah || '-'

  // Strip bawah: garis tipis di kanan + tab muda membulat di kiri
  el.push({ k: 'path', d: `M290 ${DH - 12} H${DW} V${DH} H290 Z`, fill: t.header })
  el.push({ k: 'path', d: `M0 ${DH} V398 H260 Q290 398 290 428 V${DH} Z`, fill: t.tab })

  // Header berwarna di kanan atas, sudut kiri-bawah membulat
  el.push({ k: 'path', d: `M165 0 H${DW} V125 H212 Q165 125 165 78 Z`, fill: t.header })

  // Logo sekolah (kiri atas). Kalau belum ada logo di Profil Sekolah,
  // dipakai perisai + lingkaran kuning bawaan.
  if (ada.logo) {
    el.push({ k: 'img', id: 'logo', x: 40, y: 22, w: 95, h: 110, fit: 'contain' })
  } else {
    el.push({ k: 'path', d: 'M45 35 H125 V100 Q125 116 85 131 Q45 116 45 100 Z', fill: t.header })
    el.push({ k: 'circle', cx: 85, cy: 78, r: 26, fill: '#f6e050' })
  }

  // Teks header: nama sekolah, alamat, kontak, label kartu
  const kontak = [
    profilSekolah?.telepon && `Telp/HP: ${profilSekolah.telepon}`,
    profilSekolah?.email && `Email: ${profilSekolah.email}`,
  ].filter(Boolean).join('  |  ')
  const hn = fitText(namaSekolah, 490, 33, 18, true, measure)
  el.push({ k: 'text', x: 430, y: 56, text: hn.text, size: hn.size, bold: true, color: t.judul, anchor: 'middle' })
  if (alamatSekolah) {
    const ha = fitText(alamatSekolah, 490, 15, 9, false, measure)
    el.push({ k: 'text', x: 430, y: 78, text: ha.text, size: ha.size, color: '#ffffff', anchor: 'middle' })
  }
  if (kontak) {
    const hk = fitText(kontak, 490, 15, 9, false, measure)
    el.push({ k: 'text', x: 430, y: 96, text: hk.text, size: hk.size, color: '#ffffff', anchor: 'middle' })
  }
  el.push({ k: 'text', x: 430, y: 116, text: t.label, size: 12, bold: true, color: t.judul, anchor: 'middle' })

  // Foto (kiri)
  if (ada.foto) {
    el.push({ k: 'img', id: 'foto', x: 44, y: 150, w: 123, h: 155, fit: 'cover' })
  } else {
    el.push({ k: 'path', d: 'M44 150 H167 V305 H44 Z', fill: '#e5e7eb' })
    el.push({ k: 'text', x: 105.5, y: 248, text: (siswa.nama_lengkap || '?')[0], size: 60, bold: true, color: '#9ca3af', anchor: 'middle' })
  }

  // Nama
  const nm = fitText(siswa.nama_lengkap || '-', 470, 33, 18, true, measure)
  el.push({ k: 'text', x: 195, y: 176, text: nm.text, size: nm.size, bold: true, color: t.teks })

  // Baris data: label : isi
  const LX = 203, CX = 332, VX = 360, VW = DW - VX - 24, FS = 18, LH = 21
  let y = 207
  const baris = (label, isi) => {
    el.push({ k: 'text', x: LX, y, text: label, size: FS, color: t.teks })
    el.push({ k: 'text', x: CX, y, text: ':', size: FS, color: t.teks })
    const f = fitText(isi || '-', VW, FS, 11, false, measure)
    el.push({ k: 'text', x: VX, y, text: f.text, size: f.size, color: t.teks })
    y += LH
  }
  baris('NIS/NISN', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`)
  baris('Jenis Kelamin', formatJK(siswa.jenis_kelamin))
  baris('T.T.L', formatTTL(siswa))
  // Alamat: boleh 2 baris
  el.push({ k: 'text', x: LX, y, text: 'Alamat', size: FS, color: t.teks })
  el.push({ k: 'text', x: CX, y, text: ':', size: FS, color: t.teks })
  wrapLines(siswa.alamat || '-', VW, FS, 2, measure).forEach((ln, i) => {
    el.push({ k: 'text', x: VX, y: y + i * LH, text: ln, size: FS, color: t.teks })
  })

  // Tanda tangan kepala sekolah (kanan bawah)
  el.push({ k: 'text', x: 525, y: 314, text: tanggalTerbit, size: 14, italic: true, color: t.teks, anchor: 'middle' })
  el.push({ k: 'text', x: 525, y: 332, text: 'Kepala Sekolah', size: 14, italic: true, color: t.teks, anchor: 'middle' })
  if (ada.ttd) el.push({ k: 'img', id: 'ttd', x: 430, y: 337, w: 190, h: 52, fit: 'contain' })
  const nk = fitText(namaKepsek, 250, 16, 10, true, measure)
  el.push({ k: 'text', x: 525, y: 408, text: nk.text, size: nk.size, bold: true, color: t.teks, anchor: 'middle' })

  // Kotak QR verifikasi (kiri bawah, menggantikan "BARCODE" di contoh)
  el.push({ k: 'path', d: roundRectPath(27, 322, 330, 72, 12), fill: '#ffffff', stroke: t.teks, sw: 3 })
  if (ada.qr) el.push({ k: 'img', id: 'qr', x: 35, y: 326, w: 64, h: 64, fit: 'contain' })
  el.push({ k: 'text', x: 112, y: 353, text: 'SCAN UNTUK VERIFIKASI', size: 15, bold: true, color: t.teks })
  el.push({ k: 'text', x: 112, y: 376, text: `NIS ${siswa.nis || '-'}`, size: 13, color: t.teks })

  return el
}

// Pengukur teks perkiraan untuk pratinjau browser (PDF memakai ukuran font asli)
const measureKira = (text, size, bold) => text.length * size * (bold ? 0.58 : 0.52)

function KartuSvg({ elemen, src }) {
  return (
    <svg viewBox={`0 0 ${DW} ${DH}`} className="w-full h-auto block bg-white" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
      {elemen.map((e, i) => {
        if (e.k === 'path') {
          return <path key={i} d={e.d} fill={e.fill || 'none'} stroke={e.stroke} strokeWidth={e.sw} />
        }
        if (e.k === 'circle') return <circle key={i} cx={e.cx} cy={e.cy} r={e.r} fill={e.fill} />
        if (e.k === 'text') {
          return (
            <text
              key={i}
              x={e.x}
              y={e.y}
              fontSize={e.size}
              fontWeight={e.bold ? 700 : 400}
              fontStyle={e.italic ? 'italic' : 'normal'}
              fill={e.color}
              textAnchor={e.anchor || 'start'}
            >
              {e.text}
            </text>
          )
        }
        if (e.k === 'img') {
          return (
            <image
              key={i}
              href={src[e.id]}
              x={e.x}
              y={e.y}
              width={e.w}
              height={e.h}
              preserveAspectRatio={e.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
            />
          )
        }
        return null
      })}
    </svg>
  )
}

// Modal pratinjau — menampilkan kartu persis seperti yang akan dicetak.
function PreviewKartuModal({ jenis, siswaList, fotoUrl, profilSekolah, generating, onClose, onDownload }) {
  const [qrMap, setQrMap] = useState({})
  const tema = TEMA_KARTU[jenis]
  const tanggalTerbit = formatTanggalIndo(new Date())

  useEffect(() => {
    let aktif = true
    async function buatQr() {
      const entries = await Promise.all(
        siswaList.map(async (s) => {
          const url = `${BASE_URL}/verify/siswa/${s.id}`
          try {
            const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 0 })
            return [s.id, dataUrl]
          } catch {
            return [s.id, null]
          }
        })
      )
      if (aktif) setQrMap(Object.fromEntries(entries))
    }
    buatQr()
    return () => { aktif = false }
  }, [siswaList])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-900/[0.08] shrink-0">
          <div>
            <h2 className="font-display font-semibold text-ink-950">Pratinjau {tema.label.toLowerCase()}</h2>
            <p className="text-xs text-ink-700/50 mt-0.5">{siswaList.length} siswa akan dicetak</p>
          </div>
          <button type="button" onClick={onClose} className="text-ink-700/40 hover:text-ink-700/70">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {siswaList.map((s) => {
              const src = { foto: fotoUrl(s.foto_path), qr: qrMap[s.id], ttd: profilSekolah?.ttd_url, logo: profilSekolah?.logo_url }
              const elemen = bangunKartu({
                siswa: s,
                jenis,
                profilSekolah,
                tanggalTerbit,
                ada: { foto: !!src.foto, qr: !!src.qr, ttd: !!src.ttd, logo: !!src.logo },
                measure: measureKira,
              })
              return (
                <div key={s.id} className="rounded-xl overflow-hidden shadow-md ring-1 ring-black/5">
                  <KartuSvg elemen={elemen} src={src} />
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-ink-900/[0.08] shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-700 hover:bg-ink-900/[0.05]">
            Tutup
          </button>
          <button
            type="button"
            onClick={() => onDownload(jenis)}
            disabled={generating}
            className="btn-primary"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KartuSiswa() {
  const { profil } = useAuth()
  const sekolahId = profil?.sekolah_id
  const [kelasList, setKelasList] = useState([])
  const [kelasId, setKelasId] = useState('')
  const [siswaList, setSiswaList] = useState([])
  const [selected, setSelected] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [uploadingId, setUploadingId] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [previewJenis, setPreviewJenis] = useState(null) // 'pelajar' | 'perpustakaan' | null
  const [previewSiswaTunggal, setPreviewSiswaTunggal] = useState(null) // siswa untuk tombol "Lihat" per-baris
  const [profilSekolah, setProfilSekolah] = useState(null)

  useEffect(() => {
    supabase.from('kelas').select('id, nama_kelas').order('nama_kelas').then(({ data }) => {
      setKelasList(data || [])
      if (data?.length) setKelasId(data[0].id)
    })
  }, [])

  // Profil sekolah baru dimuat setelah sekolahId dari AuthContext tersedia,
  // supaya tidak sempat mengambil baris profil_sekolah milik sekolah lain.
  useEffect(() => {
    if (sekolahId) loadProfilSekolah()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  useEffect(() => {
    if (kelasId) loadSiswa()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId])

  // Nama kolom & bucket storage disamakan dengan ProfilSekolah.jsx:
  // `kepala_sekolah`, `ttd_kepala_sekolah_path`, bucket `profil-sekolah`.
  async function loadProfilSekolah() {
    const { data, error } = await supabase
      .from('profil_sekolah')
      .select('nama_sekolah, alamat, telepon, email, logo_path, nama_kepala_sekolah:kepala_sekolah, ttd_path:ttd_kepala_sekolah_path')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()

    if (error || !data) {
      console.warn('Profil sekolah belum tersedia:', error?.message)
      setProfilSekolah(null)
      return
    }

    let ttd_url = null
    if (data.ttd_path) {
      ttd_url = supabase.storage.from('profil-sekolah').getPublicUrl(data.ttd_path).data.publicUrl
    }
    // Logo: path berawalan http dipakai apa adanya (sama seperti KopSurat.jsx)
    let logo_url = null
    if (data.logo_path) {
      logo_url = data.logo_path.startsWith('http')
        ? data.logo_path
        : supabase.storage.from('profil-sekolah').getPublicUrl(data.logo_path).data.publicUrl
    }
    setProfilSekolah({ ...data, ttd_url, logo_url })
  }

  async function loadSiswa() {
    setLoading(true)
    setLoadError('')
    // ⚠️ SESUAIKAN: pastikan kolom nisn, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat memang ada di tabel siswa
    const { data, error } = await supabase
      .from('siswa')
      .select('id, nama_lengkap, nis, nisn, jenis_kelamin, foto_path, tempat_lahir, tanggal_lahir, alamat, kelas(nama_kelas)')
      .eq('kelas_id', kelasId)
      .eq('status', 'aktif')
      .order('nama_lengkap')

    if (error) {
      console.error('Gagal memuat siswa:', error)
      setLoadError(`Gagal memuat data siswa: ${error.message}`)
      setLoading(false)
      return // jangan timpa siswaList yang lama dengan array kosong
    }

    setSiswaList(data || [])
    setSelected({})
    setLoading(false)
  }

  function fotoUrl(path) {
    if (!path) return null
    return supabase.storage.from('foto-siswa').getPublicUrl(path).data.publicUrl
  }

  async function handleFotoUpload(siswaId, file) {
    setUploadingId(siswaId)
    const ext = file.name.split('.').pop()
    const path = `${siswaId}/foto.${ext}`
    const { error: uploadError } = await supabase.storage.from('foto-siswa').upload(path, file, { upsert: true })
    if (uploadError) {
      alert('Gagal upload foto: ' + uploadError.message)
      setUploadingId(null)
      return
    }
    const { error: updateError } = await supabase.from('siswa').update({ foto_path: path }).eq('id', siswaId)
    if (updateError) {
      alert('Foto terupload tapi gagal menyimpan ke data siswa: ' + updateError.message)
      setUploadingId(null)
      return
    }
    setSiswaList((prev) => prev.map((s) => (s.id === siswaId ? { ...s, foto_path: path } : s)))
    setUploadingId(null)
  }

  function toggleSelect(id) {
    setSelected({ ...selected, [id]: !selected[id] })
  }

  function selectAll() {
    const all = {}
    siswaList.forEach((s) => { all[s.id] = true })
    setSelected(all)
  }

  function bukaPreview(jenis) {
    const jumlah = Object.values(selected).filter(Boolean).length
    if (jumlah === 0) {
      alert('Pilih minimal 1 siswa dulu.')
      return
    }
    setPreviewJenis(jenis)
  }

  async function fetchImageBytes(url) {
    const res = await fetch(url)
    return new Uint8Array(await res.arrayBuffer())
  }

  // Potong foto di tengah (agak ke atas) sesuai rasio kotak foto kartu,
  // supaya tidak gepeng di PDF — sama seperti object-fit: cover.
  async function fotoCoverBytes(url, rasio) {
    const res = await fetch(url)
    const bmp = await createImageBitmap(await res.blob())
    let sw = bmp.width
    let sh = bmp.width / rasio
    if (sh > bmp.height) { sh = bmp.height; sw = bmp.height * rasio }
    const sx = (bmp.width - sw) / 2
    const sy = (bmp.height - sh) * 0.25
    const outW = 369
    const outH = Math.round(outW / rasio)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, outW, outH)
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, outW, outH)
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9))
    return new Uint8Array(await blob.arrayBuffer())
  }

  function dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  async function generateQRBytes(siswaId) {
    const verifyUrl = `${BASE_URL}/verify/siswa/${siswaId}`
    const dataUrl = await QRCode.toDataURL(verifyUrl, { width: 300, margin: 0 })
    return dataUrlToBytes(dataUrl)
  }

  async function generateKartu(jenis) {
    const terpilih = siswaList.filter((s) => selected[s.id])
    if (terpilih.length === 0) {
      alert('Pilih minimal 1 siswa dulu.')
      return
    }
    setGenerating(true)
    try {
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
      const pilihFont = (bold, italic) => (italic ? fontItalic : bold ? fontBold : font)
      const measure = (text, size, bold, italic) => pilihFont(bold, italic).widthOfTextAtSize(text, size)

      // Tanda tangan kepala sekolah di-embed sekali saja (dipakai ulang di semua kartu)
      let ttdImg = null
      if (profilSekolah?.ttd_url) {
        try {
          const ttdBytes = await fetchImageBytes(profilSekolah.ttd_url)
          const isPng = profilSekolah.ttd_url.toLowerCase().includes('.png')
          ttdImg = isPng ? await pdfDoc.embedPng(ttdBytes) : await pdfDoc.embedJpg(ttdBytes)
        } catch (err) {
          console.error('Gagal embed tanda tangan:', err)
        }
      }

      // Logo sekolah: dikonversi ke PNG lewat canvas (transparansi tetap, format apa pun aman)
      let logoImg = null
      if (profilSekolah?.logo_url) {
        try {
          const res = await fetch(profilSekolah.logo_url)
          const bmp = await createImageBitmap(await res.blob())
          const canvas = document.createElement('canvas')
          canvas.width = bmp.width
          canvas.height = bmp.height
          canvas.getContext('2d').drawImage(bmp, 0, 0)
          const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
          logoImg = await pdfDoc.embedPng(new Uint8Array(await blob.arrayBuffer()))
        } catch (err) {
          console.error('Gagal embed logo sekolah:', err)
        }
      }

      const perPage = COLS * ROWS
      const judulKartu = TEMA_KARTU[jenis].label
      const tanggalTerbit = formatTanggalIndo(new Date())

      for (let p = 0; p < Math.ceil(terpilih.length / perPage); p++) {
        const page = pdfDoc.addPage([595, 842])
        const kelompok = terpilih.slice(p * perPage, p * perPage + perPage)

        for (let i = 0; i < kelompok.length; i++) {
          const siswa = kelompok[i]
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const x0 = MARGIN + col * (CARD_W + GAP)
          const yBawah = 842 - MARGIN - CARD_H - row * (CARD_H + GAP)
          const yAtas = yBawah + CARD_H
          const X = (v) => x0 + v * S
          const Y = (v) => yAtas - v * S

          // Siapkan gambar per siswa
          let fotoImg = null
          if (siswa.foto_path) {
            try {
              fotoImg = await pdfDoc.embedJpg(await fotoCoverBytes(fotoUrl(siswa.foto_path), 123 / 155))
            } catch (err) {
              console.error('Gagal memuat foto:', err)
            }
          }
          let qrImg = null
          try {
            qrImg = await pdfDoc.embedPng(await generateQRBytes(siswa.id))
          } catch (err) {
            console.error('Gagal generate QR:', err)
          }
          const gambar = { foto: fotoImg, qr: qrImg, ttd: ttdImg, logo: logoImg }

          const elemen = bangunKartu({
            siswa,
            jenis,
            profilSekolah,
            tanggalTerbit,
            ada: { foto: !!fotoImg, qr: !!qrImg, ttd: !!ttdImg, logo: !!logoImg },
            measure: (t, s, b) => measure(t, s * S, b) / S,
          })

          // Latar putih + garis potong tipis
          page.drawRectangle({ x: x0, y: yBawah, width: CARD_W, height: CARD_H, color: rgb(1, 1, 1), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 })

          for (const e of elemen) {
            if (e.k === 'path') {
              const opsi = { x: x0, y: yAtas, scale: S }
              if (e.fill) opsi.color = hex(e.fill)
              if (e.stroke) { opsi.borderColor = hex(e.stroke); opsi.borderWidth = e.sw }
              page.drawSvgPath(e.d, opsi)
            } else if (e.k === 'circle') {
              page.drawCircle({ x: X(e.cx), y: Y(e.cy), size: e.r * S, color: hex(e.fill) })
            } else if (e.k === 'text') {
              const f = pilihFont(e.bold, e.italic)
              const ukuran = e.size * S
              let tx = X(e.x)
              if (e.anchor === 'middle') tx -= f.widthOfTextAtSize(e.text, ukuran) / 2
              page.drawText(e.text, { x: tx, y: Y(e.y), size: ukuran, font: f, color: hex(e.color) })
            } else if (e.k === 'img') {
              const img = gambar[e.id]
              if (!img) continue
              let dx = e.x, dy = e.y, dw = e.w, dh = e.h
              if (e.fit === 'contain') {
                const r = Math.min(e.w / img.width, e.h / img.height)
                dw = img.width * r
                dh = img.height * r
                dx = e.x + (e.w - dw) / 2
                dy = e.y + (e.h - dh) / 2
              }
              page.drawImage(img, { x: X(dx), y: Y(dy + dh), width: dw * S, height: dh * S })
            }
          }
        }
      }

      const bytes = await pdfDoc.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${judulKartu.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
    } catch (err) {
      alert('Gagal membuat PDF: ' + err.message)
    }
    setGenerating(false)
  }

  const jumlahTerpilih = Object.values(selected).filter(Boolean).length

  return (
    <Layout title="Cetak Kartu" subtitle="Kartu Pelajar & Kartu Perpustakaan otomatis dari data siswa">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4a0e0e] to-[#7a1515] p-6 mb-6">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <IdCard size={20} className="text-paper" />
          </div>
          <div>
            <p className="font-display font-semibold text-lg text-paper">Cetak Kartu</p>
            <p className="text-sm text-paper/70 mt-0.5">{jumlahTerpilih} siswa dipilih untuk dicetak</p>
          </div>
        </div>
        <IdCard size={120} className="absolute -right-4 -bottom-6 text-white/5 rotate-12" />
      </div>

      <div className="card p-5 mb-5 flex flex-wrap items-center gap-3">
        <select className="input-field w-auto" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
          {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
        </select>
        <button onClick={selectAll} className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-700 hover:bg-ink-900/[0.05]">
          Pilih Semua di Kelas Ini
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center rounded-lg overflow-hidden">
            <button
              onClick={() => bukaPreview('pelajar')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-l-lg text-sm font-medium text-ink-700 border border-ink-950/10 hover:bg-ink-900/[0.05]"
            >
              <Eye size={16} /> Lihat
            </button>
            <button onClick={() => generateKartu('pelajar')} disabled={generating} className="btn-primary rounded-l-none">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Cetak Kartu Pelajar
            </button>
          </div>
          <div className="flex items-center rounded-lg overflow-hidden">
            <button
              onClick={() => bukaPreview('perpustakaan')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-l-lg text-sm font-medium text-ink-700 border border-ink-950/10 hover:bg-ink-900/[0.05]"
            >
              <Eye size={16} /> Lihat
            </button>
            <button
              onClick={() => generateKartu('perpustakaan')}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-r-lg bg-ink-900 text-paper text-sm font-medium disabled:opacity-50"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Library size={16} />}
              Cetak Kartu Perpustakaan
            </button>
          </div>
        </div>
      </div>

      {loadError && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{loadError}</p>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <p className="text-sm text-ink-700/50 p-6">Memuat...</p>
        ) : siswaList.length === 0 ? (
          <p className="text-sm text-ink-700/50 p-6">Belum ada siswa aktif di kelas ini.</p>
        ) : (
          <ul className="divide-y divide-ink-900/[0.06]">
            {siswaList.map((s) => (
              <li key={s.id} className="p-4 flex items-center gap-4">
                <input type="checkbox" checked={!!selected[s.id]} onChange={() => toggleSelect(s.id)} />
                <div className="w-11 h-11 rounded-full bg-ink-900/[0.06] overflow-hidden flex items-center justify-center shrink-0">
                  {fotoUrl(s.foto_path) ? (
                    <img src={fotoUrl(s.foto_path)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-ink-700/40">{s.nama_lengkap?.[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-950">{s.nama_lengkap}</p>
                  <p className="text-xs text-ink-700/50">NIS: {s.nis || '-'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewSiswaTunggal(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-700 hover:bg-ink-900/[0.05] shrink-0"
                >
                  <Eye size={14} /> Lihat
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-700 hover:bg-ink-900/[0.05] cursor-pointer shrink-0">
                  {uploadingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  {s.foto_path ? 'Ganti Foto' : 'Upload Foto'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingId === s.id}
                    onChange={(e) => e.target.files?.[0] && handleFotoUpload(s.id, e.target.files[0])}
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-ink-700/40 mt-4">
        Siswa tanpa foto akan tetap tercetak dengan kotak foto kosong. QR code untuk verifikasi. Kartu dicetak 8 per halaman A4, tinggal potong sesuai garis.
      </p>

      {previewJenis && (
        <PreviewKartuModal
          jenis={previewJenis}
          siswaList={siswaList.filter((s) => selected[s.id])}
          fotoUrl={fotoUrl}
          profilSekolah={profilSekolah}
          generating={generating}
          onClose={() => setPreviewJenis(null)}
          onDownload={async (jenis) => {
            await generateKartu(jenis)
            setPreviewJenis(null)
          }}
        />
      )}

      {/* Pratinjau untuk tombol "Lihat" per-baris siswa: default tampilkan Kartu Pelajar */}
      {previewSiswaTunggal && (
        <PreviewKartuModal
          jenis="pelajar"
          siswaList={[previewSiswaTunggal]}
          fotoUrl={fotoUrl}
          profilSekolah={profilSekolah}
          generating={generating}
          onClose={() => setPreviewSiswaTunggal(null)}
          onDownload={async (jenis) => {
            setSelected({ [previewSiswaTunggal.id]: true })
            await generateKartu(jenis)
            setPreviewSiswaTunggal(null)
          }}
        />
      )}
    </Layout>
  )
}
