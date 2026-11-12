import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../lib/supabaseClient'
import { Loader2, Download, Printer } from 'lucide-react'

export const QR_PREFIX = 'simak-qr:'

export default function QrMasukSaya() {
  const [kode, setKode] = useState(null)
  const [proses, setProses] = useState(false)
  const [galat, setGalat] = useState('')

  async function buat() {
    if (kode === null && !window.confirm('Membuat QR baru akan mematikan QR lama. Lanjutkan?')) return
    setProses(true)
    setGalat('')
    const { data, error } = await supabase.functions.invoke('qr-masuk', { body: { aksi: 'buat' } })
    setProses(false)
    if (error || !data?.kode) return setGalat('QR gagal dibuat. Coba lagi.')
    setKode(data.kode)
  }

  function unduh() {
    const a = document.createElement('a')
    a.href = document.getElementById('qr-masuk-canvas').toDataURL('image/png')
    a.download = 'qr-masuk.png'
    a.click()
  }

  return (
    <div className="max-w-sm mx-auto p-6 text-center space-y-4">
      <h1 className="text-xl font-semibold">QR Masuk Saya</h1>
      <p className="text-sm">
        Pindai QR ini lewat kamera di halaman login untuk masuk tanpa mengetik. Perlakukan seperti kata sandi:
        siapa pun yang memegangnya bisa masuk sebagai Anda.
      </p>

      {kode && (
        <div className="space-y-3">
          <div className="mx-auto w-fit rounded-xl bg-white p-3 border">
            <QRCodeCanvas id="qr-masuk-canvas" value={QR_PREFIX + kode} size={220} includeMargin />
          </div>
          <p className="text-xs text-amber-600">
            QR hanya ditampilkan sekarang. Unduh atau cetak sebelum meninggalkan halaman ini.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={unduh} className="px-3 py-2 rounded-lg border text-sm"><Download size={14} className="inline mr-1" />Unduh</button>
            <button onClick={() => window.print()} className="px-3 py-2 rounded-lg border text-sm"><Printer size={14} className="inline mr-1" />Cetak</button>
          </div>
        </div>
      )}

      {galat && <p className="text-red-600 text-sm">{galat}</p>}
      <button onClick={buat} disabled={proses} className="px-4 py-2 rounded-lg bg-emerald-600 text-white">
        {proses ? <Loader2 className="animate-spin inline" size={16} /> : kode ? 'Buat ulang QR' : 'Buat QR masuk'}
      </button>
    </div>
  )
}
