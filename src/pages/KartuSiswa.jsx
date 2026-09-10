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

// Warna & label per jenis kartu — dipakai bersama oleh PDF generator dan modal pratinjau,
// supaya kartu yang tampil di layar sama persis dengan yang dicetak.
const TEMA_KARTU = {
  pelajar: {
    label: 'KARTU PELAJAR',
    warna: '#1c3059',
    aksen: '#d4af37',
  },
  perpustakaan: {
    label: 'KARTU PERPUSTAKAAN',
    warna: '#4f1717',
    aksen: '#d4af37',
  },
}

// Modal pratinjau — menampilkan desain kartu modern untuk siswa yang dipilih,
// sebelum benar-benar di-generate jadi PDF. QR code dibuat langsung di sini
// (bukan lewat pdf-lib) supaya tampilannya ringan dan instan di browser.
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
            const dataUrl = await QRCode.toDataURL(url, { width: 120, margin: 0 })
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
            {siswaList.map((s) => (
              <div
                key={s.id}
                className="relative rounded-xl overflow-hidden shadow-md ring-1 ring-black/5 flex flex-col"
                style={{ aspectRatio: '242 / 153' }}
              >
                {/* Header + aksen emas tipis, warna sesuai jenis kartu */}
                <div className="px-3 pt-2 pb-2 relative shrink-0" style={{ background: `linear-gradient(135deg, ${tema.warna}, ${tema.warna}dd)` }}>
                  <p className="text-[11px] font-bold text-white tracking-wide leading-tight">
                    {profilSekolah?.nama_sekolah || 'SD NEGERI WARIA'}
                  </p>
                  <p className="text-[9px] text-white/85 font-semibold mt-0.5">{tema.label}</p>
                  {profilSekolah?.alamat && (
                    <p className="text-[6.5px] text-white/60 mt-0.5 truncate">{profilSekolah.alamat}</p>
                  )}
                  <div className="absolute bottom-0 left-0 w-full h-[3px]" style={{ background: tema.aksen }} />
                </div>

                {/* Badan kartu: foto + identitas */}
                <div className="flex-1 flex gap-2 p-2.5 bg-white min-h-0">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      className="w-12 h-14 rounded-md overflow-hidden bg-ink-900/[0.06] flex items-center justify-center"
                      style={{ boxShadow: `0 0 0 1.5px ${tema.aksen}` }}
                    >
                      {fotoUrl(s.foto_path) ? (
                        <img src={fotoUrl(s.foto_path)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold text-ink-700/40">{s.nama_lengkap?.[0]}</span>
                      )}
                    </div>
                    {/* QR code kecil di bawah foto */}
                    <div
                      className="w-7 h-7 rounded bg-white flex items-center justify-center shrink-0"
                      style={{ boxShadow: `0 0 0 1px ${tema.aksen}` }}
                    >
                      {qrMap[s.id] ? (
                        <img src={qrMap[s.id]} alt="QR verifikasi" className="w-6 h-6" />
                      ) : (
                        <Loader2 size={10} className="animate-spin text-ink-700/30" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 text-[9px] leading-snug">
                    <p className="text-[11px] font-bold text-ink-950 truncate">{s.nama_lengkap}</p>
                    <div className="w-6 h-[2px] rounded-full mt-0.5 mb-1" style={{ background: tema.aksen }} />
                    <div className="grid grid-cols-[28px_4px_1fr] gap-y-0.5 text-ink-700/70">
                      <span>NIS</span><span>:</span><span className="truncate">{s.nis || '-'}</span>
                      <span>NISN</span><span>:</span><span className="truncate">{s.nisn || '-'}</span>
                      <span>TTL</span><span>:</span><span className="truncate">{formatTTL(s)}</span>
                      <span>Alamat</span><span>:</span><span className="line-clamp-2">{s.alamat || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer: tanda tangan kepala sekolah, diambil dari profil sekolah */}
                <div className="shrink-0 px-2.5 py-1.5 flex items-end justify-end bg-white border-t border-ink-900/[0.06]">
                  <div className="text-right text-[7px] text-ink-700/60 leading-tight">
                    <p>{tanggalTerbit}</p>
                    <p>Kepala Sekolah</p>
                    <div className="h-6 flex items-end justify-end">
                      {profilSekolah?.ttd_url ? (
                        <img src={profilSekolah.ttd_url} alt="Tanda tangan" className="h-6 object-contain" />
                      ) : null}
                    </div>
                    <p className="font-semibold text-ink-900 underline underline-offset-2">
                      {profilSekolah?.nama_kepala_sekolah || '-'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
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

  // ⚠️ SESUAIKAN: nama tabel/kolom profil sekolah & bucket tanda tangan
  // sesuai skema Supabase Anda yang sebenarnya.
  async function loadProfilSekolah() {
    // PERBAIKAN: sebelumnya query ini tidak difilter sekolah_id, sehingga
    // .single() bisa mengambil baris profil_sekolah milik sekolah lain
    // (mis. superadmin) — itu sebabnya nama sekolah yang tercetak salah.
    const { data, error } = await supabase
      .from('profil_sekolah')
      .select('nama_sekolah, alamat, nama_kepala_sekolah, ttd_path')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()

    if (error || !data) {
      console.warn('Profil sekolah belum tersedia:', error?.message)
      setProfilSekolah(null)
      return
    }

    let ttd_url = null
    if (data.ttd_path) {
      ttd_url = supabase.storage.from('tanda-tangan').getPublicUrl(data.ttd_path).data.publicUrl
    }
    setProfilSekolah({ ...data, ttd_url })
  }

  async function loadSiswa() {
    setLoading(true)
    setLoadError('')
    // ⚠️ SESUAIKAN: pastikan kolom nisn, tempat_lahir, tanggal_lahir, alamat memang ada di tabel siswa
    const { data, error } = await supabase
      .from('siswa')
      .select('id, nama_lengkap, nis, nisn, foto_path, tempat_lahir, tanggal_lahir, alamat, kelas(nama_kelas)')
      .eq('kelas_id', kelasId)
      .eq('status', 'aktif')
      .order('nama_lengkap')

    if (error) {
      console.error('Gagal memuat siswa:', error)
      // Kemungkinan besar ada kolom yang belum ada di tabel `siswa`
      // (nisn / tempat_lahir / tanggal_lahir / alamat). Cek pesan error ini.
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
    // Update langsung di state, tidak perlu reload seluruh daftar
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

  // Ubah QR / gambar data-URL (base64) menjadi bytes agar bisa di-embed pdf-lib
  function dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  async function generateQRBytes(siswaId) {
    const verifyUrl = `${BASE_URL}/verify/siswa/${siswaId}`
    const dataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 0 })
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
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

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

      const perPage = COLS * ROWS
      const tema = TEMA_KARTU[jenis]
      const judulKartu = tema.label
      const namaSekolah = profilSekolah?.nama_sekolah || 'SD NEGERI WARIA'
      const alamatSekolah = profilSekolah?.alamat || ''
      const namaKepsek = profilSekolah?.nama_kepala_sekolah || '-'
      const tanggalTerbit = formatTanggalIndo(new Date())
      const warna = jenis === 'pelajar' ? rgb(0.11, 0.19, 0.36) : rgb(0.31, 0.09, 0.09)
      const aksen = rgb(0.83, 0.69, 0.22) // emas — sama seperti garis aksen di pratinjau

      for (let p = 0; p < Math.ceil(terpilih.length / perPage); p++) {
        const page = pdfDoc.addPage([595, 842])
        const kelompok = terpilih.slice(p * perPage, p * perPage + perPage)

        for (let i = 0; i < kelompok.length; i++) {
          const siswa = kelompok[i]
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const x = MARGIN + col * (CARD_W + GAP)
          const y = 842 - MARGIN - CARD_H - row * (CARD_H + GAP)
          const headerH = alamatSekolah ? 38 : 32

          // Latar kartu
          page.drawRectangle({ x, y, width: CARD_W, height: CARD_H, color: rgb(1, 1, 1), borderColor: warna, borderWidth: 1.5 })

          // Header berwarna + garis aksen emas tipis di bawahnya
          page.drawRectangle({ x, y: y + CARD_H - headerH, width: CARD_W, height: headerH, color: warna })
          page.drawRectangle({ x, y: y + CARD_H - headerH - 2.5, width: CARD_W, height: 2.5, color: aksen })
          page.drawText(namaSekolah, { x: x + 10, y: y + CARD_H - 13, size: 8.5, font: fontBold, color: rgb(1, 1, 1) })
          page.drawText(judulKartu, { x: x + 10, y: y + CARD_H - 23, size: 6.5, font, color: rgb(0.9, 0.9, 0.95) })
          if (alamatSekolah) {
            page.drawText(alamatSekolah, { x: x + 10, y: y + CARD_H - 31, size: 5, font, color: rgb(0.75, 0.75, 0.85) })
          }

          // Foto dengan bingkai aksen emas
          const fotoX = x + 10
          const fotoY = y + CARD_H - headerH - 60
          const fotoW = 46
          const fotoH = 56
          page.drawRectangle({
            x: fotoX - 2, y: fotoY - 2, width: fotoW + 4, height: fotoH + 4,
            color: rgb(1, 1, 1), borderColor: aksen, borderWidth: 1.2,
          })
          if (siswa.foto_path) {
            try {
              const bytes = await fetchImageBytes(fotoUrl(siswa.foto_path))
              const isPng = siswa.foto_path.toLowerCase().endsWith('.png')
              const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
              page.drawImage(img, { x: fotoX, y: fotoY, width: fotoW, height: fotoH })
            } catch {
              page.drawRectangle({ x: fotoX, y: fotoY, width: fotoW, height: fotoH, color: rgb(0.9, 0.9, 0.9) })
            }
          } else {
            page.drawRectangle({ x: fotoX, y: fotoY, width: fotoW, height: fotoH, color: rgb(0.9, 0.9, 0.9) })
          }

          // QR code kecil di bawah foto
          try {
            const qrBytes = await generateQRBytes(siswa.id)
            const qrImg = await pdfDoc.embedPng(qrBytes)
            const qrSize = 22
            const qrX = fotoX + (fotoW - qrSize) / 2
            const qrY = fotoY - qrSize - 6
            page.drawRectangle({
              x: qrX - 2, y: qrY - 2, width: qrSize + 4, height: qrSize + 4,
              color: rgb(1, 1, 1), borderColor: aksen, borderWidth: 0.8,
            })
            page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize })
          } catch (err) {
            console.error('Gagal generate QR:', err)
          }

          // Data siswa: Nama / NIS / NISN / TTL / Alamat
          const textX = fotoX + fotoW + 14
          const labelColX = textX + 34
          let textY = y + CARD_H - headerH - 12
          page.drawText(siswa.nama_lengkap, { x: textX, y: textY, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
          textY -= 6
          page.drawRectangle({ x: textX, y: textY, width: 18, height: 1.4, color: aksen })
          textY -= 11

          function drawBaris(label, isi) {
            page.drawText(label, { x: textX, y: textY, size: 6.8, font, color: rgb(0.4, 0.4, 0.4) })
            page.drawText(':', { x: labelColX, y: textY, size: 6.8, font, color: rgb(0.4, 0.4, 0.4) })
            const maxWidth = CARD_W - (labelColX + 6 - x)
            let isiText = isi || '-'
            // Potong teks alamat panjang agar tidak keluar kartu
            while (font.widthOfTextAtSize(isiText, 6.8) > maxWidth && isiText.length > 3) {
              isiText = isiText.slice(0, -4) + '…'
            }
            page.drawText(isiText, { x: labelColX + 6, y: textY, size: 6.8, font, color: rgb(0.25, 0.25, 0.25) })
            textY -= 10
          }

          drawBaris('NIS', siswa.nis)
          drawBaris('NISN', siswa.nisn)
          drawBaris('TTL', formatTTL(siswa))
          drawBaris('Alamat', siswa.alamat)

          // Tanda tangan kepala sekolah, pojok kanan bawah
          const ttdBoxW = 78
          const ttdX = x + CARD_W - ttdBoxW - 8
          let ttdY = y + 8
          page.drawText(tanggalTerbit, { x: ttdX, y: ttdY + 32, size: 5, font, color: rgb(0.45, 0.45, 0.45) })
          page.drawText('Kepala Sekolah', { x: ttdX, y: ttdY + 25, size: 5, font, color: rgb(0.45, 0.45, 0.45) })
          if (ttdImg) {
            page.drawImage(ttdImg, { x: ttdX, y: ttdY + 8, width: 50, height: 16 })
          }
          page.drawRectangle({ x: ttdX, y: ttdY + 6, width: ttdBoxW, height: 0.6, color: rgb(0.7, 0.7, 0.7) })
          page.drawText(namaKepsek, { x: ttdX, y: ttdY - 1, size: 5.8, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
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
                {/* Tombol Lihat per-siswa — pratinjau kartu untuk satu siswa ini saja */}
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
