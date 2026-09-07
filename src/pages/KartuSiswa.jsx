import { useEffect, useState } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabaseClient'
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
function PreviewKartuModal({ jenis, siswaList, fotoUrl, generating, onClose, onDownload }) {
  const [qrMap, setQrMap] = useState({})
  const tema = TEMA_KARTU[jenis]

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
                className="relative rounded-xl overflow-hidden shadow-md ring-1 ring-black/5"
                style={{ aspectRatio: '242 / 153' }}
              >
                {/* Header + aksen emas tipis, warna sesuai jenis kartu */}
                <div className="px-3 pt-2 pb-2.5 relative" style={{ background: tema.warna }}>
                  <p className="text-[10px] font-semibold text-white tracking-wide">SD NEGERI WARIA</p>
                  <p className="text-[9px] text-white/70 mt-0.5">{tema.label}</p>
                  {/* Lencana bulat inisial sekolah, aksen dekoratif kanan atas */}
                  <div className="absolute top-1.5 right-2 w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                    <span className="text-[8px] font-semibold text-white">SD</span>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-[3px]" style={{ background: tema.aksen }} />
                </div>

                <div className="flex gap-2.5 p-3 bg-white">
                  {/* Foto dengan bingkai aksen emas */}
                  <div
                    className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-ink-900/[0.06] flex items-center justify-center"
                    style={{ boxShadow: `0 0 0 1.5px ${tema.aksen}` }}
                  >
                    {fotoUrl(s.foto_path) ? (
                      <img src={fotoUrl(s.foto_path)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-ink-700/40">{s.nama_lengkap?.[0]}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink-950 truncate">{s.nama_lengkap}</p>
                    <div className="w-6 h-[2px] rounded-full mt-1" style={{ background: tema.aksen }} />
                    <p className="text-[10px] text-ink-700/60 mt-1">NIS: {s.nis || '-'}</p>
                    <p className="text-[10px] text-ink-700/60">Kelas: {s.kelas?.nama_kelas || '-'}</p>
                    <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-ink-900/[0.05] text-ink-700/60">
                      TP {new Date().getFullYear()}/{new Date().getFullYear() + 1}
                    </span>
                  </div>

                  {/* QR code dengan kotak putih + bingkai aksen */}
                  <div
                    className="w-9 h-9 rounded-md bg-white flex items-center justify-center shrink-0 self-end"
                    style={{ boxShadow: `0 0 0 1px ${tema.aksen}` }}
                  >
                    {qrMap[s.id] ? (
                      <img src={qrMap[s.id]} alt="QR verifikasi" className="w-7 h-7" />
                    ) : (
                      <Loader2 size={12} className="animate-spin text-ink-700/30" />
                    )}
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
  const [kelasList, setKelasList] = useState([])
  const [kelasId, setKelasId] = useState('')
  const [siswaList, setSiswaList] = useState([])
  const [selected, setSelected] = useState({})
  const [loading, setLoading] = useState(false)
  const [uploadingId, setUploadingId] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [previewJenis, setPreviewJenis] = useState(null) // 'pelajar' | 'perpustakaan' | null

  useEffect(() => {
    supabase.from('kelas').select('id, nama_kelas').order('nama_kelas').then(({ data }) => {
      setKelasList(data || [])
      if (data?.length) setKelasId(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (kelasId) loadSiswa()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId])

  async function loadSiswa() {
    setLoading(true)
    const { data } = await supabase
      .from('siswa')
      .select('id, nama_lengkap, nis, foto_path, kelas(nama_kelas)')
      .eq('kelas_id', kelasId)
      .eq('status', 'aktif')
      .order('nama_lengkap')
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
    await supabase.from('siswa').update({ foto_path: path }).eq('id', siswaId)
    await loadSiswa()
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

  // Ubah QR data-URL (base64) menjadi bytes agar bisa di-embed pdf-lib
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

      const perPage = COLS * ROWS
      const tema = TEMA_KARTU[jenis]
      const judulKartu = tema.label
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
          const headerH = 30

          // Latar kartu
          page.drawRectangle({ x, y, width: CARD_W, height: CARD_H, color: rgb(1, 1, 1), borderColor: warna, borderWidth: 1.5 })

          // Header berwarna + garis aksen emas tipis di bawahnya
          page.drawRectangle({ x, y: y + CARD_H - headerH, width: CARD_W, height: headerH, color: warna })
          page.drawRectangle({ x, y: y + CARD_H - headerH - 2.5, width: CARD_W, height: 2.5, color: aksen })
          page.drawText('SD NEGERI WARIA', { x: x + 10, y: y + CARD_H - 13, size: 8, font: fontBold, color: rgb(1, 1, 1) })
          page.drawText(judulKartu, { x: x + 10, y: y + CARD_H - 23, size: 6.5, font, color: rgb(0.85, 0.85, 0.92) })

          // Lencana bulat inisial sekolah — pojok kanan atas header, aksen dekoratif
          page.drawEllipse({
            x: x + CARD_W - 20, y: y + CARD_H - headerH / 2, xScale: 9, yScale: 9,
            color: rgb(1, 1, 1), opacity: 0.15,
          })
          page.drawText('SD', { x: x + CARD_W - 27, y: y + CARD_H - headerH / 2 - 3, size: 6.5, font: fontBold, color: rgb(1, 1, 1) })

          // Foto dengan bingkai aksen emas
          const fotoX = x + 12
          const fotoY = y + 16
          const fotoSize = 56
          page.drawRectangle({
            x: fotoX - 2, y: fotoY - 2, width: fotoSize + 4, height: fotoSize + 4,
            color: rgb(1, 1, 1), borderColor: aksen, borderWidth: 1.2,
          })
          if (siswa.foto_path) {
            try {
              const bytes = await fetchImageBytes(fotoUrl(siswa.foto_path))
              const isPng = siswa.foto_path.toLowerCase().endsWith('.png')
              const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
              page.drawImage(img, { x: fotoX, y: fotoY, width: fotoSize, height: fotoSize })
            } catch {
              page.drawRectangle({ x: fotoX, y: fotoY, width: fotoSize, height: fotoSize, color: rgb(0.9, 0.9, 0.9) })
            }
          } else {
            page.drawRectangle({ x: fotoX, y: fotoY, width: fotoSize, height: fotoSize, color: rgb(0.9, 0.9, 0.9) })
          }

          // Data siswa
          const textX = fotoX + fotoSize + 14
          let textY = y + CARD_H - headerH - 12
          page.drawText(siswa.nama_lengkap, { x: textX, y: textY, size: 9.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
          // Garis aksen pendek di bawah nama
          textY -= 6
          page.drawRectangle({ x: textX, y: textY, width: 18, height: 1.4, color: aksen })
          textY -= 10
          page.drawText(`NIS: ${siswa.nis || '-'}`, { x: textX, y: textY, size: 7.5, font, color: rgb(0.35, 0.35, 0.35) })
          textY -= 11
          page.drawText(`Kelas: ${siswa.kelas?.nama_kelas || '-'}`, { x: textX, y: textY, size: 7.5, font, color: rgb(0.35, 0.35, 0.35) })
          textY -= 13
          // Pil "TP" — kotak abu muda di belakang teks tahun ajaran
          const tpText = `TP ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
          page.drawRectangle({ x: textX, y: textY - 2, width: font.widthOfTextAtSize(tpText, 6.5) + 8, height: 10, color: rgb(0.94, 0.94, 0.94) })
          page.drawText(tpText, { x: textX + 4, y: textY, size: 6.5, font, color: rgb(0.45, 0.45, 0.45) })

          // QR Code dengan kotak putih + bingkai aksen (pojok kanan bawah kartu)
          try {
            const qrBytes = await generateQRBytes(siswa.id)
            const qrImg = await pdfDoc.embedPng(qrBytes)
            const qrSize = 28
            const qrX = x + CARD_W - qrSize - 12
            const qrY = y + 9
            page.drawRectangle({
              x: qrX - 3, y: qrY - 3, width: qrSize + 6, height: qrSize + 6,
              color: rgb(1, 1, 1), borderColor: aksen, borderWidth: 1,
            })
            page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize })
          } catch (err) {
            console.error('Gagal generate QR:', err)
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
        Siswa tanpa foto akan tetap tercetak dengan kotak foto kosong. QR code di pojok kanan bawah untuk verifikasi. Kartu dicetak 8 per halaman A4, tinggal potong sesuai garis.
      </p>

      {previewJenis && (
        <PreviewKartuModal
          jenis={previewJenis}
          siswaList={siswaList.filter((s) => selected[s.id])}
          fotoUrl={fotoUrl}
          generating={generating}
          onClose={() => setPreviewJenis(null)}
          onDownload={async (jenis) => {
            await generateKartu(jenis)
            setPreviewJenis(null)
          }}
        />
      )}
    </Layout>
  )
}
