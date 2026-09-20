// Memuat OpenCV.js dari CDN secara lazy (hanya saat benar-benar dibutuhkan,
// yaitu saat pengguna pertama kali memakai fitur scan kamera), lalu
// menyimpannya di cache modul supaya panggilan berikutnya instan.
//
// Ukuran unduhan sekitar 8 MB sekali muat, tapi browser akan meng-cache
// berkas ini sehingga kunjungan berikutnya tidak mengunduh ulang.

const OPENCV_URL = 'https://docs.opencv.org/4.9.0/opencv.js'

let cvPromise = null

export function muatOpenCv() {
  if (cvPromise) return cvPromise

  cvPromise = new Promise((selesai, gagal) => {
    // Sudah pernah dimuat sebelumnya di halaman ini (mis. navigasi SPA).
    if (window.cv && window.cv.Mat) {
      selesai(window.cv)
      return
    }

    const skripLama = document.querySelector(`script[src="${OPENCV_URL}"]`)
    if (skripLama) {
      tungguSiap(skripLama, selesai, gagal)
      return
    }

    const skrip = document.createElement('script')
    skrip.src = OPENCV_URL
    skrip.async = true
    skrip.onerror = () => {
      cvPromise = null // izinkan dicoba ulang lain kali (mis. setelah koneksi pulih)
      gagal(new Error('Gagal memuat mesin pemindai (OpenCV.js). Periksa koneksi internet Anda.'))
    }
    skrip.onload = () => tungguSiap(skrip, selesai, gagal)
    document.head.appendChild(skrip)
  })

  return cvPromise
}

function tungguSiap(skripEl, selesai, gagal) {
  const cv = window.cv
  if (!cv) {
    gagal(new Error('OpenCV.js gagal dimuat.'))
    return
  }
  if (cv.Mat) {
    // WASM sudah siap (jarang terjadi tepat saat onload, tapi jaga-jaga).
    selesai(cv)
    return
  }
  // WASM opencv.js diinisialisasi async setelah skrip termuat; tunggu callback-nya.
  cv['onRuntimeInitialized'] = () => selesai(cv)
}

// Untuk ditampilkan di UI: apakah OpenCV sudah siap dipakai tanpa menunggu.
export function opencvSudahSiap() {
  return !!(window.cv && window.cv.Mat)
}
