// Mengelola Web Worker yang memuat & menjalankan OpenCV.js (lihat opencvWorker.js).
// Semua pemrosesan berat (pemuatan ~8 MB, Canny, findContours, warpPerspective,
// adaptiveThreshold) berjalan di worker itu, BUKAN di thread utama — supaya UI
// (termasuk tombol kamera) tidak pernah terkunci.
//
// API publik dipertahankan sama seperti versi sebelumnya, dipakai oleh AlatPDF.jsx:
//   muatOpenCv()      -> Promise yang selesai saat worker siap dipakai
//   opencvSudahSiap() -> status siap (untuk indikator UI)
// Ditambah, khusus dipakai oleh kameraPdf.js:
//   jalankanTugasCv(nama, payload, transferables) -> Promise<hasil>

let worker = null
let siapPromise = null
let siap = false
let idTugas = 0
const tugasBerjalan = new Map()

function buatWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./opencvWorker.js', import.meta.url))

  worker.onmessage = (e) => {
    const msg = e.data
    if (msg.type === 'siap') {
      siap = true
      siapPromise?.selesai?.()
      return
    }
    if (msg.type === 'gagal') {
      siapPromise?.gagal?.(new Error(msg.pesan))
      resetSetelahGagal(new Error(msg.pesan))
      return
    }
    if (msg.type === 'hasil' || msg.type === 'error') {
      const janji = tugasBerjalan.get(msg.id)
      if (!janji) return
      tugasBerjalan.delete(msg.id)
      if (msg.type === 'hasil') janji.selesai(msg.hasil)
      else janji.gagal(new Error(msg.pesan))
    }
  }

  worker.onerror = () => {
    const err = new Error('Mesin pemindai berhenti karena kesalahan. Coba lagi.')
    siapPromise?.gagal?.(err)
    resetSetelahGagal(err)
  }

  return worker
}

// Membatalkan semua tugas yang sedang menunggu & mengizinkan pemuatan dicoba
// ulang lain kali (mis. setelah koneksi internet pulih).
function resetSetelahGagal(err) {
  siap = false
  siapPromise = null
  for (const j of tugasBerjalan.values()) j.gagal(err)
  tugasBerjalan.clear()
  worker?.terminate()
  worker = null
}

export function muatOpenCv() {
  if (siap) return Promise.resolve()
  if (siapPromise) return siapPromise.promise
  const w = buatWorker()
  let selesai, gagal
  const promise = new Promise((res, rej) => {
    selesai = res
    gagal = rej
  })
  siapPromise = { promise, selesai, gagal }
  w.postMessage({ type: 'muat' })
  return promise
}

export function opencvSudahSiap() {
  return siap
}

// Dipanggil dari kameraPdf.js. `transferables` = array objek (mis. ImageBitmap)
// yang kepemilikannya dipindah ke worker (bukan disalin -> cepat & hemat memori).
export async function jalankanTugasCv(nama, payload, transferables = []) {
  await muatOpenCv()
  const w = buatWorker()
  const id = ++idTugas
  return new Promise((selesai, gagal) => {
    tugasBerjalan.set(id, { selesai, gagal })
    w.postMessage({ type: 'tugas', id, nama, payload }, transferables)
  })
}
