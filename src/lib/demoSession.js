// src/lib/demoSession.js
//
// Mengatur "jam pasir" sesi demo di perangkat pengunjung (localStorage),
// TIDAK mengunci akun demo secara global — hanya menandai perangkat ini
// harus logout otomatis setelah 1 jam sejak mulaiSesiDemo() dipanggil.
//
// Cara pakai:
//   - Panggil mulaiSesiDemo() SEKALI, tepat setelah login akun demo berhasil.
//   - Pasang <DemoSessionWatcher /> sekali di root aplikasi (App.jsx) —
//     komponen itu yang memeriksa & melakukan logout otomatis.

const KUNCI_KADALUARSA = 'simak_demo_kadaluarsa'
const DURASI_DEMO_MS = 60 * 60 * 1000 // 1 jam

export function mulaiSesiDemo() {
  try {
    localStorage.setItem(KUNCI_KADALUARSA, String(Date.now() + DURASI_DEMO_MS))
  } catch {
    // localStorage tidak tersedia (mode privat dsb) — sesi demo tetap
    // jalan, hanya saja timer 1 jam tidak bisa dipantau di perangkat itu.
  }
}

export function sesiDemoAktif() {
  try {
    const v = localStorage.getItem(KUNCI_KADALUARSA)
    return !!v && Date.now() < Number(v)
  } catch {
    return false
  }
}

export function sisaMsSesiDemo() {
  try {
    const v = localStorage.getItem(KUNCI_KADALUARSA)
    if (!v) return 0
    return Math.max(0, Number(v) - Date.now())
  } catch {
    return 0
  }
}

export function hapusSesiDemo() {
  try {
    localStorage.removeItem(KUNCI_KADALUARSA)
  } catch {
    // abaikan
  }
}
