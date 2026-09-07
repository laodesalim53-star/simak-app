import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

// Tombol instal PWA — memicu langsung pop-up "Tambahkan ke Layar Utama"
// bawaan Android/Chrome, tanpa guru perlu buka menu titik tiga.
//
// Cara pakai: <InstallButton className="..." label="Instal Aplikasi" />
// Tombol ini otomatis TIDAK tampil kalau:
//  - aplikasi sudah terpasang (dibuka dalam mode standalone), atau
//  - browser belum "menawarkan" instal (mis. sudah pernah ditolak, atau
//    dibuka di iOS Safari yang tidak mendukung prompt otomatis ini).
export default function InstallButton({ className = '', label = 'Instal Aplikasi' }) {
  const [promptEvent, setPromptEvent] = useState(null)
  const [terpasang, setTerpasang] = useState(false)

  useEffect(() => {
    // Kalau app sudah dibuka dalam mode "terpasang", jangan tampilkan tombol.
    const sudahStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (sudahStandalone) {
      setTerpasang(true)
      return
    }

    function handleBeforeInstallPrompt(e) {
      // Cegah mini-infobar bawaan Chrome muncul otomatis; kita simpan
      // event-nya untuk dipicu manual lewat tombol kita sendiri.
      e.preventDefault()
      setPromptEvent(e)
    }
    function handleAppInstalled() {
      setTerpasang(true)
      setPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function pasangSekarang() {
    if (!promptEvent) return
    promptEvent.prompt()
    try {
      const hasil = await promptEvent.userChoice
      if (hasil.outcome === 'accepted') setTerpasang(true)
    } finally {
      setPromptEvent(null)
    }
  }

  // Tidak render apa pun kalau sudah terpasang, atau browser belum kirim
  // event beforeinstallprompt (belum eligible / sudah terpasang / iOS).
  if (terpasang || !promptEvent) return null

  return (
    <button onClick={pasangSekarang} className={className}>
      <Download size={16} strokeWidth={2.5} />
      {label}
    </button>
  )
}
